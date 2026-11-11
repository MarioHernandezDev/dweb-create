import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIVITY_NOTIFICATION_TYPES } from '../../app/utils/notifications'

/**
 * Los recordatorios de plazo (`send_due_reminders`, migración 20261109110000)
 * crean avisos de estos tipos. Este test mantiene sincronizados el SQL y la
 * bandeja: cada tipo debe existir en la migración, tener su icono en
 * `inbox.vue` y caer en «Importantes» (no en «Actividad»).
 */
const REMINDER_TYPES = ['collaboration_expiring', 'post_due_soon'] as const
const root = join(__dirname, '..', '..')
const migration = readFileSync(join(root, 'supabase', 'migrations', '20261109110000_due_reminders.sql'), 'utf8')
const inbox = readFileSync(join(root, 'app', 'pages', 'inbox.vue'), 'utf8')

describe('tipos de aviso de los recordatorios', () => {
  for (const type of REMINDER_TYPES) {
    it(`${type}: lo crea la migración, tiene icono y es «Importante»`, () => {
      expect(migration).toContain(`'${type}'`)
      expect(inbox).toMatch(new RegExp(`${type}:\\s*'ph:[a-z0-9-]+'`))
      expect((ACTIVITY_NOTIFICATION_TYPES as readonly string[]).includes(type)).toBe(false)
    })
  }

  it('la migración evita duplicados con la clave y el índice único', () => {
    expect(migration).toMatch(/uq_notifications_dedupe/)
    expect(migration).toMatch(/on conflict \(profile_id, dedupe_key\)/i)
  })

  it('la migración incluye su bloque ROLLBACK', () => {
    expect(migration).toMatch(/ROLLBACK/i)
  })
})
