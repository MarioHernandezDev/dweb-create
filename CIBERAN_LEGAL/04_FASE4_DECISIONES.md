# CIBERAN — Fase 4: cierre de decisiones previas a la redacción

**Inicio:** 24-nov-2026 · **Estado:** DECISIONES PRINCIPALES CERRADAS (quedan abiertas las de §4) · **Base:** `03_FASE3_MAPA_RIESGOS_CUMPLIMIENTO.md` (v0.3) y fases 1–2.
**Reglas:** no se modifica código ni base de datos; no se redactan documentos definitivos (Fase 5); las decisiones las toman los fundadores, yo solo las planteo y las registro.

**Situación de partida (declarada por los fundadores):** dos fundadores con intención de 50/50; sin sociedad y sin alta de autónomo; **app no desplegada** (solo la landing en `ciberan.com`, alojada en Netlify; despliegue de la app **pendiente de verificación residual** en Netlify/Supabase); partners = empresas, marcas, agencias y profesionales en su actividad; creadores profesionales o aficionados, **solo mayores de 18**; pagos, comisiones, suscripciones, IA e integraciones sociales **apagados**.

---

## 1. Clasificación de lo pendiente

### 1.1 Decisiones que podemos tomar nosotros (los fundadores)
| ID | Decisión | Naturaleza | Estado |
|---|---|---|---|
| D01 | Quién figura como titular/prestador en aviso legal y privacidad (landing ahora, app al abrir) | OLC (identificar) + decisión | **CERRADA** (24-nov) |
| D02 | Punto de contacto único y reparto de tareas entre corresponsables (art. 26 RGPD) | OLC (acuerdo) + decisión | **CERRADA** (correo: ver D07) |
| D03 | Estructura y calendario: SL antes de abrir/cobrar vs autónomo puente; fecha límite | REC + ASE | **CERRADA con disparador** (24-nov); fecha no definida |
| D04 | Contenido mínimo del acuerdo de fundadores (reparto, decisiones y desbloqueo, salida, confidencialidad) | REC fuerte + ASE (redacción) | **Parcial**: desbloqueo (D04a) y salida (D04b) cerrados; faltan ámbitos y confidencialidad |
| D05 | Cesión de propiedad intelectual: alcance, a quién, repositorio/organización, identidades de git | OLC (cesión escrita) + decisión | **Forma cerrada**; faltan repositorio e identidades de git |
| D06 | Dominio, marca y cuentas: quién es titular y administradores | REC | **CERRADA** (D06a y D06b, 24-nov) |
| D07 | Correo de contacto/transaccional: Gmail actual o dominio propio | REC | **CERRADA** (24-nov) |
| D08 | Control de partner (niveles L0–L4) y acceso gradual | IJR/REC | **CERRADA** (24-nov) |
| D09 | Política de edad: solo ≥ 18 con declaración | IJR/REC | **CERRADA** (24-nov) |
| D10 | Campo opcional de «alta como autónomo» en creadores | REC | **CERRADA** (24-nov) |
| D11 | Regla de acceso del equipo a mensajes y archivos | IJR + ASE | **CERRADA** como regla (24-nov); texto: ASE |
| D12 | Plazos de conservación por categoría de datos | OLC (principio) + decisión de plazos | **Enfoque cerrado**; cifras = propuesta a validar |
| D13 | Almacenamiento local: mover a base de datos o banner | IJR | **CERRADA** (24-nov) |
| D14 | Canal DSA: punto de contacto, notificaciones y plazos de respuesta | OLC | **CERRADA** (24-nov) |
| D15 | Entorno: copias y proyecto de producción separado como condición de apertura | IJR | **CERRADA** (24-nov) |
| D16 | Hitos de entrada a la monetización (qué debe estar hecho antes de cobrar) | REC | **CERRADA** (24-nov) |
| D17 | Papel de CIBERAN en la contratación entre creador y partner | OLC/IJR + ASE | **CERRADA** (24-nov, con matices) |
| D18 | Derechos de uso por defecto en las colaboraciones | OLC (forma) + IJR + ASE | **CERRADA** (24-nov, con matices) |
| D19 | Ley aplicable, foro y negociación previa | OLC/IJR + ASE | **CERRADA** (24-nov, con una corrección de redacción) |

### 1.2 Datos que debemos comprobar (hechos, no decisiones)
| ID | Qué comprobar | Quién puede | Estado |
|---|---|---|---|
| V01 | Sitios y **despliegues de rama/previews** en Netlify; si alguno expone la app | Fundadores (acceso al panel) | Pendiente |
| V02 | **Registro de nuevos usuarios** en Supabase Auth y URL de redirección configuradas | Fundadores | Pendiente |
| V03 | **Titular del dominio** `.com` y `.es` y registrador (cuenta que lo gestiona) | Fundadores | **Parcial**: `.com` a nombre de Alejandro (declarado 24-nov); `.es` y registrador sin confirmar |
| V04 | Disponibilidad y registro de la **marca CIBERAN** (OEPM/EUIPO) | Fundadores o asesor | Pendiente |
| V05 | Función del script `/.netlify/scripts/hud` en la landing | Fundadores (Netlify) | Pendiente |
| V06 | Flujo completo de cookies de la landing (aceptar, rechazar, retirar) | Fundadores o yo con navegador | Pendiente |
| V07 | Disponibilidad de **DPA** de Netlify, Supabase, Google y Sentry (descargar y archivar) | Fundadores | Pendiente |
| V08 | Quién administra GitHub, Netlify, Supabase y el correo; permisos de cada uno | Fundadores | Pendiente |
| V09 | Si Sentry se activará y en qué región | Fundadores | Pendiente |

### 1.3 Cuestiones que necesitan asesoramiento profesional
Acuerdo de fundadores y estatutos (redacción y desbloqueo 50/50) · cesión de PI y autoría con IA · estructura y fiscalidad (autónomo, CB/SC, SL), aportación de activos intangibles y alta/RETA · **Stripe Connect y PSD2** · modelo de facturación, IVA e IRPF · **DAC7** · calendario de factura electrónica/Verifactu · trabajo de menores de 16–17 años (excluido por la política de ≥ 18) · limitación de responsabilidad frente a consumidores · política de acceso a mensajes (secreto de comunicaciones) · régimen sancionador del DSA · AI Act · habitualidad y alta de creadores aficionados · condiciones de colaboración con posible partner autónomo en uso mixto.

### 1.4 Cuestiones que pueden esperar
| Hasta | Cuestiones |
|---|---|
| **Monetización (Fase C)** | PSD2/Stripe Connect, comisión del 10 %, facturación, IVA/IRPF, DAC7, suscripción PRO, desistimiento, reembolsos y contracargos, cuenta de Stripe a nombre de la SL |
| **Nuevas funciones (Fase D)** | IA (proveedor con DPA, transparencia, EIPD), integración de redes sociales, cuentas de equipo para marcas, partners de otros países de la UE, aviso para creadores ≥ umbral del RD 444/2024 |

---

## 2. Registro de decisiones adoptadas

*(Se rellena conforme los fundadores responden. Cada entrada: decisión, justificación, consecuencias jurídicas y técnicas, tareas, responsable y fecha límite.)*

