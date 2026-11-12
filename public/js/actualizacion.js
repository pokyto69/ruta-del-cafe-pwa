// Fase 3 · Registro del service worker.
// Fase 9.2 · Avisar al usuario cuando hay una versión nueva esperando.
//
// Ciclo de vida: installing → installed (waiting) → activating → activated.
// Un SW nuevo queda «en espera» mientras alguna pestaña use el anterior.
// Le ofrecemos al usuario actualizar; si acepta, le pedimos al SW nuevo que
// haga skipWaiting(), y al cambiar el controlador recargamos la página.
import { avisar } from './utils.js';

let recargando = false;
let actualizacionAceptada = false; // evita recargar en la primera instalación (clients.claim)

function ofrecerActualizacion(trabajador) {
  avisar('Hay una nueva versión de Ruta del Café.', {
    duracion: 0, // permanece hasta que el usuario decida
    accion: {
      texto: 'Actualizar',
      alPulsar: () => {
        actualizacionAceptada = true;
        trabajador.postMessage({ tipo: 'SKIP_WAITING' });
      },
    },
  });
}

function vigilarInstalacion(reg) {
  const nuevo = reg.installing;
  if (!nuevo) return;
  nuevo.addEventListener('statechange', () => {
    // «installed» + ya había un controlador = es una actualización, no la primera instalación
    if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
      ofrecerActualizacion(nuevo);
    }
  });
}

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[App] Este navegador no soporta service workers');
    return null;
  }

  // Cuando el SW nuevo toma el control, recargar una sola vez
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !actualizacionAceptada) return;
    recargando = true;
    location.reload();
  });

  const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  console.log('[App] Service worker registrado con alcance:', reg.scope);

  // Caso 1: ya había una versión esperando al abrir la app
  if (reg.waiting && navigator.serviceWorker.controller) ofrecerActualizacion(reg.waiting);
  // Caso 2: se está instalando ahora mismo / Caso 3: se encuentra una nueva más tarde
  vigilarInstalacion(reg);
  reg.addEventListener('updatefound', () => vigilarInstalacion(reg));

  // Buscar actualizaciones al volver a la pestaña y cada hora
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => {});
  });
  setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

  return reg;
}

/** Pregunta al SW activo qué versión es (MessageChannel). */
export function versionServiceWorker() {
  const sw = navigator.serviceWorker?.controller;
  if (!sw) return Promise.resolve('sin service worker activo');
  return new Promise((resolve) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = (e) => resolve(e.data.version);
    sw.postMessage({ tipo: 'VERSION' }, [canal.port2]);
    setTimeout(() => resolve('desconocida'), 1500);
  });
}
