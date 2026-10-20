# 7. Poner en marcha Stripe (Fase 3)

Versión "para tontos" de la Fase 3 del [`README`](../README.md), igual que [`6-SUPABASE-SETUP.md`](./6-SUPABASE-SETUP.md) lo fue para Supabase.

## 0. Por qué hacen falta DOS cosas de Stripe, no una

FEEDMA cobra de dos formas distintas (ver [`README`](../README.md) y [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md) §1.5):

1. **Suscripción normal**: el Manager o el Influencer pagan una cuota mensual a FEEDMA por usar el panel. Esto es un Stripe Checkout + Billing normal, como el de cualquier SaaS.
2. **Stripe Connect**: cuando una marca contrata a un influencer *a través de la plataforma*, el dinero tiene que llegar al influencer (o a su manager), no a FEEDMA — y FEEDMA se queda automáticamente con una comisión de esa transacción. Eso **no se puede hacer con un Checkout normal**: hace falta Connect, que es la pieza de Stripe pensada justo para marketplaces (Uber, Airbnb, Etsy… todos lo usan para pagar a terceros desde su plataforma).

Así que sí: **se crea con Connect activado**, desde el principio. No es una cuenta de Stripe "normal" a la que luego se le añade Connect — se configura así desde el primer paso.

## 1. Crear la cuenta (esto lo tienes que hacer tú)

Igual que con Supabase: Claude Code no puede crear cuentas externas ni aceptar los términos de Stripe por vosotros. Esto lo hace una de las dos personas del equipo, con su cuenta.

1. Entra en [stripe.com](https://stripe.com) y crea una cuenta.
2. Nada más entrar al Dashboard, confirma que estás en **modo de pruebas** (el interruptor "Test mode" arriba a la derecha) — **no actives el modo real ("Live mode") en todo este proyecto**, no hace falta negocio de verdad ni cuenta bancaria para desarrollar y probar.
3. En el menú lateral, ve a **Connect** → **Get started**.
4. Cuando te pregunte el tipo de integración/cuentas conectadas, elige **Standard**.

### Por qué Standard y no Express o Custom

Stripe Connect tiene 3 tipos de cuenta conectada (la cuenta que recibe el dinero — en FEEDMA, la del influencer o manager):

| Tipo | Qué significa | Para FEEDMA |
|---|---|---|
| **Standard** ✅ | El influencer/manager tiene su propio Dashboard de Stripe completo. Stripe se encarga de todo el papeleo (verificación de identidad, cumplimiento legal, soporte). FEEDMA solo pide el pago y se queda su comisión. | **Recomendado**: es el más simple de programar y el que menos responsabilidad legal asume FEEDMA (Stripe es quien verifica la identidad de cada influencer, no vosotros). |
| Express | A medio camino: onboarding más rápido y con la marca de FEEDMA, pero FEEDMA ya asume algo más de responsabilidad. | De más adelante, si el producto crece y queréis una experiencia más integrada. |
| Custom | FEEDMA construye toda la experiencia, incluida la verificación de identidad. Máximo control, máxima responsabilidad legal y de cumplimiento. | No para un proyecto de estudiantes en pruebas — es básicamente operar como una entidad financiera. |

## 2. Copiar las claves de prueba a `.env`

En el Dashboard (modo de pruebas), **Developers → API keys**:

- `Publishable key` (empieza por `pk_test_...`) → `STRIPE_PUBLISHABLE_KEY`
- `Secret key` (empieza por `sk_test_...`, hay que darle a "Reveal") → `STRIPE_SECRET_KEY` (⚠️ secreta, igual que la `SUPABASE_SERVICE_ROLE_KEY` — nunca en el chat, nunca en un commit)

`STRIPE_WEBHOOK_SECRET` se rellena más adelante, en el paso 4 — todavía no existe hasta que haya un webhook que firmar.

```bash
# en tu .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 3. Lo que viene después (esto ya lo monto yo)

Con las claves de prueba en `.env`, lo siguiente es código, no configuración manual — y es lo que toca cuando confirmes que has hecho los pasos 1 y 2:

- Rutas de servidor `server/api/stripe/create-checkout-session.post.ts` (suscripción) y el equivalente de Connect para que un influencer/manager conecte su cuenta de Stripe desde su perfil (`account_links` de Connect).
- `server/api/stripe/webhook.post.ts` para escuchar `checkout.session.completed`, `account.updated` (cuándo un influencer ya terminó de verificarse en Connect) y los eventos de ciclo de vida de la suscripción.
- Tabla `subscriptions` (ya existe en el esquema, `supabase/migrations/20261019120000_initial_schema.sql`) — falta la columna para guardar el `stripe_account_id` de Connect de cada influencer/manager; eso será una migración nueva.

## 4. Probar el webhook en local (cuando lleguemos ahí)

Stripe necesita mandarte los eventos a una URL pública, y en local (`localhost:3000`) no eres accesible desde fuera. Para probarlo sin desplegar nada:

```bash
# Instala el Stripe CLI (una sola vez): https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

El comando `stripe listen` imprime un `whsec_...` — eso es tu `STRIPE_WEBHOOK_SECRET` de pruebas, se pega en `.env`.

## Próximos pasos relacionados

- Flujo de pagos explicado con diagrama: [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md) §1.5
- Checklist general de fases: [`../README.md`](../README.md)
