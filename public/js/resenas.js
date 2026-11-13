// Fase 8.2 · Reseñas: guardar local primero, enviar después.
// 1. La reseña se guarda en IndexedDB con estado «pendiente» (funciona sin red).
// 2. Se pide al service worker un Background Sync («enviar-resenas»).
// 3. Cuando hay conexión, el SW envía las pendientes y avisa a la página.
// Navegadores sin Background Sync (Firefox, Safari): se envían desde la página al volver la red.
import { guardar, porIndice, obtenerTodos } from './db.js';
import { escapar, estrellas, fecha, avisar, HOSTING_ESTATICO } from './utils.js';
import { leerPrefs, guardarPref } from './prefs.js';

export const ETIQUETA_SYNC = 'enviar-resenas';

const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const hayBackgroundSync = () => 'serviceWorker' in navigator && 'SyncManager' in window;

export async function guardarResena({ cafeId, autor, texto, puntuacion }) {
  const resena = {
    idLocal: nuevoId(),
    cafeId: Number(cafeId),
    autor: autor || 'Anónimo',
    texto,
    puntuacion: Number(puntuacion),
    creadaEn: Date.now(),
    estado: 'pendiente',
  };
  await guardar('resenas', resena);
  await programarEnvio();
  return resena;
}

/** Pide un Background Sync o, si no existe, intenta enviar ya. */
export async function programarEnvio() {
  if (hayBackgroundSync()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(ETIQUETA_SYNC);
      console.log('[Reseñas] Background Sync registrado:', ETIQUETA_SYNC);
      return 'sync';
    } catch (err) {
      console.warn('[Reseñas] No se pudo registrar el sync, se envía desde la página:', err);
    }
  }
  if (navigator.onLine) await enviarPendientesDesdePagina();
  return 'pagina';
}

