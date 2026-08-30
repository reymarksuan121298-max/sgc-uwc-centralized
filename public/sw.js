// STL Mandaue - Service Worker for Web Push & Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => {
  // Activate immediately without waiting for restart
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Events (if Web Push Server payload sent)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    data = {
      title: 'STL Mandaue System Notification',
      body: event.data ? event.data.text() : 'You have a new update in STL Mandaue.'
    };
  }

  const title = data.title || 'STL Mandaue Notification';
  const options = {
    body: data.body || 'New system activity recorded.',
    icon: data.icon || '/lbp.png',
    badge: data.badge || '/lbp.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    tag: data.tag || 'stl-general-notification',
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
      // 1. If an existing client window is already open, focus it and post action message
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
      // 2. Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
