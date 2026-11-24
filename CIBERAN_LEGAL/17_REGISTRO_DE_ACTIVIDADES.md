# REGISTRO DE ACTIVIDADES DE TRATAMIENTO — CIBERAN

> **DOCUMENTO INTERNO · BORRADOR NO PUBLICABLE · v0.1 · 24-nov-2026.** Lo exige el RGPD (art. 30) y **no se publica**; se exhibe a la AEPD si lo solicita. Requiere revisión profesional (**ASE**) y **actualización al abrir la app**.
> **Obligación [OLC]:** la excepción de menos de 250 empleados **no aplica** si el tratamiento no es ocasional, entraña riesgo o incluye categorías especiales (**RGPD art. 30.5 [A]**); además, el registro debe contener lo indicado en el **art. 30.1 [A]** (letras a–g), que se refleja abajo.
> **Alcance provisional:** usuarios en España (**D22 pendiente**). **Excluidos** (apagados o aplazados): pagos y suscripciones, inteligencia artificial, integraciones sociales y acceso con Google.
> **Hechos de base:** inventario de la Fase 1 (esquema real de la base de datos a 24-nov-2026) y decisiones D01–D16.
> `[DEP: …]` = depende de D04c, D20, D21, V01–V09.

---

## 1. Datos generales del registro (art. 30.1.a)

| Campo | Contenido |
|---|---|
| **Corresponsables del tratamiento** | `[POR COMPLETAR: nombre completo, NIF y domicilio del fundador 1]` y `[POR COMPLETAR: ídem del fundador 2]` (**D01**). Cuando exista sociedad, esta pasará a ser la responsable. |
| **Acuerdo entre corresponsables** (art. 26) | `[POR COMPLETAR: referencia y fecha del acuerdo — T08]` |
| **Punto de contacto para interesados** | `[POR COMPLETAR: buzón de privacidad]` (**D02**: responsable de respuesta Alejandro; suplente Mario) |
| **Delegado de protección de datos** | **No designado** (no obligatorio con la actividad actual; RGPD art. 37.1 [A]). Revisar si crece el perfilado a gran escala. |
| **Representante** | No aplica |
| **Fecha de creación / revisión** | 24-nov-2026 (borrador) / `[POR COMPLETAR]` |

## 2. Actividades de tratamiento (art. 30.1.b–g)

**Medidas de seguridad (g)**: ver §4. **Plazos (f)**: ver `16_POLITICA_DE_CONSERVACION.md` (propuesta, sin validar).

| ID | Actividad | Fines (b) | Interesados y datos (c) | Destinatarios (d) | Transferencias (e) | Base legal | Estado |
|---|---|---|---|---|---|---|---|
| **T01** | **Cuentas y autenticación** | Alta, acceso, seguridad de la cuenta, verificación por correo y cambio de contraseña | **Usuarios** (creadores y partners): nombre, correo, contraseña cifrada, rol, identificador interno | Encargados (BD/autenticación, correo `[DEP: D07, D20]`) | `[POR COMPLETAR: según proveedor — V07]` | Contrato (6.1.b) | Existe |
| **T02** | **Perfiles y descubrimiento** | Mostrar fichas, permitir búsqueda y contacto, guardar favoritos y búsquedas | **Usuarios**: foto, portada, descripción, nicho/sector, ubicación, categorías, tarifas orientativas, paquetes, web, perfiles guardados | **Público** (si la ficha es pública); otros usuarios | Idem T01 | Contrato (6.1.b) | Existe |
| **T03** | **Mensajería y ofertas** | Comunicación entre creador y partner, ofertas | **Usuarios**: mensajes (texto libre), ofertas | Contraparte; **equipo solo por reporte o requerimiento** (D11) | Idem T01 | Contrato (6.1.b) | Existe |
| **T04** | **Colaboraciones** | Negociar, aceptar, gestionar entregables, publicaciones, aprobaciones, valoraciones, cronología y archivos | **Usuarios**: brief, importe de referencia, alcance, condiciones de uso, entregables, versiones, comentarios, archivos, valoraciones | Contraparte; el partner ve la publicación **desde su primer envío a revisión** | Idem T01 | Contrato (6.1.b) | Existe |
| **T05** | **Avisos y comunicaciones del servicio** | Notificar actividad (in-app y resumen por correo) y respetar preferencias | **Usuarios**: avisos, preferencias, correo | Proveedor de correo `[DEP: D07]` | `[POR COMPLETAR]` | Contrato (6.1.b) | Existe |
| **T06** | **Calendario por enlace secreto** | Permitir suscribir las fechas de entrega a un calendario externo | **Usuarios**: fechas y títulos de entregas; enlace secreto | Quien tenga el enlace (calendario del usuario) | `[POR COMPLETAR]` | Contrato (6.1.b) | Existe |
| **T07** | **Verificación de partners** (D08) | Comprobar que el partner actúa en el ejercicio de su actividad; evitar la entrada de consumidores | **Partners**: tipo de entidad, razón social o nombre profesional, **NIF/CIF**, declaración, estado de verificación, señales de alerta | Equipo | — | Interés legítimo (6.1.f) **[ASE]** | **Futuro** (Fase 6) |
| **T08** | **Declaraciones y aceptaciones** | Acreditar mayoría de edad, aceptación de términos y declaración profesional del partner | **Usuarios**: versión, fecha y texto aceptado | Equipo | — | Contrato (6.1.b) / obligación (Ley 7/1998 [A]) | Parcial (versión y fecha existen; texto y declaraciones, Fase 6) |
| **T09** | **Moderación, reportes y DSA** | Atender reportes y notificaciones de contenido ilícito; motivar decisiones | **Usuarios y terceros notificantes**: motivo, detalle, notas internas, estado, decisión | Equipo; autoridades si lo exige la ley | — | Interés legítimo (6.1.f) y obligación legal (6.1.c) | Parcial |
| **T10** | **Auditoría de acciones del equipo** | Trazabilidad y seguridad del panel de administración, incluido el acceso a contenido privado | **Equipo y usuarios afectados**: actor, acción, objeto, fecha, motivo | Equipo | — | Interés legítimo (6.1.f) | Existe (verificar que registra lecturas de contenido) |
| **T11** | **Ejercicio de derechos, eliminación y exportación** | Atender solicitudes de derechos; descarga de datos; eliminación y anonimización de cuentas | **Usuarios**: solicitud, identificación, respuesta, motivo | Equipo | — | Obligación legal (6.1.c) | Parcial (descarga y borrado existen; registro, Fase 6) |
| **T12** | **Seguridad y registros técnicos** | Seguridad, prevención de abusos, límites de uso | **Usuarios y visitantes**: IP y datos técnicos en registros del proveedor | Netlify / Supabase `[DEP: V07]` | EE. UU. según proveedor | Interés legítimo (6.1.f) | Existe (en proveedores) |
| **T13** | **Estadísticas internas del buscador** | Mejorar el descubrimiento; analítica interna agregada | **Usuarios**: consultas, filtros, número de resultados | Equipo | — | Interés legítimo (6.1.f) **[ASE: finalidad y base; informar]** | Existe |
| **T14** | **Lista de espera** (D03) | Gestionar el acceso por cohortes y avisar del lanzamiento | **Interesados**: correo y rol de interés `[DEP: D20, campos]` | Proveedor `[DEP: D20]` | `[POR COMPLETAR]` | **Consentimiento** (6.1.a) | **Futuro** (landing) |
| **T15** | **Analítica de la web de presentación** | Medir visitas (solo si se acepta) | **Visitantes**: identificador anónimo, páginas, dispositivo, ubicación aproximada | Google (Analytics/Tag Manager) | EE. UU. (Marco de Privacidad; verificar — V07) | **Consentimiento** (6.1.a; LSSI 22.2) | Existe |
| **T16** | **Gestión de incidentes y brechas** | Detectar, documentar y notificar violaciones de seguridad | **Usuarios afectados**: descripción del incidente | AEPD; afectados si hay alto riesgo | — | Obligación legal (6.1.c; RGPD arts. 33–34 [A]) | Por implantar |

