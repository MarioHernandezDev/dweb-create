/**
 * URL a la que devolver al usuario tras un callback de OAuth.
 *
 * Meta exige una URI de redirección HTTPS, así que en desarrollo el callback
 * llega por un túnel (p. ej. https://algo.ngrok-free.app) en vez de por
 * localhost. Si luego se redirigiera con una ruta relativa, el navegador se
 * quedaría en el dominio del túnel, donde no existe la sesión (las cookies
 * son de localhost). Con `APP_URL` definida se vuelve siempre a la app real.
 *
 * Solo viene de la configuración del servidor (nunca de la petición), así que
 * no abre un redirect a sitios arbitrarios. Si no está definida o no es una
 * URL http(s) válida, se devuelve la ruta relativa de siempre.
 */
export function appRedirectUrl(appUrl: string | undefined, path: string): string {
  if (!appUrl) return path
  try {
    const url = new URL(appUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return path
    return `${url.origin}${path.startsWith('/') ? path : `/${path}`}`
  } catch {
    return path
  }
}
