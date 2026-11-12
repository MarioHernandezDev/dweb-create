// Genera supabase/templates/*.html (correos de Supabase Auth) con el mismo diseño
// que los correos de la app. Uso: npx tsx scripts/build-auth-email-templates.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { authEmailTemplates } from '../server/utils/mail-templates.ts'

mkdirSync('supabase/templates', { recursive: true })
const lines = ['# Plantillas de correo de Supabase Auth', '', 'Generadas con `npx tsx scripts/build-auth-email-templates.mjs`. No editar a mano.', 'Se pegan en el panel: Authentication > Emails > Templates (ver docs/16-EMAIL-SMTP.md).', '', '| Plantilla del panel | Archivo | Asunto |', '|---|---|---|']
for (const t of authEmailTemplates()) {
  writeFileSync(`supabase/templates/${t.file}`, t.html + '\n')
  lines.push(`| ${t.panelName} | \`${t.file}\` | ${t.subject} |`)
}
writeFileSync('supabase/templates/README.md', lines.join('\n') + '\n')
console.log(`${authEmailTemplates().length} plantillas generadas`)
