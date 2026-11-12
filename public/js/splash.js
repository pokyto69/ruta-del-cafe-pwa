// Fase 5.2 · Splash dentro de la app.
// Se muestra mientras arranca la app y se oculta cuando la primera vista está lista
// (con un mínimo de tiempo para que no parpadee).
const MINIMO_MS = 700;
const inicio = performance.now();

export function ocultarSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const espera = Math.max(0, MINIMO_MS - (performance.now() - inicio));
  setTimeout(() => {
    splash.classList.add('oculto');
    splash.setAttribute('aria-hidden', 'true');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 600); // por si no hay transición (movimiento reducido)
  }, espera);
}
