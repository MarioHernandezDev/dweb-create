/**
 * «Descargar mis datos» (derecho de acceso y portabilidad). Define qué se pide para cada rol y cómo se llama el
 * archivo. Todo se lee con la sesión del usuario (RLS): solo sale lo que ya puede ver, filtrado además a lo suyo.
 * No se incluyen tokens de redes ni identificadores de Stripe.
 */
export interface ExportQuery {
  /** Nombre de la sección en el archivo. */
  section: string
  table: string
  columns: string
  /** Columna por la que se filtra y de dónde sale el valor. */
  filter: { column: string; by: 'profile' | 'creator' | 'partner' | 'collaborations' | 'conversations' | 'posts' }
  /** Solo para este rol (si falta, para los dos). */
  role?: 'creator' | 'partner'
}

export const EXPORT_QUERIES: ExportQuery[] = [
  { section: 'publicaciones', table: 'posts', columns: 'id,collaboration_id,title,caption,content_type,platform,status,due_date,published_at,media_url,created_at,updated_at', filter: { column: 'creator_id', by: 'creator' }, role: 'creator' },
  { section: 'etiquetas', table: 'labels', columns: 'id,name,color,created_at', filter: { column: 'creator_id', by: 'creator' }, role: 'creator' },
  { section: 'creditos', table: 'credit_ledger', columns: 'id,amount,reason,created_at', filter: { column: 'creator_id', by: 'creator' }, role: 'creator' },
  { section: 'suscripcion', table: 'subscriptions', columns: 'plan_id,status,current_period_end,created_at', filter: { column: 'creator_id', by: 'creator' }, role: 'creator' },
  { section: 'paquetes', table: 'packages', columns: 'id,title,description,price_cents,deliverables,active,created_at,updated_at', filter: { column: 'profile_id', by: 'profile' } },
  { section: 'colaboraciones_como_creador', table: 'collaborations', columns: 'id,status,brief,budget_cents,created_at,updated_at,paid_at,initiated_by,scope_notes,revisions_included,exclusivity,usage_rights,campaign_goal,target_audience,tone,package_title,package_deliverables,expires_at', filter: { column: 'creator_id', by: 'creator' }, role: 'creator' },
  { section: 'colaboraciones_como_marca', table: 'collaborations', columns: 'id,status,brief,budget_cents,created_at,updated_at,paid_at,initiated_by,scope_notes,revisions_included,exclusivity,usage_rights,campaign_goal,target_audience,tone,package_title,package_deliverables,expires_at', filter: { column: 'partner_id', by: 'partner' }, role: 'partner' },
  { section: 'entregables', table: 'collaboration_deliverables', columns: 'id,collaboration_id,position,title,origin,confirmed_at,post_id,created_at', filter: { column: 'collaboration_id', by: 'collaborations' } },
  { section: 'contraofertas_enviadas', table: 'collaboration_offers', columns: 'id,collaboration_id,budget_cents,message,created_at', filter: { column: 'proposed_by', by: 'profile' } },
  { section: 'registro_de_colaboraciones', table: 'collaboration_log_entries', columns: 'id,collaboration_id,kind,detail,created_at', filter: { column: 'author_profile_id', by: 'profile' } },
  { section: 'notas_de_revision', table: 'post_revision_notes', columns: 'id,post_id,kind,comment,content_version,created_at', filter: { column: 'author_profile_id', by: 'profile' } },
  { section: 'valoraciones_dadas', table: 'collaboration_ratings', columns: 'id,collaboration_id,stars,comment,created_at', filter: { column: 'rater_profile_id', by: 'profile' } },
  { section: 'valoraciones_recibidas', table: 'collaboration_ratings', columns: 'id,collaboration_id,stars,comment,created_at', filter: { column: 'ratee_profile_id', by: 'profile' } },
  { section: 'ofertas_enviadas', table: 'offers', columns: 'id,package_title,proposed_price_cents,message,status,responded_at,created_at', filter: { column: 'from_profile_id', by: 'profile' } },
  { section: 'ofertas_recibidas', table: 'offers', columns: 'id,package_title,proposed_price_cents,message,status,responded_at,created_at', filter: { column: 'to_profile_id', by: 'profile' } },
  { section: 'mensajes_enviados', table: 'messages', columns: 'id,conversation_id,kind,body,created_at', filter: { column: 'sender_id', by: 'profile' } },
  { section: 'perfiles_guardados', table: 'saved_profiles', columns: 'id,target_creator_id,target_partner_id,created_at', filter: { column: 'owner_profile_id', by: 'profile' } },
  { section: 'busquedas_guardadas', table: 'saved_searches', columns: 'id,kind,label,state,created_at', filter: { column: 'profile_id', by: 'profile' } },
  { section: 'preferencias_de_avisos', table: 'notification_preferences', columns: 'muted_types,updated_at', filter: { column: 'profile_id', by: 'profile' } },
  { section: 'avisos', table: 'notifications', columns: 'id,type,title,body,link,read_at,created_at', filter: { column: 'profile_id', by: 'profile' } },
  { section: 'denuncias_enviadas', table: 'reports', columns: 'id,collaboration_id,reason,detail,created_at', filter: { column: 'reporter_profile_id', by: 'profile' } }
]

export function exportQueriesFor(role: 'creator' | 'partner'): ExportQuery[] {
  return EXPORT_QUERIES.filter((q) => !q.role || q.role === role)
}

export function exportFilename(now = new Date()): string {
  return `ciberan-mis-datos-${now.toISOString().slice(0, 10)}.json`
}

export interface ExportFile {
  generado: string
  aviso: string
  cuenta: Record<string, unknown>
  datos: Record<string, unknown[]>
  /** Secciones que no se han podido leer (el resto del archivo es válido). */
  incompleto: string[]
}

export function buildExportFile(cuenta: Record<string, unknown>, datos: Record<string, unknown[]>, incompleto: string[], now = new Date()): ExportFile {
  return {
    generado: now.toISOString(),
    aviso: 'Copia de los datos de tu cuenta de CIBERAN. No incluye credenciales de redes sociales ni datos de pago, que no se guardan de forma legible.',
    cuenta,
    datos,
    incompleto
  }
}
