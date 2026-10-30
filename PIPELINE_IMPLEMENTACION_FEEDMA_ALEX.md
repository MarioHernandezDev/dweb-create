PIPELINE DE IMPLEMENTACIÓN — FEEDMA
Rama de Alex: feature/publicaciones-ux
Objetivo: organizar el trabajo de redes sociales y publicaciones en fases pequeñas, verificables y seguras. Este documento define cómo debe planificar y ejecutar Claude Code el trabajo; no afirma que ninguna tarea esté implementada ni probada.

Fuente de alcance: TRABAJO_ALEX actualizado el 2026-10-28. Antes de actuar, contrasta este pipeline con el estado real del repositorio, docs/CHANGELOG.md, docs/CONTEXTO_PROYECTO_FEEDMA.md, docs/PENDIENTES.md y las ramas actuales.

1. Instrucciones principales para Claude Code
Actúa como responsable técnico de la implementación del trabajo asignado a Alex en FEEDMA. No intentes resolver todo el inventario en una única sesión ni empieces a programar sin revisar el estado real.

Debes trabajar con estas reglas:
1. Auditar antes de cambiar. Inspecciona rama, git status, commits recientes, diferencias con main, documentación relevante, código implicado y pruebas existentes. No des por cierto que el documento refleja al 100 % el repositorio actual.
2. Planificar antes de cada fase. Enumera objetivo, tareas, archivos previstos, dependencias, riesgos, pruebas y criterios de aceptación. Identifica dudas que requieran decisión humana.
3. Trabajar en incrementos pequeños. Implementa una unidad funcional por vez, con cambios fáciles de revisar. Evita refactors generales no necesarios para la tarea.
4. No inventar verificaciones. Diferencia claramente entre código escrito, comandos ejecutados, pruebas que pasan, comprobaciones manuales realizadas y aspectos pendientes. Nunca digas “verificado” si no lo has comprobado.
5. No saltarse decisiones bloqueantes. Si una decisión Q3, Q4, Q5, Q6 o Q8 afecta a la siguiente tarea, explica las opciones y detente en ese punto hasta recibir decisión. Puedes continuar tareas independientes.
6. Supabase es compartido. Antes de crear o aplicar cualquier migración, RPC, cambio de RLS o grants, presenta un resumen del impacto y solicita aprobación explícita. No apliques migraciones automáticamente.
7. Proteger el trabajo de Mario. No fusiones las ramas de trabajo entre sí. Respeta los archivos compartidos, avisa antes de modificarlos y coordina especialmente con M-L1, M-L2, M-S1 y cualquier trabajo que afecte a social_accounts, notificaciones, rate limiting o autenticación.
8. No ejecutar operaciones destructivas. No uses git push --force, git reset --hard, git clean -fd ni comandos que descarten trabajo del usuario. No hagas git add -A a ciegas.
9. No introducir secretos. Nunca imprimas ni guardes tokens, claves OAuth, valores reales de .env o credenciales en logs, commits, pruebas o documentación.
10. No ampliar el alcance sin permiso. Si descubres trabajo adicional, documenta el hallazgo, impacto y recomendación; no lo incorpores automáticamente.
11. No simular integraciones reales. Si no existen credenciales, cuentas o aprobación de proveedor, desarrolla y prueba las partes independientes y marca la verificación externa como bloqueada.
12. Mantener el documento de seguimiento actualizado. Al cerrar una unidad, registra qué se hizo, qué se comprobó, qué queda sin verificar y qué tarea desbloquea.
Protocolo para cada tarea
Para cada ID (por ejemplo, A-R2):
1. Leer el código y las pruebas relacionados.
2. Confirmar el estado real: pendiente, parcial, implementado sin verificar, bloqueado o verificado.
3. Comprobar dependencias y decisiones.
4. Presentar un plan breve y archivos que se prevé tocar.
5. Si implica Supabase, mostrar primero el diseño propuesto y esperar aprobación.
6. Implementar el cambio mínimo completo.
7. Añadir o actualizar pruebas automatizadas.
8. Ejecutar los comandos adecuados y registrar sus resultados reales.
9. Si hay UI, comprobarla en navegador real a 390 px y escritorio cuando el entorno lo permita.
10. Actualizar docs/CHANGELOG.md con:
    - Qué se cambió.
    - Verificado de verdad.
    - Sin verificar / bloqueado.
