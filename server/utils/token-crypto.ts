import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function resolveKey(secret: string): Buffer {
  const key = Buffer.from(secret, 'base64')
  if (key.length !== 32) {
    throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY debe decodificar a 32 bytes en base64 (ver docs/9-INSTAGRAM-OAUTH-SETUP.md).')
  }
  return key
}

/**
 * Cifra un token de una red social antes de guardarlo en
 * `social_accounts.access_token_encrypted`/`refresh_token_encrypted` — esas
 * columnas se llaman así a propósito desde el esquema original, no es solo
 * una convención de nombre. AES-256-GCM con IV aleatorio por cifrado; el IV
 * y el tag de autenticación van empaquetados junto al texto cifrado, todo en
 * una sola cadena base64 (no hace falta guardarlos en columnas aparte).
 */
export function encryptToken(plainText: string, secret: string): string {
  const key = resolveKey(secret)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptToken(encoded: string, secret: string): string {
  const key = resolveKey(secret)
  const raw = Buffer.from(encoded, 'base64')
  const iv = raw.subarray(0, IV_LENGTH)
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
