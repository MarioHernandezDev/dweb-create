# 17 · Métricas de redes sociales — "Próximamente"

> **Estado: funcionalidad prevista para una fase futura. Aparcada, aislada y sin dependencias.**
> La idea y su planteamiento se conservan íntegros (documento + código latente), pero hoy
> **ninguna sección activa de Ciberan depende de ella**.

## 1. Qué es

Una sección donde el creador conecta sus cuentas (YouTube, Instagram) y consulta cómo rinden
sus publicaciones y su audiencia, sin salir de Ciberan.

### Métricas previstas

- **Audiencia**: seguidores/suscriptores, evolución y crecimiento neto por periodo.
- **Rendimiento de publicaciones**: vistas, likes, comentarios, engagement, comparativa entre publicaciones.
- **Evolución en el tiempo**: histórico por cuenta (snapshots), gráficas semanales y de variación neta.
- **Resultados de colaboraciones**: informe de una colaboración con las métricas de las publicaciones vinculadas.
- **Contexto en la predicción**: comparar el potencial de una publicación con la mediana de vistas de las ya medidas.
- **YouTube en profundidad**: KPIs por periodo, vídeos, detalle y rendimiento por vídeo, insights.

### Cómo funcionará

1. El creador conecta su cuenta por OAuth (YouTube / Instagram) desde `/creator/metrics`.
2. Una sincronización (manual y por cron `sync-all`) guarda snapshots y métricas en Supabase.
3. Vincula publicaciones de Ciberan con su enlace externo para ver métricas por publicación.
4. Las colaboraciones muestran un informe de resultados; el perfil público podría mostrar métricas elegidas por el creador.

### Valor

Marcas y creadores deciden con datos reales (no declarados), el creador demuestra resultados
y las colaboraciones se evalúan con cifras comparables.

## 2. Qué se hizo para aislarla (sin perder nada)

- **Interfaz**: `/creator/metrics` es ahora una página informativa "Próximamente" (sin datos ni cálculos). En la navegación aparece como "Métricas de redes" con etiqueta "Pronto".
- **Código latente**: movido, sin borrar, a carpetas `_disabled` que Nuxt/Nitro/vitest no escanean:
  - `app/_disabled/social-metrics/` (componentes, composables, utils) y `app/_disabled/creator/metrics/` (páginas).
  - `server/_disabled/social-metrics/` (`api/` y `utils/`: OAuth, sync, YouTube, Instagram, enlaces de publicación).
  - `tests/_disabled/social-metrics/` (specs).
- **Dependencias retiradas** de: panel y perfil del creador, publicaciones, perfil público, Discover/búsqueda, favoritos, panel de partner, insights, colaboración (panel "Rendimiento"), onboarding, landing, instalaciones, textos legales y políticas de rate-limit.
- **Base de datos intacta** (migración no destructiva): `social_accounts`, métricas, `post_external_links`, snapshots siguen existiendo, solo sin uso.
- **Se mantiene** (no es métrica): el campo *plataforma* al planificar una publicación; los endpoints de Meta de borrado de datos/desautorización (cumplimiento) y la exportación de datos personales (derecho del usuario).

## 3. Cómo reactivarla en el futuro

1. Mover cada carpeta `_disabled/social-metrics/*` a su ruta activa (`app/components|composables|utils`, `server/api|utils`, `tests/unit`) y `app/_disabled/creator/metrics/*` a `app/pages/creator/metrics/` (sustituyendo la página "Próximamente").
2. Restaurar en `server/utils/rate-limit-policies.ts` las políticas: `social-sync` (10/60 s), `social-read` (60/60 s), `social-write` (20/60 s), `oauth-start` (10/60 s).
3. Volver a conectar las vistas que mostraban métricas (perfil público, panel, colaboración) y quitar `soon: true` del item de navegación.
4. Reconfigurar credenciales OAuth (guías 9 y 10), cron `sync-all` (guía 11) y revisar la política de privacidad.
5. Ejecutar `nuxi prepare`, `vue-tsc --noEmit` y `vitest` antes de publicar.
