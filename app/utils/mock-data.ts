import type {
  BrandClient,
  CoverArt,
  Influencer,
  Manager,
  MetricSummary,
  Platform,
  Post,
  SocialAccount,
  SparklinePoint,
  Suggestion,
  TrendSuggestion
} from '~/types'

function cover(hue: number, spread = 36, angle = 135): CoverArt {
  return {
    from: `hsl(${hue} 78% 54%)`,
    to: `hsl(${(hue + spread) % 360} 70% 40%)`,
    angle
  }
}

// El manager que representa el roster de abajo (vista "Manager" de la demo).
export const managers: Manager[] = [
  { id: 'estudio-nova', name: 'Estudio Nova', focus: 'Moda, fitness y belleza', initials: 'EN', hue: 262 },
  { id: 'claro-talent', name: 'Claro Talent', focus: 'Gaming y tecnología', initials: 'CT', hue: 202 }
]

// Roster del manager de la demo (Estudio Nova) + un par de independientes,
// para que la página de descubrir cliente muestre los dos caminos posibles.
export const influencers: Influencer[] = [
  { id: 'valeria', name: 'Valeria Ríos', niche: 'Moda sostenible', initials: 'VR', hue: 18, weeklyTarget: 4, followers: 86_400, managerId: 'estudio-nova' },
  { id: 'kai', name: 'Kai Moreno', niche: 'Café y comida de especialidad', initials: 'KM', hue: 28, weeklyTarget: 3, followers: 41_200, managerId: 'estudio-nova' },
  { id: 'nora', name: 'Nora Blake', niche: 'Belleza y skincare', initials: 'NB', hue: 300, weeklyTarget: 5, followers: 128_900, managerId: 'estudio-nova' },
  { id: 'diego', name: 'Diego Marín', niche: 'Fitness', initials: 'DM', hue: 202, weeklyTarget: 6, followers: 203_500, managerId: 'estudio-nova' },
  { id: 'elena', name: 'Elena Vidal', niche: 'Papelería y diseño', initials: 'EV', hue: 150, weeklyTarget: 2, followers: 19_800, managerId: 'estudio-nova' },
  { id: 'marcos', name: 'Marcos Ibarra', niche: 'Tecnología', initials: 'MI', hue: 220, weeklyTarget: 3, followers: 54_600, managerId: null },
  { id: 'sofia', name: 'Sofía Reyes', niche: 'Viajes', initials: 'SR', hue: 190, weeklyTarget: 3, followers: 97_300, managerId: null }
]

