# Pendientes de FEEDMA

Informe de qué queda por hacer o por verificar, a fecha 2026-10-24 (commit `675acc8`, rama `main`). No es una lista de bugs conocidos — el plan de usabilidad original (`CONTEXT.md`, fases 0 a 5) está completo y documentado en `docs/CHANGELOG.md`. Esto es lo que queda *después* de eso, para retomar cuando haya tiempo.

Cada punto dice qué falta y por qué importa, no solo "hacer X". Antes de tocar nada que implique Stripe, RLS, RPCs o el esquema de datos, confirmar el impacto con el resto del equipo — son zonas que se han dejado así a propósito en todas las sesiones anteriores.

---

## 1. Dinero — nada de esto se ha probado nunca con un pago real

- **Ningún pago de Stripe se ha probado de principio a fin**, ni siquiera en modo test. Hay dos flujos: la suscripción de FEEDMA Pro (`create-checkout-session`) y el pago de una colaboración vía Stripe Connect (`pay-collaboration`). Las claves de `.env` ya están en modo test (`sk_test_...`), así que probarlo no mueve dinero real.
  - Para probarlo hace falta instalar Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`, sin él los webhooks no llegan a local) y completar el onboarding de Stripe Connect de una cuenta de creador (ahora mismo ninguna cuenta demo lo tiene hecho — es un flujo propio de Stripe, con datos de empresa de prueba).
- **No hay portal de gestión de suscripción.** Un creador con FEEDMA Pro no tiene ninguna forma de cancelarla o cambiar el método de pago desde la app (`useMyBilling.ts` solo tiene `subscribe()` y `connectPayouts()`, nada de `createPortalSession`). Tendría que escribir directamente para que alguien lo gestione a mano.

## 2. El producto mide menos de lo que promete

- **Las "métricas" solo son seguidores**, no alcance ni interacciones por publicación. Falta el permiso de insights de Meta para Instagram (pendiente de verificación de su parte) y, en YouTube, enlazar cada entrega del tablero con su vídeo real.
- Como consecuencia, **la "predicción de éxito" se basa en heurística de forma y texto, no en el rendimiento real de publicaciones anteriores** — funciona, pero es menos de lo que el nombre de la función sugiere.

## 3. Flujos probados solo por RPC, nunca con clics reales

Todo esto pasa los tests de integración (RLS + RPCs reales), pero nadie ha verificado que el botón de verdad, en el navegador, haga lo mismo:

- Aceptar/rechazar una oferta desde el chat.
- Aprobar o pedir cambios a una entrega (salvo la pestaña Calendario del partner, verificada el 24/10).
- El acceso cruzado entre roles: que un creador no pueda abrir `/partner/*` y viceversa. El middleware (`role-guard.global.ts`) parece correcto leyendo el código, pero nunca se ha intentado de verdad.
- Conectar una cuenta de Instagram o YouTube de extremo a extremo (el OAuth depende de apps externas configuradas).

## 4. El panel de administración nunca se ha revisado

`/admin` (autenticación propia, no usa cuentas de Supabase) no se ha tocado ni auditado en ninguna sesión hasta ahora. Estado real desconocido.

## 5. Cobertura de pruebas visuales, limitada a propósito

Todo lo verificado en navegador hasta ahora (sesión del 24/10) fue solo con Chromium, en dos anchos de pantalla (1280px y 390px). Nada en Safari, Firefox, tablet, ni un dispositivo real. Tampoco hay auditoría de accesibilidad con lector de pantalla — solo se comprobó que los botones de icono tengan `aria-label` leyendo el código.

## 6. Riesgo estructural, no un bug concreto

- **No hay CI/CD.** `vue-tsc`/tests no corren solos al hacer push — dependen de que alguien los ejecute a mano, como se ha hecho en cada sesión.
- **No hay entorno de Supabase separado para pruebas.** Es una decisión ya tomada explícitamente (de momento se sigue así), pero significa que los tests de integración y el uso manual siguen escribiendo en los mismos datos — hay que seguir limpiando residuos de test de vez en cuando con criterio explícito, nunca a ciegas.
- **No hay páginas de privacidad ni de términos de servicio.** Para un producto que ya cobra y guarda datos personales, normalmente hace falta antes de abrir a usuarios reales.

## 6b. Riesgos de negocio y seguridad ya detectados en `docs/10-ROADMAP-FUTURO.md`, sin resolver

- **Política de cuándo se puede pagar una colaboración.** Hoy un partner puede pagar en cuanto el creador *acepta* (`payableStatuses` en `partner/requests.vue`), antes de que exista ninguna entrega. Hay que decidir a propósito: pago por hitos, todo al final, o señal + resto. Es dinero real de terceros.
- **El login del panel de admin no tiene límite de intentos de contraseña** (`/api/admin/login`): se puede probar sin límite ni bloqueo. Barato de arreglar.
- **Rate limiting en general** (alta de cuentas, solicitudes de colaboración, reportes): hoy nada tiene límite.
- **RGPD** (política de privacidad, términos, derecho a exportar/borrar datos): ya mencionado arriba como "páginas legales", pero el alcance real es mayor que dos páginas.

## 7. Aplazado a propósito, con decisión ya tomada de no hacerlo todavía

- **Onboarding guiado para usuarios nuevos** (tutorial interactivo, distinto para creador/partner) — pedido explícitamente; la rama `feature/onboarding` está preparada con su `README_TRABAJO.md` (alcance, límites y decisión pendiente sobre dónde guardar el progreso), pero no hay código todavía.
- **Mejora de UX de publicaciones, segunda vuelta** — rama `feature/publicaciones-ux`, también preparada con su `README_TRABAJO.md`. Gran parte del primer pase ya está hecho (ver entradas 49, 50 y 52 del `CHANGELOG.md`).
- **Agrupar solicitudes duplicadas** en la bandeja de notificaciones (parte del hallazgo #2 de la auditoría original) — se resolvió la separación Importantes/Actividad, esto no.
- **Estado de "entregado"/"leído" en el chat** — pedido, pero puede exigir cambio de esquema de datos; se dejó aparte a propósito.
- **`messages.offer_id` y `collaborations.offer_id` son `on delete set null`**, no `cascade` — es a propósito a nivel conceptual (una oferta borrada no debería borrar el historial del chat), pero obliga a limpiar a mano cualquier residuo de test que los use. Cambiarlo a `cascade` sería una decisión de esquema real, pendiente de confirmar si compensa.
- **La aprobación del partner no es una puerta real** — el creador puede saltarse "Para revisar" moviendo una publicación directamente (ahora con un aviso de confirmación, no un bloqueo). Si se quiere impedir del todo, es un cambio de permisos/RLS, no solo de interfaz.

---

### Cómo priorizar esto

Si solo se puede tocar un bloque: **el punto 1 (pagos)**, porque es el único con dinero real de por medio nunca verificado. Los puntos 3 y 4 (clics reales, admin) son baratos de probar y dan mucha tranquilidad para poco esfuerzo. Los puntos 6 y 7 no son urgentes pero conviene no perderlos de vista — son del tipo que se vuelve caro cuanto más se tarda en decidir.
