// Favoritos guardados en IndexedDB (Fase 6.1).
import { obtener, guardar, borrar, obtenerTodos } from './db.js';

export const esFavorito = async (id) => !!(await obtener('favoritos', Number(id)));

export async function alternarFavorito(cafe) {
  if (await esFavorito(cafe.id)) {
    await borrar('favoritos', cafe.id);
    return false;
  }
  await guardar('favoritos', { ...cafe, guardadoEn: Date.now() });
  return true;
}

export const listarFavoritos = () => obtenerTodos('favoritos');
