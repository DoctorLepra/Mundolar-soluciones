// Minimal Service Worker for PWA and Push Notifications
const CACHE_NAME = 'mundolar-cache-v1';
const urlsToCache = [
  '/admin',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Bypassing cache for now to ensure realtime works
  event.respondWith(fetch(event.request));
});

// Listener for Push Notifications (Background)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nueva Notificación', body: 'Tienes una nueva actualización en Mundolar.' };

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.url || '/admin'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Listener for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
