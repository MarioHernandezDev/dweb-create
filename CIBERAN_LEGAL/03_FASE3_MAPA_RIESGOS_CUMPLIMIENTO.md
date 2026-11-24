# CIBERAN — Fase 3: mapa de riesgos y matriz de cumplimiento

**Fecha:** 24-nov-2026 · **Versión:** 0.8 (incluye respuestas de los fundadores: §12; app no desplegada y separación de roles: §13–§15; efecto de las decisiones de la Fase 4: §17, con D17–D19 el 24-nov) · **Estado:** borrador interno de trabajo. **No es asesoramiento jurídico ni fiscal definitivo.**
**Límites respetados:** no se ha modificado código, base de datos, RLS, funciones, triggers ni configuración; no se ha activado Stripe ni cobros; no se ha publicado ningún documento legal. Solo se han hecho lecturas (repositorio, esquema de la base, la web pública `ciberan.com`, registro público del dominio y fuentes oficiales).

---

## 0. Cómo leer este documento

### 0.1 Tipo de conclusión (lo que me has pedido distinguir)
| Código | Significado |
|---|---|
| **OLC** | **Obligación legal confirmada**: la norma está leída en texto oficial [A] o en consolidado oficial [B] y su aplicación al hecho es directa |
| **IJR** | **Interpretación jurídica razonable**: la norma es cierta, pero aplicarla a CIBERAN exige interpretar hechos o conceptos; cabe otra lectura |
| **REC** | **Recomendación preventiva**: buena práctica o reducción de riesgo, no una obligación demostrada |
| **ASE** | **Requiere asesor** (abogado o asesor fiscal): no se puede cerrar con la información que hay |

### 0.2 Nivel de verificación de la fuente (heredado de la Fase 2)
**[A]** texto oficial leído · **[B]** oficial, lectura parcial · **[C]** fuentes secundarias · **[D]** conocimiento no contrastado hoy. **Una obligación solo se marca OLC si se apoya en [A] o [B].** Todo lo apoyado en [C] o [D] se marca IJR, REC o ASE, aunque suene a obligación.

### 0.3 Escala
- **Gravedad:** crítica / alta / media / baja. **Probabilidad:** alta / media / baja.
- **Situación:** *Incumplimiento confirmado* (hecho verificado + obligación OLC), *Riesgo potencial*, *Obligación futura* (se activa con una función), *Pendiente de verificación*.
- **Cambio necesario:** **C** código · **B** base de datos · **D** documentación · **X** configuración/cuentas/proveedores · **P** proceso interno.

---

## 1. Hallazgos nuevos y correcciones a las fases anteriores

Esta fase ha comprobado hechos que cambian parte de lo dicho antes. Van primero porque condicionan todo lo demás.

### 1.1 Lo que hay publicado realmente en `ciberan.com` (comprobado hoy, 24-nov-2026)
1. **`ciberan.com` sirve una página estática «Muy pronto» alojada en Netlify**, no la aplicación Nuxt: `/login` y `/terminos` devuelven 404. Es la rama `feat/pronto` del repositorio. **No he encontrado la URL pública de la aplicación (el «preview» al que te refieres)**: no consta en los documentos del repositorio, y `app.`, `preview.`, `staging.` y `www.` de `ciberan.com` no resuelven. **→ Pregunta 1 (§12): ¿en qué URL está accesible la app y quién puede registrarse hoy?** Todo lo que sigue sobre la app trata ese acceso como *potencial* hasta que lo confirmes.
2. La landing **ya tiene aviso legal, política de privacidad y política de cookies** (actualizadas el 17-nov-2026) que identifican como titular y responsable a **una persona física, Alejandro Suárez Durán, con DNI y domicilio en Granada**. (Los datos están publicados en esa web; no los repito aquí.) Esto **corrige la Fase 1/2**, que daba por no resuelta la identificación del titular: en la landing sí está resuelta, y **de forma individual**.
3. **Cookies de la landing: comprobado.** Al cargar la página por primera vez (sin interactuar) **no hay cookies, no hay `localStorage` y solo se piden recursos del propio dominio**; hay un banner y un enlace «Configurar cookies»; Google Analytics se carga por Google Tag Manager **solo si se acepta**, según su política y la cabecera `Content-Security-Policy` [verificado el estado inicial; **no he probado el flujo de aceptar/rechazar ni que la retirada borre cookies**]. Se carga además un script del propio Netlify (`/.netlify/scripts/hud`) cuya función no he determinado.
4. **Dominio:** `ciberan.com` registrado el **16-nov-2026** y válido hasta el 16-nov-2027 (registro público; el titular del dominio **no es visible** por protección de datos). Los servidores de nombres corresponden a un proveedor de alojamiento/registro (`ui-dns`, que parece IONOS: **inferencia, no verificada**). La landing menciona también `ciberan.es`: **no he comprobado quién es su titular**.

### 1.2 Correcciones a la Fase 2
| Afirmación anterior | Corrección |
|---|---|
| «Un menor no puede contratar válidamente» | **Demasiado categórica.** Ver §3.2. |
| «Hoy no hace falta banner de cookies; el localStorage está exento» | **No se puede dar por exento automáticamente** cada uso. Ver §3.3. |
| «El titular está sin definir» | En la **landing** sí está definido (persona física). Lo que **no** está definido es el titular **de la aplicación** y su coherencia con el 50 % de la intención de los fundadores. |
| P2B / DSA / consumo | Se mantienen, pero con la salvedad de que no está confirmado si la app es pública. |

### 1.3 Observaciones de propiedad extraídas del repositorio (hechos verificables)
- Autoría de commits: **Alejandro ~157**, **Mario 36**, **y 1 commit de un tercero identificado como «Codifiko»**, cuya identidad desconozco. Además, los commits recientes de esta propia herramienta llevan el trailer *«Co-Authored-By: Claude»*.
- El repositorio remoto `origin` está bajo la cuenta GitHub **MarioHernandezDev**, y uno de vosotros **no tiene permiso de escritura** (lo dijiste al intentar el `push`).
- Todo esto afecta a la **cadena de titularidad del código** (§2.5).

---

## 2. Titularidad: cinco cuestiones distintas

> **Principio rector (tu punto más importante):** que la estructura futura esté sin decidir **no** justifica dejar sin identificar al prestador del servicio ni al responsable del tratamiento. Las obligaciones de identificación existen **hoy**, para quien opere el servicio, cobre o no.

### 2.1 Titular de la web y prestador del servicio
- **Obligación:** la LSSI exige que el prestador facilite, de forma permanente, fácil, directa y gratuita, su identidad, domicilio, email, y NIF/datos registrales si es sociedad (art. 10) [B]. **OLC** (aplica a quien presta servicios de la sociedad de la información con **actividad económica**).
- **¿Y si no se cobra?** **IJR:** la LSSI define el servicio por su carácter de actividad económica, no por que el usuario pague; una plataforma que se lanza como negocio, aunque durante el preview sea gratis, encaja razonablemente en esa definición. *[El concepto de «servicio de la sociedad de la información» y su gratuidad: no lo he leído literalmente; verificar.]* **Conclusión práctica:** **no es defendible** dejar el aviso legal sin titular «porque todavía no cobramos».
- **Quién debe figurar:** **la persona (física o jurídica) que realmente presta el servicio y asume su responsabilidad**. Hoy no existe sociedad, así que solo pueden figurar **personas físicas**. Alternativas:
  | Opción | Qué implica | Comentario |
  |---|---|---|
  | **a) Un fundador como titular único** (como la landing) | Es él quien responde personalmente, con todo su patrimonio, de la web y de sus tratamientos | Coherente con la landing; **incompatible con afirmar propiedad 50/50 sin documento** |
  | **b) Ambos fundadores como titulares** | Responsabilidad personal de los dos; hay que reflejar relación entre ellos (ver §2.2) | Más fiel a la realidad si ambos deciden; riesgo de **sociedad civil irregular** (§2.3) |
  | **c) Un fundador titular, con acuerdo interno con el otro** | Frente a usuarios y AEPD solo da la cara uno; entre ellos, pacto escrito de reparto y compensación | **REC** como solución provisional; **no es oponible a los usuarios** |
- **Dato clave que falta:** si **ambos** toman las decisiones sobre la web y sus datos (§2.2). **→ Pregunta 3.**

### 2.2 Responsable del tratamiento de datos
- **Definición [A]:** responsable es quien, «solo o junto con otros, determine los fines y medios del tratamiento» (RGPD art. 4.7). **Es un criterio de hecho, no de forma jurídica**: no hace falta una sociedad.
- **Si ambos fundadores deciden juntos** qué datos se recogen y para qué, son **corresponsables** (RGPD art. 26.1 [A]): deben determinar «de modo transparente y de mutuo acuerdo» sus responsabilidades, **poner a disposición del interesado los aspectos esenciales del acuerdo** y el interesado puede ejercer sus derechos **frente a cada uno** (art. 26.2–26.3). **OLC si se da el hecho** (decisión conjunta).
- **Si decide en la práctica uno solo** y el otro colabora sin decidir fines ni medios: responsable único; el otro no lo es. **IJR**, depende de los hechos (¿quién configura Supabase? ¿quién redacta la política? ¿quién responde a las solicitudes?).
- **La excepción doméstica no sirve** (art. 2.2.c [A]: solo para actividades «exclusivamente personales o domésticas»).
- **Consecuencias de ser persona física:** responde personalmente (la AEPD sanciona también a personas físicas) y, si no hay sociedad, **sin separación de patrimonios**. **IJR/ASE** (importe y cuantía de sanciones: no verificados).
- **Recomendación:** decidir ya, por escrito, entre **(i) corresponsabilidad** con acuerdo del art. 26 y punto de contacto único, o **(ii) un responsable único** con el otro fundador como **persona autorizada** que actúa bajo sus instrucciones. **REC + ASE** para el texto del acuerdo.
- **Incoherencia detectada [hecho]:** la landing declara responsable único a Alejandro. Si la app la gestionan los dos, **la política de la app no puede copiar esa redacción sin comprobar quién decide**.

### 2.3 Propiedad del proyecto (intención 50/50 sin sociedad)
- **Estado jurídico real:** sin SL ni documento, **la intención de reparto no está protegida**. Lo que existe es una situación de hecho que, según cómo se desarrolle, puede calificarse de:
  - **Comunidad de bienes** sobre los activos comunes (Código Civil, copropiedad) [D], y/o
  - **Sociedad civil** (contrato verbal o tácito entre quienes ponen en común bienes o industria para partir ganancias; Código Civil art. 1665) [D]. **IJR/ASE:** cuándo nace, qué efectos tiene y cómo se prueba.
- **Efecto fiscal y de responsabilidad [C]:** una comunidad de bienes que desarrolle una actividad empresarial habitual puede ser **recalificada como sociedad civil con objeto mercantil**, que tributa en el Impuesto sobre Sociedades; los comuneros/socios responden **ilimitadamente**. **ASE.**
- **Para proteger el 50/50 hoy** (sin constituir SL) lo mínimo es un **documento privado de acuerdo entre fundadores**, fechado y firmado por ambos, que fije: reparto previsto (50/50), **qué aporta cada uno** (código, diseño, trabajo, marca, dominio, cuentas), **cesión recíproca de derechos de autor** para el proyecto, reglas de decisión y **desbloqueo** (los 50/50 se bloquean), confidencialidad, no competencia, qué pasa si uno sale **antes** de constituir la sociedad, y compromiso de **aportar todo a la SL** cuando se constituya. **REC fuerte + ASE** para redactarlo y darle fecha fehaciente.

