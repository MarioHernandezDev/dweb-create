# CIBERAN — Fase 2: investigación normativa y obligaciones aplicables

**Fecha de la investigación:** 24-nov-2026 · **Versión:** 0.1 (borrador interno, no es asesoramiento jurídico)
**Base:** hechos de la Fase 1 (`00_FASE1_DESCUBRIMIENTO.md`). Se asume lo que consta ahí: lanzamiento gratuito, pagos/IA/Google apagados, redes sociales aplazadas, titular sin definir.

---

## 0. Cómo leer este documento: niveles de verificación

Cada afirmación normativa lleva una etiqueta. **No te fíes de nada sin etiqueta fuerte para firmar un documento legal.**

| Etiqueta | Significado |
|---|---|
| **[A] Texto oficial leído** | Leído por mí en el texto oficial (DOUE vía BOE, o BOE consolidado), citando artículo y apartado |
| **[B] Fuente oficial, resumen** | Página oficial o texto consolidado cuya lectura fue parcial/resumida por la herramienta: el artículo es correcto, el matiz hay que confirmarlo |
| **[C] Fuentes secundarias** | Resultado de búsqueda (despachos, prensa especializada, divulgación). Útil para orientar, **no citable** sin contrastar |
| **[D] Conocimiento general, sin verificar** | Lo que sé de la norma pero que **no he podido contrastar hoy** con fuente. Hay que verificarlo antes de usarlo |

**Limitación técnica:** EUR-Lex devolvió páginas vacías a mis lectores automáticos. Lo conseguí leer en **PDF oficial del DOUE publicado por el BOE** (DSA, P2B, RGPD → etiqueta [A]). No he podido leer el texto oficial de: PSD2, DAC7 (Directiva 2021/514), AI Act ni Reglamento 2026/1744, guía de cookies de la AEPD, Ley 13/2022 (art. 94), LO 1/1982 ni los reglamentos fiscales. Esos puntos van como [B], [C] o [D] y están listados en el apartado 14.

---

## 1. Resumen: qué aplica a CIBERAN

Leyenda: **SÍ** = obligación presente · **CONDICIONAL** = depende de un hecho que hoy no está decidido · **FUTURO** = solo si se enciende una función · **NO** = no aplica con el modelo actual · **?** = no he podido concluir.

| # | Norma | ¿Aplica? | Por qué (en una línea) | Verificación |
|---|---|---|---|---|
| 1 | RGPD (UE 2016/679) | **SÍ** | Se tratan datos personales de personas en la UE | [A] |
| 2 | LOPDGDD (LO 3/2018) | **SÍ** | Desarrolla el RGPD en España | [B] |
| 3 | LSSI-CE (Ley 34/2002) | **SÍ** | Prestador de servicios de la sociedad de la información con sede en España | [B] |
| 4 | Cookies / almacenamiento (LSSI 22.2 + guía AEPD) | **SÍ**, pero hoy solo almacenamiento técnico exento | Sin analítica ni publicidad | [B]/[C] |
| 5 | Reglamento de Servicios Digitales (DSA) | **SÍ (parcial)** | Servicio de alojamiento y probable «plataforma en línea»; la exclusión de micro y pequeñas empresas (art. 19) libera de la sección 3 | [A] |
| 6 | P2B (UE 2019/1150) | **Probablemente NO** hoy; recomendable aplicar sus principios | Exige que los usuarios profesionales ofrezcan a **consumidores**; aquí contratan marcas (empresas) | [A] |
| 7 | TRLGDCU (consumidores) | **CONDICIONAL** | Solo para usuarios que actúen como consumidores (p. ej. creador sin actividad económica) | [A]/[B] |
| 8 | Ley 7/1998 de condiciones generales | **SÍ** | Términos y condiciones son condiciones generales | [A] |
| 9 | Servicios de pago (PSD2 + RDL 19/2018) | **FUTURO / CONDICIONAL** | Solo cuando se encienda Stripe Connect; depende del tipo de flujo | [B]/[D] |
| 10 | DAC7 (modelo 238) | **CONDICIONAL** | Depende de si CIBERAN es «operador de plataforma» y de la actividad | [C]/[D] |
| 11 | Facturación (Crea y Crece, Verifactu, IVA, IRPF) | **SÍ al facturar** | Calendario cambiante y con fuentes contradictorias | [C]/[D] |
| 12 | Publicidad y competencia desleal (influencers) | **SÍ (para los usuarios; CIBERAN debe facilitarlo)** | Contenido patrocinado | [A]/[B] |
| 13 | RD 444/2024 (usuarios de especial relevancia) | **NO para CIBERAN**; puede aplicar a creadores grandes | Umbrales altos | [A] |
| 14 | Propiedad intelectual / derecho a la imagen | **SÍ** | Contenido creado y cedido entre partes; licencia a CIBERAN | [A]/[B]/[D] |
| 15 | AI Act (UE 2024/1689) + ómnibus 2026/1744 | **FUTURO** | Predicciones apagadas; art. 50 exigible desde 02-08-2026 si se enciende. **Actualizado en Fase 5: textos oficiales de ambos reglamentos leídos (ver doc. 11 §9) → [A]** | [A] (antes [C]) |
| 16 | MASC (LO 1/2025) | **SÍ (efecto indirecto)** | Condiciona cómo se redactan y se resuelven las controversias | [C] |
| 17 | Ley 10/2025 de atención a la clientela | **Probablemente NO** | Sectores y empresas grandes; plazo de adaptación hasta 28-12-2026 | [C] |
| 18 | Ley 28/2022 (startups) | **OPCIONAL** | Beneficios fiscales si se constituye SL y se cumplen requisitos | [B] |
| 19 | DMA, Data Act, NIS2, protección de menores en entornos digitales | **No analizado** | Fuera de alcance de esta ronda | — |

