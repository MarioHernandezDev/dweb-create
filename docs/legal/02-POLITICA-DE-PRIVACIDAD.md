# Política de privacidad

> **Borrador para revisión del abogado. No publicado.** Marcas: ver [README](README.md). Los plazos de la tabla del apartado 6 son **propuestas, a confirmar con el abogado**.

Última actualización: `[FECHA al publicar]`

Aquí explicamos qué datos personales trata CIBERAN, para qué, con quién los compartimos, cuánto tiempo los conservamos y cómo puedes ejercer tus derechos.

## 1. Responsable del tratamiento

- **Responsable:** `[TITULAR_NOMBRE]` (persona física), DNI `[TITULAR_DNI]`
- **Domicilio:** `[TITULAR_DOMICILIO]`
- **Contacto para cualquier cuestión de privacidad:** `[EMAIL_CONTACTO]`

## 2. Qué datos tratamos y de dónde proceden

**Datos que nos das tú:**

- **Cuenta:** correo electrónico, contraseña (se guarda cifrada, nunca en claro), nombre, y si eres creador o partner.
- **Perfil:** foto, portada, nombre público o de empresa, descripción, nicho o sector, ubicación, categorías, web, tarifas o presupuesto, qué buscas y datos de tu audiencia. Todo es opcional salvo lo necesario para crear la cuenta.
- **Actividad en la plataforma:** solicitudes y propuestas de colaboración (texto del brief, presupuesto, condiciones), mensajes de chat y ofertas, publicaciones y entregables, archivos que adjuntes, valoraciones y comentarios, denuncias que envíes, perfiles y búsquedas que guardes, y el motivo si pides eliminar tu cuenta.
- **Ajustes:** preferencias de avisos por correo, privacidad del chat, visibilidad de tu perfil público.
- **Aceptación de los textos legales:** qué versión de los términos y de esta política aceptaste y cuándo.

**Datos que generamos nosotros:** avisos dentro de la aplicación, historial de las colaboraciones (cambios de estado, entregables, aprobaciones), registro de las búsquedas que haces en Descubrir (solo los filtros y el número de resultados, **sin el texto que escribas**) `[DEPENDE DE CAMBIO 5b]` y datos técnicos.

**Datos técnicos:** tu dirección IP llega a nuestros proveedores de infraestructura al procesar tus peticiones. La aplicación usa la IP solo en memoria para limitar abusos (por ejemplo, intentos de acceso repetidos) y no la guarda en base de datos. `[DUDA: qué registros de acceso guarda el hosting y por cuánto tiempo, y si el servicio de autenticación guarda la IP en sus registros]`

**Datos que proceden de otras personas (art. 14 RGPD):** otras personas usuarias pueden escribir sobre ti en una colaboración (por ejemplo, tu nombre en un brief), valorarte o denunciarte. En una denuncia contra ti tratamos lo que la otra parte cuente y lo que resulte de nuestra revisión.

## 3. Qué ven otras personas

- **Usuarios con sesión:** pueden ver tu ficha completa (por ejemplo, tarifas o presupuesto, audiencia y actividad) y escribirte según tu ajuste de privacidad de chat.
- **Ficha pública (sin sesión):** cualquier persona con el enlace puede ver tu nombre, foto, portada, descripción, ubicación, web, categorías, tipos de colaboración, valoración media y número de colaboraciones. **Por defecto la ficha pública está activada** y puedes desactivarla en tu perfil en cualquier momento. `[DUDA: ¿es aceptable que sea pública por defecto o debe ser opt-in?]`
- **Buscadores:** la ficha pública no se ofrece a buscadores. `[DEPENDE DE CAMBIO 7]` (hoy no lleva `noindex`; si no se hace el cambio, esta frase debe sustituirse por «puede aparecer en buscadores» y explicarse junto al interruptor).
- **Imágenes:** las fotos, portadas e imágenes de publicaciones que subes se guardan en un almacenamiento cuyas direcciones (URL) son accesibles sin iniciar sesión para quien las conozca. No subas imágenes que no quieras que alguien con el enlace pueda ver. `[DUDA: ¿es aceptable un bucket público para estas imágenes o conviene hacerlo privado?]`
- **Archivos de colaboración** (PDF, documentos, hojas de cálculo, imágenes): solo los ven las dos partes de esa colaboración.
- **Chat y colaboraciones:** lo ve la otra parte. `[DUDA: el panel de administración no muestra mensajes, pero quien administra la base de datos podría acceder técnicamente a ellos; ¿cómo se debe describir ese acceso y cuándo se usaría, p. ej. para resolver una denuncia?]`

