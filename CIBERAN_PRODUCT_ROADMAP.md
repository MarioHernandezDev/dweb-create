# CIBERAN — Evolución del producto: de marketplace funcional a aplicación imprescindible

Quiero que trabajes sobre el proyecto existente CIBERAN para convertirlo en un producto excelente, útil, atractivo y capaz de generar usuarios recurrentes.

No quiero simplemente añadir funciones porque sí. Quiero que analices el producto desde la perspectiva de sus usuarios, identifiques las oportunidades con más valor y mejores la experiencia completa para que los creadores de contenido y las marcas quieran utilizar CIBERAN de forma habitual.

Te proporcionaré el documento técnico `CIBERAN — resumen técnico del proyecto.md`, que describe la arquitectura, las funcionalidades, el modelo de datos, la seguridad y las limitaciones conocidas. Úsalo como contexto inicial, pero contrasta siempre sus afirmaciones con el código actual.

## 1. OBJETIVO PRINCIPAL

CIBERAN es un marketplace de dos lados que conecta creadores de contenido con marcas y empresas.

Actualmente incluye:
- Directorios de creadores y partners con filtros y búsqueda con IA.
- Perfiles, paquetes de servicios y ofertas negociadas por chat.
- Solicitudes y colaboraciones con presupuestos y estados.
- Pagos mediante Stripe y Stripe Connect.
- Chat, notificaciones y solicitudes de colaboración.
- Tablero Kanban para gestionar publicaciones de los creadores.
- Predicción orientativa de la calidad y el éxito de borradores mediante heurísticas y un LLM.
- Suscripciones, créditos y herramientas administrativas.

La visión es que CIBERAN cubra el ciclo completo de una colaboración:

1. Encontrar a la persona adecuada.
2. Llegar a un acuerdo claro y seguro.
3. Ejecutar la colaboración sin fricciones.
4. Gestionar entregables, revisiones y plazos.
5. Completar el pago con transparencia.
6. Valorar la experiencia y volver a colaborar.

Quiero que CIBERAN no sea únicamente un lugar donde encontrar contactos, sino una herramienta que facilite el trabajo real entre marcas y creadores.

## 2. REGLAS ANTES DE EMPEZAR

Antes de implementar nada:

1. Inspecciona el repositorio, la estructura actual, los componentes, los composables, las migraciones, las pruebas y el estado de Git.
2. Identifica qué funcionalidades existen realmente, cuáles están completas y cuáles son todavía parciales o simuladas.
3. No sobrescribas ni elimines cambios existentes que no hayas realizado tú.
4. Respeta el stack actual: Nuxt 4, Vue 3, Tailwind CSS v4, Supabase, Nitro, Stripe y Vitest, salvo que exista una razón sólida para cambiar algo.
5. Reutiliza los componentes, patrones y servicios existentes cuando sea apropiado.
6. No dupliques funcionalidades ni crees tablas o dependencias sin necesidad.
7. No inventes datos, métricas, resultados de IA ni estados de éxito.
8. Mantén las reglas de RLS, las funciones SQL seguras y las validaciones del servidor. Ninguna mejora de UX debe debilitar la seguridad.
9. No alteres datos reales ni credenciales de producción sin autorización.
10. No conectes ni modifiques los flujos OAuth de redes sociales en esta fase. Esa área permanece expresamente fuera del alcance.
11. Mantén la identidad visual propia de CIBERAN, basada en la metáfora de la producción audiovisual, las fichas de rodaje, la claqueta y los tickets de precio. No conviertas la aplicación en otra plantilla SaaS genérica.
12. No declares terminada una función hasta haberla probado.

No quiero que te limites a darme una lista de ideas. Quiero un análisis serio, una estrategia priorizada y una implementación progresiva de las mejoras que tengan más sentido.

## 3. FASE INICIAL: AUDITORÍA DEL PRODUCTO ACTUAL

