# ☕ Ruta del Café · PWA

Aplicación Web Progresiva para descubrir cafeterías de especialidad, guardar favoritas y dejar reseñas **incluso sin conexión**.

Construida paso a paso (un commit por fase): app shell, manifiesto, service worker, CSR + SSR, splash, IndexedDB y localStorage, estrategias de caché y offline, Background Sync, ciclo de actualización del service worker, notificaciones locales y push (VAPID), elementos físicos del dispositivo e hidratación SSR.

- 📄 **Reporte técnico:** [`docs/Reporte-PWA-Ruta-del-Cafe.docx`](docs/Reporte-PWA-Ruta-del-Cafe.docx)
- 🌐 **Aplicación publicada:** https://pokyto69.github.io/ruta-del-cafe-pwa/

## Requisitos

- Node.js 22.12 o superior (lo exige puppeteer-core para las pruebas)
- Google Chrome o Microsoft Edge (para las pruebas automatizadas)

## Uso

```bash
npm install
npm start          # http://localhost:3000
```

| Script | Descripción |
|---|---|
| `npm start` | Servidor completo (API, SSR, reseñas y push) |
| `npm run dev` | Servidor con recarga automática |
| `npm test` | Pruebas automatizadas: API + extremo a extremo en Chrome |
| `npm run iconos` | Regenera los íconos PNG |
| `npm run vapid` | Genera las claves VAPID (`vapid.json`, no se sube a git) |
| `node scripts/capturas.js` | Regenera las capturas del reporte |
| `node scripts/generar-reporte.js` | Regenera el reporte en Word |

## Estructura

```
server.js        Servidor Express: estáticos, API, SSR y push
lib/             ssr.js (ficha en el servidor) · push.js (VAPID y envío)
public/          La PWA: index.html (shell), sw.js, manifest.json, offline.html, js/, css/, icons/, data/
scripts/         Generadores de íconos, claves VAPID, capturas y reporte
tests/           api.test.js (node:test) · pwa.test.js (puppeteer-core)
docs/            Reporte, capturas y resultados de pruebas
```

## GitHub Pages vs. servidor

GitHub Pages publica `public/` (flujo `.github/workflows/pages.yml`). Allí funcionan la instalación, el modo offline, el catálogo (desde `data/cafes.json`), los favoritos, «Cerca de mí» y las notificaciones locales. La ficha SSR, el envío de reseñas al servidor y las notificaciones push necesitan `npm start`.

## Publicar una actualización

1. Hacer el cambio.
2. Incrementar `VERSION` en `public/sw.js` (y añadir a `SHELL` los archivos nuevos).
3. `git commit` + `git push` → GitHub Actions vuelve a publicar.
4. Los usuarios ven «Hay una nueva versión» → **Actualizar**.
