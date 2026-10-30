import { describe, expect, it } from 'vitest'
import { filterConversations, isComposerRestricted, offerCopy, previewText, systemIcon } from '../../app/utils/chat-view'

describe('previewText', () => {
  it('sin mensajes', () => {
    expect(previewText({ kind: null, body: null, mine: false })).toBe('Sin mensajes todavía')
  })
  it('las ofertas se resumen con perspectiva', () => {
    expect(previewText({ kind: 'offer', body: 'x', mine: true })).toBe('Has enviado una oferta')
    expect(previewText({ kind: 'offer', body: null, mine: false })).toBe('Te ha enviado una oferta')
  })
  it('texto propio lleva "Tú:" y el ajeno no', () => {
    expect(previewText({ kind: 'text', body: 'hola', mine: true })).toBe('Tú: hola')
    expect(previewText({ kind: 'text', body: 'hola', mine: false })).toBe('hola')
  })
  it('el sistema enseña su texto o uno neutro si viene vacío', () => {
    expect(previewText({ kind: 'system', body: 'Oferta aceptada. Precio acordado: 450.00 €', mine: false })).toContain('Oferta aceptada')
    expect(previewText({ kind: 'system', body: '  ', mine: false })).toBe('Actividad en la conversación')
  })
})

describe('filterConversations', () => {
  const list = [
    { id: 'a', otherName: 'Álvaro Núñez', unread: true },
    { id: 'b', otherName: 'Marta Díaz', unread: false },
    { id: 'c', otherName: 'Alma Beauty Co.', unread: false }
  ]
  it('busca sin distinguir mayúsculas ni acentos', () => {
    expect(filterConversations(list, { query: 'alvaro', filter: 'all' }, {}).map((c) => c.id)).toEqual(['a'])
    expect(filterConversations(list, { query: 'DIAZ', filter: 'all' }, {}).map((c) => c.id)).toEqual(['b'])
    expect(filterConversations(list, { query: 'al', filter: 'all' }, {}).map((c) => c.id)).toEqual(['a', 'c'])
  })
  it('no leídas', () => {
    expect(filterConversations(list, { query: '', filter: 'unread' }, {}).map((c) => c.id)).toEqual(['a'])
  })
  it('ofertas pendientes de mi respuesta', () => {
    expect(filterConversations(list, { query: '', filter: 'offers' }, { c: 1, b: 0 }).map((c) => c.id)).toEqual(['c'])
    expect(filterConversations(list, { query: '', filter: 'offers' }, {})).toEqual([])
  })
  it('combina búsqueda y filtro', () => {
    expect(filterConversations(list, { query: 'marta', filter: 'unread' }, {})).toEqual([])
  })
})

describe('isComposerRestricted', () => {
  it('restringido solo con privacidad por ofertas y sin oferta aceptada', () => {
    expect(isComposerRestricted('accepted_offers_only', false)).toBe(true)
    expect(isComposerRestricted('accepted_offers_only', true)).toBe(false)
    expect(isComposerRestricted('everyone', false)).toBe(false)
  })
  it('privacidad aún desconocida: no se bloquea (decide el servidor)', () => {
    expect(isComposerRestricted(null, false)).toBe(false)
  })
})

describe('offerCopy', () => {
  it('pendiente: el emisor espera y el receptor responde', () => {
    expect(offerCopy({ status: 'pending', mine: true, otherName: 'Marta', collaborationCreated: false }).consequence).toContain('Esperando a que Marta responda')
    expect(offerCopy({ status: 'pending', mine: false, otherName: 'Marta', collaborationCreated: false }).consequence).toContain('Te toca responder')
  })
  it('aceptada: menciona la colaboración solo si existe', () => {
    expect(offerCopy({ status: 'accepted', mine: true, otherName: 'Marta', collaborationCreated: true }).consequence).toContain('colaboración')
    expect(offerCopy({ status: 'accepted', mine: true, otherName: 'Marta', collaborationCreated: false }).consequence).not.toContain('colaboración')
  })
  it('rechazada: cada parte ve lo suyo', () => {
    expect(offerCopy({ status: 'declined', mine: true, otherName: 'Marta', collaborationCreated: false }).consequence).toContain('ha rechazado')
    expect(offerCopy({ status: 'declined', mine: false, otherName: 'Marta', collaborationCreated: false }).consequence).toBe('Has rechazado esta oferta.')
  })
  it('el encabezado indica de quién es', () => {
    expect(offerCopy({ status: 'pending', mine: true, otherName: 'Marta', collaborationCreated: false }).heading).toBe('Tu oferta a Marta')
    expect(offerCopy({ status: 'pending', mine: false, otherName: 'Marta', collaborationCreated: false }).heading).toBe('Oferta de Marta')
  })
})

describe('systemIcon', () => {
  it('check para aceptaciones, info para el resto', () => {
    expect(systemIcon('Oferta aceptada. Precio acordado')).toBe('ph:check-circle-fill')
    expect(systemIcon('otra cosa')).toBe('ph:info-fill')
    expect(systemIcon(null)).toBe('ph:info-fill')
  })
})
