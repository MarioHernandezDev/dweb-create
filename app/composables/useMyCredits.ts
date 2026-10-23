/**
 * El saldo de créditos del creador logueado — suma de `credit_ledger` (ver
 * README Fase 4, "Consumo de créditos"). No hay columna de saldo cacheada:
 * la tabla es un libro de movimientos. La suma se hace en el servidor
 * (`my_credit_balance()`, security definer) en vez de traer todo el
 * historial al cliente para sumarlo en JS — un creador con muchos meses de
 * actividad podía acabar descargando miles de filas solo para ver un número.
 */
export function useMyCredits() {
  const client = useSupabaseClient()
  const { creator, ensureCreator } = useMyCreator()

  const balance = useState<number | null>('my-credits-balance', () => null)
  const loaded = useState<boolean>('my-credits-loaded', () => false)

  async function refresh() {
    const me = creator.value ?? (await ensureCreator())
    if (!me) return

    const { data, error } = await client.rpc('my_credit_balance' as never)
    if (error) {
      console.error('[useMyCredits] fallo al cargar créditos:', error.message)
      return
    }
    balance.value = data as unknown as number
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
