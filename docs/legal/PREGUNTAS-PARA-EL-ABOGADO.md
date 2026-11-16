# Preguntas para el abogado

> Documento para la revisión. Recoge todas las `[DUDA]` de los borradores, en dos bloques: **Críticas** (cambian el resultado o bloquean el lanzamiento) y **Resto**. La numeración es estable, por si otros documentos la citan. No contiene cifras que no figuren en el código o que no estén marcadas como propuesta, ni afirmaciones que la app no cumpla hoy.

**Contexto en una línea:** CIBERAN es un marketplace gratuito (lanzamiento) donde creadores y marcas se encuentran, negocian y gestionan colaboraciones. El titular es una persona física, sin alta de autónomo ni sociedad. No hay cobros, ni IA en Discover, ni Sentry, ni métricas de redes. La base de datos de Supabase es una sola, compartida. Dominio previsto: ciberan.com (pendiente de registrar).

Documentos: [Aviso legal](01-AVISO-LEGAL.md) · [Privacidad](02-POLITICA-DE-PRIVACIDAD.md) · [Cookies](03-POLITICA-DE-COOKIES.md) · [Términos](04-TERMINOS-Y-CONDICIONES.md) · [Registro de actividades](internos/REGISTRO-ACTIVIDADES-TRATAMIENTO.md) · [Procedimiento de brechas](internos/PROCEDIMIENTO-BRECHA-SEGURIDAD.md) · [Discrepancias y cambios de código](PASO2-DISCREPANCIAS.md)

---

# Bloque 1 · Críticas

**1. Titular persona física frente a sociedad.**
- El titular responde con su patrimonio personal. ¿Es recomendable constituir una sociedad antes de abrir al público, o se puede lanzar como persona física con las cláusulas actuales?
- Aunque el servicio es gratuito y no hay ingresos, ¿hay obligación de alta como autónomo o de alta censal? ¿Cambia con publicidad, comisiones o pagos futuros?
- ¿Qué debe constar en el aviso legal (art. 10 LSSI) para una persona física?

**2. Responsabilidad por el contenido y por los acuerdos entre marcas y creadores.**
- ¿La redacción de CIBERAN como «plataforma intermediaria» (términos §2, §5, §12) basta para quedar amparado como prestador de servicios de intermediación (alojamiento de datos)? ¿Qué condiciones de «conocimiento efectivo» y retirada diligente exige la normativa?
- ¿Qué cláusulas de limitación de responsabilidad son válidas siendo persona física, y qué ocurre con los usuarios consumidores?
- ¿Tiene el registro de ofertas, condiciones y entregables en la app valor contractual entre las partes? ¿Conviene decirlo expresamente o evitarlo?

**3. Edad mínima.**
- ¿Basta una declaración de mayoría de edad con casilla (cambio 1), o hace falta algo más reforzado?
- ¿Qué se hace con las cuentas ya creadas? (Se propone que lo acepten en el aviso bloqueante subiendo la versión de términos.)

**4. Perfil público por defecto.** Hoy cada cuenta nueva tiene la ficha visible sin sesión salvo que la desactive (`default true`). ¿Es aceptable (protección de datos por defecto, art. 25 RGPD), o debe ser opt-in? Se recomienda además `noindex` (cambio 7).

**6. Conservación tras la baja.**
- Se conservan los mensajes y el historial de colaboración que forman parte de la otra parte, sin vínculo directo al nombre (`sender_id` pasa a nulo). ¿Qué base legal respalda conservarlos, y es suficiente la anonimización?
- ¿Qué sigue siendo dato personal cuando el texto del mensaje identifica a la persona?

**9. Imágenes en un almacenamiento de URL pública.** Las fotos, portadas e imágenes de publicaciones están en un bucket público. ¿Es aceptable avisando al usuario, o debe pasar a privado con URL firmadas?

**20. Normativa de servicios digitales.** ¿Qué obligaciones tiene el titular como prestador de alojamiento (punto de contacto, mecanismo de notificación y acción, motivación de las sanciones)? ¿Cuáles se aplican siendo persona física o microempresa?

---

# Bloque 2 · Resto

## Datos personales (RGPD, LOPDGD)

**5. Bases legales.** Se han asignado: contrato para cuenta, perfil y colaboraciones; interés legítimo para resumen por correo, seguridad, estadísticas de búsquedas y auditoría; obligación legal para denuncias y atención de derechos. ¿Algún ajuste?

