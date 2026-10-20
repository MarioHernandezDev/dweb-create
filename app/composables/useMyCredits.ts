/**
 * El saldo de créditos del influencer logueado — suma de `credit_ledger`
 * (ver README Fase 4, "Consumo de créditos"). No hay columna de saldo
 * cacheada: la tabla es un libro de movimientos, el saldo es su suma.
 * RLS ya permite leerla (política `credit_ledger_select_scoped`).
 */
export function useMyCredits() {
  const client = useSupabaseClient()
  const { influencer, ensureInfluencer } = useMyInfluencer()

  const balance = useState<number | null>('my-credits-balance', () => null)
  const loaded = useState<boolean>('my-credits-loaded', () => false)

  async function refresh() {
    const me = influencer.value ?? (await ensureInfluencer())
    if (!me) return

    const { data, error } = await client.from('credit_ledger').select('amount').eq('influencer_id', me.id)
    if (error) {
      console.error('[useMyCredits] fallo al cargar créditos:', error.message)
      return
    }
    balance.value = (data as { amount: number }[]).reduce((sum, row) => sum + row.amount, 0)
    loaded.value = true
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
    return balance.value
  }

  /** Tras predecir, el endpoint ya devuelve el saldo nuevo — evita otra ida y vuelta. */
  function setBalance(value: number) {
    balance.value = value
    loaded.value = true
  }

  function reset() {
    balance.value = null
    loaded.value = false
  }

  return { balance, loaded, refresh, ensureLoaded, setBalance, reset }
}
