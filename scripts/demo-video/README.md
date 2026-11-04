# Vídeo de demostración guiada (Playwright + FFmpeg)

Graba la demo de CIBERAN sobre la **app real** en un **entorno aislado** (Supabase local) y la monta sin voz ni música. Lleva tarjetas de título entre módulos, rótulos de paso y subtítulos `.srt`. El resultado y su documentación están en [`docs/demo/`](../../docs/demo/).

## Requisitos

- Docker y Supabase CLI (`npx supabase@2`) con un Supabase local levantado (`supabase start`).
- Google Chrome instalado (Playwright lo usa con `channel: 'chrome'`).
- Las herramientas de grabación, en una carpeta aparte para no tocar el `package.json` del proyecto:
  ```bash
  npm i --prefix <deps> playwright-core ffmpeg-static
  ```
- Una copia de la app (`git archive HEAD`) con un `.env` que apunte **solo** al Supabase local, compilada con `nuxt build` y servida en `http://localhost:3300` (`PORT=3300 node .output/server/index.mjs`). Ver [`docs/demo/DEMO_DATA_PLAN.md`](../../docs/demo/DEMO_DATA_PLAN.md).

## Pasos

```bash
# 1. Imágenes ficticias (ilustraciones generadas, sin caras ni marcas reales)
node scripts/demo-video/gen-demo-images.mjs <deps> <imgs>

# 2. Base limpia y sembrada (el script aborta si la URL no es local o si ya hay usuarios)
npx supabase@2 db reset --local
node --env-file=<copia>/.env scripts/seed-demo-video.mjs <imgs>

# 3. Grabar (unos 6 minutos; deja timeline.json y los fotogramas en <out>)
node scripts/demo-video/rec-run.mjs <deps> <copia> <out> <imgs>

# 4. Montar: MP4 1920×1080 a 30 fps, SRT, montaje.json y capturas de apoyo
node scripts/demo-video/assemble.mjs <deps> <out> docs/demo/video

# 5. Tabla del storyboard con los tiempos reales
node scripts/demo-video/gen-storyboard.mjs docs/demo/video/montaje.json
```

Opcional: `ux-capture.mjs <deps> <copia> <dir>` saca capturas a 390, 768 y 1440 px y pasa axe-core (Fase 4 de la auditoría).

## Cómo funciona

- **`rec-lib.mjs`:**
  - Capa visual inyectada en la página: cursor, onda al hacer clic, rótulo de paso con quién actúa, resaltado de bloques y distintivo «Cifras ficticias».
  - Acciones con movimiento suave.
  - Captura de fotogramas por CDP (`Page.startScreencast`). Chrome se lanza con `--force-device-scale-factor=1.5` sobre una ventana de 1280×720, así que los fotogramas salen a 1920×1080 reales.
- **`rec-run.mjs`:** el guion completo, de 21 pasos en 6 módulos, con dos sesiones a la vez (NOVA STUDIO y AREZZ). Comprueba los estados clave: por ejemplo, que la publicación queda «Publicada». Registra cualquier error de página, cualquier respuesta HTTP ≥ 400 y las escenas que terminan con un diálogo abierto.
- **`rec-cards.mjs`:** tarjetas de título con el logo, Snasm, Sora y Hanken Grotesk.
- **`assemble.mjs`:**
  - Codifica cada escena con sus tiempos reales y une los clips con fundidos cruzados de 0,6 s.
  - Genera el SRT a partir de los mismos rótulos.
  - Recorta los **tiempos muertos anómalos** (más de 10 s sin fotogramas, p. ej. si el equipo se suspende) sin tocar el contenido.

El MP4 no se versiona (`.gitignore`); el SRT, el montaje y las capturas sí.
