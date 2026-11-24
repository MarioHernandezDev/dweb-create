# PROTOCOLOS INTERNOS: BRECHAS DE SEGURIDAD Y EJERCICIO DE DERECHOS — CIBERAN

> **DOCUMENTO INTERNO · BORRADOR NO PUBLICABLE · v0.1 · 24-nov-2026.** Requiere revisión profesional (**ASE**). No contiene datos personales ni credenciales.
> **Base normativa leída en texto oficial [A]:** RGPD art. 12.3 (plazos), art. 26 (corresponsables), art. 33 (notificación a la autoridad en 72 horas) y art. 34 (comunicación a los afectados). Derechos de los arts. 15–22: **[D]** (no extraídos literalmente).
> **Decisiones:** D02 (buzón único; responsable de respuesta Alejandro; suplente Mario), D11 (acceso a mensajes por reporte), D12 (conservación).
> **Alcance provisional:** usuarios en España (**D22 pendiente**).
> **Etiquetas:** **[OLC]** · **[REC]** · **[ASE]**. `[DEP: …]`.

---

# PARTE A — PROTOCOLO DE GESTIÓN DE BRECHAS DE SEGURIDAD

## A1. Qué es una brecha
Toda **violación de la seguridad** que cause la **destrucción, pérdida o alteración accidental o ilícita** de datos personales, o la **comunicación o acceso no autorizados** a ellos. Ejemplos: acceso indebido a una cuenta o al panel, publicación accidental de un archivo privado, pérdida de una copia, envío de un correo al destinatario equivocado, fallo de permisos que deja ver datos de otro usuario, filtración de una clave.

## A2. Plazos legales [OLC]
| Obligación | Plazo | Fuente |
|---|---|---|
| **Notificar a la AEPD** | **Sin dilación indebida y, de ser posible, a más tardar 72 horas** desde que se tiene constancia, **salvo que sea improbable que suponga un riesgo** para los derechos y libertades; si se supera, **explicar los motivos** | RGPD art. 33.1 [A] |
| **Aviso del encargado al responsable** | **Sin dilación indebida** desde que el encargado lo conoce | Art. 33.2 [A] |
| **Comunicar a los afectados** | **Sin dilación indebida** cuando **sea probable un alto riesgo** | Art. 34.1 [A] |
| **Documentar toda brecha**, también las no notificadas | Siempre | Art. 33.5 [A] |

*(Vigencia: la propuesta del «Ómnibus digital» para el RGPD, que podría reducir los supuestos de notificación, **no consta como aprobada**; rige el texto vigente. **[ASE]** comprobar antes de cada actualización.)*

## A3. Roles
| Rol | Persona | Función |
|---|---|---|
| **Coordinador de incidentes** | `[POR COMPLETAR: propuesta: Alejandro, perfil técnico]` | Recibe la alerta, contiene, reúne datos |
| **Suplente** | `[POR COMPLETAR: propuesta: Mario]` | Cubre ausencias |
| **Decisión de notificar** | **Ambos corresponsables** (acuerdo del art. 26 `[T08]`) | Valoran riesgo y deciden |
| **Asesor** | `[POR COMPLETAR]` | Consulta en casos dudosos |

## A4. Pasos
1. **Detectar y registrar la alerta** (hora y fuente): usuario, proveedor, monitorización, hallazgo propio. **Reloj de 72 horas** desde que se **tiene constancia**.
2. **Contener**: cortar el acceso, revocar claves o sesiones, desactivar la función afectada, retirar archivos expuestos, bloquear cuentas implicadas. **No borrar pruebas.**
3. **Evaluar**: qué datos, de cuántas personas, desde cuándo, qué consecuencias; **¿hay riesgo?** ¿**alto riesgo**? `[ver A5]`.
4. **Decidir y documentar** la valoración y su justificación (aunque se decida **no notificar**).
5. **Notificar a la AEPD** (sede electrónica de la AEPD, www.aepd.es) si hay riesgo, **con el contenido mínimo** del art. 33.3 [A]: naturaleza de la violación (categorías y número aproximado de afectados y de registros), **contacto**, posibles consecuencias y **medidas adoptadas o propuestas**. Si no hay toda la información, **notificar por fases** (art. 33.4 [A]).
6. **Comunicar a los afectados** si hay **alto riesgo** (art. 34 [A]), en **lenguaje claro**, con **naturaleza de la violación, contacto, consecuencias y medidas** (art. 34.2). **No es necesaria** si los datos estaban **cifrados e ininteligibles** o se tomaron medidas que eliminan el alto riesgo (art. 34.3 [A]).
7. **Avisar a los proveedores y, si corresponde, a las autoridades** que procedan.
8. **Remediar y aprender**: causa raíz, corrección, mejoras, actualización del registro de actividades.
9. **Archivar** el expediente (ver A6).