---

## 2. Protección de datos: RGPD y LOPDGDD

### 2.1 Calificación de roles (cuestión central)
- **CIBERAN = responsable** de los tratamientos de cuentas, perfiles, colaboraciones, chat, avisos, moderación, seguridad y exportación/borrado. El responsable «determina fines y medios» (art. 4.7 RGPD) [D]; no hay duda en estos tratamientos.
- **Encargados (art. 28):** Supabase (BD/Auth/Storage), hosting, Google (SMTP), Sentry (si se activa). Requieren **contrato de encargo** (en la práctica, el DPA de cada proveedor, que hay que aceptar/descargar y archivar).
- **Stripe:** actúa en parte como **responsable independiente** (verificación de identidad, cumplimiento, antifraude) y en parte como proveedor de CIBERAN. Hay que leer sus condiciones para clasificar y reflejarlo en la política [D].
- **OpenRouter** (y el modelo que haya detrás): hoy **apagado**. Al encenderlo: encargado, con cadena de subencargados y posible transferencia a EE. UU. [D].
- **Creador y partner entre sí:** cada uno es responsable de lo que se envía por chat, archivos, valoraciones y comentarios. CIBERAN ofrece el canal. Riesgo de **corresponsabilidad** (art. 26): bajo en el chat; más discutible en fichas públicas y búsqueda. A valorar con abogado.

### 2.2 Obligaciones concretas
| Obligación | Texto | Qué implica para CIBERAN | Estado hoy |
|---|---|---|---|
| Bases de licitud (art. 6.1) | [A] RGPD 6.1 | Contrato para cuenta/colaboraciones; interés legítimo (seguridad, moderación) con ponderación documentada; obligación legal (fiscal); consentimiento solo para lo opcional | Política actual las enumera, sin análisis |
| Información (arts. 13-14; LOPDGDD art. 11 [B]) | [B] | **Capas:** primera capa con identidad, finalidad y derechos; segunda capa completa. La política actual es una sola capa | Parcial |
| Derechos (arts. 15-22) y plazo | [A] art. 12.3: **un mes**, prorrogable **dos** más, avisando en el primer mes | Canal, procedimiento y registro de solicitudes | Descarga y borrado existen; falta procedimiento escrito y registro |
| Registro de actividades (art. 30) | [A] art. 30.5: la excepción de <250 empleados **no vale** si el tratamiento **no es ocasional** o entraña riesgo | **Hay que llevar el registro**, aunque seáis dos personas | No existe |
| DPD (art. 37.1) | [A]: obligatorio si actividad principal = observación habitual y sistemática a gran escala o categorías especiales a gran escala | **Probablemente no obligatorio** hoy; revisar si la IA/perfilado crece | Sin DPD |
| EIPD (art. 35) | [A] art. 35.3: perfilado con efectos significativos, categorías especiales a gran escala, observación sistemática; [B] la AEPD publica listas orientativas (art. 35.4/35.5) | **Hoy no obligatoria**. Hacer un análisis previo (umbral) y archivarlo; **revisarla antes de encender IA o métricas** | No hecha |
| Seguridad (art. 32) | [D] | Medidas técnicas y organizativas proporcionales: RLS, control de acceso admin, cifrado en tránsito/reposo del proveedor, copias | Copias y entorno de prueba separados: **carencia** (plan Free, base única) |
| Brechas (arts. 33-34) | [A] art. 33.1: notificación a la AEPD **sin dilación y, de ser posible, en 72 h**, salvo improbabilidad de riesgo | Protocolo escrito, registro interno de incidentes, plantilla de comunicación | No existe |
| Transferencias (arts. 44-49) | [D] | Revisar Stripe, Google, Sentry, OpenRouter: decisión de adecuación (Marco de Privacidad UE-EE. UU.) o cláusulas tipo | A documentar |
| Menores | [A] RGPD art. 8: umbral por defecto 16 (los Estados pueden bajar a 13); [B] LOPDGDD art. 7: **14 años** | La base no es el consentimiento sino el contrato; **un menor no puede contratar válidamente** → exigir ser mayor de 18 y declarar mayoría de edad | Texto lo dice; no hay declaración ni control |
| Bloqueo de datos | [B] LOPDGDD art. 32 | Al suprimir, los datos que deban conservarse (fiscales, reclamaciones) se **bloquean** y se destruyen al prescribir su plazo | Política lo menciona vagamente |

