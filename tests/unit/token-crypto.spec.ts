import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptToken, encryptToken } from '../../server/utils/token-crypto'

// Claves generadas al vuelo en cada ejecución: ningún secreto real en los tests.
const key = () => randomBytes(32).toString('base64')

const IV_LENGTH = 12
const TAG_LENGTH = 16

/** Cambia un byte del paquete (iv | tag | texto cifrado) y lo vuelve a codificar. */
function flipByte(encoded: string, index: number): string {
  const raw = Buffer.from(encoded, 'base64')
  raw[index] = raw[index]! ^ 0xff
  return raw.toString('base64')
}

describe('token-crypto', () => {
  describe('cifrar y descifrar', () => {
    it.each([
      ['ascii', 'ya29.a0AfH6SMB-token_de_ejemplo'],
      ['unicode', 'tóken ñandú 日本語 🔐'],
      ['largo', 'x'.repeat(5000)],
      ['cadena vacía', '']
    ])('devuelve el texto original (%s)', (_name, plain) => {
      const secret = key()
      expect(decryptToken(encryptToken(plain, secret), secret)).toBe(plain)
    })

    it('produce un resultado distinto cada vez (IV aleatorio) y ambos descifran igual', () => {
      const secret = key()
      const a = encryptToken('mismo-token', secret)
      const b = encryptToken('mismo-token', secret)
      expect(a).not.toBe(b)
      expect(decryptToken(a, secret)).toBe('mismo-token')
      expect(decryptToken(b, secret)).toBe('mismo-token')
    })

    it('empaqueta iv + tag + texto cifrado en una sola cadena base64 y no contiene el texto en claro', () => {
      const plain = 'token-secreto-reconocible'
      const encoded = encryptToken(plain, key())
      const raw = Buffer.from(encoded, 'base64')

      expect(raw.length).toBe(IV_LENGTH + TAG_LENGTH + Buffer.byteLength(plain, 'utf8'))
      expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/)
      expect(encoded).not.toContain(plain)
      expect(raw.includes(Buffer.from(plain))).toBe(false)
    })
  })

  describe('clave inválida', () => {
    it.each([
      ['vacía', ''],
      ['demasiado corta (16 bytes)', randomBytes(16).toString('base64')],
      ['demasiado larga (33 bytes)', randomBytes(33).toString('base64')],
      ['no es una clave en base64', 'esto-no-es-una-clave']
    ])('cifrar falla con una clave %s', (_name, badKey) => {
      expect(() => encryptToken('token', badKey)).toThrow(/32 bytes/)
    })

    it('descifrar falla con una clave de longitud incorrecta', () => {
      const encoded = encryptToken('token', key())
      expect(() => decryptToken(encoded, randomBytes(16).toString('base64'))).toThrow(/32 bytes/)
    })

    it('el mensaje de error no incluye la clave', () => {
      const bad = 'clave-incorrecta-reconocible'
      try {
        encryptToken('token', bad)
        expect.unreachable()
      } catch (err) {
        expect(String(err)).not.toContain(bad)
      }
    })
  })

  describe('datos inválidos al descifrar', () => {
    it('falla con otra clave válida (no devuelve basura)', () => {
      const encoded = encryptToken('token', key())
      expect(() => decryptToken(encoded, key())).toThrow()
    })

    it.each([
      ['el iv', 0],
      ['el tag de autenticación', IV_LENGTH],
      ['el texto cifrado', IV_LENGTH + TAG_LENGTH]
    ])('falla si se altera un byte de %s', (_name, index) => {
      const secret = key()
      const tampered = flipByte(encryptToken('token-con-contenido', secret), index)
      expect(() => decryptToken(tampered, secret)).toThrow()
    })

    it('falla si al paquete le falta parte del final', () => {
      const secret = key()
      const raw = Buffer.from(encryptToken('token-con-contenido', secret), 'base64')
      const truncated = raw.subarray(0, raw.length - 3).toString('base64')
      expect(() => decryptToken(truncated, secret)).toThrow()
    })

    it.each([
      ['cadena vacía', ''],
      ['más corta que iv + tag', Buffer.alloc(IV_LENGTH + TAG_LENGTH - 1).toString('base64')],
      ['texto que no es un paquete cifrado', 'texto-cualquiera']
    ])('falla con una entrada inválida (%s)', (_name, input) => {
      expect(() => decryptToken(input, key())).toThrow()
    })
  })
})