**7. Plazos de conservación propuestos.** No son decisión tomada; ver la tabla del apartado F.

**8. Acceso técnico a los mensajes.** El panel de administración no muestra mensajes, pero quien administra la base de datos podría leerlos. ¿Cómo se debe describir y limitar ese acceso?

**10. Anonimato del denunciante y comunicación de sanciones.** ¿Se puede garantizar el anonimato frente a la persona denunciada? ¿Qué debe comunicarse a quien sufre una sanción (motivo, recurso, plazo)? Los términos §8 incluyen una frase provisional de revisión a petición por correo, pendiente de confirmar (plazo y si debe revisarla otra persona).

**11. Registro de actividades (art. 30).** ¿Se confirma que es obligatorio para este tratamiento (no ocasional)? ¿Es necesario DPD o evaluación de impacto a esta escala? Se estima que no.

**12. Atención de derechos.**
- Respuesta máxima de un mes. ¿Qué identificación pedir?
- La exportación automática no incluye mensajes recibidos ni archivos subidos. ¿Debe incluirlos, o basta con ofrecerlos bajo petición?
- ¿Qué se conserva y con qué base cuando se acepta una baja con historial?

**13. Brechas.** ¿Procede notificar a otra autoridad además de la AEPD? ¿Conviene tener asesoría de guardia?

**28. Registro de búsquedas (cambio 5b).** Hoy el texto de las búsquedas sobrevive al borrado de la cuenta. Se propone dejar de guardarlo y conservar solo filtros y recuento, con borrado a los 12 meses. ¿Es suficiente para considerar el registro anónimo tras la baja?

## Encargados y transferencias internacionales

**14. Región de Supabase y proveedor de alojamiento:** pendientes de decidir. Según el resultado, ¿qué garantías hay que citar?

**15. Acuerdos de encargado de tratamiento (art. 28)** con Supabase, Google (SMTP), hosting e IONOS. ¿Basta con los términos del proveedor?

**16. Remitente de correo: Google (Gmail personal) en EE. UU.** Hoy los correos de registro, recuperación y avisos salen de `info.ciberan@gmail.com` con contraseña de aplicación.
- ¿Qué garantía citar para la transferencia a EE. UU. (marco de privacidad UE-EE. UU. con confirmación de la certificación, o cláusulas tipo)?
- **Recomendación (técnica, a validar por el abogado):** dejar de usar el Gmail personal como servidor de envío y pasar a un **servicio de correo transaccional con región UE** (por ejemplo, Brevo, o Amazon SES o Resend en una región de la UE; verificar condiciones y acuerdo de encargado de cada uno), con SPF y DKIM sobre el dominio propio (`ciberan.com`, cuando se registre). Se usaría tanto para los avisos de la app como para Supabase Auth.
  - **Por qué:** acuerdo de encargado estándar, datos en la UE, límites de envío adecuados (Gmail limita los envíos y puede bloquear la cuenta), y se evita depender de una cuenta personal con una contraseña de aplicación.
  - **Alternativa aceptable:** **Google Workspace con el dominio propio** (buzón `info@ciberan.com`) y su acuerdo de tratamiento de datos. Sigue siendo Google y puede implicar transferencias a EE. UU., pero formaliza la relación y deja un buzón profesional.
  - **Combinación razonable:** transaccional UE para los envíos automáticos y un buzón con dominio propio como dirección de contacto (`[EMAIL_CONTACTO]`).
  - **Dependencia:** requiere registrar el dominio primero. Hasta entonces, el Gmail actual sirve como solución provisional y los textos deben decirlo.

**17. IONOS:** confirmar la entidad contratante y si interviene solo como registrador/DNS o también como alojamiento.

## Cookies y almacenamiento

**18.** ¿La cookie `ciberan-rail-collapsed` (menú plegado, 1 año) se considera técnica y exenta? Si no, se puede pasar a `localStorage` con vida más corta o pedir consentimiento.

**19.** Confirmar que, con solo cookies técnicas, no hace falta banner (conclusión provisional en [la política de cookies](03-POLITICA-DE-COOKIES.md) §3).

## Consumidores, pagos y funciones futuras

**21. Consumidores y profesionales.** Las marcas son profesionales; los creadores pueden ser consumidores o profesionales. ¿Qué cláusulas obligatorias aplican con un servicio gratuito?