### 2.3 Observaciones específicas sobre CIBERAN
1. **Texto libre** (brief, chat, comentarios, reportes): puede contener categorías especiales (art. 9) por iniciativa del usuario. Medida: cláusula de uso aceptable que lo desaconseje y procedimiento para borrarlas.
2. **`discovery_searches`** (qué busca cada usuario): perfilado de comportamiento. Hay que **declararlo en la política** (LOPDGDD art. 11: debe informarse si hay perfiles [B]) y fijar plazo de conservación.
3. **Bucket público de imágenes**: el borrado debe incluir los ficheros; hay riesgo de indexación y de uso de imagen de terceros.
4. **Datos de reportes y bloqueos**: son datos con riesgo reputacional; acceso solo del equipo, registro de actuaciones (ya existe `admin_audit_log`).
5. **Eliminación con historial compartido**: el flujo actual (solicitud + anonimización) es defendible, pero debe estar **escrito** en la política con su motivo (derechos de terceros y plazos de prescripción).

### 2.4 Digital Omnibus
[C] El **ómnibus de IA** se ha aprobado (ver §12). La parte que modifica el **RGPD/ePrivacy** (por ejemplo, la notificación de brechas solo si hay «alto riesgo»; reglas de cookies) **aparece como propuesta**; **no he podido confirmar que esté aprobada**. Mientras tanto, **rige el texto vigente verificado arriba** (72 h; consentimiento para cookies no exentas).

---

## 3. LSSI-CE, aviso legal y comunicaciones

Fuente: BOE-A-2002-13758, última versión consolidada leída 23-01-2025 (sin cambios posteriores visibles) [B]. Los artículos 10, 20, 21, 22 y 38-39 proceden de resumen, no de lectura literal.

- **Art. 10 (información general):** el aviso legal debe incluir **nombre/razón social, domicilio, email, NIF** y datos registrales si se es sociedad; precios con impuestos. → **Bloqueado por la decisión de titular.** [B]
- **Art. 20 y 21 (comunicaciones comerciales):** deben ser identificables; el envío no solicitado exige consentimiento salvo cliente previo y producto similar, con **baja sencilla y gratuita**. [B] → Los avisos del sistema (resumen de notificaciones) son **comunicaciones de servicio**, no comerciales; **no se debe enviar marketing** sin consentimiento. La baja por enlace ya existe.
- **Art. 22.2 (cookies):** consentimiento previo para almacenar/leer información en el dispositivo, **salvo** almacenamiento técnico necesario para el servicio solicitado. [B]
- **Sanciones:** [B] leves hasta 30.000 €, graves 30.001–150.000 €, muy graves 150.001–600.000 € (art. 39).

### Cookies hoy
Código: sin analítica ni publicidad; `localStorage` para sesión, preferencias y borradores [Fase 1]. Por tanto **hoy no hace falta banner**, pero sí:
1. **Política de cookies/almacenamiento** que lo diga y liste lo que se guarda (con su finalidad y duración).
2. **Verificar en el despliegue real** que el hosting, las fuentes e iconos no introducen peticiones a terceros.
3. [C] La AEPD exige que **aceptar y rechazar estén al mismo nivel** y que rechazar no sea más difícil; guía actualizada en julio de 2023 con plena exigibilidad desde enero de 2024. **Aplicará en cuanto exista analítica no exenta o publicidad** (la AEPD tiene además una guía sobre analítica exenta). No he podido leer la guía; hay que citarla desde aepd.es antes de redactar.

---

## 4. DSA — Reglamento (UE) 2022/2065

Todos los artículos de esta sección están leídos en **PDF oficial del DOUE** [A].

