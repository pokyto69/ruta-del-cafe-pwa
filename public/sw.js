// Service worker básico · Fase 3
// Tres eventos base: install (precachear el shell), activate (limpiar cachés viejas), fetch (servir desde caché).
const VERSION = 'v2';
const CACHE_SHELL = `shell-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/vistas.js',
  './js/api.js',
  './js/utils.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  console.log('[SW] install', VERSION);
  event.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate', VERSION);
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => c !== CACHE_SHELL).map((c) => caches.delete(c)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Cache first: si está en caché se responde de inmediato; si no, se va a la red.
  event.respondWith(
    caches.match(event.request).then((enCache) => enCache || fetch(event.request))
  );
});
