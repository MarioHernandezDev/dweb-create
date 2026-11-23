# CIBERAN — Auditoría final, segunda capa (23-nov-2026)

Segunda capa sobre `docs/audit/00–10`, `CIBERAN_FINAL_AUDIT.md`, `QA_AUDIT.md`, `UX_UI_AUDIT.md` y `UX_UI_AUDIT_2.md`: busca lo que esas rondas no miraron y lo que han introducido los cambios recientes. **Comprobado** = reproducido con una herramienta o dato real. **Sospecha** = visto en código o en una captura, sin reproducir.

> **Alcance.** Páginas públicas, rol partner y, tras una segunda pasada, también el rol **creador**. La contraseña de la cuenta de prueba del creador cambió y `.env.e2e` no la tiene (da «Email o contraseña incorrectos»); no se tocan credenciales: la sesión del creador la inició la propia persona en una ventana de Chrome (`node tests/e2e/tools/login-manual.mjs creator`). Por eso **una prueba E2E sigue sin poder pasar** (el paso 2 del cambio de contraseña, que usa esa contraseña) hasta que `.env.e2e` tenga la actual.

## 1. Áreas nuevas investigadas
| Área | Cómo |
|---|---|
| Consola, hidratación y peticiones fallidas (pendiente T-14 de `QA_AUDIT.md`) | Barrido de 65 combinaciones página × tamaño (públicas y partner, escritorio, tablet y móvil) |
| Rendimiento real | Build de producción en otro puerto; TTFB, FCP, LCP, CLS, peso y peticiones, también con CPU ×4 |
| Consultas repetidas a Supabase | Registro de cada llamada por pantalla |
| Estados límite de colaboración | 8 estados sembrados (`[AUDIT]`) y vistos como partner; borrados después |
| Permisos por fila y por columna frente a la interfaz | `pg_policies`, `column_privileges`, triggers, RPC ejecutables |
| Estructura semántica, objetivos táctiles, desbordes | axe con reglas de buenas prácticas, medida de objetivos en móvil, elementos fuera del ancho |
| Tratamiento de errores, utilidades duplicadas, formatos | Lectura transversal del código |

## 2. Lo que ya estaba auditado y no se repitió
Seguridad general y RLS (`02`, `07`, final audit), flujo de colaboración (`08`), accesibilidad WCAG A/AA con axe (ya cubierta, solo se confirmó que sigue limpia), primera y segunda ronda de UX/UI, nombre de campaña, paquetes, biblioteca, plantillas, paleta, deshacer.