Analiza la aplicación desde tres perspectivas.

### Para los creadores

Investiga si pueden:
- Completar un perfil atractivo que transmita confianza.
- Mostrar claramente sus servicios, tarifas, nicho y experiencia.
- Encontrar marcas y oportunidades adecuadas.
- Contactar y negociar sin fricciones.
- Organizar su calendario editorial y sus publicaciones.
- Gestionar sus colaboraciones y entregables.
- Entender los pagos, sus estados y las cantidades que recibirán.
- Demostrar su profesionalidad y construir reputación.
- Encontrar motivos reales para volver a CIBERAN aunque no estén buscando una colaboración en ese momento.

### Para las marcas y partners

Investiga si pueden:
- Encontrar creadores adecuados para una campaña.
- Comparar perfiles con información suficiente y fiable.
- Guardar candidatos y organizar una selección.
- Contactar, negociar y cerrar acuerdos.
- Definir claramente el alcance de cada colaboración.
- Gestionar entregas, revisiones y fechas.
- Entender los costes y el estado de los pagos.
- Evaluar el resultado y volver a trabajar con creadores fiables.

### Para ambos roles

Revisa:
- Registro, onboarding y primera experiencia.
- Facilidad para completar el perfil.
- Claridad de las acciones principales.
- Estados vacíos, errores, mensajes de carga y confirmaciones.
- Navegación móvil y accesibilidad.
- Chat, notificaciones y tiempos de respuesta.
- Confianza, reputación y resolución de conflictos.
- Coherencia visual y funcional.
- Rendimiento y posibles problemas de escalabilidad.

Identifica los puntos donde los usuarios podrían confundirse, abandonar el proceso o no encontrar suficiente valor.

Distingue entre problemas observados en el código, problemas comprobados mediante pruebas e hipótesis que necesitan validación con usuarios.

## 4. SISTEMA DE CONFIANZA Y REPUTACIÓN

Quiero estudiar e implementar un sistema que ayude a elegir con quién colaborar y reduzca la incertidumbre.

Evalúa estas funcionalidades:

- Verificación de perfiles, diferenciando identidad, titularidad de cuentas y métricas verificadas.
- Valoraciones mutuas después de colaboraciones realmente completadas.
- Comentarios sobre comunicación, profesionalidad y cumplimiento de acuerdos.
- Historial de colaboraciones completadas.
- Indicadores de fiabilidad, como tiempos de respuesta o cumplimiento de plazos, solo cuando existan datos suficientes.
- Herramientas para denunciar fraude, suplantación, spam o incumplimientos.
- Mecanismos para resolver valoraciones abusivas, conflictos de intereses y reclamaciones.
- Protección contra reseñas falsas, manipuladas o coordinadas.

Las valoraciones deben estar vinculadas a colaboraciones auténticas. No permitas que alguien compre reputación ni que los usuarios nuevos queden automáticamente penalizados por carecer de historial.

No muestres porcentajes o puntuaciones sin datos suficientes. Explica qué significa cada indicador y cómo se calcula.

Diseña un MVP útil y mantenible, sin construir un sistema de moderación excesivamente complejo para la etapa actual del producto.

## 5. CIBERAN STUDIO: ESPACIO DE TRABAJO COMPARTIDO

Esta es una de las mejoras estratégicas más importantes.

Actualmente existen colaboraciones, publicaciones, chats y estados. Quiero estudiar cómo conectar esas piezas en un espacio de trabajo específico para cada colaboración.

Evalúa la incorporación de:

- Brief de campaña con objetivos, público, tono y requisitos.
- Entregables concretos, con formatos, cantidades y fechas.
- Calendario compartido.
- Checklist de tareas.
- Entrega de borradores y archivos.
- Solicitudes de cambios y revisiones.
- Aprobación explícita de entregables.
- Historial de cambios y comentarios.
- Condiciones pactadas: revisiones incluidas, exclusividad, derechos de uso y alcance.
- Seguimiento del progreso de la colaboración.
- Registro de incidencias y cambios acordados.