11. Revisar git diff, detectar cambios ajenos y resumir.
12. Marcar la tarea como terminada solo si cumple todos sus criterios.
Si no se dispone de navegador, credenciales, entorno de integración o acceso al proveedor, no afirmes haber realizado esa comprobación: deja un paso manual reproducible.
2. Fase 0 — Auditoría, sincronización y decisiones
Objetivo
Crear una base fiable antes de modificar código y resolver las decisiones que condicionan la arquitectura.
Pasos
- Comprobar la rama actual y confirmar que es la rama de trabajo esperada.
- Ejecutar git status --short y conservar cualquier cambio local del usuario.
- Revisar commits recientes y diferencias con main.
- Sincronizar con main solo después de inspeccionar cambios locales y confirmar que es seguro; no sobrescribir trabajo.
- Revisar docs/CHANGELOG.md, docs/CONTEXTO_PROYECTO_FEEDMA.md, docs/PENDIENTES.md, TRABAJO_ALEX y la documentación OAuth.
- Inspeccionar el estado actual de las tareas A-R1–A-R15 y A-P1–A-P2 en el código.
- Identificar cambios de Mario que puedan afectar a archivos compartidos.
- No ejecutar pruebas de integración que escriban en la base de datos compartida sin coordinar el momento.
Decisiones que hay que presentar al usuario
- Q3 — Scheduler/hosting: dónde se desplegará y qué mecanismo programará sincronizaciones. A-R5 no debe diseñarse definitivamente sin esto.
- Q4 — Plataformas sin OAuth real: recomendación inicial del documento: retirar las conexiones falsas de TikTok, X, Facebook y LinkedIn, salvo que se decida implementar OAuth real.
- Q5 — Meta: confirmar si existe una cuenta de Facebook y una aplicación Meta utilizable. Si no, marcar las pruebas reales de Instagram como bloqueadas y seguir con trabajo independiente.
- Q6 — Aprobación del partner: por ahora, conservar el comportamiento de aviso; no convertirlo en un bloqueo de permisos sin decisión expresa.
- Q8 — Estrategia de ramas: valorar subramas cortas por tarea creadas desde la rama de trabajo actual y PR hacia main, sin fusionar la rama de Alex con la de Mario.
- Confirmar también que se mantiene el reparto de tareas aprobado.
Puerta de salida
No empezar tareas que dependan de decisiones sin resolver. Sí se puede avanzar en trabajo independiente y seguro. Entregar un informe de auditoría con:
- Rama y estado del árbol de trabajo.
- Diferencias relevantes frente a main.
- Estado real de cada tarea.
- Decisiones pendientes.
- Riesgos y archivos compartidos.
- Orden definitivo recomendado.
3. Fase 1 — Seguridad y estabilización sin dependencias externas
Objetivo
Reducir riesgos y resolver decisiones de bajo acoplamiento antes de construir nuevas funcionalidades.
Orden recomendado
1. A-R13 — Tests de token-crypto y oauth-state.
   - Inspeccionar las implementaciones antes de definir casos.
   - Añadir tests unitarios de cifrado/descifrado, datos inválidos, estado OAuth, expiración y reutilización, según el comportamiento real esperado.
   - No exponer secretos reales en las pruebas.
2. A-R10 — Retirar o corregir conexiones falsas.
   - Aplicar la decisión Q4.
   - Asegurar que la interfaz no ofrece conexiones que no son reales.
   - Antes de borrar filas históricas, definir y aprobar criterio de limpieza; no borrar datos por suposición.