export const influencerPosts: Post[] = [
  { id: 'p1', influencerId: 'valeria', title: 'Reel: detrás de cámaras del teñido natural', caption: 'Así nace el color de la próxima colección, directamente de la tierra.', contentType: 'reel', platform: 'instagram', status: 'overdue', dueInDays: -1, hashtags: ['#modasostenible', '#slowfashion'], cover: cover(18) },
  { id: 'p2', influencerId: 'valeria', title: 'Carrusel: guía de tallas inclusiva', caption: 'Encuentra tu talla sin adivinar. Guía completa en el carrusel.', contentType: 'carousel', platform: 'instagram', status: 'in_production', dueInDays: 1, hashtags: ['#tallasinclusivas'], cover: cover(24) },
  { id: 'p3', influencerId: 'valeria', title: 'Story: encuesta de próxima colección', caption: '¿Qué color quieres ver primero?', contentType: 'story', platform: 'instagram', status: 'scheduled', dueInDays: 3, hashtags: [], cover: cover(10) },
  { id: 'p4', influencerId: 'valeria', title: 'Vídeo largo: proceso de curtido vegetal', caption: 'De la hoja al cuero, sin un solo químico agresivo.', contentType: 'video', platform: 'youtube', status: 'idea', dueInDays: 6, hashtags: ['#curtidovegetal'], cover: cover(32) },

  { id: 'p5', influencerId: 'kai', title: 'Reel: ritual del café de la mañana', caption: 'Tres minutos, un grano, cero prisa.', contentType: 'reel', platform: 'tiktok', status: 'ready_for_review', dueInDays: 0, hashtags: ['#coffeelovers'], cover: cover(28) },
  { id: 'p6', influencerId: 'kai', title: 'Carrusel: mi ruta de cafeterías de otoño', caption: 'Cinco sitios que huelen a octubre.', contentType: 'carousel', platform: 'instagram', status: 'scheduled', dueInDays: 2, hashtags: ['#cartaotoño'], cover: cover(34) },
  { id: 'p7', influencerId: 'kai', title: 'Imagen: probando el tueste nuevo', caption: 'Hoy toca cata en directo, venid a verlo.', contentType: 'image', platform: 'instagram', status: 'published', dueInDays: -4, hashtags: [], cover: cover(20) },

  { id: 'p8', influencerId: 'nora', title: 'Reel: rutina skincare nocturna', caption: 'Cuatro pasos, cinco minutos, piel lista para mañana.', contentType: 'reel', platform: 'tiktok', status: 'in_production', dueInDays: 1, hashtags: ['#skincare', '#rutinanocturna'], cover: cover(300) },
  { id: 'p9', influencerId: 'nora', title: 'Carrusel: ingredientes explicados', caption: 'Qué hace el ácido hialurónico y por qué lo llevo en todo.', contentType: 'carousel', platform: 'instagram', status: 'overdue', dueInDays: -2, hashtags: ['#acidohialuronico'], cover: cover(312) },
  { id: 'p10', influencerId: 'nora', title: 'Story: antes y después 4 semanas', caption: '', contentType: 'story', platform: 'instagram', status: 'scheduled', dueInDays: 4, hashtags: [], cover: cover(290) },
  { id: 'p11', influencerId: 'nora', title: 'Reel: mitos del protector solar', caption: 'No, no necesitas esperar 20 minutos. Te lo explico.', contentType: 'reel', platform: 'instagram', status: 'ready_for_review', dueInDays: 0, hashtags: ['#spf', '#mitosybelleza'], cover: cover(306) },
  { id: 'p12', influencerId: 'nora', title: 'Vídeo: visita al laboratorio de Alma Beauty', caption: 'Así se formula cada lote antes de salir de fábrica.', contentType: 'video', platform: 'youtube', status: 'idea', dueInDays: 7, hashtags: [], cover: cover(318) },

  { id: 'p13', influencerId: 'diego', title: 'Reel: rutina de 10 minutos sin material', caption: 'Sin excusas, sin gimnasio, sin equipo.', contentType: 'reel', platform: 'tiktok', status: 'scheduled', dueInDays: 1, hashtags: ['#homeworkout', '#10minworkout'], cover: cover(202) },
  { id: 'p14', influencerId: 'diego', title: 'Carrusel: error nº1 en sentadillas', caption: 'Lo que el 80% hace mal (y cómo corregirlo hoy).', contentType: 'carousel', platform: 'instagram', status: 'in_production', dueInDays: 2, hashtags: ['#tecnicadesentadilla'], cover: cover(210) },
  { id: 'p15', influencerId: 'diego', title: 'Reel: reto de 7 días', caption: 'Un movimiento nuevo cada día. Empezamos el lunes.', contentType: 'reel', platform: 'instagram', status: 'published', dueInDays: -3, hashtags: ['#reto7dias'], cover: cover(196) },
  { id: 'p16', influencerId: 'diego', title: 'Story: encuesta de horario de clases', caption: '¿Mañana o tarde?', contentType: 'story', platform: 'instagram', status: 'overdue', dueInDays: -1, hashtags: [], cover: cover(218) },

  { id: 'p17', influencerId: 'elena', title: 'Carrusel: cómo elegir tu primera pluma', caption: 'Guía rápida para quien empieza en el mundo analógico.', contentType: 'carousel', platform: 'instagram', status: 'idea', dueInDays: 5, hashtags: ['#papeleria'], cover: cover(150) },
  { id: 'p18', influencerId: 'elena', title: 'Reel: unboxing colección cápsula', caption: 'Lo nuevo acaba de llegar al taller.', contentType: 'reel', platform: 'instagram', status: 'ready_for_review', dueInDays: 0, hashtags: ['#unboxing'], cover: cover(158) }
]