La experiencia debe ser sencilla para ambas partes. No quiero convertir CIBERAN en un gestor de proyectos complejo ni duplicar innecesariamente el tablero editorial del creador.

Antes de diseñar la solución, determina qué datos deben pertenecer a la colaboración y cuáles deben seguir perteneciendo a las publicaciones, las ofertas o los mensajes.

Implementa un modelo coherente que evite inconsistencias, duplicados y modificaciones no autorizadas.

## 6. CIBERAN MATCH: MEJORAR EL DESCUBRIMIENTO

Ya existe búsqueda normal y búsqueda con IA. No quiero otra interfaz de búsqueda sin valor añadido: quiero mejorar la calidad de los matches.

Evalúa:

- Compatibilidad entre nicho, público, objetivos, presupuesto y tipo de contenido.
- Preferencias de marca y del creador.
- Filtros más útiles y fáciles de combinar.
- Explicaciones de por qué un perfil encaja.
- Avisos de incompatibilidades importantes.
- Guardado de favoritos y listas de candidatos.
- Comparación de varios perfiles.
- Búsquedas guardadas.
- Notificaciones de nuevas oportunidades relevantes.
- Recomendaciones para creadores y para marcas.

La IA debe basarse en datos disponibles y relevantes. Diferencia datos verificados, información declarada por los usuarios e inferencias.

No inventes seguidores, engagement, audiencia, tarifas ni resultados de campañas. No presentes una puntuación de compatibilidad como si fuera una garantía de éxito.

Si faltan datos, indícalo. Si no hay un LLM disponible, ofrece una alternativa útil sin fingir que la IA ha funcionado.

Evita recomendaciones repetitivas y diseña mecanismos para que los usuarios puedan corregir sus preferencias.

## 7. PAGOS Y ACUERDOS TRANSPARENTES

Mejora la experiencia de pago existente sin reescribir innecesariamente la integración con Stripe.

Evalúa:
- Desglose del importe de la colaboración.
- Comisión de CIBERAN y cantidad que recibirá el creador.
- Estados claros del pago.
- Historial de pagos y colaboraciones.
- Recibos o justificantes disponibles cuando corresponda.
- Recordatorios de pagos y entregas pendientes.
- Gestión de errores, cancelaciones e incidencias.
- Acceso al acuerdo y a las condiciones aceptadas por ambas partes.

La cantidad que se cobra debe proceder del servidor y de los datos validados en la base de datos. El webhook de Stripe debe seguir siendo la fuente de verdad del pago completado.

No anuncies pagos instantáneos, custodia de fondos, protección de pagos ni garantías legales que la implementación actual no proporcione.

Comprueba también qué mecanismos de resolución de conflictos son viables y qué condiciones requerirían revisión legal antes de presentarlas como una garantía.

## 8. CIBERAN CREATOR: AUMENTAR EL VALOR DE USO RECURRENTE

Quiero que el creador encuentre utilidad en CIBERAN incluso cuando no está negociando una colaboración.

Evalúa mejoras en:
- Resumen diario con tareas y plazos próximos.
- Planificador semanal y calendario editorial.
- Ideas y borradores guardados.
- Plantillas reutilizables.
- Seguimiento de objetivos personales.
- Resumen semanal del trabajo realizado.
- Recordatorios configurables.
- Sugerencias de mejora de publicaciones.
- Biblioteca organizada de recursos y entregables.

Reutiliza el tablero y el sistema de publicaciones existentes.

Evita convertir el producto en una herramienta que genere notificaciones constantes o presione a los creadores para publicar más. El objetivo es ahorrar tiempo y reducir carga mental.

La predicción de éxito de los borradores debe seguir siendo honesta, explicar sus limitaciones y distinguir las heurísticas estructurales de cualquier análisis real del contenido.

