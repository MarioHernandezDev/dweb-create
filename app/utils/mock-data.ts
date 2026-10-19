import type {
  ClientAccount,
  CoverArt,
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

export const clients: ClientAccount[] = [
  { id: 'nomada', name: 'Nómada Studio', industry: 'Moda sostenible', initials: 'NS', hue: 18, weeklyTarget: 4 },
  { id: 'raiz', name: 'Raíz Café', industry: 'Hostelería', initials: 'RC', hue: 28, weeklyTarget: 3 },
  { id: 'lumina', name: 'Lúmina Skincare', industry: 'Belleza', initials: 'LS', hue: 300, weeklyTarget: 5 },
  { id: 'pulso', name: 'Pulso Fitness', industry: 'Fitness', initials: 'PF', hue: 202, weeklyTarget: 6 },
  { id: 'tinta', name: 'Tinta & Co', industry: 'Papelería y diseño', initials: 'TC', hue: 150, weeklyTarget: 2 }
]

export const agencyPosts: Post[] = [
  { id: 'p1', clientId: 'nomada', title: 'Reel: detrás de cámaras del teñido natural', caption: 'Así nace el color de nuestra próxima colección, directamente de la tierra.', contentType: 'reel', platform: 'instagram', status: 'overdue', dueInDays: -1, hashtags: ['#modasostenible', '#slowfashion'], cover: cover(18) },
  { id: 'p2', clientId: 'nomada', title: 'Carrusel: guía de tallas inclusiva', caption: 'Encuentra tu talla sin adivinar. Guía completa en el carrusel.', contentType: 'carousel', platform: 'instagram', status: 'in_production', dueInDays: 1, hashtags: ['#tallasinclusivas'], cover: cover(24) },
  { id: 'p3', clientId: 'nomada', title: 'Story: encuesta de próxima colección', caption: '¿Qué color quieres ver primero?', contentType: 'story', platform: 'instagram', status: 'scheduled', dueInDays: 3, hashtags: [], cover: cover(10) },
  { id: 'p4', clientId: 'nomada', title: 'Vídeo largo: proceso de curtido vegetal', caption: 'De la hoja al cuero, sin un solo químico agresivo.', contentType: 'video', platform: 'youtube', status: 'idea', dueInDays: 6, hashtags: ['#curtidovegetal'], cover: cover(32) },

  { id: 'p5', clientId: 'raiz', title: 'Reel: ritual del café de la mañana', caption: 'Tres minutos, un grano, cero prisa.', contentType: 'reel', platform: 'tiktok', status: 'ready_for_review', dueInDays: 0, hashtags: ['#coffeelovers'], cover: cover(28) },
  { id: 'p6', clientId: 'raiz', title: 'Carrusel: nueva carta de otoño', caption: 'Cinco sabores que huelen a octubre.', contentType: 'carousel', platform: 'instagram', status: 'scheduled', dueInDays: 2, hashtags: ['#cartaotoño'], cover: cover(34) },
  { id: 'p7', clientId: 'raiz', title: 'Imagen: nueva tostadora en directo', caption: 'Hoy tostamos en sala, ven a verlo.', contentType: 'image', platform: 'instagram', status: 'published', dueInDays: -4, hashtags: [], cover: cover(20) },

  { id: 'p8', clientId: 'lumina', title: 'Reel: rutina skincare nocturna', caption: 'Cuatro pasos, cinco minutos, piel lista para mañana.', contentType: 'reel', platform: 'tiktok', status: 'in_production', dueInDays: 1, hashtags: ['#skincare', '#rutinanocturna'], cover: cover(300) },
  { id: 'p9', clientId: 'lumina', title: 'Carrusel: ingredientes explicados', caption: 'Qué hace el ácido hialurónico y por qué lo llevamos en todo.', contentType: 'carousel', platform: 'instagram', status: 'overdue', dueInDays: -2, hashtags: ['#acidohialuronico'], cover: cover(312) },
  { id: 'p10', clientId: 'lumina', title: 'Story: antes y después 4 semanas', caption: '', contentType: 'story', platform: 'instagram', status: 'scheduled', dueInDays: 4, hashtags: [], cover: cover(290) },
  { id: 'p11', clientId: 'lumina', title: 'Reel: mitos del protector solar', caption: 'No, no necesitas esperar 20 minutos. Te lo explicamos.', contentType: 'reel', platform: 'instagram', status: 'ready_for_review', dueInDays: 0, hashtags: ['#spf', '#mitosybelleza'], cover: cover(306) },
  { id: 'p12', clientId: 'lumina', title: 'Vídeo: visita al laboratorio', caption: 'Así se formula cada lote antes de salir de fábrica.', contentType: 'video', platform: 'youtube', status: 'idea', dueInDays: 7, hashtags: [], cover: cover(318) },

  { id: 'p13', clientId: 'pulso', title: 'Reel: rutina de 10 minutos sin material', caption: 'Sin excusas, sin gimnasio, sin equipo.', contentType: 'reel', platform: 'tiktok', status: 'scheduled', dueInDays: 1, hashtags: ['#homeworkout', '#10minworkout'], cover: cover(202) },
  { id: 'p14', clientId: 'pulso', title: 'Carrusel: error nº1 en sentadillas', caption: 'Lo que el 80% hace mal (y cómo corregirlo hoy).', contentType: 'carousel', platform: 'instagram', status: 'in_production', dueInDays: 2, hashtags: ['#tecnicadesentadilla'], cover: cover(210) },
  { id: 'p15', clientId: 'pulso', title: 'Reel: reto de 7 días', caption: 'Un movimiento nuevo cada día. Empezamos el lunes.', contentType: 'reel', platform: 'instagram', status: 'published', dueInDays: -3, hashtags: ['#reto7dias'], cover: cover(196) },
  { id: 'p16', clientId: 'pulso', title: 'Story: encuesta de horario de clases', caption: '¿Mañana o tarde?', contentType: 'story', platform: 'instagram', status: 'overdue', dueInDays: -1, hashtags: [], cover: cover(218) },

  { id: 'p17', clientId: 'tinta', title: 'Carrusel: cómo elegir tu primera pluma', caption: 'Guía rápida para quien empieza en el mundo analógico.', contentType: 'carousel', platform: 'instagram', status: 'idea', dueInDays: 5, hashtags: ['#papeleria'], cover: cover(150) },
  { id: 'p18', clientId: 'tinta', title: 'Reel: unboxing colección cápsula', caption: 'Lo nuevo acaba de llegar al taller.', contentType: 'reel', platform: 'instagram', status: 'ready_for_review', dueInDays: 0, hashtags: ['#unboxing'], cover: cover(158) }
]

export const creatorClient: ClientAccount = {
  id: 'self',
  name: 'Tu cuenta',
  industry: 'Lifestyle y productividad',
  initials: 'TU',
  hue: 266,
  weeklyTarget: 5
}

export const creatorPosts: Post[] = [
  { id: 'c1', clientId: 'self', title: 'Reel: mi escritorio minimalista 2026', caption: 'Todo lo que uso cada día cabe en una mesa de 90cm.', contentType: 'reel', platform: 'instagram', status: 'ready_for_review', dueInDays: 0, hashtags: ['#desksetup', '#minimalismo'], cover: cover(266), successScore: 78 },
  { id: 'c2', clientId: 'self', title: 'Carrusel: 5 apps que cambiaron mi rutina', caption: 'Nada de productividad tóxica, solo lo que realmente uso.', contentType: 'carousel', platform: 'instagram', status: 'in_production', dueInDays: 1, hashtags: ['#productividad'], cover: cover(274) },
  { id: 'c3', clientId: 'self', title: 'Vídeo: un día conmigo (vlog)', caption: 'De las 7 de la mañana a medianoche, sin editar lo aburrido.', contentType: 'video', platform: 'youtube', status: 'scheduled', dueInDays: 3, hashtags: ['#dayinmylife'], cover: cover(258) },
  { id: 'c4', clientId: 'self', title: 'Story: pregúntame lo que quieras', caption: '', contentType: 'story', platform: 'instagram', status: 'scheduled', dueInDays: 2, hashtags: [], cover: cover(280) },
  { id: 'c5', clientId: 'self', title: 'Reel: por qué dejé mi trabajo de oficina', caption: 'La historia completa, sin filtros.', contentType: 'reel', platform: 'tiktok', status: 'overdue', dueInDays: -1, hashtags: ['#careerchange'], cover: cover(250) },
  { id: 'c6', clientId: 'self', title: 'Carrusel: mi setup de cámara para vlogs', caption: 'Todo el equipo, con precios reales.', contentType: 'carousel', platform: 'instagram', status: 'published', dueInDays: -3, hashtags: ['#gear'], cover: cover(290) },
  { id: 'c7', clientId: 'self', title: 'Reel: 3 libros que leí este mes', caption: 'Resumen de 60 segundos de cada uno.', contentType: 'reel', platform: 'instagram', status: 'idea', dueInDays: 6, hashtags: ['#booktok'], cover: cover(244) }
]

// Orden fijo validado (CVD-safe): tiktok, youtube, x, instagram — no reordenar.
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
