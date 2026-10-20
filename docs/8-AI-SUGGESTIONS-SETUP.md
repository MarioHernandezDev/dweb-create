# 8. Activar las sugerencias de IA (Fase 4, gratis)

Versión "para tontos" de la pieza de IA de la Fase 4, igual que [`6-SUPABASE-SETUP.md`](./6-SUPABASE-SETUP.md) y [`7-STRIPE-SETUP.md`](./7-STRIPE-SETUP.md) lo fueron para Supabase y Stripe.

## 0. Qué hace esto y qué no

`/api/ml/predict` ya calculaba de verdad un `success_score` (0-100) con un modelo heurístico — eso **no depende de esto**, funciona sin ninguna clave. Lo que añade esta pieza son las 3-4 sugerencias cualitativas que acompañan a la puntuación (mejora de caption, hashtag alternativo, horario recomendado): eso sí necesita un LLM de verdad detrás.

Se usa [OpenRouter](https://openrouter.ai) en vez de la API de Anthropic/OpenAI directamente porque **tiene modelos marcados `:free`** — sin tarjeta, sin gastar nada, con un límite de peticiones por minuto/día más que de sobra para desarrollo y demos.

Si no configuras nada de esto, la app sigue funcionando exactamente igual que ahora: la puntuación se calcula y se guarda igual, y las sugerencias caen en el texto fijo de siempre (`suggestionsForDraft` en `mock-data.ts`). No es un bloqueante para nada más.

## 1. Crear la cuenta y la clave (esto lo tienes que hacer tú)

Igual que con Supabase y Stripe: esto no lo puede hacer Claude Code por vosotros.

1. Entra en [openrouter.ai](https://openrouter.ai) y crea una cuenta (con Google/GitHub es lo más rápido). No hace falta añadir ningún método de pago para usar los modelos gratuitos.
2. Ve a [openrouter.ai/keys](https://openrouter.ai/keys) → **Create Key**. Dale un nombre (p. ej. `feedma-dev`) y cópiala — empieza por `sk-or-v1-...`.

## 2. Copiar la clave a `.env`

```bash
# en tu .env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

`OPENROUTER_MODEL` ya trae un valor por defecto en el código (`nuxt.config.ts`) si lo dejas vacío, así que solo hace falta tocarlo si el modelo deja de estar disponible gratis (ver paso 3).

**Nota sobre modelos "reasoning":** a día de hoy, todo el catálogo gratuito de OpenRouter son modelos que "razonan" antes de responder (gastan parte de su presupuesto de tokens pensando, no solo escribiendo la respuesta final). Por eso `predict.post.ts`/`trends.get.ts` piden `max_tokens: 800` explícitamente — con un límite más bajo, el modelo se corta a mitad del razonamiento y el contenido final llega vacío (se ve como "no hay sugerencias", sin ningún error visible). Si cambias de modelo y vuelve a pasar, sube ese número antes de nada.

## 3. Si el modelo por defecto deja de funcionar

OpenRouter rota qué modelos están en su catálogo gratuito de vez en cuando (el que se usó al construir esta pieza, `meta-llama/llama-3.3-70b-instruct:free`, ya desapareció una vez) — si `nvidia/nemotron-3-super-120b-a12b:free` deja de existir o de ser gratis:

1. Ve a [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0) (filtro de precio 0, solo modelos gratis).
2. Copia el identificador exacto de otro modelo de la lista (el que aparece en la URL de su ficha, con el sufijo `:free`).
3. Cambia `OPENROUTER_MODEL` en `.env` por ese identificador. No hace falta tocar código.
4. Pruébalo primero con `curl` directo a `https://openrouter.ai/api/v1/chat/completions` antes de darlo por bueno — algunos modelos gratis están temporalmente saturados (error 429) o devuelven el razonamiento en vez de la respuesta final si `max_tokens` se queda corto.

## 4. Cómo probar que funciona

Con la clave ya en `.env` (reinicia `npm run dev` para que recoja la variable nueva):

1. Entra como `influencer@feedma.test`.
2. Abre una publicación existente (o crea una nueva desde el botón "+") y pulsa "Predecir" / "Predecir éxito".
3. Si todo va bien, las sugerencias que aparecen junto a la puntuación ya no son siempre el mismo texto fijo — cambian según el título/caption que hayas escrito.
4. Si algo falla (clave mal copiada, modelo no disponible, rate limit), no se rompe nada: la puntuación se calcula igual y las sugerencias caen de vuelta en el texto fijo. El error exacto queda en el log del servidor (`[ml/predict] fallo al pedir sugerencias al LLM`), no se le muestra al usuario como un fallo — para él, simplemente no hay sugerencias personalizadas esta vez.

## 5. Lo que queda fuera de esta primera versión

- **Consumo de créditos** (`credit_ledger`): cada predicción debería descontar 1 crédito del plan de la cuenta (ver [`3-ML-PIPELINE.md`](./3-ML-PIPELINE.md) §3.9), pero todavía no se ha decidido cómo se cargan créditos iniciales a las cuentas — de momento `/api/ml/predict` no cobra nada.
- **Caché/rate limiting propio**: por ahora se confía en los límites que ya impone OpenRouter a las claves gratuitas. Si el uso crece, convendría añadir un límite propio por usuario.
- **Motor de tendencias** (`GET /api/ml/trends`): ya construido por separado, reutiliza esta misma clave — ver `docs/CHANGELOG.md` (entrada "Motor de tendencias real").

## Próximos pasos relacionados

- Cómo está pensado el pipeline completo (features, prompt, formato de salida): [`3-ML-PIPELINE.md`](./3-ML-PIPELINE.md)
- Qué hace de verdad `/api/ml/predict` hoy: `server/api/ml/predict.post.ts`
- Checklist general de fases: [`../README.md`](../README.md)