### D01 — Titular/prestador y responsables (CERRADA, 24-nov-2026)
- **Decisión:** **ambos fundadores** figuran como titulares en el aviso legal y como **corresponsables** en la política de privacidad, tanto en la landing como en la app, hasta que exista una SL (que entonces los sustituirá).
- **Justificación:** refleja los hechos (decidís los dos) y cumple la obligación de identificar al prestador (LSSI art. 10 [B]) y al responsable (RGPD art. 13.1.a [A]); evita que la política sea inexacta. **Tipo:** la identificación es OLC; la elección de nombrar a ambos es IJR/REC.
- **Consecuencias jurídicas:** responsabilidad personal de ambos; cada interesado puede ejercer derechos frente a cada uno (RGPD 26.3 [A]); hay que redactar el **acuerdo del art. 26** y poner a disposición sus aspectos esenciales (26.2 [A]); se publica la identidad y el domicilio de los dos (la opción de usar un domicilio distinto del particular **no está verificada**: ASE).
- **Consecuencias técnicas:** actualizar `app/utils/legal.ts` (hoy con huecos) y la landing (`feat/pronto`) cuando se redacte; **no se toca código en esta fase**.
- **Tareas:** (1) recoger nombre completo, NIF y domicilio de **ambos** para los textos [datos que deben aportar ellos]; (2) corregir la landing; (3) redactar el acuerdo del art. 26 (D02).
- **Responsable:** ambos fundadores. **Momento límite:** antes de abrir la app; la landing, en cuanto se redacte la Fase 5.


### D02 — Contacto único entre corresponsables (modelo cerrado, 24-nov-2026)
- **Decisión:** **un buzón único de privacidad/derechos, con un responsable de respuesta y un suplente** entre los dos fundadores. **Responsable de respuesta: Alejandro. Suplente: Mario.** Correo: ver D07.
- **Justificación:** da una cara clara a los usuarios y facilita cumplir el plazo de un mes (RGPD 12.3 [A]), prorrogable dos meses con aviso. **Tipo:** el acuerdo entre corresponsables es OLC (art. 26.1 [A]); el punto de contacto único es opcional por la norma y es REC.
- **Consecuencias jurídicas:** el acuerdo debe describir el reparto y se publica en lo esencial; **no limita** el derecho del usuario a dirigirse a cualquiera de los dos (art. 26.3 [A]).
- **Consecuencias técnicas:** procedimiento y registro de solicitudes (inventario/registro de derechos); el buzón debe existir antes de abrir la app.
- **Tareas:** redactar el acuerdo del art. 26 y el procedimiento de derechos (Fase 5); crear el registro de solicitudes.
- **Responsable / límite:** ambos; antes de abrir la app.

### D07 — Correo de contacto y de envío (CERRADA, 24-nov-2026)
- **Decisión:** se **mantiene `info.ciberan@gmail.com` solo para la landing** y se **migra a correo con dominio propio y proveedor de envío con contrato de encargo antes de abrir la app**.
- **Justificación:** una cuenta Gmail personal no está pensada para tratar datos de usuarios con contrato de encargo (art. 28 RGPD [D]), tiene límites de envío y riesgo de suspensión (art. 32 [A]: disponibilidad y resiliencia). **Tipo:** IJR/REC (no hay prohibición expresa).
- **Consecuencias jurídicas:** el proveedor de envío debe figurar en la política de privacidad y en el registro de proveedores, con su DPA archivado.
- **Consecuencias técnicas:** configurar SMTP/proveedor y plantillas de Supabase Auth con el nuevo remitente; buzón de privacidad con el dominio (D02). **No se hace en esta fase.**
- **Tareas:** elegir proveedor (coste no verificado); crear buzones (privacidad, soporte, contacto DSA); actualizar textos legales con la nueva dirección.
- **Responsable:** Alejandro (técnico) con Mario. **Límite:** antes de abrir la app.

### D03 — Estructura y calendario (CERRADA con disparador, 24-nov-2026)
- **Decisión:** **la SL será obligatoria antes del primer cobro** (disparador). **No se fija fecha** para constituirla: los fundadores no saben cuánto tiempo estarán sin ingresos y necesitan financiar asesores. Hasta entonces, **apertura gradual: lista de espera en la landing y oleadas de cohortes crecientes**, ampliando el cupo según se cierren documentos y se disponga de fondos para asesores. **No se descartan** abrir el registro público sin SL ni constituirla antes: queda como decisión revisable.
- **Justificación:** cerrar el acceso no genera la visibilidad que un marketplace necesita; limitar la escala reduce la exposición personal de los dos fundadores (D01) sin gasto inmediato. **Tipo:** decisión empresarial y de riesgo (REC); **no hay obligación legal de tener SL ni de limitar el acceso**. Los requisitos legales (privacidad, términos, canal DSA, seguridad) **son los mismos con 10 o con 10.000 usuarios**.
- **Consecuencias jurídicas:** hasta la SL, los dos responden **personalmente** de la web y sus tratamientos (D01) y de las reclamaciones de usuarios; la prueba de la intención 50/50 depende del **acuerdo de fundadores y de la cesión de PI** (D04, D05), que pasan a ser **imprescindibles antes de captar usuarios**. Sanciones por incumplimiento de RGPD/LSSI **recaen en personas físicas**. **ASE:** estructura fiscal exacta, alta/RETA y si hay obligación de alta aun sin ingresos (§15 de la Fase 3).
- **Consecuencias técnicas:** la **lista de espera** requiere un **formulario en la landing**: hoy la política dice «no hay formularios». Habrá que actualizar la política de privacidad (finalidad, base legal consentimiento, plazo, proveedor del formulario como encargado) y decidir **dónde se guardan** los correos. **No se hace en esta fase.** La app debe permitir **cupos/invitaciones** por cohorte (requisito de producto a evaluar con el equipo técnico).
- **Tareas:** (1) acuerdo de fundadores y cesión de PI **antes de la primera cohorte**; (2) rediseñar la landing con lista de espera tras la Fase 5; (3) definir el tamaño de la primera cohorte y los hitos para ampliar; (4) buscar asesor (abogado mercantil + gestor) con presupuesto; (5) **revisar esta decisión** cuando haya fondos o se acerque el primer cobro.
- **Responsable:** ambos. **Límite:** SL **antes del primer cobro**; documentos básicos **antes de la primera cohorte**.

### D04a — Desbloqueo en un reparto 50/50 (CERRADA como principio, 24-nov-2026)
- **Decisión:** **ámbitos de decisión + mediación**: cada fundador decide en su ámbito (los ámbitos están **por definir**); las decisiones clave (precio y comisión, endeudamiento, entrada o salida de socios, venta, y cualquier cambio que afecte a datos personales o a pagos) **exigen el acuerdo de los dos**; ante un bloqueo, **mediación previa con un tercero de confianza** (a designar) y, si falla, salida pactada.
- **Justificación:** equilibra rapidez operativa con protección del 50/50 y evita que la decisión de un fundador comprometa los datos o el dinero. **Tipo:** REC preventiva fuerte; la redacción exacta, **ASE (abogado mercantil)**.
- **Consecuencias jurídicas:** debe plasmarse en el **acuerdo de fundadores** ahora y en **estatutos y pacto de socios** al constituir la SL (las mayorías reforzadas y el desbloqueo deben constar en estatutos para ser oponibles; **a verificar con el abogado**).
- **Consecuencias técnicas:** controles de acceso: cambios en datos, pagos y administración requieren las dos cuentas con permisos (D06, D15).
- **Tareas:** definir los ámbitos de cada fundador; elegir mediador de confianza; abogado redacta.
- **Responsable:** ambos. **Límite:** antes de la primera cohorte de usuarios.

