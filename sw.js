const CACHE_NAME = 'twhk-portal-v2';
const SHELL_FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for our OWN app shell (index.html, manifest, icons):
// serve instantly from cache so the app opens fast even on a weak/slow signal,
// then quietly fetch a fresh copy in the background for next time.
//
// Any other request (Firebase Auth, Firestore, FCM, etc.) is left completely
// untouched and goes straight to the network — so live signals, login, and
// notifications always use fresh data, never something cached.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isOwnShellRequest = url.origin === self.location.origin;
  if (!isOwnShellRequest) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
