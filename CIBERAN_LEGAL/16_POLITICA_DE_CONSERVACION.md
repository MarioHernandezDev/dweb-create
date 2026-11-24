# POLÍTICA DE CONSERVACIÓN DE DATOS — CIBERAN

> **BORRADOR NO PUBLICABLE · v0.1 · 24-nov-2026.** **Todos los plazos son una PROPUESTA (REC)** de la decisión **D12** y **deben validarse con abogado y asesor fiscal** antes de aplicarse. No hay ningún plazo implantado técnicamente hoy: el borrado programado es una tarea de la Fase 6.
> **Principio legal [OLC]:** los datos se conservan «durante no más tiempo del necesario para los fines del tratamiento» (RGPD art. 5.1.e [A]); al suprimir, lo que deba conservarse se **bloquea** (LOPDGDD art. 32 [B]).
> **Alcance provisional:** usuarios en España (**D22 pendiente**). `[DEP: V07, D20]`.
> **Etiquetas:** **[OLC]** · **[REC]** · **[ASE]**.

---

## 1. Texto de resumen (para incluir en la política de privacidad, §7)

Conservamos tus datos **mientras tengas cuenta**. Si dejas de usar CIBERAN o la eliminas, borramos o anonimizamos tus datos, salvo los que la ley nos obligue a conservar, que **se bloquean** y se usan solo para atender posibles responsabilidades hasta que prescriban. Los plazos concretos por tipo de dato son los de la tabla siguiente.

## 2. Tabla de conservación (propuesta a validar)

| # | Categoría | Dónde está (interno) | Plazo propuesto | Qué ocurre al vencer | Estado |
|---|---|---|---|---|---|
| 1 | **Cuenta y perfil** (nombre, correo, perfil, preferencias) | Autenticación; `profiles`, `creators`, `partners` | **Mientras la cuenta exista** | Borrado al eliminarla | [OLC principio] |
| 2 | **Cuenta inactiva** | Ídem | **Aviso a los 24 meses sin acceso; baja 30 días después** | Borrado o anonimización | [REC] **[ASE]** si hay historial |
| 3 | **Cuenta eliminada sin historial compartido** | Ídem y cascada | **Borrado inmediato** (flujo actual) | — | Existe |
| 4 | **Cuenta eliminada con historial compartido** | `account_deletion_requests`; colaboraciones | **Anonimización**; los datos de la otra parte se conservan; **bloqueo** de lo exigible `[POR COMPLETAR: plazo — ASE]` | Destrucción al prescribir | [REC] **[ASE]** |
| 5 | **Declaraciones y aceptaciones** (mayoría de edad, términos, partner profesional) con versión y fecha | `profiles` (+ futuro) | **Mientras la cuenta exista y, bloqueadas, `[POR COMPLETAR]`** para acreditar la aceptación | Bloqueo y destrucción | [REC] **[ASE]** |
| 6 | **Datos de empresa de partners** (tipo, razón social, NIF/CIF, estado de verificación) | `partners` (+ futuro) | **Mientras exista la cuenta**; si hay verificación documental, **solo el resultado** | Borrado | [REC] |
| 7 | **Colaboraciones, entregables, publicaciones y cronología** | `collaborations`, `collaboration_*`, `posts`, `post_revision_notes` | **Mientras la colaboración o la cuenta existan** y hasta **12 meses** tras el cierre o la baja de una parte | Anonimización o borrado | [REC] **[ASE]** |
| 8 | **Mensajes y ofertas** | `conversations`, `messages`, `offers` | Íd. | Borrado | [REC] **[ASE]** |
| 9 | **Archivos de colaboración y biblioteca** | Storage `collab-files`, `post-media`; `collaboration_files`, `media_library` | **Mientras exista la colaboración o los conserves**; **12 meses** tras el cierre | Borrado del archivo | [REC] |
| 10 | **Avisos (notificaciones)** y preferencias | `notifications`, `notification_preferences` | **6 meses** tras leídos | Borrado | [REC] |
| 11 | **Búsquedas del buscador** | `discovery_searches` | **12 meses** `[ASE: finalidad y base]` | Borrado o agregación irreversible | [REC] |
| 12 | **Perfiles y búsquedas guardados** | `saved_profiles`, `saved_searches` | Mientras la cuenta exista | Borrado | [REC] |
| 13 | **Enlace de calendario** | `calendar_feeds` | Mientras lo uses; se invalida al rotarlo o eliminar la cuenta | Borrado | [REC] |
| 14 | **Reportes y notas internas de moderación** | `reports` | `[POR COMPLETAR: plazo — ASE]` (relacionado con prescripción de reclamaciones y sanciones) | Anonimización o borrado | **[ASE]** |
| 15 | **Registro de acciones del equipo** (incluye acceso a contenido privado) | `admin_audit_log` | `[POR COMPLETAR: plazo — ASE]` | Borrado | **[ASE]** |
| 16 | **Notificaciones de contenido ilícito y decisiones** (DSA) | Registro de moderación (Fase 6) | `[POR COMPLETAR: plazo — ASE]` | Borrado | **[ASE]** |
| 17 | **Solicitudes de derechos y su respuesta** | Registro de derechos (doc. 18) | `[POR COMPLETAR: plazo — ASE]` | Borrado | **[ASE]** |
| 18 | **Registro de brechas** | Registro interno | `[POR COMPLETAR: plazo — ASE]` | — | **[OLC]** documentar (RGPD art. 33.5 [A]) |
| 19 | **Registros técnicos del servidor y de seguridad** | Netlify y Supabase | **Los de cada proveedor**; **no se guardan IP en la base de datos** | Los del proveedor | Verificar (**V07**) |
| 20 | **Errores** (Sentry, si se activa) | Sentry | **Objetivo: máximo 90 días** `[DEP: V09]` | Borrado | [REC] |
| 21 | **Lista de espera** | Proveedor `[DEP: D20]` | Hasta el lanzamiento de su cohorte o **12 meses**; **baja inmediata** a petición | Borrado | [REC] |
| 22 | **Consentimiento de cookies (landing)** | Navegador | **12 meses** | Se vuelve a pedir | Ya declarado en la landing |
| 23 | **Datos de pagos y facturación** | — | **No aplica hoy**; al monetizar: **plazos fiscales y mercantiles** | — | **[ASE]** fiscal (D16) |
| 24 | **Copias de seguridad** | Copias programadas (D15) | `[POR COMPLETAR: p. ej. rotación de las últimas N copias]` | Sobrescritura | [REC] |

