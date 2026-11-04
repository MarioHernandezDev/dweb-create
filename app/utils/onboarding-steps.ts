import type { Role } from '~/types'

export interface TourStep {
  icon: string
  title: string
  body: string
  /** Acción recomendada en este paso: lleva a esa pantalla al pulsarla. */
  action?: { label: string; to: string }
}

/**
 * Contenido del recorrido de bienvenida (M-O1). Los textos hablan de los
 * apartados del menú (rutas estables de `roleNav`), no de la estructura
 * interna de cada pantalla, que cambia a menudo. Cada rol cierra con una
 * primera acción recomendada.
 */
export const tourSteps: Record<Role, TourStep[]> = {
  creator: [
    {
      icon: 'ph:hand-waving-fill',
      title: 'Te damos la bienvenida a CIBERAN',
      body: 'Aquí gestionas tus publicaciones, tus redes y tus colaboraciones con marcas en un solo sitio. Te enseñamos lo esencial en un minuto.'
    },
    {
      icon: 'ph:kanban-fill',
      title: 'Hoy y Publicaciones',
      body: 'En Hoy ves lo que toca esta semana. En Publicaciones las organizas en un tablero o en una lista, desde la idea hasta que se publica.'
    },
    {
      icon: 'ph:compass-fill',
      title: 'Descubrir y Colaboraciones',
      body: 'En Descubrir encuentras marcas y agencias que encajan contigo. Cuando alguien te contacta, o tú a él, la negociación y los pagos viven en Colaboraciones y en el Chat.'
    },
    {
      icon: 'ph:share-network-fill',
      title: 'Redes y Métricas',
      body: 'Conecta tus redes para ver tus métricas reales y recibir predicciones sobre tu contenido.'
    },
    {
      icon: 'ph:user-circle-fill',
      title: 'Empieza por tu perfil',
      body: 'Una ficha completa es lo que hace que las marcas te encuentren y confíen en ti.',
      action: { label: 'Ir a mi perfil', to: '/creator/profile' }
    }
  ],
  partner: [
    {
      icon: 'ph:hand-waving-fill',
      title: 'Te damos la bienvenida a CIBERAN',
      body: 'Aquí encuentras creadores, acuerdas colaboraciones y revisas su contenido antes de que se publique. Te enseñamos lo esencial en un minuto.'
    },
    {
      icon: 'ph:compass-fill',
      title: 'Descubrir',
      body: 'Busca creadores por categoría y presupuesto, o descríbelos con tus palabras y deja que la IA te sugiera los que mejor encajan.'
    },
    {
      icon: 'ph:handshake-fill',
      title: 'Colaboraciones y Chat',
      body: 'Contacta a un creador, negocia en el Chat y gestiona el estado, la revisión del contenido y el pago desde Colaboraciones.'
    },
    {
      icon: 'ph:house-fill',
      title: 'Inicio',
      body: 'Tu panel resume lo que está en marcha y el contenido pendiente de tu aprobación.'
    },
    {
      icon: 'ph:user-circle-fill',
      title: 'Empieza por tu perfil',
      body: 'Cuéntales a los creadores quién eres y qué buscas: así las propuestas que recibas serán las adecuadas.',
      action: { label: 'Ir a mi perfil', to: '/partner/profile' }
    }
  ]
}
