import { useState, useEffect, useCallback } from 'react';
import { presenceService } from '../services/presenceService';

/**
 * Custom hook to consume real-time global user presence in React components.
 */
export function useGlobalPresence(currentUser) {
  const [onlineUserIds, setOnlineUserIds] = useState(() => presenceService.onlineUserIds);
  const [presenceMap, setPresenceMap] = useState(() => presenceService.presenceMap);

  useEffect(() => {
    if (!currentUser) {
      presenceService.cleanupChannel();
      setOnlineUserIds(new Set());
      setPresenceMap({});
      return;
    }

    const unsubscribe = presenceService.subscribe(currentUser, (onlineSet, pMap) => {
      setOnlineUserIds(onlineSet);
      setPresenceMap(pMap);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const isUserOnline = useCallback((userOrKey) => {
    return presenceService.isUserOnline(userOrKey, onlineUserIds);
  }, [onlineUserIds]);

  return { onlineUserIds, presenceMap, isUserOnline };
}
