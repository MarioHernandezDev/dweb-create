# Auditoría A-R9: cómo funciona hoy la "Predicción de éxito"

> Solo lectura de código y documentación. **No se ha cambiado ningún comportamiento ni se ha ejecutado la predicción** (gasta créditos y llama a un servicio externo). Fecha: 2026-10-28.

## Conclusión corta

La predicción **no usa rendimiento histórico real en ningún caso**. Es una mezcla de dos cosas: una heurística de forma y, si hay clave configurada y el servicio responde, una nota de calidad dada por un LLM. Ninguna de las dos mira métricas, publicaciones anteriores, la audiencia, la plataforma ni la hora.

## Las tres señales, separadas

| Señal | Qué es | Qué mira | Dónde | ¿Está activa? |
|---|---|---|---|---|
| **1. Heurística** | Reglas fijas | Longitud del título (hasta 20 caracteres), caption de más de 40 caracteres, nº de hashtags (hasta 5) | [ml-heuristic.ts](../server/utils/ml-heuristic.ts) | **Siempre.** Resultado acotado a [5, 96], base 50 |
| **2. Evaluación por LLM** | Un modelo de lenguaje gratuito de OpenRouter puntúa 0–100 si el caption "tiene sentido, es atractivo y está bien escrito" y propone hasta 4 sugerencias | Título, caption y hashtags del borrador, más la puntuación heurística | [predict.post.ts](../server/api/ml/predict.post.ts) (`fetchAiEvaluation`) | **Solo si** `OPENROUTER_API_KEY` está definida (en este entorno local lo está) **y** el modelo responde con JSON válido en 15 s. Si falla, se cae a la heurística sola sin error |
| **3. Histórico real** | Predicción entrenada o calibrada con métricas de publicaciones anteriores | — | — | **No existe.** Ninguna línea del servidor lee `metrics`; la tabla ni siquiera se escribe (A-R8) |

### Cómo se combina
- Con LLM: `score = round(0,6 × calidad_LLM + 0,4 × heurística)`, limitado a [5, 96], `model_version = v1-heuristic+llm-2026.01`.
- Sin LLM: `score = heurística`, `model_version = v1-heuristic-2026.01`.
- `confidence` se guarda siempre en `null` a propósito (antes era un número aleatorio; ya corregido).
- El resultado se guarda en `ml_predictions` y **se descuenta 1 crédito** de `credit_ledger` después de guardar. Sin saldo: error 402 antes de llamar al LLM.
- Límite de uso: 10 peticiones por minuto (Mario, M-S1, en su rama; no está aún en `main`).

## Lo que la interfaz dice hoy

[SuccessScoreCard.vue](../app/components/ml/SuccessScoreCard.vue) ya es honesta en lo esencial:
- Muestra "Evaluado con IA sobre el contenido real de este borrador" o "Evaluado solo por la forma del borrador (longitud, hashtags) — sin IA disponible ahora mismo".
- Tiene una marca de "consejos generales" cuando no hay sugerencias específicas.
- Su comentario del código dice expresamente que nunca se ha afirmado mirar el historial.

## Discrepancias y riesgos detectados

1. **El nombre "Predicción de éxito" sugiere más de lo que hace.** Es una valoración de calidad de redacción y de forma, no una predicción de rendimiento. Lo recoge `PENDIENTES.md` como "heurística", pero esa frase es incompleta: omite el LLM.
2. **`docs/3-ML-PIPELINE.md` describe un diseño que no existe**: lista como features la plataforma, el tipo de contenido, la hora propuesta y `client_historical_avg_engagement` calculado desde `metrics`, y habla de Gradient Boosting en una fase posterior. Ninguna de esas features se usa. El doc debe marcar claramente qué es objetivo futuro y qué está implementado (se hará en A-R14).
3. **Las sugerencias de "horario" del LLM no tienen base:** el prompt no incluye plataforma, zona horaria ni datos de audiencia. Son consejos genéricos presentados como sugerencia concreta.
4. **El prompt interpola texto del usuario** (título, caption) sin delimitarlo. Un caption puede intentar manipular la nota. El impacto está acotado (la nota se limita a 0–100 y se mezcla al 60 %), pero no es robusto.
5. **No hay tests de `predict.post.ts`**; solo de la heurística (8 tests en `ml-heuristic.spec.ts`). La mezcla 60/40 y los dos `model_version` no están cubiertos.
6. **Un crédito se gasta aunque el LLM falle** (se cobra igual por la heurística sola). Es una decisión de producto, no la he tocado.

## Qué haría falta para una predicción basada en histórico (cuando haya datos)

Dependencias, en orden: A-R8a/A-R7/A-R8b (métricas por publicación escritas y vinculadas) → un mínimo de publicaciones con métricas reales.

Propuesta de reglas, **sin implementar**, para no presentar estimaciones como hechos:
- Usar histórico solo si el creador tiene al menos N publicaciones vinculadas con métricas de esa plataforma en una ventana reciente (N y ventana por decidir con datos reales; mi punto de partida sería ≥ 5 publicaciones).
- Con menos, la tarjeta sigue como ahora y lo dice.
- Con suficientes, la tarjeta muestra "basado en tus últimas X publicaciones" y la mediana real de las métricas de referencia, no un porcentaje de "probabilidad".
- Tests para los tres casos: sin histórico, histórico insuficiente, histórico suficiente.

## Estado y siguiente paso

- **A-R9 queda en "auditado y documentado".** No se cambia nada de comportamiento hasta que existan métricas reales.
- Trabajo de bajo riesgo posible ya (si lo apruebas más adelante): tests de la mezcla 60/40 y de los `model_version`, extrayendo la lógica de combinación a una función pura. No lo he hecho: es un cambio de código fuera de esta auditoría.
