// Fase 6.1 · Capa de acceso a IndexedDB (promesas sobre la API nativa).
// Almacenes:
//   cafes     → copia local del catálogo remoto (respaldo offline)
//   favoritos → cafeterías marcadas por el usuario
//   resenas   → reseñas escritas por el usuario (pendientes o enviadas) · Fase 8
const NOMBRE_DB = 'ruta-cafe';
const VERSION_DB = 1;

let conexion = null;

export function abrirDB() {
  if (conexion) return conexion;
  conexion = new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_DB, VERSION_DB);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cafes')) db.createObjectStore('cafes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('favoritos')) db.createObjectStore('favoritos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('resenas')) {
        const s = db.createObjectStore('resenas', { keyPath: 'idLocal' });
        s.createIndex('cafeId', 'cafeId');
        s.createIndex('estado', 'estado');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return conexion;
}

const comoPromesa = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function almacen(nombre, modo = 'readonly') {
  const db = await abrirDB();
  return db.transaction(nombre, modo).objectStore(nombre);
}

export async function obtenerTodos(nombre) {
  return comoPromesa((await almacen(nombre)).getAll());
}

export async function obtener(nombre, clave) {
  return comoPromesa((await almacen(nombre)).get(clave));
}

export async function guardar(nombre, valor) {
  return comoPromesa((await almacen(nombre, 'readwrite')).put(valor));
}

export async function borrar(nombre, clave) {
  return comoPromesa((await almacen(nombre, 'readwrite')).delete(clave));
}

export async function vaciar(nombre) {
  return comoPromesa((await almacen(nombre, 'readwrite')).clear());
}

/** Reemplaza todo el contenido de un almacén en una sola transacción. */
export async function reemplazarTodos(nombre, valores) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(nombre, 'readwrite');
    const s = tx.objectStore(nombre);
    s.clear();
    valores.forEach((v) => s.put(v));
    tx.oncomplete = () => resolve(valores.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function porIndice(nombre, indice, valor) {
  return comoPromesa((await almacen(nombre)).index(indice).getAll(valor));
}