3. A-R11 — Evitar que el navegador lea tokens cifrados.
   - Primero inspeccionar policies, grants, consultas y arquitectura actual.
   - Diseñar una solución compatible: permisos por columna, vista segura u otra opción apropiada al esquema real.
   - Es una zona protegida: presentar el impacto y esperar aprobación antes de cambiar grants/RLS.
   - Añadir test de integración que confirme que el cliente no puede leer access_token_encrypted ni refresh_token_encrypted, mientras las pantallas legítimas siguen funcionando.
4. A-P1 — Segunda vuelta de UX de publicaciones.
   - Auditar primero el CHANGELOG 49–52 y la UI actual; el documento dice que ya hubo un primer pase.
   - No rehacer lo que ya esté resuelto.
   - Respetar el comportamiento móvil del selector de fase en PhaseBoard.vue y probar el arrastre real si se toca vuedraggable.
   - Verificar a 390 px y escritorio.
Puerta de salida
- Tests unitarios relevantes pasan.
- Typecheck y build se ejecutan y se registra el resultado.
- Cambios de seguridad están cubiertos por una prueba adecuada.
- A-P1 se ha comprobado visual y funcionalmente si hay navegador disponible.
- No quedan cambios sin explicar ni archivos ajenos incluidos accidentalmente.
4. Fase 2 — Ciclo de vida de cuentas y tokens
Objetivo
Dar un estado fiable a las conexiones y permitir una desconexión coherente.
A-R2 — Expiración y estado de tokens
- Inspeccionar OAuth de Instagram y YouTube, almacenamiento, cifrado, llamadas de API y manejo actual de errores.
- Definir estados explícitos y transiciones antes de modificar el esquema.
- Distinguir token expirado, revocado, error temporal, error de permisos y fallo de red.
- Diseñar la renovación de Instagram conforme a la API/documentación aplicable y verificar los límites reales del proveedor.
- Mostrar “Reconectar” cuando corresponda; evitar datos congelados o errores genéricos engañosos.
- Si requiere columnas nuevas, preparar migración aditiva y solicitar aprobación.
- No registrar tokens ni respuestas sensibles.
A-R3 — Desconexión completa
- Implementar endpoint de servidor para gestionar la desconexión.
- Para Google/YouTube, revocar el token con el mecanismo admitido por el proveedor antes de confirmar la operación.
- Documentar claramente las limitaciones de revocación de Instagram.
- Confirmar en la interfaz antes de desconectar.
- Manejar fallos parciales sin afirmar que el proveedor revocó un token si no se pudo confirmar.
- Coordinar con Mario para que el borrado de cuenta M-L2 también elimine credenciales y registros relacionados de forma segura.
Puerta de salida
- Casos de token válido, expirado, revocado y fallo temporal tienen comportamiento definido.
- Desconexión probada con mocks/unit tests y, cuando sea posible, una cuenta real.
- RLS y acceso desde navegador no exponen secretos.
- Cualquier limitación externa está documentada.
5. Fase 3 — Modelo de métricas e integración de publicaciones
Esta fase es la base de las métricas reales. No desarrollar predicciones basadas en rendimiento ni informes de colaboración hasta que la procedencia de las métricas esté resuelta.

