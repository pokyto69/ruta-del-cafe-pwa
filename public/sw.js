// Service worker de «Ruta del Café».
// Fase 3: eventos install / activate / fetch.
// Fase 7: tres estrategias de caché y página offline.
const VERSION = 'v5';
const CACHE_SHELL = `shell-${VERSION}`;     // app shell precacheado (cache first)
const CACHE_DATOS = `datos-${VERSION}`;     // respuestas de la API (network first)
const CACHE_PAGINAS = `paginas-${VERSION}`; // fichas SSR (stale-while-revalidate)
const CACHES_ACTUALES = [CACHE_SHELL, CACHE_DATOS, CACHE_PAGINAS];

const SHELL = [
  './',
  './index.html',
  './offline.html',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/vistas.js',
  './js/api.js',
  './js/utils.js',
  './js/splash.js',
  './js/instalacion.js',
  './js/db.js',
  './js/prefs.js',
  './js/favoritos.js',
  './js/conexion.js',
  './js/ficha.js',
  './data/cafes.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/favicon-32.png',
];

// ---------- Ciclo de vida ----------
self.addEventListener('install', (event) => {
  console.log('[SW] install', VERSION);
  event.waitUntil(caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate', VERSION);
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((c) => !CACHES_ACTUALES.includes(c)).map((c) => caches.delete(c)))
    )
  );
});

// ---------- Estrategias ----------

/** CACHE FIRST: responde desde la caché; si no está, va a la red y guarda la copia. */
async function cacheFirst(request, nombreCache = CACHE_SHELL) {
  const enCache = await caches.match(request, { ignoreSearch: true });
  if (enCache) return enCache;
  const respuesta = await fetch(request);
  if (respuesta.ok) (await caches.open(nombreCache)).put(request, respuesta.clone());
  return respuesta;
}

/** NETWORK FIRST: intenta la red (datos frescos); si falla, usa la última copia guardada. */
async function networkFirst(request, nombreCache = CACHE_DATOS) {
  const cache = await caches.open(nombreCache);
  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) cache.put(request, respuesta.clone());
    return respuesta;
  } catch (err) {
    // Busca en todas las cachés (data/cafes.json también está en el precache del shell)
    const enCache = await caches.match(request);
    if (enCache) return enCache;
    throw err;
  }
}

/** STALE-WHILE-REVALIDATE: responde al instante con la caché y la actualiza en segundo plano. */
async function staleWhileRevalidate(event, nombreCache = CACHE_PAGINAS) {
  const cache = await caches.open(nombreCache);
  const enCache = await cache.match(event.request);
  const deRed = fetch(event.request)
    .then((respuesta) => {
      if (respuesta.ok) cache.put(event.request, respuesta.clone());
      return respuesta;
    })
    .catch(() => null);
  event.waitUntil(deRed);
  return enCache || (await deRed) || caches.match('./offline.html');
}

// ---------- Enrutamiento de peticiones ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET del mismo origen; lo demás (POST de reseñas, push, CDNs) pasa directo a la red.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const ruta = url.pathname.slice(new URL(self.registration.scope).pathname.length);

  // 1) Fichas SSR (/cafe/:id) → stale-while-revalidate
  if (/^cafe\/[^/]+$/.test(ruta)) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // 2) Datos (API y JSON del catálogo) → network first
  if (ruta.startsWith('api/') || ruta.startsWith('data/')) {
    event.respondWith(
      networkFirst(request).catch(() =>
        new Response(JSON.stringify({ error: 'sin-conexion' }), {
          status: 503, headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  // 3) Navegación a la app → el shell desde la caché (cache first); si falla, offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      cacheFirst(new Request('./index.html'))
        .catch(() => caches.match('./offline.html'))
    );
    return;
  }

  // 4) Recursos estáticos (CSS, JS, íconos) → cache first
  event.respondWith(
    cacheFirst(request).catch(() => new Response('', { status: 504, statusText: 'Sin conexión' }))
  );
});
