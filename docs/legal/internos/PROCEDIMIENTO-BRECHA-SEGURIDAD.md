# Procedimiento ante una brecha de seguridad (arts. 33 y 34 RGPD)

> **DOCUMENTO INTERNO. No publicar.** Borrador breve para revisión del abogado.

**Qué es una brecha:** cualquier incidente que cause destrucción, pérdida, alteración, acceso o comunicación no autorizados de datos personales (por ejemplo, una clave filtrada, un acceso indebido a la base de datos, un correo enviado a quien no debía, un archivo privado expuesto).

**Responsable de gestionar el incidente:** `[TITULAR_NOMBRE]`, contacto `[EMAIL_CONTACTO]`. Suplente: `[DUDA: quién, si lo hay]`.

## 1. Detectar y avisar (inmediato)

Quien detecte algo raro (usuarios, equipo de administración, avisos de proveedores) lo comunica a `[EMAIL_CONTACTO]`. Anotar de inmediato: fecha y hora, quién avisa, qué ha visto.

## 2. Contener (primeras horas)

Según el caso:

| Situación | Acción |
|---|---|
| Clave de servicio de Supabase o de la base de datos filtrada | Regenerarla en el panel de Supabase y actualizarla en el hosting. Revisar accesos recientes. |
| Contraseña de aplicación de Google (SMTP) filtrada | Revocarla en la cuenta de Google y crear otra; actualizar `SMTP_PASS` y el panel de Supabase. |
| Contraseña o cookie del panel de administración comprometida | Cambiar `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` (invalida todas las sesiones del panel); desactivar las cuentas personales afectadas. Con `ADMIN_DISABLE_SHARED_LOGIN=1`, solo valen las cuentas personales. |
| Cuenta de usuario comprometida | Bloquear la cuenta desde el panel, forzar el cambio de contraseña y revisar su actividad. |
| Archivo privado expuesto | Retirar el archivo, revisar las políticas de Storage y quién pudo acceder. |
| Error de la aplicación que expone datos | Desactivar la función afectada (retirar la ruta o apagar el interruptor) hasta corregirla. |
| Clave de cifrado de tokens (`SOCIAL_TOKEN_ENCRYPTION_KEY`) | Hoy no hay cuentas de redes conectadas. Si las hubiera, tratar los tokens como comprometidos y revocarlos. |

No borrar registros ni pruebas: guardar capturas, logs y correos.

## 3. Evaluar el riesgo (en las primeras 24 h)

Responder y anotar:

1. ¿Qué datos están afectados y de cuántas personas? (¿correos, contraseñas, mensajes, archivos, datos de colaboraciones?)
2. ¿Los datos estaban cifrados o eran ilegibles? (las contraseñas están en hash).
3. ¿Hubo acceso real o solo exposición posible?
4. ¿Qué daño podría causar a las personas (suplantación, fraude, pérdida de confidencialidad, daño reputacional)?

Resultado: **sin riesgo** / **riesgo** / **riesgo alto**.

## 4. Registrar siempre (art. 33.5)

Aunque no se notifique, anotar en el registro de incidentes: hechos, efectos, medidas adoptadas y razón de no notificar. Plantilla al final.

## 5. Notificar a la AEPD (si hay riesgo) — plazo: 72 horas

- **Plazo:** sin dilación indebida y, si es posible, en un máximo de **72 horas** desde que se tiene constancia. Si se hace más tarde, indicar el motivo del retraso.
- **Cómo:** formulario de notificación de brechas en la sede electrónica de la AEPD (aepd.es). Se puede completar después con información adicional por fases.
- **Qué incluir:** naturaleza de la brecha; categorías y número aproximado de personas y registros; contacto del responsable; consecuencias probables; medidas adoptadas o propuestas.

## 6. Comunicar a las personas afectadas (si hay riesgo alto) — art. 34

- **Cuándo:** sin dilación indebida, si es probable un **alto riesgo** para sus derechos y libertades.
- **Cómo:** correo y aviso dentro de la aplicación, en lenguaje claro: qué ha pasado, qué datos, qué efectos pueden tener, qué hemos hecho y qué pueden hacer ellas (por ejemplo, cambiar la contraseña), y un contacto.
- **No hace falta** si los datos eran ilegibles (cifrado), si ya se tomaron medidas que eliminan el riesgo alto, o si supondría un esfuerzo desproporcionado (en ese caso, comunicación pública).

## 7. Avisar a proveedores y cerrar

- Si la brecha afecta a datos tratados por un encargado (Supabase, Google, hosting), o fue causada por él, informarle y pedirle su informe del incidente.
- Cuando se haya resuelto: anotar las causas, las correcciones hechas y qué cambiar para que no se repita (claves rotadas, políticas de acceso, formación, pruebas). Actualizar el registro de actividades si cambia algo.

## Plantilla del registro de incidentes

| Campo | Valor |
|---|---|
| Id | |
| Fecha y hora de detección | |
| Quién lo detectó y cómo | |
| Descripción de los hechos | |
| Datos y categorías afectados | |
| Número aproximado de personas y registros | |
| Causa (si se conoce) | |
| Medidas de contención | |
| Evaluación del riesgo (sin riesgo / riesgo / alto) | |
| ¿Notificada a la AEPD? Fecha, o motivo de no hacerlo | |
| ¿Comunicada a las personas afectadas? Fecha, o motivo | |
| Proveedores avisados | |
| Medidas correctoras | |
| Cierre (fecha y responsable) | |

> **Nota para el abogado:** `[DUDA: confirmar si procede notificar también a otra autoridad según el caso, y si conviene un seguro o un contrato con asesoría externa para guardias fuera de horario.]`