### D04b — Salida de un fundador (CERRADA como principio, 24-nov-2026)
- **Decisión:** **consolidación gradual (vesting) del 50 % de cada fundador, reconociendo desde el primer día lo ya aportado** (código, diseño, trabajo) y **reglas de salida pactadas**: quien se va conserva lo consolidado y la parte no consolidada puede recomprarse. **Porcentajes, plazos, valoración y supuestos de «salida buena/mala» los fija el abogado**; no se dan por cerrados.
- **Justificación:** sin regla escrita, la salida de uno antes de constituir la SL se resuelve por la vía de la comunidad de bienes o la sociedad civil de hecho (CC, [D]), con riesgo de bloqueo. **Tipo:** REC preventiva fuerte; **ASE**.
- **Consecuencias jurídicas:** debe ir en el acuerdo de fundadores y trasladarse a estatutos y pacto de socios. La consolidación **no puede aplicarse a lo ya cedido por escrito** (D05) sin pactarlo expresamente.
- **Tareas:** definir con el abogado: periodo y calendario, hito de consolidación inmediata (lo ya aportado), valoración de recompra, no competencia y confidencialidad.
- **Responsable:** ambos + abogado. **Límite:** antes de la primera cohorte.

### D05 — Propiedad intelectual mientras no hay SL (forma CERRADA, 24-nov-2026)
- **Decisión:** **copropiedad 50/50 a efectos del proyecto**: cada fundador cede al otro la mitad indivisa de lo creado para CIBERAN (código, diseño, textos, documentación), con **compromiso de aportarlo a la SL cuando exista**. La cesión debe incluir de forma explícita lo creado **con ayuda de IA** y lo hecho **bajo otras identidades de git** (los cuatro nombres corresponden a dos personas). **Alcance, duración y territorio** los define el abogado.
- **Justificación:** la cesión escrita con alcance, tiempo y territorio es **obligación legal** para que sea válida (TRLPI arts. 43 y 45 [B]); sin ella el autor conserva el derecho exclusivo (art. 17 [A]) y ninguno podría aportar a la SL sin el otro. La elección de copropiedad cruzada es REC.
- **Consecuencias jurídicas:** ambos podrán usar y explotar; los actos de disposición relevantes requieren acuerdo (coherente con D04a); al constituir la SL, aportación o cesión formal (con posible tributación de la aportación: **ASE fiscal**). **Autoría y protección del código generado por IA: ASE**, no verificada.
- **Consecuencias técnicas:** inventario de activos (repositorio, assets, diseño, manuales) y **trasladar el repositorio a una organización de GitHub** donde ambos tengan permisos de escritura (hoy el remoto está bajo una cuenta personal) — **decisión de D06**; opcional: unificar identidades de git (`.mailmap`, no reescribe historia) con consentimiento. **No se toca nada en esta fase.**
- **Tareas:** inventario de activos; redacción de la cesión (abogado); decidir repositorio y cuentas (D06).
- **Responsable:** ambos + abogado. **Límite:** antes de la primera cohorte de usuarios.

### D06a — Dominio y cuentas críticas (CERRADA, 24-nov-2026)
- **Decisión:** el **dominio** `ciberan.com` sigue **a nombre de Alejandro**, con un **documento firmado** que declare que lo tiene **por cuenta de ambos** y que **se cederá a la SL** cuando exista. Para el resto de cuentas críticas (**GitHub, Netlify, Supabase, registrador, correo**) se crean **organizaciones o equipos con los dos como administradores**.
- **Justificación:** un dominio solo puede tener un titular, pero el control no debe depender de una sola persona; refleja el 50/50 y da continuidad. **Tipo:** REC preventiva fuerte; el texto del documento, ASE.
- **Consecuencias jurídicas:** el documento es prueba de la intención y evita que el titular registral alegue titularidad exclusiva; al constituir la SL, transmisión formal.
- **Consecuencias técnicas:** mover el **repositorio** a una organización de GitHub con permisos de escritura para ambos (hoy está bajo una cuenta personal); crear equipo en Netlify y organización en Supabase (verificar qué permite el plan); **doble factor** y recuperación en todas las cuentas; **no se hace en esta fase**.
- **Tareas:** (1) redactar y firmar la declaración de tenencia del dominio; (2) inventario de cuentas (V08); (3) migrar a organizaciones; (4) confirmar titular del `.es` y registrador (V03).
- **Responsable:** ambos. **Límite:** antes de la primera cohorte de usuarios.

### D06b — Marca CIBERAN (CERRADA, 24-nov-2026)
- **Decisión:** **comprobar ahora la disponibilidad** (búsqueda en la OEPM) y, si está libre, **solicitar la marca a nombre de ambos fundadores antes de lanzar la lista de espera**, para cederla a la SL cuando exista. **Clases, alcance y estrategia (OEPM o EUIPO)** los afina un abogado.
- **Justificación:** protege el nombre antes de generar visibilidad; la solicitud da prioridad desde su presentación [D]. **Tipo:** REC preventiva/empresarial; **no es obligación legal**. Las **tasas oficiales no están verificadas**.
- **Consecuencias jurídicas:** cotitularidad de ambos hasta la cesión a la SL; coherencia con la declaración de la landing, que hoy afirma titularidad individual de nombre y logotipo (se corregirá en Fase 5).
- **Tareas:** (1) búsqueda de anterioridades (V04); (2) elegir clases; (3) presentar solicitud; (4) cesión posterior a la SL.
- **Responsable:** ambos + abogado/gestor. **Límite:** **antes de lanzar la lista de espera**.

### D08 — Control de «Partner = consumidor» (CERRADA, 24-nov-2026)
- **Decisión:** se adopta el paquete **L0 + L1 + L3 + acceso gradual**: (L0) **declaración expresa** al registrarse como partner («actúo en el ejercicio de mi actividad económica y no contrato para fines exclusivamente personales»), con **versión y fecha** guardadas; (L1) **datos mínimos de empresa** (tipo, razón social o nombre profesional, **NIF/CIF** o equivalente UE) con comprobación de **formato**; (L3) **revisión manual** del equipo con la marca de «verificado» y una **cola de señales de alerta**; **acceso gradual**: un partner sin declarar puede explorar, pero **no enviar propuestas ni aceptar condiciones**. VIES (L2) y documento justificativo (L4) **solo si hay sospecha**.
- **Justificación:** la declaración no es concluyente (la ley atiende al propósito real, TRLGDCU 3.1 y 4 [A]), pero acredita buena fe, informa al creador y justifica la baja; la revisión manual reduce la entrada de consumidores sin pedir documentos a todos. **Tipo:** IJR/REC; no hay obligación legal de verificar.
- **Consecuencias jurídicas:** si entra un consumidor, la relación creador–partner puede quedar sujeta a derecho de consumo (desistimiento 14 días, cláusulas abusivas) y entran P2B y DSA art. 30 para esa operación; se aplica el protocolo de baja y aviso al creador (Fase 3 §14.3). **Uso mixto de un autónomo: ASE.** Nueva categoría de datos: **identificadores fiscales** (minimizar y reflejar en registro y privacidad; R84).
- **Consecuencias técnicas** (a planificar, **no hacer ahora**): campos de tipo de entidad, identificador fiscal, declaración (versión+fecha) y estado de verificación en partners; **bloqueo de «enviar propuesta»** hasta completar el alta; **cola de revisión** en el panel de administración; reflejarlo en el registro de actividades y en la política de conservación.
- **Tareas:** (1) especificar campos y flujo para el equipo técnico; (2) definir señales de alerta y SLA de revisión; (3) redactar declaración y cláusulas (Fase 5); (4) decidir cuándo se revisa (cada alta o muestreo).
- **Responsable:** Alejandro (técnico) y Mario (negocio). **Límite:** antes de abrir el alta de partners a la primera cohorte.