## A5. Guía rápida de valoración del riesgo `[REC; ASE]`
| Factor | Preguntas |
|---|---|
| **Tipo de datos** | ¿Mensajes, archivos privados, identificadores fiscales (NIF/CIF), correos? ¿Alguna categoría especial en texto libre? |
| **Facilidad de identificación** | ¿Los datos identifican directamente? |
| **Volumen** | ¿Cuántas personas? |
| **Cifrado / ininteligibilidad** | ¿Se pueden leer los datos? |
| **Consecuencias** | Suplantación, fraude, daño reputacional, exposición de relaciones comerciales |
| **Quién accedió** | ¿Interno, proveedor, desconocido? ¿Ha podido copiar? |
Regla práctica: **ante la duda, tratar como notificable** y consultar al asesor.

## A6. Registro de brechas (obligatorio, art. 33.5 [A])
Campos: **id**, fecha y hora de **constancia**, descripción de los **hechos**, **datos y afectados**, **efectos**, **medidas correctoras**, **valoración del riesgo** y **justificación**, **notificación a la AEPD** (sí/no, fecha, referencia, motivos de retraso), **comunicación a afectados** (sí/no, fecha, texto), **proveedores avisados**, **causa raíz**, **medidas de mejora**, **cierre**. **Conservación:** `[POR COMPLETAR: plazo — ASE]`.

## A7. Prevención y preparación `[DEP: D15, T11]`
Cuentas de administración **personales** y con doble factor (R21), **copias** y **prueba de restauración**, **separación de entornos**, **revisión de permisos**, **lista de contactos de proveedores**, **simulacro anual**.

## A8. Plantilla de comunicación a afectados `[REC]`
> **Asunto:** Aviso sobre un incidente de seguridad en CIBERAN.
> **Qué ha pasado:** `[naturaleza, fecha]`. **Qué datos:** `[categorías]`. **Posibles consecuencias:** `[__]`. **Qué hemos hecho:** `[medidas]`. **Qué puedes hacer tú:** `[recomendaciones, p. ej. cambiar contraseña]`. **Contacto:** `[buzón de privacidad]`. Puedes reclamar ante la AEPD.

---

# PARTE B — PROTOCOLO DE EJERCICIO DE DERECHOS RGPD

## B1. Derechos cubiertos [OLC]
**Acceso, rectificación, supresión, oposición, limitación del tratamiento, portabilidad** y **retirada del consentimiento**; el RGPD (arts. 15 a 22 **[D]**) y el art. 12 (**[A]**) regulan cómo y cuándo responder. **Decisiones automatizadas:** no se toman.

## B2. Canal y plazos
| Elemento | Regla | Fuente |
|---|---|---|
| **Canal único** | `[POR COMPLETAR: buzón de privacidad]`; también se atienden las recibidas por **cualquier otro canal** o por **cualquiera de los dos corresponsables** (**reenviar al buzón en 2 días**) | RGPD art. 26.3 [A]; D02 |
| **Plazo de respuesta** | **Un mes** desde la recepción; **prorrogable dos meses más** si hace falta, **informando de la prórroga y sus motivos dentro del primer mes** | Art. 12.3 [A] |
| **Responsable de respuesta / suplente** | **Alejandro / Mario** | D02 |
| **Medio de respuesta** | **Electrónico** si se solicitó así y es posible | Art. 12.3 [A] |
| **Gratuidad** | En principio **gratuita**; si es manifiestamente infundada o excesiva, se puede cobrar un canon razonable o negarse, **motivándolo** `[ASE]` | RGPD art. 12.5 **[D]** |
| **Revisión semanal del buzón** | Obligatoria | REC |

