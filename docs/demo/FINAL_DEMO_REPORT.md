# Fase 10 — Validación final del vídeo de demostración

> Fecha: 2026-11-03.
> **Entregables:**
> - `docs/demo/video/CIBERAN_demo_guiada.mp4` (25,4 MB, no versionado: se regenera con [`scripts/demo-video`](../../scripts/demo-video/README.md)).
> - [`CIBERAN_demo_guiada.srt`](video/CIBERAN_demo_guiada.srt) y [`montaje.json`](video/montaje.json).
> - [Capturas de apoyo](video/capturas/), una por escena.
> - [Storyboard](STORYBOARD.md) y [plan de datos](DEMO_DATA_PLAN.md).

## 1. Ficha técnica

| | |
|---|---|
| Duración | **5:23** (322,9 s), 24 planos: 8 tarjetas y 16 escenas |
| Vídeo | H.264 High, 1920×1080 nativo (sin reescalar), 16:9, 30 fps, yuv420p, `faststart` |
| Audio | **Ninguno, a propósito** (sin voz ni música, por decisión del equipo) |
| Subtítulos | 51 entradas en `.srt`, con el mismo texto que los rótulos en pantalla |
| Origen | La app real (build de producción) sobre Supabase local con datos ficticios, manejada con Playwright y montada con FFmpeg |

## 2. Lista de comprobación del encargo

| # | Comprobación | Resultado | Cómo se comprobó |
|---|---|---|---|
| 1 | El vídeo existe | ✅ | `CIBERAN_demo_guiada.mp4`, 25,4 MB |
| 2 | Reproducción completa | ✅ | Decodificación completa con FFmpeg sin errores. Revisión de 32 fotogramas (uno cada 10 s) en dos mosaicos, más la tarjeta de cierre: todas las escenas en orden y sin pantallas en negro ni congeladas |
| 3 | Audio sincronizado | N/A | No hay pista de audio, a propósito |
| 4 | Subtítulos | ✅ | 51 entradas en orden, sin solapes (se recortan al inicio de la siguiente en los fundidos), la más corta de 1,6 s y la última acaba en 322,87 s, dentro del vídeo |
| 5 | No aparecen credenciales | ✅ | Las sesiones se abren **antes** de grabar; ninguna escena pasa por `/login` ni escribe contraseñas. No aparecen correos: el único sitio que los muestra (la ficha privada del creador) no sale. El `.env` de demo solo contiene claves del Supabase local |
| 6 | Datos ficticios | ✅ | Cuentas `@demo.ciberan.test`, imágenes ilustradas generadas para la demo (sin caras ni marcas reales) y cifras inventadas. Las pantallas de estadísticas llevan el distintivo «Cifras ficticias de demostración» y las tarjetas de inicio y cierre lo avisan |
| 7 | Flujos coherentes | ✅ | Tras grabar, la base local coincide con lo que cuenta el vídeo: oferta de 900 € **rechazada**, de 1.050 € **aceptada**; colaboración **completada** por 1.050 € y nacida de la oferta; publicación **publicada**; notas de revisión «cambios pedidos» y «aprobada»; 2 valoraciones de 5 ★ |
| 8 | No se muestran errores como éxitos | ✅ | El guion registra los errores de página, las respuestas HTTP ≥ 400 y las escenas que terminan con un diálogo abierto: **0 en la toma final**. Comprueba los estados clave (p. ej. que la publicación queda publicada). Las funciones no verificadas no aparecen (§4) |
| 9 | Calidad visual | ✅ | Fotogramas nativos de 1920×1080 a escala 1,5, con el texto nítido. Rótulos legibles (19 px a escala 1,5), resaltados y cursor visibles, fundidos suaves |
| 10 | Limitaciones documentadas | ✅ | §4 |

## 3. Tomas e incidencias

Cada toma partió de una base recién sembrada (`supabase db reset` más la siembra). Repasar cada toma encontró **dos fallos reales de la app que se veían en el vídeo**. Se corrigieron en el código antes de volver a grabar.

| Toma | Resultado | Qué se cambió |
|---|---|---|
| 1 | Cortada en el paso 20: un selector de estrellas ambiguo | Selector exacto. Se vio además que el screencast salía a 1280×720 → fotogramas nativos de 1920×1080 con `--force-device-scale-factor=1.5` |
| 2 | Completa, pero **el paso 19 era falso**: al publicar tras la aprobación salía «Vas a saltarte la revisión del partner» y la publicación se quedaba en «Programado» | **Fallo de la app F-07 corregido** (`movingSkipsPartnerReview` con la fase de origen y 4 tests). El guion comprueba ahora que la publicación queda publicada y que ninguna escena acaba con un diálogo abierto |
| 3 | Completa y sin errores; en el paso 14 la ficha decía «Todavía no has predicho» justo después de enseñar la predicción | **Fallo de la app F-03 corregido** (el compositor actualiza la publicación compartida) |
| 4 (final) | Completa y sin errores; los dos arreglos se ven funcionando | — |

**Montaje de la toma 4:** el equipo se suspendió en mitad de la escena 19 (de 21:14 a 21:51) y la captura registró 2.202 s seguidos sin fotogramas. Los fotogramas de antes y después son idénticos: publicación ya «Publicada» y el aviso «Movida a Publicado». El montaje **recorta ese tiempo muerto** a 1 s y desplaza los rótulos lo mismo; no se elimina ni se cambia ningún contenido grabado. La regla (más de 10 s sin ningún fotograma, cuando la pausa más larga del guion es de unos 3 s) queda en `assemble.mjs`.

## 4. Limitaciones (lo que el vídeo no enseña, y por qué)

| Función | Motivo |
|---|---|
| Pago de la colaboración y suscripción Pro (Stripe) | Sin verificar de extremo a extremo; necesita Stripe CLI para el webhook. El vídeo no pulsa «Pagar», aunque el botón aparece en la ficha de la colaboración |
| Conectar Instagram o YouTube (OAuth) y estadísticas detalladas de YouTube | Necesitan apps reales de Meta y Google y llaman a sus API. Las redes aparecen como ya conectadas con cifras ficticias |
| Métricas por publicación | La app avisa de que no están conectadas (permiso de Meta), así que no se sembraron |
| Búsqueda con IA y predicción con IA | Necesitan OpenRouter (servicio externo). La predicción que se ve es la heurística local, con su aviso «sin IA» |
| Alta desde `/onboarding` e inicio de sesión | Fuera del recorrido, para no mostrar credenciales. El alta está verificada con tests y con la siembra |
| Versión móvil | El vídeo es de escritorio. El móvil se auditó en la Fase 4 (`04_UX_AUDIT.md`: dos desbordamientos pendientes) |
| Aviso «Nueva solicitud de colaboración» al aceptar una oferta (F-02) | Fallo pendiente. No sale en pantalla, pero llega a la bandeja del creador |

## 5. Cómo regenerarlo

Ver [`scripts/demo-video/README.md`](../../scripts/demo-video/README.md). Pasos: imágenes, `db reset`, siembra, `rec-run.mjs` (unos 6 min) y `assemble.mjs` (unos 5 min).
