export interface CoverPhoto {
  id: string
  alt: string
  credit: string
  creditUrl: string
}

// Fotografías libres (Unsplash License) servidas vía el provider "unsplash" de @nuxt/image.
export const coverPhotos = {
  landing: {
    id: 'photo-1781127445118-8140677fdea1',
    alt: 'Cámara de cine profesional grabando en un set de rodaje',
    credit: 'Cemrecan Yurtman',
    creditUrl: 'https://unsplash.com/@cmrcn_'
  },
  manager: {
    id: 'photo-1759868937753-34859b641bc1',
    alt: 'Notas de colores sobre una pizarra blanca, planificando un proyecto',
    credit: 'Akinyemi Gbadamosi',
    creditUrl: 'https://unsplash.com/@mhyk3y'
  },
  creator: {
    id: 'photo-1755997268256-31b838ebd238',
    alt: 'Escritorio de creación de contenido con monitores y un aro de luz',
    credit: 'TRIANGLEMZ',
    creditUrl: 'https://unsplash.com/@zaini_666'
  },
  client: {
    id: 'photo-1620917669809-1af0497965de',
    alt: 'Envase minimalista de un producto de cuidado de la piel',
    credit: 'Mathilde Langevin',
    creditUrl: 'https://unsplash.com/@mathildelangevin'
  }
} satisfies Record<string, CoverPhoto>
