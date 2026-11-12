// Punto de entrada de la aplicación.
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaCatalogo, vistaDetalle, vistaAjustes } from './vistas.js';
import { ocultarSplash } from './splash.js';
import { aplicarTema, registrarVisita } from './prefs.js';
import './instalacion.js';

// Fase 6.2: aplicar preferencias guardadas antes de pintar
aplicarTema();
const visitaAnterior = registrarVisita();

// Fase 4.2: rutas del lado del cliente
ruta('/', (el, p) => vistaInicio(el, p, { visitaAnterior }), 'inicio');
ruta('/catalogo', vistaCatalogo, 'catalogo');
ruta('/cafe/:id', vistaDetalle, 'catalogo');
ruta('/ajustes', vistaAjustes, 'ajustes');

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
