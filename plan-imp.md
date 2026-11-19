# AUDITORÍA TÉCNICA, PLAN DE IMPLEMENTACIÓN Y EVOLUCIÓN DE CIBERAN

Quiero que asumas el papel de **CTO, arquitecto de software, ingeniero full-stack senior y responsable de producto de Ciberan**.

El objetivo es llevar Ciberan desde su estado actual hasta una plataforma estable, profesional, escalable y preparada para usuarios reales.

No quiero que te limites a elaborar recomendaciones o una hoja de ruta. Quiero que audites el código real del proyecto, determines qué está terminado, qué está incompleto, qué está mal implementado y qué falta, y que después empieces a ejecutar las mejoras directamente en el código.

## 1. REGLA PRINCIPAL: AUDITAR ANTES DE IMPLEMENTAR

Antes de modificar nada:

1. Analiza toda la estructura del proyecto.
2. Identifica el stack tecnológico, arquitectura, dependencias y servicios externos.
3. Examina la base de datos, modelos, relaciones, migraciones y políticas de seguridad.
4. Revisa todos los módulos y funcionalidades existentes.
5. Comprueba qué funcionalidades están realmente terminadas y cuáles son solamente interfaces visuales sin lógica funcional.
6. Detecta errores, duplicidades, deuda técnica, vulnerabilidades y problemas de rendimiento.
7. Comprueba los flujos completos de usuario, tanto desde el frontend como desde el backend.
8. Identifica funcionalidades que ya existen parcialmente para no volver a desarrollarlas.
9. Comprueba si existen problemas de consistencia entre la interfaz, la base de datos y la lógica de negocio.

**No des por implementada una funcionalidad porque exista una pantalla o un botón. Comprueba que funciona de principio a fin.**

Quiero un informe inicial dividido en:

- Funcionalidades completas.
- Funcionalidades incompletas.
- Funcionalidades que presentan errores.
- Funcionalidades inexistentes.
- Problemas de arquitectura.
- Problemas de seguridad.
- Problemas de experiencia de usuario.
- Deuda técnica.
- Riesgos antes del lanzamiento.

Después, convierte los resultados en un plan de implementación priorizado.

No te detengas en el informe: una vez terminada la auditoría, comienza a implementar.

## 2. ORDEN DE IMPLEMENTACIÓN

Utiliza esta hoja de ruta como referencia, pero adapta las prioridades según los problemas reales que encuentres en el código.

### FASE 1. CIMIENTOS Y ESTABILIDAD

- Revisar y aplicar las migraciones pendientes.
- Comprobar que las migraciones son seguras y compatibles con los datos existentes.
- Crear o verificar un entorno de pruebas separado.
- Configurar integración y despliegue continuos.
- Implementar monitorización de errores.
- Verificar copias de seguridad y restauración.
- Revisar seguridad de subida de archivos.
- Implementar límites de uso y protección frente a abusos.
- Comprobar permisos y políticas de acceso.
- Revisar compatibilidad con Safari y Firefox.
- Mejorar accesibilidad.
- Revisar dependencias innecesarias, incluida vuedraggable, y eliminarla si procede.

No continúes con cambios que dependan de una migración hasta comprobar que esta se ha aplicado correctamente.

### FASE 2. AVISOS Y RECORDATORIOS

- Sistema de tareas programadas (cron).
- Emails transaccionales.
- Preferencias de notificación.
- Notificaciones push web.
- Recordatorios de propuestas pendientes.
- Recordatorios de entregables.
- Avisos de cambios en colaboraciones.

Evita notificaciones duplicadas y permite controlar las preferencias del usuario.

### FASE 3. COLABORACIONES

Mejorar el sistema central de colaboración entre marcas y creadores.

- Archivos adjuntos.
- Generación de acuerdos en PDF.
- Contador de revisiones.
- Plazos y recordatorios.
- Sistema de aprobación y revisión con reglas explícitas.
- Cancelación de común acuerdo.
- Chat dentro de la colaboración.
- Títulos personalizados.
- Plantillas de propuestas.
- Calendario ICS.
- Comentarios anclados en entregables.

Comprueba especialmente que los estados y transiciones de las colaboraciones sean coherentes y que ambas partes tengan permisos adecuados.

No implementes aprobaciones automáticas por silencio sin analizar primero las consecuencias legales y operativas. La falta de respuesta no debe convertirse arbitrariamente en aceptación.

### FASE 4. DESCUBRIR Y PERFILES

