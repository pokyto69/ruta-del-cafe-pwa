// Fase 5.3 · Botón de instalación.
// Chrome/Edge disparan `beforeinstallprompt` cuando la app cumple los criterios de instalación.
// Guardamos el evento y lo lanzamos cuando el usuario pulse nuestro botón.
import { avisar } from './utils.js';

let eventoInstalacion = null;

export const estaInstalada = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();             // evita el mini-banner automático
  eventoInstalacion = e;
  actualizarBotones();
});

window.addEventListener('appinstalled', () => {
  eventoInstalacion = null;
  actualizarBotones();
  avisar('¡Ruta del Café se instaló correctamente!');
});

export async function instalar() {
  if (!eventoInstalacion) return;
  eventoInstalacion.prompt();
  const { outcome } = await eventoInstalacion.userChoice;
  console.log('[Instalación] decisión del usuario:', outcome);
  eventoInstalacion = null;
  actualizarBotones();
}

/** Muestra u oculta los botones [data-instalar] y el texto de ayuda según el estado. */
export function actualizarBotones() {
  document.querySelectorAll('[data-instalar]').forEach((btn) => {
    btn.classList.toggle('oculto-inst', !eventoInstalacion);
    btn.onclick = instalar;
  });
  document.querySelectorAll('[data-estado-instalacion]').forEach((el) => {
    if (estaInstalada()) el.textContent = 'Estás usando la app instalada. ✔';
    else if (eventoInstalacion) el.textContent = 'Instálala para abrirla como una app nativa, incluso sin conexión.';
    else if (esIOS()) el.textContent = 'En iPhone/iPad: pulsa Compartir y luego «Añadir a pantalla de inicio».';
    else el.textContent = 'Si tu navegador lo permite, verás aquí el botón para instalarla (o usa el menú del navegador).';
  });
}
