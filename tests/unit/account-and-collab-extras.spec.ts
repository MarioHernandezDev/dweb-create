import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIVITY_NOTIFICATION_TYPES, MUTABLE_NOTIFICATION_TYPES, NOTIFICATION_PREFERENCE_GROUPS, isGroupEnabled, toggleGroup } from '../../app/utils/notifications'
import { EXPORT_QUERIES, buildExportEntries, buildZip, crc32, exportCsvCell, exportFilename, exportQueriesFor, exportToCsv } from '../../app/utils/data-export'
import { COLLAB_FILE_MAX_BYTES, COLLAB_FILE_TYPES, collabFilePath, collabFileProblem, fileIcon, formatFileSize, safeFileName } from '../../app/utils/collab-files'
import { agreementCanonicalText, agreementFingerprint, agreementRows, buildAgreementHtml, type AgreementData } from '../../app/utils/agreement-summary'
import { buildIcs } from '../../app/utils/ics'
import { collaborationStatusMeta } from '../../app/utils/status'
import { collabPhase, paymentState } from '../../app/utils/collab-phase'

const root = join(__dirname, '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const prefsSql = read('supabase', 'migrations', '20261110100000_account_preferences.sql')
const collabSql = read('supabase', 'migrations', '20261110110000_collaboration_files_and_cancellation.sql')
const inbox = read('app', 'pages', 'inbox.vue')
const timeline = read('app', 'components', 'collab', 'CollabTimeline.vue')

describe('preferencias de avisos', () => {
  it('los tipos silenciables son exactamente los del CHECK de la tabla', () => {
    const check = prefsSql.match(/muted_types <@ array\[([^\]]+)\]/)?.[1] ?? ''
    const inSql = [...check.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
    expect(inSql).toEqual([...MUTABLE_NOTIFICATION_TYPES].sort())
  })

  it('no se puede silenciar nada que pida una acción', () => {
    for (const critical of ['collaboration_requested', 'offer_received', 'post_changes_requested', 'post_approved', 'collaboration_paid', 'collaboration_cancel_requested']) {
      expect(MUTABLE_NOTIFICATION_TYPES).not.toContain(critical)
    }
  })

  it('activar y desactivar un grupo no duplica ni arrastra tipos desconocidos', () => {
    const reminders = NOTIFICATION_PREFERENCE_GROUPS.find((g) => g.id === 'reminders')!
    const off = toggleGroup(reminders, ['login', 'inventado'], false)
    expect(off.sort()).toEqual(['collaboration_expiring', 'login', 'post_due_soon'])
    expect(isGroupEnabled(reminders, off)).toBe(false)
    expect(toggleGroup(reminders, toggleGroup(reminders, off, false), true)).toEqual(['login'])
    expect(isGroupEnabled(reminders, ['post_due_soon'])).toBe(false)
  })
})

describe('avisos y cronología de archivos y cancelación', () => {
  const NOTIFS = ['collaboration_file_added', 'collaboration_cancel_requested', 'collaboration_cancel_declined', 'collaboration_cancelled']
  for (const type of NOTIFS) {
    it(`${type}: lo crea la migración, tiene icono y es «Importante»`, () => {
      expect(collabSql).toContain(`'${type}'`)
      expect(inbox).toMatch(new RegExp(`${type}:\\s*'ph:[a-z0-9-]+'`))
      expect((ACTIVITY_NOTIFICATION_TYPES as readonly string[]).includes(type)).toBe(false)
    })
  }
  for (const kind of ['file_added', 'file_removed', 'cancel_requested', 'cancel_declined', 'cancel_withdrawn', 'cancelled']) {
    it(`evento ${kind}: admitido por el CHECK y pintado en la cronología`, () => {
      expect(collabSql).toContain(`'${kind}'`)
      expect(timeline).toContain(`case '${kind}':`)
    })
  }
  it('«cancelada» tiene etiqueta, no tiene fase y no es cobrable', () => {
    expect(collaborationStatusMeta.cancelled.label).toBe('Cancelada')
    expect(collabPhase({ status: 'cancelled', paidAt: null }, [])).toBeNull()
    expect(paymentState({ status: 'cancelled', paidAt: null, budgetCents: 50000 })).toBe('none')
    expect(collabSql).toMatch(/status in \('requested', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled'\)/)
  })
})

describe('descargar mis datos', () => {
  it('nunca pide tokens ni identificadores de pago', () => {
    for (const q of EXPORT_QUERIES) expect(q.columns).not.toMatch(/token|stripe|secret|password/i)
  })
  it('cada rol recibe solo sus secciones y sin nombres repetidos', () => {
    const creator = exportQueriesFor('creator').map((q) => q.section)
    const partner = exportQueriesFor('partner').map((q) => q.section)
    expect(creator).toContain('publicaciones')
    expect(partner).not.toContain('publicaciones')
    expect(partner).toContain('colaboraciones_como_marca')
    expect(creator).not.toContain('colaboraciones_como_marca')
    expect(new Set(creator).size).toBe(creator.length)
    expect(new Set(partner).size).toBe(partner.length)
  })
  it('el archivo es un ZIP con fecha en el nombre y un LEEME que lista las secciones incompletas', () => {
    const now = new Date('2026-11-10T12:00:00Z')
    expect(exportFilename(now)).toBe('ciberan-mis-datos-2026-11-10.zip')
    const entries = buildExportEntries({ email: 'a@b.c', perfil: { full_name: 'Ana' } }, { avisos: [], mensajes_enviados: [] }, ['mensajes_enviados'], now)
    expect(entries.map((e) => e.name)).toEqual(['LEEME.txt', 'cuenta.csv', 'avisos.csv', 'mensajes_enviados.csv'])
    const readme = entries[0]!.content
    expect(readme).toMatch(/2026-11-10/)
    expect(readme).toMatch(/credenciales/)
    expect(readme).toMatch(/mensajes_enviados/)
    expect(entries[1]!.content).toContain('perfil;full_name;Ana')
  })
  it('las hojas CSV escapan comillas, saltos de línea y fórmulas, y conservan la cabecera aunque no haya filas', () => {
    expect(exportCsvCell('hola; "mundo"\nfin')).toBe('"hola; ""mundo""\nfin"')
    expect(exportCsvCell(['moda', 'fitness'])).toBe('moda, fitness')
    expect(exportCsvCell(null)).toBe('')
    expect(exportCsvCell('=SUMA(A1:A2)')).toBe("'=SUMA(A1:A2)")
    expect(exportCsvCell(12)).toBe('12')
    expect(exportToCsv(['id', 'title'], [])).toBe('id;title\r\n')
    expect(exportToCsv(['id', 'title'], [{ id: 1, title: 'a;b' }])).toBe('id;title\r\n1;"a;b"\r\n')
  })
  it('el ZIP tiene una firma válida, un CRC por archivo y los nombres en UTF-8', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    const zip = buildZip([{ name: 'avisos.csv', content: 'id\r\n1\r\n' }, { name: 'LEEME.txt', content: 'hola' }], new Date('2026-11-10T12:00:00Z'))
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(2)
  })
})

describe('archivos de la colaboración', () => {
  const pdf = { name: 'Guía de marca (v2).pdf', type: 'application/pdf', size: 2048 }
  it('valida tipo, tamaño y tope, con el motivo en claro', () => {
    expect(collabFileProblem(pdf, 0)).toBeNull()
    expect(collabFileProblem({ ...pdf, type: 'application/x-msdownload' }, 0)).toMatch(/tipo de archivo/)
    expect(collabFileProblem({ ...pdf, size: COLLAB_FILE_MAX_BYTES + 1 }, 0)).toMatch(/10 MB/)
    expect(collabFileProblem({ ...pdf, size: 0 }, 0)).toMatch(/vacío/)
    expect(collabFileProblem(pdf, 20)).toMatch(/20 archivos/)
  })
  it('los tipos admitidos son los del bucket', () => {
    for (const mime of Object.keys(COLLAB_FILE_TYPES)) expect(collabSql).toContain(`'${mime}'`)
    expect(collabSql).toMatch(/'collab-files', 'collab-files', false, 10485760/)
  })
  it('la ruta empieza por la colaboración y el nombre queda limpio', () => {
    expect(safeFileName(pdf.name)).toBe('Guia-de-marca-v2-.pdf')
    expect(safeFileName('../../etc/passwd')).toBe('etc-passwd')
    expect(safeFileName('¿?')).toBe('archivo')
    expect(collabFilePath('abc', pdf.name, 'k1')).toBe('abc/k1-Guia-de-marca-v2-.pdf')
  })
  it('tamaños e iconos legibles', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(1572864)).toBe('1,5 MB')
    expect(fileIcon('image/png')).toBe('ph:image')
    expect(fileIcon('application/pdf')).toBe('ph:file-pdf')
  })
})