### D09 — Política de edad (CERRADA, 24-nov-2026)
- **Decisión:** acceso **solo a mayores de 18 años** mediante **casilla de declaración de mayoría de edad al registrarse** (con **versión y fecha** guardadas), **cláusula en los términos** y **retirada de las cuentas de menores detectados**. **No se recoge fecha de nacimiento.**
- **Justificación:** una empresa puede decidir a quién presta el servicio; **no hay una obligación legal general de verificación fuerte** de edad para un servicio de este tipo (interpretación razonable, **a validar por asesor**). Un contrato con un menor es **anulable** (CC art. 1263, lectura secundaria [C]) y el trabajo publicitario de menores tiene reglas laborales propias (**ASE**, no verificado). Evitar la fecha de nacimiento minimiza datos (RGPD 5.1.c [D]).
- **Consecuencias jurídicas:** la declaración no impide que un menor mienta, pero prueba buena fe y justifica la baja; la política de privacidad y los términos dicen «mayores de 18».
- **Consecuencias técnicas** (a planificar): casilla obligatoria en alta de creador y de partner con versión/fecha, procedimiento interno de baja de menores, y texto en la landing/lista de espera (si se capta el correo, la edad se declara en la propia casilla).
- **Tareas:** redactar casilla y cláusula (Fase 5); protocolo de baja; incluir en el registro de actividades.
- **Responsable:** ambos. **Límite:** antes de la primera cohorte.

### D10 — Creadores aficionados y alta como autónomo (CERRADA, 24-nov-2026; fiscal sigue abierto)
- **Decisión:** **no se recoge el estado de alta** en el registro; se añade un **aviso informativo neutro, sin promesas**, en el alta de creador y en el primer cobro; la **identificación fiscal se pedirá solo al activar la monetización**.
- **Justificación:** CIBERAN no es asesor fiscal y no debe decir que no hace falta alta; las fuentes (secundarias) hablan de habitualidad y presunción al superar el SMI sin una regla verificada; recoger el dato sin necesidad exige justificarlo (minimización). **Tipo:** REC. **La obligación de alta de cada creador queda como ASE fiscal** (R81, sin cerrar).
- **Consecuencias jurídicas:** CIBERAN no afirma ni niega obligación; los términos mantienen que cada parte responde de sus obligaciones fiscales. Antes de cobrar habrá que resolver identificación fiscal, DAC7 y facturación (Fase C).
- **Consecuencias técnicas** (a planificar): texto de aviso en alta de creador; sin campos nuevos hoy.
- **Tareas:** redactar aviso neutro (Fase 5); consultar al asesor la habitualidad y alta de aficionados; decidir identificación fiscal en monetización.
- **Responsable:** ambos + asesor fiscal. **Límite:** aviso antes de la primera cohorte; resto antes de cobrar.

### D11 — Acceso del equipo a mensajes y archivos (CERRADA como regla, 24-nov-2026)
- **Decisión:** el equipo **solo accede a la conversación o archivos concretos** cuando haya **un reporte de un usuario o un requerimiento legal** como motivo, con **registro de quién, cuándo y por qué** (el panel ya tiene `admin_audit_log`; hay que comprobar que registra lecturas de contenido). **Se informará en la política de privacidad.** Nunca acceso general «de soporte».
- **Justificación:** el secreto de las comunicaciones (CE art. 18.3 [D]) y los principios de licitud, minimización y transparencia del RGPD (art. 5 [A]) hacen difícil de defender un acceso general sin motivo; el reporte es además la vía del DSA (art. 16 [A]). **Tipo:** IJR; **el texto exacto, ASE**.
- **Consecuencias jurídicas:** debe describirse en privacidad (finalidad: moderación, seguridad, cumplimiento legal) y en los términos; el acceso por requerimiento judicial o de autoridad se atiende con verificación de legitimidad.
- **Consecuencias técnicas** (a verificar, no cambiar ahora): que el panel limite el acceso al contenido a reportes y registre cada lectura; **acceso con cuentas personales** (no la contraseña compartida `ADMIN_PASSWORD`).
- **Tareas:** (1) redactar el protocolo interno; (2) comprobar que el registro de acceso a contenido existe; (3) recogerlo en la privacidad.
- **Responsable:** ambos. **Límite:** antes de la primera cohorte.

### D12 — Plazos de conservación (enfoque CERRADO; cifras PROPUESTAS, 24-nov-2026)
- **Decisión:** **plazos cortos por defecto** en lo no necesario, y conservación más larga **solo mientras sirva de defensa o lo exija la ley**; al eliminar la cuenta, borrado o anonimización con **bloqueo** de lo exigido (LOPDGDD art. 32 [B]). **Las cifras de la tabla son una propuesta mía (REC), no validadas**: el abogado/asesor debe confirmar las que tocan prescripción y obligaciones fiscales.
- **Justificación:** obligación legal de conservar solo el tiempo necesario (RGPD art. 5.1.e [A]); un plazo por categoría permite cumplirlo y explicarlo en la política. **Tipo:** el principio es OLC; las cifras, REC; las de reclamaciones y fiscalidad, **ASE**.
- **Consecuencias técnicas** (a planificar, **no hacer ahora**): tareas de borrado/anonimización programadas; columna de fecha de resolución en reportes; revisar qué tablas no tienen caducidad hoy.

**Tabla propuesta (a validar):**
| Categoría | Plazo propuesto | Observación |
|---|---|---|
| Cuenta, perfil, colaboraciones activas | Mientras la cuenta exista | Base: contrato |
| Cuenta inactiva | Aviso a los **24 meses** sin acceso y baja **30 días** después | Propuesta; ASE si afecta a historial |
| Cuenta eliminada sin historial compartido | Borrado inmediato | Flujo actual |
| Cuenta eliminada con historial compartido | Anonimización; datos de terceros se mantienen; bloqueo de lo exigible | Plazo de bloqueo: **ASE** |
| Búsquedas (`discovery_searches`) | **12 meses** | Propuesta |
| Avisos (notificaciones) | **6 meses** tras leídas | Propuesta |
| Mensajes y archivos de colaboración | Mientras exista la colaboración o conversación y hasta **12 meses** tras su cierre o la baja de una parte | Propuesta; ASE |
| Reportes, notas internas y registro de auditoría | **Plazo a fijar por el abogado** (relacionado con prescripción de reclamaciones y sanciones) | Sin cifra propuesta |
| Registros técnicos (servidor/IP) | Los del proveedor; **no se guardan IP en la base** | Verificar con Netlify/Supabase (V07) |
| Errores (Sentry, si se activa) | Los del plan; **máx. 90 días** como objetivo | Sin verificar |
| Lista de espera | Hasta el lanzamiento de su cohorte o **12 meses**, y baja inmediata a petición | Propuesta |
| Consentimiento de cookies (landing) | **12 meses** | Ya declarado en la landing |
| Datos de pagos y facturación (futuro) | **Plazo fiscal y mercantil** | **ASE fiscal**; no verificado |

