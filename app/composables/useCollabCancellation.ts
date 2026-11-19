export interface CancelState {
  requestedBy: string | null
  requestedAt: string | null
  reason: string | null
  cancelledAt: string | null
  terminatedBy: string | null
  terminatedAt: string | null
  terminationReason: string | null
}

/**
 * Cierre anticipado de una colaboración. Cancelación de común acuerdo (migración 20261110110000): una parte la
 * propone con motivo y la otra acepta o no. Terminación por incumplimiento (20261111100000): la decide una parte.
 * Las tres acciones son RPC que validan en el servidor quién llama y en qué estado está la colaboración.
 */
export function useCollabCancellation(collaborationId: string) {
  const client = useSupabaseClient()
  const state = useState<CancelState | null>(`collab-cancel-${collaborationId}`, () => null)
  const acting = ref(false)
  const db = client as unknown as { from: (t: string) => any; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }

  async function load() {
    const { data, error } = await db.from('collaborations').select('cancel_requested_by, cancel_requested_at, cancel_reason, cancelled_at, terminated_by, terminated_at, termination_reason').eq('id', collaborationId).maybeSingle()
    if (error || !data) return
    state.value = { requestedBy: data.cancel_requested_by, requestedAt: data.cancel_requested_at, reason: data.cancel_reason, cancelledAt: data.cancelled_at, terminatedBy: data.terminated_by, terminatedAt: data.terminated_at, terminationReason: data.termination_reason }
  }

  async function run(fn: string, args: Record<string, unknown>) {
    acting.value = true
    try {
      const { error } = await db.rpc(fn, { p_collaboration_id: collaborationId, ...args })
      if (error) throw error
      await load()
    } finally {
      acting.value = false
    }
  }

  const request = (reason: string) => run('request_collaboration_cancel', { p_reason: reason })
  const respond = (accept: boolean) => run('respond_collaboration_cancel', { p_accept: accept })
  const withdraw = () => run('withdraw_collaboration_cancel', {})
  /** Terminar por incumplimiento (migración 20261111100000): unilateral, con motivo; avisa a la otra parte y al equipo. */
  const terminate = (reason: string) => run('terminate_collaboration_for_breach', { p_reason: reason })

  return { state, acting, load, request, respond, withdraw, terminate }
}
