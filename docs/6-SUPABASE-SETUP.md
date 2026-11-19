# 6. Poner en marcha Supabase (Fase 2)

Esta guía es la versión "para tontos" de la Fase 2 del [`README`](../README.md): cómo crear el proyecto de verdad, aplicar el esquema que ya está escrito y probado, y tener 2 cuentas de prueba funcionando.

Todo el SQL de este proyecto vive versionado en [`supabase/migrations/`](../supabase/migrations) — nunca se escribe SQL suelto a mano en el panel de Supabase. Eso es justo lo que pide la Fase 2: que quede guardado y registrado, no perdido en el historial de un dashboard.

## 0. Antes de nada: esto ya está probado

Las migraciones de `supabase/migrations/` ya se aplicaron contra una base de datos Postgres real (con Supabase corriendo en local) y se comprobó a mano que la seguridad (RLS) funciona de verdad:
- Un partner solo ve el post de su propia colaboración, no los de otros.
- Si no has iniciado sesión, no ves nada.
- Un partner **no puede** editar un post directamente (se bloquea), pero **sí puede** aprobarlo con la función oficial `approve_post`.

No es teoría: se ejecutó y se verificó. Lo único que falta es crear **tu** proyecto y aplicarlo ahí.

## 1. Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea una cuenta (o inicia sesión) — **esto lo tiene que hacer una de las dos personas del equipo**, con su cuenta, porque Claude Code no puede crear cuentas ni proyectos por vosotros.
2. "New Project" → ponle nombre `ciberan` → elige una contraseña de base de datos fuerte y **guárdala en un gestor de contraseñas**, no en el chat ni en un commit.
3. Espera a que termine de aprovisionarse (1-2 minutos).
4. Ve a **Project Settings → API** y copia:
   - `Project URL` → es tu `SUPABASE_URL`
   - `anon public` key → es tu `SUPABASE_ANON_KEY`
   - `service_role` key → es tu `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta, no la compartas, no la pegues en el chat)

## 2. Configurar el proyecto en tu ordenador

```bash
cp .env.example .env
# Pega los 3 valores de arriba en .env
```

## 3. Aplicar las migraciones a tu proyecto

Necesitas el CLI de Supabase (no hace falta instalarlo globalmente, `npx` ya lo descarga):

```bash
npx supabase login
# Se abre el navegador, inicia sesión con la misma cuenta del paso 1

npx supabase link --project-ref TU-PROJECT-REF
# El project-ref es la parte de tu Project URL antes de ".supabase.co"
# (https://TU-PROJECT-REF.supabase.co)

npx supabase db push
# Esto aplica, en orden, los 3 archivos de supabase/migrations/ a tu proyecto real
```

Si todo va bien, en **Table Editor** del panel de Supabase ya deberías ver las tablas: `profiles`, `creators`, `partners`, `collaborations`, `social_accounts`, `posts`, `metrics`, `ml_predictions`, `trends`, `subscriptions`, `credit_ledger`, `notifications`.

## 4. Crear las cuentas de prueba

Con `.env` ya relleno:

```bash
npm run db:seed-users
```

Esto crea, usando la API oficial de administración de Supabase (nunca escribiendo a mano en las tablas internas de autenticación):

| Cuenta | Email | Contraseña |
|---|---|---|
| Creador de contenido (Nora Blake) | `creator@feedma.test` | `DEMO_PASSWORD` del .env |
| Partner (Alma Beauty Co.) | `partner@feedma.test` | `DEMO_PASSWORD` del .env |

Las dos quedan relacionadas entre sí desde el minuto uno: hay una colaboración en curso entre Alma Beauty Co. y Nora Blake, con un post esperando aprobación — así hay algo real que probar en cada vista, no una cuenta vacía.

> El script se puede ejecutar varias veces sin romper nada: si una cuenta ya existe, la reutiliza en vez de fallar.

## 5. Probar que la seguridad funciona (opcional pero recomendado)

Puedes repetir la comprobación que ya hicimos nosotros, usando el **SQL Editor** del panel de Supabase:

1. Inicia sesión como `partner@feedma.test` en la app (cuando la Fase 2 del frontend esté conectada) y confirma que solo ves el post de Nora Blake, no inventario de otros creadores.
2. Intenta, desde el SQL Editor logueado como ese usuario (`select auth.uid()` para confirmar quién eres), hacer un `update posts set title = '...'` directo — debe afectar **0 filas**.
3. Llama a `select approve_post('el-id-del-post')` — ese sí debe funcionar.

Si algo de esto no se comporta así en tu proyecto, para y revisa antes de seguir — es exactamente el tipo de cosa que no te quieres encontrar más adelante con datos reales.

## 6. Desarrollo local (opcional, para ir más rápido)

Si tienes Docker instalado, puedes correr Supabase entero en tu máquina sin tocar el proyecto en la nube — útil para probar cambios de esquema antes de aplicarlos de verdad:

```bash
npx supabase start   # levanta Postgres + Auth + Studio local
npx supabase stop    # lo apaga
```

Con `supabase start` corriendo, tienes un Supabase Studio local en `http://127.0.0.1:54323` para explorar las tablas con el ratón, y puedes apuntar tu `.env` a las URLs/claves locales que imprime el comando (son fijas y de ejemplo, no secretas) en vez de a las del proyecto en la nube.

## 7. A partir de ahora: cómo añadir cambios al esquema

Nunca se edita una tabla a mano desde el panel. Siempre:

```bash
npx supabase migration new nombre_del_cambio
# Escribe el SQL en el archivo nuevo que aparece en supabase/migrations/
npx supabase db push
# Commit del archivo de migración, como cualquier otro cambio de código
```

Así el historial de `git log` de `supabase/migrations/` es, literalmente, la historia completa de la base de datos — exactamente lo que pedíamos: que quede todo guardado y registrado.

## Próximos pasos relacionados

- Esquema completo explicado con diagramas: [`2-DATABASE-SCHEMA.md`](./2-DATABASE-SCHEMA.md)
- Checklist general de fases: [`../README.md`](../README.md)