- **Tareas:** validar con abogado y asesor; implementar borrado programado (Fase 6); redactarlo en la política (Fase 5).
- **Responsable:** ambos + asesor. **Límite:** tabla definitiva antes de la primera cohorte.

### D13 — Almacenamiento local de la app (CERRADA, 24-nov-2026)
- **Decisión:** mover **«tutorial visto» y «aviso de lanzamiento cerrado» a la base de datos** (perfil), **acotar o mover a servidor los borradores** (se evaluará su caducidad) y **eliminar la lectura de la clave antigua de búsquedas guardadas** tras migrarla; **solo la sesión** queda en el dispositivo. Sin banner de cookies en la app.
- **Justificación:** la sesión es necesaria para el servicio solicitado (exenta, IJR fuerte); el resto no es «estrictamente necesario» y está en zona gris (LSSI art. 22.2 [B]); evitar el almacenamiento en el dispositivo elimina el problema sin banner. **Tipo:** IJR; no es obligación demostrada.
- **Consecuencias jurídicas:** se publicará una **política de almacenamiento local** con lo que realmente se guarda; el tratamiento en servidor entra en el **registro de actividades** y la **política de conservación** (D12).
- **Consecuencias técnicas** (Fase 6, **no ahora**): nuevas columnas o tabla de preferencias del usuario; migrar borradores; revisar Sentry (no guarda en cliente por defecto; **verificar** antes de activarlo).
- **Tareas:** especificar cambios técnicos; redactar política (Fase 5).
- **Responsable:** Alejandro (técnico). **Límite:** antes de la primera cohorte.

### D14 — Canal DSA (CERRADA, 24-nov-2026)
- **Decisión:** **formulario público de notificación de contenido ilícito + buzón de correo**, que sirve también de **punto único de contacto** para usuarios y autoridades; **acuse de recibo en 2 días** y **decisión motivada en 7 días hábiles** como **objetivos internos** (no los fija la norma en los artículos leídos); retirada preventiva ante daño grave; **declaración de motivos** a quien sufra restricciones; reflejado en los términos (política de moderación).
- **Justificación:** **obligación legal** de punto de contacto (DSA 11 y 12 [A]), mecanismo de notificación y acción accesible por vía electrónica (art. 16 [A]) y motivación de restricciones (art. 17 [A]); información sobre moderación en las condiciones (art. 14.1 [A]). Se aplica el núcleo del DSA y se aprovecha la exención de micro y pequeñas empresas para la sección 3 (art. 19 [A]). **El régimen sancionador español: no verificado (ASE).**
- **Consecuencias jurídicas:** una notificación suficientemente motivada se considera **conocimiento efectivo** (art. 16.3 [A]): hay que actuar con prontitud para conservar la exención del art. 6 [A]; el buzón debe atenderse siempre.
- **Consecuencias técnicas** (Fase 6, **no ahora**): formulario público con los campos del art. 16.2 (motivación, URL, datos del notificante, declaración de buena fe); tabla de notificaciones y decisiones; plantilla de declaración de motivos; panel con cola de notificaciones.
- **Tareas:** crear buzón con el dominio (D07); redactar política de moderación y plantillas (Fase 5); especificar formulario y panel.
- **Responsable:** Alejandro (técnico) y Mario (negocio). **Límite:** antes de la primera cohorte con contenido público.

### D15 — Entorno y copias antes de la primera cohorte (CERRADA, 24-nov-2026)
- **Decisión:** **proyecto de Supabase separado solo para producción** y **copias manuales programadas con prueba de restauración** desde la primera cohorte; **pasar a un plan de pago con copias automáticas cuando haya ingresos o crezca la base**. Los entornos de desarrollo y pruebas quedan en otro proyecto.
- **Justificación:** el RGPD exige medidas apropiadas que incluyan capacidad de restaurar la disponibilidad y el acceso a los datos con rapidez (art. 32.1.b–c [A]); separar producción evita mezclar datos reales con pruebas y cuentas de prueba. Que el plan gratuito sea suficiente **no está confirmado** (IJR). **Tipo:** IJR/REC; coste cero de plan hoy, con más trabajo manual y **sin recuperación a un punto exacto**. **Precios del plan de pago: no verificados.**
- **Consecuencias jurídicas:** el nivel de seguridad debe documentarse (medidas del art. 32) y reflejar el riesgo residual; si hay pérdida de datos, **brecha de disponibilidad** a notificar si hay riesgo (art. 33 [A]).
- **Consecuencias técnicas** (Fase 6, **no ahora**): crear el proyecto, aplicar migraciones, variables de entorno separadas, **script de copia programada** (`pg_dump` de `public` y exportación de Storage), prueba de restauración trimestral, **cuentas y credenciales distintas por entorno**. Esto cambia la nota de `docs/15-cierre-lanzamiento-gratis.md`, que decía que se usaría un único proyecto: **actualizar esa decisión**.
- **Tareas:** crear proyecto de producción; programar copias; documentar procedimiento; revisar el compromiso de «Supabase Pro tras revisión legal».
- **Responsable:** Alejandro (técnico). **Límite:** antes de la primera cohorte.

### D16 — Puerta de entrada a la monetización (CERRADA, 24-nov-2026)
- **Decisión:** **no se activará ningún cobro** (Stripe, comisión del 10 %, suscripción PRO) hasta cumplir **todas** estas condiciones: (1) **SL constituida y cuenta de Stripe a nombre de la SL**; (2) **opinión escrita de un abogado** sobre Stripe Connect y la normativa de servicios de pago (PSD2); (3) **modelo de facturación, IVA e IRPF validado por asesor fiscal**; (4) **análisis de DAC7** y, si procede, registro; (5) **términos y política de pagos, comisiones y reembolsos publicados**; (6) **flujo de suscripción conforme** a consumo (información precontractual, botón, desistimiento, renovación y baja) si hay usuarios consumidores; (7) calendario de **factura electrónica** comprobado y software de facturación elegido; (8) identificación fiscal de creadores definida (D10).
- **Justificación:** cobrar abre a la vez obligaciones de pagos, fiscalidad, plataforma y consumo que hoy están sin resolver o sin verificar en texto oficial (PSD2, DAC7, factura electrónica). **Tipo:** REC preventiva; todos los puntos técnicos son **ASE**.
- **Consecuencias jurídicas:** reafirma el disparador de la SL (D03); la comisión del 10 % y el modelo de Connect **no se dan por válidos** hasta la opinión del abogado.
- **Consecuencias técnicas:** los interruptores `PAYMENTS_ENABLED`, etc. **permanecen apagados** (ya lo están); no se tocan.
- **Tareas:** contratar abogado y asesor fiscal con alcance de esta lista; obtener opinión escrita.
- **Responsable:** ambos. **Límite:** antes del primer cobro; **no hay fecha**.