## 3. Bloqueo y destrucción
1. **Bloqueo (LOPDGDD art. 32 [B]):** los datos que deban conservarse tras suprimirlos **se mantienen identificados, solo accesibles a jueces, Ministerio Fiscal y autoridades competentes**, y **únicamente durante el plazo de prescripción** de las responsabilidades. `[ASE: confirmar literal]`.
2. **Destrucción:** al vencer el plazo, se **destruyen**. Registro de qué se destruyó y cuándo.
3. **Copias:** los datos borrados desaparecen de las copias cuando **se sobrescriban** por rotación (ver fila 24).

## 4. Responsabilidades y revisión
| Tarea | Responsable | Frecuencia |
|---|---|---|
| Ejecutar el borrado programado | Alejandro (técnico) | Mensual `[POR COMPLETAR tras Fase 6]` |
| Revisar la tabla y los plazos | Ambos + asesor | Anual y antes de activar pagos, IA o redes |
| Responder a una solicitud de supresión | Responsable de privacidad (D02: Alejandro; suplente Mario) | Según doc. 18 |

## 5. Dependencias técnicas (Fase 6; **no se hacen ahora**)
Tareas programadas de **borrado y anonimización** por categoría; **columna de fecha de resolución** en reportes; **caducidad** en notificaciones y búsquedas; **registro de borrados**; **copias manuales** con rotación documentada (D15); comprobar qué tablas hoy **no tienen** caducidad.

## NOTAS DE REDACCIÓN (no publicar)
- **Cifras:** todas las de la tabla son **propuestas de D12**, **sin validar**. Las de **reportes, auditoría, DSA, derechos, brechas, aceptaciones y datos fiscales** requieren **asesor** (prescripción de reclamaciones y sanciones, deberes fiscales).
- **No se han inventado plazos legales**: cuando falta validación se deja `[POR COMPLETAR]`.
- **Pagos y datos fiscales:** fuera de alcance hasta D16.
