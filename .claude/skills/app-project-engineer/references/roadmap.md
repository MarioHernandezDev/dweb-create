# Roadmap y documentación

Para planificar o decidir si algo pertenece a una fase futura. **No lo cargues para tareas de código normales.**

## Qué documento manda

| Documento | Uso |
|---|---|
| `ROADMAP.md` (raíz) | **Estado vivo**: tareas, decisiones técnicas, riesgos. Fuente principal |
| `docs/HOJA_DE_RUTA.md` | Visión y alcance por fase (parte de su «estado» está desfasada) |
| `docs/17-METRICAS-REDES-PROXIMAMENTE.md` | Definición de la funcionalidad aplazada de métricas |
| `docs/15-cierre-lanzamiento-gratis.md` | Cierre del lanzamiento gratis y pendientes externos |
| `docs/14-OPERACIONES-ADMIN.md`, `12-STAGING-Y-SENTRY.md`, `13-INTEGRACIONES-PENDIENTES.md`, `16-EMAIL-SMTP.md` | Guías operativas |
| `docs/design/01_DESIGN_SYSTEM.md` | Sistema de diseño |
| `docs/audit/*`, `docs/PENDIENTES.md`, `CONTEXT.md`, `docs/CONTEXTO_PROYECTO_CIBERAN.md`, `docs/PROPUESTA_*` | **Históricos**: contexto, no estado actual |
| `plan-imp.md`, `competencia.md`, `CIBERAN_*`, `PIPELINE_*`, `DESIGN.md`, `propuesta-postvideo.md`, `diseño-nuevo.md` | Documentos de encargo/estrategia en la raíz; no son especificaciones del código actual |

## Estrategia vigente

Terminar el producto → preparar el lanzamiento → **lanzar gratis** → monetizar después. Pagos apagados; las 21 cuentas actuales son de prueba.

## Fases (alcance detallado en `docs/HOJA_DE_RUTA.md`)

1. Cimientos técnicos (CI, staging, monitorización, copias, accesibilidad) · 2. Avisos y recordatorios · 3. Colaboración más sólida · 4. Descubrir y perfiles más inteligentes · 5. Studio y productividad · 6. Cuenta y seguridad · 7. Equipos y campañas (requiere propuesta previa) · 8. Integraciones · 9. Herramientas de admin y operación · 10. Preparar la escala.

Lo completado de cada fase y lo pendiente: tabla de tareas en `ROADMAP.md` §4. No asumas que una tarea de fase posterior está permitida: confírmalo con el usuario.

## Aplazado explícitamente (no implementar sin petición)

Métricas de redes sociales (ver features.md y docs/17) · tendencias con IA · pagos reales · equipos · push · 2FA · TikTok · staging/Sentry (coste).

## Pendientes que dependen del propietario (no los hagas por tu cuenta)

`git push`, plantillas de correo en el panel de Supabase, longitud mínima de contraseña 8, cambiar `ADMIN_PASSWORD` de prueba, dominio y HTTPS (`APP_URL`, Site URL, Redirect URLs), revisión legal y datos del titular, hosting, borrado final de cuentas de prueba tras revisar la lista, activar el cron de correos.

## Mantener el roadmap

Si un cambio completa, bloquea o aplaza algo del roadmap, actualiza **una línea** en `ROADMAP.md` (y `docs/17` si afecta a métricas). No crees documentos nuevos por cada tarea.
