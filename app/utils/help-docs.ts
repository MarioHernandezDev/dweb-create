/**
 * Manuales y guías descargables de la página pública /ayuda.
 * Los PDF viven en `public/manuales/` y salen de `docs/manual/` con `node docs/manual/_build/build.mjs`
 * (ese script los copia). Al regenerarlos, actualiza aquí `pages` y `version` si cambian.
 * Un test (tests/unit/help-docs.spec.ts) comprueba que cada enlace apunta a un PDF que existe.
 */
export interface HelpDoc {
  id: string
  title: string
  /** Quién debería leerlo (etiqueta corta). */
  audience: string
  description: string
  /** Qué contiene, en puntos cortos. */
  highlights: string[]
  href: string
  /** Nombre con el que se guarda al descargarlo. */
  filename: string
  pages: number
  version: string
  icon: string
}

export const helpDocs: HelpDoc[] = [
  {
    id: 'manual',
    title: 'Manual de usuario completo',
    audience: 'Creadores y partners',
    description: 'Todo CIBERAN explicado paso a paso, para quien nunca ha usado una plataforma así. Es el documento de consulta.',
    highlights: ['Registro, acceso y perfil', 'Colaboraciones de principio a fin', 'Preguntas frecuentes y glosario'],
    href: '/manuales/MANUAL_USUARIO_CIBERAN.pdf',
    filename: 'MANUAL_USUARIO_CIBERAN.pdf',
    pages: 78,
    version: 'v1.0',
    icon: 'ph:book-open-text-fill'
  },
  {
    id: 'creadores',
    title: 'Guía rápida para creadores',
    audience: 'Creadores de contenido',
    description: 'Para empezar en pocos minutos: de crear la cuenta a entregar tu primera colaboración.',
    highlights: ['Perfil y paquetes', 'Cómo proponer y responder solicitudes', 'Publicaciones, revisión y cierre'],
    href: '/manuales/GUIA_RAPIDA_CREADORES.pdf',
    filename: 'GUIA_RAPIDA_CREADORES.pdf',
    pages: 5,
    version: 'v1.0',
    icon: 'ph:camera-fill'
  },
  {
    id: 'partners',
    title: 'Guía rápida para partners',
    audience: 'Marcas, empresas y agencias',
    description: 'Para empezar en pocos minutos: de encontrar creadores a aprobar el contenido y cerrar la colaboración.',
    highlights: ['Cómo encontrar y contactar creadores', 'Negociar, definir entregables y revisar', 'Necesidades y resultados'],
    href: '/manuales/GUIA_RAPIDA_PARTNERS.pdf',
    filename: 'GUIA_RAPIDA_PARTNERS.pdf',
    pages: 5,
    version: 'v1.0',
    icon: 'ph:storefront-fill'
  }
]
