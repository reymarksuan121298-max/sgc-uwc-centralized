// SGC Portal - Progressive Web Application (PWA) Service Worker
// Provides Offline Caching, Background Web Push, Action Buttons & Cross-Tab Coordination
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'sgc-portal-v2.1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/lbp.png',
  '/stl.jpg'
];

// Install Event: Precache core shell assets & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up legacy caches & take immediate control of clients
self.addEventListener('activate', (event) => {
  const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => isDev || name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event: Allow clients to control service worker lifecycle
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: Stale-While-Revalidate for static assets; Network-First for API & navigation
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // In local development or Vite HMR, bypass SW fetch handling entirely
  const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  if (
    isDev ||
    request.method !== 'GET' ||
    !request.url.startsWith('http') ||
    request.headers.get('upgrade') === 'websocket' ||
    request.url.includes('/@vite/') ||
    request.url.includes('/@fs/') ||
    request.url.includes('/@id/') ||
    request.url.includes('node_modules') ||
    request.url.includes('token=') ||
    request.url.includes('supabase.co') ||
    request.url.includes('/rest/v1/') ||
    request.url.includes('turn:') ||
    request.url.includes('stun:')
  ) {
    return;
  }

  // HTML navigation requests: Network first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Handle Background Web Push Events
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    data = {
      title: 'SGC Portal Notification',
      body: event.data ? event.data.text() : 'You have a new update in SGC Portal.'
    };
  }

  const title = data.title || 'SGC Portal';
  const options = {
    body: data.body || 'New system activity recorded.',
    icon: data.icon || '/lbp.png',
    badge: data.badge || '/lbp.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: data.data || {},
    tag: data.tag || `sgc-${Date.now()}`,
    renotify: data.renotify !== false,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'open', title: '👁️ Open Portal' }
    ]
  };

  // Optional App Badge synchronization if provided in push payload
  if (typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(data.badgeCount).catch(() => {});
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle Notification Clicks (Focuses existing window or opens target URL)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and dispatch event
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'STL_NOTIFICATION_CLICK',
            action: action || 'default',
            payload: notificationData
          });
          return;
        }
      }
      // If no window is currently open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl).then((newClient) => {
          if (newClient) {
            setTimeout(() => {
              newClient.postMessage({
                type: 'STL_NOTIFICATION_CLICK',
                action: action || 'default',
                payload: notificationData
              });
            }, 1000);
          }
        });
      }
    })
  );
});