// Vista en primera persona (rol "Creador"): un influencer independiente
// viendo su propio tablero — managerId null a propósito, para cubrir el
// otro camino del marketplace (el de "Mantener los 3 roles" sin manager de por medio).
export const selfInfluencer: Influencer = {
  id: 'self',
  name: 'Tu cuenta',
  niche: 'Lifestyle y productividad',
  initials: 'TU',
  hue: 266,
  weeklyTarget: 5,
  followers: 170_500,
  managerId: null
}

export const creatorPosts: Post[] = [
  { id: 'c1', influencerId: 'self', title: 'Reel: mi escritorio minimalista 2026', caption: 'Todo lo que uso cada día cabe en una mesa de 90cm.', contentType: 'reel', platform: 'instagram', status: 'ready_for_review', dueInDays: 0, hashtags: ['#desksetup', '#minimalismo'], cover: cover(266), successScore: 78 },
  { id: 'c2', influencerId: 'self', title: 'Carrusel: 5 apps que cambiaron mi rutina', caption: 'Nada de productividad tóxica, solo lo que realmente uso.', contentType: 'carousel', platform: 'instagram', status: 'in_production', dueInDays: 1, hashtags: ['#productividad'], cover: cover(274) },
  { id: 'c3', influencerId: 'self', title: 'Vídeo: un día conmigo (vlog)', caption: 'De las 7 de la mañana a medianoche, sin editar lo aburrido.', contentType: 'video', platform: 'youtube', status: 'scheduled', dueInDays: 3, hashtags: ['#dayinmylife'], cover: cover(258) },
  { id: 'c4', influencerId: 'self', title: 'Story: pregúntame lo que quieras', caption: '', contentType: 'story', platform: 'instagram', status: 'scheduled', dueInDays: 2, hashtags: [], cover: cover(280) },
  { id: 'c5', influencerId: 'self', title: 'Reel: por qué dejé mi trabajo de oficina', caption: 'La historia completa, sin filtros.', contentType: 'reel', platform: 'tiktok', status: 'overdue', dueInDays: -1, hashtags: ['#careerchange'], cover: cover(250) },
  { id: 'c6', influencerId: 'self', title: 'Carrusel: mi setup de cámara para vlogs', caption: 'Todo el equipo, con precios reales.', contentType: 'carousel', platform: 'instagram', status: 'published', dueInDays: -3, hashtags: ['#gear'], cover: cover(290) },
  { id: 'c7', influencerId: 'self', title: 'Reel: 3 libros que leí este mes', caption: 'Resumen de 60 segundos de cada uno.', contentType: 'reel', platform: 'instagram', status: 'idea', dueInDays: 6, hashtags: ['#booktok'], cover: cover(244) }
]

// La marca de la demo (rol "Cliente"): tiene una colaboración activa con
// Nora Blake, a través de su manager Estudio Nova.
export const myBrand: BrandClient = {
  id: 'alma-beauty',
  name: 'Alma Beauty Co.',
  industry: 'Belleza',
  initials: 'AB',
  hue: 300
}
export const myBrandInfluencerId = 'nora'

export const metricsByPlatform: MetricSummary[] = [
  { platform: 'tiktok', views: 512_900, likes: 48_760, comments: 3_410, shares: 5_220, deltaPct: 24.1 },
  { platform: 'youtube', views: 68_200, likes: 4_120, comments: 540, shares: 210, deltaPct: -3.6 },
  { platform: 'x', views: 31_500, likes: 1_890, comments: 320, shares: 410, deltaPct: 5.2 },
  { platform: 'instagram', views: 284_300, likes: 21_540, comments: 1_280, shares: 960, deltaPct: 12.4 }
]