## 3. Nuevos problemas
| # | Prioridad | Hallazgo | Estado |
|---|---|---|---|
| 1 | **Alto** | `Chip` pintaba **todas** las etiquetas como `<button>` (Vue convierte la prop booleana ausente en `false`, y `selected !== undefined` era siempre cierto): tabulador, clic y `aria-pressed="false"` en simples textos, en unos 13 usos de solo lectura. **Comprobado.** | Corregido |
| 2 | Medio | Con una **cancelación pendiente**, el «Siguiente paso» seguía siendo «Completa el brief»; responder a la cancelación no aparecía como tarea (ni en la bandeja). **Comprobado** con datos sembrados. | Corregido |
| 3 | Medio | **Solicitud caducada**: el aviso decía «Puedes rechazarla o pedir que te la envíen de nuevo» también a quien la envió, el siguiente paso decía «te avisaremos cuando cambie» (no cambia nunca), el panel ofrecía «Aceptar» (la base lo impide) y la tarjeta mostraba «En espera». **Comprobado.** | Corregido |
| 4 | Medio | 15 sitios hacían `e instanceof Error ? e.message : …`: los errores de Supabase no son `Error`, así que unas veces salía el motivo y otras un texto genérico, y un mensaje técnico (RLS, clave duplicada, red caída) habría salido tal cual en inglés. **Comprobado en código.** | Corregido: `errorMessage()` traduce lo técnico y deja pasar el castellano de negocio |
| 5 | Medio | En tablet (768 px) la barra de la landing se rompía («Para quién es» en tres líneas, «Crear cuenta» cortado): regresión mía al añadir «Ayuda». **Comprobado.** | Corregido (menú hamburguesa hasta 1024 px) |
| 6 | Medio | Una consulta idéntica a `profiles` (términos y primer acceso) se lanzaba **dos veces** en cada pantalla con sesión. **Comprobado** (9–15 llamadas por pantalla, 1 repetida en todas). | Corregido (petición compartida) |
| 7 | Medio | Faltaba `<main>` en `/ayuda` (mío), `/instalaciones` y la página 404. **Comprobado con axe.** | Corregido |
| 8 | Bajo | Tres formatos de «tamaño de archivo» (`1.5 MB` con punto en los errores de subida, `1,5 MB` en otras). | Corregido: uno solo |
| 9 | Bajo | Funciones con el mismo nombre en dos utilidades (`weekDays`, `toCsv`, `csvCell`, `formatFileSize`, `OfferStatus`): con auto-importación gana una sin decidirlo (avisos del build). Hoy no falla nada porque todo se importa explícitamente. | Corregido: nombres únicos |
| 10 | Bajo | «Ver los 1 mensajes anteriores» y «1 de 1 entregables». | Corregido |
| 11 | Bajo | Enlaces del pie de 18 px de alto (objetivo táctil). Roles `list`/`listitem` no permitidos en el tablero, saltos de nivel de título en la ficha pública, contenido fuera de regiones en las pantallas de acceso. | Corregido |
| 13 | **Medio** | **Textos largos sin espacios ensanchaban la página entera** (nombre de campaña de 80 letras seguidas: 1.700 px de scroll horizontal en el detalle de colaboración, 1.360 px en la bandeja; también portada del creador en móvil, listas, paquetes y ficha). **Comprobado** con datos extremos sembrados. | Corregido (`overflow-wrap: anywhere` global y rejilla `minmax(0, 1fr)` en la actividad de la portada) + test E2E |
| 14 | **Medio** | **«Qué me toca» repetía tareas idénticas** («Crea la primera publicación para X» ×3) cuando hay varias colaboraciones con la misma marca: no había forma de saber cuál era cuál. **Comprobado.** | Corregido: la tarea lleva el nombre de campaña (o la primera frase del brief) |
| 15 | Medio | **Contraste insuficiente (2,5:1 y 4,1:1; exige 4,5:1)** en las etiquetas de los días del gráfico de la portada del creador cuando la semana no tiene datos (la columna entera se atenuaba al 55 %). Dependía del día y del tamaño, por eso la auditoría WCAG anterior no lo cazó. **Comprobado con axe.** | Corregido (se atenúan solo las barras) |
| 16 | Medio | La **tira «Esta semana» de Publicaciones** se desplaza en horizontal en móvil pero no era accesible por teclado (`scrollable-region-focusable`). **Comprobado con axe.** | Corregido (región enfocable con nombre) |
| 12 | Bajo | Cinco copias idénticas del formateador de euros (`formatMoney`, `formatEuros`, `euros`, `formatEurosAvg`, admin). Producen el mismo texto. | **No tocado** (mantenibilidad; no justifica refactor) |

**Sospechas sin corregir**
- Las pestañas de vista de Colaboraciones, la bandeja y la ficha pública se desbordan en móvil y se recortan sin pista visual de que se desplazan (visto en captura; Medio).
- En el móvil, el calendario de Colaboraciones apila tres botones a ancho completo (mi «Suscribirme» + los dos anteriores); ocupa mucho antes del calendario (Bajo).
- Con una cancelación **propuesta por mí** pendiente, el «Siguiente paso» sigue mostrando mi siguiente tarea normal (p. ej. «Crea la primera publicación») sin mencionar la cancelación; solo se explica en el panel de abajo (Bajo; defendible porque la colaboración sigue activa hasta que la otra parte acepte).
- El contador de la bandeja (9) y «Qué me toca (2)» miden cosas distintas (avisos sin leer frente a tareas) y pueden confundir (sospecha de UX, sin prueba con usuarios).

## 4. Mejoras de UX/UI implementadas
Los puntos 1–7, 10 y 11 de arriba, más: el avance de entregables cuenta piezas «listas» (aprobadas o publicadas), el texto de borrado ya no dice «definitivo», y la ficha pública enseña un título «Paquetes/Necesidades» accesible.

