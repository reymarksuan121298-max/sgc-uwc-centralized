// STL Mandaue - Progressive Web Application (PWA) Service Worker
// Provides Offline Caching, Background Web Push & App Lifecycle Management
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'sgc-portal-v2.0';
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

// Activate Event: Clean up legacy caches & take control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate for static assets; Network-First for API calls
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests, chrome-extensions, and Supabase REST/WebSocket realtime calls
  if (
    request.method !== 'GET' ||
    !request.url.startsWith('http') ||
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

// Handle Background Push Events
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
    vibrate: [100, 50, 100],
    data: data.data || {},
    tag: data.tag || 'sgc-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'STL_NOTIFICATION_CLICK',
            payload: notificationData
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
