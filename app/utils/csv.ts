/**
 * CSV para Excel/Numbers en español: separador `;`, saltos CRLF y BOM UTF-8 (sin él Excel rompe los acentos).
 * Las celdas que empiezan por `= + - @` o tabulador se prefijan con `'` para que una hoja de cálculo no las
 * interprete como fórmula (el texto de las propuestas lo escribe otra persona).
 */
export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`
}

export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
