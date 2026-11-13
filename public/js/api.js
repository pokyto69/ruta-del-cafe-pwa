// Fase 4.1 · Acceso a los datos remotos del catálogo.
// Fase 6.3 · Respaldo local: cada respuesta correcta se copia a IndexedDB y,
//             si la red falla, se leen los datos guardados.
// Rutas relativas para que funcione en localhost y bajo /ruta-del-cafe-pwa/ en GitHub Pages.
// Si la API del servidor no existe (GitHub Pages), se usa el JSON estático.
import { obtenerTodos, obtener, reemplazarTodos } from './db.js';
import { HOSTING_ESTATICO } from './utils.js';

/** Origen de los últimos datos mostrados: 'red' | 'local'. */
export let origenDatos = 'red';

async function obtenerJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  const tipo = r.headers.get('content-type') || '';
  if (!tipo.includes('json')) throw new Error(`Respuesta no JSON en ${url}`);
  return r.json();
}

async function catalogoRemoto() {
  if (HOSTING_ESTATICO) return obtenerJSON('data/cafes.json');
  try {
    return await obtenerJSON('api/cafes');
  } catch {
    return obtenerJSON('data/cafes.json');
  }
}

export async function listarCafes() {
  try {
    const cafes = await catalogoRemoto();
    origenDatos = 'red';
    reemplazarTodos('cafes', cafes).catch((e) => console.warn('[API] No se pudo respaldar:', e));
    return cafes;
  } catch (err) {
    const locales = await obtenerTodos('cafes');
    if (!locales.length) throw new Error('Sin conexión y sin datos guardados todavía.');
    console.info('[API] Usando respaldo local de IndexedDB');
    origenDatos = 'local';
    return locales;
  }
}

export async function obtenerCafe(id) {
  const numId = Number(id);
  try {
    try {
      if (HOSTING_ESTATICO) throw new Error('Sin API en hosting estático');
      return await obtenerJSON(`api/cafes/${encodeURIComponent(id)}`);
    } catch (e) {
      if (String(e.message).includes('404')) throw e;
      const cafe = (await obtenerJSON('data/cafes.json')).find((c) => c.id === numId);
      if (!cafe) throw new Error('HTTP 404 Cafetería no encontrada');
      return cafe;
    }
  } catch (err) {
    const local = await obtener('cafes', numId);
    if (local) { origenDatos = 'local'; return local; }
    throw err;
  }
}
