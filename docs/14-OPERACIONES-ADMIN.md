# Operaciones del equipo: incumplimientos, eliminación de cuentas y datos de prueba

*Escrito 2026-11-11. Procedimientos internos; los criterios legales (plazos de conservación, qué se puede anonimizar) están pendientes de revisión profesional.*

## 1. Terminación por incumplimiento
Cuando una parte da una colaboración por terminada por incumplimiento, la colaboración se cierra para las dos, se avisa a la otra parte y se crea un reporte con motivo «Incumplimiento» (Admin → Reportes → filtro «Incumplimientos»).

Pasos:
1. **Pasar a revisión** el reporte (deja claro que alguien lo está mirando).
2. Leer el motivo y el contexto que enseña la tarjeta: contra quién va, estado de la colaboración e importe. Durante el lanzamiento gratis CIBERAN no ha movido dinero, así que no hay nada que devolver desde la plataforma.
3. Si hace falta, escribir a las dos partes (hoy por email, fuera de la app) y pedir su versión. La cronología de la colaboración conserva lo ocurrido, incluidos los apuntes que deje cada parte.
4. Decidir y dejarlo escrito en la **nota interna** (obligatoria para cerrar):
   - **Desestimar**: no hay incumplimiento acreditado o es un desacuerdo entre partes.
   - **Resolver**: incumplimiento acreditado. Medidas disponibles hoy: aviso a la cuenta, o **bloquearla** (Admin → Usuarios → Bloquear) si es reiterado o grave.
5. Criterio orientativo: un primer caso, aviso; dos casos acreditados contra la misma cuenta, bloqueo. Ajustar con la práctica.

Lo que NO hace la plataforma hoy: no reabre una colaboración terminada, no arbitra pagos y no notifica a las partes la resolución (se hace a mano).

## 2. Eliminación de cuenta
El usuario la pide en Perfil → Privacidad → «Eliminar cuenta», escribiendo su email.
- **Con colaboraciones abiertas**: se le pide cerrarlas o cancelarlas antes.
- **Sin historial compartido**: la cuenta se borra en el momento, con todos sus datos (borrado en cascada).
- **Con colaboraciones terminadas**: no se borra sola, porque el borrado en cascada se llevaría también los registros de la otra parte (una marca borrada arrastra sus colaboraciones; los chats se borran para los dos). Queda una solicitud en Admin → Reportes, y su perfil deja de verse sin sesión.

Atender una solicitud (pendiente de criterio legal sobre conservación):
1. Confirmar con la persona por email que sigue queriendo eliminarla.
2. Opción A, **anonimizar** (recomendada si la otra parte necesita conservar el registro): vaciar nombre, bio, foto, portada, redes, paquetes y contenido propio, y bloquear el acceso. Hoy se hace a mano en el panel de Supabase; no hay botón.
3. Opción B, **borrar** del todo desde Supabase → Authentication → Users: se pierden también las colaboraciones compartidas. Solo si la otra parte no las necesita.
4. Marcar la solicitud como **atendida** en el panel.

## 3. Datos de prueba antes de lanzar
Las 21 cuentas actuales son ficticias (dominios `@feedma.test` y similares). Antes de abrir a usuarios reales:
1. Montar staging y pasar ahí las cuentas de prueba (docs/12).
2. En producción, borrar las cuentas de prueba desde Supabase → Authentication (el borrado en cascada limpia sus datos) y vaciar los buckets `post-media` y `collab-files` de sus carpetas.
3. Los accesos de «Cuentas de prueba» del login solo existen en desarrollo (`import.meta.dev`): la compilación de producción no los incluye. Pero la contraseña de esas cuentas está escrita en el repositorio (`app/pages/login.vue`, `scripts/`), así que **esas cuentas no pueden existir en producción**: borrarlas es obligatorio, no opcional.
4. Comprobar que el panel de admin no lista ninguna cuenta de prueba.

## 4. Versión de los términos
`TERMS_VERSION` en `app/utils/legal.ts`. Al cambiar el texto legal, subir la fecha: cada cuenta verá el aviso de aceptación al entrar y quedará registrado qué versión aceptó y cuándo (`profiles.terms_version`, `profiles.terms_accepted_at`).
