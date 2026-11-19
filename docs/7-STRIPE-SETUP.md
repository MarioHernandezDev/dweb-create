# 7. Poner en marcha Stripe (Fase 3)

Versión "para tontos" de la Fase 3 del [`README`](../README.md), igual que [`6-SUPABASE-SETUP.md`](./6-SUPABASE-SETUP.md) lo fue para Supabase.

## 0. Por qué hacen falta DOS cosas de Stripe, no una

CIBERAN cobra de dos formas distintas (ver [`README`](../README.md) y [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md) §1.5):

1. **Suscripción normal**: el creador de contenido paga una cuota mensual a CIBERAN por usar el panel. Esto es un Stripe Checkout + Billing normal, como el de cualquier SaaS.
2. **Stripe Connect**: cuando un partner contrata a un creador *a través de la plataforma*, el dinero tiene que llegar al creador, no a CIBERAN — y CIBERAN se queda automáticamente con una comisión de esa transacción. Eso **no se puede hacer con un Checkout normal**: hace falta Connect, que es la pieza de Stripe pensada justo para marketplaces (Uber, Airbnb, Etsy… todos lo usan para pagar a terceros desde su plataforma).

Así que sí: **se crea con Connect activado**, desde el principio. No es una cuenta de Stripe "normal" a la que luego se le añade Connect — se configura así desde el primer paso.

## 1. Crear la cuenta (esto lo tienes que hacer tú)

Igual que con Supabase: Claude Code no puede crear cuentas externas ni aceptar los términos de Stripe por vosotros. Esto lo hace una de las dos personas del equipo, con su cuenta.

1. Entra en [stripe.com](https://stripe.com) y crea una cuenta.
2. Nada más entrar al Dashboard, confirma que estás en **modo de pruebas** (el interruptor "Test mode" arriba a la derecha) — **no actives el modo real ("Live mode") en todo este proyecto**, no hace falta negocio de verdad ni cuenta bancaria para desarrollar y probar.
3. En el menú lateral, ve a **Connect** → **Get started**.
4. Cuando te pregunte el tipo de integración/cuentas conectadas, elige **Standard**.

### Por qué Standard y no Express o Custom

Stripe Connect tiene 3 tipos de cuenta conectada (la cuenta que recibe el dinero — en CIBERAN, la del creador de contenido):

| Tipo | Qué significa | Para CIBERAN |
|---|---|---|
| **Standard** ✅ | El creador tiene su propio Dashboard de Stripe completo. Stripe se encarga de todo el papeleo (verificación de identidad, cumplimiento legal, soporte). CIBERAN solo pide el pago y se queda su comisión. | **Recomendado**: es el más simple de programar y el que menos responsabilidad legal asume CIBERAN (Stripe es quien verifica la identidad de cada creador, no vosotros). |
| Express | A medio camino: onboarding más rápido y con la marca de CIBERAN, pero CIBERAN ya asume algo más de responsabilidad. | De más adelante, si el producto crece y queréis una experiencia más integrada. |
| Custom | CIBERAN construye toda la experiencia, incluida la verificación de identidad. Máximo control, máxima responsabilidad legal y de cumplimiento. | No para un proyecto de estudiantes en pruebas — es básicamente operar como una entidad financiera. |

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

## 3. Ya está montado — esto es lo que hace cada pieza

Con las claves de prueba en `.env`, el código ya existe:

- `server/api/stripe/create-checkout-session.post.ts` — suscripción (el creador de contenido → plan "Pro"). Los precios están en código (`server/utils/stripe-plans.ts`), no hace falta crear nada en el Dashboard de Stripe.
- `server/api/stripe/connect/account-link.post.ts` — crea la cuenta Connect del creador (si no existe) y devuelve el enlace de onboarding de Stripe.
- `server/api/stripe/webhook.post.ts` — único sitio que escribe en `subscriptions` y en `stripe_connect_onboarded`: escucha `checkout.session.completed`, `customer.subscription.updated/deleted` y `account.updated`.
- Botones ya en `creator/profile.vue` ("Mejorar a Pro", "Conectar cuenta de pagos").

### Falta un paso tuyo: aplicar la migración nueva

`supabase/migrations/20261020090000_stripe_connect_accounts.sql` añade las columnas `stripe_connect_account_id`/`stripe_connect_onboarded` a `creators` (antes `influencers`) — Claude Code no tiene tu sesión del CLI de Supabase para aplicarla por ti:

```bash
npx supabase db push
```

## 4. Probar el webhook en local

Stripe necesita mandarte los eventos a una URL pública, y en local (`localhost:3000`) no eres accesible desde fuera. Para probarlo sin desplegar nada:

```bash
# Instala el Stripe CLI (una sola vez): https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

El comando `stripe listen` imprime un `whsec_...` — eso es tu `STRIPE_WEBHOOK_SECRET` de pruebas, se pega en `.env`. Mientras `stripe listen` esté corriendo (déjalo en una terminal aparte), cualquier pago de prueba real llega a tu servidor local.

### Probar de verdad (con el servidor y `stripe listen` corriendo a la vez)

1. Entra como `creator@feedma.test`, perfil → "Mejorar a Pro" → te lleva a Stripe Checkout.
2. Usa la [tarjeta de pruebas de Stripe](https://docs.stripe.com/testing#cards) `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC.
3. Al volver a CIBERAN deberías ver "Suscripción activada" y el plan ya no pone "Plan gratuito".
4. En el mismo perfil, "Conectar" en Cuenta de pagos → onboarding de Stripe (puedes rellenarlo con datos de prueba, Stripe te guía) → al volver debería verse "Verificada".

## Próximos pasos relacionados

- Flujo de pagos explicado con diagrama: [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md) §1.5
- Checklist general de fases: [`../README.md`](../README.md)
