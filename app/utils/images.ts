export interface CoverPhoto {
  /** Id de Unsplash (usado con el provider "unsplash" de @nuxt/image). Omitir si se usa `src`. */
  id?: string
  /** Ruta local en /public (usada con el provider IPX por defecto). Omitir si se usa `id`. */
  src?: string
  alt: string
  credit?: string
  creditUrl?: string
}

// Fotografías libres (Unsplash License) servidas vía el provider "unsplash" de @nuxt/image.
export const coverPhotos = {
  landing: {
    id: 'photo-1781127445118-8140677fdea1',
    alt: 'Cámara de cine profesional grabando en un set de rodaje',
    credit: 'Cemrecan Yurtman',
    creditUrl: 'https://unsplash.com/@cmrcn_'
  },
  creator: {
    id: 'photo-1755997268256-31b838ebd238',
    alt: 'Escritorio de creación de contenido con monitores y un aro de luz',
    credit: 'TRIANGLEMZ',
    creditUrl: 'https://unsplash.com/@zaini_666'
  },
  partner: {
    id: 'photo-1620917669809-1af0497965de',
    alt: 'Envase minimalista de un producto de cuidado de la piel',
    credit: 'Mathilde Langevin',
    creditUrl: 'https://unsplash.com/@mathildelangevin'
  }
} satisfies Record<string, CoverPhoto>

// Fotos propias (public/img), servidas en local con el provider IPX por defecto.
export const localPhotos = {
  onboarding: {
    src: '/img/pexels-artempodrez-5716035.jpg',
    alt: 'Equipo revisando gráficas e informes en una mesa de reuniones'
  },
  discover: {
    src: '/img/pexels-thirdman-7181178.jpg',
    alt: 'Mesa de trabajo con paletas de color y gráficas de una campaña'
  },
  socials: {
    src: '/img/pexels-viralyft-16852355.jpg',
    alt: 'Móvil mostrando una carpeta de apps de redes sociales'
  },
  install: {
    src: '/img/pexels-tracy-le-blanc-67789-607812.jpg',
    alt: 'Mano sosteniendo un móvil con una carpeta de redes sociales en la pantalla de inicio'
  },
  metrics: {
    src: '/img/pexels-yankrukov-7693745.jpg',
    alt: 'Dos personas señalando gráficas impresas de métricas sobre una mesa'
  }
} satisfies Record<string, CoverPhoto>
