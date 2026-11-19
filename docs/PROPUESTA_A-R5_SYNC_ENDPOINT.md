# Propuesta A-R5 (Q3): endpoint de sincronización independiente del scheduler

> **Actualización 2026-10-28:** endpoint implementado (`server/api/social/sync-all.post.ts`), SIN scheduler. Ver CHANGELOG Alex-15 para lo verificado y lo pendiente.
> Estado original: **PROPUESTA de diseño, nada implementado ni activado.** No se añade ningún cron ni workflow programado hasta decidir el despliegue. Depende de la columnas de M1 (`PROPUESTA_ESQUEMA_A-R2_A-R7_A-R8.md`), que requieren tu aprobación.
> Fecha: 2026-10-28.

## 1. Idea

Un único endpoint de servidor, `POST /api/social/sync-all`, que sincroniza un lote de cuentas conectadas. Cualquier mecanismo (cron del host, `pg_cron`, GitHub Actions o una llamada manual) puede invocarlo. El endpoint no sabe quién lo llama: solo valida un secreto.

## 2. Autenticación y autorización

- **Secreto compartido** `SYNC_CRON_SECRET` en `Authorization: Bearer …`, comparado con `timingSafeEqual` (mismo criterio que `oauth-state.ts`). No es una sesión de usuario.
- **Falla cerrado:** si la variable no está configurada, el endpoint responde `503` y no hace nada (no hay valor por defecto).
- El valor nunca se imprime ni se registra. Se añade `syncCronSecret` a `nuxt.config.ts` y una línea **sin valor** a `.env.example`.
- Es independiente de las sesiones: las rutas de usuario (`instagram-sync`, `youtube-sync`) siguen como están.
- Un secreto en cabecera no es protección frente a un atacante con acceso a los logs del proveedor del scheduler; rotación manual si se sospecha.

## 3. Rate limiting

- Límite por IP/clave global con `enforceRateLimit` (Mario, `server/utils/rate-limit.ts`): p. ej. 1 ejecución por minuto. **Limitación conocida:** es en memoria y solo vale para una instancia; por eso **no es la defensa principal** (ver §4).
- Intentos con secreto incorrecto: contados aparte y limitados para frenar fuerza bruta; sin revelar si el secreto existe.
- Coordinar con Mario (dueño del archivo): solo se usa su función, sin modificarla.

## 4. Prevención de ejecuciones simultáneas

La defensa real es un **cerrojo en base de datos por cuenta** (`sync_lock_until`, M1), no la memoria del proceso:

1. Para cada cuenta candidata: una única sentencia atómica `update … set sync_lock_until = now() + interval '5 minutes' where id = :id and (sync_lock_until is null or sync_lock_until < now()) returning id`.
2. Si devuelve fila, esa ejecución tiene la cuenta; si no, otra ejecución la está procesando y se **salta**.
3. Al terminar (éxito o fallo, en `finally`) se libera el cerrojo. Si el proceso muere, el cerrojo caduca solo a los 5 minutos.

Resultado: dos ejecuciones simultáneas se reparten las cuentas sin duplicar trabajo, aunque haya varias instancias del servidor.

## 5. Idempotencia y límites

- Las escrituras son `upsert` por clave natural (`social_account_snapshots`: cuenta+día; `metrics`: publicación+fuente+día). Reintentar no duplica.
- **Lote acotado** (p. ej. máximo N cuentas por llamada, ordenadas por `last_synced_at` más antiguo): N configurable.
- Solo cuentas con `status = 'connected'` y `is_verified`.
- Espaciado: se omite una cuenta si `last_sync_attempt_at` es muy reciente (evita martillear una cuenta que falla).
- Cada llamada al proveedor ya tiene tope de 8 s (`youtube.ts`); se aplicará a Instagram.
- Errores mapeados a código: `expired`/`revoked`/`missing_permissions` cambian `status`; los temporales y de red solo rellenan `last_error_code`/`last_error_at`.
- Renovación del token de Instagram integrada (A-R2): el token solo se puede renovar si tiene más de 24 h y no ha caducado; detalle a verificar en la documentación de Meta antes de implementar. Para YouTube el `refresh_token` ya renueva el `access_token` en cada sync.

## 6. Observabilidad

- Respuesta: `{ processed, ok, failed, skipped, durationMs }`, sin datos personales.
- Registro estructurado por cuenta con id interno y código de resultado; **nunca** tokens, respuestas crudas del proveedor ni el secreto.
- `last_synced_at`, `last_error_code` y `last_error_at` reflejan el resultado real de cada cuenta.

## 7. Qué NO hace esta propuesta

- No configura ningún scheduler, no añade `.github/workflows` ni `vercel.json`, no crea jobs de `pg_cron`.
- No cambia los endpoints de sync manual.
- No se puede ejecutar sin las columnas de M1 aplicadas.

## 8. Pruebas

- Unitarias (sin BD ni red): comparación del secreto (válido, inválido, ausente, longitud distinta), falla cerrado sin variable, lógica de selección de lote, mapeo de errores a estado, formato del resumen sin secretos.
- Con cliente de Supabase simulado: la adquisición del cerrojo (primer proceso sí, segundo no), liberación en `finally` y caducidad.
- Integración (BD compartida, coordinar): dos llamadas concurrentes no procesan la misma cuenta; reintento sin duplicados. Requieren M1 aplicada.
- Proveedor real: bloqueado por Meta (Q5) para Instagram; YouTube necesita credenciales de Google.

## 9. Qué necesito de ti

- [ ] ¿Apruebas este diseño como base?
- [ ] Mientras no se decida el despliegue: ¿implemento el endpoint y la lógica **sin** scheduler, con tests, una vez aplicadas las columnas de M1?
