// EcoHybrid Service Worker v1.0
const CACHE_NAME = 'ecohybrid-v1';
const STATIC_ASSETS = [
  '/ecohybrid/',
  '/ecohybrid/index.html',
  '/ecohybrid/lab.html',
  '/ecohybrid/compat.json',
  '/ecohybrid/manifest.json',
  '/ecohybrid/icon-192.png',
  '/ecohybrid/icon-512.png'
];

// Install: cache assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: pulisci cache vecchie
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: serve da cache, fallback a network
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        // Aggiorna cache in background
        fetch(event.request).then(function(networkResponse) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, networkResponse);
          });
        }).catch(function() {});
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Background Sync: aggiorna meteo e algoritmi anche con app chiusa
self.addEventListener('sync', function(event) {
  if (event.tag === 'ecohybrid-sync') {
    event.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SYNC', tag: 'ecohybrid-sync' });
        });
      })
    );
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || 'EcoHybrid';
  var body = data.body || 'Notifica da EcoHybrid';
  var icon = '/ecohybrid/icon-192.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: icon,
      tag: 'ecohybrid-push',
      requireInteraction: false
    })
  );
});

// Clic su notifica
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/ecohybrid/')
  );
});
