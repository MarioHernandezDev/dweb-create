# Propuesta A-R19 — Perfil público a ancho completo (`/profile/[role]/[id]`)

Estado: **implementada (CHANGELOG Alex-38).** Solo presentación: sin migraciones, sin cambios de RLS ni de permisos. Fecha: 2026-10-30.

## Auditoría
- Página: `app/pages/profile/[role]/[id].vue` (una sola para creador y partner). Antes: `md:max-w-xl` (576 px) con `ProfileHeaderCard` + chat + paquetes en una columna.
- Datos: `usePublicProfile` lee las tablas `creators`/`partners` (directorio público de solo lectura para usuarios autenticados: política `partners_select_public_directory`/`creators_select_public_directory`), `profiles` (avatar y privacidad del chat) y, solo para creadores, el RPC `get_public_social_accounts` (redes con OAuth real). Paquetes con `usePackages.listPackagesOf` y valoraciones con `useRatings.fetchSummary`.
- Único dato añadido: `industry` de `partners` (columna que ya leía cualquier usuario autenticado en la búsqueda de perfiles). No se amplía ningún acceso.
- `ProfileHeaderCard` también es la vista previa del editor de ficha: **no se toca**; el perfil público usa un componente propio.
- Límite de anchura: el `md:max-w-xl` de la propia página y el `max-w-[1100px]` del `AppShell` (se resuelve con `full-width` solo en esta página).

## Qué existe y qué no (no se muestra lo que no existe)
Existe: nombre, avatar, portada, sector (partner), categorías, bio, qué busca, rango de presupuesto/tarifa, redes verificadas (creador), paquetes/necesidades, valoraciones, fecha de alta, privacidad del chat.
No existe: ubicación, web u otros enlaces, colaboraciones públicas (las colaboraciones son privadas de sus participantes: RLS), contador público de colaboraciones completadas. Mostrar cualquiera de ellos exigiría columnas o permisos nuevos (migración + aprobación) y no se propone ahora.

## Distribución (`PublicProfileView`)
Cabecera (portada, logo/avatar grande, nombre, rol y sector, categorías, redes verificadas, Iniciar chat y Copiar enlace) · columna principal (Sobre la empresa/el creador, Qué busca, Necesidades/Catálogo en cuadrícula con «Hacer oferta») · lateral (Datos clave: presupuesto o tarifa, nº de paquetes, antigüedad; Reputación). En pantalla estrecha el lateral pasa debajo. Perfil propio: aviso «Así ven tu perfil…» con enlace a editar, sin chat ni ofertas. Acciones y flujos de chat/oferta sin cambios.

## Pendiente / fuera de alcance
Esqueletos de carga (la página sigue esperando sus datos), ubicación/web/logotipo propio, colaboraciones públicas e indicadores de actividad: requieren backend o decisión de producto.