## 3. Encargados y proveedores (para art. 28 y art. 30.1.d–e)

| Proveedor | Servicio | Actividades | Contrato de encargo | Estado |
|---|---|---|---|---|
| **Supabase** | Base de datos, autenticación, almacenamiento | T01–T06, T08–T11 | `[POR COMPLETAR: DPA archivado — V07]` | Región del proyecto de producción por confirmar (D15) |
| **Netlify, Inc.** | Alojamiento web | T12, T15 | `[POR COMPLETAR: DPA — V07]` | Landing activa; app **no desplegada** (V01) |
| **Proveedor de correo** | Correos del servicio y autenticación | T01, T05 | `[POR COMPLETAR — D07/D20]` | Hoy: cuenta Gmail (a migrar antes de abrir) |
| **Proveedor de la lista de espera** | Recogida de correos | T14 | `[POR COMPLETAR — D20]` | Pendiente |
| **Google (Analytics/Tag Manager)** | Analítica web | T15 | Condiciones de Google `[POR COMPLETAR: verificar]` | Activo con consentimiento |
| **Sentry** | Errores | — | `[DEP: V09]` | **No activo** |
| *Stripe, OpenRouter y Google Login* | — | — | — | **Apagados** (no se tratan datos; D16, Fase D) |

*(Como responsables, los corresponsables **no** están obligados a llevar el registro del art. 30.2 (de encargados); lo llevan los proveedores.)*

## 4. Medidas de seguridad (art. 30.1.g y art. 32 RGPD [A]) — estado real

| Medida | Estado a 24-nov-2026 |
|---|---|
| Control de acceso por usuario (permisos por fila en la base de datos) | **Implantada** |
| Cifrado en tránsito (HTTPS) | **Implantada** (proveedor de alojamiento) |
| Contraseñas cifradas por el proveedor de autenticación | **Implantada** |
| Cambio de contraseña reforzado con código por correo | **Implantada** |
| Registro de acciones del equipo | **Implantada** `[verificar el alcance sobre contenido privado]` |
| Cuentas personales de administración (sin contraseña compartida) | **Pendiente** (R21) |
| **Separación de entornos y copias de seguridad** | **Pendiente** (D15, T11) |
| **Protocolo de brechas** | **Pendiente** (doc. 18) |
| **Procedimiento de derechos y registro** | **Pendiente** (doc. 18) |
| Registro de acceso a contenido privado por reporte | **Por verificar** (D11) |
| Prueba periódica de restauración | **Pendiente** (D15) |
| **No deben publicarse** como implantadas las medidas «Pendiente» | — |

## 5. Mantenimiento del registro
Revisar **cada vez que** se abra la app, se añada un proveedor o una función (pagos, IA, redes, equipos de marca) o cambie la titularidad (SL). Responsable: **corresponsables**; apoyo: asesor.

## NOTAS DE REDACCIÓN (no publicar)
- **Pendiente de confirmar:** categorías de destinatarios por actividad, transferencias reales (V07) y bases legales concretas **[ASE]**.
- Las actividades **T07, T14** son **futuras**: se mantienen en el registro **para tenerlas listas al implantarlas**.
- **EIPD:** no obligatoria hoy (RGPD art. 35.3 [A]); **revisar** si se confirma perfilado en T13 o se activa IA.
