import { describe, expect, it } from 'vitest'
import { errorMessage } from '../../app/utils/error-message'
import { isApprovalRequiredError } from '../../app/utils/status'

describe('errorMessage', () => {
  it('conserva el mensaje del servidor aunque no sea una instancia de Error (PostgrestError)', () => {
    expect(errorMessage({ message: 'Faltan 2 entregable(s) por resolver.', code: 'P0001' }, 'genérico')).toBe('Faltan 2 entregable(s) por resolver.')
    expect(errorMessage(new Error('boom'), 'genérico')).toBe('boom')
  })
  it('usa el texto de reserva si no hay mensaje', () => {
    expect(errorMessage(null, 'genérico')).toBe('genérico')
    expect(errorMessage({ message: '' }, 'genérico')).toBe('genérico')
    expect(errorMessage('texto', 'genérico')).toBe('genérico')
  })
})

describe('isApprovalRequiredError', () => {
  it('reconoce el rechazo del servidor a programar/publicar sin aprobación', () => {
    expect(isApprovalRequiredError({ message: 'Esta publicación necesita la aprobación de la marca antes de programarse o publicarse. Envíala a revisión.' })).toBe(true)
    expect(isApprovalRequiredError(new Error('Necesita la aprobación de la marca'))).toBe(true)
  })
  it('no confunde otros errores', () => {
    expect(isApprovalRequiredError({ message: 'permission denied' })).toBe(false)
    expect(isApprovalRequiredError(null)).toBe(false)
  })
})
