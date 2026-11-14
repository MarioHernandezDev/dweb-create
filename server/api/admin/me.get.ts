export default defineEventHandler(async (event) => {
  const actor = await getAdminActor(event)
  const config = useRuntimeConfig(event)
  return {
    authenticated: Boolean(actor),
    name: actor?.name ?? null,
    role: actor?.role ?? null,
    memberId: actor?.memberId ?? null,
    sharedLogin: !config.adminSharedLoginDisabled
  }
})