### D17 — Papel de CIBERAN en la contratación (CERRADA, 24-nov-2026)
- **Decisión:** CIBERAN es una **plataforma intermediaria** que facilita el descubrimiento, contacto, negociación y gestión de colaboraciones. **El contrato de campaña se celebra directamente entre creador y partner; CIBERAN no es parte.** CIBERAN **sí responde de sus propias obligaciones** como plataforma y proveedor de sus servicios.
- **Coherencia comprobada:** es coherente con el modelo (el creador y el partner pactan precio, alcance y entregables; CIBERAN no ejecuta la campaña), con los términos actuales (§2: «CIBERAN no es parte»), con el DSA (servicio de alojamiento; arts. 6 y 14 [A]) y con la inaplicación de P2B por ser relación B2B (D08).
- **Matices jurídicos que se incorporan a la redacción:**
  1. **«No ser parte» no es «no tener obligaciones».** CIBERAN responde de lo suyo (tratamiento de datos, seguridad, moderación y canal DSA, funcionamiento del servicio). **No se puede excluir la responsabilidad por dolo o negligencia propios** ni derechos de consumidores (TRLGDCU 82–91 [A]; Ley 7/1998 [A]). Se reformula la cláusula 10 de los términos actuales (Fase 5).
  2. **Evitar lenguaje de mandato o representación** («agente», «recauda por cuenta del creador», «garantiza el pago»): importa cuando haya pagos, porque la **EBA** considera que recibir el pago por cuenta del beneficiario no queda excluido por defecto de PSD2 [B]. La puerta D16 sigue vigente.
  3. **CIBERAN define el proceso** (la aceptación bloquea las condiciones, caducidad de solicitudes, entregas y revisiones, cancelación de común acuerdo, terminación por incumplimiento, reportes). Esas reglas deben estar en los **términos de plataforma que aceptan ambos**, no en el contrato de campaña.
  4. **Contratación electrónica:** la aceptación dentro de la plataforma debe poder acreditarse (versión, fecha, contenido de las condiciones aceptadas); la cesión de derechos exige forma escrita (TRLPI art. 45 [B]). Validez y prueba del contrato electrónico: **ASE** (LSSI [D], no leído).
  5. **Registros de la plataforma** (cronología, eventos, versiones) son **evidencia**, no resolución: CIBERAN no arbitra ni obliga a pagar, entregar o cumplir (ya recogido en los términos).
  6. **Las «condiciones de colaboración tipo»** que ofrezca CIBERAN son **condiciones generales** (Ley 7/1998, arts. 5 y 7 [A]): claras, aceptadas expresamente y recuperables. Quién es el «predisponente» si las ofrece un tercero a las dos partes: **ASE (bajo)**.
- **Consecuencias técnicas** (Fase 6): guardar versión y texto aceptado; mostrar de forma visible «CIBERAN no es parte»; mantener los registros de la cronología.
- **Tareas:** redactar términos de plataforma (rol intermediario, obligaciones propias, proceso) y condiciones de colaboración tipo (Fase 5); revisar la cláusula 10.
- **Responsable:** ambos (redacción de Fase 5); **ASE** para validar. **Límite:** antes de la primera cohorte.

---

### D18 — Derechos de uso por defecto (CERRADA, 24-nov-2026)
- **Decisión:** **el creador conserva los derechos de propiedad intelectual.** El partner recibe una **licencia no exclusiva y limitada a la campaña acordada**, con **alcance (medios), duración, territorio y usos definidos**. **Los usos adicionales requieren autorización expresa.**
- **Coherencia comprobada:** coherente con el TRLPI (el autor tiene el derecho exclusivo de explotación, art. 17 [A]) y con la cesión limitada a lo pactado (arts. 43 y 45 [B]). Encaja con el producto: ya existen los campos `usage_rights` y `exclusivity` (hoy texto libre).
- **Matices jurídicos que se incorporan a la redacción:**
  1. **Forma (texto oficial leído, BOE-A-1996-8930, consolidado).** Una licencia no exclusiva equivale a una cesión no exclusiva de derechos de explotación. **TRLPI art. 43.1 [A]:** la cesión queda limitada «al derecho o derechos cedidos, a las modalidades de explotación expresamente previstas y al tiempo y ámbito territorial que se determinen». **Art. 43.2 [A]:** la falta de mención del tiempo limita la transmisión a **cinco años** y la del ámbito territorial al **país en el que se realice la cesión**; si no se expresan las modalidades, la cesión queda limitada a la que **se deduzca necesariamente del contrato y sea indispensable** para su finalidad. **Art. 43.5 [A]:** no alcanza a modalidades o medios de difusión **inexistentes o desconocidos** al tiempo de la cesión. **Art. 45 [A]:** toda cesión deberá **formalizarse por escrito**; si el cesionario incumple tras requerimiento fehaciente, el autor puede optar por la **resolución**. **Art. 48 [A]:** la cesión en exclusiva debe otorgarse **expresamente con ese carácter** y atribuye al cesionario la facultad de explotar con exclusión de otros, **incluido el cedente**. **Art. 48 bis [A]:** en cesiones **exclusivas**, el autor puede resolver o poner fin a la exclusividad si la obra **no se explota** (ejercitable tras cinco años; irrenunciable). **Art. 44 [A]:** menores de 16 a 18 con vida independiente pueden ceder; **no aplica** (acceso solo ≥ 18, D09). **Consecuencia:** los valores por defecto del art. 43.2 pueden **contradecir** «limitada a la campaña»; por eso los campos (medios, duración, territorio, usos pagados) son **obligatorios antes de aceptar** una colaboración (Fase 6) y se añade una cláusula de reserva: «todo lo no autorizado expresamente queda reservado al creador».
  2. **Transformación.** Editar, recortar, subtitular o adaptar exige derecho de transformación: se menciona expresamente. Los **derechos morales** (autoría e integridad) son irrenunciables [D]; la redacción no los excluye.
  3. **Imagen y voz.** Los derechos de **imagen y voz** del creador y de terceros se regulan **aparte** (LO 1/1982 [D], no leída): consentimiento expreso, delimitado y revocable [D]. No quedan incluidos por defecto en la licencia. **ASE.**
  4. **Usos pagados y posteriores:** anuncios con el contenido, repost fuera de la campaña, usos tras su fin, **permanencia del contenido** en los perfiles del partner: **son usos adicionales** con autorización expresa y, normalmente, **retribución adicional**.
  5. **Exclusividad:** por defecto **no exclusiva**. Pactar **licencia exclusiva** o **exclusividad comercial** (no trabajar con marcas competidoras) debe ser expreso y retribuido; **no confundir** ambas figuras.
  6. **Material del partner** (marca, logos, música, producto): licencia **inversa**, limitada a la campaña, con garantía de titularidad.
  7. **Contenido con IA:** solo se licencia lo que el creador puede licenciar; declarar el uso de IA generativa **como obligación contractual**, **distinta** de las obligaciones legales del **art. 50 del AI Act**, que corresponden a **proveedores y responsables del despliegue** (texto oficial leído, incluido el **Reglamento 2026/1744**; ver doc. 11 §9); **autoría y protección: ASE**.
  8. **CIBERAN no recibe derechos sobre la campaña**: solo la licencia limitada para alojar y mostrar el contenido en la plataforma (ya prevista en los términos).
