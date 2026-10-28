# Propuesta A-R11 (ampliada): cerrar la falsificación de redes verificadas y la lectura de tokens

> Estado: **PROPUESTA, nada aplicado.** El SQL de abajo está solo en este documento, no en `supabase/migrations/`, para que no se aplique por accidente. Requiere aprobación explícita de Alex y aviso previo a Mario (zona protegida: RLS y permisos, Supabase compartido).
> Fecha: 2026-10-28. Basada en leer las migraciones y el código de las dos ramas; **no se ha comprobado nada contra la base de datos real** salvo los recuentos de A-R10 (ver CHANGELOG Alex-3).

## 1. Problema

Hoy un creador autenticado puede, con peticiones directas a Supabase (sin pasar por la app):

| # | Ataque | Por qué es posible | Efecto |
|---|---|---|---|
| 1 | Insertar una fila en `social_accounts` con `followers_count` inventado y `access_token_encrypted = 'x'` | `social_accounts_insert_self` solo exige `creator_id = current_creator_id()` | `get_public_social_accounts` la trata como "verificada" (solo mira `access_token_encrypted is not null`) y la muestra a los partners |
| 2 | Actualizar `followers_count` de su fila real | `social_accounts_update_self` sin restricción de columnas | Cifras falsas en perfil público, Descubrir (`discover/search` suma `followers_count`) y Métricas |
| 3 | Leer `access_token_encrypted` / `refresh_token_encrypted` de sus propias filas | `social_accounts_select_self` + `select` sobre todas las columnas | Riesgo bajo (están cifrados) pero innecesario |

Origen: `20261021120000_remove_manager_rename_creator_partner.sql` (policies `social_accounts_*_self`) y `20261022100000_public_social_accounts.sql` (RPC). Ninguna migración posterior toca `social_accounts` ni hace `revoke`/`grant` por columna (comprobado con grep en `supabase/migrations`).

## 2. Qué se puede ver hoy y qué no he podido comprobar

- **Supuesto, no comprobado:** que `anon` y `authenticated` tienen los privilegios por defecto de Supabase sobre las tablas de `public`. No tengo acceso SQL; propongo que se ejecute, solo lectura, en el SQL Editor antes de aplicar nada:
  ```sql
  select grantee, privilege_type, column_name
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'social_accounts'
    and grantee in ('anon', 'authenticated')
  order by grantee, column_name, privilege_type;
  ```
- **Supuesto, no comprobado:** que `service_role` conserva todos los privilegios (es el comportamiento estándar de Supabase y todo el código de servidor lo usa).

## 3. Diseño propuesto

### Principio
Las **escrituras** que afectan a la confianza (alta de cuenta, tokens, seguidores) las hace solo el servidor con `service_role`. El navegador lee únicamente las columnas que la interfaz necesita.

### Quién usa hoy `social_accounts` (ambas ramas)

| Código | Cliente | Operación | Afectado |
|---|---|---|---|
| `server/api/auth/{instagram,youtube}/callback.get.ts` | service_role | upsert | No |
| `server/api/social/*` (sync, stats) | service_role | select/update | No |
| `server/api/discover/search.post.ts` (Mario) | service_role | select embebido de `followers_count` | No |
| `scripts/seed-discover-demo.mjs` | service_role | upsert | No |
| `useMySocialAccounts.refresh()` | navegador | `select id, platform, handle, followers_count` (columnas explícitas) | No, si las columnas siguen concedidas |
| `useMySocialAccounts.connect()` | navegador | insert | **Ya retirado en A-R10** (commit `7644834`) |
| `useMySocialAccounts.disconnect()` | navegador | delete | **Se mantiene** hasta A-R3 |
| `usePublicProfile` | navegador | RPC `get_public_social_accounts` | No |

**Rama de Mario:** todavía contiene el `connect()` antiguo con `insert` desde el navegador (no lo ha editado; es el código original). Tras aplicar la migración, en su rama "Conectar" TikTok/X fallaría con "permission denied" hasta que integre `main` con A-R10. No tiene otros usos de escritura.

### Migración propuesta (borrador, NO aplicada)

```sql
-- A-R11: social_accounts solo se escribe desde el servidor; el navegador lee solo columnas no sensibles.

-- 1. Fuera la escritura directa del navegador (alta y modificación).
drop policy if exists "social_accounts_insert_self" on public.social_accounts;
drop policy if exists "social_accounts_update_self" on public.social_accounts;

-- 2. Privilegios: partir de cero para los roles del navegador y conceder lo mínimo.
revoke all on public.social_accounts from anon, authenticated;
grant select (id, creator_id, platform, handle, followers_count, connected_at)
  on public.social_accounts to authenticated;
-- El borrado propio se mantiene hasta que A-R3 lo mueva a un endpoint de servidor.
grant delete on public.social_accounts to authenticated;
```

