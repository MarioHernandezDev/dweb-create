# CIBERAN — Informe maestro de la auditoría

> Fecha: 2026-11-03 · Alcance: fases 0 a 10 de `auditoria-completa.md`.
> Documentos: [00 Mapa](00_PROJECT_MAP.md) · [01 Técnica](01_TECHNICAL_AUDIT.md) · [02 Seguridad](02_SECURITY_AUDIT.md) · [03 QA funcional](03_FUNCTIONAL_QA.md) · [04 UX](04_UX_AUDIT.md) · [05 Pendientes](05_PENDING_WORK.md) · [06 Plan de correcciones](06_REMEDIATION_ROADMAP.md) · [07 Validación de críticos](07_CRITICAL_FINDINGS_VALIDATION.md) · [Plan de datos de demo](../demo/DEMO_DATA_PLAN.md) · [Storyboard](../demo/STORYBOARD.md) · [Informe del vídeo](../demo/FINAL_DEMO_REPORT.md)

## 1. Estado general

**CIBERAN funciona de verdad de punta a punta.** El recorrido completo, de «una marca encuentra a un creador» a «colaboración completada y valorada», se ha ejecutado en un ensayo y cuatro tomas de grabación en un entorno aislado. Pasa por 17 pasos y unas diez funciones de la base, sin un solo error de página en la toma final. Lo que se ve en el vídeo es la app real, sin montajes.

La auditoría encontró **un fallo crítico y cuatro altos de seguridad e integridad**. Los cinco están **corregidos y verificados en la base compartida**:
- Las altas nuevas quedaban sin ficha.
- Cualquiera podía inyectar avisos.
- El webhook de pagos no funcionaba con la API nueva.
- El navegador podía escribir estados y pagos.
- El navegador podía escribir el rol y la ficha cruzada.

También encontró y corrigió cuatro fallos funcionales que se veían en la interfaz:
- la privacidad del chat no se guardaba;
- las valoraciones fallaban;
- aparecía un aviso falso al publicar tras la aprobación;
- la predicción no se veía hasta recargar.

**Lo que impide el lanzamiento no es el código, sino lo que falta alrededor:**
- No hay despliegue ni scheduler (Q3).
- Hay un único proyecto de Supabase para todo.
- Los pagos no se han probado con Stripe de extremo a extremo.
- Los textos legales son una plantilla.

## 2. Preparación

| Para… | Valoración | Por qué |
|---|---|---|
| **Una demo** | **Lista** | Entorno aislado reproducible (`supabase db reset` más `scripts/seed-demo-video.mjs`), datos ficticios coherentes, flujo completo sin errores y vídeo guiado de 5:23 validado ([FINAL_DEMO_REPORT.md](../demo/FINAL_DEMO_REPORT.md)). Límites conocidos y no mostrados: pagos, OAuth real y estadísticas de YouTube. |
| **Producción** | **No lista** | Bloqueos: R-08 (proyecto de producción), R-17 (Q3), R-19 (despliegue), R-09 (Stripe S1-S9), R-18 (legal y Meta) y R-01 (rotar la contraseña de demo). Ninguno exige reescribir nada; varios dependen de decisiones del equipo. |

## 3. Puntuación orientativa por categoría

Escala de 0 a 10.

**Criterio:**
- **10:** verificado y sin pendientes relevantes.
- **7:** funciona y está verificado, con pendientes acotados.
- **5:** implementado, pero sin verificar de extremo a extremo o con huecos funcionales.
- **≤3:** roto o sin implementar.

Cada nota se apoya en las pruebas citadas. **No se da una nota global**: las categorías miden cosas distintas y promediarlas no significaría nada.

