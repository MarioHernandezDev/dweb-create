# Fase 2 — Auditoría de seguridad

> Fecha: 2026-11-03 · Alcance: base de datos (RLS, permisos, funciones), API del servidor, secretos, pagos, almacenamiento, tiempo real y dependencias.
> **Método:**
> - Auditoría de catálogo en transacciones `READ ONLY` sobre la base compartida.
> - Sondas `anon` con entradas que no modifican nada.
> - PGlite y Supabase local como entornos aislados.
> - Revisión de código.
>
> No se ha atacado la base compartida ni se han usado datos reales.

## 1. Resumen

| Gravedad | Encontrados | Corregidos | Pendientes |
|---|---|---|---|
| Crítica | 1 | 1 (H0-17) | 0 |
| Alta | 4 | 4 (H0-03, H0-02, S-01, S-02) | 0 |
| Media | 4 | 2 (S-03, S-08) | 2 (H0-09 rotación, S-09) |
| Baja | 5 | 1 (H0-08) | 4 (H0-11, S-10, S-11, S-12) |

**Todas las migraciones de seguridad están aplicadas en la base compartida y verificadas en el catálogo:**

| Migración | Hallazgo |
|---|---|
| `20261103130000` | H0-08 |
| `20261103140000` | H0-03 |
| `20261103150000` | H0-02 |
| `20261103160000` | H0-17 |
| `20261103170000` | S-01 a S-03 |

## 2. Hallazgos

### H0-17 · El alta de usuarios no creaba la ficha — Crítica · **Corregido**
El trigger `handle_new_user()` activo era una versión antigua. Una cuenta nueva quedaba sin ficha de creador o partner, así que sin perfil público, publicaciones ni presencia en Descubrir.
- **Arreglo:** `20261103160000`, aplicada.
- **Prueba:** cuerpo vivo idéntico a la migración. `signup-trigger.spec.ts` 2/2 contra la base. En el entorno de demo, las 11 cuentas se crearon con la Admin API y todas tienen ficha, créditos y aviso de bienvenida.

### H0-03 · Funciones `SECURITY DEFINER` ejecutables por cualquiera — Alta · **Corregido**
Con la clave pública (`anon`) se podía llamar a `notify()` e inyectar avisos con enlaces a cualquier usuario, lo que permitía phishing dentro de la app.
- **Arreglo:** `20261103140000`. Las funciones internas solo las ejecuta `service_role`, y las RPC de la app no tienen `EXECUTE` para `anon`.
- **Prueba:** catálogo y `function-privileges.spec.ts` 23/23.

### H0-02 · Webhook de pagos sin idempotencia ni reintentos — Alta · **Corregido**
Ver T-02 en la auditoría técnica. Quien pagara Pro no recibía créditos y los fallos se ocultaban.
- **Arreglo:** `stripe_invoice_id` único y respuesta 500 para que Stripe reintente.
- **Pendiente de prueba de extremo a extremo:** el circuito completo con Stripe CLI (plan S1-S9 de la validación).

### S-01 · El navegador podía crear colaboraciones ya «pagadas» o aceptadas — Alta · **Corregido**
`authenticated` tenía INSERT y UPDATE sobre **todas** las columnas de `collaborations`. La política de alta solo miraba quién la iniciaba, así que un alta podía llevar `status='completed'`, `paid_at`, `stripe_payment_intent_id` u `offer_id` puestos por el cliente.
- **Arreglo:** `20261103170000`: alta con 12 de 19 columnas y sin UPDATE directo. Los estados cambian solo por RPC (SECURITY DEFINER) o por el webhook.

### S-02 · Escalada de rol y fichas cruzadas — Alta · **Corregido**
- El usuario podía cambiarse `profiles.role`.
- `creators_insert_own` y `partners_insert_own` no miraban el rol, así que un partner podía crearse una ficha de creador (N-02).
- **Arreglo:** en `profiles` solo se pueden cambiar nombre, avatar y privacidad del chat. Se quitan las políticas de alta (las fichas las crea `handle_new_user()`).

### S-03 · Datos de Stripe Connect expuestos y escribibles — Media · **Corregido**
- Cualquier usuario con sesión leía el `stripe_connect_account_id` de todos los creadores.
- El propio creador podía escribirlo, igual que `stripe_connect_onboarded`.
- **Arreglo:** sin SELECT de esa columna ni UPDATE de las de Stripe para `authenticated`. El servidor las gestiona con `service_role`.
- **Prueba de que la app no se rompe:**
  - Todas las escrituras del navegador usan columnas concedidas.
  - No hay `select('*')` sobre `creators`.
  - Las 6 funciones que escriben en estas tablas son SECURITY DEFINER.
  - Regresión completa en el navegador en el entorno de demo: los 17 pasos del escenario, más ficha, portada, avatar, privacidad del chat y avisos leídos.