### 4.1 Calificación
- **Servicio de alojamiento de datos** (art. 6): almacena información facilitada por usuarios (perfiles, paquetes, publicaciones, archivos). **Sí.**
- **«Plataforma en línea»** (art. 3.i): servicio de alojamiento que, a petición del usuario, **almacena y difunde información al público**, salvo que sea una función menor y puramente auxiliar. «Difusión al público» (art. 3.k) = poner la información a disposición de un número potencialmente ilimitado de terceros. Las **fichas públicas de creadores y partners** y el «descubrir» encajan: **probablemente sí es plataforma en línea** (lo privado —chat, archivos de colaboración— no cuenta como difusión al público).

### 4.2 Qué obligaciones se aplican
| Artículo | Obligación | ¿Aplica? |
|---|---|---|
| **6** | No responsabilidad por contenido alojado si no hay conocimiento efectivo y se actúa con prontitud al tenerlo | Condiciona el diseño de la moderación: **actuar con rapidez al saber** |
| **11 y 12** | Punto único de contacto para autoridades y para usuarios, por vía electrónica, público; para usuarios, **no solo herramientas automatizadas** | **SÍ**: un email/formulario público y una persona que lo atienda |
| **14.1** | Las condiciones generales deben informar de restricciones al contenido, políticas, medidas y herramientas de moderación (incluida decisión algorítmica y revisión humana) y del sistema interno de reclamaciones | **SÍ**: política de moderación dentro de los términos |
| **16** | Mecanismo de **notificación y acción** de contenido ilícito, fácil de usar, por vía electrónica; la notificación suficientemente motivada da «conocimiento efectivo» | **SÍ**: hoy existe el reporte entre usuarios en colaboraciones; **falta un canal público** para terceros y fichas |
| **17** | **Declaración de motivos** a quien sufre restricciones (retirada, bloqueo de visibilidad, suspensión) | **SÍ**: hay que notificar el motivo cuando se bloquee/retire; hoy no hay plantilla |
| **19.1** | La **sección 3** (arts. 20-28: reclamaciones internas, resolución extrajudicial, alertadores fiables, medidas contra abuso, transparencia reforzada…) **no se aplica a micro y pequeñas empresas** (definición de la Recomendación 2003/361/CE); excepción: art. 24.3 | **Probablemente exento** mientras sea micro/pequeña; se mantiene 12 meses tras dejar de serlo |
| **24.3** | Comunicar, **a petición** del coordinador de servicios digitales o la Comisión, el número medio mensual de destinatarios activos | **SÍ** (no se exime) |
| **29** | La sección de «mercados en línea B2C» (arts. 29-32) no se aplica a micro y pequeñas empresas | Exento de todos modos |
| **30** | Trazabilidad de **comerciantes** cuando la plataforma permite a **consumidores** contratar a distancia con comerciantes (nombre, identificación, cuenta de pago, registro, certificación) | **Probablemente NO**: la contratación es entre empresas. **Si se aceptaran consumidores como compradores**, habría que revisarlo (aunque el art. 29 lo exime si es micro/pequeña) |

**Conclusión provisional:** CIBERAN debe cumplir el **núcleo de bajo coste** del DSA (contacto, términos con política de moderación, canal de notificaciones, motivación de restricciones, no hay obligación general de vigilancia), pero **no** la parte pesada mientras siga siendo micro o pequeña empresa. **Cuestión abierta:** el reparto de competencias supervisoras en España y la sanción aplicable (no verificadas).

---

## 5. P2B — Reglamento (UE) 2019/1150 [A]

- **Ámbito (art. 1.2 y 2.2):** servicios de intermediación en línea que permiten a **usuarios profesionales ofrecer bienes o servicios a consumidores** para facilitar transacciones directas, con relación contractual con la plataforma.
- **Aplicación a CIBERAN:** el destinatario del servicio del creador es **un partner (empresa)**, no un consumidor (art. 2.4: consumidor = persona física ajena a actividad profesional). → **Probablemente no se aplica** el P2B. Se aplicaría si se permitiera que **personas físicas actuando fuera de su actividad** contraten a creadores desde la plataforma.
- **Aun así conviene adoptarlo como estándar** (refuerza la equidad frente a la ley de condiciones generales y es barato):
  - **Art. 3.1:** condiciones sencillas, accesibles y con las razones de suspensión/terminación e información sobre propiedad intelectual.
  - **Art. 3.2:** notificar modificaciones en **soporte duradero** con **al menos 15 días** de antelación; derecho a resolver antes de que terminen. (**Sin efecto retroactivo**: art. 8, no leído, según búsqueda [C].)
  - **Art. 4:** motivar restricciones y suspensiones; **30 días** de preaviso para terminación total.
  - **Art. 11 y 12** (reclamaciones internas y mediadores): no se aplican a **pequeñas empresas** (art. 11.5 y análogo para art. 12) [A].