## 9. CAMPAÑAS ABIERTAS PARA MARCAS

Actualmente el flujo descrito se centra en descubrir perfiles y contactar directamente.

Evalúa un segundo camino: que una marca publique una oportunidad y que los creadores adecuados puedan presentar su candidatura.

Considera:
- Descripción y objetivos de la campaña.
- Presupuesto y modalidad de compensación.
- Requisitos del creador.
- Entregables y plazos previstos.
- Fecha límite para presentar candidaturas.
- Estado de la campaña.
- Candidaturas recibidas.
- Selección de candidatos y paso a la negociación.
- Prevención del spam y de ofertas engañosas.

No crees un segundo sistema de negociación si se puede reutilizar el existente.

Antes de implementar, analiza cómo se relacionaría una campaña con los paquetes, las ofertas, las conversaciones y las colaboraciones actuales.

Si esta función tiene un coste elevado o necesita resolver antes el problema de conseguir suficientes marcas activas, propón una versión mínima o aplázala justificadamente.

## 10. RELACIONES RECURRENTES Y CRECIMIENTO

Quiero que CIBERAN facilite la repetición de colaboraciones satisfactorias.

Evalúa:
- Repetir una colaboración anterior.
- Crear una nueva propuesta a partir de un acuerdo existente.
- Guardar preferencias y condiciones habituales.
- Listas de colaboradores favoritos.
- Historial compartido de colaboraciones.
- Recordatorios de renovación o nuevas campañas.
- Recomendaciones basadas en experiencias anteriores.

Evita automatizar contactos sin consentimiento, enviar spam o utilizar datos privados para recomendaciones inadecuadas.

El crecimiento debe venir de mejorar las experiencias y facilitar relaciones profesionales duraderas.

## 11. NOTIFICACIONES Y EXPERIENCIA DIARIA

Revisa el sistema de notificaciones actual y prioriza su utilidad.

Distingue entre:
- Avisos importantes: nuevas ofertas, respuestas, pagos e incidencias.
- Recordatorios de plazos y entregas.
- Novedades y oportunidades recomendadas.
- Actividad secundaria.

Evalúa preferencias por tipo de aviso, agrupación, estados de leído/no leído y enlaces directos a la acción correspondiente.

Evita duplicados, mensajes excesivos y notificaciones sin contexto. Comprueba la coherencia entre notificaciones, chat y cambios de estado.

## 12. ONBOARDING Y PRIMERA COLABORACIÓN

La primera experiencia debe conducir al usuario hacia una acción útil, no limitarse a mostrar un dashboard vacío.

Analiza cómo ayudar a cada rol a:
- Completar los datos esenciales del perfil.
- Crear un primer paquete o una primera oferta de servicios.
- Definir presupuesto, nicho y preferencias.
- Entender cómo funciona CIBERAN.
- Encontrar perfiles adecuados.
- Enviar la primera propuesta o candidatura.
- Identificar el siguiente paso cuando todavía no hay resultados.

Utiliza estados vacíos con instrucciones concretas y llamadas a la acción claras.

No obligues a completar información innecesaria ni conviertas el onboarding en un formulario interminable. Permite descubrir el producto sin exigir que todo esté configurado desde el primer minuto.

## 13. ANALÍTICA DE PRODUCTO Y DECISIONES BASADAS EN DATOS

Quiero poder saber si CIBERAN está aportando valor y dónde se pierden los usuarios.

Evalúa cómo medir de forma respetuosa con la privacidad:

- Activación: usuarios que completan el perfil y realizan una primera acción útil.
- Tiempo hasta la primera oportunidad relevante.
- Conversión de contactos en ofertas aceptadas.
- Conversión de ofertas en colaboraciones completadas.
- Tiempo de respuesta y negociación.
- Retención a siete y treinta días.
- Porcentaje de colaboraciones repetidas.
- Incidencias, cancelaciones y reclamaciones.
- Equilibrio entre creadores y marcas activas.
- Uso de las principales funcionalidades.

