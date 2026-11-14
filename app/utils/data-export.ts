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
  return `ciberan-mis-datos-${now.toISOString().slice(0, 10)}.zip`
}

/** Separador de columnas: «;» es el que abre bien en Excel con configuración regional española (LibreOffice y Google Sheets lo detectan solos). */
export const CSV_SEPARATOR = ';'

/** Columnas de las secciones que no salen de `EXPORT_QUERIES`. */
const EXTRA_SECTION_COLUMNS: Record<string, string[]> = {
  redes_conectadas: ['platform', 'handle', 'followers_count', 'connected_at', 'status', 'is_verified']
}

/** Una celda CSV (RFC 4180 con «;»): fechas tal cual, listas separadas por coma, objetos como JSON y protección frente a fórmulas de hoja de cálculo. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text: string
  if (typeof value === 'string') text = value
  else if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) text = value.join(', ')
  else if (typeof value === 'object') text = JSON.stringify(value)
  else text = String(value)
  // Un texto que empiece por = + - @ se interpretaría como fórmula al abrirlo en Excel: se antepone una comilla.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map(csvCell).join(CSV_SEPARATOR)
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c])).join(CSV_SEPARATOR))
  return [header, ...lines].join('\r\n') + '\r\n'
}

export interface ExportEntry {
  name: string
  content: string
}

/** Columnas de una sección: las pedidas a la base y, si hay filas con más claves, también esas. */
export function sectionColumns(section: string, rows: Record<string, unknown>[]): string[] {
  const query = EXPORT_QUERIES.find((q) => q.section === section)
  const base = query ? query.columns.split(',') : EXTRA_SECTION_COLUMNS[section] ?? []
  const extra = new Set<string>()
  for (const row of rows) for (const key of Object.keys(row)) if (!base.includes(key)) extra.add(key)
  return [...base, ...extra]
}

/** Archivos de texto que van dentro del ZIP: un LEEME, los datos de la cuenta y un CSV por sección. */
export function buildExportEntries(cuenta: Record<string, unknown>, datos: Record<string, unknown[]>, incompleto: string[], now = new Date()): ExportEntry[] {
  const accountRows: Record<string, unknown>[] = []
  for (const [group, value] of Object.entries(cuenta)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [field, v] of Object.entries(value as Record<string, unknown>)) accountRows.push({ grupo: group, campo: field, valor: v })
    } else accountRows.push({ grupo: group, campo: group, valor: value })
  }
  const sections = Object.keys(datos).sort()
  const readme = [
    'COPIA DE LOS DATOS DE TU CUENTA DE CIBERAN',
    `Generada el ${now.toISOString().slice(0, 10)}.`,
    '',
    'Qué hay dentro:',
    '- cuenta.csv: tu email, tu perfil y tu ficha pública (una fila por campo).',
    ...sections.map((s) => `- ${s}.csv: ${(datos[s] as unknown[]).length} fila(s).`),
    '',
    'Cómo abrirlo: cada archivo .csv se abre con Excel, LibreOffice o Google Sheets. Están en UTF-8 y con las columnas separadas por «;».',
    'Las fechas van en formato ISO (año-mes-día y hora UTC). Las listas se separan con comas.',
    '',
    'No incluye credenciales de redes sociales ni datos de pago, que no se guardan de forma legible.',
    ...(incompleto.length ? ['', `Atención: no se han podido leer estas secciones, así que salen vacías: ${incompleto.join(', ')}.`] : [])
  ].join('\r\n') + '\r\n'
  return [
    { name: 'LEEME.txt', content: readme },
    { name: 'cuenta.csv', content: toCsv(['grupo', 'campo', 'valor'], accountRows) },
    ...sections.map((section) => {
      const rows = datos[section] as Record<string, unknown>[]
      return { name: `${section}.csv`, content: toCsv(sectionColumns(section, rows), rows) }
    })
  ]
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * ZIP sin compresión («stored»), con nombres en UTF-8. Los CSV son pequeños y así no hace falta ninguna
 * librería. Los CSV llevan BOM para que Excel reconozca los acentos.
 */
export function buildZip(entries: ExportEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder()
  const dosTime = (now.getUTCHours() << 11) | (now.getUTCMinutes() << 5) | (now.getUTCSeconds() >> 1)
  const dosDate = ((Math.max(now.getUTCFullYear(), 1980) - 1980) << 9) | ((now.getUTCMonth() + 1) << 5) | now.getUTCDate()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const body = encoder.encode((entry.name.endsWith('.csv') ? '﻿' : '') + entry.content)
    const crc = crc32(body)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, dosTime, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, body.length, true)
    lv.setUint32(22, body.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)

    const dir = new Uint8Array(46 + name.length)
    const dv = new DataView(dir.buffer)
    dv.setUint32(0, 0x02014b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 20, true)
    dv.setUint16(8, 0x0800, true)
    dv.setUint16(10, 0, true)
    dv.setUint16(12, dosTime, true)
    dv.setUint16(14, dosDate, true)
    dv.setUint32(16, crc, true)
    dv.setUint32(20, body.length, true)
    dv.setUint32(24, body.length, true)
    dv.setUint16(28, name.length, true)
    dv.setUint32(42, offset, true)
    dir.set(name, 46)

    chunks.push(local, body)
    central.push(dir)
    offset += local.length + body.length
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const all = [...chunks, ...central, end]
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0))
  let pos = 0
  for (const chunk of all) { out.set(chunk, pos); pos += chunk.length }
  return out
}
