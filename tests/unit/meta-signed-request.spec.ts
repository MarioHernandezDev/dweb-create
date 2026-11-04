import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyMetaSignedRequest } from '../../server/utils/meta-signed-request'

const SECRET = 'secreto-de-prueba-de-la-app'
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function sign(payload: object, secret = SECRET) {
  const encodedPayload = b64url(JSON.stringify(payload))
  const signature = b64url(createHmac('sha256', secret).update(encodedPayload).digest())
  return `${signature}.${encodedPayload}`
}

describe('verifyMetaSignedRequest', () => {
  it('acepta una solicitud bien firmada y devuelve el id del usuario', () => {
    const r = verifyMetaSignedRequest(sign({ algorithm: 'HMAC-SHA256', user_id: '17841400000000', issued_at: 1700000000 }), SECRET)
    expect(r).toEqual({ userId: '17841400000000', issuedAt: 1700000000 })
  })

  it('acepta un user_id numérico y lo devuelve como texto', () => {
    expect(verifyMetaSignedRequest(sign({ algorithm: 'HMAC-SHA256', user_id: 12345 }), SECRET)?.userId).toBe('12345')
  })

  it('rechaza una firma hecha con otro secreto', () => {
    expect(verifyMetaSignedRequest(sign({ algorithm: 'HMAC-SHA256', user_id: '1' }, 'otro-secreto'), SECRET)).toBeNull()
  })

  it('rechaza una carga manipulada después de firmar', () => {
    const [sig] = sign({ algorithm: 'HMAC-SHA256', user_id: '1' }).split('.')
    const forged = `${sig}.${b64url(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '2' }))}`
    expect(verifyMetaSignedRequest(forged, SECRET)).toBeNull()
  })

  it('rechaza un algoritmo distinto de HMAC-SHA256', () => {
    expect(verifyMetaSignedRequest(sign({ algorithm: 'none', user_id: '1' }), SECRET)).toBeNull()
  })

  it('rechaza si falta el user_id', () => {
    expect(verifyMetaSignedRequest(sign({ algorithm: 'HMAC-SHA256' }), SECRET)).toBeNull()
    expect(verifyMetaSignedRequest(sign({ algorithm: 'HMAC-SHA256', user_id: '' }), SECRET)).toBeNull()
  })

  it('rechaza formatos rotos y valores que no son texto, sin lanzar', () => {
    for (const bad of [undefined, null, 42, {}, '', 'sin-punto', 'a.b.c', '.', 'a.', '.b', 'abc.@@@', 'abc.' + b64url('no es json')]) {
      expect(verifyMetaSignedRequest(bad, SECRET)).toBeNull()
    }
  })

  it('falla cerrado si el secreto de la app no está configurado', () => {
    const signed = sign({ algorithm: 'HMAC-SHA256', user_id: '1' }, '')
    expect(verifyMetaSignedRequest(signed, undefined)).toBeNull()
    expect(verifyMetaSignedRequest(signed, '')).toBeNull()
  })
})
