# Integraciones externas pendientes

## Cobros: apagados para el lanzamiento gratis (2026-11-11)
`PAYMENTS_ENABLED` (ver `.env.example`) está apagado por defecto. Con él apagado:
- La interfaz no enseña Pro, «Pagar», comisión, cuenta de cobro ni estados de pago (`useLaunchMode()`).
- `/api/stripe/pay-collaboration`, `/api/stripe/create-checkout-session` y `/api/stripe/connect/account-link` responden 403 antes de tocar Stripe (`server/utils/payments-gate.ts`), aunque las claves estén puestas. El webhook sigue escuchando.
- El importe acordado en una colaboración es solo una referencia: se paga fuera de CIBERAN.

Para empezar a cobrar: completar `docs/7-STRIPE-SETUP.md` con claves reales, revisar términos (comisión) y poner `PAYMENTS_ENABLED=true`. No hay que tocar código.

**Decisión pendiente (créditos de predicción):** sin Pro, un creador tiene 3 predicciones y no puede conseguir más. Opciones: dejarlo así, dar una recarga mensual gratis (cuesta llamadas de IA) u ocultar la predicción. Hoy el texto dice «durante el lanzamiento no se pueden ampliar».

*Actualizado 2026-11-11. Lo que depende de credenciales, cuentas o servicios de terceros y por tanto no se puede terminar desde el código. Nada de esto bloquea el resto de la app: sin configurar, cada pieza queda apagada o con su aviso.*

| Integración | Estado del código | Qué falta (externo) | Cómo se comprueba |
|---|---|---|---|
| **Google (inicio de sesión)** | Botón «Continuar con Google» en `/login`, apagado por defecto (`GOOGLE_AUTH_ENABLED`). La vuelta entra por `/confirm` | 1) Google Cloud → credenciales OAuth (tipo Web), URI de redirección `https://<proyecto>.supabase.co/auth/v1/callback`. 2) Supabase → Authentication → Providers → Google: client id y secreto. 3) Supabase → URL Configuration: añadir `https://<dominio>/confirm`. 4) `GOOGLE_AUTH_ENABLED=true` | Entrar con una cuenta de Google cuyo email ya exista en CIBERAN |
| **Google (altas nuevas)** | **No resuelto a propósito.** `handle_new_user()` crea a quien llega sin rol como *creador*: una marca que se registre con Google quedaría como creador | Decidir y construir el paso «¿Eres creador o marca?» tras el primer acceso con Google (pantalla + RPC que fije el rol una sola vez). Hasta entonces, usar Google solo para acceder, no para registrarse | — |
| **Stripe: pagos reales** | Checkout de Pro, pago de colaboración por Connect y webhook idempotente, con claves de test | Stripe CLI para recibir webhooks en local; completar el onboarding de Connect de una cuenta de creador; claves `live` y endpoint del webhook en producción | `docs/7-STRIPE-SETUP.md` + un pago de prueba de punta a punta |
| **Stripe: portal de suscripción** | No existe (`useMyBilling` solo tiene `subscribe` y `connectPayouts`) | Activar el Customer Portal en el panel de Stripe; después, un endpoint `create-portal-session` y un botón «Gestionar suscripción» (medio día de trabajo) | Cancelar Pro desde la app |
| **Instagram Insights** | OAuth y sincronización de seguidores hechos; alcance e interacciones por publicación, no | Permiso `instagram_manage_insights` aprobado por Meta (revisión de la app) | `docs/9-INSTAGRAM-OAUTH-SETUP.md` |
| **Email transaccional** | No hay envío. Los avisos internos y las preferencias (`notification_preferences`) ya existen y serían la fuente | Cuenta en un proveedor (Resend/Postmark), dominio verificado (SPF/DKIM), clave de API. Después: función programada que lea avisos nuevos y respete las preferencias | Una solicitud genera un email en menos de un minuto |
| **Push web** | No hay *service worker* ni suscripción | Claves VAPID; decidir si se quiere PWA instalable (iOS solo admite push así) | — |
| **Sentry** | `sentry.client.config.ts` y `sentry.server.config.ts` listos; sin `SENTRY_DSN` el SDK queda inerte | Crear el proyecto en Sentry y poner `SENTRY_DSN` y `APP_ENV`. Decidir si se sube el *source map* (necesita token) | `docs/12-STAGING-Y-SENTRY.md`: provocar un error y verlo llegar |
| **Staging** | No existe: desarrollo, pruebas y producción comparten base de datos | Segundo proyecto de Supabase (o local con Docker) y variables separadas; aplicar las migraciones en orden. **Ojo:** `supabase_migrations` está vacío en la compartida y hay una versión duplicada (`20261021160000`): `supabase db push` necesita `migration repair` antes | `docs/12-STAGING-Y-SENTRY.md` |
| **Despliegue** | `npm run build` genera `.output/` (Nitro). El build necesita salida a internet para descargar las fuentes (`@nuxt/fonts`) | Elegir alojamiento (Vercel/Netlify/servidor Node), variables de entorno de producción, dominio y `APP_URL` | Build en CI (`.github/workflows/ci.yml`) |
| **Supabase: contraseñas filtradas** | — | Activar «Leaked password protection» en Authentication (solo desde el panel) | — |

## Equipos (varias personas por marca): por qué no se ha hecho

No es una integración externa, pero queda fuera por diseño y conviene dejarlo escrito. Hoy una marca es **una** cuenta: `partners.profile_id` es 1:1 y la función `current_partner_id()` —de la que cuelgan 15 políticas de seguridad— devuelve «la marca de este usuario». Hacer equipos bien implica:

1. Tabla `partner_members (partner_id, profile_id, role)` con roles (propietario, editor, lectura) e invitaciones por email con caducidad.
2. Cambiar `current_partner_id()` para resolver por pertenencia, y revisar **una a una** las 15 políticas y las RPC que la usan (aceptar, pagar, aprobar, cancelar, terminar): qué puede hacer cada rol.
3. Avisos y chat: hoy van a `partners.profile_id` (el dueño) y el chat es persona a persona. Con equipos hay que decidir quién recibe qué y a quién ve el creador al otro lado.
4. Alta: `handle_new_user()` crea una marca nueva por cada registro; un invitado no debe crear la suya.
5. Facturación y pago por Stripe: quién puede pagar en nombre de la marca.

Tocar la función de la que depende toda la seguridad, sobre la única base de datos (que además es producción), sin staging y sin pruebas de punta a punta, es el tipo de cambio que rompe permisos en silencio. Orden recomendado: staging → propuesta técnica con la matriz rol × acción → migración probada allí → interfaz. Estimación: 2–3 semanas.