---

## 6. Consumidores y contratación online

### 6.1 ¿Quién es consumidor aquí?
- [A] TRLGDCU art. 3.1: persona física que actúa con propósito **ajeno** a su actividad comercial, empresarial, oficio o profesión. Art. 4: empresario es quien actúa **con propósito relacionado** con esa actividad.
- Creadores: la mayoría actuarán como profesionales (autónomos), pero **un creador sin actividad económica registrada puede ser consumidor** al contratar CIBERAN (p. ej. suscripción Pro). Los términos pueden **declarar uso profesional**, pero no excluir derechos de quien sea consumidor en la práctica.
- Partners: empresas, agencias y autónomos: normalmente B2B. **Visitantes** de la web: consumidores a efectos de LSSI y de información precontractual si hay contrato.

### 6.2 Si hay consumidores (al activar Pro/pagos)
Texto consolidado leído hasta el 04-11-2026 [A]/[B]:
- **Información precontractual a distancia (art. 97):** precio total con impuestos, coste por periodo en suscripciones (97.1.e), desistimiento, y **aviso de renovación con 15 días de antelación** en contratos de duración determinada con renovación (97.1.p). La Ley 10/2025 modificó los apartados 97.1.f y 97.1.p.
- **Botón de pedido (art. 98.2):** debe rotularse «pedido con obligación de pago» o fórmula equivalente.
- **Desistimiento (arts. 102-108):** **14 días naturales**, sin motivo; excepciones en art. 103 para servicio plenamente ejecutado o contenido digital cuyo suministro ya empezó **con consentimiento expreso y reconocimiento de pérdida del derecho**. Si no se informó, el plazo se amplía hasta **12 meses** (art. 105).
- **Baja:** art. 62.3: el consumidor debe poder resolver en la **misma forma** en que contrató; art. 85.2: la prórroga automática sin posibilidad real de oponerse es abusiva.
- **Cláusulas abusivas (arts. 80-91):** redacción clara; son nulas las cláusulas que limitan derechos básicos, falta de reciprocidad, cargas de la prueba desproporcionadas, sumisión a foro extranjero o arbitraje impuesto. **Revisar la cláusula 10 actual (responsabilidad)** y la de «uso continuado = aceptación».
- **Multas (art. 49.1):** hasta 1.000.000 € en muy graves (más el beneficio).
- **Cambios 2026:** el consolidado trae reformas de la Ley 10/2025 (en vigor el 28-12-2025) y otras de 2026 (RDL 4/2026, RDL 32/2026) sobre el art. 20 que **no he verificado** [D].

### 6.3 Condiciones generales (Ley 7/1998) [A]
- **Art. 5.1 y 5.5:** forman parte del contrato si el adherente **acepta su incorporación**; deben ser **transparentes, claras, concretas y sencillas**.
- **Art. 7:** **no quedan incorporadas** las condiciones que el adherente no pudo conocer de forma real y completa al celebrar el contrato, ni las ilegibles o ambiguas.
- **Consecuencia técnica:** la aceptación debe ser **expresa y registrada** con la versión; el texto aceptado debe poder recuperarse. Hoy se guarda versión y fecha, pero **no el texto** (Fase 1).

---

## 7. Pagos, comisión y servicios de pago

### 7.1 Hechos que determinan el análisis
- Hoy no se cobra. Cuando se active: Stripe Checkout + Connect, el dinero va a la cuenta del creador, CIBERAN retiene un 10 % (`application_fee_amount`).

### 7.2 PSD2 — qué se ha comprobado
- [B] **Exclusión del agente comercial (art. 3.b PSD2):** excluye pagos hechos a través de un agente comercial autorizado para negociar o concluir ventas **en nombre de solo una de las partes**.
- [B] **EBA Q&A 2020_5354 (03-12-2021):** una plataforma que **recibe el pago por cuenta del beneficiario no queda excluida por defecto**, aunque ese pago extinga la deuda del pagador; hay que analizar si **de verdad** tiene facultad para negociar o concluir la operación en nombre de una sola parte.
- **Aplicación:** si **CIBERAN nunca recibe ni custodia el dinero** (lo gestiona Stripe, que es entidad autorizada, y CIBERAN solo cobra su comisión), el riesgo regulatorio es **menor**, pero **depende del tipo de cargo de Connect** (directo/destino/«la plataforma es el comerciante»), de quién figura como vendedor ante el pagador y de las condiciones de Stripe. **No he podido verificar** estos extremos con fuentes oficiales.
- **PSD3/PSR:** no he podido confirmar su estado en noviembre de 2026 [?].
- **Recomendación:** no encender cobros sin una **opinión jurídica específica** y sin leer los términos de Stripe Connect para plataformas.

