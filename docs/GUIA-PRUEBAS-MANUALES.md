# Guía de pruebas manuales (MAN-01 … MAN-07)

Estas pruebas **no se pueden automatizar**: necesitan un teléfono real, el modo avión del sistema
y la interfaz de Chrome. Haz cada una, toma las capturas indicadas y anota lo que viste.

**Necesitas:** un teléfono Android con Chrome, el cable USB y la PC con el proyecto (`npm install` hecho).

> Las capturas van en `docs/capturas/manuales/` con el nombre exacto indicado.
> En Android: botón de encendido + bajar volumen.

---

## Parte A · Sobre GitHub Pages (solo el teléfono)

URL: **https://pokyto69.github.io/ruta-del-cafe-pwa/**

### MAN-01 · Instalación
1. Abre la URL en Chrome Android. Espera a que termine el splash.
2. Pulsa **Instalar app** en el Home (o menú ⋮ → *Instalar aplicación*).
3. Ve a la pantalla de inicio y abre la app desde el ícono.

| Captura | Qué debe verse |
|---|---|
| `MAN-01-a.png` | El diálogo de instalación de Chrome |
| `MAN-01-b.png` | El ícono «Café» en la pantalla de inicio |
| `MAN-01-c.png` | La app abierta **sin barra de direcciones** (modo standalone) |

### MAN-02 · Modo avión
1. Con la app instalada, ábrela una vez con red, entra al **Catálogo** y marca una favorita ❤.
2. Cierra la app (deslízala fuera de las recientes).
3. Activa el **modo avión** y abre la app desde el ícono.

| Captura | Qué debe verse |
|---|---|
| `MAN-02-a.png` | El ícono de avión en la barra de estado y la app cargada (indicador «Sin conexión») |
| `MAN-02-b.png` | El catálogo y la favorita visibles sin red |

### MAN-05 · Cerca de mí
1. Con red, ve a **Cerca de mí** → **Usar mi ubicación** y acepta el permiso.

| Captura | Qué debe verse |
|---|---|
| `MAN-05-a.png` | El diálogo de permiso de ubicación |
| `MAN-05-b.png` | La lista ordenada por distancia (anota si el teléfono vibró) |

### MAN-06 · Compartir
1. Abre el detalle de una cafetería → **Compartir**.

| Captura | Qué debe verse |
|---|---|
| `MAN-06-a.png` | La hoja de compartir nativa de Android |

---

## Parte B · Con el servidor (reseñas y push)

GitHub Pages no ejecuta Node.js, así que **MAN-03 y MAN-04 se hacen contra `npm start`**.
El service worker exige HTTPS o `localhost`; con el reenvío de puertos de Chrome el teléfono
ve el servidor de la PC como `localhost`:

1. En la PC: `npm start` (deja la terminal abierta).
2. En el teléfono: *Ajustes → Opciones de desarrollador → Depuración USB* (activar). Conecta el cable.
3. En la PC abre Chrome en `chrome://inspect/#devices` → **Port forwarding…** →
   `3000` → `localhost:3000`, marca *Enable port forwarding* → **Done**.
4. En el teléfono abre **http://localhost:3000**.

### MAN-03 · Reseña sin red → Background Sync
1. Abre una cafetería en el teléfono. Activa el **modo avión**.
2. Escribe y publica una reseña: aparece como **«Pendiente»**.
3. Desactiva el modo avión **sin tocar la app**. En unos segundos pasa a enviada.
4. Confírmalo en la PC: abre http://localhost:3000/api/resenas

| Captura | Qué debe verse |
|---|---|
| `MAN-03-a.png` | Modo avión + reseña con la etiqueta «Pendiente» |
| `MAN-03-b.png` | La misma reseña ya enviada (sin «Pendiente») |

> Extra para DevTools: en `chrome://inspect` pulsa **inspect** sobre la pestaña del teléfono →
> *Application → Background services → Background sync* muestra el evento `enviar-resenas`.

### MAN-04 · Push con la app cerrada
1. En el teléfono: **Ajustes** de la app → **Activar notificaciones push** → *Permitir*.
2. Cierra Chrome/la app por completo (deslízala fuera de las recientes).
3. En la PC abre http://localhost:3000/#/cafe/1 y publica una reseña.
4. En el teléfono llega «Nueva reseña en …». Tócala: abre la ficha.

| Captura | Qué debe verse |
|---|---|
| `MAN-04-a.png` | La notificación en la barra del teléfono con la app cerrada |
| `MAN-04-b.png` | La ficha abierta tras tocar la notificación |

---

## Parte C · Lighthouse en DevTools (PC)

### MAN-07
1. En Chrome de la PC abre la URL de GitHub Pages → **F12** → pestaña **Lighthouse**.
2. *Mode:* Navigation · *Device:* **Mobile** · todas las categorías → **Analyze page load**.
3. Captura la pantalla completa con DevTools visible (Win + Shift + S) → `MAN-07-lighthouse.png`.

Además, `docs/lighthouse/` incluye el informe HTML generado con Lighthouse CLI sobre la misma URL.

---

## Volcar los resultados al reporte

1. Edita `docs/pruebas-manuales.json`:
   - `fecha` (ej. `13 de noviembre de 2026`) y `dispositivo` (ej. `Samsung Galaxy A15, Android 14, Chrome 142`).
   - En cada prueba: `estado` = `Aprobado`, `Falló` o `Parcial`, y en `resultado` lo que **realmente** observaste.
2. Ejecuta:
   ```bash
   pip install python-docx
   python scripts/completar-pruebas-manuales.py
   ```
   Llena la columna «Resultado obtenido» y agrega la sección **12.4 Evidencias** con tus capturas.
   Conserva la portada. Puedes volver a ejecutarlo las veces que quieras.
3. Abre el Word, revisa y haz commit:
   ```bash
   git add docs && git commit -m "Pruebas manuales MAN-01 a MAN-07 con evidencias" && git push
   ```