### S-08 · La privacidad del chat no se guardaba — Media · **Corregido**
Es un fallo funcional con impacto en privacidad. Quien elegía «Solo tras oferta aceptada» creía haber restringido quién le escribe, pero la elección no se guardaba (`useSupabaseUser().value.id` era `undefined`; ver T-05).
- **Arreglo:** `.sub`.
- **Prueba:** en el navegador, `chat_privacy='accepted_offers_only'` queda guardado en la base tras recargar.

### H0-09 · Contraseña de las cuentas demo en el repositorio — Media · **Parcial**
La contraseña ya no está en el código ni en la documentación: se lee de `DEMO_PASSWORD`.

**Pendiente:**
1. **Rotarla** en las cuentas demo de la base compartida. Sigue en el historial de git y en `app/pages/login.vue`, que es un archivo de Mario.
2. Quitarla de ese archivo.

El repositorio es privado, así que el riesgo es moderado.

### S-09 · Límites de uso en memoria — Media · **Pendiente**
`checkRateLimit` (búsqueda, predicción e inicio de sesión del panel) guarda los contadores en memoria del proceso. En un despliegue con varias instancias o *serverless*, cada instancia lleva su cuenta y el límite real se multiplica.
- El panel de administración lo mitiga con un tope global y comparación en tiempo constante.
- Ya está corregido que el límite por usuario era común a todos: usaba `user.id` en vez de `user.sub`.

**Propuesta:** contador en la base o en Redis/Upstash antes del despliegue.

### H0-08 · Borrado de `social_accounts` desde el navegador — Baja · **Corregido**
`20261103130000`: solo borra el servidor (`/api/social/disconnect`). `social-accounts-rls.spec.ts` 16/16.

### H0-11 · Canales de «escribiendo…» sin autorización — Baja · **Confirmado (código), pendiente**
`chat-typing-<profileId>` es un canal *broadcast* público: no usa `private: true` y no hay políticas en `realtime.messages`. Con la clave pública y el id de un perfil, cualquiera puede:
- escuchar a quién escribe esa persona (el id de la conversación y el de quien escribe);
- mostrarle un «escribiendo…» falso.

No expone el contenido de los mensajes: los cambios de `messages`, `offers` y `conversations` llegan por `postgres_changes`, que respeta RLS.

**Propuesta:** canales privados con una política que compruebe que `auth.uid()` es el destinatario.

### S-10 · Imágenes de borradores con URL pública — Baja · **Aceptado / pendiente de decisión**
El bucket `post-media` es público para lectura. Cada usuario solo escribe en su carpeta (`<uid>/…`) y hay límite de tamaño y de tipo. Aun así, la imagen de una publicación todavía sin publicar se puede ver si alguien conoce la URL, que contiene dos UUID y no se puede adivinar.

**Propuesta:** si los borradores son confidenciales para la marca, usar un bucket privado con URL firmada.

### S-11 · Aviso engañoso al aceptar una oferta — Baja · **Pendiente**
Al aceptar una oferta en el chat, el creador recibe «Nueva solicitud de colaboración — NOVA STUDIO quiere colaborar contigo». El aviso lo genera `notify_collaboration_created` para una colaboración que nace ya aceptada. No es explotable, pero confunde.

**Propuesta:** en `notify_collaboration_created`, no avisar (o usar otro texto) cuando `new.offer_id is not null`.

### S-12 · Dependencias — Baja · **Corregido / aceptado**
Ver T-03. No quedan críticas, altas ni moderadas. `node-forge` y `deepmerge` no llegan al servidor desplegado.

## 3. Lo que está bien (verificado)

- **RLS en las 28 tablas.** Las 57 políticas vivas coinciden exactamente con las migraciones.
- **Secretos:**
  - `.env` está ignorado.
  - La clave de servicio solo se usa en el servidor.
  - El único valor público de `runtimeConfig` es `stripePublishableKey`.
  - El build de demo no contiene claves `sk_` ni el identificador del proyecto compartido.
- **Tokens de redes cifrados** (AES-GCM, `token-crypto.spec.ts`) y `state` de OAuth firmado (`oauth-state.spec.ts`).
- **Panel de administración:** comparación en tiempo constante, cookie sellada (`httpOnly`, `sameSite=strict`, `secure`, 8 h) y límites por IP y en global.
- **Storage:** escritura limitada a la carpeta propia; límite de tamaño y de tipos MIME.
- **Funciones SECURITY DEFINER** con `set search_path = public`.

## 4. Pruebas de aceptación ejecutadas

| Prueba | Dónde | Resultado |
|---|---|---|
| Catálogo: permisos por columna, políticas de alta y funciones que escriben | Base compartida, solo lectura | Coincide con `20261103170000`; 6/6 funciones SECURITY DEFINER |
| `function-privileges.spec.ts` | Base compartida | 23/23 |
| `social-accounts-rls.spec.ts` | Base compartida | 16/16 |
| `signup-trigger.spec.ts` | Base compartida (crea y borra 2 cuentas) | 2/2 |
| `offers.spec.ts` | Base compartida | 4/4 y 0 restos |
| Regresión completa en el navegador (17 pasos y ajustes de perfil) | Supabase local + build de demo | Sin errores de página ni peticiones fallidas tras el arreglo T-05 |