### 2.4 Titularidad de la actividad económica futura y transición
- **Hoy:** sin ingresos, sin facturas. **Regla provisional:** mientras no exista actividad económica remunerada, la obligación de alta en Hacienda/Seguridad Social **depende de si hay habitualidad y ánimo de lucro**; no lo he verificado con la normativa. **ASE** (pregunta 5).
- **Al empezar a cobrar:** **todo ingreso del servicio debe facturarlo alguien con NIF**: el titular vigente (autónomo/comunidad) o la SL. **No debe empezar a cobrar una estructura y luego «trasladar» la actividad sin plan**: contratos con usuarios, DPA con proveedores, cuenta de Stripe y facturas anteriores quedan a nombre de la estructura antigua.
- **Qué hay que trasladar a una SL posterior** (checklist, ver también §5): (1) activos de PI (§2.5); (2) **cesión de posición contractual** en los términos con usuarios (aviso con ≥ 15 días como estándar [A P2B art. 3.2] y base contractual para que el cambio sea válido: cláusula de cesión en los términos); (3) **cambio de responsable del tratamiento** (nueva información art. 13 [A]; no requiere nuevo consentimiento si la base es el contrato, **IJR**); (4) **contratos de encargo** con Supabase, Netlify, Google, Stripe…; (5) cuentas (Stripe Connect: **la cuenta de Stripe va ligada a la identidad del titular y no siempre es transferible [D]**); (6) dominio; (7) alta/baja fiscal y de Seguridad Social; (8) facturación y numeración; (9) seguros.

### 2.5 Propiedad intelectual de los activos
| Activo | Quién es titular hoy | Hecho verificable | Problema / medida |
|---|---|---|---|
| **Código** | **Cada autor lo es de lo que escribió** (TRLPI art. 17 [A]: el autor tiene el derecho exclusivo de explotación). La cesión debe constar **por escrito** y se limita a lo pactado en **derechos, tiempo y territorio**; si no se fija el tiempo, se entiende **5 años** y si no el territorio, el del país de cesión (TRLPI arts. 43 y 45 [B]) | Autores en git: Alejandro (mayoría), Mario (36 commits), un tercero «Codifiko» (1 commit); el repositorio está en la cuenta de Mario | **Falta cesión escrita entre vosotros y a la futura sociedad.** Sin ella, ninguno puede explotarlo en exclusiva ni aportarlo a la SL sin el otro. Identificar y regularizar la aportación de «Codifiko». **OLC (la cesión debe ser escrita) + ASE (redacción).** |
| **Código generado con ayuda de IA** | **Incierto** | Commits con *Co-Authored-By: Claude* | La protección por derechos de autor de contenido generado por IA y los términos del proveedor de la herramienta **no están verificados** → **ASE** |
| **Marca CIBERAN y logotipo** | Sin registro verificado | No he comprobado el OEPM | Comprobar disponibilidad y registro; **registrar en nombre del titular definitivo** (o cederlo a la SL). La landing dice que nombre, logotipo y diseño «pertenecen al titular» (una persona física): **eso choca con el 50/50** → **REC: corregir cuando se defina** |
| **Dominios** `ciberan.com` / `.es` | Titular **no visible**; `.com` registrado el 16-nov-2026 | — | Averiguar a nombre de quién están. **Deben estar a nombre del titular real y con acceso de ambos.** |
| **Diseño, textos, manuales, documentación** | Del autor de cada pieza | — | Incluir en la cesión |
| **Cuentas** (GitHub, Netlify, Supabase, Stripe, correo `info.ciberan@gmail.com`) | Del titular de cada cuenta | `info.ciberan@gmail.com` es **un Gmail**; el correo del sistema sale de ahí | Inventario y cuentas a nombre de la entidad futura; **dos administradores** donde se pueda (continuidad) |
| **Datos de usuarios** | Responsable del tratamiento | — | Ver §2.2 |

---

## 3. Verificaciones pendientes de la Fase 2

### 3.1 Responsable RGPD
Ya tratado en §2.2. **Resumen:** hoy el responsable es **quien decide fines y medios**: o ambos fundadores como **corresponsables** (con acuerdo del art. 26 y aspectos esenciales a disposición de los usuarios) o uno solo con el otro bajo sus instrucciones. **No existe «ninguno» como opción.**

### 3.2 Menores: tres conceptos distintos
1. **Capacidad para contratar** (Código Civil). [C] El artículo 1263 impide que los menores no emancipados presten consentimiento **salvo** en los contratos que las leyes les permitan celebrar por sí mismos o con asistencia de sus representantes y en los relativos a **bienes y servicios de la vida corriente propios de su edad conforme a los usos sociales**. El contrato celebrado sin capacidad es **anulable** (no nulo de pleno derecho): puede ser impugnado, no desaparece solo. *No he leído el texto oficial del artículo.* → **IJR**: un contrato de colaboración comercial remunerada entre un menor y una marca **no parece «de la vida corriente propia de su edad»**, pero **no puedo afirmar que «ningún menor pueda contratar»**; mi frase anterior era demasiado absoluta.
2. **Consentimiento para tratar datos.** [A] RGPD art. 8: cuando la base es el **consentimiento** en servicios de la sociedad de la información dirigidos a niños, el tratamiento solo es lícito desde los **16 años**, salvo que el Estado miembro rebaje la edad (hasta 13); [B] LOPDGDD art. 7 la fija en **14**. **Esta regla solo se activa cuando la base es el consentimiento.** En CIBERAN la base principal es el **contrato** (art. 6.1.b), por lo que el art. 8 no es el problema principal; **el problema es que la base «contrato» depende de que el contrato sea válido**, y con menores esa validez es dudosa.
3. **Política comercial de acceso solo a mayores de 18.** **Es plenamente posible.** Una empresa puede decidir a quién ofrece sus servicios; **no hay una obligación legal general de verificación fuerte de edad** para un servicio B2B de estas características [D, **IJR**]. Lo recomendable es **declaración expresa de ser mayor de 18**, cláusula en los términos, **retirada de cuentas de menores detectadas** (la política actual ya lo prevé) y **no dirigir el marketing a menores**.
   - **Riesgo específico que no hay que ignorar:** creadores de **16–17 años** que hagan publicidad. El trabajo de menores en espectáculos y publicidad está sometido a requisitos laborales (autorización) [D]. **ASE.**
   - [A] DSA: la protección reforzada de menores en plataformas (art. 28) forma parte de la **sección 3**, de la que quedan excluidas las micro y pequeñas empresas (art. 19).

### 3.3 Cookies y almacenamiento local: análisis uso por uso
**Principio.** [B] LSSI art. 22.2 exige consentimiento para almacenar o leer información en el dispositivo, **excepto** el almacenamiento técnico para transmitir una comunicación o el **estrictamente necesario** para un servicio **expresamente solicitado** por el usuario. **La norma no distingue entre cookies y `localStorage`:** ambos son «almacenamiento en el dispositivo». *[No he podido leer la guía de la AEPD ni las Directrices 2/2023 del CEPD, que concretan estos criterios; el análisis siguiente es IJR.]*

Usos reales encontrados en el **código de la app** (no en la landing):
| Elemento | Qué guarda | Finalidad | Análisis | Conclusión |
|---|---|---|---|---|
| **Sesión de Supabase Auth** (cookies/almacenamiento de autenticación del módulo `@nuxtjs/supabase`) | Token de sesión | Mantener al usuario autenticado | Necesario para el servicio solicitado | **Exento — IJR fuerte.** *Verificar en el navegador los nombres y duraciones reales.* |
| `ciberan:post-draft:<id>` | Borrador de una publicación que el usuario está escribiendo | Que no se pierda el texto | Respuesta a una función que el usuario usa; guarda **contenido** que podría ser personal; persistencia **más allá de la sesión** | **Zona gris — IJR:** defendible como «entrada del usuario» si es corta duración; si se conserva indefinidamente, **más difícil de justificar**. Opciones: guardarlo en servidor o acotar caducidad |
| `ciberan:tour:v1:<id>` | «Ya vi el tutorial» | Mostrar el tour solo una vez | **Personalización de interfaz no solicitada expresamente** | **Zona gris, riesgo bajo — IJR:** no es estrictamente necesario; guardarlo **en la base de datos** (el perfil ya tiene `onboarding_completed_at`) elimina el problema |
| `ciberan:launch-notice:hide:v1:<id>` | «He cerrado el aviso de lanzamiento» | No mostrar el aviso otra vez | Igual que el anterior | **Zona gris, riesgo bajo** |
| `ciberan:discover-searches:v1:<tipo>` (clave antigua) | Búsquedas guardadas heredadas de una versión anterior; **se lee** para migrarlas | Migración | **Leer** también es acceso al dispositivo | Eliminar tras migrar |
| `useCookie`/preferencias de color | No encontrados en el código | — | — | Sin hallazgo |
| **Sentry** | Opcional, sin DSN no envía | Errores | No he comprobado si el SDK escribe almacenamiento en el cliente | Verificar antes de activar |

**Qué NO se puede concluir:** que «todo es exento». Lo que sí se puede decir: **la sesión es exenta (IJR fuerte)**; **el resto está en zona gris** y se resuelve **de forma barata sin banner**: (a) mover tour/avisos a la base de datos, (b) limitar y documentar los borradores, o (c) incluir un **banner mínimo informativo y, si se quiere conservar, una casilla de consentimiento**. **REC; ASE si se quiere decidir con garantías.** En cualquier caso, **informar en una política de almacenamiento local** es recomendable.

### 3.4 Fuentes secundarias
Todo lo basado en [C] o [D] va marcado IJR/REC/ASE. En particular **no se trata como obligación confirmada**: el calendario de factura electrónica y Verifactu, DAC7, PSD2/PSD3 aplicado a Stripe Connect, AI Act (art. 4 y 50), MASC aplicado a las condiciones, cuotas de autónomos, ventajas de la Ley 28/2022 y fiscalidad de las aportaciones no dinerarias.

---

## 4. Comparación de estructuras

> **Aviso:** las cifras de cuotas, impuestos y costes que figuran abajo proceden de fuentes secundarias [C] o conocimiento general [D] y **no están validadas**. **El asesor fiscal debe confirmar** tipos, cuotas, deducciones y plazos antes de decidir.

### 4.1 Las tres opciones
- **A. Un fundador empieza como autónomo y después entra el otro.**
- **B. Ambos empiezan como autónomos** (viable solo si cada uno factura su parte de forma independiente, o agrupándose en una **comunidad de bienes o sociedad civil**; ver abajo).
- **C. Constituir directamente una SL al 50 %.**

