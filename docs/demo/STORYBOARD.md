# Fase 8 — Guion audiovisual (storyboard)

> Vídeo: `docs/demo/video/CIBERAN_demo_guiada.mp4` (no versionado) · Subtítulos: [`CIBERAN_demo_guiada.srt`](video/CIBERAN_demo_guiada.srt) · Tiempos reales: [`montaje.json`](video/montaje.json).
> **Los tiempos de la tabla salen del montaje final**, no de una estimación (`scripts/demo-video/gen-storyboard.mjs`).

## Planteamiento

- **Formato:** recorrido guiado de la app real, «como si se lo enseñaras a alguien». **Sin narración ni música**, por decisión del equipo (sustituye a «música ambiental» y «narración en español» del encargo). Las explicaciones van en **rótulos de paso** dentro de la imagen, con una etiqueta de color de quién actúa: lima para NOVA STUDIO (marca) y degradado naranja para AREZZ (creador). El mismo texto va en el `.srt`.
- **Módulos con tarjeta de título**, como se pidió: «Conoce a AREZZ», «Descubre creadores», «Negocia colaboraciones», «Gestiona tus proyectos», «Revisa y aprueba» y «Cierra y valora». Más una tarjeta de inicio y otra de cierre.
- **Identidad visual de CIBERAN:**
  - Logo y Snasm para la marca, Sora para los títulos y Hanken Grotesk para los rótulos.
  - Fondo violeta con los colores del logo.
  - 1920×1080 a 16:9 y 30 fps.
- **Recursos visuales:** cursor visible con onda al hacer clic, resaltado de bloques en violeta (el color primario de la app), fundidos cruzados de 0,6 s y distintivo «Cifras ficticias de demostración» en las pantallas con estadísticas.
- **Duración:** unos 5 minutos y medio. Es lo que da el flujo completo sin acelerar: 17 pasos de negocio, que se cuentan en 21 rótulos.

## Correspondencia con el recorrido del encargo

| Punto del encargo | Dónde |
|---|---|
| 1-2 Introducción y presentación | Plano 1 |
| 3-4 Experiencia del creador y métricas | Planos 2-4 |
| 5-6 Descubrimiento y experiencia de la marca | Planos 5-7 |
| 7-8 Chat y ofertas | Planos 8-11 |
| 9 Colaboraciones | Plano 12 y planos 21-23 |
| 10-11 CIBERAN Studio y publicaciones | Planos 13-15 y 20 |
| 12 Revisiones | Planos 16-19 |
| 13 Calendario | Plano 19 (calendario de la marca) |
| 14 Cierre | Plano 24 |

**Adaptado a lo verificado:** no aparecen el pago con Stripe, la conexión OAuth de redes, las estadísticas detalladas de YouTube ni la búsqueda con IA. Están sin probar o necesitan servicios externos (ver [DEMO_DATA_PLAN.md §5](DEMO_DATA_PLAN.md)).

## Storyboard

