# Propuesta consolidada A-R11: cerrar la falsificación de redes verificadas y la lectura de tokens

> **Estado: PROPUESTA. Nada aplicado, nada ejecutado contra la base de datos compartida.** El SQL está solo en este documento (no en `supabase/migrations/`) para que no se aplique por accidente. Zona protegida (RLS y permisos, Supabase compartido): requiere autorización explícita de Alex y coordinación con Mario antes de aplicar.
> **Actualización:** autorizada por Alex con la aceptación de Mario. La consulta del §3 confirmó los privilegios por defecto. Migración escrita en `supabase/migrations/20261028120000_social_accounts_lockdown.sql` y **pendiente de aplicar por Alex en el SQL Editor**. Pruebas de integración de antes ya ejecutadas (8 de 16 fallan, demostrando el hueco).
> Versión 2 (2026-10-28): sustituye a la anterior; incorpora las pruebas ya escritas, el SQL definitivo, el rollback revisado y el aviso para Mario.

## 1. Problema

Hoy un creador autenticado puede, con peticiones directas a Supabase (sin pasar por la app):

| # | Ataque | Causa | Efecto |
|---|---|---|---|
| 1 | Insertar una fila con `followers_count` inventado y `access_token_encrypted = 'x'` | `social_accounts_insert_self` solo exige `creator_id = current_creator_id()` | `get_public_social_accounts` la considera "verificada" (solo mira que el token no sea nulo) y la enseña a los partners |
| 2 | Cambiar `followers_count` de su fila | `social_accounts_update_self` sin restricción de columnas | Cifras falsas en perfil público, Descubrir (`discover/search` suma `followers_count`) y Métricas |
| 3 | Leer `access_token_encrypted` / `refresh_token_encrypted` | `social_accounts_select_self` sobre todas las columnas | Riesgo bajo (cifrados), pero innecesario |

Origen: `20261021120000_remove_manager_rename_creator_partner.sql` (policies) y `20261022100000_public_social_accounts.sql` (RPC). Ninguna migración posterior toca `social_accounts` ni usa `revoke`/`grant` por columna (grep en `supabase/migrations`).

## 2. Solución

Principio: lo que afecta a la confianza (alta, tokens, seguidores) lo escribe **solo el servidor** con `service_role`; el navegador lee **solo las columnas que la interfaz necesita**.

### SQL definitivo (borrador para la futura migración `20261028120000_social_accounts_lockdown.sql`)

```sql
-- A-R11: social_accounts solo se escribe desde el servidor; el navegador lee solo columnas no sensibles.
begin;

-- 1. Fuera la escritura directa del navegador (alta y modificación).
drop policy if exists "social_accounts_insert_self" on public.social_accounts;
drop policy if exists "social_accounts_update_self" on public.social_accounts;

-- 2. Privilegios: partir de cero para los roles del navegador y conceder lo mínimo.
revoke all on public.social_accounts from anon, authenticated;
grant select (id, creator_id, platform, handle, followers_count, connected_at)
  on public.social_accounts to authenticated;
-- El borrado propio se mantiene hasta que A-R3 lo mueva a un endpoint de servidor.
grant delete on public.social_accounts to authenticated;

commit;
```

Se conservan `social_accounts_select_self` y `social_accounts_delete_self`: RLS sigue limitando a las filas propias. `token_expires_at` no se concede. Al ser lista blanca, toda columna futura nace sin acceso para el navegador (lo deseable para las columnas de A-R2).

### Rollback (devuelve exactamente el estado anterior)

```sql
begin;
grant all on public.social_accounts to anon, authenticated;
create policy "social_accounts_insert_self" on public.social_accounts for insert
  with check (creator_id = public.current_creator_id());
create policy "social_accounts_update_self" on public.social_accounts for update
  using (creator_id = public.current_creator_id());
commit;
```

Verificado con la consulta del §3 (resultado del 2026-10-28): `anon` y `authenticated` tenían `SELECT`, `INSERT`, `UPDATE` y `REFERENCES` en las 9 columnas, es decir, los privilegios por defecto de Supabase. `grant all` los restaura (incluidos los de nivel de tabla `DELETE`, `TRUNCATE` y `TRIGGER`, que esa vista no muestra). La versión anterior de este rollback omitía `REFERENCES` y esos tres.

## 3. Consulta de solo lectura que debes ejecutar y cómo interpretarla

En el **SQL Editor de Supabase** (no modifica nada):

```sql
select grantee, privilege_type, count(*) as columnas
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'social_accounts'
  and grantee in ('anon', 'authenticated')
group by grantee, privilege_type
order by grantee, privilege_type;
```

La tabla tiene 9 columnas (`id, creator_id, platform, handle, access_token_encrypted, refresh_token_encrypted, token_expires_at, followers_count, connected_at`).

| Resultado | Qué significa | Qué hago |
|---|---|---|
| `authenticated` con SELECT, INSERT, UPDATE = 9 columnas cada uno (y `anon` igual) | Privilegios por defecto de Supabase, como se supone | El rollback de §2 es exacto; propuesta válida tal cual |
| `anon` sin ninguna fila | `anon` no tenía acceso: el `revoke` sobre `anon` es inofensivo | Rollback sin `anon`; sin otros cambios |
| `authenticated` ya sin INSERT/UPDATE | Alguien restringió permisos fuera del repositorio | Parar y revisar: la propuesta puede no ser necesaria |
| Cualquier otro | No esperado | Parar y consultarte antes de seguir |

Pégame el resultado. Es lo único que necesito de ti para dar por válidos los supuestos.

## 4. Riesgos y efectos secundarios

