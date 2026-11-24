# CIBERAN_LEGAL — Índice y estado de la documentación

**Fecha:** 24-nov-2026 (doc. 11 cerrado en v0.3) · **Fase:** 5 (redacción de borradores, primera versión) · **Estado general:** **ningún documento es publicable**; todos requieren revisión profesional (**ASE**) y la resolución de los `[POR COMPLETAR]`.
**Regla de lectura:** **[OLC]** obligación legal confirmada con fuente · **[REC]** recomendación · **[ASE]** pendiente de asesor · `[DEP: …]` depende de D04c, D20, D21, V01–V09 · **[A]** texto oficial leído · **[B]** oficial parcial · **[C]** secundaria · **[D]** sin verificar.
**Alcance provisional de todos los borradores:** usuarios **establecidos en España** (**D22 pendiente**: no hay decisión territorial definitiva).
**No incluido por D16:** pagos, comisiones, suscripciones.

---

## 1. Documentos

### 1.1 Análisis y decisiones (fases 1–4)
| Archivo | Contenido | Versión | Estado |
|---|---|---|---|
| `00_FASE1_DESCUBRIMIENTO.md` | Mapa funcional, datos, proveedores | 0.1 | Referencia (partes corregidas en Fase 3) |
| `01_FASE2_INVESTIGACION_NORMATIVA.md` | Normas aplicables y verificación | 0.1 | Referencia |
| `03_FASE3_MAPA_RIESGOS_CUMPLIMIENTO.md` | Riesgos, matriz, estructura, roles | **0.6** | Actualizado (§17, §17.1) |
| `04_FASE4_DECISIONES.md` | Decisiones **D01–D19** y tareas | **0.6** | D17–D19 cerradas; referencias oficiales de LO 1/2025 y TRLPI incorporadas |

### 1.2 Borradores de la Fase 5 (todos **NO PUBLICABLES**)
| N.º | Archivo | Público / interno | Estado | Dependencias que bloquean la publicación |
|---|---|---|---|---|
| 05 | `05_AVISO_LEGAL.md` | Público | Borrador v0.1 | **T01** datos de ambos fundadores; V03 (`.es`); estado de la marca (V04); buzones |
| 06 | `06_POLITICA_DE_PRIVACIDAD.md` | Público (capas 1 y 2) | Borrador v0.1 | T01; acuerdo del art. 26 (T08); proveedores (D20, V07); región de producción; **no afirmar medidas no implantadas** |
| 07 | `07_POLITICA_DE_COOKIES.md` | Público | Borrador v0.1 | V06 (nombres y duraciones), V05 (`hud`); **bloque B de la app solo si se implanta D13** |
| 08 | `08_TERMINOS_Y_CONDICIONES.md` | Público (Parte I común, II creadores, III partners) | Borrador v0.1 | Plazo de caducidad real; **ASE** cláusula de responsabilidad; registro técnico del texto aceptado |
| 11 | `11_CONTRATACION_COLABORACIONES.md` | Público (condiciones tipo + Anexos A, A2, B y C) | **Borrador v0.3** (revisión interna cerrada 24-nov) | **15 cuestiones para abogado** (al final del documento); campos obligatorios (T17); canal de negociación (T18); **Anexo B = requisitos futuros no implantados** |
| 15 | `15_MODERACION_Y_USO_ACEPTABLE.md` | Público (+ anexos internos) | Borrador v0.1 | Formulario y buzones (T07, T10); **ASE** régimen sancionador del DSA |
| 16 | `16_POLITICA_DE_CONSERVACION.md` | Público (resumen) + interno (tabla) | Borrador v0.1 | **Plazos sin validar (D12)**; V07 |
| 17 | `17_REGISTRO_DE_ACTIVIDADES.md` | **Interno** | Borrador v0.1 | T01, T08; V07; actualizar al abrir |
| 18 | `18_PROTOCOLOS_BRECHAS_Y_DERECHOS.md` | **Interno** | Borrador v0.1 | Asignar roles de brechas; **ASE** |