## 5. Coherencia entre frontend y Supabase
Comprobado y correcto:
- `collaborations` no tiene políticas de UPDATE ni DELETE: todo cambio de estado pasa por RPC (`accept_`, `decline_`, `request_…_cancel`, `terminate_…`, etc.).
- `status` **no es insertable** por usuarios (solo SELECT en esa columna): nadie puede crear una colaboración ya «aceptada».
- `expires_at` lo fija un trigger al insertar e ignora el valor del cliente; la interfaz lee la fecha real y trata bien la caducidad.
- Los 8 estados límite se representan sin acciones indebidas (rechazada, cancelada, terminada por incumplimiento: sin botones de avance; completada: pide valorar).

## 6. Seguridad y permisos
- **Medio — Privacidad frente al texto de la interfaz.** `posts_select_scoped` deja al partner leer la **fila completa** de cualquier publicación vinculada a una de sus colaboraciones desde que existe, también en «Idea» o «En producción» (título, texto, hashtags…). El compositor le dice al creador que la marca «verá su progreso (checklist y fase)». Comprobado en la política (no se probó con una llamada real). **Necesita decisión y cambio de RLS** (p. ej. ocultar columnas o filas hasta «Para revisar», o decir con claridad en la interfaz que la marca lo ve todo desde el primer momento). **No se ha tocado.**
- Cambio de contraseña: el código del correo solo lo exige el servidor con «Secure password change» activado y sesión no reciente (ver `docs/19-SEGURIDAD-CUENTA.md`).
- Sigue pendiente lo ya documentado: contraseñas filtradas (Pro), límites de uso compartidos (R-03), una sola base para todo.

## 7. Necesita autorización o intervención externa
1. Credenciales vigentes del **creador de prueba** (`.env.e2e`) para auditar y probar el lado creador.
2. Decisión de RLS sobre la visibilidad de las publicaciones en colaboración (punto de arriba).
3. «Secure password change», plantilla de reautenticación y SMTP en Supabase.
4. Proyecto de producción separado, dominio y despliegue.

## 8. Tests y validaciones
- `npm run typecheck`: sin errores. `npm test`: **497** tests unitarios en verde (nuevos: errores y plural, siguiente paso con cancelación y caducidad, y los de la tanda anterior).
- Build de producción: correcto. Servidor de producción medido en local: LCP ≤ 1,1 s en todas las pantallas (también con CPU ×4), CLS ≤ 0,07, TTFB 0,2–0,7 s en pantallas con sesión (dominado por consultas a Supabase en el servidor); 48–69 peticiones por pantalla con sesión (casi todo recursos pequeños).
- Barrido de públicas y partner (escritorio: 27 pantallas) y del **creador** (58 combinaciones página × tamaño): **sin errores de consola ni de red**, sin avisos de estructura de axe y sin scroll horizontal del documento en ninguna pantalla (queda solo el de tableros que se desplazan a propósito).
- Estados límite vistos **también como creador** (solicitud que le toca, solicitud en espera, cancelación pedida por la marca, cancelación pedida por él, caducada, completada, terminada por la marca): coherentes; la cancelación de la marca ya aparece primera en «Qué me toca».
- E2E: públicas **38 de 38**; creador y partner **64 de 65** (la que falla es el paso 2 del cambio de contraseña, por la contraseña de `.env.e2e`). Nota: un fallo en `setup` (login del creador) hace que Playwright **no ejecute** el resto (65 sin ejecutar); se lanzó con `--no-deps` reutilizando las sesiones guardadas.
- Datos sembrados para estas pruebas (`[AUDIT]`, textos extremos): borrados con sus avisos; la base vuelve a tener las 4 colaboraciones originales, sin paquetes ni publicaciones extremos.

## 9. Pendiente
- Poner la contraseña actual del creador en `.env.e2e` para que pase la última prueba E2E y `setup` no bloquee al resto.
- Revisar con usuarios reales las sospechas de la sección 3.
- Recorridos alternativos que dependen del correo (confirmación, recuperación, avisos).

## 10. Recomendaciones antes del lanzamiento
1. Resolver el punto de privacidad de publicaciones en colaboración (decisión de producto + RLS).
   (Antes: dejar `.env.e2e` con la contraseña actual del creador de prueba.)
2. Activar «Secure password change» y comprobar que el SMTP envía (sin correo, nadie cambia ni recupera su contraseña).
3. Proyecto de producción separado (hoy las pruebas y los datos reales comparten base).
4. Revisar con 3–5 personas reales el recorrido de alta y de primera colaboración (lo que ninguna herramienta automática puede juzgar).
5. Medir de nuevo el rendimiento en el servidor real y región elegidos: el TTFB depende de la latencia a Supabase.
