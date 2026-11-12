// Punto de entrada de la aplicación.
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaCatalogo, vistaDetalle } from './vistas.js';
import { ocultarSplash } from './splash.js';
import './instalacion.js';

// Fase 4.2: rutas del lado del cliente
ruta('/', vistaInicio, 'inicio');
ruta('/catalogo', vistaCatalogo, 'catalogo');
ruta('/cafe/:id', vistaDetalle, 'catalogo');

// Fase 5.2: el splash se oculta cuando la primera vista terminó de pintarse
iniciarRouter().finally(ocultarSplash);

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