describe('resumen del acuerdo', () => {
  const data: AgreementData = {
    id: 'c1', title: 'Pack <3> reels', creatorName: 'Ana & Co', partnerName: 'Marca "X"', status: 'Aceptada',
    brief: 'Tres reels.\n<script>alert(1)</script>', budgetCents: 45000, acceptedOn: '2026-11-01T10:00:00Z', finalDue: '2026-11-20', paidAt: null,
    deliverables: ['Reel 1', 'Reel 2'], scopeNotes: null, revisionsIncluded: 2, exclusivity: false, usageRights: 'Redes de la marca, 6 meses',
    campaignGoal: null, targetAudience: null, tone: null
  }
  it('solo lista lo informado y escribe el importe en euros', () => {
    const labels = agreementRows(data).map((r) => r.label)
    expect(labels).toContain('Importe acordado')
    expect(labels).not.toContain('Alcance')
    expect(labels).not.toContain('Pagada el')
    expect(agreementRows(data).find((r) => r.label === 'Importe acordado')!.value).toMatch(/450,00/)
    expect(agreementRows({ ...data, budgetCents: null }).find((r) => r.label === 'Importe acordado')!.value).toBe('Sin importe acordado')
  })
  it('escapa el contenido y avisa de que no es un contrato', () => {
    const html = buildAgreementHtml(data, 'abc123', new Date('2026-11-10T12:00:00Z'))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Pack &lt;3&gt; reels')
    expect(html).toContain('Marca &quot;X&quot;')
    expect(html).toContain('No es un contrato firmado')
    expect(html).toContain('abc123')
  })
  it('la huella depende del contenido y no de cuándo se genera', async () => {
    const a = await agreementFingerprint(data)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await agreementFingerprint({ ...data })).toBe(a)
    expect(await agreementFingerprint({ ...data, budgetCents: 45001 })).not.toBe(a)
    expect(agreementCanonicalText(data)).toContain('1. Reel 1')
  })
})

describe('calendario .ics', () => {
  const now = new Date('2026-11-10T12:00:00Z')
  it('crea eventos de día completo con UID estable y texto escapado', () => {
    const ics = buildIcs([{ uid: 'post-1', date: '2026-12-31', title: 'Entrega: Reel, final; v2', description: 'Línea 1\nLínea 2', url: 'https://x.test/c/1' }], 'CIBERAN', now)
    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('UID:post-1@ciberan')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
    expect(ics).toContain('SUMMARY:Entrega: Reel\\, final\\; v2')
    expect(ics).toContain('DESCRIPTION:Línea 1\\nLínea 2')
    expect(ics).toContain('DTSTAMP:20261110T120000Z')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
  it('descarta fechas inválidas y parte las líneas largas', () => {
    const ics = buildIcs([{ uid: 'a', date: 'mañana', title: 'x' }, { uid: 'b', date: '2026-11-12', title: 'T'.repeat(200) }], 'C', now)
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(1)
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
})