### 7.3 Facturación e impuestos
- **Quién factura qué** es una decisión pendiente (Fase 1, A4): la comisión es un servicio de CIBERAN al creador (y/o al partner); el creador factura al partner su servicio; hay que determinar IVA y **retención de IRPF** cuando el pagador sea empresa [D].
- **Factura electrónica B2B (Ley 18/2022 Crea y Crece) y Verifactu:** [C] las fuentes **se contradicen** en fechas (reglamento aprobado en marzo de 2026; calendario para sociedades y autónomos entre 2027 y 2028 y posibles nuevos aplazamientos). **No hay fecha confiable**. Regla práctica: **emitir facturas con un software de facturación que cumpla** y revisar el calendario de la AEAT cuando haya titular.

### 7.4 DAC7
- [C] Normas españolas: **RD 117/2024** y **Orden HAC/72/2024** (modelos 040 y 238); el **modelo 238 se presenta cada enero** para el ejercicio anterior, por vía electrónica, e incluye la diligencia debida de vendedores. [D] Califican como actividad relevante, entre otras, los **servicios personales** (tiempo o tarea a petición de un usuario).
- **Aplicación a CIBERAN:** **CONDICIONAL.** Depende de si CIBERAN es «operador de plataforma» (facilita que vendedores se conecten con usuarios para esa actividad), de si **conoce la contraprestación** (requiere pagos por la plataforma o información fiable) y de las **exclusiones** (p. ej. operadores que acreditan que su plataforma no puede generar vendedores sujetos a comunicación) [D].
- **Mientras los pagos estén apagados** la probabilidad práctica es baja, pero **el análisis debe cerrarse antes de cobrar**. No he podido leer ni la Directiva 2021/514 ni los reglamentos españoles.

---

## 8. Publicidad y colaboraciones de influencers

- [A] **Ley 34/1988 (General de Publicidad)**: art. 3: es ilícita la publicidad **engañosa, desleal o agresiva**; art. 9: los anunciantes deben **desvelar inequívocamente el carácter publicitario** de sus anuncios.
- [A] **Ley 3/1991 (Competencia Desleal)**, art. 7.1: es desleal **no dar a conocer el propósito comercial** de una práctica cuando no resulte evidente por el contexto. [B] Art. 26 (prácticas comerciales encubiertas; resumen no verificado literalmente).
- [B] **Código de conducta sobre el uso de influencers en la publicidad** (AEA, Autocontrol, IAB Spain): es autorregulación; no he podido leer el PDF. Quien se adhiere debe cumplirlo (art. 5.2 Ley 3/1991 [A]).
- [A] **RD 444/2024** (BOE-A-2024-8716): «usuario de especial relevancia» si ingresa **≥ 300.000 €** anuales (art. 3.1) **y** tiene **≥ 1.000.000** de seguidores en un servicio o **2.000.000** agregados y ≥ 24 vídeos (art. 4.1). Esos usuarios deben **inscribirse en el Registro estatal** y cumplir obligaciones audiovisuales y de protección de menores. **No afecta a CIBERAN como plataforma**; sí puede afectar a algunos creadores.
- **Qué debe hacer CIBERAN:** no es el anunciante ni el influencer, pero **no puede facilitar prácticas ilícitas**: (1) cláusula en las condiciones de colaboración que obligue a **identificar** la publicidad; (2) aviso en el formulario de entregable; (3) recoger el compromiso de ambas partes. **Recomendación, no obligación directa.**

---

## 9. Propiedad intelectual e imagen

- [A] **TRLPI art. 17:** el autor tiene el derecho exclusivo de explotación (reproducción, distribución, comunicación pública, transformación). → El contenido creado es **del creador** salvo cesión.
- [B] **Arts. 43 y 45 (resumen):** la cesión se limita a lo pactado en derechos, **tiempo y ámbito territorial**; **si no se pacta el tiempo, 5 años; si no se pacta el territorio, el país de cesión**; debe constar **por escrito**; es nula la cesión de obras futuras no determinadas. **Verificar antes de redactar.**
- [A] **Art. 88:** en obra audiovisual, el contrato de producción **presume cedidos** al productor los derechos de reproducción, distribución, comunicación pública y doblaje/subtitulado.
- **Aplicación al producto:** `usage_rights` y `exclusivity` ya existen como campos de colaboración. Falta: **plantilla de licencia/cesión** (alcance, duración, territorio, medios, exclusividad, remuneración), **licencia a CIBERAN** solo para alojar y mostrar, política de contenido de terceros (música, marcas, personas) y **cláusula de garantía** de que el contenido no infringe derechos de terceros.
- [D] **Derecho a la propia imagen (LO 1/1982):** no consultado; en cualquier colaboración con personas identificables se necesita consentimiento específico. Revisar antes de redactar.
- **IA y propiedad intelectual:** contenido generado por IA y su protección, **sin conclusiones verificadas**; se recomienda prohibir/regular en condiciones el uso de IA generativa en entregables o exigir su declaración.

