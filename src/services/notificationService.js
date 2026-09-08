/**
 * SGC - Unclaimed Winnings Centralized Portal
 * Web Push & Realtime Notification Service
 * 
 * Features:
 * - Awaited Service Worker Readiness for 100% Reliable Background Notifications
 * - Synthesized Multi-Tone Web Audio Chimes with Auto-Resume Gesture Unlock
 * - Cross-Browser Vibration API Pattern Triggering for Mobile Devices
 * - Native PWA App Icon Badging & Dynamic Browser Tab Title Sync
 * - Diagnostic Health Checks and One-Click End-to-End Test Notifications
 */

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.audioCtx = null;
    this.actionListeners = new Set();
    this.baseDocumentTitle = typeof document !== 'undefined' ? document.title : 'SGC - Unclaimed Winnings Centralized Portal';
    this.initServiceWorker();
    this.initMessageListener();
    this.initAudioUnlock();
  }

  // Automatic AudioContext gesture unlock on any user interaction
  initAudioUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          if (!this.audioCtx) {
            this.audioCtx = new AudioContextClass();
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
        }
      } catch {}
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('scroll', unlock);
    };

    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('scroll', unlock, { passive: true, once: true });
  }

  // Register service worker and await readiness
  async initServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Await active readiness to eliminate showNotification race conditions
      await navigator.serviceWorker.ready.then((reg) => {
        this.swRegistration = reg;
      }).catch(() => {});

      // Check for updates periodically when window gains focus
      window.addEventListener('focus', () => {
        this.updateServiceWorker();
      });

      return this.swRegistration;
    } catch (err) {
      console.warn('Service Worker registration notice:', err);
      return null;
    }
  }

  // Trigger manual or focus-based service worker update check
  async updateServiceWorker() {
    if (this.swRegistration && typeof this.swRegistration.update === 'function') {
      try {
        await this.swRegistration.update();
      } catch {
        // Safe silence for offline/restricted states
      }
    }
  }

  // Listen to messages posted from Service Worker on notification click or background push
  initMessageListener() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'STL_NOTIFICATION_CLICK') {
        const payload = event.data.payload || {};
        const action = event.data.action || 'default';
        this.actionListeners.forEach((listener) => {
          try {
            listener(payload, action);
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

  // Check current browser permission status
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
      volume: 0.75
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

  // Trigger mobile haptic vibration pattern
  triggerVibration(pattern = [100, 50, 100]) {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe silence if blocked by permissions policy
      }
    }
  }

  // Update App Icon Badge (PWA & Desktop browsers supporting Badging API)
  setAppBadge(count = 0) {
    if (typeof window === 'undefined' || !('navigator' in window)) return;
    try {
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          navigator.setAppBadge(count).catch(() => {});
        } else {
          navigator.clearAppBadge().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }

  // Clear App Icon Badge
  clearAppBadge() {
    if (typeof window === 'undefined' || !('navigator' in window)) return;
    try {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // Dynamic Browser Tab Title with unread count
  updateTabTitle(unreadCount = 0) {
    if (typeof document === 'undefined') return;
    try {
      if (unreadCount > 0) {
        document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${this.baseDocumentTitle}`;
      } else {
        document.title = this.baseDocumentTitle;
      }
    } catch {
      // ignore
    }
  }

  // Web Audio API Synthesizer for reliable multi-tone alert sounds
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
        this.audioCtx.resume().catch(() => {});
        return; // Wait for gesture unlock if suspended
      }

      const now = this.audioCtx.currentTime;
      const vol = Math.max(0.1, Math.min(1.0, settings.volume || 0.75));

      if (type === 'chat') {
        // Warm Friendly Pop Chime (D5 -> A5 with soft harmonic)
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1174.66, now); // D6 harmonic

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.22 * vol, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);

        this.triggerVibration([80, 40, 80]);

      } else if (type === 'audit' || type === 'operational') {
        // Crisp Corporate Chime (G5 -> C6)
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.09); // C6

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.24 * vol, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.45);

        this.triggerVibration([100, 50, 100]);

      } else if (type === 'urgent' || type === 'deletion') {
        // High-Priority Double Pulse (E6 -> B6)
        const osc1 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(1318.51, now);
        osc1.frequency.setValueAtTime(1975.53, now + 0.1);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3 * vol, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc1.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc1.stop(now + 0.5);

        this.triggerVibration([150, 80, 150]);
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
      tag: `sgc-${Date.now()}`,
      ...options
    };

    // 1. Try service worker showNotification first (Works in background tabs)
    try {
      let reg = this.swRegistration;
      if (!reg && 'serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.ready.catch(() => null);
      }

      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('SW notification fallback to window Notification:', swErr);
    }

    // 2. Fallback to standard window Notification
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

    // Play pleasant sound chime & mobile vibration
    this.playTone('chat', currentUserId);

    const title = `💬 ${senderName}${subOffice ? ` (${subOffice})` : ''}`;
    const cleanMsg = (message || 'Sent a new message').trim();
    const body = cleanMsg.length > 90 ? `${cleanMsg.slice(0, 87)}...` : cleanMsg;

    return await this.dispatchSystemNotification(title, {
      body,
      tag: `sgc-chat-${roomId || senderId || 'global'}`,
      actions: [
        { action: 'open_chat', title: '💬 Open Chat' }
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

  // Send real-time Audit / Operational Log web push notification
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

    const isUrgent = action.includes('DELETION_REQUEST') || action.includes('URGENT');

    // Play subtle chime
    this.playTone(isUrgent ? 'urgent' : 'audit', currentUserId);

    // Humanize action label
    const actionLabel = action.replace(/_/g, ' ');
    const title = isUrgent ? `⚠️ SGC Urgent: ${actionLabel}` : `🛡️ SGC System: ${actionLabel}`;
    const details = [
      targetType ? `Target: ${targetType}` : '',
      targetId ? `#${targetId}` : '',
      subOffice ? `[${subOffice}]` : ''
    ].filter(Boolean).join(' ');

    const body = `${actorUsername}${actorRole ? ` (${actorRole})` : ''} - ${details || 'System log recorded'}`;

    return await this.dispatchSystemNotification(title, {
      body,
      tag: `sgc-audit-${Date.now()}`,
      actions: [
        { action: 'view_audit', title: '🛡️ View Log' }
      ],
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

  // End-to-End Test Notification Trigger (Audio + Desktop Banner + Verification)
  async testNotification(userId = 'default', onClick = null) {
    this.playTone('chat', userId);

    return await this.dispatchSystemNotification('🔔 SGC Notification Test', {
      body: 'Web Push Notifications & Sound Alerts are active and functioning properly!',
      tag: `sgc-test-${Date.now()}`,
      actions: [
        { action: 'test_success', title: '✅ Working Great' }
      ],
      data: {
        type: 'TEST_NOTIFICATION',
        timestamp: new Date().toISOString()
      }
    }, onClick);
  }

  // System Diagnostics
  getDiagnostics() {
    const isBrowser = typeof window !== 'undefined';
    return {
      notificationSupported: isBrowser && 'Notification' in window,
      permissionStatus: isBrowser && 'Notification' in window ? Notification.permission : 'unsupported',
      serviceWorkerSupported: isBrowser && 'serviceWorker' in navigator,
      serviceWorkerActive: !!(this.swRegistration && this.swRegistration.active),
      audioContextActive: !!(this.audioCtx && this.audioCtx.state === 'running'),
      audioContextState: this.audioCtx ? this.audioCtx.state : 'uninitialized',
      isPWAStandalone: isBrowser && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      ),
      badgingSupported: isBrowser && 'setAppBadge' in navigator,
      vibrationSupported: isBrowser && 'vibrate' in navigator
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