## 4. Para qué usamos tus datos y con qué base legal

| Finalidad | Datos | Base legal |
|---|---|---|
| Crear y gestionar tu cuenta, y que puedas iniciar sesión y recuperar la contraseña | Cuenta, aceptación de textos | Ejecución del contrato (art. 6.1.b RGPD) |
| Mostrar tu perfil y que otras personas te encuentren (Descubrir, fichas, guardados) | Perfil | Ejecución del contrato |
| Gestionar colaboraciones: solicitudes, ofertas, chat, publicaciones, entregables, archivos, valoraciones | Actividad | Ejecución del contrato |
| Enviarte avisos dentro de la aplicación y un resumen por correo de los avisos sin leer (puedes desactivar el correo en tu perfil o desde el enlace de baja) | Correo, avisos | Ejecución del contrato (avisos en la aplicación); interés legítimo (resumen por correo) |
| Seguridad y prevención de abusos (límites de uso, bloqueo de cuentas, revisión de denuncias) | Técnicos, denuncias, actividad | Interés legítimo (art. 6.1.f) y, para contenido ilícito, obligaciones legales (art. 6.1.c) |
| Atender denuncias y avisos de contenido ilícito | Denuncias, actividad | Interés legítimo y obligación legal |
| Saber cómo se usa Descubrir para mejorarlo (estadísticas internas del equipo, solo con filtros y número de resultados, sin el texto de la búsqueda) `[DEPENDE DE CAMBIO 5b]` | Registro de búsquedas (filtros y recuento) | Interés legítimo |
| Atender tus solicitudes de derechos y de eliminación de cuenta, y poder demostrar que se atendieron | Solicitud, motivo, datos de la cuenta | Obligación legal |
| Auditoría de las acciones del equipo de administración | Datos de la cuenta afectada, nombre de quien actúa | Interés legítimo |

No tomamos decisiones automatizadas con efectos jurídicos sobre ti ni hacemos perfiles publicitarios.

## 5. Con quién compartimos tus datos

No vendemos tus datos. Solo los comparten con nosotros o reciben estos proveedores, que actúan como **encargados del tratamiento**:

| Proveedor | Para qué | Qué datos | Ubicación |
|---|---|---|---|
| **Supabase** | Base de datos, autenticación, almacenamiento de archivos y tareas programadas | Todos los datos de la aplicación | `[DUDA: región del proyecto; si es UE, indicar la UE]` |
| **Google (Gmail, servidor SMTP)** | Envío de correos: registro, verificación, recuperación de contraseña y avisos | Tu correo, y el título y texto de los avisos que te enviamos | EE. UU. (ver apartado siguiente) |
| **Proveedor de alojamiento** | Servir la aplicación | Tu IP y tus peticiones; el contenido pasa por sus servidores | `[DUDA: proveedor y región, aún sin elegir]` |
| **IONOS** | Registro del dominio y DNS | Tu IP y las consultas al dominio | `[DUDA: confirmar entidad contratante y si interviene también como hosting]` |

También pueden acceder a datos:

- **El equipo de administración de CIBERAN**, que ve datos de las cuentas (correo, nombre, actividad) para soporte, seguridad y revisión de denuncias. Sus acciones quedan registradas.
- **Autoridades** (juzgados, fuerzas de seguridad, AEPD) cuando la ley lo exija.
- **Otras personas usuarias**, en los términos del apartado 3.