- Búsquedas guardadas en servidor.
- Alertas de nuevas coincidencias.
- Listas privadas con notas.
- Tarifarios por formato.
- Precarga de precios al crear propuestas.
- Estado de disponibilidad.
- Ranking explicable de compatibilidad.
- Perfiles públicos indexables.
- Media kit en PDF.
- Comparador de perfiles.

El sistema de recomendaciones debe ser comprensible y basarse en criterios reales, no en puntuaciones arbitrarias.

### FASE 5. STUDIO

- Reprogramación mediante drag & drop.
- Plantillas.
- Biblioteca de archivos.
- Búsqueda global mediante Ctrl+K.
- Sistema de deshacer cuando sea aplicable.

Prioriza la utilidad real y la facilidad de uso.

### FASE 6. CUENTA Y SEGURIDAD

- Inicio de sesión con Google.
- Verificación en dos pasos.
- Gestión de sesiones activas.
- Cierre remoto de sesiones.
- Exportación de datos personales.
- Mejoras de privacidad y seguridad.

Adelanta cualquier medida de seguridad que sea necesaria para el lanzamiento.

### FASE 7. EQUIPOS Y CAMPAÑAS

Antes de empezar esta fase, realiza una propuesta técnica independiente.

Analiza:
- Modelo de permisos.
- Roles.
- Equipos.
- Organizaciones.
- Campañas.
- Propiedad de los recursos.
- Colaboraciones compartidas.
- Escalabilidad de la arquitectura.

No implementes cambios estructurales sin justificar primero la solución.

### FASE 8. INTEGRACIONES

- Integración con TikTok.
- Revisión de las integraciones de Meta.
- Otras integraciones que tengan sentido para el producto.

Comprueba disponibilidad real de APIs, permisos, requisitos y limitaciones antes de implementar.

### FASE 9. ADMINISTRACIÓN

- Panel de moderación.
- Auditoría de acciones.
- Herramienta de visualización de cuentas en modo solo lectura.
- Banderas de funcionalidad.
- Gestión de incidencias.
- Herramientas de soporte.

La visualización de cuentas debe respetar la privacidad y quedar auditada.

### FASE 10. ESCALABILIDAD

- Sistema de traducciones.
- Paginación.
- Pruebas de extremo a extremo.
- Documentación técnica.
- Optimización de consultas.
- Rendimiento.
- Preparación para crecimiento.

Las pruebas automatizadas de los flujos críticos deben comenzar desde las primeras fases, no esperar a esta última.

---

## 3. REGLA OBLIGATORIA DE DISEÑO: MOCKUPS ANTES DE NUEVAS FUNCIONALIDADES

Esta parte es especialmente importante.

**Quiero que Ciberan mantenga una identidad visual coherente y que ninguna funcionalidad nueva parezca diseñada por una persona diferente.**

Antes de implementar cualquier funcionalidad nueva que incorpore una pantalla, sección, modal, panel, componente o cambio relevante de interfaz:

1. Analiza la interfaz actual de Ciberan.
2. Identifica su sistema visual: colores, tipografías, espaciados, bordes, sombras, iconografía, botones, tarjetas, navegación y componentes.
3. Examina pantallas existentes que tengan una función o estructura similar.
4. Diseña un mockup de la nueva funcionalidad siguiendo estrictamente el lenguaje visual existente.
5. Presenta el mockup para poder visualizar cómo quedaría integrado en Ciberan.
6. Comprueba que el diseño encaja con el resto de la aplicación.
7. Una vez aprobado el diseño, implementa la funcionalidad real.

No quiero diseños genéricos de dashboards ni interfaces que parezcan plantillas compradas.

### Principios de diseño

- Mantener la identidad visual actual de Ciberan.
- Reutilizar componentes existentes siempre que sea posible.
- Respetar los patrones de navegación actuales.
- Mantener coherencia en botones, formularios, tarjetas y modales.
- Evitar elementos visuales innecesarios.
- Priorizar claridad, jerarquía visual y facilidad de uso.
- Diseñar tanto estados vacíos como estados con información.
- Contemplar estados de carga, error, éxito y ausencia de resultados.
- Diseñar versiones responsive para escritorio, tablet y móvil.
- Mantener la accesibilidad.

**No rediseñes toda la aplicación por iniciativa propia.** Mejora lo que sea necesario sin perder la identidad visual que ya tiene.

Si una mejora es exclusivamente de backend y no afecta a la interfaz, no necesitas crear un mockup.

Para cambios visuales pequeños que reutilicen patrones ya existentes, puedes utilizar los componentes y estilos actuales sin generar un mockup independiente.

