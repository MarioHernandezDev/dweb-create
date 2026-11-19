import type { Role } from '~/types'

/**
 * Plantillas para crear un paquete (o una necesidad) en dos clics: rellenan título, descripción y entregables, que
 * después se editan a gusto. Son solo texto de partida, nunca un precio: eso lo decide cada persona.
 */
export interface PackageTemplate {
  id: string
  label: string
  title: string
  description: string
  deliverables: string[]
}

export const PACKAGE_TEMPLATES: Record<Role, PackageTemplate[]> = {
  creator: [
    { id: 'reel', label: '1 Reel', title: '1 Reel', description: 'Un reel pensado para tu marca, con guion, grabación y edición incluidos.', deliverables: ['1 Reel'] },
    { id: 'reel-stories', label: 'Reel + 3 Stories', title: '1 Reel + 3 Stories', description: 'Un reel principal y tres stories para reforzar el mensaje durante la semana.', deliverables: ['1 Reel', '3 Stories'] },
    { id: 'stories', label: '3 Stories', title: '3 Stories', description: 'Tres stories con enlace o mención, ideales para acciones rápidas.', deliverables: ['3 Stories'] },
    { id: 'review', label: 'Reseña en vídeo', title: 'Reseña en vídeo', description: 'Pruebo tu producto y lo cuento con mi opinión sincera, en un vídeo cuidado.', deliverables: ['1 Vídeo de reseña'] },
    { id: 'unboxing', label: 'Unboxing', title: 'Unboxing + Reel', description: 'Unboxing del producto en directo y un reel resumen con lo mejor.', deliverables: ['1 Unboxing en stories', '1 Reel'] },
    { id: 'monthly', label: 'Pack mensual', title: 'Pack mensual de 4 Reels', description: 'Presencia constante durante un mes: un reel por semana con línea creativa común.', deliverables: ['4 Reels', '1 Informe de resultados'] }
  ],
  partner: [
    { id: 'launch', label: 'Lanzamiento', title: 'Lanzamiento de producto', description: 'Buscamos creadores para presentar un producto nuevo con contenido original.', deliverables: ['1 Reel', '3 Stories'] },
    { id: 'season', label: 'Campaña de temporada', title: 'Campaña de temporada', description: 'Campaña con un mensaje común durante varias semanas, con piezas de distinto formato.', deliverables: ['2 Reels', '1 Post'] },
    { id: 'always-on', label: 'Contenido recurrente', title: 'Colaboración recurrente', description: 'Relación continuada con un creador: contenido periódico y una línea de comunicación estable.', deliverables: ['4 Reels al mes'] }
  ]
}

/** Entregables más comunes: un clic los añade a la lista. */
export const DELIVERABLE_SUGGESTIONS = ['1 Reel', '1 Post', '1 Carrusel', '3 Stories', '1 Vídeo de YouTube', '1 Unboxing']
