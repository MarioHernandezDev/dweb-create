export default defineEventHandler(async (event) => {
  const session = await adminSession(event)
  return { authenticated: Boolean(session.data.authenticated) }
})