Define eventos con nombres coherentes y evita recopilar información personal innecesaria, mensajes privados o contenido sensible para fines analíticos.

No inventes métricas históricas ni fijes objetivos arbitrarios sin una línea de base.

Propón un dashboard administrativo que permita comprender el comportamiento general del producto sin exponer innecesariamente información individual de los usuarios.

## 14. IDENTIDAD VISUAL Y CALIDAD DE EXPERIENCIA

La identidad de CIBERAN debe mantenerse reconocible y extenderse de forma consistente por toda la aplicación.

Revisa:
- Jerarquía visual.
- Tipografía y uso de cifras.
- Tarjetas, fichas de rodaje y tickets de precio.
- Colores y tokens.
- Espaciado y densidad de información.
- Navegación y acciones principales.
- Estados de carga, error, éxito y ausencia de datos.
- Formularios y confirmaciones.
- Diseño móvil y comportamiento responsive.
- Accesibilidad mediante teclado y lectores de pantalla.
- Contraste, foco visible y movimiento reducido.

No uniformes todas las pantallas convirtiéndolas en tarjetas idénticas. La coherencia debe convivir con componentes visuales adecuados a cada función.

Evita animaciones innecesarias, efectos decorativos que dificulten la lectura y rediseños masivos que no aporten valor.

Prioriza primero los puntos de fricción y las pantallas que más influyen en descubrir, negociar y completar una colaboración.

## 15. SEGURIDAD, FIABILIDAD Y DEUDA TÉCNICA

Las mejoras de producto no deben dejar de lado los riesgos técnicos ya identificados.

Comprueba el estado actual de:
- Flujo de Stripe Checkout de principio a fin.
- Idempotencia y concurrencia al aceptar ofertas.
- Integridad de colaboraciones y pagos.
- Rate limiting del panel de administración según la arquitectura de despliegue.
- Secretos de producción y variables de entorno.
- Paginación de consultas y listados.
- Pruebas de integración y regresión.
- Autorización en RLS, SQL y rutas Nitro.

Estas tareas deben considerarse dependencias importantes para un lanzamiento seguro. Si alguna sigue pendiente, inclúyela explícitamente en la hoja de ruta y no afirmes que CIBERAN está lista para producción.

Mantén las pruebas existentes y añade cobertura cuando haya un riesgo o un comportamiento importante que actualmente no se esté comprobando.

## 16. PRIORIZACIÓN: NO IMPLEMENTAR TODO DE GOLPE

Antes de modificar muchas partes de la aplicación, crea una matriz de prioridades que incluya:

- Problema del usuario.
- Perfil afectado: creador, partner o ambos.
- Solución propuesta.
- Valor esperado.
- Complejidad de implementación.
- Riesgos y dependencias.
- Cómo comprobar si la mejora funciona.

Prioriza según impacto en la confianza, primera colaboración, repetición de uso y esfuerzo.

Como hipótesis inicial, considera este orden:

**Fase A — Fundamentos**
- Cerrar los riesgos críticos de pagos y seguridad.
- Corregir los puntos de fricción importantes.
- Mejorar la claridad de perfiles, ofertas y estados.
- Medir el recorrido básico de los usuarios.

**Fase B — Confianza y conversión**
- Reputación vinculada a colaboraciones reales.
- Mejores perfiles y comparación de candidatos.
- Favoritos y listas de selección.
- Onboarding y primera acción útil.

**Fase C — Trabajo colaborativo**
- Espacio de trabajo por colaboración.
- Briefs, entregables, revisiones y calendario.
- Mejor gestión de incidencias y pagos.

**Fase D — Recurrencia y crecimiento**
- Colaboraciones repetidas.
- Campañas abiertas.
- Recomendaciones personalizadas.
- Mejoras del planificador y resúmenes útiles para creadores.