/** Alternativa sin Background Sync: misma lógica que el SW, ejecutada en la página. */
export async function enviarPendientesDesdePagina() {
  if (HOSTING_ESTATICO) return 0; // sin servidor: quedan pendientes en IndexedDB
  const pendientes = await porIndice('resenas', 'estado', 'pendiente');
  let enviadas = 0;
  for (const r of pendientes) {
    try {
      const resp = await fetch('api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
      if (!resp.ok) break;
      await guardar('resenas', { ...r, estado: 'enviada', enviadaEn: Date.now() });
      enviadas++;
    } catch { break; }
  }
  if (enviadas) document.dispatchEvent(new CustomEvent('resenas-sincronizadas', { detail: { enviadas } }));
  return enviadas;
}

export async function contarPendientes() {
  return (await porIndice('resenas', 'estado', 'pendiente')).length;
}

async function resenasDelServidor(cafeId) {
  if (HOSTING_ESTATICO) return [];
  try {
    const r = await fetch(`api/resenas?cafeId=${encodeURIComponent(cafeId)}`);
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return [];
    const datos = await r.json();
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

/** Une las reseñas del servidor con las locales (sin duplicar las ya enviadas). */
export async function listarResenas(cafeId) {
  const [remotas, locales] = await Promise.all([resenasDelServidor(cafeId), porIndice('resenas', 'cafeId', Number(cafeId))]);
  const idsRemotos = new Set(remotas.map((r) => r.idLocal));
  const soloLocales = locales.filter((r) => !idsRemotos.has(r.idLocal));
  return [...soloLocales, ...remotas].sort((a, b) => b.creadaEn - a.creadaEn);
}

// ---------- Interfaz ----------
function itemResena(r) {
  const pendiente = r.estado === 'pendiente';
  return `
    <li class="resena ${pendiente ? 'resena--pendiente' : ''}">
      <strong>${escapar(r.autor)}</strong>
      <span class="estrellas">${estrellas(r.puntuacion)}</span>
      ${pendiente ? '<span class="insignia">Pendiente de envío</span>' : ''}
      <p style="margin:.3em 0">${escapar(r.texto)}</p>
      <small class="meta">${fecha(r.creadaEn)}</small>
    </li>`;
}

/** Pinta la sección de reseñas (formulario + lista) dentro de `contenedor`. */
export async function montarResenas(contenedor, cafeId) {
  const prefs = leerPrefs();
  contenedor.innerHTML = `
    <section class="tarjeta">
      <h2>Reseñas</h2>
      <form id="form-resena" novalidate>
        <label for="r-autor">Tu nombre</label>
        <input type="text" id="r-autor" maxlength="40" placeholder="Anónimo" value="${escapar(prefs.nombreAutor)}">
        <label for="r-puntuacion">Puntuación</label>
        <select id="r-puntuacion">
          <option value="5">★★★★★ Excelente</option>
          <option value="4">★★★★☆ Muy bueno</option>
          <option value="3">★★★☆☆ Bueno</option>
          <option value="2">★★☆☆☆ Regular</option>
          <option value="1">★☆☆☆☆ Malo</option>
        </select>
        <label for="r-texto">Comentario</label>
        <textarea id="r-texto" maxlength="1000" required placeholder="¿Qué tal el café?"></textarea>
        <div class="acciones"><button class="btn" type="submit">Publicar reseña</button></div>
        <p class="meta">Funciona sin conexión: se guarda en tu dispositivo y se envía sola al recuperar la red.</p>
      </form>
      <ul class="resenas" id="lista-resenas" style="margin-top:16px"></ul>
    </section>`;

  const lista = contenedor.querySelector('#lista-resenas');
  const pintar = async () => {
    const resenas = await listarResenas(cafeId);
    lista.innerHTML = resenas.length ? resenas.map(itemResena).join('') : '<li class="vacio">Aún no hay reseñas. ¡Sé el primero!</li>';
  };

  contenedor.querySelector('#form-resena').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = contenedor.querySelector('#r-texto').value.trim();
    if (!texto) { contenedor.querySelector('#r-texto').focus(); return; }
    const autor = contenedor.querySelector('#r-autor').value.trim();
    if (autor) guardarPref('nombreAutor', autor);
    await guardarResena({ cafeId, autor, texto, puntuacion: contenedor.querySelector('#r-puntuacion').value });
    contenedor.querySelector('#r-texto').value = '';
    avisar(navigator.onLine ? 'Reseña guardada; enviándola…' : 'Sin conexión: reseña guardada, se enviará al volver la red');
    pintar();
  });

  // Repintar cuando el SW (o la página) termine de sincronizar
  const alSincronizar = () => pintar();
  document.addEventListener('resenas-sincronizadas', alSincronizar);
  window.addEventListener('hashchange', () => document.removeEventListener('resenas-sincronizadas', alSincronizar), { once: true });

  await pintar();
}

/** Escucha los mensajes del SW y el regreso de la red. Se llama una vez al iniciar la app. */
export function iniciarSincronizacionResenas() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.tipo === 'resenas-sincronizadas') {
        avisar(`✔ ${e.data.enviadas} reseña(s) sincronizada(s) con el servidor`);
        document.dispatchEvent(new CustomEvent('resenas-sincronizadas', { detail: e.data }));
      }
    });
  }
  if (hayBackgroundSync()) {
    // Refuerzo: si un intento falló, Chrome reintenta con espera creciente.
    // Al volver la red re-registramos la etiqueta para que se dispare enseguida.
    window.addEventListener('online', async () => {
      if (await contarPendientes()) programarEnvio();
    });
  } else {
    // Sin Background Sync: enviar al volver la conexión y al abrir la app
    window.addEventListener('online', async () => {
      const n = await enviarPendientesDesdePagina();
      if (n) avisar(`✔ ${n} reseña(s) enviada(s) al recuperar la conexión`);
    });
    if (navigator.onLine) enviarPendientesDesdePagina();
  }
}

export const todasLasResenasLocales = () => obtenerTodos('resenas');