---

## 10. Inteligencia artificial

- [C] **Ómnibus de IA:** Reglamento (UE) **2026/1744**, publicado en el DOUE el **24-07-2026**, en vigor desde el **27-07-2026**; aplaza las obligaciones de **alto riesgo** del Anexo III hasta **diciembre de 2027**. **No he podido leer el texto oficial.**
- [C] **Art. 50 del AI Act (transparencia):** exigible desde el **02-08-2026**; los sistemas de IA generativa ya comercializados tienen hasta el **02-12-2026** para el marcado del contenido sintético (art. 50.2). Las **directrices de la Comisión** sobre transparencia se habrían publicado en julio de 2026 (no verificado).
- [C] **Alfabetización en IA (art. 4):** sigue siendo obligación para quien despliega sistemas de IA, con reformulación por el ómnibus (no verificada).
- **Aplicación:** la función de predicción (texto de borrador → modelo de terceros → puntuación y sugerencias) está **apagada**. Cuando se encienda: CIBERAN sería **desplegador** de un modelo de uso general de un tercero, **no proveedor**. **No parece de alto riesgo** (Anexo III) [D]. Deberá cumplir **transparencia** (informar de que se interactúa con IA y de que las predicciones son estimaciones), medidas de **alfabetización**, información en la política de privacidad (transferencia a EE. UU., proveedor, finalidad), y valorar **EIPD** si se usa perfilado.
- **Fuera del alcance:** cualquier uso futuro de IA para decidir sobre usuarios (moderación automática o puntuación de fiabilidad) podría abrir otras categorías: **necesita análisis previo**.

---

## 11. Resolución de controversias

- [C] **LO 1/2025:** exige **actividad negociadora previa** (medios adecuados de solución de controversias) como **requisito de procedibilidad** en procesos civiles y mercantiles declarativos; vigente desde el **03-04-2025**; debe acreditarse documentalmente.
- **Implicación:** CIBERAN debe **ofrecer un canal de reclamación** documentado, con respuesta en plazo y registro, y las condiciones de colaboración deben incluir una **fase de negociación o mediación** previa. No obliga a CIBERAN a resolver disputas entre usuarios (los términos actuales ya lo aclaran), pero **sí fija cómo se canalizan**.
- [C] **Ley 10/2025 (atención a la clientela):** cubre servicios básicos de interés general y grandes empresas; **plazo de adaptación hasta el 28-12-2026**. **Probablemente no aplica** a CIBERAN; verificar umbral en el texto.
- **Cláusulas a revisar:** jurisdicción (los consumidores conservan su fuero, [A] TRLGDCU art. 90) y limitación de responsabilidad (no puede excluir derechos de consumidores ni dolo/negligencia grave) — se trata en la Fase 5.

---

## 12. Estructura societaria (efectos documentales)

- Sin titular definido no se puede cerrar aviso legal, política de privacidad, términos, DPA con proveedores, ni facturación.
- [B] **Ley 28/2022 (startups):** beneficios para empresas emergentes acreditadas por ENISA (tipo reducido del 15 % durante cuatro años, aplazamientos, etc.) con requisitos de **antigüedad, independencia, sede en España y carácter innovador**; **no reparto de dividendos y facturación < 10 M€**. Es **una razón adicional para decidir la SL antes de facturar**, no una obligación. **Hay que confirmar con el gestor** el encaje.
- **Pacto de socios (50 %/50 %):** no se encontró documento. Recomendado antes de lanzar: titularidad del código y la marca, decisiones por mayoría reforzada/desbloqueo, salida y valoración, confidencialidad, no competencia, cesión de propiedad intelectual a la sociedad.

---

## 13. Qué cambia respecto a los textos legales actuales (resumen)

