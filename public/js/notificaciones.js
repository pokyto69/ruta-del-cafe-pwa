// Fase 10.4 · Cliente de notificaciones.
//   Locales: las muestra la propia app con registration.showNotification().
//   Push:    el servidor las envía a través del servicio push del navegador, aunque la app esté cerrada.
// Flujo push: permiso → clave pública VAPID → pushManager.subscribe() → enviar la suscripción al servidor.
import { avisar, escapar } from './utils.js';

export const soportaNotificaciones = () => 'Notification' in window && 'serviceWorker' in navigator;
export const soportaPush = () => soportaNotificaciones() && 'PushManager' in window;
export const permisoActual = () => (soportaNotificaciones() ? Notification.permission : 'no-soportado');

/** Convierte la clave VAPID (base64url) al Uint8Array que pide pushManager.subscribe(). */
function base64UrlAUint8(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function pedirPermiso() {
  if (!soportaNotificaciones()) throw new Error('Este navegador no soporta notificaciones');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error(permiso === 'denied'
    ? 'Bloqueaste las notificaciones. Actívalas desde la configuración del sitio.'
    : 'No se concedió el permiso de notificaciones');
  return permiso;
}

/** Notificación local (sin servidor). */
export async function notificacionLocal(titulo = 'Ruta del Café', opciones = {}) {
  await pedirPermiso();
  const reg = await navigator.serviceWorker.ready;
  return reg.showNotification(titulo, {
    body: 'Esta es una notificación local generada en tu dispositivo.',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-72.png',
    tag: 'local',
    data: { url: './#/' },
    ...opciones,
  });
}

export async function suscripcionActual() {
  if (!soportaPush()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function suscribirPush() {
  if (!soportaPush()) throw new Error('Este navegador no soporta notificaciones push');
  await pedirPermiso();
  const resp = await fetch('api/push/clave-publica');
  if (!resp.ok || !(resp.headers.get('content-type') || '').includes('json')) {
    throw new Error('El servidor de push no está disponible (¿estás en GitHub Pages? Usa npm start).');
  }
  const { clavePublica } = await resp.json();
  const reg = await navigator.serviceWorker.ready;
  let sus = await reg.pushManager.getSubscription();
  if (!sus) {
    sus = await reg.pushManager.subscribe({
      userVisibleOnly: true,                              // obligatorio: cada push muestra una notificación
      applicationServerKey: base64UrlAUint8(clavePublica),
    });
  }
  const guardada = await fetch('api/push/suscribir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sus),
  });
  if (!guardada.ok) throw new Error('El servidor no aceptó la suscripción');
  return sus;
}

export async function desuscribirPush() {
  const sus = await suscripcionActual();
  if (!sus) return false;
  await fetch('api/push/desuscribir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sus.endpoint }),
  }).catch(() => {});
  return sus.unsubscribe();
}

/** Pide al servidor que envíe un push de prueba a todas las suscripciones. */
export async function enviarPushPrueba() {
  const resp = await fetch('api/push/enviar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo: '☕ Push de prueba', cuerpo: 'Este mensaje viajó desde el servidor hasta tu dispositivo.', url: './#/catalogo' }),
  });
  if (!resp.ok) throw new Error(`El servidor respondió ${resp.status}`);
  return resp.json();
}

// ---------- Interfaz en Ajustes ----------

export async function montarAjustesNotificaciones(contenedor) {
  const sus = await suscripcionActual().catch(() => null);
  const permiso = permisoActual();
  contenedor.innerHTML = `
    <section class="tarjeta">
      <h2>Notificaciones</h2>
      <p class="meta">Permiso: <strong>${escapar(permiso)}</strong> · Push: <strong>${sus ? 'suscrito' : 'no suscrito'}</strong></p>
      ${soportaNotificaciones() ? '' : '<p>Tu navegador no soporta notificaciones.</p>'}
      <div class="acciones">
        <button class="btn btn--sec" type="button" id="n-local">🔔 Notificación local</button>
        ${sus
          ? '<button class="btn" type="button" id="n-probar">📨 Enviar push de prueba</button><button class="btn btn--sec" type="button" id="n-baja">Desactivar push</button>'
          : '<button class="btn" type="button" id="n-alta">Activar notificaciones push</button>'}
      </div>
      <p class="meta">Al activar push recibirás un aviso cada vez que alguien publique una reseña.</p>
    </section>`;

  const conError = (fn) => async () => {
    try { await fn(); } catch (e) { avisar(e.message, { duracion: 6000 }); }
  };
  contenedor.querySelector('#n-local')?.addEventListener('click', conError(() => notificacionLocal()));
  contenedor.querySelector('#n-alta')?.addEventListener('click', conError(async () => {
    await suscribirPush();
    avisar('✔ Notificaciones push activadas');
    montarAjustesNotificaciones(contenedor);
  }));
  contenedor.querySelector('#n-baja')?.addEventListener('click', conError(async () => {
    await desuscribirPush();
    avisar('Notificaciones push desactivadas');
    montarAjustesNotificaciones(contenedor);
  }));
  contenedor.querySelector('#n-probar')?.addEventListener('click', conError(async () => {
    const r = await enviarPushPrueba();
    avisar(`Push enviado a ${r.enviados} de ${r.total} dispositivo(s)`);
  }));
}
