import { formatMoney } from './money'
/**
 * «Resumen del acuerdo» de una colaboración: un documento imprimible (o guardable como PDF) con lo pactado en la
 * plataforma. Es un resumen informativo, no un contrato firmado. La huella (SHA-256 del contenido) permite
 * comprobar que dos copias dicen lo mismo.
 */
export interface AgreementData {
  id: string
  title: string
  creatorName: string
  partnerName: string
  status: string
  brief: string
  budgetCents: number | null
  acceptedOn: string | null
  finalDue: string | null
  paidAt: string | null
  deliverables: string[]
  scopeNotes: string | null
  revisionsIncluded: number | null
  exclusivity: boolean
  usageRights: string | null
  campaignGoal: string | null
  targetAudience: string | null
  tone: string | null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null)
const euros = (cents: number | null) => (cents == null ? 'Sin importe acordado' : formatMoney(cents, 2))

/** Filas «etiqueta: valor» del acuerdo, solo con lo que está informado (salvo las que siempre aplican). */
export function agreementRows(a: AgreementData): { label: string; value: string }[] {
  const rows: { label: string; value: string | null }[] = [
    { label: 'Creador', value: a.creatorName },
    { label: 'Marca', value: a.partnerName },
    { label: 'Estado', value: a.status },
    { label: 'Importe acordado', value: euros(a.budgetCents) },
    { label: 'Aceptada el', value: day(a.acceptedOn) },
    { label: 'Entrega final prevista', value: day(a.finalDue) },
    { label: 'Pagada el', value: day(a.paidAt) },
    { label: 'Alcance', value: a.scopeNotes },
    { label: 'Revisiones incluidas', value: a.revisionsIncluded === null ? 'Sin límite definido' : String(a.revisionsIncluded) },
    { label: 'Exclusividad', value: a.exclusivity ? 'Sí' : 'No' },
    { label: 'Uso del contenido', value: a.usageRights },
    { label: 'Objetivo de la campaña', value: a.campaignGoal },
    { label: 'Público', value: a.targetAudience },
    { label: 'Tono', value: a.tone }
  ]
  return rows.filter((r): r is { label: string; value: string } => !!r.value && !!r.value.trim())
}

/** Texto canónico del acuerdo: de aquí sale la huella. No incluye la fecha de generación. */
export function agreementCanonicalText(a: AgreementData): string {
  return [
    `Colaboración ${a.id}`, a.title,
    ...agreementRows(a).map((r) => `${r.label}: ${r.value}`),
    'Brief:', a.brief.trim(),
    'Entregables:', ...a.deliverables.map((d, i) => `${i + 1}. ${d}`)
  ].join('\n')
}

export async function agreementFingerprint(a: AgreementData): Promise<string> {
  const bytes = new TextEncoder().encode(agreementCanonicalText(a))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function buildAgreementHtml(a: AgreementData, fingerprint: string, generatedAt = new Date()): string {
  const rows = agreementRows(a).map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('')
  const deliverables = a.deliverables.length
    ? `<ol>${a.deliverables.map((d) => `<li>${esc(d)}</li>`).join('')}</ol>`
    : '<p class="muted">No se definieron entregables concretos.</p>'
  const generated = generatedAt.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen del acuerdo · ${esc(a.title)}</title><style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:0;padding:2.5rem;line-height:1.5;font-size:11pt}
h1{font-size:18pt;margin:0 0 .25rem}h2{font-size:12pt;margin:1.5rem 0 .5rem;border-bottom:1px solid #ccc;padding-bottom:.25rem}
.kicker{text-transform:uppercase;letter-spacing:.08em;font-size:8.5pt;color:#555;margin:0 0 .5rem}
table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:.35rem .5rem .35rem 0;border-bottom:1px solid #eee}th{width:34%;font-weight:600;color:#333}
p{margin:.25rem 0}.brief{white-space:pre-wrap}.muted,footer{color:#555}ol{margin:.25rem 0;padding-left:1.25rem}
footer{margin-top:2rem;padding-top:.75rem;border-top:1px solid #ccc;font-size:8.5pt}code{font-family:ui-monospace,Consolas,monospace;word-break:break-all}
@page{margin:1.5cm}@media print{body{padding:0}}
</style></head><body>
<p class="kicker">CIBERAN · Resumen del acuerdo</p>
<h1>${esc(a.title)}</h1>
<p class="muted">${esc(a.creatorName)} y ${esc(a.partnerName)}</p>
<h2>Condiciones</h2><table>${rows}</table>
<h2>Brief</h2><p class="brief">${esc(a.brief.trim())}</p>
<h2>Entregables</h2>${deliverables}
<footer>
<p>Resumen informativo de lo acordado en CIBERAN. No es un contrato firmado ni sustituye a uno.</p>
<p>Colaboración <code>${esc(a.id)}</code> · Generado el ${esc(generated)}</p>
<p>Huella del contenido (SHA-256): <code>${esc(fingerprint)}</code></p>
</footer></body></html>`
}

/** Abre el diálogo de impresión del navegador con el resumen (desde ahí se guarda como PDF). */
export function printHtml(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = html
  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) { frame.remove(); return }
    win.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 500))
    win.focus()
    win.print()
  }
  document.body.appendChild(frame)
}
