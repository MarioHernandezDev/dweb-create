/** Insignias de las pestañas (pendientes) y alertas del panel. Solo recuentos. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return loadAdminOverview(event)
})
