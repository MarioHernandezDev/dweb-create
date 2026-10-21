/**
 * Taxonomía fija de categorías/nichos, compartida por creadores y partners.
 * Al usar la MISMA lista en los dos lados, "qué ofrezco" (creador) y "qué
 * busco" (partner) se pueden cruzar por coincidencia exacta — sin esto, el
 * filtrado/matching de /creator/discover y /partner/discover no tendría
 * nada fiable que comparar. Se usa también para acotar lo que puede
 * devolver la búsqueda por IA (server/api/discover/search.post.ts), así las
 * analíticas de admin agregan sobre un conjunto cerrado de valores en vez de
 * texto libre inconsistente.
 */
export const DISCOVERY_CATEGORIES = [
  'Moda',
  'Belleza',
  'Fitness',
  'Nutrición',
  'Viajes',
  'Gastronomía',
  'Hogar y decoración',
  'Tecnología',
  'Gaming',
  'Finanzas',
  'Lifestyle',
  'Familia y maternidad',
  'Deporte',
  'Música',
  'Educación',
  'Mascotas',
  'Sostenibilidad',
  'Negocios y emprendimiento'
] as const

export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number]
