import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { AdminActor } from './admin-session'

export interface AuditEntry {
  /** Frase en pasado que se lee tras el nombre: «bloqueó la cuenta», «resolvió un reporte»… */
  action: string
  targetType?: 'user' | 'report' | 'deletion_request' | 'team' | 'session'
  targetId?: string | null
  targetLabel?: string | null
  detail?: Record<string, unknown>
}

/**
 * Deja constancia de una acción del equipo. Nunca rompe la acción: si no se puede escribir, se avisa en el log del servidor.
 * No se guardan contraseñas ni contenido de mensajes; solo quién, qué y sobre quién.
 */
export async function logAdminAction(event: H3Event, actor: AdminActor, entry: AuditEntry): Promise<void> {
  try {
    const client = serverSupabaseServiceRole(event)
    const { error } = await client.from('admin_audit_log').insert({
      actor_id: actor.memberId, actor_name: actor.name, action: entry.action,
      target_type: entry.targetType ?? null, target_id: entry.targetId ?? null, target_label: entry.targetLabel ?? null, detail: entry.detail ?? null
    } as never)
    if (error) console.error('[admin] no se pudo registrar la acción:', error.message)
  } catch (e) {
    console.error('[admin] no se pudo registrar la acción:', (e as Error).message)
  }
}

/** «Nombre (correo)» de una cuenta, para el registro. */
export async function accountLabel(event: H3Event, profileId: string): Promise<string> {
  const client = serverSupabaseServiceRole(event)
  const { data } = await client.from('admin_users_view').select('display_name, full_name, email').eq('id', profileId).maybeSingle<{ display_name: string | null; full_name: string | null; email: string | null }>()
  if (!data) return profileId
  return `${data.display_name ?? data.full_name ?? 'Sin nombre'}${data.email ? ` (${data.email})` : ''}`
}