### 1.3 Documentos previstos que NO se han redactado (y por qué)
| Previsto en la estructura inicial | Estado | Motivo |
|---|---|---|
| 09 Condiciones para creadores / 10 Condiciones para partners | **Integrados en `08` (Partes II y III)** | Evitar duplicidad |
| 12 Pagos y reembolsos / 13 Suscripciones | **No redactar** | **D16** vigente |
| 14 Propiedad intelectual (política) | **Integrado** en `08` §8, `11` §5 y Anexo A | — |
| 16 (original) Política de IA | **Aplazado** | IA apagada (Fase D) |
| 18 (original) Proveedores y encargados | **Integrado** en `17` §3 | Registro de proveedores |
| 19 Checklist de prelanzamiento / 20 Revisión jurídica pendiente | **Cubiertos** por §2 y §3 de este índice | — |
| Acuerdo del art. 26 entre corresponsables; acuerdo de fundadores; cesión de PI; declaración de tenencia del dominio | **No redactados** | Requieren **abogado**; no son documentos públicos |
| Contratos de encargo (DPA) | **No redactados** | Se **descargan y archivan** de cada proveedor (V07) |

---

## 2. Cuestiones abiertas que condicionan los borradores

| Tipo | Elementos |
|---|---|
| **Decisiones pendientes** | **D22** (alcance territorial) · **D04c** (ámbitos y confidencialidad entre fundadores) · **D20** (proveedor de lista de espera y correo) · **D21** (tamaño de cohortes) |
| **Datos por comprobar** | **V01** despliegues de Netlify · **V02** registro en Supabase Auth · **V03** `.es` y registrador · **V04** anterioridades de marca · **V05** script `hud` · **V06** flujo de cookies de la landing · **V07** DPA y transferencias · **V08** inventario de cuentas · **V09** Sentry |
| **Datos que deben aportar los fundadores** | **T01**: nombre completo, NIF y domicilio de **ambos**; buzones con dominio propio; plazo de caducidad de solicitudes; proveedor de lista de espera |
| **Cambios técnicos previos a publicar ciertos textos (Fase 6; no se hacen ahora)** | Campos obligatorios de licencia; guardado del texto aceptado; declaraciones de edad y de partner; formulario y panel DSA; borrado programado; registro de derechos y de brechas; canal de solicitud de negociación; preferencias en base de datos (D13); proyecto de producción y copias (D15) |

## 3. Qué requiere asesoramiento profesional (resumen)
1. **Aviso legal y titularidad** hasta SL; domicilio público de personas físicas.
2. **Privacidad:** bases (interés legítimo de moderación, verificación de partners y estadísticas del buscador), perfilado de búsquedas, transferencias, DPA.
3. **Términos:** cláusula de responsabilidad, contratación electrónica, predisponente de condiciones tipo.
4. **Colaboración:** licencia/cesión, **imagen y voz**, derechos morales, **IA**, **falsa autonomía**, confirmación de la LO 1/2025 y adaptación del procedimiento de acreditación.
5. **DSA:** régimen sancionador, órdenes de autoridades (arts. 9–10), arts. 17.3 (confirmar íntegro).
6. **Conservación:** todos los plazos (especialmente reportes, auditoría, aceptaciones, DSA, derechos y brechas).
7. **Fiscal/pagos (futuro):** D16.
8. **Acuerdo de fundadores, estatutos, cesión de PI y marca.**

## 4. Lo que los borradores **no** afirman todavía
Los textos **no** presentan como implantadas la separación de entornos, las copias, el protocolo de brechas, el procedimiento de derechos, las cuentas personales de administración, el registro de acceso a contenido, las declaraciones técnicas de edad y de partner, ni los campos obligatorios de licencia. **Esas afirmaciones solo pueden publicarse cuando se implanten** (Fase 6).

