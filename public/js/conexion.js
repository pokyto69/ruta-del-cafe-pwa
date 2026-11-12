// Fase 7.3 · Indicador de conexión en el shell.
// navigator.onLine + eventos online/offline del navegador.
import { avisar } from './utils.js';

const oyentes = new Set();

/** Suscribe una función que recibe `true` (en línea) o `false` (sin conexión). */
export function alCambiarConexion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function pintar(enLinea, anunciar) {
  const el = document.getElementById('estado-red');
  if (el) {
    el.textContent = enLinea ? 'En línea' : 'Sin conexión';
    el.classList.toggle('sin-conexion', !enLinea);
  }
  document.documentElement.classList.toggle('offline', !enLinea);
  if (anunciar) {
    avisar(enLinea ? 'Conexión recuperada ✔' : 'Sin conexión: trabajarás con los datos guardados');
  }
  oyentes.forEach((fn) => fn(enLinea));
}

export function iniciarIndicadorConexion() {
  pintar(navigator.onLine, false);
  window.addEventListener('online', () => pintar(true, true));
  window.addEventListener('offline', () => pintar(false, true));
}