| Categoría | Nota | Prueba en la que se apoya | Qué la sube |
|---|---|---|---|
| Seguridad | **7** | RLS en 28/28 tablas, 57 políticas iguales a las migraciones, permisos por columna, funciones internas solo para `service_role`, secretos fuera del cliente; 5 migraciones aplicadas y verificadas | R-01, R-02, R-03 |
| Integridad de datos | **7** | Catálogo idéntico a las migraciones (32/32 funciones); 44/44 migraciones aplicables desde cero; trigger de alta corregido | R-05, R-06, R-07, R-08 |
| Pagos | **4** | Código completo e idempotente y webhook corregido, pero **sin prueba de extremo a extremo**; sin reembolsos; se puede completar sin pagar | R-09, R-10, R-11 |
| Calidad técnica | **7** | Typecheck real, 613 tests unitarios, 20 ficheros de integración, CI en verde, dependencias sin vulnerabilidades graves | R-27 a R-30 (duplicación, lint, E2E) |
| Calidad funcional | **8** | 22 flujos probados en el navegador; los 17 pasos de negocio enteros en cada ensayo y toma; 4 fallos corregidos | R-05, R-13, R-16 |
| UX | **7** | Identidad coherente, buenos estados vacíos y respuesta a las acciones; 14/28 páginas sin incidencias en axe | R-21 a R-26 (desbordamientos en el móvil, contraste) |

## 4. Problemas críticos

**No queda ninguno abierto.** El único crítico (H0-17, altas sin ficha) está corregido y verificado.

## 5. Pendientes principales (detalle en [06](06_REMEDIATION_ROADMAP.md))

| Prioridad | Pendiente |
|---|---|
| Seguridad | Rotar la contraseña de demo (R-01) · canales privados de «escribiendo…» (R-02) · límites de uso compartidos (R-03) |
| Datos | Aviso engañoso al aceptar una oferta (R-05) · registro de migraciones (R-06) · borrado de creadores con colaboraciones (R-07) · proyecto de producción separado (R-08) |
| Pagos | Stripe S1-S9 (R-09) · pago antes de completar (R-10, decisión) · fallos y reembolsos (R-11) |
| Funcional | Hidratación (R-13) · créditos por la heurística (R-14, decisión) · alta real en el navegador (R-16) |
| UX | Desbordamientos en el móvil (R-21) · contraste (R-22) · accesibilidad del tablero (R-23) · texto de la portada sobre las redes (R-25) |

## 6. Dependencias de Mario

| Tema | Qué hace falta de Mario | Qué desbloquea |
|---|---|---|
| `app/pages/login.vue` | Quitar la contraseña de demo | R-01 (rotación) |
| M-L1 (legal) | Datos reales en `app/utils/legal.ts` y revisión legal | A-R4 / R-18 (Meta) |
| `get_public_social_accounts` (función compartida) | Acordar la nueva firma | A-R12 / R-20 |
| M-L2 (borrado de cuenta) | Coordinar el comportamiento de la FK de `collaborations.creator_id` | R-07 |
| `server/utils/rate-limit.ts` (M-S1) | Almacén compartido | R-03 |
| Stripe y pagos | Ejecutar S1-S9 y decidir F-05 | R-09, R-10 |

## 7. Recomendaciones

1. **Convertir el ensayo de la demo en un test E2E** (R-29). El guion de Playwright y el Supabase local ya existen y habrían detectado F-01 y F-07 antes de esta auditoría.
2. **Separar entornos ya** (R-08). El Supabase local demuestra que el esquema se reconstruye entero desde las migraciones; producción no debería compartir proyecto con tests y cuentas demo.
3. **Tomar las cuatro decisiones de producto pendientes:**
   - Q3: hosting y scheduler.
   - F-05: ¿pago obligatorio antes de completar?
   - F-06: ¿cobrar créditos por la heurística?
   - Q4: ¿qué redes se anuncian?
4. **Activar los pagos solo después de S1-S9.**

## 8. Próximos pasos

| Cuándo | Qué |
|---|---|
| Inmediato, sin dependencias | R-05, R-21, R-22, R-24, R-25, R-02 |
| Con Mario | R-01, R-20, R-07, R-03 |
| Tras las decisiones | R-17 → R-08 → R-19 (despliegue); R-10 y R-14 (producto) |
| Antes de cobrar | R-09 → R-11 |
