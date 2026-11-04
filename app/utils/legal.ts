/**
 * Datos del responsable para las páginas legales (/privacidad, /terminos).
 *
 * ÚNICO sitio donde rellenar los datos reales: las dos páginas los leen de
 * aquí. Mientras algún valor siga empezando por `[POR COMPLETAR`, las páginas
 * muestran un aviso de "borrador" y marcan el hueco en amarillo para que no
 * pase desapercibido. Al sustituir todos, el aviso desaparece solo.
 *
 * Esto es una plantilla, no asesoramiento jurídico: antes de publicar con
 * usuarios reales, que lo revise un gestor/abogado (ver Q13 en
 * docs/PENDIENTE_MARIO.md).
 */
export const legal = {
  /** Nombre comercial; ya conocido. */
  brand: 'CIBERAN',
  /** Persona física o jurídica titular del servicio. */
  ownerName: '[POR COMPLETAR: nombre y apellidos o razón social]',
  /** NIF/CIF del titular. */
  ownerTaxId: '[POR COMPLETAR: NIF/CIF]',
  /** Domicilio postal del titular. */
  ownerAddress: '[POR COMPLETAR: dirección postal completa]',
  /** Email para consultas generales y ejercicio de derechos RGPD. */
  contactEmail: '[POR COMPLETAR: email de contacto]',
  /** Datos registrales, solo si es sociedad (Registro Mercantil). Si no aplica, dejar vacío ''. */
  registry: '[POR COMPLETAR: datos del Registro Mercantil, o vaciar si no aplica]',
  /** URL pública del sitio, sin barra final. */
  siteUrl: '[POR COMPLETAR: https://tu-dominio.com]',
  /** Ley y foro aplicables. */
  jurisdiction: '[POR COMPLETAR: juzgados y tribunales de (ciudad)]',
  /** Plazo de conservación de datos fiscales/de pago tras el borrado de la cuenta (Q13). */
  fiscalRetention: '[POR COMPLETAR: plazo, p. ej. 6 años según la normativa mercantil y tributaria]',
  /** Comisión de la plataforma sobre las colaboraciones pagadas, si hay. */
  platformFee: '[POR COMPLETAR: comisión de la plataforma, o indicar que no hay]',
  /** Fecha de la última revisión del texto (se muestra en la cabecera). */
  lastUpdated: '[POR COMPLETAR: fecha de última actualización]'
} as const

export const PLACEHOLDER_MARK = '[POR COMPLETAR'

/** Verdadero mientras quede algún dato por rellenar (solo cuenta los obligatorios). */
export const legalHasPlaceholders = Object.entries(legal).some(
  ([key, value]) => key !== 'registry' && value.startsWith(PLACEHOLDER_MARK)
)