### 4.2 Tabla comparativa
| Criterio | A. Un autónomo | B. Ambos autónomos | C. SL 50/50 |
|---|---|---|---|
| **Responsabilidad frente a usuarios y terceros** | **Ilimitada** del autónomo titular con su patrimonio personal; el otro fundador no responde, pero **tampoco tiene derechos** | **Ilimitada** de cada uno; si se agrupan en CB/SC, **solidaria e ilimitada** de ambos por las deudas comunes [C] | **Limitada** al capital aportado (salvo responsabilidad de administradores y casos de levantamiento del velo) [D]. Capital mínimo **1 €** tras la Ley 18/2022, con reserva legal reforzada hasta alcanzar 3.000 € [C]; **el alcance exacto de la responsabilidad solidaria por la diferencia hay que verificarlo en la LSC** |
| **Titularidad de activos y 50/50** | **Los activos quedan a nombre del titular**; el 50 % del otro **no tiene protección** salvo pacto privado | Sin entidad, los activos comunes son **copropiedad o sociedad civil de hecho** (§2.3): inseguro | Los activos pasan a la sociedad mediante **aportación o cesión**; el 50/50 queda reflejado en **participaciones** inscritas |
| **Contratos con usuarios (términos)** | Contrata el autónomo | Contrata **cada uno** o la CB/SC: **confusión** sobre con quién contrata el usuario | Contrata la SL: **un solo contratante estable** |
| **Protección de datos** | Responsable único (o corresponsabilidad si ambos deciden) | **Corresponsabilidad** probable (art. 26); más documentación y más responsables personales | **La SL es el responsable**: el mejor encaje; DPAs y registro a su nombre |
| **Facturación** | Factura el autónomo; IVA, retención, modelos periódicos | Cada uno factura su parte o factura la CB con su NIF; **complejidad al repartir ingresos** y riesgo de que una parte facture lo que corresponde a la otra | Factura la SL; **relación socios-sociedad** (nóminas/dividendos/facturas de socios) a diseñar |
| **Seguridad Social** | Alta en RETA del autónomo cuando haya actividad habitual con ánimo de lucro [D]; **tarifa plana de 80 €/mes el primer año** [C] con prórroga posible; cuotas por ingresos reales; **sujeto a cambio** | Dos altas (una por socio) | **Socio-administrador con ≥ 25 % del capital → RETA (autónomo societario)** [D]: **dos cuotas igualmente**, sin la protección de la sociedad en cotización; verificar bonificaciones aplicables |
| **Propiedad intelectual** | Cesión **del otro fundador al autónomo** (¿por qué precio?); queda **desprotegido el no titular** | Cesión cruzada o gestión como bienes comunes | **Cesión/aportación de cada fundador a la SL**; es la estructura **más limpia** |
| **Impuestos [C/D]** | IRPF progresivo (hasta tipos altos) | IRPF de cada uno (atribución de rentas si CB); **riesgo de recalificación como SC → IS** [C] | **IS al 25 % general; tipo reducido para entidades de nueva creación** en los primeros ejercicios con beneficios [D]; coste de gestoría, contabilidad y cuentas anuales **más altos**; Ley 28/2022 de startups: posibles beneficios si se acredita ante ENISA [B] |
| **Costes y trámites** | Muy bajos | Bajos–medios (CB/SC) | **Notaría, Registro Mercantil, gestoría y obligaciones contables**; no he verificado cifras actuales |
| **Dependencia / conflicto entre socios** | **Alto riesgo**: uno controla la web, el otro no tiene derechos | **Alto riesgo**: sin estatutos, el desbloqueo es difícil | **Menor riesgo con pacto de socios y estatutos**; **igualmente 50/50 = riesgo de bloqueo** si no hay mecanismos |
| **Traslado posterior a una sociedad** | Hay que trasladar **todo**: contratos, cuentas, PI, datos, facturación; coste fiscal de la aportación [C/D] | Igual y además **disolver CB/SC** | **No hay traslado**: se arranca ya con la entidad correcta |
| **Riesgo principal** | **Perder la propiedad** o **la confianza** | **Responsabilidad solidaria y confusión** | **Coste y burocracia**; **no aplica protección** si no se cumplen formalidades |

### 4.3 Valoración (críticamente)
- **B «ambos autónomos» solo funciona como actividad conjunta si se agrupan** (CB/SC), con lo que **pierde sus ventajas** (responsabilidad ilimitada y solidaria). Si cada uno factura de forma independiente, **no encaja con un servicio único que contrata un usuario con un solo prestador**.
- **A** es la más barata pero **la que más expone el 50/50**; solo es aceptable como **puente corto** **con acuerdo firmado entre fundadores y con calendario de constitución de la SL**.
- **C** es la más limpia para titularidad, datos, contratos y PI, y la **única que alinea la responsabilidad con la intención 50/50**, a cambio de coste y burocracia **antes de tener ingresos**.
- **Mi lectura (REC + ASE, no definitiva):** salvo que el asesor fiscal encuentre un coste prohibitivo, **la SL antes del lanzamiento público y, desde luego, antes de cualquier cobro** es la opción más coherente; **mientras tanto**, aviso legal y política con el titular real (§2.1), **acuerdo privado entre fundadores** (§2.3) y **cesión de PI** (§2.5). **La decisión final es de los fundadores con el asesor.**

---

## 5. Mapa de riesgos

Convenciones: *Gr.* gravedad; *Pr.* probabilidad; *Sit.* situación (IC = incumplimiento confirmado · RP = riesgo potencial · OF = obligación futura · PV = pendiente de verificación); *Tipo* = OLC/IJR/REC/ASE; *Cambio* = C/B/D/X/P; *Fase* = A (ahora) / B (antes de abrir al público) / C (antes de monetizar) / D (antes de funciones futuras).

> **Supuesto condicionante:** los riesgos marcados con **†** dependen de que **la aplicación esté accesible a usuarios reales** (pregunta 1). Si hoy solo está accesible para vosotros, pasan a *Fase B*; si ya admite registro público, **son Fase A**.

### 5.1 Titularidad, identificación y relaciones entre fundadores
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida correctora | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 | **La app no identifica a su titular/responsable** (la plantilla de la app tiene los datos como «[POR COMPLETAR]») † | **Crítica** | Alta | **IC si la app es pública** | Sanción AEPD/consumo; usuarios sin información sobre quién trata sus datos | LSSI 10 [B]; RGPD 13.1.a [A] | Rellenar con el titular real (§2.1) y coherente con la landing | OLC | D (+C en `legal.ts`) | **A†** |
| R02 | **Sin acuerdo escrito entre fundadores**: el 50/50 solo es intención | Alta | Media | RP | Conflicto de socios; pérdida de propiedad; sociedad civil/CB de hecho con responsabilidad ilimitada | CC (copropiedad, sociedad civil) [D] | Acuerdo privado de fundadores + cesión recíproca de PI | ASE | D/P | **A** |
| R03 | **Cadena de titularidad del código incompleta**: tres autores en git (uno ajeno), repo en cuenta personal, uso de IA | Alta | Media | RP | Nadie puede aportarlo a la SL sin el otro; reclamación de un colaborador | TRLPI 17, 43, 45 [A/B] | Inventario de autores; cesiones escritas; aclarar «Codifiko» | OLC/ASE | D/P | **A** |
| R04 | **Incoherencia landing ↔ intención 50/50**: la landing afirma titularidad individual de nombre, logo y diseño | Media | Alta | RP | Declaración inexacta; prueba en contra del reparto | LSSI 10 [B] / veracidad | Alinear texto cuando se defina titular; no cambiarlo antes sin decidir | REC | D | A/B |
| R05 | **Cuentas y dominios a nombre de una sola persona o de un correo personal** (Gmail, GitHub, Netlify, Supabase, dominio) | Media | Alta | PV | Pérdida de acceso/continuidad; disputa | — | Inventario; segundo administrador; migrar a la entidad | REC | X/P | A |
| R06 | **Actividad económica sin alta fiscal/Seguridad Social cuando empiece a haber ingresos** | Alta | Media | OF/PV | Sanción tributaria y de Seguridad Social | [D] | Definir estructura **antes** del primer cobro | ASE | P | C |
| R07 | **Responsable único frente a corresponsables** sin decidir | Media | Alta | RP | Política de privacidad inexacta; acuerdo art. 26 inexistente | RGPD 4.7, 26 [A] | Decisión escrita de los fundadores (§2.2) | OLC si hay decisión conjunta / ASE | D/P | A† |

### 5.2 Protección de datos
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R10 | **Política de privacidad de la app incompleta/inexacta**: omite Google (SMTP), Sentry y el perfilado de búsquedas; cita proveedores apagados; sin plazos concretos | Alta | Alta | **IC si la app es pública** † | Sanción AEPD por falta de transparencia | RGPD 13 [A]; LOPDGDD 11 [B] | Reescribir en capas con datos reales (Fase 5) | OLC | D | **A†** |
| R11 | **Sin registro de actividades de tratamiento** | Media | Media | **IC si hay tratamiento no ocasional** † | Sanción formal | RGPD 30.5 [A] (la excepción de <250 empleados **no** aplica) | Crear el registro (`03_INVENTARIO`) | OLC | D | **A†** |
| R12 | **Sin contratos/condiciones de encargo archivados** (Supabase, Netlify, Google, Stripe, Sentry, OpenRouter) | Media | Alta | PV | Incumplimiento del art. 28; sin garantías de transferencias | RGPD 28 [D], 44–46 [D] | Descargar y firmar los DPA; anexar lista de subencargados | OLC (si están en el art. 28) / REC | D/X | A†/B |
| R13 | **Correo transaccional enviado desde una cuenta Gmail personal** (`info.ciberan@gmail.com`, contraseña de aplicación) | Alta | Media | PV | Sin DPA adecuado para tratar datos de usuarios; límites de envío y suspensión de la cuenta; suplantación | RGPD 28/32 [A/D] | Dominio propio + proveedor transaccional o Workspace con DPA | IJR | X/C | **B** |
| R14 | **Seguridad y resiliencia**: plan Free sin copias descargables ni recuperación a un punto; **una única base** para desarrollo, pruebas y producción | **Alta** | Media | PV/RP | Pérdida de datos; datos de pruebas mezclados con reales | RGPD 32.1.b–c [A] (disponibilidad, restauración) | Plan con copias, proyecto de producción separado, `pg_dump` periódico (ya decidido aplazar Pro hasta la revisión legal; **cuenta como medida de seguridad exigible**) | IJR | X/P | **B** |
| R15 | **Sin protocolo de brechas** | Media | Media | **IC** (ausencia) | Notificación tardía (72 h) y sanción | RGPD 33 [A] | Protocolo y registro de incidentes | OLC | D/P | **A†** |
| R16 | **Derechos RGPD sin procedimiento escrito**: existe descarga y borrado, pero no registro de solicitudes ni plazos | Media | Media | RP | Incumplimiento del plazo de un mes (prorrogable) | RGPD 12.3 [A], 15–22 [D] | Procedimiento y registro; verificar identidad | OLC | D/P | A† |
| R17 | **Sin política de conservación**: datos de reportes, `admin_audit_log`, `discovery_searches`, archivos | Media | Alta | RP | Violación de limitación del plazo; datos antiguos sin base | RGPD 5.1.e [A] | Plazos por categoría; borrado programado | OLC (principio) / IJR (plazos) | D/B/C | B |
| R18 | **Perfilado por búsquedas (`discovery_searches`) no informado** | Media | Media | IC en la política actual † | Falta de transparencia | RGPD 13 [A]; LOPDGDD 11 [B] | Informar o eliminar | OLC/IJR | D (o B) | A†/B |
| R19 | **Datos de categorías especiales en texto libre/archivos** sin barrera | Media | Baja | RP | Tratamiento ilícito de datos sensibles | RGPD 9 [D] | Cláusula de uso aceptable; procedimiento de retirada | REC | D/P | B |
| R20 | **Acceso del equipo a mensajes y archivos** sin regla escrita (¿cuándo puede leerlos?) | Alta | Media | PV | Vulneración del secreto de las comunicaciones y de la confianza | CE art. 18.3 [D]; RGPD 5, 13 [A] | Política interna: solo con reporte y motivo, registro de acceso | ASE | D/P/C | **B** |
| R21 | **Acceso de administración con contraseña compartida** (`ADMIN_PASSWORD`) y cuentas de prueba | Media | Media | PV | Acceso no atribuible; incumplimiento de seguridad | RGPD 32 [A] | Desactivar acceso compartido; cuentas personales; borrar cuentas de prueba (ya documentado) | IJR | X/P | **B** |
| R22 | **Menores** sin declaración ni control de edad | Media | Media | RP | Contratos anulables; datos de menores | CC 1263 [C]; RGPD 8 [A]; LOPDGDD 7 [B] | Declaración de ≥ 18, cláusula, retirada de cuentas detectadas | IJR/ASE | C/D | **B** |
| R23 | **Aceptación de términos sin guardar el texto aceptado ni la IP/dispositivo** | Media | Media | RP | No poder acreditar la aceptación | Ley 7/1998 5, 7 [A] | Guardar versión, hash del texto y fecha (ya hay versión+fecha) | OLC (incorporación) | C/B/D | **B** |

