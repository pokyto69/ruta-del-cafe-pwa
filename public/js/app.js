// Punto de entrada de la aplicación.

// Fase 3: registrar el service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[App] Service worker registrado con alcance:', reg.scope);
    } catch (err) {
      console.error('[App] Error al registrar el service worker:', err);
    }
  });
}
