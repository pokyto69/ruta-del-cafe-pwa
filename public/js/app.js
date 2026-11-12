// Punto de entrada de la aplicación.
import { ruta, iniciarRouter } from './router.js';
import { vistaInicio, vistaCatalogo, vistaDetalle, vistaAjustes } from './vistas.js';
import { ocultarSplash } from './splash.js';
import { aplicarTema, registrarVisita } from './prefs.js';
import { iniciarIndicadorConexion } from './conexion.js';
import { iniciarSincronizacionResenas } from './resenas.js';
import { registrarServiceWorker } from './actualizacion.js';
import './instalacion.js';

// Fase 7.3: indicador de conexión en la barra superior
iniciarIndicadorConexion();

// Fase 8: escuchar el resultado del Background Sync de reseñas
iniciarSincronizacionResenas();

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

// Fase 3 + Fase 9: registrar el service worker y vigilar actualizaciones
window.addEventListener('load', () => {
  registrarServiceWorker().catch((err) => console.error('[App] Error al registrar el service worker:', err));
});