| Área | Efecto | Riesgo |
|---|---|---|
| OAuth Instagram/YouTube | Ninguno: callbacks y sync usan `service_role` | Bajo |
| Redes / Métricas del creador | Las consultas usan columnas explícitas y siguen funcionando. Un `select('*')` desde el navegador fallaría; no existe ninguno en ninguna rama (grep) | Bajo |
| Borrado propio | `delete … where creator_id=… and platform=…` sigue permitido: sus columnas están concedidas y RLS las evalúa con el privilegio del usuario. **A comprobar** con la prueba de integración 'el dueño puede borrar su fila' | Bajo |
| Perfil público | Sin cambios (RPC `security definer`) | Ninguno |
| Descubrir | Sin cambios de código. Sigue sumando `followers_count` de todas las filas, incluidas las ~15 de demo sin token. Nadie podrá crear filas nuevas falsas, pero las existentes siguen | Medio (dato) |
| Rama de Mario | Su `connect()` antiguo (`insert` desde el navegador) fallaría con "permission denied" hasta que integre `main` con A-R10 | Bajo, avisar |
| Scripts de seed/cleanup | Usan `service_role`: no afectados | Ninguno |
| Filas existentes | No se tocan | — |

**Fuera de alcance de esta propuesta** (se resuelve en la propuesta de esquema): las filas demo sin token siguen distorsionando Descubrir y la pantalla de Redes. Solución: un campo `is_verified` legible por el navegador.

## 5. Pruebas

**Preparadas, NO ejecutadas contra la base de datos:** [tests/integration/social-accounts-rls.spec.ts](../tests/integration/social-accounts-rls.spec.ts) (16 tests).

- Activación explícita: solo corre con `RUN_SOCIAL_ACCOUNTS_RLS=1` (más `SUPABASE_SERVICE_ROLE_KEY` en el entorno). Sin ella se salta entera. **Comprobado:** `npx vitest run --config vitest.integration.config.ts tests/integration/social-accounts-rls.spec.ts` → 16 saltados, 0 ejecutados, sin escrituras.
- Seguridad de datos: solo crea/modifica/borra filas propias (handle `a-r11-test`, plataformas `linkedin` y `x`, donde el creador demo no tiene ninguna). Si el creador demo ya tuviera filas de esas plataformas, **aborta sin tocar nada**. Limpieza en `afterAll` por handle.
- Cobertura: lectura de columnas permitidas y prohibidas, `select *`, alta falsa con token, cambio de `followers_count`, cambio de token, aislamiento (otro creador, partner, anónimo), RPC pública (control), borrado propio y borrado ajeno.
- **Cómo demuestra el problema:** ejecutada **antes** de la migración, deben fallar los de lectura de tokens, alta falsa y cambio de seguidores/token; tras aplicarla, deben pasar todos. Esa diferencia es la evidencia reproducible.
- Pendiente tras la migración: navegador (Redes, Métricas, perfil público) y entrada en el CHANGELOG.

## 6. Procedimiento (todo condicionado a tu autorización)

1. Ejecutas la consulta de §3 y me pasas el resultado → confirmo o ajusto el SQL y el rollback.
2. Mario recibe el aviso de §7 y responde; acordamos una ventana (no justo antes de que pruebe login; el login ya genera notificaciones en las cuentas demo).
3. En la ventana: ejecuto las pruebas **antes** (evidencia del hueco).
4. Tú autorizas explícitamente el SQL final; una persona autorizada lo aplica como migración con marca de tiempo única y se registra en "Registro de migraciones" de `TRABAJO_ALEX.md`.
5. Ejecuto las pruebas **después** y compruebo en navegador.
6. Si algo falla: rollback de §2 inmediatamente.

## 7. Aviso para Mario (texto listo para enviar; no se ha enviado)

> **Asunto: Propuesta de Alex sobre `social_accounts` (aún NO aplicada)**
>
> Hola Mario. Te aviso de una propuesta de seguridad sobre la tabla `social_accounts` de Supabase. **Todavía no hay ningún cambio aplicado**; antes de hacerlo coordinamos una ventana contigo.
>
> **Problema:** hoy un creador puede, con peticiones directas a Supabase, insertar o editar sus propias filas de `social_accounts` (seguidores y tokens), así que podría falsificar una red "verificada" o sus seguidores.
>
> **Propuesta:** quitar insert/update desde el navegador, que solo escriba el servidor (los callbacks OAuth y los sync ya lo hacen), y conceder al navegador `select` únicamente de `id, creator_id, platform, handle, followers_count, connected_at`. El borrado propio se mantiene por ahora.
>
> **Qué te afecta:**
> 1. Tu rama conserva el `connect()` antiguo de `useMySocialAccounts.ts` (insert desde el navegador para TikTok/X). Con la migración fallaría con "permission denied". En mi rama ya lo he quitado (TikTok/X/Facebook/LinkedIn salen como "Próximamente"); basta con que integres `main` cuando se fusione.
> 2. `server/api/discover/search.post.ts` no cambia (usa service role).
> 3. Para probarlo escribo filas de prueba en el Supabase compartido (con service role) y uso las cuentas demo; necesito una ventana en la que no estés probando login. Ver la propuesta completa en `docs/PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md`.
>
> ¿Ves algún problema con tu código, y qué ventana te va bien?

## 8. Decisión pendiente (única)

**¿Autorizas aplicar la migración?** Aún no hace falta responder: primero ejecuta la consulta de §3 y avísame cuando Mario haya contestado. Mi recomendación es aplicar **solo** el SQL de §2 (sin tocar el borrado todavía) y hacerlo en la ventana acordada.
