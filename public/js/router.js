// Fase 4.2 · Enrutador del lado del cliente (CSR) basado en el hash de la URL.
// El hash (#/ruta) funciona sin configurar el servidor, también en GitHub Pages.

const rutas = [];

/** Registra una ruta. El patrón admite parámetros: '/cafe/:id'. */
export function ruta(patron, vista, nombre) {
  const claves = [];
  const regex = new RegExp('^' + patron.replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; }) + '$');
  rutas.push({ regex, claves, vista, nombre });
}

export function navegar(hash) {
  location.hash = hash;
}

async function resolver() {
  const camino = (location.hash.slice(1) || '/').split('?')[0];
  const contenedor = document.getElementById('app');
  const encontrada = rutas.find((r) => r.regex.test(camino));

  document.querySelectorAll('.nav a').forEach((a) => {
    a.classList.toggle('activo', !!encontrada && a.dataset.ruta === encontrada.nombre);
  });

  if (!encontrada) {
    contenedor.innerHTML = '<section class="tarjeta vacio"><h1>404</h1><p>Esta ruta no existe.</p><a class="btn" href="#/">Ir al inicio</a></section>';
    return;
  }
  const valores = camino.match(encontrada.regex).slice(1).map(decodeURIComponent);
  const params = Object.fromEntries(encontrada.claves.map((k, i) => [k, valores[i]]));

  contenedor.innerHTML = '<p class="cargando">Cargando…</p>';
  try {
    await encontrada.vista(contenedor, params);
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = `<section class="tarjeta vacio"><h2>No se pudo cargar</h2><p>${err.message}</p></section>`;
  }
  contenedor.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/** Inicia el enrutador y devuelve una promesa que se cumple al pintar la primera vista. */
export function iniciarRouter() {
  window.addEventListener('hashchange', resolver);
  return resolver();
}