### 5.3 Cookies y almacenamiento
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R30 | **Almacenamiento no esencial en la app** (tour, aviso, borradores persistentes) sin consentimiento ni información | Baja | Media | PV | Infracción **leve** [B: LSSI 38.4.g/39 hasta 30.000 €] | LSSI 22.2 [B] | Mover a BD, acotar o consentir (§3.3) | IJR | C | **B** |
| R31 | **Sin política de cookies/almacenamiento de la app** | Baja | Alta | IC † | Falta de información | LSSI 22.2 [B] | Redactar; listar usos reales | OLC (información) | D | A†/B |
| R32 | **Landing: analítica con consentimiento** (estado inicial comprobado correcto; flujo completo no probado; script Netlify no identificado) | Baja | Baja | PV | Sanción si se instala antes del consentimiento | LSSI 22.2 [B]; guía AEPD [C] | Probar aceptar, rechazar y retirar con herramienta de red; documentar `hud` | REC | X/P | A |
| R33 | **Fuentes/íconos/CDN de terceros en la app desplegada** | Baja | Baja | PV | Transferencia de IP a terceros | RGPD 44 [D] | Comprobar peticiones externas tras el despliegue | REC | X | B |

### 5.4 Términos, DSA y moderación
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R40 | **«Seguir usando = aceptar» y cambios sin preaviso** | Media | Alta | IC (texto actual) † | Cláusula no incorporada/abusiva | Ley 7/1998 5.1, 7 [A]; TRLGDCU 82–91 [A] si hay consumidores | Aceptación expresa + preaviso ≥ 15 días (estándar P2B 3.2 [A]) | OLC (incorporación) | D/C | A†/B |
| R41 | **Cláusula amplia de limitación de responsabilidad** | Media | Media | RP | Nulidad parcial frente a consumidores; no protege | TRLGDCU 82–91 [A] | Reformular con justificación | ASE | D | B |
| R42 | **Sin punto de contacto público ni canal de notificación** (para terceros) | Media | Media | **IC si la app es un servicio de alojamiento público** † | Pérdida de la exención de responsabilidad; sanción (régimen español no verificado) | DSA 11, 12, 16 [A] | Canal público + procedimiento | OLC | C/D | A†/B |
| R43 | **Sin declaración de motivos al restringir/bloquear** | Media | Media | RP | Incumplimiento y reclamaciones | DSA 17 [A]; P2B 4 [A] (estándar) | Plantilla de motivación en el panel | OLC | C/D | B |
| R44 | **Condiciones sin política de moderación** | Media | Alta | IC † | Incumplimiento | DSA 14.1 [A] | Incluirla en términos | OLC | D | A†/B |
| R45 | **Reportes con imputaciones sin procedimiento de garantías** | Media | Media | RP | Reclamaciones; sanción por tratamiento | RGPD 5, 6, 17 [A] | Procedimiento, derecho de alegación, conservación limitada | REC/ASE | D/P | B |
| R46 | **Pasar el umbral de micro/pequeña empresa** activa la sección 3 del DSA | Baja | Baja | OF | Obligaciones de sistema interno de reclamaciones, etc. | DSA 19 [A] | Vigilar tamaño | REC | P | D |

### 5.5 Relación creador–partner, PI, publicidad
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R50 | **Sin contrato tipo de colaboración**: derechos de uso, exclusividad, cancelación, revisiones solo como campos | Alta | Media | RP | Conflicto entre usuarios; reclamación a CIBERAN por «parte» | TRLPI 43, 45 [B] (cesión por escrito) | Condiciones de colaboración + plantillas; aclarar que CIBERAN no es parte | ASE | D/C | **B** |
| R51 | **Cesión de derechos mal definida** (tiempo/territorio) | Media | Media | RP | Reclamación por usos fuera del acuerdo | TRLPI 43, 45 [B] | Campos de alcance + valores por defecto explícitos | IJR | C/D | B |
| R52 | **Derechos de imagen y música de terceros** | Media | Media | RP | Reclamación por vulneración | LO 1/1982 [D]; TRLPI [D] | Cláusula de garantía; canal de retirada | ASE | D | B |
| R53 | **Bucket público de imágenes** | Media | Media | RP | Exposición de imagen/archivos con URL; indexación | RGPD 5.1.f, 25, 32 [D/A] | Revisar qué va a público; borrado efectivo | IJR | B/X | B |
| R54 | **Publicidad no identificada** | Media | Media | RP (para usuarios; CIBERAN indirecto) | Prácticas desleales; reclamación | Ley 3/1991 art. 7.1 [A]; Ley 34/1988 art. 9 [A] | Exigir identificación en condiciones y en el formulario de entregable | OLC (para el anunciante/influencer) / REC (CIBERAN) | C/D | B |
| R55 | **Umbral RD 444/2024** para creadores grandes | Baja | Baja | PV | Obligaciones del creador (registro) | RD 444/2024 [A] | Aviso informativo | REC | D | D |

### 5.6 Monetización (todo **OF**: Fase C)
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R60 | **Calificación del flujo Stripe Connect + comisión del 10 %** como servicio de pago | **Crítica** | Media | OF/PV | Actividad regulada sin autorización | PSD2 art. 3.b y EBA Q&A 2020_5354 [B]; **texto oficial no leído** | **Opinión jurídica específica** antes de activar; revisar tipo de cargo y términos de Stripe | ASE | X/C | **C** |
| R61 | **Quién factura y con qué IVA/IRPF** sin definir | **Crítica** | Alta | OF/PV | Facturación incorrecta, sanciones | [D] | Modelo de facturación con asesor fiscal | ASE | P/C | **C** |
| R62 | **DAC7**: operador de plataforma | Alta | Media | PV | Sanción por no registrar/informar | RD 117/2024, OM HAC/72/2024 [C] | Análisis específico y alta/registro si procede | ASE | P | **C** |
| R63 | **Factura electrónica y Verifactu**: calendario incierto | Media | Media | PV | Incumplir al facturar | Ley 18/2022, RD 238/2026 y Verifactu [C] | Software de facturación conforme | ASE | X | C |
| R64 | **Suscripción Pro** sin información precontractual/desistimiento/botón | Alta | Media | OF | Nulidad, devoluciones, sanciones de consumo | TRLGDCU 97, 98.2, 102–108, 62.3, 85.2 [A] | Flujo de compra conforme; aviso de renovación a 15 días | OLC (si consumidores) | C/D | **C** |
| R65 | **Reembolsos, contracargos y disputas** sin política | Media | Media | OF | Pérdidas y conflictos | — | Política de pagos y reembolsos | REC/ASE | D/P | C |
| R66 | **Cuenta de Stripe a nombre del titular provisional** | Media | Media | OF | Dificultad para trasladar a SL | Condiciones de Stripe [D] | Constituir antes de activar o prever re-onboarding | ASE | X | C |

### 5.7 Funciones futuras (IA, redes)
| ID | Riesgo | Gr. | Pr. | Sit. | Consecuencia | Obligación y norma | Medida | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| R70 | **IA con modelo gratuito rotativo (OpenRouter)**: sin DPA, posible uso de los textos para entrenamiento, transferencia a EE. UU. | Alta | Alta | OF | Tratamiento sin garantías | RGPD 28, 44–46 [D] | Proveedor con DPA y sin entrenamiento; informar | ASE | X/C/D | **D** |
| R71 | **Transparencia de IA** (art. 50) y alfabetización (art. 4) | Media | Media | OF | Sanción AI Act | AI Act [A] (2024/1689 y 2026/1744 leídos) | Aviso en la interfaz; política de IA | IJR/ASE | C/D | D |
| R72 | **EIPD si se encienden perfilado o IA** | Media | Media | OF | Falta de evaluación | RGPD 35.3 [A] | Test de necesidad y EIPD documentada | OLC (si cumple 35.3) | D | D |
| R73 | **Reactivar redes sociales** (tokens, métricas) | Alta | Media | OF | Nuevos tratamientos y proveedores (Meta, Google) | Políticas de plataformas [D] | Reevaluar entero | ASE | C/D | D |
| R74 | **Contenido generado por IA** en entregables | Media | Media | OF | Dudas de autoría y de transparencia | AI Act 50.2 [A], TRLPI [A/D] | Cláusula de declaración | ASE | D | D |

---

## 6. Matriz de cumplimiento (por área)

Leyenda de prioridad: **P1** imprescindible ahora / **P2** antes del lanzamiento público / **P3** antes de monetizar / **P4** antes de funciones futuras.