| Texto actual | Problema detectado tras la Fase 2 |
|---|---|
| Sin aviso legal | Obligatorio por LSSI art. 10 [B] |
| Política de privacidad | Falta capa informativa, roles, transferencias reales, perfilado de búsquedas, plazos de conservación concretos, bloqueo, canal DPD/contacto y quién es el titular |
| Cookies | Sin política propia (el texto de la privacidad lo menciona en una línea) |
| Términos §12 «seguir usando = aceptar» | Incompatible con Ley 7/1998 art. 5 y 7 si no hay aceptación expresa registrada [A]; para cambios relevantes usar preaviso ≥ 15 días y derecho a resolver (P2B art. 3.2 como estándar) |
| Términos §10 responsabilidad | Revisar contra TRLGDCU arts. 82-91 [A] |
| Sin política de moderación | Exigida por DSA art. 14.1 y 17 [A] |
| Sin canal público de notificación | DSA art. 16 [A] |
| Sin condiciones de colaboración | No hay contrato tipo: publicidad identificada, cesión de derechos, imagen, revisiones, cancelación |
| Sin política de pagos/suscripciones | Requisitos del TRLGDCU art. 97-108 si hay consumidores |
| Sin política de IA | Obligaciones de transparencia al encender predicciones |

---

## 14. Lo que **no** he podido verificar (lista de pendientes para abogado)

1. Texto oficial de PSD2, del RDL 19/2018 y del estado de PSD3/PSR.
2. Directiva (UE) 2021/514 (DAC7), RD 117/2024 y Orden HAC/72/2024 (definiciones, umbrales, exclusiones, obligaciones de diligencia debida).
3. Calendario **vigente** de factura electrónica y Verifactu.
4. AI Act arts. 4 y 50 y Reglamento 2026/1744 en texto oficial; directrices de transparencia.
5. Guía de cookies de la AEPD (texto exacto) y listas de la AEPD de EIPD.
6. LSSI arts. 10, 20-22, 38-39 (literal); LOPDGDD arts. 7, 11, 12, 32 (literal).
7. TRLPI arts. 43 y 45 (literal); LO 1/1982; Código de Autocontrol (texto y fecha).
8. TRLGDCU art. 20 y 20 ter y reformas de 2026.
9. Ley 10/2025: umbral de «grandes empresas».
10. Estado de la parte RGPD/ePrivacy del Digital Omnibus.
11. Autoridad competente y régimen sancionador del DSA en España.
12. DMA, Data Act, NIS2, protección de menores en entornos digitales: sin analizar.

---

## 15. Fuentes

**Texto oficial leído [A]:**
- Reglamento (UE) 2022/2065 (DSA), DOUE L 277 — <https://www.boe.es/doue/2022/277/L00001-00102.pdf>
- Reglamento (UE) 2019/1150 (P2B), DOUE L 186 — <https://boe.es/doue/2019/186/L00057-00079.pdf>
- Reglamento (UE) 2016/679 (RGPD), DOUE L 119 — <https://www.boe.es/doue/2016/119/L00001-00088.pdf>
- Real Decreto 444/2024 — <https://www.boe.es/buscar/act.php?id=BOE-A-2024-8716>
- Ley 7/1998 — <https://www.boe.es/buscar/act.php?id=BOE-A-1998-8789>
- TRLGDCU — <https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555>
- Ley 34/1988 — <https://www.boe.es/eli/es/l/1988/11/11/34/con>; Ley 3/1991 — <https://www.boe.es/buscar/act.php?id=BOE-A-1991-628>; TRLPI — <https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930>

**Fuente oficial, lectura parcial [B]:**
- LSSI — <https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758>; LOPDGDD — <https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673>; AEPD, evaluaciones de impacto — <https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/evaluaciones-de-impacto>; EBA Q&A 2020_5354 — <http://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2020_5354>; Ley 28/2022 — <https://www.boe.es/eli/es/l/2022/12/21/28/con>; Ley 10/2025 — <https://www.boe.es/eli/es/l/2025/12/26/10>

**Secundarias [C] (solo orientación):**
- Ómnibus de IA y art. 50: Osborne Clarke, CMS, Goodwin, Gibson Dunn, Ropes & Gray (julio–agosto 2026); Parlamento Europeo (Legislative Train / EPRS).
- DAC7/modelo 238: KPMG, AEAT (preguntas frecuentes), Cuatrecasas.
- Factura electrónica/Verifactu: Holded, Emprendedores, WWWhatsnew (con fechas contradictorias).
- Cookies: AEPD (nota de prensa), Cuatrecasas, ECIJA. MASC: Uría, Ministerio de Justicia, ICAM.

---

## 16. Siguiente paso (Fase 3)

1. **Mapa de riesgos** graduado (crítico/alto/medio/bajo) cruzando esta fase con los hechos del producto.
2. **Matriz de cumplimiento**: cada obligación [A]/[B] → función técnica necesaria (registro de aceptación con texto, canal de notificaciones, motivación de restricciones, solicitud de derechos, política de conservación y borrado, etc.).
3. **Decisiones tuyas** que desbloquean la redacción (titular, hosting, facturación, calendario de pagos, política de edad) y que dejo como campos pendientes si no están.