A-R8 — Definir el pipeline de metrics
Antes de escribir la migración, presentar una propuesta de esquema y responder:
- Qué representa cada métrica y en qué unidad.
- Qué clave identifica una publicación externa y su plataforma.
- Si se guarda histórico de observaciones, último valor o ambos.
- Cómo se evita duplicar datos al reintentar una sincronización.
- Qué timestamp representa la medición y cuál la sincronización.
- Cómo se controlan errores parciales y límites del proveedor.
- Qué roles pueden leer cada registro.
- Cómo se mantiene compatibilidad con el código actual y con la rama de Mario.
Implementar solo después de aprobar el diseño. La escritura debe ser idempotente y la lectura debe respetar RLS.
A-R7 — Vincular publicaciones FEEDMA con publicaciones externas
- Inspeccionar el esquema actual de posts, social_accounts, metrics y posts.metadata.
- Comparar opciones: columnas dedicadas o metadata; explicar ventajas, restricciones e impacto en consultas.
- Solicitar aprobación del esquema antes de migrar.
- Asegurar que una publicación queda vinculada a una cuenta autorizada y a un identificador/URL externo verificable.
- Evitar asociaciones ambiguas por texto de plataforma.
- Añadir pruebas para asociaciones válidas, inválidas, duplicadas y ausencia de enlace externo.
Puerta de salida
- La migración está aprobada, registrada y aplicada por una persona autorizada.
- Una sincronización de prueba escribe métricas sin duplicados al reintentarse.
- La política de lectura permite solo a los perfiles autorizados acceder a cada métrica.
- Las publicaciones vinculadas muestran una relación externa inequívoca.
- Las pruebas de integración se ejecutan coordinando el uso de la base compartida.
6. Fase 4 — OAuth real y verificación de cuentas
A-R1 — Verificación de extremo a extremo
- Comprobar primero el código actual y las variables necesarias, sin revelar sus valores.
- YouTube: probar conectar, recuperar datos, estado persistido, reconectar y errores.
- Instagram: solo realizar pruebas reales cuando estén disponibles cuenta Meta, configuración OAuth y permisos necesarios.
- Si una integración está bloqueada por configuración externa, documentar exactamente qué falta y seguir con tareas no dependientes.
- No declarar verificado el flujo por la mera existencia del código o porque lo indique documentación anterior.
A-R4 — Desautorización y borrado de datos de Meta
- Esperar a que Mario termine y publique las páginas públicas necesarias (M-L1).
- Coordinar el borrado con M-L2 y A-R3.
- Implementar callbacks exigidos por Meta con validación y borrado acotado.
- Comprobar que la solicitud de borrado elimina los registros y tokens correspondientes, sin tocar cuentas ajenas.
- Documentar y probar el procedimiento hasta donde permita el entorno de Meta.
Puerta de salida
- Cada proveedor tiene un estado real: verificado, parcialmente verificado o bloqueado por requisito externo.
- Hay evidencias reproducibles y entradas en CHANGELOG.
- No se presenta como real una conexión simulada.
7. Fase 5 — Lectura y sincronización de métricas reales
A-R6 — Insights de Instagram
- Confirmar los endpoints, permisos, tipos de cuenta y nombres de métricas contra documentación vigente y una cuenta real.
- No asumir que todos los insights están disponibles para todas las cuentas o tipos de publicación.
- Tratar errores de permisos y métricas no disponibles como casos explícitos.
- Guardar los resultados a través del pipeline de A-R8 y vincularlos con A-R7.
- Contrastar los valores mostrados con los datos del proveedor y registrar qué métricas se verificaron realmente.
A-R5 — Sincronización programada
- No comenzar el diseño final hasta resolver Q3.
- Reutilizar el mecanismo aprobado para scheduler y el rate limiting compartido, coordinando con Mario, propietario de server/utils/rate-limit.ts.
- Definir frecuencia, límites, reintentos, idempotencia, observabilidad y recuperación de fallos.
- Añadir last_synced_at y estado/error solo si el esquema aprobado lo necesita.
- Evitar sincronizaciones duplicadas y controlar límites de API.
- Probar con datos controlados antes de habilitar un job recurrente.
Puerta de salida
- Métricas contrastadas con datos reales donde existan credenciales.
- La sincronización es idempotente, limitada y observable.
- Los fallos se registran sin filtrar secretos.
- El estado de última sincronización refleja el resultado real.
8. Fase 6 — Funcionalidades de valor construidas sobre métricas
A-R9 — Predicción de éxito
- Auditar primero predict.post.ts, ml-heuristic.ts y el flujo LLM.
- Explicar la lógica real existente y diferenciar heurística de datos históricos.
- Usar histórico de publicaciones solo cuando exista cantidad/calidad suficiente.
- Mostrar cuándo la predicción se basa en histórico real y cuándo en una heurística o estimación.
- No presentar estimaciones como garantías ni fabricar histórico.
- Añadir tests para ausencia de histórico, histórico insuficiente y datos suficientes.
A-R12 — Métricas verificadas en perfiles y Descubrir
- Revisar get_public_social_accounts y server/api/discover/search.post.ts.
- Exponer solo los datos públicos que estén aprobados y sean necesarios.
- Mostrar estado de verificación y fecha de actualización cuando estén disponibles.
- No exponer tokens, errores internos ni datos privados.
- Coordinar cualquier cambio del RPC existente.
A-R15 — Informe de rendimiento de una colaboración
- Definir qué entregas pertenecen a cada colaboración y qué métricas puede consultar el partner.
- Aplicar autorización en servidor/RLS: un partner solo ve los datos de sus propias colaboraciones.
- No depender únicamente de filtros visuales en el cliente.
- Incluir fechas, plataforma, publicaciones vinculadas y métricas disponibles; indicar claramente datos ausentes.
- Añadir tests de acceso autorizado y denegado entre colaboraciones distintas.
Puerta de salida
- La predicción distingue datos reales de estimaciones.
- Las métricas públicas y los informes respetan la autorización.
- Se prueban casos sin datos y de acceso cruzado.
- No se añade complejidad visual sin datos que la respalden.
9. Fase 7 — Decisión de permisos de aprobación de publicaciones
A-P2 — Aprobación como bloqueo real
- No convertir el aviso actual en bloqueo de permisos sin resolver Q6.
- Si se decide mantener el aviso, documentar la decisión y comprobar que la interfaz no induce a error.
- Si se aprueba el bloqueo, diseñar el cambio de RLS/RPC, explicar impacto en todos los flujos y obtener aprobación explícita antes de la migración.
- Implementar control en servidor; ocultar un botón en UI no es seguridad suficiente.
- Añadir pruebas de integración para los roles y transiciones válidos e inválidos.
- Coordinar el cambio por tratarse de una zona protegida y de archivos compartidos.
Puerta de salida
La decisión está documentada y el comportamiento del servidor coincide con ella. Si no hay decisión, A-P2 permanece pendiente sin cambios de permisos.
10. Fase 8 — Documentación y cierre
A-R14 — Documentación final
Actualizar la documentación OAuth de Instagram y YouTube, y los comentarios obsoletos, solo cuando el comportamiento final esté comprobado.
Cierre general
- Revisar el estado de todos los IDs A-R1–A-R15 y A-P1–A-P2.
- Verificar que los cambios estén en commits pequeños y con mensajes claros.
- Revisar git diff y el estado de archivos.
- Confirmar que el CHANGELOG diferencia qué se cambió, qué se verificó y qué sigue pendiente.
- Preparar resumen de entrega con riesgos conocidos, decisiones pendientes y pasos manuales restantes.
- Abrir PR hacia main cuando corresponda; no fusionar la rama de Alex con la de Mario.
- Tras integrar cambios de main, resolver conflictos revisando ambos lados y repetir typecheck, tests, build y pruebas de UI afectadas.
11. Dependencias resumidas
- A-R13 es una base de pruebas y puede avanzar de forma independiente.
- A-R10 depende de Q4.
- A-R11 requiere revisión de seguridad y aprobación antes de cambiar grants/RLS.
- A-R2 precede a A-R3 y A-R5.
- A-R8 precede a A-R6, A-R7, A-R9, A-R12 y A-R15.
- A-R7 + A-R8 habilitan métricas de publicaciones y los informes de colaboración.
- A-R1 para Instagram depende de Q5 y de la configuración/permisos de Meta.
- A-R4 depende de M-L1 y debe coordinarse con M-L2 y A-R3.
- A-R5 depende de Q3 y de coordinación con M-S1.
- A-P2 depende de Q6.
- A-R14 se cierra al final, una vez comprobado el comportamiento real.
- A-P1 puede avanzar en paralelo si no interfiere con cambios de publicaciones compartidos.
No fuerces un orden lineal cuando haya tareas independientes; sí respeta las dependencias técnicas y las puertas de seguridad.
12. Comprobaciones mínimas para cada entrega
Comandos indicados por el proyecto:
- npx vue-tsc --noEmit
- npm test -- --run
- npm run build
- npm run test:integration cuando se cambien datos, RLS o RPC, coordinando antes por el uso de la base compartida.
Además:
- UI: navegador real a 390 px y escritorio, si el entorno lo permite.
- Interacciones: probar el flujo real, no solo inspeccionar el código.
- Seguridad: probar permisos permitidos y denegados.
- Datos: comprobar idempotencia, ausencia de duplicados y limpieza de datos de prueba.
- Integraciones: separar pruebas simuladas de pruebas contra proveedores reales.
Si un comando falla, incluye el comando, resultado resumido y si el fallo parece relacionado con el cambio o preexistente. No ocultes errores ni los arregles mediante cambios de alcance no aprobados.
13. Plantilla de informe al terminar cada tarea
Tarea: [ID — nombre]
- Estado inicial comprobado: pendiente / parcial / implementado sin verificar / bloqueado.
- Cambios realizados:
- Archivos modificados:
- Migraciones/RPC/RLS: ninguna / propuesta pendiente de aprobación / aprobada / aplicada.
- Pruebas ejecutadas y resultado real:
- Comprobación en navegador: realizada / no realizada y motivo.
- Verificado de verdad:
- Sin verificar o bloqueado:
- Riesgos y coordinación requerida:
- Siguiente tarea desbloqueada:
- Commit: hash y mensaje, si existe.
14. Primera acción que debes realizar ahora
No implementes todavía las funcionalidades.

