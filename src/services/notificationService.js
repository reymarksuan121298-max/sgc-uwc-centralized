/**
 * STL Mandaue - Web Push & Notification Service
 * Manages Browser Notifications, Web Audio alerts, Service Worker coordination, and user preferences.
 */

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.audioCtx = null;
    this.actionListeners = new Set();
    this.initServiceWorker();
    this.initMessageListener();
  }

  // Register service worker for web push and background notification support
  async initServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      return this.swRegistration;
    } catch (err) {
      console.warn('Service Worker registration skipped or failed:', err);
      return null;
    }
  }

  // Listen to message posted from Service Worker on notification click
  initMessageListener() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'STL_NOTIFICATION_CLICK') {
        const payload = event.data.payload || {};
        this.actionListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error('Notification click listener error:', e);
          }
        });
      }
    });
  }

  // Subscribe to notification actions (e.g. user clicked notification to open chat or audit)
  onNotificationAction(callback) {
    this.actionListeners.add(callback);
    return () => this.actionListeners.delete(callback);
  }

  // Check current browser permission
  getPermissionStatus() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  // Request user permission for Web Push / System Notifications
  async requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    }
  }

  // Get user notification preferences
  getSettings(userId = 'default') {
    const key = `stl_notification_settings_${userId}`;
    const defaultSettings = {
      sound: true,
      chatNotifications: true,
      auditNotifications: true,
      volume: 0.7
    };
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return defaultSettings;
  }

  // Save user notification preferences
  saveSettings(userId = 'default', settings = {}) {
    const key = `stl_notification_settings_${userId}`;
    try {
      const current = this.getSettings(userId);
      const updated = { ...current, ...settings };
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch (err) {
      console.warn('Failed to save notification settings:', err);
      return settings;
    }
  }

  // Web Audio API Synthesizer for high quality, reliable alert sounds
  playTone(type = 'chat', userId = 'default') {
    const settings = this.getSettings(userId);
    if (!settings.sound) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const vol = settings.volume || 0.7;

      if (type === 'chat') {
        // Friendly modern two-tone pop (D5 -> A5)
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1174.66, now); // D6 harmonic

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } else if (type === 'audit') {
        // Authoritative crisp corporate chime (G5 -> C6)
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.09); // C6

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  }

  // Trigger web notification via ServiceWorker or fallback Notification API
  async dispatchSystemNotification(title, options = {}, onClick = null) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        console.warn('Could not auto-request notification permission:', e);
      }
    }

    if (permission !== 'granted') {
      return null;
    }

    const defaultOptions = {
      icon: '/lbp.png',
      badge: '/lbp.png',
      vibrate: [100, 50, 100],
      renotify: true,
      ...options
    };

    // Try service worker showNotification first
    if (this.swRegistration && 'showNotification' in this.swRegistration) {
      try {
        await this.swRegistration.showNotification(title, defaultOptions);
        return true;
      } catch (swErr) {
        console.warn('SW notification fallback to window Notification:', swErr);
      }
    }

    // Fallback to standard window Notification
    try {
      const notification = new Notification(title, defaultOptions);
      if (onClick) {
        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          onClick(defaultOptions.data);
          notification.close();
        };
      }
      return notification;
    } catch (err) {
      console.warn('Could not display system notification:', err);
      return null;
    }
  }

  // Send real-time Chat web push notification
  async sendChatNotification({
    senderName = 'SSR Agent',
    message = '',
    roomId = null,
    subOffice = '',
    senderId = null,
    currentUserId = 'default',
    onClick = null
  }) {
    const settings = this.getSettings(currentUserId);
    if (!settings.chatNotifications) return false;

    // Play pleasant sound chime
    this.playTone('chat', currentUserId);

    const title = `💬 ${senderName}${subOffice ? ` (${subOffice})` : ''}`;
    const cleanMsg = (message || 'Sent a new message').trim();
    const body = cleanMsg.length > 90 ? `${cleanMsg.slice(0, 87)}...` : cleanMsg;

    return await this.dispatchSystemNotification(title, {
      body,
      tag: `stl-chat-${roomId || senderId || 'global'}`,
      actions: [
        { action: 'open', title: '💬 Open Chat' }
      ],
      data: {
        type: 'CHAT_MESSAGE',
        senderName,
        senderId,
        roomId,
        subOffice,
        timestamp: new Date().toISOString()
      }
    }, onClick);
  }

  // Send real-time Audit Log web push notification
  async sendAuditNotification({
    actorUsername = 'System',
    actorRole = '',
    action = 'ACTIVITY',
    targetType = '',
    targetId = '',
    subOffice = '',
    currentUserId = 'default',
    onClick = null
  }) {
    const settings = this.getSettings(currentUserId);
    if (!settings.auditNotifications) return false;

    // Filter out video call logs from Web Push Notifications
    if (
      action.includes('VIDEO_CALL') || 
      targetType === 'VIDEO_CALL' || 
      action === 'VIDEO_CALL_COMPLETED' ||
      action.includes('CALL_LOG')
    ) {
      return false;
    }

    // Play subtle chime
    this.playTone('audit', currentUserId);

    // Humanize action
    const actionLabel = action.replace(/_/g, ' ');
    const title = `🛡️ STL Audit: ${actionLabel}`;
    const details = [
      targetType ? `Target: ${targetType}` : '',
      targetId ? `#${targetId}` : '',
      subOffice ? `[${subOffice}]` : ''
    ].filter(Boolean).join(' ');

    const body = `${actorUsername}${actorRole ? ` (${actorRole})` : ''} - ${details || 'System log recorded'}`;

    return await this.dispatchSystemNotification(title, {
      body,
      tag: `stl-audit-${Date.now()}`,
      data: {
        type: 'AUDIT_LOG',
        action,
        actorUsername,
        targetType,
        targetId,
        subOffice,
        timestamp: new Date().toISOString()
      }
    }, onClick);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
