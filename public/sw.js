// Freshioz Admin Service Worker Self-Unregister & Cache Buster
// Guarantees all admin browsers immediately flush cached shells, remove synthetic 503 errors, and receive live code
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // Let all fetch requests pass through directly to the network
  return;
});