Empieza por la Fase 0:
1. Inspecciona la rama, el estado local y el estado real del repositorio.
2. Contrasta este pipeline con el código y documentación actual.
3. Identifica cambios sin commitear y evita sobrescribirlos.
4. Revisa decisiones pendientes y dependencias con Mario.
5. Devuelve un informe de auditoría y un plan de ejecución ordenado.
6. Señala exactamente qué decisiones necesitas que confirme el usuario.
7. No ejecutes migraciones ni pruebas de integración que escriban en la base compartida en esta primera revisión.
Después de recibir las decisiones necesarias, avanza una tarea o unidad pequeña cada vez, siguiendo sus puertas de salida. No intentes completar todas las fases en una sola ejecución.

15. Anexo — decisiones y correcciones tras la auditoría de la Fase 0 (2026-10-28)
Este anexo prevalece sobre el texto anterior donde lo contradiga. Está contrastado con el código y con docs/CHANGELOG.md.

Decisiones confirmadas
- Q3: no se elige scheduler hasta decidir el despliegue. La sincronización se diseña independiente del scheduler (ver docs/PROPUESTA_A-R5_SYNC_ENDPOINT.md). No se activa ningún proceso programado.
- Q4: TikTok, X, Facebook y LinkedIn se muestran como "Próximamente", sin conexión posible. No se borran filas históricas sin criterio aprobado.
- Q5: no se da por hecha ninguna configuración de Meta. A fecha de este anexo, INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET están vacías en el entorno local, así que Instagram está bloqueado. YouTube tiene credenciales definidas, pero su validez y la configuración en Google Cloud no se han podido comprobar desde el repositorio.
- Q6: se mantiene el aviso actual; A-P2 queda pendiente y no se tocan permisos.
- Q8: subramas cortas por tarea desde feature/publicaciones-ux, con PR hacia main. No se fusiona con la rama de Mario.
- Q11: se mantiene el reparto.
- Ampliación de A-R11: además de ocultar los tokens, impedir que el navegador escriba en social_accounts (seguidores, tokens, alta de cuentas). Es una propuesta (docs/PROPUESTA_A-R11_SEGURIDAD_SOCIAL_ACCOUNTS.md); no se aplica nada sin autorización explícita.

