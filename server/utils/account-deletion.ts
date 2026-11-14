/**
 * Reglas de la eliminación de cuenta, separadas del endpoint para poder probarlas.
 *
 * - Con colaboraciones abiertas no se elimina: antes hay que cerrarlas o cancelarlas.
 * - Sin historial compartido, la cuenta se borra en el momento (y con ella, en cascada, sus datos).
 * - Con historial (colaboraciones terminadas), borrar en cascada se llevaría también los
 *   registros de la otra parte, así que queda como solicitud para que la revise el equipo.
 */
export const OPEN_COLLABORATION_STATUSES = ['requested', 'accepted', 'in_progress'] as const
export const HISTORY_COLLABORATION_STATUSES = ['completed', 'cancelled', 'terminated'] as const

export type DeletionPlan = 'blocked' | 'delete_now' | 'request'

export function planAccountDeletion(statuses: string[]): DeletionPlan {
  if (statuses.some((s) => (OPEN_COLLABORATION_STATUSES as readonly string[]).includes(s))) return 'blocked'
  if (statuses.some((s) => (HISTORY_COLLABORATION_STATUSES as readonly string[]).includes(s))) return 'request'
  return 'delete_now'
}

/** Una colaboración abierta que impide eliminar la cuenta, con lo que hay que hacer y a dónde ir. */
export interface DeletionBlocker {
  id: string
  status: 'requested' | 'accepted' | 'in_progress'
  title: string
  counterpart: string
  /** withdraw: solicitud enviada por mí (se puede retirar); respond: solicitud recibida (aceptar o rechazar); close: en marcha (completar o cancelar). */
  action: 'withdraw' | 'respond' | 'close'
  hint: string
  href: string
}

export interface BlockerRow {
  id: string
  status: string
  initiated_by: string
  brief: string | null
  package_title: string | null
  creator_id: string
  partner_id: string
  creator: { display_name: string | null } | null
  partner: { company_name: string | null } | null
}

const BLOCKER_COLUMNS = 'id,status,initiated_by,brief,package_title,creator_id,partner_id,creator:creators(display_name),partner:partners(company_name)'

/** Convierte las filas de colaboraciones abiertas en la lista que ve la persona. `mine` son los ids de su ficha de creador y/o de partner. */
export function toDeletionBlockers(rows: BlockerRow[], mine: { creatorId?: string | null; partnerId?: string | null }): DeletionBlocker[] {
  const open = OPEN_COLLABORATION_STATUSES as readonly string[]
  return rows.filter((r) => open.includes(r.status)).map((r) => {
    const asCreator = !!mine.creatorId && r.creator_id === mine.creatorId
    const side = asCreator ? 'creator' : 'partner'
    const counterpart = (asCreator ? r.partner?.company_name : r.creator?.display_name) || 'la otra parte'
    const raw = (r.package_title || r.brief || '').trim()
    const title = raw ? (raw.length > 70 ? `${raw.slice(0, 67)}…` : raw) : 'Colaboración sin título'
    const sentByMe = r.initiated_by === side
    const base = { id: r.id, status: r.status as DeletionBlocker['status'], title, counterpart, href: `/${side}/collaborations/${r.id}` }
    if (r.status === 'requested' && sentByMe) return { ...base, action: 'withdraw' as const, hint: `Enviaste esta solicitud y ${counterpart} aún no ha respondido. Retírala si te has arrepentido.` }
    if (r.status === 'requested') return { ...base, action: 'respond' as const, hint: `${counterpart} te ha enviado esta solicitud. Acéptala o recházala.` }
    return { ...base, action: 'close' as const, hint: 'Está en marcha. Márcala como completada o propón cancelarla de común acuerdo.' }
  })
}

/** Lee con la clave de servicio las colaboraciones abiertas de una cuenta. Devuelve null si no se han podido leer. */
export async function loadDeletionBlockers(client: any, userId: string): Promise<DeletionBlocker[] | null> {
  const [{ data: creator }, { data: partner }] = await Promise.all([
    client.from('creators').select('id').eq('profile_id', userId).maybeSingle(),
    client.from('partners').select('id').eq('profile_id', userId).maybeSingle()
  ])
  const rows: BlockerRow[] = []
  for (const [column, id] of [['creator_id', creator?.id], ['partner_id', partner?.id]] as const) {
    if (!id) continue
    const { data, error } = await client.from('collaborations').select(BLOCKER_COLUMNS).eq(column, id).in('status', [...OPEN_COLLABORATION_STATUSES])
    if (error) return null
    rows.push(...((data ?? []) as BlockerRow[]))
  }
  return toDeletionBlockers(rows, { creatorId: creator?.id ?? null, partnerId: partner?.id ?? null })
}

/** Estados de todas las colaboraciones de una cuenta (como creador y/o como partner); null si no se pudieron leer. */
export async function collaborationStatusesFor(client: any, profileId: string): Promise<string[] | null> {
  const [{ data: creator }, { data: partner }] = await Promise.all([
    client.from('creators').select('id').eq('profile_id', profileId).maybeSingle(),
    client.from('partners').select('id').eq('profile_id', profileId).maybeSingle()
  ])
  const statuses: string[] = []
  for (const [column, id] of [['creator_id', creator?.id], ['partner_id', partner?.id]] as const) {
    if (!id) continue
    const { data, error } = await client.from('collaborations').select('status').eq(column, id)
    if (error) return null
    statuses.push(...((data ?? []) as { status: string }[]).map((r) => r.status))
  }
  return statuses
}

export function emailMatches(typed: unknown, actual: string | undefined | null): boolean {
  return typeof typed === 'string' && !!actual && typed.trim().toLowerCase() === actual.trim().toLowerCase()
}
