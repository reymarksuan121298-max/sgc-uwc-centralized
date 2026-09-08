import { supabase } from '../config/supabaseClient';

/**
 * Enterprise Global Presence Service
 * Provides reliable, synchronized real-time online/offline presence tracking across all components.
 */
class PresenceService {
  constructor() {
    this.channel = null;
    this.currentUser = null;
    this.listeners = new Set();
    this.onlineUserIds = new Set();
    this.presenceMap = {};
    this.heartbeatTimer = null;
    this.isSubscribed = false;
    this.setupWindowListeners();
  }

  setupWindowListeners() {
    if (typeof window === 'undefined') return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && this.currentUser) {
        if (!this.channel || !this.isSubscribed) {
          this.initPresenceChannel();
        } else {
          this.trackSelf();
        }
      }
    };

    const handleOnline = () => {
      if (this.currentUser) {
        this.initPresenceChannel();
      }
    };

    const handleBeforeUnload = () => {
      this.untrack();
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  normalize(val) {
    if (!val) return '';
    return String(val).trim().toLowerCase();
  }

  /**
   * Subscribes a listener to presence updates
   */
  subscribe(currentUser, callback) {
    if (callback) {
      this.listeners.add(callback);
      // Immediately notify listener with current cached state
      callback(new Set(this.onlineUserIds), { ...this.presenceMap });
    }

    const userChanged = this.currentUser?.id !== currentUser?.id || 
                        this.currentUser?.username !== currentUser?.username;
    
    if (currentUser && (!this.channel || userChanged)) {
      this.currentUser = currentUser;
      this.initPresenceChannel();
    }

    return () => {
      if (callback) {
        this.listeners.delete(callback);
      }
    };
  }

  notifyListeners() {
    const onlineCopy = new Set(this.onlineUserIds);
    const mapCopy = { ...this.presenceMap };
    this.listeners.forEach((cb) => {
      try {
        cb(onlineCopy, mapCopy);
      } catch (err) {
        console.warn('[PresenceService] Listener error:', err);
      }
    });
  }

  initPresenceChannel() {
    if (!this.currentUser) return;

    this.cleanupChannel();

    const userKey = this.normalize(this.currentUser.id || this.currentUser.username);

    this.channel = supabase.channel('global_presence', {
      config: {
        presence: {
          key: userKey || 'anon',
        },
      },
    });

    const updatePresenceFromState = () => {
      if (!this.channel) return;
      const state = this.channel.presenceState();
      const online = new Set();
      const newPresenceMap = {};

      Object.entries(state).forEach(([key, presences]) => {
        if (key && key !== 'anon') {
          online.add(this.normalize(key));
        }
        if (Array.isArray(presences)) {
          presences.forEach((p) => {
            if (p.id) online.add(this.normalize(p.id));
            if (p.username) online.add(this.normalize(p.username));
            if (p.full_name) online.add(this.normalize(p.full_name));
            if (p.fullName) online.add(this.normalize(p.fullName));
            if (p.name) online.add(this.normalize(p.name));

            const pKey = this.normalize(p.id || p.username || key);
            if (pKey) {
              newPresenceMap[pKey] = {
                ...p,
                online_at: p.online_at || new Date().toISOString()
              };
            }
          });
        }
      });

      // Always include current user as online
      if (this.currentUser) {
        if (this.currentUser.id) online.add(this.normalize(this.currentUser.id));
        if (this.currentUser.username) online.add(this.normalize(this.currentUser.username));
        if (this.currentUser.full_name) online.add(this.normalize(this.currentUser.full_name));
        if (this.currentUser.fullName) online.add(this.normalize(this.currentUser.fullName));
      }

      this.onlineUserIds = online;
      this.presenceMap = newPresenceMap;
      this.notifyListeners();
    };

    this.channel
      .on('presence', { event: 'sync' }, updatePresenceFromState)
      .on('presence', { event: 'join' }, updatePresenceFromState)
      .on('presence', { event: 'leave' }, updatePresenceFromState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          await this.trackSelf();
          updatePresenceFromState();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.isSubscribed = false;
        }
      });

    this.startHeartbeat();
  }

  async trackSelf() {
    if (!this.channel || !this.currentUser) return;
    try {
      await this.channel.track({
        id: String(this.currentUser.id || ''),
        username: String(this.currentUser.username || ''),
        full_name: String(this.currentUser.full_name || this.currentUser.fullName || ''),
        role: this.currentUser.role || '',
        sub_office: this.currentUser.sub_office || '',
        online_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[PresenceService] track failed:', err);
    }
  }

  async untrack() {
    if (this.channel) {
      try {
        await this.channel.untrack();
      } catch {
        // ignore
      }
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    // Refresh presence every 25 seconds to guarantee active online presence
    this.heartbeatTimer = setInterval(async () => {
      if (this.isSubscribed && this.channel && this.currentUser) {
        await this.trackSelf();
      } else if (this.currentUser) {
        this.initPresenceChannel();
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  cleanupChannel() {
    this.stopHeartbeat();
    if (this.channel) {
      try {
        this.channel.untrack();
      } catch {}
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isSubscribed = false;
    }
  }

  /**
   * Check if a given user object, ID, username, or full name is currently online
   */
  isUserOnline(userOrKey, customSet = null) {
    const set = customSet || this.onlineUserIds;
    if (!userOrKey || !set) return false;
    
    if (typeof userOrKey === 'string') {
      const normalizedKey = this.normalize(userOrKey);
      return set.has(normalizedKey);
    }

    const id = this.normalize(userOrKey.id);
    const username = this.normalize(userOrKey.username);
    const fullName = this.normalize(userOrKey.full_name || userOrKey.fullName || userOrKey.name);

    return (Boolean(id) && set.has(id)) || 
           (Boolean(username) && set.has(username)) || 
           (Boolean(fullName) && set.has(fullName));
  }
}

export const presenceService = new PresenceService();
