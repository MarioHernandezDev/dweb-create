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
      body: 'Aquí gestionas tus publicaciones y tus colaboraciones con marcas en un solo sitio, y durante el lanzamiento es gratis. Te enseñamos lo esencial en un minuto.'
    },
    {
      icon: 'ph:kanban-fill',
      title: 'Hoy y Publicaciones',
      body: 'En Hoy ves lo que toca esta semana. En Publicaciones organizas cada pieza en un tablero, un calendario o una lista, desde la idea hasta que se publica: arrastra una tarjeta para cambiarla de fase o de día.'
    },
    {
      icon: 'ph:compass-fill',
      title: 'Descubrir',
      body: 'Encuentra marcas y agencias que encajan contigo: filtra por categoría, presupuesto o formato, guarda tus búsquedas y envía una propuesta con una plantilla.'
    },
    {
      icon: 'ph:handshake-fill',
      title: 'Colaboraciones',
      body: 'Cada colaboración tiene su propio espacio con Resumen, Entregables, Acuerdo y archivos, Chat y Actividad. Allí acordáis las condiciones, compartís archivos y, si hace falta, cancelar de común acuerdo.'
    },
    {
      icon: 'ph:chart-bar-fill',
      title: 'Resultados',
      body: 'En Resultados tienes cómo van tus colaboraciones dentro de CIBERAN: plazos, respuestas y valoraciones. Las métricas de tus redes llegarán más adelante.'
    },
    {
      icon: 'ph:user-circle-fill',
      title: 'Empieza por tu perfil',
      body: 'Una ficha completa es lo que hace que las marcas te encuentren y confíen en ti. En «Privacidad y cuenta» eliges quién puede escribirte y qué avisos recibes. Puedes volver a ver este recorrido desde ahí.',
      action: { label: 'Ir a mi perfil', to: '/creator/profile' }
    }
  ],
  partner: [
    {
      icon: 'ph:hand-waving-fill',
      title: 'Te damos la bienvenida a CIBERAN',
      body: 'Aquí encuentras creadores, acuerdas colaboraciones y revisas su contenido antes de que se publique, y durante el lanzamiento es gratis. Te enseñamos lo esencial en un minuto.'
    },
    {
      icon: 'ph:compass-fill',
      title: 'Descubrir',
      body: 'Busca creadores por categoría, presupuesto, red o tiempo de respuesta, o descríbelos con tus palabras y deja que la IA te sugiera los que mejor encajan. Guarda tus búsquedas para repetirlas.'
    },
    {
      icon: 'ph:handshake-fill',
      title: 'Colaboraciones',
      body: 'Contacta a un creador y acordad el alcance, el precio y las entregas. Cada colaboración tiene su espacio con Resumen, Entregables, Acuerdo y archivos, Chat y Actividad, y desde ahí apruebas el contenido o pides cambios.'
    },
    {
      icon: 'ph:house-fill',
      title: 'Inicio y Resultados',
      body: 'Tu panel resume lo que está en marcha y el contenido pendiente de tu aprobación. En Resultados ves plazos, respuestas y valoraciones de tus colaboraciones.'
    },
    {
      icon: 'ph:user-circle-fill',
      title: 'Empieza por tu perfil',
      body: 'Cuéntales a los creadores quién eres y qué buscas: así las propuestas que recibas serán las adecuadas. En «Privacidad y cuenta» eliges quién puede escribirte y qué avisos recibes. Puedes volver a ver este recorrido desde ahí.',
      action: { label: 'Ir a mi perfil', to: '/partner/profile' }
    }
  ]
}

/** Una cuenta cuenta como «nueva» durante estos días desde que se creó (da margen a confirmar el email antes del primer acceso). */
export const TOUR_NEW_ACCOUNT_DAYS = 7

export interface TourAutoStartInput {
  /** Si el estado de la cuenta se pudo leer. Si no, no se muestra nada: ante la duda, no molestar. */
  accountRead: boolean
  /** `profiles.onboarding_completed_at`: cuándo vio o saltó el recorrido. */
  completedAt: string | null
  /** `profiles.created_at`. */
  createdAt: string | null
  /** Marcador local de este navegador. */
  seenLocally: boolean
  now?: Date
}

/**
 * ¿Hay que abrir el recorrido solo? Únicamente la primera vez de una cuenta recién creada.
 * Quien ya lo vio (en la cuenta o en este navegador), las cuentas antiguas y los casos dudosos no lo
 * ven solos: pueden abrirlo a mano con «Ver el recorrido de bienvenida».
 */
export function shouldAutoStartTour(input: TourAutoStartInput): boolean {
  if (!input.accountRead || input.completedAt || input.seenLocally) return false
  const created = input.createdAt ? Date.parse(input.createdAt) : Number.NaN
  if (Number.isNaN(created)) return false
  const ageMs = (input.now ?? new Date()).getTime() - created
  return ageMs <= TOUR_NEW_ACCOUNT_DAYS * 24 * 3600 * 1000
}