| Área | Obligación o riesgo | Situación actual | Prioridad | Acción necesaria | Cuándo debe resolverse |
|---|---|---|---|---|---|
| **Aviso legal y titularidad de la web** | Identificar al prestador (LSSI 10 [B]) aunque no se cobre | Landing: resuelto con persona física. **App: sin datos** (plantilla con huecos). Coherencia con 50/50 sin resolver | P1 | Decidir titular real (§2.1) y rellenar `legal.ts` / crear página `/aviso-legal` en la app; alinear con la landing | **Ahora** (si la app es pública) / antes de abrirla |
| **RGPD y LOPDGDD** | Responsable identificado; deberes de información, registro, derechos, seguridad, brechas | Sin responsable decidido; sin registro, sin protocolo; derechos parcialmente cubiertos por funciones | P1 | Decidir responsable/corresponsables; registro; protocolo; procedimiento de derechos | Ahora / antes de abrir |
| **Política de privacidad** | Información completa (RGPD 13 [A]) | Plantilla incompleta e inexacta | P1 | Redactar versión en capas con datos reales (Fase 5) | Antes de abrir (ya si la app es pública) |
| **Registro de actividades** | RGPD 30.5 [A] | No existe | P1 | Crear (parte del inventario `03`) | Ahora |
| **Encargados y contratos** | RGPD 28 [D] | No archivados | P2 | Descargar y firmar DPA de Supabase, Netlify, Google/proveedor de correo, Sentry; registro de proveedores | Antes de abrir |
| **Cookies y almacenamiento local** | LSSI 22.2 [B] | Landing: consentimiento con analítica; app: sesión exenta + zona gris | P2 | Política; mover tour/aviso a BD; acotar borradores; probar flujo de la landing | Antes de abrir |
| **Términos y condiciones** | Ley 7/1998 5, 7 [A]; TRLGDCU [A] | Cláusulas problemáticas, sin versión por rol | P2 | Redacción por roles; aceptación expresa y registro | Antes de abrir |
| **DSA y moderación** | DSA 11, 12, 14, 16, 17 [A] | Reporte entre usuarios; sin canal público ni motivación | P1/P2 | Canal público, política de moderación, plantilla de motivos | Ahora si hay contenido público; antes de abrir |
| **Relaciones creador–partner** | Contrato claro; cesión por escrito (TRLPI 43, 45 [B]) | Solo campos y eventos; sin contrato tipo | P2 | Condiciones de colaboración + plantillas; declarar que CIBERAN no es parte | Antes de abrir |
| **Propiedad intelectual y derechos de imagen** | Cadena de titularidad; licencias; garantías de terceros | Cadena de código sin documentar; imagen sin cláusula | P1 (cadena) / P2 | Cesiones fundadores; cláusulas de licencia y garantía | Cadena: ahora |
| **Publicidad e identificación** | Ley 3/1991 7.1 [A], Ley 34/1988 9 [A] | Sin mecanismo | P2 | Cláusula + aviso en entregables | Antes de abrir |
| **Pagos, Stripe Connect y comisión 10 %** | PSD2 [B/D]; legal ASE | Apagado | P3 | Opinión jurídica; revisar Stripe; política de pagos | Antes de activar |
| **Facturación, IVA e IRPF** | Modelo fiscal; facturas [D/C] | Sin definir | P3 | Asesor fiscal; software conforme | Antes de activar |
| **DAC7** | Operador de plataforma [C/D] | Sin analizar | P3 | Análisis y registro si procede | Antes de activar |
| **Suscripciones PRO** | TRLGDCU 97, 98, 102–108 [A] | Apagado; texto con huecos | P3 | Flujo y textos conformes; baja equivalente al alta | Antes de activar |
| **IA y AI Act** | Transparencia; encargado; EIPD | Apagado; modelo gratuito rotativo | P4 | Proveedor con DPA; aviso; política | Antes de encender |
| **Relación entre fundadores y estructura societaria** | Acuerdo, cesión de PI, SL | Nada formalizado | P1 | Acuerdo de fundadores; decisión de estructura | **Ahora (acuerdo)**; SL antes de cobrar o abrir |

---

## 7. Plan por bloques

### A. Imprescindible ahora (también sin cobrar y en preview)
1. **Confirmar la URL y el acceso real de la app** (pregunta 1). Si es pública y admite registro: cerrar R01, R10, R11, R15, R31, R40, R42, R44 **antes de seguir captando usuarios** o **cerrar el registro** hasta tenerlo.
2. **Decidir titular y responsable del tratamiento** (§2.1–2.2) y alinear landing y app.
3. **Acuerdo privado entre fundadores** y **cesión de PI** (R02, R03).
4. **Registro de actividades** y **protocolo de brechas** (R11, R15).
5. **Probar el flujo de cookies de la landing** y documentar el script `hud` (R32).
6. **Inventario de cuentas, dominios y administradores** (R05).
7. **Identificar al autor «Codifiko»** y regularizar su aportación.

### B. Antes del lanzamiento público
Política de privacidad y términos por rol; aceptación expresa registrada; DPA con proveedores; correo con dominio propio (R13); copias y entorno de producción separado (R14); procedimiento de derechos y de conservación (R16, R17); política de moderación, canal DSA y plantilla de motivos (R42–R45); política de almacenamiento y limpieza de usos grises (R30); regla de acceso del equipo (R20); acceso de administración individualizado (R21); declaración de mayoría de edad (R22); condiciones de colaboración y plantillas de licencia (R50–R52); identificación de publicidad (R54); revisión del bucket público (R53); **decisión y constitución de la estructura societaria**.

### C. Antes de monetizar
Opinión sobre Stripe Connect (R60); modelo de facturación (R61); DAC7 (R62); calendario de factura electrónica (R63); flujo de suscripción y desistimiento (R64); política de pagos/reembolsos (R65); **SL constituida y cuentas de Stripe a su nombre** (R66); revisión de términos con comisión y cláusula de cesión de posición contractual.

### D. Antes de funciones futuras
IA (R70–R72, R74) y redes sociales (R73); revisión del umbral del DSA (R46); aviso sobre creadores grandes (R55).

---

## 8. Qué requiere obligatoriamente abogado o asesor fiscal

**Abogado (mercantil/digital/PI):**
1. Acuerdo de fundadores, estatutos y pacto de socios 50/50 (mecanismos de desbloqueo).
2. Cesión de derechos de propiedad intelectual (autores, IA, tercero «Codifiko»).
3. Calificación de la actividad de pagos con Stripe Connect y condiciones de Stripe.
4. Cláusulas de limitación de responsabilidad y relación con consumidores.
5. Trabajo de menores en publicidad (16–17 años) y estrategia de acceso solo a mayores.
6. Política de acceso del equipo a mensajes y secreto de las comunicaciones.
7. Régimen sancionador y competencias del DSA en España; AI Act cuando se active.
8. Corresponsabilidad RGPD si ambos deciden.

**Asesor fiscal/laboral:**
1. Elección de estructura (autónomo, CB/SC, SL), tipos, cuotas, tarifa plana, RETA de socios-administradores.
2. Aportación de activos intangibles y traslado de la actividad a una SL.
3. Modelo de facturación: IVA de la comisión, retención de IRPF, factura entre partes.
4. DAC7 (modelos 040 y 238) y su aplicabilidad.
5. Factura electrónica y Verifactu: calendario vigente.
6. Cuándo nace la obligación de alta aunque no haya ingresos.

---

## 9. Límites de esta fase

- **No se verificó** el texto oficial de: PSD2, DAC7, factura electrónica, AI Act y Reglamento 2026/1744, Código Civil (arts. 1263, 1301, 1665), Ley de Sociedades de Capital, Ley 20/2007 (RETA), guía de cookies de la AEPD, Directrices CEPD 2/2023.
- **Cuotas, tipos y costes** son orientativos [C/D].
- **La app no se auditó en su despliegue**; solo la landing pública y el código.
- No se ha accedido a conversaciones con el otro fundador, a las cuentas de proveedores ni al registro del dominio más allá de datos públicos.

---

## 10. Decisiones que deben tomar los fundadores

### 10.1 Titularidad y responsable RGPD
1. **¿Quién figura hoy como titular de la web/app?** (a) Alejandro solo, (b) ambos, (c) uno con acuerdo interno con el otro. *Debe resolverse antes de seguir captando usuarios.*
2. **¿Quién decide en la práctica sobre los datos?** Si ambos: **corresponsabilidad** con acuerdo escrito y punto de contacto único; si uno: **responsable único** y el otro **persona autorizada**. Elegid también **quién atiende** las solicitudes de derechos y quién responde ante la AEPD.
3. **Datos de contacto operativos**: ¿se mantiene `info.ciberan@gmail.com` o se pasa a correo con dominio propio? ¿Y a nombre de quién?
4. **¿Qué hacer con la landing**, que declara titularidad individual: mantenerla hasta decidir, o actualizarla cuando se fije la estructura?

### 10.2 Estructura empresarial
5. **¿Autónomo temporal o SL directa?** Decidid con el asesor fiscal, con calendario: **fecha límite para tener la SL** (propongo: *antes de abrir al público y siempre antes del primer cobro*).
6. **Si se empieza con un autónomo:** qué fundador, **qué compensa al otro**, y **firma del acuerdo** que reconozca el 50/50 y obligue a aportar a la SL.
7. **Reparto de funciones y desbloqueo** en un 50/50: árbitro, mediador o reglas de voto de calidad para decisiones bloqueadas.
8. **Vesting y salida:** qué pasa si uno de los dos deja el proyecto antes de la SL o en el primer año.

### 10.3 Propiedad intelectual
9. **Cesión del código, diseño, marca y documentación** de ambos a la SL (o entre vosotros mientras tanto), por escrito, con alcance, **duración y territorio** [TRLPI 43, 45].
10. **Identificar al autor «Codifiko»** y decidir si se cede, se licencia o se reescribe lo suyo.
11. **Uso de IA en el desarrollo:** política interna (qué se acepta, qué se revisa, qué se declara) y consulta al asesor sobre autoría.
12. **Marca y dominios:** **registro de marca** (OEPM) a nombre del titular definitivo; averiguar y dejar **a nombre de la entidad** los dominios `.com` y `.es`; dos administradores en cada cuenta crítica (GitHub, Netlify, Supabase, dominio, correo).
13. **Repositorio:** ¿se traslada a una organización de GitHub con permisos de escritura para ambos?

### 10.4 Monetización
14. **¿Cuándo se activarán los cobros?** Definir **hitos de entrada**: SL constituida, Stripe a nombre de la SL, modelo de facturación validado, opinión sobre PSD2/DAC7, términos y política de pagos publicados.
15. **Modelo de comisión y de factura:** ¿quién emite cada factura y a quién (comisión del 10 %)? ¿Se mantiene el 10 %? ¿Con qué IVA?
16. **Suscripción Pro:** precio real, ¿solo creadores o también partners?, ¿mensual con renovación?, política de baja y desistimiento. **¿Se admitirán consumidores?** Si no, **bloquear consumidores en los términos y en el alta**.
17. **Política de edad:** **solo mayores de 18**, con declaración expresa y retirada de menores detectados (recomendado), o aceptar 16–17 con asesoramiento laboral.

### 10.5 Seguridad y operación (decisiones previas al lanzamiento)
18. **Proveedor y plan de Supabase** (copias y entorno de producción separado) y **cuándo** (ya habéis decidido esperar a la revisión legal; esta fase recomienda que **no se abra al público** sin copias).
19. **Acceso del equipo a mensajes:** ¿en qué supuestos puede leerlos y quién? Dejarlo escrito antes de abrir.
20. **Retención por categoría** (cuenta inactiva, reportes, auditoría, búsquedas, archivos).
21. **Almacenamiento local:** ¿mover tour y avisos a la base de datos (sin consentimiento) o instalar banner? (recomendado: base de datos).

---

## 11. Preguntas concretas que necesito que respondáis

1. **¿En qué URL está accesible la app («preview») y quién puede registrarse hoy?** (cualquiera, con invitación, solo vosotros).
2. **¿Quién administra** las cuentas de Netlify, Supabase, el repositorio GitHub, el dominio (`.com` y `.es`) y el correo `info.ciberan@gmail.com`?
3. **¿Ambos fundadores toman las decisiones sobre qué datos se recogen y con qué fines**, o lo hace uno de los dos?
4. **¿Quién es «Codifiko»** (autor de un commit) y qué aportó?
5. **¿Alguno de los dos está ya dado de alta como autónomo**, o tiene otra actividad/empleo que afecte a la compatibilidad y a la cotización?
6. **¿Tenéis ya gestor/asesor fiscal o abogado?** Si no, priorizaría contratar uno **antes de abrir al público**.
7. **¿Se aceptarán consumidores** (personas que contraten fuera de su actividad) o solo profesionales y empresas?

---