- **Precisión de redacción (24-nov, sin cambiar D18):** «el creador conserva los derechos» se entiende como **autoría, derechos morales y derechos no cedidos**; cuando las partes pactan **cesión en exclusiva expresa** (TRLPI art. 48 [A]) el partner adquiere, **dentro del ámbito pactado**, el derecho exclusivo de explotación, **incluso frente al creador**, y el creador **recupera** el contenido al terminar el plazo. **No hay contradicción con D18** (que fija la licencia no exclusiva como valor por defecto y exige autorización expresa para lo demás). Detalle en `11_CONTRATACION_COLABORACIONES.md` §5.1–5.2 (**art. 48 bis completo**) y §7 (**exclusividad comercial distinta de la licencia exclusiva**).
- **Consecuencias técnicas** (Fase 6, **no ahora**): estructurar y exigir los campos de uso (medios, duración, territorio, usos pagados, exclusividad, transformación, imagen y voz) y mostrarlos en el resumen de lo acordado; **registro de aceptación según el Anexo B del documento 11 (REQ-01 a REQ-14)**.
- **Tareas:** redactar licencia tipo y cláusulas de reserva (Fase 5); especificar los campos obligatorios.
- **Responsable:** ambos; **ASE** para imagen, voz, IA y moral. **Límite:** antes de la primera cohorte.

---

### D19 — Ley aplicable, conflictos y negociación previa (CERRADA, 24-nov-2026, con una corrección)
- **Decisión:** **legislación española** como referencia general; **negociación amistosa previa**; si no hay acuerdo, **tribunales competentes conforme a las normas aplicables** (sin sumisión expresa a una ciudad concreta); **no se excluyen derechos imperativos de consumidores**.
- **Corrección de redacción (importante):** la propuesta decía negociación previa **«voluntaria»**. **Texto oficial leído (LO 1/2025, BOE-A-2025-76, consolidado a 04-06-2025) [A]:** **art. 5.1–5.2:** acudir previamente a un medio adecuado de solución de controversias es **requisito de procedibilidad** en el orden civil para que sea admisible la demanda (con las excepciones del art. 5.2 y las del art. 5.3, entre ellas medidas cautelares previas, demanda ejecutiva y diligencias preliminares); debe haber **identidad entre el objeto de la negociación y el del litigio**; **art. 5.1** considera cumplido el requisito, entre otros casos, cuando la negociación se desarrolla **directamente por las partes**. **Art. 3:** aplica a asuntos **civiles y mercantiles**, incluidos los transfronterizos, y, en defecto de sometimiento expreso, cuando una parte tenga domicilio en España y la negociación se realice en territorio español. Nadie está obligado a llegar a un acuerdo (**art. 4**: autonomía privada), pero **intentarlo no es opcional**. La cláusula dirá «negociación previa de buena fe, de la que quedará constancia», **no «voluntaria»**.
- **Requisitos prácticos de acreditación (LO 1/2025, arts. 7, 8, 9, 10 [A]) — no es solo una cláusula:**
  1. **Constancia documental** del intento (art. 10.1). **Sin tercero neutral** (art. 10.2): o bien **un documento firmado por ambas partes** con identidad, fecha, **objeto de la controversia**, fechas de las reuniones y **declaración responsable de buena fe**; o, en su defecto, **cualquier documento que pruebe que la otra parte recibió la solicitud o propuesta, en qué fecha y que pudo acceder a su contenido íntegro**.
  2. **Solicitud de inicio** (art. 7.1): debe **definir adecuadamente el objeto** de la negociación; interrumpe la **prescripción** y suspende la **caducidad** desde el intento de comunicación (en el domicilio personal o lugar de trabajo que conste, o por **el medio electrónico empleado por las partes en sus relaciones previas**).
  3. **Plazos:** si no hay **primera reunión o respuesta por escrito en 30 días naturales**, o no hay respuesta a una **propuesta concreta en 30 días**, se reanuda el cómputo (art. 7.1); la terminación sin acuerdo se produce por esas causas, por **tres meses desde la primera reunión sin acuerdo** o por **escrito de cualquiera de las partes** (art. 10.4). Tras la terminación (o la falta de respuesta), la **demanda debe presentarse en el plazo de un año** para entender cumplido el requisito (art. 7.3).
  4. **Costas y abuso:** el tribunal valorará la colaboración de las partes y el eventual **abuso del servicio público de Justicia** al decidir sobre costas y sanciones (art. 7.4).
  5. **Telemático:** se puede acordar negociar por **medios telemáticos** garantizando la identidad (art. 8.1); en reclamaciones de cantidad **hasta 600 €** se hará **preferentemente** por medios telemáticos (art. 8.2).
  6. **Confidencialidad:** el proceso y su documentación son **confidenciales**, salvo si se acudió o no al intento y el objeto de la controversia (art. 9.1); lo negociado **no se puede aportar en juicio** salvo excepciones (art. 9.2). Datos personales: RGPD y LOPDGDD (art. 9.4).
  7. **Honorarios:** cada parte paga a sus abogados; si interviene un neutral, sus honorarios se acuerdan previamente (art. 11).
  8. **Formalización del acuerdo** (art. 12): identidad y domicilio de las partes, fecha, obligaciones asumidas y que se siguió un procedimiento ajustado a la ley; firma de las partes y copia para cada una.
  - **Consecuencia para CIBERAN:** como el **medio electrónico empleado por las partes en sus relaciones previas** puede ser el canal de la **plataforma**, CIBERAN debe poder **acreditar** fecha de envío, destinatario, **contenido íntegro** y acceso de la solicitud o propuesta; **no es mediador ni neutral** (D17). Requisito técnico para la Fase 6 (**T18** ampliada). **No se presenta la negociación previa como una simple cláusula**: se acompaña de un **procedimiento y un registro de acreditación**.
- **Coherencia comprobada:** coherente con los términos actuales (§11: ley española, fuero del consumidor reservado) y con que CIBERAN **no es árbitro ni mediador** (D17): su canal de reclamaciones es un cauce de comunicación, **no sustituye** a la negociación entre partes.
- **Matices jurídicos que se incorporan a la redacción:**
  1. **Consumidores:** las cláusulas de sumisión a un foro distinto del domicilio del consumidor son abusivas (TRLGDCU art. 90 [A]); se mantiene la salvaguarda. Los creadores pueden ser consumidores **frente a CIBERAN** (D10), no frente al partner.
  2. **Elección de ley y usuarios de otros países:** una elección de ley no priva al consumidor de la protección imperativa de su país de residencia (Reglamento Roma I [D], no leído). **Alcance territorial** de usuarios: ver D22 (no bloquea esta redacción, que se hará para usuarios establecidos en España).
  3. **No imponer arbitraje** a consumidores (TRLGDCU art. 90 [A]).
  4. **Dos relaciones distintas:** términos de plataforma (CIBERAN–usuario) y contrato de campaña (creador–partner); no deben confundirse en la cláusula.
  5. **Entre empresas** podría pactarse sumisión expresa a una ciudad; se descarta por ahora para no fijar un fuero sin necesidad (REC); **ASE** si se desea.