Este orden es orientativo, no una obligación. Si el análisis del código demuestra que otra mejora es más valiosa o que existen dependencias que cambian la prioridad, explica el motivo y adapta el plan.

## 17. VALIDACIÓN CON USUARIOS REALES

No asumas que todas las ideas son necesarias.

Prepara una pequeña guía de entrevistas para cinco creadores y cinco marcas, con preguntas que ayuden a descubrir:
- Cómo encuentran actualmente colaboradores.
- Qué les hace desconfiar.
- Qué partes del proceso consumen más tiempo.
- Qué problemas aparecen durante la negociación y la ejecución.
- Qué les haría volver a CIBERAN.
- Qué alternativa utilizan hoy y qué no quieren perder de ella.

No afirmes haber entrevistado a usuarios si no se ha hecho.

Si no hay acceso a usuarios reales, identifica las hipótesis pendientes de validación y prioriza experimentos sencillos para comprobarlas antes de invertir en funciones grandes.

## 18. FORMA DE EJECUTAR EL TRABAJO

Trabaja por incrementos pequeños y verificables.

Para cada mejora:
1. Explica brevemente el problema que resuelve.
2. Identifica los archivos y el modelo de datos afectados.
3. Implementa la solución más sencilla que cubra la necesidad.
4. Añade o actualiza las pruebas relevantes.
5. Ejecuta las pruebas, la comprobación de tipos y la compilación cuando corresponda.
6. Revisa los flujos afectados en navegador cuando sea posible.
7. Comprueba que no se hayan introducido errores de consola, problemas de navegación o regresiones móviles.
8. Informa de lo realizado y de cualquier limitación.

No hagas migraciones destructivas ni cambios incompatibles sin una justificación clara y un procedimiento seguro.

No añadas una dependencia importante para resolver algo que pueda solucionarse con la arquitectura existente.

No dediques todo el esfuerzo a preparar un documento estratégico y dejes el código intacto. Tampoco implementes de forma precipitada todas las ideas sin analizar sus consecuencias.

## 19. PRIMERA ENTREGA Y RESULTADO ESPERADO

Empieza con una auditoría del código y del producto actual.

Después, entrega:

1. Un diagnóstico de lo que CIBERAN hace bien y de sus principales puntos débiles.
2. Una lista de mejoras ordenadas por prioridad, impacto y esfuerzo.
3. Una separación clara entre funcionalidades existentes, mejoras propuestas e hipótesis que requieren validación.
4. Un plan por fases con dependencias y criterios de aceptación.
5. La selección de la primera mejora de alto impacto que tenga sentido implementar inmediatamente.
6. La implementación y validación de esa primera mejora, siempre que no exista un bloqueo importante.

Al terminar cada incremento, resume los cambios y las pruebas realizadas. Mantén un registro de qué queda pendiente para que el trabajo pueda continuar en futuras sesiones.

## 20. CRITERIO FINAL DE ÉXITO

El objetivo no es que CIBERAN tenga el máximo número de funciones.

El objetivo es que:
- Un creador pueda encontrar oportunidades relevantes y gestionar su trabajo con menos esfuerzo.
- Una marca pueda encontrar creadores adecuados y contratar con confianza.
- Ambas partes sepan exactamente qué han acordado y qué tienen que hacer.
- Las colaboraciones se ejecuten y paguen con claridad.
- Las experiencias positivas se conviertan en relaciones recurrentes.
- La aplicación sea rápida, accesible, coherente y fiable.
- Las decisiones sobre el producto se apoyen progresivamente en datos reales.

Quiero que tomes decisiones con criterio de producto, ingeniería y experiencia de usuario. Si una función no aporta suficiente valor, recomiéndame no construirla todavía.

Empieza inspeccionando el estado actual del repositorio. No elimines ni sobrescribas cambios previos y no des por hecho que el documento técnico está actualizado sin contrastarlo con el código.