*Fin del documento. No se han redactado versiones definitivas de documentos legales; la redacción corresponde a la Fase 5, tras las decisiones de §10.*

---

## 12. Actualización: respuestas de los fundadores (24-nov-2026) y su efecto

Respuestas recibidas: (1) la app está en `ciberan.com`; (2) hoy se aloja en Netlify con el dominio `.com`; (3) **los dos** deciden; (4) «Codifiko» es Mario; (5) **ninguno** es autónomo; (6) se aceptarán «todos» los tipos de usuario, **ajustado a los roles estipulados**.

### 12.1 Sobre la URL de la app: lo que he observado no coincide
Hoy, en `ciberan.com`, **solo está publicada la página «Muy pronto»**. He probado las rutas de la aplicación (`/login`, `/registro`, `/onboarding`, `/creator`, `/partner`, `/chat`, `/ayuda`, `/admin/login`, `/_nuxt/`) y **todas devuelven 404**; en el HTML de la landing solo hay enlaces a inicio, para quién, cómo funciona, aviso legal, privacidad y cookies.
Posibilidades (necesito que confirméis cuál es la real):
- **a)** La app **no está publicada** y «preview» se refiere a la landing o a lo que veis en local → **ningún riesgo † es de la Fase A**; pasan a Fase B. La landing es lo único público y sus textos (sin formularios ni registro) son coherentes con eso.
- **b)** La app está en **otra URL de Netlify** (por ejemplo, un despliegue de rama `*.netlify.app`) o protegida con contraseña → **hay que revisarla**: si cualquier persona puede registrarse ahí, los riesgos † pasan a **Fase A**. Pasadme esa URL.
- **c)** La app se publicará en `ciberan.com` sustituyendo a la landing → Fase B, con los textos de la app listos **antes** del cambio.

**Mientras no se aclare, no doy por incumplimiento confirmado nada de la app.**

### 12.2 Efecto de cada respuesta
| Respuesta | Efecto jurídico | Riesgos afectados |
|---|---|---|
| **Los dos deciden** | Se cumple el hecho que activa la **corresponsabilidad (RGPD art. 26.1 [A])**: **OLC**. Hay que redactar un **acuerdo entre corresponsables**, poner a disposición del interesado **sus aspectos esenciales** y designar, si se quiere, un **punto de contacto único** (art. 26.1–26.2). Cada interesado puede ejercer derechos **contra cada uno** (art. 26.3). | **R07 pasa a incumplimiento confirmado** en lo que toca a la información. **La landing declara a Alejandro como único responsable**, lo cual **no refleja** que decidís los dos: es una **inexactitud menor y fácil de corregir** (tratamiento muy limitado: analítica con consentimiento y correos), pero **debe corregirse** en la próxima actualización de la landing y **antes** de abrir la app. **Aviso legal:** si ambos prestáis el servicio, **figurad los dos** (o decidid expresamente que uno figure con el pacto interno del §2.1.c). |
| **«Codifiko» es Mario** | La autoría del código es de **dos personas**, no de tres. | **R03 baja a Media**: sigue haciendo falta **cesión escrita** y el reparto de propiedad **no puede deducirse del número de commits** (157 frente a ~37); precisamente por eso el acuerdo de fundadores debe fijar el 50/50 con independencia de quién escribió qué. Conviene unificar las **identidades de git** (cuatro nombres para dos personas) para que el historial sea legible, **con permiso explícito** y sin reescribir historia. |
| **Nadie es autónomo** | **No hay actividad registrada**. Mientras no exista actividad económica habitual y lucrativa, la obligación de alta **depende de los hechos** (ASE); **antes de cobrar**, alguien con NIF tiene que estar dado de alta o constituida la sociedad. | **R06** sigue como obligación futura; **refuerza** la recomendación de decidir la estructura **antes** del primer cobro y, si hay publicidad o ingresos en la landing, antes aún. |
| **Netlify + dominio `.com`** | Netlify (EE. UU.) es **encargado** del alojamiento: hace falta su **DPA** y que la política lo refleje (la landing ya lo cita con las garantías de transferencia). Los servidores de nombres que vi pertenecen a un proveedor distinto de Netlify, por lo que el **dominio se gestiona en otra cuenta** (probablemente el registrador) **cuyo titular debéis identificar**. | **R05, R12, R14**: inventario de cuentas y del registrador; DPA de Netlify; revisar si la app, cuando se publique, también irá en Netlify y con qué región. |
| **«Se aceptarán todos, ajustado a roles»** | Se acepta **la diversidad de condición jurídica de los usuarios**. Interpretación que propongo (a confirmar, §12.3): **creador** = persona, profesional o no, mayor de 18 años; **partner** = empresa, agencia, marca o profesional. | Ver §12.3 |

### 12.3 Consumidores y roles: qué cambia y qué decisión hay que tomar
La respuesta es ambigua en un punto que **cambia mucho el régimen aplicable**: **¿puede un «partner» ser una persona física que actúa fuera de su actividad profesional (un consumidor)?** En vuestros documentos, los partners son «marcas, empresas y anunciantes». Dos escenarios:

| | **Escenario 1: partner = siempre empresa o profesional** (recomendado) | **Escenario 2: partner puede ser consumidor** |
|---|---|---|
| **Entre creador y partner** | Relación **B2B**; no aplica el TRLGDCU a esa relación | El creador pasa a ser **empresario frente a un consumidor**: **información precontractual, desistimiento de 14 días, cláusulas abusivas y garantías** (TRLGDCU arts. 80–91, 97–108 [A]) en **sus** condiciones de colaboración |
| **P2B** (UE 2019/1150) | **No aplica** (no hay consumidores en la transacción) [A art. 1.2, 2.2] | **Sí aplica**: términos claros, motivar restricciones, preaviso de 15 días, etc. (arts. 3–4 [A]); reclamaciones y mediación solo si no sois pequeña empresa (art. 11–12 [A]) |
| **DSA** | Núcleo (arts. 11, 12, 14, 16, 17) | Se suma la **trazabilidad de comerciantes** (art. 30) **salvo exención por micro/pequeña empresa (art. 29)** [A] |
| **CIBERAN** | Solo ofrece herramientas a profesionales | Debe informar también como **mercado en línea** a consumidores (**TRLGDCU art. 97 bis**: parámetros de clasificación, si el vendedor es empresario, reparto de obligaciones [B]) |
| **Dificultad** | Hay que **comprobar y declarar** que el partner actúa como profesional | Mucho más coste jurídico para una fase inicial |

**Creadores.** Pueden ser **profesionales** o **aficionados sin actividad registrada**. Con CIBERAN (servicio gratuito de herramientas) un creador que **ofrece sus servicios a cambio de dinero** actúa, en la práctica, con propósito profesional (TRLGDCU art. 4 [A]) y por tanto **no sería consumidor frente a los partners**; **frente a CIBERAN**, podría considerarse consumidor mientras use la plataforma gratis o con fines no económicos (**IJR/ASE**). **Aceptar «de todo» sin matiz implica**: (1) textos que **respeten los derechos de consumidor desde el primer día** (no se pueden excluir) y (2) el riesgo de **fomentar actividad económica sin alta** entre creadores aficionados (**CIBERAN no debe dar a entender que no hace falta**; aviso informativo; **ASE**).

**Recomendación (REC):** **dos condiciones de uso separadas por rol**, con declaración expresa en el alta:
- **Creadores:** mayores de 18, «actúo con fines profesionales o de lucro» (casilla), consentimiento informado sobre sus obligaciones fiscales; **tratados como consumidores frente a CIBERAN** en lo que no sea indebidamente restringible.
- **Partners:** **empresas, agencias, marcas o profesionales** (declaración «actúo en el ejercicio de mi actividad»). **No admitir consumidores como partners en esta fase** (Escenario 1), a menos que los fundadores decidan asumir el Escenario 2.

### 12.4 Cambios en el mapa de riesgos
| ID | Antes | Ahora |
|---|---|---|
| R01, R10, R11, R15, R31, R40, R42, R44 (†) | Fase A si la app es pública | **Fase B** salvo que aparezca una URL pública con registro (§12.1) |
| R03 | Alta | **Media** (autores identificados: dos personas) |
| R07 | Riesgo | **Incumplimiento confirmado en la landing** (información de responsable), de **gravedad baja**; **OLC** del art. 26 al abrir la app |
| R22 (menores) | Media | Sin cambio; **declaración de mayoría de edad en ambos roles** |
| **R80 (nuevo)** | — | **Aceptar consumidores sin definir su papel**: **Alta**, probabilidad media, **IJR/ASE**; aplicar la separación por roles de §12.3; fase **B** |
| **R81 (nuevo)** | — | **Creadores aficionados sin alta** y posible fomento de actividad no declarada: **Media**, **ASE** (fiscal), fase **C** |
| **R82 (nuevo)** | — | **Identidades de git no unificadas** (cuatro nombres, dos personas): **Baja**, **REC**, fase **B** |

### 12.5 Decisiones que quedan pendientes tras vuestras respuestas
1. **Confirmar la situación real de la app** (§12.1: a, b o c) y, si es b), **la URL**.
2. **Elegir el escenario de consumidores** (§12.3): partner solo empresa/profesional (recomendado) o también consumidores.
3. **Aviso legal y privacidad:** **titulares y corresponsables** (ambos). Redactar el **acuerdo del art. 26** y decidir el **punto de contacto único**.
4. **Quién tiene la cuenta del dominio** (registrador) y quién administra Netlify; **dos administradores**.
5. **Fecha límite para la SL** (antes del primer cobro; idealmente antes de abrir la app).
6. **Unificación de identidades de git** (opcional, con consentimiento de Mario).

---

## 13. Estado de despliegue de la app (aclaración posterior)

**Declarado por los fundadores:** la aplicación **no está desplegada** y **no existe una URL pública**; `ciberan.com` es solo la página de presentación. Esto es **coherente con lo observado** (§12.1: solo la landing responde y las rutas de la app dan 404).

**Cómo lo trato:** como **hecho declarado, no verificado en el panel de Netlify**. Queda una **verificación residual pendiente** (no la he podido hacer: no tengo acceso a vuestras cuentas): revisar en Netlify (a) la lista de sitios del equipo, (b) si hay **despliegues de rama o previews** (suelen tener URL pública salvo que estén protegidos) y (c) en Supabase → Authentication si el **registro de nuevos usuarios** está habilitado y qué URL de redirección figura. Mientras eso no se compruebe, **no afirmo que no exista ningún despliegue**.

**Consecuencia de clasificación (aplicando vuestra regla):** si se confirma que la app no es accesible externamente, **todos los riesgos específicos de la app** (los marcados † y los que dependen de usuarios reales) se clasifican como **obligaciones que deben resolverse antes de la apertura al público (Fase B)**, **no como incumplimientos actuales**. Lo único que cuenta hoy como **incumplimiento menor confirmado** es lo ya detectado en la **landing** (la política declara un responsable único cuando decidís los dos; §12.2). Todo lo demás, que dependa de la normativa o la interpretación aún por verificar, **sigue abierto**.