- **Consecuencias técnicas** (Fase 6): botón o procedimiento de «propuesta de acuerdo» con registro de fecha y contenido para acreditar la negociación; plantilla de comunicación previa.
- **Tareas:** redactar cláusula (Fase 5); verificar el texto de la LO 1/2025 con el asesor.
- **Responsable:** ambos + ASE. **Límite:** antes de la primera cohorte.

---

## 3. Registro de tareas derivadas

### 3.1 Antes de la primera cohorte de usuarios (Fase B)
| # | Tarea | Responsable | Depende de |
|---|---|---|---|
| T01 | Recoger **nombre completo, NIF y domicilio de ambos fundadores** para aviso legal y privacidad | Ambos | D01 |
| T02 | Acuerdo de fundadores (desbloqueo, ámbitos, vesting, confidencialidad) | Ambos + abogado | D04a, D04b |
| T03 | Cesión cruzada de propiedad intelectual; inventario de activos; unificar identidades de git (opcional) | Ambos + abogado | D05 |
| T04 | Declaración firmada de tenencia del dominio por cuenta de ambos | Alejandro y Mario | D06a |
| T05 | Organizaciones/equipos con dos administradores (GitHub, Netlify, Supabase, registrador, correo) y doble factor | Ambos | D06a |
| T06 | Búsqueda de anterioridades y solicitud de marca a nombre de ambos **antes de la lista de espera** | Ambos + abogado/gestor | D06b |
| T07 | Correo con dominio propio y proveedor de envío con contrato de encargo; buzones (privacidad, soporte, contenido ilícito) | Alejandro + Mario | D07, D14 |
| T08 | Acuerdo del art. 26 entre corresponsables; procedimiento y registro de solicitudes de derechos | Ambos (Alejandro responsable, Mario suplente) | D02 |
| T09 | Especificar para el equipo técnico: casilla de mayoría de edad, declaración y datos de partner, bloqueo de «enviar propuesta», cola de revisión | Alejandro | D08, D09 |
| T10 | Especificar cambios técnicos: preferencias en base de datos, borradores, canal DSA y panel de notificaciones, borrado programado, registro de acceso a contenido | Alejandro | D11–D14 |
| T11 | Proyecto de producción separado, copias manuales programadas y prueba de restauración; actualizar la decisión de `docs/15` | Alejandro | D15 |
| T12 | Registro de actividades, protocolo de brechas, registro de proveedores y DPA archivados | Ambos | D01–D02 |
| T13 | Landing: formulario de **lista de espera** con consentimiento y política actualizada; corregir responsable y titularidad de marca/diseño | Ambos | D03, D01 |
| T14 | Definir tamaño de la primera cohorte y criterios para ampliar | Ambos | D03 |
| T15 | Buscar abogado mercantil/digital y gestor, con presupuesto | Ambos | D03 |
| T16 | Redactar términos de plataforma (rol intermediario, obligaciones propias, proceso) y **condiciones de colaboración tipo** con licencia de uso y negociación previa | Ambos + abogado (revisión) | D17, D18, D19 |
| T17 | Especificar para el equipo técnico los **campos obligatorios de uso** (medios, duración, territorio, usos pagados, exclusividad, transformación, imagen y voz) y el registro de la aceptación (versión + texto) | Alejandro | D18 |
| T18 | Verificar con el asesor el texto de la LO 1/2025 (negociación previa) y la validez del contrato electrónico | Ambos + abogado | D19 |

### 3.2 Comprobaciones pendientes (datos)
V01 despliegues de Netlify · V02 registro en Supabase Auth · V03 `.es` y registrador · V04 anterioridades de marca · V05 script `hud` · V06 flujo de cookies de la landing · V07 DPA de proveedores · V08 inventario de cuentas · V09 Sentry.

### 3.3 Antes de monetizar (Fase C)
Lista completa de D16 (SL y Stripe; opinión PSD2; fiscalidad; DAC7; textos de pagos y reembolsos; flujo de suscripción; factura electrónica; identificación fiscal).

### 3.4 Antes de funciones futuras (Fase D)
IA (proveedor con DPA y sin entrenamiento, transparencia, EIPD), integración de redes sociales, cuentas de equipo para marcas, partners de otros países de la UE.

---

## 4. Estado de las decisiones y preparación para la Fase 5

### 4.1 Cerradas
D01, D02, D03 (con disparador), D04a, D04b, D05, D06a, D06b, D07, D08, D09, D10, D11, D12 (enfoque; cifras a validar), D13, D14, D15, D16, **D17, D18, D19** (24-nov, con matices).

### 4.2 Siguen pendientes (decisiones que aún no he planteado o que dependen de datos)
| ID | Qué falta | Por qué importa para la Fase 5 |
|---|---|---|
| D04c | **Ámbitos de cada fundador** y confidencialidad/no competencia | Acuerdo de fundadores (T02) |
| D20 | **Proveedor de la lista de espera y del envío de correo** (y dónde se almacenan los correos) | Política de privacidad y registro de encargados |
| D21 | **Cohortes**: tamaño y reglas de ampliación | Planificación, no redacción |
| **D22** | **Alcance territorial de usuarios en esta fase** (solo España, España y UE, o cualquier país) | **No bloquea** la redacción, que se hará para usuarios establecidos en España; condiciona ley aplicable con consumidores de otros países, IVA y DAC7 |
| V01–V09 | Datos por comprobar | V01, V02, V07 afectan a lo que se declara en privacidad |

### 4.3 Requieren asesor (no se pueden cerrar solos)
Acuerdo de fundadores y estatutos (redacción) · cesión de PI y autoría con IA · estructura fiscal y alta/RETA · Stripe Connect y PSD2 · facturación, IVA, IRPF · DAC7 · factura electrónica/Verifactu · habitualidad y alta de creadores aficionados · uso mixto de partners autónomos · limitación de responsabilidad frente a consumidores · texto del protocolo de acceso a mensajes · régimen sancionador del DSA · plazos de reportes y auditoría · AI Act al activarla.

### 4.4 ¿Estamos preparados para la Fase 5?
**Sí, para una primera tanda; no para todo.**
- **Se puede redactar ya** (con campos `[POR COMPLETAR]` marcados donde falta un dato): aviso legal (necesito T01), política de privacidad en capas (con D01, D02, D07, D11–D13), política de cookies y almacenamiento local, política de moderación y canal DSA (D14), condiciones para creadores y partners con declaraciones de edad y de actividad (D08, D09, D10), política de conservación (D12, cifras a validar), registro de actividades, protocolo de brechas y plantilla de derechos RGPD (D02).
- **Ya se pueden redactar también** las **condiciones de colaboración tipo** y los términos de plataforma (D17–D19 cerradas), con la licencia de uso, la negociación previa y la salvaguarda de consumidores, marcando para revisión profesional lo que lo requiere.
- **No debe cerrarse todavía:** política de pagos, comisiones, reembolsos y suscripciones; esperan a la monetización (D16).
- **Condición de calidad:** todo lo marcado ASE se entregará **con aviso de revisión profesional** y no se publicará.