Correcciones al texto anterior (contradicciones con el estado real)
- A-R13: oauth-state no impide reutilizar el state dentro de sus 10 minutos de validez. El test lo documenta como limitación conocida; impedirlo exige almacenamiento nuevo y queda pendiente de decisión.
- A-R4: no depende solo de M-L1. Las páginas de privacidad de Mario son una plantilla con datos por rellenar y no están en main; además Meta necesita una URL pública, es decir, la aplicación desplegada. Los callbacks de OAuth tampoco guardan el id de la cuenta del proveedor, que A-R4 necesita para localizar la fila (propuesto en la propuesta de esquema).
- A-R7 / A-R8: las métricas por publicación necesitan el vínculo publicación-contenido externo. Orden propuesto: A-R8a (métricas de cuenta) -> A-R7 -> A-R8b (métricas por publicación).
- A-R15: la lectura de metrics para el partner de la colaboración ya existe en RLS (metrics_select_scoped); lo que falta es qué se escribe.
- A-R2 pasa a la Fase 2 junto con el diseño de esquema (el pipeline original y TRABAJO_ALEX lo ordenaban de forma distinta).
- A-P1: el README que menciona el alcance ya no existe; el alcance se reconstruyó en docs/PROPUESTA_A-P1_ALCANCE_PUBLICACIONES.md.

