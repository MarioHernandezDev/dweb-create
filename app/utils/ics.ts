/**
 * Calendario en formato iCalendar (.ics) con las fechas de entrega, para importarlo en Google Calendar, Apple
 * Calendar u Outlook. Eventos de día completo; el UID es estable para que reimportar actualice en vez de duplicar.
 */
export interface IcsEvent {
  uid: string
  /** «YYYY-MM-DD». */
  date: string
  title: string
  description?: string
  url?: string
}

const escText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
const compact = (d: string) => d.replace(/-/g, '')

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Parte las líneas a 75 octetos como pide la norma (RFC 5545 §3.1). */
function fold(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch } else cur += ch
  }
  if (cur) out.push(cur)
  return out.join('\r\n ')
}

export function buildIcs(events: IcsEvent[], calendarName: string, now = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CIBERAN//Entregas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escText(calendarName)}`]
  for (const e of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@ciberan`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`, `SUMMARY:${escText(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${escText(e.description)}`)
    if (e.url) lines.push(`URL:${e.url}`)
    lines.push('TRANSP:TRANSPARENT', 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return `${lines.map(fold).join('\r\n')}\r\n`
}

export function downloadIcs(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