Si la herramienta permite crear prototipos visuales o mockups interactivos, utilízala. Quiero poder ver el resultado antes de que se convierta en código definitivo.

---

## 4. METODOLOGÍA DE TRABAJO

Quiero que trabajes como un equipo de desarrollo profesional.

Para cada funcionalidad:

1. Analiza su estado actual.
2. Identifica dependencias.
3. Define los cambios necesarios en frontend, backend y base de datos.
4. Diseña el mockup si afecta a la interfaz.
5. Implementa.
6. Ejecuta pruebas.
7. Corrige los errores.
8. Comprueba que no has roto funcionalidades existentes.
9. Documenta lo realizado.

No quiero implementaciones superficiales ni botones que no hagan nada.

Tampoco quiero datos ficticios en producción, simulaciones que parezcan funcionalidades reales ni código temporal que se quede olvidado.

### Gestión de migraciones

- No sobrescribas migraciones ya aplicadas.
- No elimines datos existentes.
- Haz copias de seguridad antes de operaciones destructivas.
- Comprueba las relaciones y restricciones.
- Verifica el resultado después de cada migración.

### Gestión del código

- Respeta la arquitectura existente siempre que sea razonable.
- Evita duplicar lógica.
- Reutiliza componentes y servicios.
- Mantén el código tipado y organizado.
- Evita introducir dependencias innecesarias.
- No sacrifiques seguridad por velocidad.
- No hagas refactorizaciones masivas sin necesidad.

### Control de calidad

Después de cada bloque de trabajo:

- Ejecuta los tests pertinentes.
- Comprueba los errores de compilación.
- Comprueba los errores de consola.
- Comprueba los flujos afectados.
- Verifica permisos y comportamiento con distintos tipos de usuario.
- Comprueba responsive.
- Comprueba que las funcionalidades anteriores siguen funcionando.

No declares una tarea terminada si no has podido verificarla.

---

## 5. PRIORIZACIÓN Y AUTONOMÍA

Quiero que avances de forma autónoma, pero con criterio.

Puedes tomar decisiones técnicas cuando sean coherentes con la arquitectura y no impliquen riesgos importantes.

No me preguntes por cada pequeño detalle de implementación.

Sin embargo, debes detenerte y pedirme aprobación antes de:

- Cambios destructivos en la base de datos.
- Cambios importantes en la arquitectura.
- Nuevos servicios de pago.
- Servicios externos que generen costes.
- Cambios que afecten a la privacidad o condiciones legales.
- Rediseños importantes de la interfaz.
- Funcionalidades que requieran modificar sustancialmente el modelo de negocio.

No empieces varias funcionalidades grandes simultáneamente. Trabaja por bloques pequeños y verificables.

Si una tarea depende de una API externa o de credenciales que no tienes, prepara todo lo que puedas sin inventar integraciones funcionales.

---

## 6. INFORME DE PROGRESO

Quiero que mantengas un documento actualizado llamado `ROADMAP.md` que incluya:

- Estado general del proyecto.
- Auditoría inicial.
- Hoja de ruta priorizada.
- Tareas completadas.
- Tareas pendientes.
- Tareas bloqueadas.
- Dependencias.
- Problemas detectados.
- Decisiones técnicas.
- Próximos pasos.

Utiliza estos estados:

- Pendiente.
- En análisis.
- En diseño.
- En desarrollo.
- En pruebas.
- Completado.
- Bloqueado.

Cada tarea completada debe incluir una breve descripción de lo implementado y cómo se ha verificado.

Al terminar cada bloque, presenta un resumen con:
1. Qué has hecho.
2. Qué archivos has modificado.
3. Qué funcionalidades has añadido o mejorado.
4. Qué pruebas has ejecutado y sus resultados.
5. Qué queda pendiente.
6. Qué bloque vas a abordar después.

---

## 7. OBJETIVO FINAL

No quiero simplemente añadir funcionalidades a Ciberan.

Quiero construir un producto sólido, intuitivo, profesional y visualmente consistente que pueda crecer sin tener que rehacer su arquitectura cada pocos meses.

**Empieza ahora.**

Primero realiza la auditoría completa del estado actual de Ciberan. Después, presenta las conclusiones y el plan priorizado. A continuación, empieza a implementar el primer bloque de trabajo seguro y autorizado.

No te quedes en la planificación: quiero avances reales en el repositorio, código funcional y mejoras verificadas.

La calidad del producto, la estabilidad y la coherencia visual tienen prioridad sobre la velocidad de añadir funcionalidades.