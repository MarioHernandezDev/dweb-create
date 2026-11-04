// Convierte montaje.json (tiempos reales del vídeo) en la tabla del storyboard.
// Uso: node gen-storyboard.mjs <montaje.json>  → imprime Markdown
import { readFileSync } from 'node:fs'
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const META = {
  'card-intro': ['Tarjeta de inicio', '—', 'Presentar qué es FEEDMA y avisar de que todo es ficticio', 'Logo y título sobre fondo animado'],
  'card-m1': ['Tarjeta de módulo', '—', 'Abrir el bloque del creador', '«Conoce a AREZZ»'],
  'arezz-hoy': ['/creator (Hoy)', 'AREZZ', 'El creador ve su día de un vistazo', 'Resaltado de indicadores y «Necesita tu atención»'],
  'arezz-metricas': ['/creator/metrics', 'AREZZ', 'Métricas por red, sin inflar lo que no existe', 'Distintivo «Cifras ficticias»; «Próximamente» en las redes no conectables'],
  'card-m2': ['Tarjeta de módulo', '—', 'Cambiar al punto de vista de la marca', '«Descubre creadores»'],
  'nova-descubre': ['/partner → /partner/discover', 'NOVA', 'Encontrar al creador adecuado con filtros', 'Filtro «Moda»; resaltado de la tarjeta de AREZZ'],
  'nova-perfil': ['/profile/creator/:id', 'NOVA', 'Decidir con datos: redes, tarifa, reputación y paquetes', 'Distintivo «Cifras ficticias»; resaltados por bloque'],
  'card-m3': ['Tarjeta de módulo', '—', 'Abrir la negociación', '«Negocia colaboraciones»'],
  'nova-chat': ['/chat/:id', 'NOVA', 'Contactar y ofertar sobre un paquete', 'Hoja de oferta con precio y mensaje'],
  'arezz-recibe': ['/chat/:id', 'AREZZ', 'Negociar sin salir del chat', 'Tarjeta de oferta; confirmación de rechazo'],
  'nova-contraoferta': ['/chat/:id', 'NOVA', 'Responder a la contraoferta', 'Resaltado del mensaje; nueva oferta'],
  'arezz-acepta': ['/chat/:id → /creator/requests', 'AREZZ', 'Aceptar crea la colaboración sola', 'Oferta «Aceptada»; colaboración en curso con 1.050 €'],
  'card-m4': ['Tarjeta de módulo', '—', 'Pasar a la producción', '«Gestiona tus proyectos»'],
  'arezz-studio': ['/creator/timeline', 'AREZZ', 'FEEDMA Studio: crear la entrega vinculada', 'Compositor; predicción con su aviso «sin IA»'],
  'arezz-entrega': ['/creator/post/:id', 'AREZZ', 'Subir la pieza y mandarla a revisión', 'Subida de imagen; cambio de fase'],
  'card-m5': ['Tarjeta de módulo', '—', 'Abrir el ciclo de revisión', '«Revisa y aprueba»'],
  'nova-pide-cambios': ['/partner', 'NOVA', 'La marca revisa antes de publicar', 'Hoja de revisión; comentario obligatorio'],
  'arezz-corrige': ['/inbox → /creator/post/:id', 'AREZZ', 'El aviso lleva directo al cambio pedido', 'Banner de cambios; nueva imagen y texto'],
  'nova-aprueba': ['/partner', 'NOVA', 'Aprobar y planificar', 'Comentario al aprobar; calendario'],
  'arezz-publica': ['/creator/post/:id → /creator/timeline', 'AREZZ', 'Cerrar la entrega', 'Fase «Publicado» en el tablero'],
  'card-m6': ['Tarjeta de módulo', '—', 'Cerrar la colaboración', '«Cierra y valora»'],
  'nova-completa': ['/partner/requests', 'NOVA', 'Completar y valorar', 'Confirmación; estrellas y comentario'],
  'arezz-valora': ['/creator/requests', 'AREZZ', 'Reputación recíproca', 'Valoración de la marca'],
  'card-outro': ['Tarjeta de cierre', '—', 'Resumen del producto y aviso de datos ficticios', 'Logo y lema']
}
const t = (s) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}` }
console.log('| # | Inicio | Duración | Página | Quién | Mensaje | Rótulos en pantalla (subtítulos) | Elementos destacados | Transición |')
console.log('|---|---|---|---|---|---|---|---|---|')
rows.forEach((r, i) => {
  const [pagina, quien, mensaje, visual] = META[r.escena] ?? [r.escena, '', '', '']
  const rot = r.rotulos.map((x) => x.replace(/\|/g, '/')).join('<br>')
  console.log(`| ${i + 1} | ${t(r.inicio)} | ${r.duracion.toFixed(1)} s | ${pagina} | ${quien} | ${mensaje} | ${rot} | ${visual} | ${i === 0 ? 'Entrada' : 'Fundido cruzado 0,6 s'} |`)
})
const last = rows[rows.length - 1]
console.log(`\n**Duración total:** ${t(last.inicio + last.duracion)} (${rows.length} planos).`)
