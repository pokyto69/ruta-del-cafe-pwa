// Punto de entrada de la aplicación.
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaCatalogo, vistaDetalle } from './vistas.js';

// Fase 4.2: rutas del lado del cliente
ruta('/', vistaInicio, 'inicio');
ruta('/catalogo', vistaCatalogo, 'catalogo');
ruta('/cafe/:id', vistaDetalle, 'catalogo');
iniciarRouter();

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
