/**
 * Vacía toda la caché en memoria (useState) ligada a la cuenta logueada:
 * rol, ficha de rol (creator/partner) y los datos que dependen de ellas
 * (posts, redes, colaboraciones…). Se llama tanto al cerrar sesión de
 * verdad como al saltar entre cuentas de demo en `login.vue` (ahí no hay un
 * signOut real de por medio, así que sin esto se vería un instante el
 * contenido de la cuenta anterior).
 *
 * Cuando se añada un nuevo `useState` ligado a la cuenta, se vacía aquí
 * también — un único sitio, para no tener que recordar actualizar dos.
 */
export function resetAccountCaches() {
  // Caché corta de role-guard.global.ts (ver ese archivo) — sin esto, una
  // cuenta nueva podría heredar por hasta 30s el "usuario verificado" de la
  // sesión anterior en la misma pestaña (p. ej. al saltar entre cuentas de
  // demo en login.vue, donde no hay un signOut real de por medio).
  useState<{ id: string } | null>('role-guard-user-cache', () => null).value = null
  useState<number>('role-guard-user-cache-at', () => 0).value = 0

  useMyRole().reset()
  useMyCreator().reset()
  useMyPartner().reset()

  useState('my-posts', () => []).value = []
  useState<boolean>('my-posts-loaded', () => false).value = false
  useState('my-social-accounts', () => []).value = []
  useState<boolean>('my-social-accounts-loaded', () => false).value = false
  useState('my-collaborations', () => []).value = []
  useState<boolean>('my-collaborations-loaded', () => false).value = false
  useState<string | null>('my-collaborations-paying', () => null).value = null
  useState('partner-posts', () => []).value = []
  useState<boolean>('partner-posts-loaded', () => false).value = false
  useMyTrends().reset()
  useMyCredits().reset()
  useCollabRequests().reset()
  useNotifications().reset()
  useRatings().reset()
  useSavedProfiles().reset()
  usePostRevisions().reset()

  useState<unknown>('my-subscription', () => null).value = null
  useState<boolean>('my-subscription-loaded', () => false).value = false
  useState<boolean>('my-connect-onboarded', () => false).value = false
}