## 5. Estado de cumplimiento de la Fase 5
| Entregable pedido | Archivo | Estado |
|---|---|---|
| Aviso legal | 05 | **Borrador completo** |
| Política de privacidad (capas y responsabilidades) | 06 | **Borrador completo** |
| Política de cookies y almacenamiento local | 07 | **Borrador completo** |
| Términos de la plataforma (creadores y partners) | 08 | **Borrador completo** |
| Condiciones de colaboración (con campos obligatorios de licencia) | 11 | **Borrador completo v0.3** (Anexo A de licencia con 16 campos, **A2** exclusividad comercial, **B** requisitos técnicos de aceptación, **C** imagen y voz) |
| Normas de moderación, reportes y contacto | 15 | **Borrador completo** |
| Política de conservación | 16 | **Borrador completo** (plazos **propuestos**) |
| Registro de actividades | 17 | **Borrador completo** |
| Protocolos de brechas y derechos | 18 | **Borrador completo** |
| Referencias oficiales BOE (LO 1/2025, TRLPI art. 43) y requisitos de acreditación | 04 (D18, D19) y 11 | **Incorporadas** |
| Coherencia D17–D19 en decisiones y mapa de riesgos | 03 y 04 | **Comprobada** |

## 5 bis. Revisión del documento 11 (v0.2 → v0.3)
| Punto pedido | Dónde se resuelve |
|---|---|
| 1. Titularidad del creador y licencias exclusivas | §5.1 |
| 2. Art. 48 bis TRLPI completo (falta de explotación, cinco años, comunicación de al menos un año, excepciones) | §5.2 |
| 3. Incumplimientos, retrasos, defectos, falta de respuesta, subsanación, cancelación y trabajo realizado, sin que CIBERAN sea árbitro | §10 |
| 4. Licencia de PI frente a imagen y voz, y terceros | §6 y Anexo C |
| 5. Creadores aficionados y posible condición de consumidor | §1.3–1.5 y cuestión n.º 5 para abogado |
| 6. Registro de aceptación como requisitos técnicos verificables | Anexo B (REQ-01 a REQ-14, **todos futuros**) |
| 7. Exclusividad comercial y su remuneración frente a la licencia exclusiva | §7 y Anexo A2 |
| 8. Art. 50 del AI Act frente a obligaciones contractuales | §9.1 y §9.2 |

### Correcciones de la v0.3 (cierre de la revisión interna)
| Corrección | Dónde |
|---|---|
| TRADE: el 75 % **no basta**; requisitos del art. 11.2 y primacía de los hechos | §7 |
| Menores en imagen y voz: **madurez suficiente** frente a **representante legal con Ministerio Fiscal** (LO 1/1982 art. 3); CIBERAN solo admite ≥ 18 pero **pueden aparecer menores** | §6.2–6.3 y Anexo C |
| Confirmación del art. 28 LSSI **no universal**: dos vías y excepciones; **no implantada hoy** | §2.4 y Anexo B (REQ-08, REQ-08 bis) |
| IA: **Reglamento (UE) 2026/1744 leído en texto oficial**; art. 50.1–50.6 sin cambios; art. 4 sustituido; transición solo para proveedores (50.2) | §9 |
| Autoría: «el creador es siempre el autor» sustituido; **solo se licencia lo que se posee o está autorizado**; campo 16 del Anexo A | §5.1 y Anexo A |
| Referencias cruzadas ajustadas en 01, 03, 04 y 08 | — |

## 6. Siguiente paso recomendado
1. **Aportar los datos de T01** y decidir **D20** y **D22** (o mantener el alcance provisional).
2. **Revisión por abogado** de los documentos 08, 11, 15 y 06 (los de mayor riesgo).
3. **Verificar** V01–V09 (la mayoría son consultas rápidas en paneles).
4. Pasar a la **Fase 6** (cambios técnicos) solo cuando se decida, para poder publicar sin afirmar medidas no implantadas.