**22. Cuando se activen pagos.** ¿Qué hace falta: desistimiento y reembolsos, facturación, condiciones de Stripe Connect, retención de fondos, información precontractual, nueva aceptación de términos?

**23. Cuando se active IA o conexión con redes.** ¿Qué evaluación previa (por ejemplo, de impacto, proveedores fuera de la UE, entrenamiento con datos) y qué textos?

**24. Aceptación de cambios.** ¿Es válida la aceptación mediante aviso bloqueante en la app? ¿Cómo debe comunicarse un cambio que perjudica al usuario?

**25. Marca «verificado».** Hoy el equipo la concede (`verified_at`). ¿Qué criterio publicar para que no induzca a error?

**26. Licencia de contenido.** ¿Qué alcance debe tener la licencia a CIBERAN (incluidas las vistas previas al compartir una ficha)?

**27. Jurisdicción:** ¿qué juzgados indicar?

---

## F. Plazos de conservación: propuestas, a confirmar con el abogado

| Dato | Plazo propuesto | Razón | Estado en la app |
|---|---|---|---|
| Registro de búsquedas (`discovery_searches`): solo filtros y recuento | Se desvincula de la persona al borrar la cuenta; se borra a los 12 meses | Estadísticas; sin necesidad de más | El texto se guarda hoy y sobrevive a la baja (cambio 5b); sin purga (cambio 5) |
| Avisos (`notifications`) | 12 meses | Utilidad del historial | Sin purga hoy (cambio 5) |
| Denuncias (`reports`) | 3 años desde el cierre | Defensa ante reclamaciones | Sin purga hoy (cambio 5) |
| Solicitudes de borrado y de derechos | 3 años desde la resolución | Demostrar que se atendieron | Sin purga hoy (cambio 5) |
| Registro de acciones de administración | 2 años | Auditoría interna | Sin purga hoy (cambio 5) |
| Mensajes y colaboraciones con la otra parte | Mientras la otra parte mantenga su cuenta | La otra parte los necesita | Se conservan sin plazo |
| Registros del hosting; copias de seguridad | **Sin propuesta**: depende del proveedor y del plan | — | — |
| Datos fiscales y de pagos | No aplica hasta que se activen pagos | — | — |

## G. Verificaciones técnicas pendientes (mías, no del abogado)

Antes de publicar hay que comprobar en la aplicación real lo que los borradores afirman:

1. **Cookies y almacenamiento reales:** abrir el navegador (pestaña Aplicación) y confirmar nombres, duraciones y que Supabase no usa `localStorage`.
2. **Tipografías:** comprobar en un build que no se piden recursos a Google Fonts.
3. **Imágenes de terceros:** tras el cambio 3, comprobar en la pestaña Red que no se pide nada a Unsplash.
4. **Qué se muestra en la ficha pública:** el servidor devuelve además un bloque de «contenido» (publicaciones); confirmar cuáles se ven sin sesión.
5. **Borrado de cuenta:** qué ocurre con conversaciones y mensajes (`sender_id` nulo; ¿qué ve la otra parte?) y con los archivos de Storage. Probar solo con cuentas de prueba.
6. **Verificación de correo al alta:** confirmar en el panel de Supabase que está activada.
7. **IP en registros:** confirmar si Supabase Auth y el hosting registran IP y por cuánto tiempo.
8. **Región de Supabase y alojamiento**, y acuerdos de encargado.
9. **Interruptor de IA y Sentry:** confirmar en producción que no hay `OPENROUTER_API_KEY` ni `SENTRY_DSN` hasta que se hagan los cambios correspondientes.
10. **Tablas de redes sociales:** confirmar que `social_accounts` y `metrics` están vacías.
11. **Registro de búsquedas:** tras el cambio 5b, confirmar que `query_text` ya no se guarda, y decidir (con permiso expreso) si se vacían los textos de las filas de prueba.

## H. Qué no hemos incluido a propósito

- Ninguna referencia a «empresa», razón social ni Registro Mercantil.
- Ninguna afirmación de que hoy se cobre, se renueven suscripciones o se prediga rendimiento.
- Nada sobre cláusulas de tienda online (devoluciones, desistimiento, garantía) hasta que haya pagos.
- Ninguna cifra de conservación que no esté marcada como propuesta.
