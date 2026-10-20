export interface MySubscription {
  planId: string
  status: string
}

/**
 * Estado de pago del manager/influencer logueado (Fase 3): su suscripción
 * (si la hay) y si ya conectó su cuenta de Stripe Connect para cobrar. Solo
 * lee — las escrituras de verdad las hace el webhook, nunca el cliente (ver
 * server/api/stripe/webhook.post.ts).
 *
 * A propósito NO depende de `useMyInfluencer`/`useMyManager` para resolver
 * quién es el dueño: esos composables cachean su resultado durante toda la
 * sesión de pestaña, así que si `refresh()` dependiera de su `.value` podía
 * quedarse leyendo un dato de antes de pagar/conectar. Aquí se resuelve el
 * dueño directamente en cada `refresh()`, siempre fresco.
 */
export function useMyBilling() {
  const client = useSupabaseClient()
  const { role } = useMyRole()

  const subscription = useState<MySubscription | null>('my-subscription', () => null)
  const connectOnboarded = useState<boolean>('my-connect-onboarded', () => false)
  const loaded = useState<boolean>('my-subscription-loaded', () => false)
  const redirecting = useState<boolean>('my-billing-redirecting', () => false)

  async function refresh() {
    // `getUser()` en vez de `useSupabaseUser().value`: ese ref lo rellena
    // un listener aparte y puede no haberse enterado todavía de la sesión
    // en una recarga (ver role-guard.global.ts para el detalle del fallo).
    const { data: { user } } = await client.auth.getUser()
    const uid = user?.id
    if (!uid || (role.value !== 'manager' && role.value !== 'creator')) {
      loaded.value = true
      return
    }

    const table = role.value === 'manager' ? 'managers' : 'influencers'
    const ownerColumn = role.value === 'manager' ? 'manager_id' : 'influencer_id'

    const { data: ownerRow, error: ownerError } = await client
      .from(table)
      .select('id, stripe_connect_onboarded')
      .eq('profile_id', uid)
      .maybeSingle<{ id: string; stripe_connect_onboarded: boolean }>()
    if (ownerError) console.error('[useMyBilling] fallo al resolver el dueño:', ownerError.message)

    if (!ownerRow) {
      subscription.value = null
      connectOnboarded.value = false
      loaded.value = true
      return
    }
    connectOnboarded.value = ownerRow.stripe_connect_onboarded

    const { data, error } = await client
      .from('subscriptions')
      .select('plan_id, status')
      .eq(ownerColumn, ownerRow.id)
      .maybeSingle<{ plan_id: string; status: string }>()
    if (error) console.error('[useMyBilling] fallo al cargar la suscripción:', error.message)

    subscription.value = data ? { planId: data.plan_id, status: data.status } : null
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return subscription.value
  }

  async function subscribe(planId: 'pro' | 'agency') {
    redirecting.value = true
    try {
      const { url } = await $fetch('/api/stripe/create-checkout-session', { method: 'POST', body: { planId } })
      await navigateTo(url, { external: true })
    } finally {
      redirecting.value = false
    }
  }

  async function connectPayouts() {
    redirecting.value = true
    try {
      const { url } = await $fetch('/api/stripe/connect/account-link', { method: 'POST' })
      await navigateTo(url, { external: true })
    } finally {
      redirecting.value = false
    }
  }

  return { subscription, loaded, connectOnboarded, redirecting, refresh, ensureLoaded, subscribe, connectPayouts }
}