Las imágenes de la página de inicio no implican comunicar tu IP a ningún tercero. `[DEPENDE DE CAMBIO 3]`

**Transferencias internacionales.** Google puede tratar los datos en EE. UU. Esa transferencia se ampara en `[DUDA: marco de privacidad UE-EE. UU. o cláusulas contractuales tipo; confirmar la certificación y el contrato aplicable]`. Para Supabase y el alojamiento, la situación depende de la región elegida `[DUDA]`. Si algún encargado de tratamiento trata datos fuera del Espacio Económico Europeo, lo indicaremos aquí con la garantía aplicada.

## 6. Cuánto tiempo conservamos tus datos `[DEPENDE DE CAMBIO 5]`

Los plazos siguientes son **propuestas, a confirmar con el abogado**, y no se publican hasta que la aplicación los aplique de verdad (borrado o anonimizado automático).

| Dato | Plazo | Estado |
|---|---|---|
| Cuenta, perfil, ajustes, guardados, publicaciones y archivos | Mientras mantengas la cuenta. Al eliminarla, se borran según el apartado 7. Los archivos se borran con la cuenta `[DEPENDE DE CAMBIO 2]`. | Plazo del producto |
| Colaboraciones y chat compartidos con otra persona | Mientras la otra parte mantenga su cuenta. Tras tu baja, tus mensajes dejan de asociarse a tu nombre `[DUDA técnica: verificar qué se muestra a la otra parte y qué ocurre con las conversaciones al borrar una cuenta]`. | Propuesta, a confirmar con el abogado |
| Registro de búsquedas en Descubrir (solo filtros y recuento) `[DEPENDE DE CAMBIO 5b]` | Se desvincula de ti al eliminar tu cuenta; se borra a los 12 meses | Propuesta, a confirmar con el abogado |
| Avisos dentro de la aplicación | 12 meses | Propuesta, a confirmar con el abogado |
| Denuncias y su resolución | 3 años desde que se cierran | Propuesta, a confirmar con el abogado |
| Solicitudes de eliminación de cuenta y de ejercicio de derechos | 3 años desde que se resuelven, para poder demostrar que se atendieron | Propuesta, a confirmar con el abogado |
| Registro de acciones del equipo de administración | 2 años | Propuesta, a confirmar con el abogado |
| Registros del servidor y del alojamiento | `[DUDA: depende del proveedor]` | Pendiente |
| Copias de seguridad | `[DUDA: depende del plan de Supabase]` | Pendiente |

Pasados estos plazos, borramos los datos o los anonimizamos de forma irreversible. Podemos conservar datos bloqueados más tiempo cuando una ley lo exija o para defendernos de reclamaciones, mientras puedan surgir responsabilidades.

## 7. Tus derechos y cómo ejercerlos

Tienes derecho a **acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad**, y a retirar tu consentimiento cuando el tratamiento se base en él.

**Por tu cuenta, sin escribirnos:**

- **Rectificar:** edita tu perfil y ajustes.
- **Acceder y llevarte tus datos:** en tu cuenta puedes descargar un archivo ZIP con tus datos en CSV (perfil, colaboraciones, mensajes que enviaste, ofertas, valoraciones, denuncias que enviaste, avisos y guardados). No incluye los mensajes que te enviaron otras personas ni los archivos que subiste. Si necesitas algo más, escríbenos y lo valoramos.
- **Ocultar tu ficha pública:** desde tu perfil.
- **Dejar de recibir correos de avisos:** desde tu perfil o con el enlace de baja del correo.
- **Eliminar tu cuenta:** desde los ajustes de tu cuenta, confirmando tu correo.

**Qué pasa cuando eliminas tu cuenta:**