| # | Inicio | Duración | Página | Quién | Mensaje | Rótulos en pantalla (subtítulos) | Elementos destacados | Transición |
|---|---|---|---|---|---|---|---|---|
| 1 | 0:00 | 5.5 s | Tarjeta de inicio | — | Presentar qué es CIBERAN y avisar de que todo es ficticio | CIBERAN — Cómo funciona, paso a paso | Logo y título sobre fondo animado | Entrada |
| 2 | 0:05 | 3.9 s | Tarjeta de módulo | — | Abrir el bloque del creador | Módulo 1 de 6 — Conoce a AREZZ | «Conoce a AREZZ» | Fundido cruzado 0,6 s |
| 3 | 0:08 | 7.6 s | /creator (Hoy) | AREZZ | El creador ve su día de un vistazo | Paso 1 · Este es «Hoy», el panel de AREZZ<br>Paso 1 · De un vistazo: colaboraciones, solicitudes, entregas y objetivo semanal<br>Paso 1 · Y lo próximo que necesita su atención | Resaltado de indicadores y «Necesita tu atención» | Fundido cruzado 0,6 s |
| 4 | 0:15 | 13.3 s | /creator/metrics | AREZZ | Métricas por red, sin inflar lo que no existe | Paso 2 · Métricas: los seguidores de cada red conectada<br>Paso 2 · Cada red, con su peso en el total y su última actualización<br>Paso 2 · Hoy se conectan Instagram y YouTube; el resto aparece como «Próximamente» | Distintivo «Cifras ficticias»; «Próximamente» en las redes no conectables | Fundido cruzado 0,6 s |
| 5 | 0:28 | 3.9 s | Tarjeta de módulo | — | Cambiar al punto de vista de la marca | Módulo 2 de 6 — Descubre creadores | «Descubre creadores» | Fundido cruzado 0,6 s |
| 6 | 0:31 | 19.9 s | /partner → /partner/discover | NOVA | Encontrar al creador adecuado con filtros | Paso 3 · NOVA STUDIO, una marca de moda sostenible, entra en CIBERAN<br>Paso 3 · Va a Descubrir…<br>Paso 3 · …y filtra por la categoría que le interesa: Moda<br>Paso 4 · AREZZ encaja: moda, lifestyle y viajes | Filtro «Moda»; resaltado de la tarjeta de AREZZ | Fundido cruzado 0,6 s |
| 7 | 0:50 | 12.6 s | /profile/creator/:id | NOVA | Decidir con datos: redes, tarifa, reputación y paquetes | Paso 5 · Su perfil público: categorías, redes conectadas y tarifa<br>Paso 5 · Su reputación: valoraciones de colaboraciones ya completadas<br>Paso 6 · Y su catálogo de paquetes, cada uno con su precio | Distintivo «Cifras ficticias»; resaltados por bloque | Fundido cruzado 0,6 s |
| 8 | 1:02 | 3.9 s | Tarjeta de módulo | — | Abrir la negociación | Módulo 3 de 6 — Negocia colaboraciones | «Negocia colaboraciones» | Fundido cruzado 0,6 s |
| 9 | 1:06 | 29.6 s | /chat/:id | NOVA | Contactar y ofertar sobre un paquete | Paso 7 · NOVA abre una conversación con AREZZ<br>Paso 8 · Y le envía una oferta sobre uno de sus paquetes<br>Paso 8 · Propone 900 € por la campaña completa (en catálogo: 1.200 €) | Hoja de oferta con precio y mensaje | Fundido cruzado 0,6 s |
| 10 | 1:35 | 22.7 s | /chat/:id | AREZZ | Negociar sin salir del chat | Paso 9 · AREZZ recibe la oferta en su chat<br>Paso 10 · Negocia: responde con su precio…<br>Paso 10 · …y rechaza esta primera oferta | Tarjeta de oferta; confirmación de rechazo | Fundido cruzado 0,6 s |
| 11 | 1:57 | 19.8 s | /chat/:id | NOVA | Responder a la contraoferta | Paso 11 · NOVA lee la respuesta de AREZZ…<br>Paso 11 · …y manda una nueva oferta: 1.050 € | Resaltado del mensaje; nueva oferta | Fundido cruzado 0,6 s |
| 12 | 2:16 | 12.3 s | /chat/:id → /creator/requests | AREZZ | Aceptar crea la colaboración sola | Paso 12 · AREZZ acepta la nueva oferta<br>Paso 12 · La colaboración se crea sola, con el precio acordado | Oferta «Aceptada»; colaboración en curso con 1.050 € | Fundido cruzado 0,6 s |
| 13 | 2:28 | 3.9 s | Tarjeta de módulo | — | Pasar a la producción | Módulo 4 de 6 — Gestiona tus proyectos | «Gestiona tus proyectos» | Fundido cruzado 0,6 s |
| 14 | 2:31 | 33.7 s | /creator/timeline | AREZZ | CIBERAN Studio: crear la entrega vinculada | Paso 13 · CIBERAN Studio: el tablero de publicaciones de AREZZ, por fases<br>Paso 13 · Crea la publicación de la colaboración<br>Paso 13 · Vinculada a la colaboración con NOVA STUDIO<br>Paso 13 · Una estimación orientativa del borrador (sin IA: solo longitud y hashtags) | Compositor; predicción con su aviso «sin IA» | Fundido cruzado 0,6 s |
| 15 | 3:04 | 14.1 s | /creator/post/:id | AREZZ | Subir la pieza y mandarla a revisión | Paso 14 · Sube la pieza…<br>Paso 14 · …y la avanza de fase: en producción<br>Paso 15 · Lista: la envía a revisión de NOVA STUDIO | Subida de imagen; cambio de fase | Fundido cruzado 0,6 s |
| 16 | 3:18 | 3.9 s | Tarjeta de módulo | — | Abrir el ciclo de revisión | Módulo 5 de 6 — Revisa y aprueba | «Revisa y aprueba» | Fundido cruzado 0,6 s |
| 17 | 3:21 | 18.4 s | /partner | NOVA | La marca revisa antes de publicar | Paso 16 · NOVA ve la entrega pendiente de revisar<br>Paso 16 · Pide un cambio concreto | Hoja de revisión; comentario obligatorio | Fundido cruzado 0,6 s |
| 18 | 3:39 | 26.9 s | /inbox → /creator/post/:id | AREZZ | El aviso lleva directo al cambio pedido | Paso 17 · AREZZ recibe el aviso con el comentario<br>Paso 17 · Cambia la imagen y el texto…<br>Paso 17 · …y la vuelve a enviar a revisión | Banner de cambios; nueva imagen y texto | Fundido cruzado 0,6 s |
| 19 | 4:05 | 17.4 s | /partner | NOVA | Aprobar y planificar | Paso 18 · NOVA revisa la nueva versión…<br>Paso 18 · …y la aprueba<br>Paso 18 · Queda programada en su calendario | Comentario al aprobar; calendario | Fundido cruzado 0,6 s |
| 20 | 4:22 | 12.6 s | /creator/post/:id → /creator/timeline | AREZZ | Cerrar la entrega | Paso 19 · Aprobada: AREZZ la publica y lo marca en CIBERAN | Fase «Publicado» en el tablero | Fundido cruzado 0,6 s |
| 21 | 4:34 | 3.9 s | Tarjeta de módulo | — | Cerrar la colaboración | Módulo 6 de 6 — Cierra y valora | «Cierra y valora» | Fundido cruzado 0,6 s |
| 22 | 4:37 | 23.4 s | /partner/requests | NOVA | Completar y valorar | Paso 20 · NOVA marca la colaboración como completada<br>Paso 20 · Y valora el trabajo de AREZZ | Confirmación; estrellas y comentario | Fundido cruzado 0,6 s |
| 23 | 5:00 | 17.7 s | /creator/requests | AREZZ | Reputación recíproca | Paso 21 · AREZZ también valora a NOVA STUDIO<br>Paso 21 · Las valoraciones construyen la reputación de cada perfil | Valoración de la marca | Fundido cruzado 0,6 s |
| 24 | 5:17 | 5.9 s | Tarjeta de cierre | — | Resumen del producto y aviso de datos ficticios | CIBERAN — Del primer mensaje a la publicación aprobada | Logo y lema | Fundido cruzado 0,6 s |

**Duración total:** 5:23 (24 planos).
