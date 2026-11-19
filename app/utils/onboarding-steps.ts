import type { Role } from '~/types'

export interface TourStep {
  icon: string
  title: string
  body: string
  /**
   * Elemento real de la interfaz que se ilumina en este paso (`data-tour="…"`: `nav:<ruta>` para el menú, `account`
   * para el bloque de la cuenta). Si no existe o no se ve (p. ej. el menú de escritorio en móvil), el paso sale
   * centrado, sin señalar nada: el texto se entiende igual.
   */
  target?: string
  /** Acción recomendada en este paso: lleva a esa pantalla al pulsarla. */
  action?: { label: string; to: string }
}

/**
 * Contenido del recorrido de bienvenida (M-O1). Cada paso señala el apartado real del menú del que habla, en el
 * orden en que se usa la aplicación, y cada rol cierra con una primera acción recomendada. El tono es práctico:
 * qué se hace ahí y por qué importa. Rutas estables de `roleNav`.
 */
export const tourSteps: Record<Role, TourStep[]> = {
  creator: [
    {
      icon: 'ph:hand-waving-fill',
      title: 'Te damos la bienvenida a CIBERAN',
      body: 'Aquí gestionas tus publicaciones y tus colaboraciones con marcas en un solo sitio, y durante el lanzamiento es gratis. Te señalamos lo esencial en un minuto; puedes saltarlo cuando quieras.'
    },
    {
      icon: 'ph:house-fill',
      title: 'Inicio: tu resumen',
      body: 'Lo que toca esta semana, las solicitudes por responder y tus primeros pasos. Si no sabes por dónde seguir, empieza siempre por aquí.',
      target: 'nav:/creator'
    },
    {
      icon: 'ph:compass-fill',
      title: 'Descubrir: encuentra marcas',
      body: 'Busca marcas y agencias que encajan contigo y envíales una propuesta. Filtra por categoría o presupuesto y guarda tus búsquedas.',
      target: 'nav:/creator/discover'
    },
    {
      icon: 'ph:handshake-fill',
      title: 'Colaboraciones: cada acuerdo, en un sitio',
      body: 'Cada colaboración tiene su espacio con el siguiente paso, los entregables, el acuerdo, el chat y la actividad. Siempre sabrás a quién le toca mover ficha.',
      target: 'nav:/creator/requests'
    },
    {
      icon: 'ph:kanban-fill',
      title: 'Publicaciones: tu contenido, de la idea a publicarlo',
      body: 'Organiza cada pieza en un tablero, un calendario o una lista. Arrastra una tarjeta para cambiarla de fase o de día, y vincúlala a una colaboración para que la marca la revise.',
      target: 'nav:/creator/timeline'
    },
    {
      icon: 'ph:package-fill',
      title: 'Tu perfil y tus paquetes: lo primero que ven las marcas',
      body: 'Una ficha completa y unos paquetes claros (qué haces y a qué precio) son lo que hace que te elijan en Descubrir y te hagan ofertas directas. Empieza por aquí.',
      target: 'account',
      action: { label: 'Ir a mi perfil', to: '/creator/profile' }
    }
  ],
  partner: [
    {
      icon: 'ph:hand-waving-fill',
      title: 'Te damos la bienvenida a CIBERAN',
      body: 'Aquí encuentras creadores, acuerdas colaboraciones y revisas su contenido antes de que se publique, y durante el lanzamiento es gratis. Te señalamos lo esencial en un minuto; puedes saltarlo cuando quieras.'
    },
    {
      icon: 'ph:house-fill',
      title: 'Inicio: lo que necesita tu decisión',
      body: 'Un resumen de lo que está en marcha y del contenido pendiente de tu aprobación, con tus primeros pasos. Empieza siempre por aquí.',
      target: 'nav:/partner'
    },
    {
      icon: 'ph:compass-fill',
      title: 'Descubrir: encuentra creadores',
      body: 'Busca creadores por categoría, tarifa, red o tiempo de respuesta, o descríbelos con tus palabras y deja que la IA te sugiera los que mejor encajan. Mira sus paquetes y contacta.',
      target: 'nav:/partner/discover'
    },
    {
      icon: 'ph:handshake-fill',
      title: 'Colaboraciones: de la solicitud a la publicación',
      body: 'Acordad el alcance, el precio y las entregas. Cada colaboración tiene su espacio, y desde ahí apruebas el contenido o pides cambios.',
      target: 'nav:/partner/requests'
    },
    {
      icon: 'ph:user-circle-fill',
      title: 'Tu perfil: cuéntales quién eres',
      body: 'Cuéntales a los creadores quién eres y qué buscas: así las propuestas que recibas serán las adecuadas. Puedes volver a ver este recorrido desde ahí.',
      target: 'account',
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