## B3. Procedimiento
1. **Recibir y registrar** la solicitud (fecha de recepción = **día 0**). Acuse de recibo en **2 días** `[REC]`.
2. **Identificar a la persona**: confirmar que es titular de la cuenta (por el correo registrado o desde la sesión); si hay dudas razonables, pedir **información adicional mínima** (no pedir documentos innecesarios).
3. **Clasificar** el derecho y comprobar si **afecta a terceros** (por ejemplo, colaboraciones compartidas).
4. **Ejecutar**:
   - **Acceso y portabilidad:** la función **«Descargar mis datos»** genera un archivo estructurado (no incluye tokens de redes ni identificadores de pagos). Completar con lo que no cubra (p. ej. **reportes**, si procede, sin revelar datos de terceros).
   - **Rectificación:** el usuario puede editar su perfil; para el resto, el equipo corrige.
   - **Supresión:** la **eliminación de cuenta** es inmediata sin historial compartido; con historial, **solicitud + anonimización** (ver D12 y doc. 16); **datos que la ley obligue a conservar: bloqueo**.
   - **Limitación y oposición:** valorar si hay **motivos legítimos imperiosos**; si no, cesar el tratamiento. **Perfilado de búsquedas:** `[DEP: R18]`.
   - **Retirada del consentimiento:** lista de espera, cookies de analítica.
5. **Responder por escrito**: qué se ha hecho, **o los motivos de la denegación** y la posibilidad de **reclamar ante la AEPD**.
6. **Notificar a los proveedores** cuando haya **rectificación o supresión** que les afecte (art. 19 RGPD **[D]**).
7. **Archivar** el expediente (ver B5).

## B4. Casos especiales
| Caso | Tratamiento |
|---|---|
| **Corresponsabilidad** | El interesado puede dirigirse a **cualquiera de los dos**; lo reciba quien lo reciba, se **gestiona desde el buzón** (art. 26.3 [A]). |
| **Terceros en la información** (chat, colaboraciones) | **No entregar datos de otras personas** sin base; entregar la parte propia; **ASE** si hay duda. |
| **Menores** | La cuenta de un menor se **elimina** (D09); si lo pide un titular de la patria potestad, **verificar** su condición y **eliminar**. |
| **Solicitud de un usuario con reporte abierto** | Puede **limitarse** lo que **perjudique una investigación** o los **derechos de terceros** `[ASE]`. |
| **Requerimiento de una autoridad** | **No es un ejercicio de derechos**; seguir el protocolo de moderación (doc. 15). |

## B5. Registro de solicitudes
Campos: **id**, fecha de recepción, canal, derecho, **identificación realizada**, fecha del **acuse**, **decisión** y **fecha de respuesta**, **prórroga** (sí/no y motivo), **proveedores avisados**, **cierre**. **Conservación:** `[POR COMPLETAR: plazo — ASE]`.

## B6. Plantillas breves `[REC]`
- **Acuse:** «Hemos recibido tu solicitud de [derecho] el [fecha]. Te responderemos en un máximo de **un mes**. Si necesitamos ampliar el plazo, te lo comunicaremos antes de que termine el primer mes.»
- **Prórroga:** «Por la complejidad de tu solicitud, ampliamos el plazo **dos meses más** (art. 12.3 RGPD). Motivo: [__].»
- **Denegación:** «No podemos atender [parte de] tu solicitud porque [motivo]. Puedes reclamar ante la **Agencia Española de Protección de Datos** (www.aepd.es).»

---

## NOTAS DE REDACCIÓN (no publicar)

| Punto | Tipo | Fuente / estado | Pendiente |
|---|---|---|---|
| Notificación a la AEPD en 72 horas; contenido; documentación | **[OLC]** | RGPD art. 33 [A] | Asignar roles (T12) |
| Comunicación a afectados; excepciones | **[OLC]** | RGPD art. 34 [A] | — |
| Plazo de un mes (+2) para derechos | **[OLC]** | RGPD art. 12.3 [A] | — |
| Corresponsables: ejercicio contra cualquiera | **[OLC]** | RGPD art. 26.3 [A] | Acuerdo del art. 26 |
| Derechos de los arts. 15–22 y art. 12.5; art. 19 | **[OLC]** | RGPD [D], **no extraídos literalmente** | Confirmar literal |
| Roles de brechas y derechos | Decisión **D02** (derechos); brechas **por asignar** | D02 | Confirmar coordinador de incidentes |
| Cifras de 2 días (acuse y reenvío) | **[REC]** | — | — |
| Plazos de conservación de los registros | **[ASE]** | D12 | — |
| Prácticas técnicas (copias, doble factor, cuentas personales) | Dependen de Fase 6 | D15, R21 | — |