Se conservan las policies `social_accounts_select_self` y `social_accounts_delete_self` (RLS sigue limitando a las filas propias). `token_expires_at` **no** se concede: si A-R2 decide mostrar la caducidad al cliente, se concede entonces, columna a columna. Al ir por lista blanca, **toda columna futura nace sin acceso para el navegador** (es lo deseable para `status`, `last_error`, etc. de A-R2: se conceden de forma deliberada).

### Rollback (preparado, para ejecutar si algo falla)

```sql
grant select, insert, update, delete on public.social_accounts to anon, authenticated;
create policy "social_accounts_insert_self" on public.social_accounts for insert
  with check (creator_id = public.current_creator_id());
create policy "social_accounts_update_self" on public.social_accounts for update
  using (creator_id = public.current_creator_id());
```
(Devuelve exactamente el estado actual; el `grant` a `anon` asume el supuesto de la sección 2: confirmarlo antes con la consulta de solo lectura.)

## 4. Impacto

| Área | Efecto | Riesgo |
|---|---|---|
| OAuth Instagram/YouTube existente | Ninguno: callbacks y sync usan `service_role` y no pasan por RLS ni por estos grants | Bajo |
| Redes / Métricas del creador | `select` con columnas explícitas sigue funcionando. **Cualquier `select('*')` o `.select()` tras un insert/update desde el navegador fallaría.** Hoy no existe ninguno (grep en ambas ramas) | Bajo |
| Perfil público | Sin cambios: RPC `security definer` | Ninguno |
| Descubrir (`discover/search`) | Sin cambios de código; sigue sumando `followers_count` de **todas** las filas (incluidas las 11 de demo sin token). Con la migración nadie podrá crear filas nuevas falsas desde el navegador, pero las existentes siguen contando | Medio (dato) |
| Partners | Siguen sin acceso a `social_accounts`; solo ven la RPC | Ninguno |
| Mario | Ver tabla anterior: solo su `connect()` antiguo | Bajo, avisar |
| Filas demo ya existentes | **No se tocan.** Siguen en BD | — |

### Lo que esta propuesta NO resuelve (decisiones aparte)
1. **Filas demo sin token** (Instagram 8, TikTok 4, YouTube 3) siguen distorsionando Descubrir y la interfaz de Redes (que decide "conectada" por plataforma, no por token). Solución limpia: un campo seguro de verificación legible por el navegador, que va en la **propuesta conjunta de esquema** (columna `status` de A-R2, o columna generada `is_verified`) y luego ajustar `discover/search` (archivo de Mario, coordinar).
2. **Borrado de cuentas ajenas:** no aplica (RLS limita a las propias filas).
3. **Un creador puede borrar su propia fila** y reconectar: es lo esperado hasta A-R3.

## 5. Pruebas necesarias (integración, contra la BD compartida: coordinar con Mario)

Archivo previsto: `tests/integration/social-accounts-rls.spec.ts`. Cuentas demo existentes; las filas de prueba se crean con `service_role` y se borran en `afterAll`.

Como creador demo:
1. `select access_token_encrypted` → error de permisos.
2. `select refresh_token_encrypted` → error.
3. `select token_expires_at` → error.
4. `select id, platform, handle, followers_count` de sus filas → OK.
5. `insert` de una fila con `access_token_encrypted` falso → denegado.
6. `update followers_count` de su fila → denegado (y el valor no cambia al releer con service_role).
7. `delete` de su propia fila de prueba → permitido (se mantiene hasta A-R3).

Como otro creador y como partner:
8. `select` de filas de otro creador → 0 filas.

Anónimo:
9. `select` → denegado.

RPC:
10. Una fila sin token no aparece en `get_public_social_accounts`; una con token sí (creada vía service_role).

Antes de aplicar, la prueba 1–2 y 5–6 deben **fallar** hoy (demuestran el hueco); tras aplicar deben pasar. Eso sirve de evidencia reproducible.

## 6. Plan de aplicación (si se aprueba)

1. Alex ejecuta en el SQL Editor la consulta de solo lectura de la sección 2 y comparte el resultado (o autoriza otra vía).
2. Aviso a Mario (qué cambia, cuándo, qué ve su `connect()` antiguo) y respuesta suya.
3. Escribir las pruebas y ejecutarlas **antes** (deben mostrar el hueco). Coordinar la ventana: no lanzar justo antes de que Mario pruebe login.
4. Una persona autorizada aplica la migración (archivo con marca de tiempo única, registrado en "Registro de migraciones" de `TRABAJO_ALEX.md`).
5. Re-ejecutar las pruebas; navegador: Redes y Métricas siguen funcionando, perfil público muestra redes.
6. Si falla algo: rollback de la sección 3.

## 7. Qué necesito de ti

- [ ] ¿Apruebas el diseño (lista blanca de columnas + sin insert/update desde el navegador + delete provisional)?
- [ ] ¿Quién aplica la migración y cuándo? (Yo no la aplico sin tu "adelante" explícito sobre el SQL final.)
- [ ] ¿Escribo ya el archivo de pruebas de integración (sin ejecutarlo hasta la ventana acordada)?
- [ ] ¿OK a que avise a Mario con este documento?