Tabla de reclasificación (sustituye a la de §12.4 en lo que contradiga):
| Riesgos | Clasificación mientras la app no sea accesible |
|---|---|
| R01, R10, R11, R15, R16, R18, R31, R40, R42, R43, R44 | **Obligación a resolver antes de abrir (Fase B)** |
| R12, R13, R14, R20, R21, R22, R23, R30, R33, R45, R50–R54 | Fase B (algunos requieren decisiones previas) |
| R07 (corresponsabilidad) | **Landing: incumplimiento menor confirmado** (información del responsable). **App: obligación al abrir** |
| R60–R66 | Fase C (monetización), sin cambios |
| R70–R74 | Fase D, sin cambios |

---

## 14. Separación de roles y control de «Partner = consumidor»

### 14.1 Definición del modelo (decidido por los fundadores)
| Rol | Quién puede ser | Condición |
|---|---|---|
| **Creador** | Persona **mayor de 18 años**, **profesional o aficionada**, que ofrece servicios de creación de contenido | Declaración de mayoría de edad |
| **Partner** | **Marca, empresa, agencia o profesional** que contrata colaboraciones **dentro del marco de su actividad económica** | Declaración de actuar en el ejercicio de su actividad |
| **No admitidos como Partner** | Consumidores particulares que contraten creadores **para fines exclusivamente personales** | — |

Efecto de esta decisión (**IJR**, según las normas leídas en las Fases 2 y 3): la relación creador–partner queda **B2B**; el **P2B no aplica** (sin consumidores en la transacción; art. 1.2 y 2.2 [A]); no se activa la trazabilidad de comerciantes del **DSA art. 30** [A]; el TRLGDCU **no regula** esa relación (art. 3.1 y 4 [A]). **La condición es que el control funcione**: si entran consumidores, estos beneficios desaparecen para esas operaciones.

### 14.2 Qué NO puede lograr un control
1. **La declaración no es concluyente.** [A] El TRLGDCU define al consumidor por su **propósito real** («propósito ajeno a su actividad comercial, empresarial, oficio o profesión», art. 3.1) y al empresario por un propósito **relacionado** con ella (art. 4). Una casilla «soy empresa» **no cambia la calificación real**. Sirve como **prueba de buena fe, de información al creador y de motivo de baja**, no como blindaje. **IJR/ASE.**
2. **Casos mixtos** (un autónomo que contrata para su negocio y también para algo personal): la calificación depende del **propósito predominante** [D, **ASE**]. No intentéis resolverlo con redacción: **excluid el uso personal expresamente** en los términos y retirad al usuario que lo haga.
3. **No evitar el derecho de consumidor mediante cláusulas** («renuncia a los derechos de consumidor»): serían nulas (TRLGDCU 86 [A]).

### 14.3 Medidas propuestas (nada se implementa en esta fase; son requisitos para la Fase 6)
**Niveles de control, de menos a más intrusivo; recomiendo L0 + L1 + L3 y L2/L4 solo cuando haga falta.**
| Nivel | Medida | Qué comprueba | Coste/riesgo | Verificación de la fuente |
|---|---|---|---|---|
| **L0** | **Declaración expresa en el alta** de partner («actúo en el ejercicio de mi actividad económica y no contrato para fines exclusivamente personales»), con **versión y fecha guardadas** (como los términos) | Información + motivo de baja | Muy bajo | Diseño propio |
| **L1** | **Datos mínimos de empresa**: tipo (empresa/agencia/autónomo), razón social o nombre profesional, **NIF/CIF** o equivalente UE; comprobar **formato** | Que existe un identificador de actividad | Bajo; **minimizar**: es dato personal si el partner es autónomo | Diseño propio |
| **L2** | Para operadores de la UE, **consulta de NIF-IVA en VIES** y guardar el resultado | Que está registrado a efectos de IVA intracomunitario (no equivale a probar que contrata «para su actividad») | Medio; **no todos tienen NIF-IVA**; no vale para autónomos sin ROI | [C] AEAT/Comisión |
| **L3** | **Revisión manual del equipo** y marca de «verificado» (la tabla de partners ya tiene `verified_at`); **cola de revisión** de altas con señales de alerta | Control humano proporcionado | Medio (tiempo) | Hecho del código |
| **L4** | **Documento justificativo** (alta censal, escritura, etc.) solo si hay sospecha o antes de activar pagos | Prueba fuerte | Alto; **tratar con cuidado como dato personal** | Diseño propio |

**Señales de alerta para la cola de revisión (L3)** *(heurísticas, no normas)*: correo personal sin dominio de empresa; nombre de persona física sin actividad declarada; propuestas con fines privados («regalo», «boda», «cumpleaños», «felicitación»); ausencia de web o perfil de empresa; cuenta recién creada con propuesta inmediata de alto importe; coincidencia con un creador que se contrata a sí mismo.

**Reglas de funcionamiento:**
1. **Acceso gradual:** un partner **sin declaración** puede **explorar**, pero **no enviar propuestas ni aceptar condiciones** hasta completar L0–L1.
2. **Cláusula contractual:** uso **solo profesional**; **facultad de suspender o cerrar** cuentas que contraten con fines personales; **obligación de comunicar cambios** de actividad. Debe cumplirse con **motivación al afectado** (DSA 17 [A]; P2B 4 [A] como estándar).
3. **Evidencia:** conservar declaración, versión de los términos, fecha, resultado de VIES y decisión de revisión, con **plazo de conservación definido** y **sin datos innecesarios**.
4. **Auditoría periódica** (p. ej. trimestral) de partners aceptados y de la cola de señales.
5. **Protocolo si aparece un consumidor:** retirarlo del rol de partner; si ya contrató con un creador, **informar al creador** de que esa relación puede quedar sujeta a derecho de consumo (desistimiento y cláusulas abusivas) y **ofrecer cancelación de común acuerdo**; **ASE**.
6. **Lado creador:** si el partner es un profesional **autónomo**, vigilar que el propio creador **no** dé por supuesto que el partner es empresa sin comprobar; incluir en las condiciones de colaboración una **declaración mutua** de capacidad y de actuar profesionalmente.

**Cambios técnicos asociados (a planificar; NO se hacen ahora):** campos para tipo de entidad, identificador fiscal, declaración (versión y fecha), estado de verificación y notas; **cola de revisión** en el panel de administración; **bloqueo de «enviar propuesta»** hasta completar el alta de partner; entradas en el **registro de actividades** y en la **política de conservación**. **Tipo de cambio:** C, B, D.

### 14.4 Preguntas abiertas de este bloque
- ¿Admitiréis **autónomos** como partners sin NIF-IVA? (Entonces VIES no sirve; basta L0+L1+L3.)
- ¿Qué haréis con **agencias que contratan en nombre de terceros** (el tercero podría ser un particular)? Requiere cláusula y **ASE**.
- ¿Aceptaréis partners **de otros países de la UE**? (VIES útil; condiciones y Derecho aplicable: **ASE**.)

---

## 15. Creadores aficionados: circunstancias fiscales y de Seguridad Social

> **Este riesgo se mantiene separado (R81) y no se da por cerrado.** No presupongo que todo creador deba darse de alta; **tampoco que no deba**. Lo que sigue es un marco de circunstancias, apoyado en fuentes **secundarias [C]** (despachos, prensa y comentarios de jurisprudencia); **ninguna es texto oficial leído**. La decisión sobre cada caso es del creador con su asesor.

### 15.1 Lo que las fuentes señalan (verificación [C]; **ASE**)
- **IRPF:** los ingresos por publicidad, colaboraciones, patrocinios y similares **se declaran** como rendimientos de actividad económica; si el pagador es empresa española, la factura suele llevar **retención** (se citan tipos como el 15 %) [C].
- **Alta en Hacienda (censo, modelo 036):** las fuentes sitúan la obligación de alta **antes de iniciar la actividad** cuando hay una **actividad económica**; algunas sostienen que **desde el primer ingreso**; otras matizan por la naturaleza ocasional [C]. **No he encontrado una fuente oficial leída que lo cierre.**
- **Seguridad Social (RETA):** el criterio descrito es **actividad habitual, personal, directa y con ánimo de lucro**. [C] El **Tribunal Supremo** ha dicho que **no existe un mínimo de ingresos** que, por sí solo, exima de alta; la superación del **salario mínimo** funciona como **presunción refutable de habitualidad**. [C] Las fuentes citan a **influencers** como colectivo con ingresos habitualmente bajos y dudas de encaje. **Cifras del SMI no verificadas.**
- **Intercambios en especie** (productos, viajes): también pueden ser ingreso computable [D].

### 15.2 Circunstancias que **aumentan** la probabilidad de obligación (indicios, no reglas)
1. **Repetición**: varias colaboraciones remuneradas en el año.
2. **Importe**: ingresos anuales relevantes, sobre todo si **superan el SMI** (presunción [C]).
3. **Organización**: medios propios (equipo, estudio), colaboradores, marca personal, contratos recurrentes.
4. **Facturación**: se emiten o se piden facturas; el partner necesita factura para **deducir y retener** (frecuente en B2B).
5. **Pluriactividad**: otro empleo o actividad (afecta a cotización y compatibilidad, **ASE**).
6. **Exclusividad o dependencia económica** de un partner (riesgo de falsa autonomía; **ASE laboral**).

### 15.3 Circunstancias que **disminuyen** la probabilidad (también sin garantía)
Colaboraciones **puntuales y esporádicas**, importes muy bajos, **sin organización** de medios y **sin ánimo de lucro habitual**; **canjes ocasionales** de bajo valor [D]. **Nada de esto es una exención legal confirmada.**

### 15.4 Qué le toca a CIBERAN (y qué no)
- **No es asesor fiscal** ni debe decir «no hace falta alta». Ya figura en los términos que cada parte responde de sus obligaciones; conviene un **aviso informativo neutral** (sin garantías) en el alta de creador y en el primer cobro.
- **Antes de monetizar (Fase C)**: la identificación fiscal del creador será **necesaria** para facturar y, si se confirma que CIBERAN es operador de plataforma, para **DAC7** (R62; [C], **ASE**). Un creador **sin alta** puede **no poder emitir factura válida** al partner: **fricción real** que hay que resolver antes de cobrar.
- **Datos**: **no exigir** el estado de alta como requisito de registro hoy (no hay base clara y sería dato innecesario); sí **ofrecer un campo opcional** («tengo alta como autónomo/empresa») **solo si** se decide usarlo para avisos o para facturación. **Decisión de los fundadores.**
- **Riesgo propio**: no fomentar actividad no declarada; **no prometer** ingresos ni «sin papeleo»; evitar textos como «sin necesidad de ser autónomo».

### 15.5 Qué queda **abierto** (ASE fiscal y laboral)
1. Texto oficial del **Estatuto del Trabajo Autónomo** y de la **LGSS** sobre habitualidad, y el **umbral** vigente.
2. Si hay **obligación de alta antes del primer ingreso** y cómo se trata el **ingreso esporádico**.
3. **Retención e IVA** aplicables a un creador sin alta que factura.
4. Efecto de **DAC7** sobre creadores aficionados cuando se activen cobros.
5. Si CIBERAN puede o debe **limitar el cobro** a creadores sin alta.

### 15.6 Actualización del riesgo
| ID | Riesgo | Gr. | Pr. | Sit. | Tipo | Cambio | Fase |
|---|---|---|---|---|---|---|---|
| **R81** | Creadores aficionados sin alta con obligaciones fiscales o de Seguridad Social posibles; fomento involuntario de actividad no declarada | Media | Media | **Pendiente de verificación** | **ASE** (fiscal/laboral) | D (aviso), C (campo opcional), P | **B** (informativo) / **C** (identificación fiscal y facturación) |
| **R83 (nuevo)** | **Partner que actúa como consumidor** (control de rol ineficaz) | Alta | Media | **Riesgo potencial** (no hay app pública) | IJR/ASE | C, B, D, P | **B** |
| **R84 (nuevo)** | **Datos fiscales/identificativos de partners** recogidos sin necesidad o sin base | Media | Baja | RP | IJR | B, D | B |