Estado a fecha de este anexo (no es una afirmación de que todo lo anterior esté verificado en navegador)
- A-R13: tests unitarios de token-crypto y oauth-state hechos y pasando. La parte de integración de RLS queda pendiente de A-R11.
- A-R10: cambio de interfaz hecho; tests unitarios, typecheck y build pasan; no verificado en navegador.
- Propuestas escritas, pendientes de aprobación: A-R11, esquema conjunto, endpoint A-R5, alcance A-P1.
- Cada tarea tiene su entrada con prefijo [Alex] en docs/CHANGELOG.md.

Requisito nuevo (2026-10-28): A-R16, dashboard de analítica de YouTube
- Incorporado como tarea nueva, sin interrumpir el orden vigente. Ver docs/REQUISITO_A-R16_DASHBOARD_YOUTUBE.md (auditoría, catálogo de métricas viables, dependencias).
- Encaja después de A-R2, A-R3 y A-R1 (YouTube) y en paralelo a A-R8a. La mayor parte (periodos, comparación, vídeos) se puede construir con datos en vivo de la API de YouTube Analytics, sin migración; solo el histórico propio de acumulados (A-R16e) depende del esquema A-R8a.
- No se implementa nada hasta llegar a esa fase; antes se presentará la estructura de componentes para revisión.

Requisito nuevo (2026-10-29): A-R17, Métricas a ancho completo (rediseño y usabilidad)
- Propuesta en docs/PROPUESTA_A-R17_METRICAS_FULL_WIDTH.md (auditoría, distribución, funcionalidades viables, fases A-R17a–f). Solo presentación, sin cambios de esquema; no interrumpe seguridad ni arquitectura. Va después de A-R16 y reutiliza sus componentes.
- Impresiones/CTR y otros informes de Analytics: por confirmar con el canal real. Histórico propio y métricas por publicación: dependen de A-R8a / A-R7 / A-R8b (migraciones aprobadas).
- Página Redes (/creator/socials) eliminada: conectar, desconectar y sincronizar viven en Métricas > Conexiones (`useSocialAccountActions`); el enlace antiguo redirige a Métricas.

Estado 2026-10-30 (M2 y M3 aplicadas por Alex): A-R8a (snapshots diarios de acumulados + panel "Histórico propio"), A-R7 (vincular publicación con su contenido verificando con el proveedor que es de la cuenta) y A-R8b (métricas por publicación vinculada, nullables, una fila por día) implementadas y verificadas (ver docs/CHANGELOG.md Alex-31, 32 y 33). Pendiente de verificar con cuentas reales: la lectura de YouTube/Instagram de verdad (el camino feliz), Instagram completo (permiso de insights) y la sincronización programada (Q3).

Requisito nuevo (2026-10-30): A-R18, Perfiles a ancho completo (/creator/profile y /partner/profile)
- Propuesta en docs/PROPUESTA_A-R18_PERFILES.md (auditoría, 4 pestañas por rol, distribución full width, mejoras, fases A-R18a–f). Solo presentación, sin migraciones ni RLS; no interrumpe seguridad ni arquitectura. Va después de A-R4/A-R6 y de que Mario cierre sus cambios de perfil/cuenta (M-L2) para evitar conflictos en esos dos archivos. Sin implementar.
