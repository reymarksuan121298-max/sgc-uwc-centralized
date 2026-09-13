import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabaseClient';

class ServerTimeManager {
  constructor() {
    this.serverOffsetMs = null; // serverTimeMs - performance.now()
    this.isSynced = false;
    this.isSyncing = false;
    this.syncPromise = null;
    this.lastSyncTime = 0;
    this.rtt = 0;
  }

  async fetchServerTime() {
    // 1. Try Supabase REST API HEAD request to read HTTP Date header
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kiuykhakbpjesoofinil.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdXlraGFrYnBqZXNvb2ZpbmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDAxNDAsImV4cCI6MjA5NTE3NjE0MH0.g6eFVGHsX6svgWpWKGHNCFsYYF7kEhLGkEKBgAtcA4E';
      
      const tStart = performance.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, {
        method: 'HEAD',
        cache: 'no-store',
        headers: {
          'apikey': supabaseAnonKey
        }
      });
      const tEnd = performance.now();
      const rtt = tEnd - tStart;

      const dateHeader = res.headers.get('date');
      if (dateHeader) {
        const serverMs = new Date(dateHeader).getTime() + (rtt / 2);
        this.serverOffsetMs = serverMs - tEnd;
        this.isSynced = true;
        this.rtt = rtt;
        this.lastSyncTime = Date.now();
        return serverMs;
      }
    } catch (err) {
      console.warn('Supabase server time fetch error:', err);
    }

    // 2. Try WorldTimeAPI for Asia/Manila
    try {
      const tStart = performance.now();
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila', {
        cache: 'no-store'
      });
      const tEnd = performance.now();
      const rtt = tEnd - tStart;
      if (res.ok) {
        const data = await res.json();
        const serverMs = (data.unixtime * 1000) + (rtt / 2);
        this.serverOffsetMs = serverMs - tEnd;
        this.isSynced = true;
        this.rtt = rtt;
        this.lastSyncTime = Date.now();
        return serverMs;
      }
    } catch (err) {
      console.warn('WorldTimeAPI fetch error:', err);
    }

    // 3. Try TimeAPI.io as secondary fallback
    try {
      const tStart = performance.now();
      const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Manila', {
        cache: 'no-store'
      });
      const tEnd = performance.now();
      const rtt = tEnd - tStart;
      if (res.ok) {
        const data = await res.json();
        if (data.dateTime) {
          const serverMs = new Date(data.dateTime).getTime() + (rtt / 2);
          this.serverOffsetMs = serverMs - tEnd;
          this.isSynced = true;
          this.rtt = rtt;
          this.lastSyncTime = Date.now();
          return serverMs;
        }
      }
    } catch (err) {
      console.warn('TimeAPI.io fetch error:', err);
    }

    // Fallback: If all network calls fail, use client clock
    if (this.serverOffsetMs === null) {
      this.serverOffsetMs = Date.now() - performance.now();
    }
    return Date.now();
  }

  async sync() {
    if (this.isSyncing) return this.syncPromise;
    this.isSyncing = true;
    this.syncPromise = this.fetchServerTime()
      .finally(() => {
        this.isSyncing = false;
        this.syncPromise = null;
      });
    return this.syncPromise;
  }

  getServerDate() {
    if (this.serverOffsetMs === null) {
      return new Date();
    }
    // High-precision monotonic calculation immune to PC clock changes
    const currentServerEpochMs = this.serverOffsetMs + performance.now();
    return new Date(currentServerEpochMs);
  }
}

export const serverTimeManager = new ServerTimeManager();

/**
 * React hook to get a live, continuous server clock
 * Formatted specifically for Philippine Standard Time (Asia/Manila, UTC+8)
 */
export function useServerTime(active = true) {
  const [currentDate, setCurrentDate] = useState(() => serverTimeManager.getServerDate());
  const [isSynced, setIsSynced] = useState(serverTimeManager.isSynced);
  const [isLoading, setIsLoading] = useState(!serverTimeManager.isSynced);

  const resync = useCallback(async () => {
    setIsLoading(true);
    await serverTimeManager.sync();
    setIsSynced(serverTimeManager.isSynced);
    setCurrentDate(serverTimeManager.getServerDate());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    // Initial sync if not yet done or older than 5 minutes
    if (!serverTimeManager.isSynced || (Date.now() - serverTimeManager.lastSyncTime > 300000)) {
      serverTimeManager.sync().then(() => {
        if (mounted) {
          setIsSynced(serverTimeManager.isSynced);
          setIsLoading(false);
          setCurrentDate(serverTimeManager.getServerDate());
        }
      });
    } else {
      setIsLoading(false);
    }

    // High frequency interval (updates smoothly every second)
    const intervalId = setInterval(() => {
      if (mounted) {
        setCurrentDate(serverTimeManager.getServerDate());
      }
    }, 1000);

    // Periodic re-sync every 60 seconds to eliminate monotonic clock drift
    const resyncIntervalId = setInterval(() => {
      serverTimeManager.sync().then(() => {
        if (mounted) {
          setIsSynced(serverTimeManager.isSynced);
        }
      });
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      clearInterval(resyncIntervalId);
    };
  }, [active]);

  // Formatter for Philippine Time
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return {
    currentDate,
    formattedDate,
    formattedTime,
    isSynced,
    isLoading,
    resync
  };
}

export default serverTimeManager;