---

## 16. Decisiones pendientes (actualizado)
1. **Verificar el despliegue** en Netlify y Supabase (§13) y anotar el resultado.
2. **Aprobar el control de partner** (§14.3): niveles L0–L4 y la regla de acceso gradual.
3. **Decidir** si se recoge el campo opcional de «alta como autónomo» en creadores (§15.4).
4. Mantener abiertas, sin inventar datos: aviso legal y política (corresponsables), SL y fecha límite, cesión de PI, dominio y cuentas, monetización.

---

## 17. Actualización del mapa tras las decisiones de la Fase 4 (24-nov-2026)

*Detalle de cada decisión en `04_FASE4_DECISIONES.md`. «Mitigado por decisión» significa que la decisión fija **qué hay que hacer**; el riesgo **no desaparece hasta ejecutar las tareas**.*

| Riesgo | Estado tras Fase 4 | Decisión asociada | Qué falta para cerrarlo |
|---|---|---|---|
| R01, R10 (titular y privacidad de la app) | Mitigado por decisión; pendiente de redactar | D01, D02, D07 | T01, redacción (Fase 5), correo con dominio |
| R02 (sin acuerdo de fundadores) | **Sigue abierto**, con contenido decidido en parte | D04a, D04b | Ámbitos y confidencialidad (D04c) y firma (T02) |
| R03 (cadena de titularidad) | Mitigado por decisión | D05 | Cesión escrita (T03) |
| R04 (landing vs 50/50) | Mitigado por decisión | D01, D06b | Corregir landing y titularidad de marca/diseño (T13) |
| R05 (cuentas y dominio) | Mitigado por decisión | D06a | T04, T05, V03, V08 |
| R06 (alta/estructura) | **Sigue abierto** (ASE) | D03 | Estructura fiscal y alta; SL antes del primer cobro |
| R07 (corresponsables) | Mitigado por decisión | D01, D02 | Acuerdo del art. 26 (T08) |
| R11, R15, R16 (registro, brechas, derechos) | Pendiente de ejecutar | D02, D12 | T08, T12 |
| R12 (encargados y DPA) | Pendiente de datos | — | V07 |
| R13 (Gmail) | Mitigado por decisión | D07 | T07 antes de abrir la app |
| R14 (seguridad y copias) | Mitigado por decisión | D15 | T11 |
| R17 (conservación) | Mitigado por decisión; cifras sin validar | D12 | Validar con abogado; borrado programado |
| R18 (perfilado de búsquedas) | Mitigado por decisión | D12 | Informar o eliminar (Fase 5) |
| R20 (acceso del equipo) | Mitigado por decisión | D11 | Protocolo y comprobación de registro |
| R21 (admin compartido) | **Sigue abierto** | D06a, D11 | Cuentas personales; revisar `ADMIN_PASSWORD` |
| R22 (menores) | Mitigado por decisión | D09 | Casilla, cláusula y baja |
| R23 (texto aceptado) | Pendiente de decisión técnica | — | Especificar guardado de versión+hash+fecha (Fase 6) |
| R30, R31, R33 (almacenamiento) | Mitigado por decisión | D13 | Cambios técnicos; política |
| R42–R44 (DSA) | Mitigado por decisión | D14 | Buzón, formulario, política |
| R50 (sin contrato tipo de colaboración) | Mitigado por decisión | D17, D18, D19 | T16 (redacción), T17 (campos obligatorios) |
| R51 (cesión mal definida: tiempo/territorio) | Mitigado por decisión | D18 | Campos obligatorios antes de aceptar; cláusula de reserva (Fase 6) |
| R52 (imagen, voz y música de terceros) | **Sigue abierto en parte** | D18 | Cláusula de imagen y voz aparte y garantía de titularidad; **ASE** |
| R53 (bucket público) | Sigue abierto | — | Revisar qué va a público |
| R54 (publicidad no identificada) | Sigue abierto | — | Cláusula de identificación en condiciones de colaboración (T16) |
| R88 (nuevo) | **«Negociación voluntaria» mal redactada frente a la LO 1/2025** y **falta de procedimiento de acreditación** | Media / Media / **Obligación procesal verificada [A]** (arts. 5, 7, 10) | D19 | Cláusula «negociación previa de buena fe» + procedimiento y registro de acreditación (documento firmado o prueba de recepción, fecha y contenido íntegro) |
| R89 (nuevo) | **Valores legales por defecto de la cesión** (TRLPI art. 43.2 [A]: 5 años, país de la cesión y modalidades deducibles del contrato) que contradicen «limitada a la campaña» si faltan campos | Media / Media / Riesgo potencial | D18 | Campos obligatorios antes de aceptar; cláusula de reserva; forma escrita (art. 45 [A]) |
| R90 (nuevo) | **Lenguaje de mandato o recaudación** cuando haya pagos | Alta / Media / Obligación futura | D17, D16 | Evitar términos de agente o recaudación; opinión PSD2 antes de cobrar |
| R60–R66 (monetización) | Bloqueado hasta puerta | D16 | Lista completa |
| R70–R74 (IA, redes) | Sin cambios | — | Fase D |
| R80 (consumidores) | Mitigado por decisión | D08 | T09 |
| R81 (aficionados sin alta) | **Sigue abierto** (ASE) | D10 | Habitualidad y alta; identificación fiscal al monetizar |
| R83, R84 (partner-consumidor; datos fiscales) | Mitigado por decisión | D08 | T09; minimización |
| **R85 (nuevo)** | **Exposición personal de los dos fundadores durante la beta sin SL** | Media / Media / Riesgo potencial | D03 | Escala limitada por oleadas; acuerdo de fundadores y cesión **antes de la primera cohorte** |
| **R86 (nuevo)** | **Lista de espera sin formulario compatible con la política vigente** | Baja / Alta / **Obligación al implantar** | D03 | Actualizar privacidad y elegir proveedor (D20) |
| **R87 (nuevo)** | **Decisión de `docs/15` (un único proyecto de Supabase) incompatible con D15** | Baja / Alta / Pendiente | D15 | Actualizar la decisión y documentarlo |

### 17.1 Estado de la documentación (Fase 5, 24-nov-2026)
Los borradores de la Fase 5 están en `CIBERAN_LEGAL/` (ver `00_INDICE_Y_ESTADO.md`). **Ninguno es publicable.** Referencias oficiales incorporadas: **TRLPI** arts. 17, 43, 44, 45, 48 y 48 bis (BOE-A-1996-8930, consolidado) y **LO 1/2025** arts. 2–12 (BOE-A-2025-76, consolidado a 04-06-2025). **Reflejo de D17–D19:** comprobado en el documento de decisiones (v0.5+) y en este mapa (filas R50, R51, R88–R90).

### 17.2 Ajustes tras la revisión focalizada del documento 11 (v0.2, 24-nov-2026)
| Riesgo | Estado | Notas |
|---|---|---|
| R52 (imagen, voz, música de terceros) | **Mitigado en parte** | Imagen y voz **separadas** de la licencia de PI (**Anexo C**; LO 1/1982 arts. 2.2, 2.3, 3, 7.6 [A]); menores y terceros tratados; **ASE** sobre validez de autorizaciones de terceros adjuntadas |
| R89 (valores por defecto de la cesión) | Mitigado por decisión | Ficha de licencia obligatoria (**Anexo A**), forma escrita y electrónica (LSSI 23.3 [A]) |
| **R91 (nuevo)** | Riesgo potencial (Media / Media) | **Exclusividad comercial** mal separada de la licencia exclusiva; posible nulidad por TRLPI 43.4 [A]; remuneración no pactada. **Anexo A2** y §7; **ASE** |
| **R92 (nuevo)** | Riesgo potencial (Media / Baja) | **Dependencia económica / falsa autonomía** con exclusividad larga (≥ 75 % de ingresos de un cliente; Ley 20/2007 arts. 11–12 [A]). Aviso en §7; **ASE laboral** |
| **R93 (nuevo)** | Riesgo potencial (Media / Media) | **Prueba insuficiente de la aceptación** (sin huella del texto, ficha ni copia descargable). **Anexo B** (REQ-01 a REQ-14, **futuros**); LSSI 23–24, 27–28 [A] |
| **R94 (nuevo)** | Riesgo potencial (Baja / Media) | **Confusión entre obligaciones legales de IA y contractuales**. §9.1 frente a §9.2; **texto del ómnibus 2026/1744 no leído** (**ASE**) |
| **R95 (nuevo)** | **Pendiente de verificación** (Media / Media) | **Calificación del creador aficionado** (¿consumidor?) y cláusulas aplicables. §1.3–1.5; **ASE** |
| **R96 (nuevo)** | Riesgo potencial (Media / Media) | **Consecuencias económicas del incumplimiento** sin reglas claras; riesgo de que CIBERAN parezca árbitro. §10; CIBERAN **no decide ni retiene dinero** |

### 17.3 Cierre de la revisión interna del documento 11 (v0.3, 24-nov-2026)
| Riesgo | Estado | Notas |
|---|---|---|
| R92 (TRADE) | **Reformulado** | El **75 % no basta por sí solo**: deben concurrir **todos los requisitos del art. 11.2 de la Ley 20/2007 [A]** y la **situación real prevalece** sobre la declaración del usuario; **ASE** |
| R93 (prueba de la aceptación) | **Reformulado** | **La confirmación en 24 h no es obligación universal**: el art. 28 LSSI [A] ofrece **dos vías**, y **excepciones** (28.3). **Obligatoria si alguna parte puede ser consumidora**; **no implantada hoy**; Anexo B (REQ-08, REQ-08 bis) |
| R94 (IA: legal frente a contractual) | **Verificado en texto oficial** | **Reglamentos (UE) 2024/1689 y 2026/1744 leídos [A]**: **art. 50, apartados 1 a 6, sin cambios**; **art. 4 sustituido**; **transición 2-dic-2026 solo para proveedores (50.2)**; aplicación general **2-ago-2026**. **Aplicación al creador: ASE** |
| R52 (imagen y voz) | **Precisado** | **Menores**: **madurez suficiente** (consentimiento del propio menor) **o representante legal con conocimiento previo del Ministerio Fiscal** (LO 1/1982 art. 3 [A]); **CIBERAN no fija edades ni procedimientos** |
| **R97 (nuevo)** | **Menores que aparecen en contenidos** de usuarios mayores de edad | Media / Media / Riesgo potencial | CIBERAN solo admite ≥ 18, **pero los contenidos pueden incluir menores**; **ASE** madurez, forma y normas laborales |
| **R98 (nuevo)** | **Titularidad y autoría de contenidos**: licencias sobre derechos que no se poseen; coautores, fotógrafos, editores, productores y terceros | Media / Media / Riesgo potencial | Anexo A (campo 16), §5.1; **subir un contenido no acredita los derechos**; **ASE** |

*Documento 11: sin bloqueos reales para considerar el borrador terminado como **borrador**; **no es publicable** hasta la revisión profesional.*