1. Si tienes colaboraciones abiertas o solicitudes pendientes, primero hay que cerrarlas o cancelarlas.
2. Si nunca has tenido colaboraciones, la cuenta y sus datos se borran de inmediato, salvo lo que el apartado 6 indica que se conserva: el registro de búsquedas queda desvinculado de ti (y, sin texto, no contiene nada que te identifique) `[DEPENDE DE CAMBIO 5b]`, y se mantienen el registro de acciones del equipo de administración que te afecte y tu solicitud de baja.
3. Si has tenido colaboraciones terminadas, borrarlas del todo eliminaría también registros de la otra parte. En ese caso tu solicitud pasa a una revisión por el equipo, tu ficha pública se oculta mientras tanto y te responderemos en un plazo máximo de `[DEPENDE DE CAMBIO 6: plazo definido, no más de 1 mes]`.
4. Al resolverse, borramos o anonimizamos tus datos personales. Se conservan, sin tu nombre cuando es posible, los mensajes y el historial que forman parte de una colaboración de la otra persona, y los datos del apartado 6 que debamos guardar. `[DUDA: base legal y alcance de lo que se conserva tras la baja]`
5. Los archivos que subiste a tu perfil y a tus colaboraciones se eliminan con la cuenta. `[DEPENDE DE CAMBIO 2]`

**Escribiéndonos** a `[EMAIL_CONTACTO]` indicando qué derecho quieres ejercer. Podemos pedirte que confirmes tu identidad. Respondemos en el plazo legal de **un mes** como máximo (art. 12.3 RGPD).

Si crees que no hemos tratado bien tus datos, puedes reclamar ante la **Agencia Española de Protección de Datos** ([www.aepd.es](https://www.aepd.es)).

## 8. Denuncias y contenido ilícito `[DEPENDE DE CAMBIO 4]`

Puedes denunciar a otra persona usuaria desde la colaboración compartida. Para denunciar un perfil o un contenido fuera de una colaboración, usa el botón «Denunciar» de la ficha, o escribe a `[EMAIL_CONTACTO]`. Al revisar una denuncia tratamos los datos de quien denuncia y de la persona denunciada. A la persona denunciada no le revelamos tu identidad salvo que sea imprescindible o la ley lo exija. `[DUDA: ¿se puede garantizar el anonimato del denunciante frente al denunciado? ¿qué exige la normativa de servicios digitales?]`

## 9. Inteligencia artificial y decisiones automatizadas `[DEPENDE DE CAMBIO 0]`

Hoy CIBERAN no envía datos de personas usuarias a ningún proveedor de inteligencia artificial. Más adelante podría ofrecerse una búsqueda asistida por IA en Descubrir. Antes de activarla actualizaremos esta política, indicaremos el proveedor y qué datos recibiría, y te lo explicaremos en la propia pantalla.

## 10. Menores de edad `[DEPENDE DE CAMBIO 1]`

CIBERAN es solo para **mayores de 18 años**. Al registrarte declaras tenerlos. Si detectamos una cuenta de una persona menor de edad, la eliminamos. Si crees que un menor está usando el servicio, escríbenos.

## 11. Seguridad

Guardamos las contraseñas cifradas (hash). Cada persona solo puede leer los datos que le corresponden mediante reglas de acceso en la base de datos. Los archivos de colaboración están en un almacenamiento privado. Las acciones del equipo de administración quedan registradas. Tenemos un procedimiento interno para actuar ante una brecha de seguridad y, si afecta a tus derechos, te lo comunicaremos y lo notificaremos a la AEPD cuando la ley lo exija.

## 12. Cobros y redes sociales: funciones pendientes de activar

- **Cobros (pendiente de activar):** hoy CIBERAN **no cobra nada** ni procesa pagos. Está previsto ofrecer pagos a través de **Stripe**. Antes de activarlos actualizaremos esta política (qué datos recibe Stripe, bases legales, conservación de datos fiscales) y te pediremos que aceptes los textos nuevos.
- **Conexión con redes sociales (próximamente):** hoy CIBERAN no se conecta con tus cuentas de redes sociales ni lee datos de ellas. Si lo ofrece, será solo con tu permiso expreso y tras actualizar esta política.

## 13. Cambios en esta política

Si cambiamos algo relevante, te lo diremos dentro de la aplicación y te pediremos que aceptes la nueva versión para seguir usándola. La fecha de última actualización figura al inicio.