export const engagementSeries: SparklinePoint[] = [
  { label: 'L', value: 42 },
  { label: 'M', value: 58 },
  { label: 'X', value: 51 },
  { label: 'J', value: 67 },
  { label: 'V', value: 74 },
  { label: 'S', value: 63 },
  { label: 'D', value: 81 }
]

export const socialAccounts: SocialAccount[] = [
  { id: 'sa2', platform: 'tiktok', handle: '@tucuenta', followers: 112_800, deltaPct: 8.7, connected: true },
  { id: 'sa3', platform: 'youtube', handle: 'Tu Canal', followers: 9_420, deltaPct: 1.1, connected: true },
  { id: 'sa4', platform: 'x', handle: '@tucuenta', followers: 0, deltaPct: 0, connected: false },
  { id: 'sa1', platform: 'instagram', handle: '@tucuenta', followers: 48_300, deltaPct: 3.2, connected: true },
  { id: 'sa5', platform: 'facebook', handle: '', followers: 0, deltaPct: 0, connected: false },
  { id: 'sa6', platform: 'linkedin', handle: 'Tu Página', followers: 3_120, deltaPct: 2.4, connected: true }
]

export const trendSuggestions: TrendSuggestion[] = [
  { id: 't1', platform: 'tiktok', topic: 'Rutinas de escritorio en 60 segundos', trendScore: 88, growthPct: 34, hashtags: ['#desksetup', '#productividad'], format: 'Reel con transición rápida' },
  { id: 't2', platform: 'instagram', topic: 'Comparativas de precio real vs. percibido', trendScore: 81, growthPct: 21, hashtags: ['#dineroreal'], format: 'Carrusel con capturas' },
  { id: 't3', platform: 'youtube', topic: 'Un día en la vida sin editar', trendScore: 76, growthPct: 19, hashtags: ['#dayinmylife'], format: 'Vlog de 8-12 minutos' },
  { id: 't4', platform: 'tiktok', topic: 'Mitos desmentidos en 3 frases', trendScore: 72, growthPct: 15, hashtags: ['#mitos'], format: 'Texto en pantalla + voz en off' }
]

export const suggestionsForDraft: Suggestion[] = [
  { kind: 'caption', text: 'Abre con una pregunta directa: "¿Cuántas apps crees que necesitas para ser productivo?"' },
  { kind: 'caption', text: 'Cierra con una invitación clara a guardar el post, no solo a comentar.' },
  { kind: 'hashtag', text: 'Añade #rutinamatutina, tiene un 18% más de alcance esta semana en tu nicho.' },
  { kind: 'schedule', text: 'Publica el jueves entre 18:00 y 20:00: es tu franja de mayor engagement histórico.' }
]

export const platformMeta: Record<Platform, { label: string; icon: string; colorVar: string }> = {
  tiktok: { label: 'TikTok', icon: 'ph:tiktok-logo-fill', colorVar: 'var(--color-platform-tiktok)' },
  youtube: { label: 'YouTube', icon: 'ph:youtube-logo-fill', colorVar: 'var(--color-platform-youtube)' },
  x: { label: 'X', icon: 'ph:x-logo-fill', colorVar: 'var(--color-platform-x)' },
  instagram: { label: 'Instagram', icon: 'ph:instagram-logo-fill', colorVar: 'var(--color-platform-instagram)' },
  facebook: { label: 'Facebook', icon: 'ph:facebook-logo-fill', colorVar: 'var(--color-platform-facebook)' },
  linkedin: { label: 'LinkedIn', icon: 'ph:linkedin-logo-fill', colorVar: 'var(--color-platform-linkedin)' }
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
