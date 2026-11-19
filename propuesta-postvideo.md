CIBERAN --- Propuesta de mejora del flujo de colaboraciones
Documento de análisis y planificación para Claude Code
Alcance: experiencia de colaboración entre creadores y partners,
desde la negociación hasta el cierre operativo.
Modo de trabajo inicial: auditoría y propuesta. No implementar hasta
recibir aprobación.
1. Contexto y objetivo
CIBERAN es un marketplace que conecta creadores de contenido con marcas y
empresas (partners). El flujo actual permite descubrir perfiles,
iniciar conversaciones, negociar ofertas y contraofertas, aceptar una
propuesta, generar una colaboración y vincular publicaciones para
gestionar su producción y revisión.

La base del recorrido tiene sentido y no se pretende reconstruirla desde
cero. El objetivo es evolucionarla para que cada colaboración sea un
espacio profesional de trabajo en el que ambas partes puedan consultar
con claridad:
- Qué han acordado.
- Qué tiene que entregar cada parte.
- Cuándo debe hacerlo.
- En qué estado está cada entregable.
- Qué contenido está pendiente de revisión.
- Qué cambios se han solicitado y cuáles se han aprobado.
- Qué actividad ha ocurrido y cuándo.
- Cómo acceder rápidamente a la conversación relacionada.
Principio de producto: una colaboración debe tener condiciones
claras, seguimiento, entregables, revisión y cierre operativo. No debe
ser únicamente una tarjeta con un precio y un estado.

Este documento recoge oportunidades de mejora detectadas al revisar la
demostración guiada del flujo. Son hipótesis y propuestas que Claude
debe contrastar con la implementación real antes de recomendar cambios.
2. Límites del alcance
Incluido
- Auditoría del flujo de ofertas y contraofertas, sin rediseñar su
  lógica si ya funciona correctamente.
- Ficha de acuerdo y brief de campaña.
- Gestión de entregables.
- Estados y transiciones de ofertas, colaboraciones y publicaciones.
- Vinculación entre colaboraciones y publicaciones.
- Revisión y aprobación de contenido.
- Detalle de colaboración como centro de gestión.
- Historial de actividad.
- Notificaciones y accesos directos.
- Calendario y fechas límite.
- Valoraciones y reputación.
- UX de las vistas de creador y partner.
- Integridad, autorización, RLS, concurrencia y pruebas de las
  funcionalidades incluidas.
Fuera del alcance: pagos y Stripe
La implementación y evolución del sistema de pagos corresponde a otro
compañero.

Por tanto:
- No modificar Stripe, Stripe Connect, webhooks, transferencias,
  comisiones, balances ni lógica económica.
- No implementar escrow, retención de fondos, liberación de fondos ni
  ningún mecanismo de pago protegido.
- No cambiar el momento en que se cobra o se transfiere el dinero.
- No modificar RPC, tablas o endpoints económicos salvo que sea
  estrictamente imprescindible para comprender una dependencia. En ese
  caso, documentarla y solicitar coordinación antes de tocarla.
- No presentar propuestas de retención de dinero como parte de este
  trabajo.
Sí se puede auditar de forma superficial qué información de pago muestra
actualmente la interfaz para detectar textos confusos, pero cualquier
cambio que afecte al comportamiento económico queda fuera del alcance y
debe coordinarse con el responsable de pagos.

El estado de pago existente puede mostrarse si ya está disponible y es
fiable, pero no se debe alterar su lógica.
3. Auditoría previa obligatoria
Antes de proponer cambios, inspecciona la implementación real. No te
bases únicamente en nombres de archivos, documentación antigua o
descripciones previas.

Recorre el flujo completo:
1. Descubrimiento del creador y consulta de sus paquetes.
2. Inicio o reutilización del chat entre los dos perfiles.
3. Envío de oferta.
4. Contraoferta, rechazo y aceptación.
5. Creación de la colaboración a partir de la oferta aceptada.
6. Acceso a la colaboración desde ambas partes.
7. Creación y vinculación de publicaciones.
8. Producción y envío a revisión.
9. Solicitud de cambios.
10. Reenvío y aprobación.
11. Finalización operativa.
12. Valoraciones mutuas.
Revisa, cuando corresponda:
- Páginas y rutas.
- Componentes y modales.
- Composables y stores.
- Tablas, relaciones, constraints e índices.
- Migraciones y RPC.
- Endpoints y funciones de servidor.
- Políticas RLS y permisos.
- Notificaciones.
- Integración con calendario.
- Tests unitarios, de integración y E2E.
- Estados vacíos, errores y casos límite.
Para cada punto, clasifica el resultado como:
- Correcto: funciona y está respaldado por la implementación y
  pruebas.
- Parcial: existe, pero tiene limitaciones o inconsistencias.
- Ausente: no existe.
- No verificado: no hay evidencia suficiente para afirmarlo.
No confundas una mejora estética con un defecto funcional. No propongas
duplicar capacidades que ya estén resueltas correctamente.
4. Áreas de mejora
4.1. Ficha de acuerdo y brief de campaña
Problema observado

En la demostración, el detalle de una colaboración puede indicar que no
se especificaron el objetivo, el público o el tono de la propuesta. Esto
deja demasiado margen a interpretaciones: ambas partes pueden haber
acordado un precio, pero no tener suficientemente documentado qué
resultado esperan.

Propuesta

Estudiar una ficha de acuerdo asociada a la colaboración que consolide
las condiciones aceptadas. Como mínimo, evaluar estos campos:

  Campo                   Ejemplo
  Objetivo de campaña     Dar a conocer una nueva colección
Público objetivo        Jóvenes de 18 a 30 años
Mensaje principal       Moda sostenible
Entregables             2 reels y 4 stories
Menciones               @marca
Hashtags                #Marca
Fecha o fechas límite   9 de noviembre
Requisitos especiales   Incluir un código promocional
Derechos de uso         Canales, duración y alcance acordados

No todos los campos tienen que ser obligatorios para iniciar una
conversación. Hay que decidir qué información debe estar disponible
antes de aceptar la oferta y qué información puede completarse después.

Comportamiento esperado
- La ficha debe reflejar las condiciones realmente acordadas, no la
  última propuesta enviada ni datos que hayan quedado obsoletos.
- Debe quedar claro qué información procede del paquete, qué procede
  de la oferta y qué se ha completado como brief.
- Una vez aceptado el acuerdo, los cambios relevantes no deben
  sobrescribir silenciosamente las condiciones originales.
- Si se permite modificar condiciones después de la aceptación,
  estudiar un mecanismo explícito de modificación o adenda, con autor,
  fecha y trazabilidad.
- Ambas partes deben poder consultar la misma versión vigente.
- Si faltan datos, mostrar un estado vacío útil y explicar qué
  información convendría completar.
Importante: no dupliques datos que ya estén correctamente modelados.
Primero identifica la fuente de verdad de cada campo.
4.2. Entregables y progreso de la colaboración
Problema observado

Una colaboración puede incluir varios entregables. Aprobar una
publicación no significa necesariamente que se haya completado todo el
trabajo acordado.

Propuesta

Estudiar un modelo de entregables vinculados a la colaboración. Cada
entregable debería poder seguirse individualmente.

Información a evaluar:
- Nombre o tipo de entregable.
- Descripción y requisitos.
- Plataforma o canal.
- Fecha límite.
- Publicación asociada, si existe.
- Estado individual.
- Fecha de envío a revisión.
- Fecha de aprobación.
- Comentarios o incidencias relevantes.
Ejemplo:

  Entregable             Fecha límite   Estado
  Reel de presentación   5 nov.         Aprobado
Reel de producto       8 nov.         En revisión
4 stories              9 nov.         Pendiente

Comportamiento esperado
- Una colaboración puede tener uno o varios entregables.
- Cada entregable debe tener su propio progreso.
- Un entregable puede vincularse a una publicación existente o a una
  publicación creada específicamente para esa colaboración.
- Debe poder distinguirse entre contenido todavía no creado, contenido
  en producción, contenido enviado a revisión, contenido con cambios
  solicitados y contenido aprobado.
- El progreso general debe derivarse de los entregables y sus estados
  reales, no de un porcentaje introducido manualmente.
- La colaboración no debe marcarse como completada solo porque se
  apruebe uno de sus entregables.
- Hay que contemplar cancelaciones, entregables retirados o cambios de
  alcance sin perder el historial.
Integración con CIBERAN Studio

Aprovecha el sistema de publicaciones y el tablero existente. No crees
un segundo gestor de tareas paralelo si el modelo actual puede ampliarse
de forma coherente.
4.3. Estados y transiciones
Problema observado

Ofertas, colaboraciones y publicaciones representan partes distintas del
proceso. Si sus estados no están bien coordinados, pueden aparecer
contradicciones: por ejemplo, una colaboración completada con
entregables pendientes o una publicación aprobada cuando todavía hay
cambios solicitados.

Propuesta

Auditar primero todos los estados actuales y dibujar sus transiciones
reales. Después, proponer una máquina de estados coherente para cada
entidad.

Como referencia conceptual ---no como lista de estados que haya que
implementar literalmente---, estudiar:

Oferta - Pendiente de respuesta. - Contraoferta recibida. -
Aceptada. - Rechazada. - Retirada o caducada, si el producto contempla
esos casos.

Publicación / entregable - Pendiente de producción. - En
producción. - En revisión. - Cambios solicitados. - Aprobado.

Colaboración - Acordada. - En curso. - Pendiente de completar
entregables. - Completada. - Cancelada o en disputa, únicamente si
existe una política de producto definida.

No añadas estados redundantes. Si las entidades actuales ya representan
correctamente una situación, conserva el modelo y mejora su
presentación.

Reglas que deben quedar definidas
- Qué acción provoca cada transición.
- Qué rol puede ejecutarla.
- Qué condiciones deben cumplirse.
- Qué ocurre si dos usuarios intentan cambiar el estado
  simultáneamente.
- Qué notificaciones se generan.
- Qué registros históricos se crean.
- Qué transiciones están prohibidas.
- Qué ocurre ante errores parciales.
Diferencia expresamente:
1. Aprobación de contenido: un entregable cumple los requisitos.
2. Finalización operativa: todos los compromisos de la colaboración
   se han completado según las reglas acordadas.
No permitas que una acción de aprobación de una publicación finalice
automáticamente toda la colaboración si quedan entregables pendientes.
4.4. Detalle de colaboración como centro de gestión
Problema observado

La vista de detalle puede aprovechar mejor el espacio y ofrecer más
información útil. No debería limitarse a mostrar nombre, precio y
estado.

Propuesta de estructura

Diseña una vista que priorice la información según lo que el usuario
necesita hacer en ese momento.

Bloques a evaluar:
1. Cabecera
   - Nombre de la colaboración.
   - Identidad de la otra parte.
   - Estado actual.
   - Precio acordado, si ya existe en el modelo.
   - Acceso directo al chat.
2. Resumen del acuerdo
   - Objetivo.
   - Brief.
   - Paquete.
   - Condiciones.
   - Fechas principales.
3. Progreso
   - Entregables completados respecto al total.
   - Próximo hito.
   - Próxima fecha límite.
   - Elementos que requieren atención.
4. Entregables
   - Lista o tablero de entregables.
   - Estado individual.
   - Acceso a la publicación vinculada.
   - Acciones disponibles según el rol y el estado.
5. Revisiones
   - Contenido pendiente de revisión.
   - Comentarios y cambios solicitados.
   - Historial de decisiones.
6. Actividad
   - Cronología de eventos relevantes.
7. Información complementaria
   - Datos de pago ya existentes, solo en modo informativo y sin
     cambiar su funcionamiento.
   - Valoraciones cuando corresponda.
UX
- Aprovecha el ancho disponible y evita grandes zonas vacías.
- Prioriza las acciones pendientes sobre la información secundaria.
- Evita repetir la misma información en varias tarjetas.
- Mantén una jerarquía visual clara.
- Adapta las acciones a los permisos del creador y del partner.
- Diseña estados vacíos, carga, error y ausencia de permisos.
- Mantén la navegación sencilla entre colaboración, publicación y
  chat.
No copies un dashboard genérico. La interfaz debe responder a las
necesidades específicas de CIBERAN.
4.5. Historial de actividad y trazabilidad
Objetivo

Que ambas partes puedan entender qué ha sucedido en una colaboración sin
tener que reconstruirlo leyendo todo el chat.

Estudia una cronología con eventos como:
- Oferta enviada.
- Contraoferta enviada.
- Oferta aceptada.
- Colaboración creada.
- Brief completado o modificado.
- Entregable creado o actualizado.
- Publicación vinculada.
- Contenido enviado a revisión.
- Cambios solicitados.
- Nueva versión enviada.
- Contenido aprobado.
- Colaboración completada o cancelada.
Cada evento debería registrar, cuando corresponda:
- Tipo de evento.
- Autor o actor.
- Fecha y hora.
- Entidad afectada.
- Información necesaria para entender el cambio.
Requisitos
- No inventar eventos a partir del estado actual.
- No depender exclusivamente de mensajes de chat para reconstruir el
  historial.
- No permitir que una modificación actual borre la evidencia de una
  condición anterior.
- Aplicar permisos para que cada participante vea únicamente la
  información autorizada.
- Evitar registrar información sensible innecesaria.
4.6. Revisiones y aprobaciones
Lo que ya funciona como concepto

El flujo de solicitud de cambios mediante un comentario concreto es una
buena base. Debe conservarse y conectarse con los entregables.

Mejoras a estudiar
- Mostrar claramente qué entregable se está revisando.
- Asociar cada solicitud de cambios a la versión o envío
  correspondiente.
- Conservar el comentario, autor y fecha.
- Permitir que el creador identifique rápidamente qué debe corregir.
- Diferenciar una revisión pendiente de una revisión resuelta.
- Mostrar el historial de revisiones sin sobrescribir comentarios
  anteriores.
- Evitar que una aprobación antigua se aplique accidentalmente a una
  versión nueva.
- Notificar a la parte correspondiente cuando se solicita un cambio,
  se reenvía contenido o se aprueba.
Si el sistema actual de post_revision_notes o equivalente ya cubre
parte de estas necesidades, reutilízalo y explica qué falta. No crees
otro historial paralelo.
4.7. Notificaciones y acciones pendientes
Revisa que las notificaciones acompañen a las transiciones importantes.

Ejemplos:
- El partner recibe una notificación cuando el creador envía un
  entregable a revisión.
- El creador recibe una notificación cuando se solicitan cambios.
- El partner recibe una notificación cuando el creador reenvía el
  contenido.
- Ambas partes reciben información cuando se completa una
  colaboración.
- Los avisos incluyen un enlace directo a la colaboración, publicación
  o revisión correspondiente.
Evita notificaciones duplicadas y comprueba la idempotencia de los
eventos que las generan.

Estudia también una sección de pendientes de acción en el detalle o
en la página de colaboraciones:
- Revisar contenido.
- Corregir entregable.
- Completar información del brief.
- Atender una fecha próxima.
No conviertas cada evento informativo en una notificación urgente.
4.8. Calendario y fechas límite
Revisa la integración actual con el calendario.

Quiero que las fechas de las colaboraciones tengan una relación clara
con los hitos y entregables:
- Fecha de inicio, si existe.
- Fechas límite de cada entregable.
- Fechas de revisión.
- Próximas publicaciones, cuando estén definidas.
Estudia cómo distinguir visualmente estos eventos y cómo navegar desde
un evento del calendario al entregable o colaboración correspondiente.

Evita duplicar eventos si ya existe una fuente de datos común.
4.9. Valoraciones y reputación
Propuesta

Revisar el sistema de valoraciones mutuas entre creadores y partners.

Estudiar si tiene sentido permitir una puntuación general acompañada de
categorías:
- Comunicación.
- Cumplimiento de plazos.
- Calidad del trabajo.
- Profesionalidad.
El comentario debería ser opcional.

Reglas a evaluar
- Solo pueden valorar los participantes legítimos de una colaboración.
- Una valoración debe estar vinculada a una colaboración real.
- Definir si cada participante puede valorar una sola vez.
- Evitar que una parte pueda condicionar su valoración a conocer o
  controlar la de la otra.
- Definir qué ocurre con colaboraciones canceladas o no completadas.
- Evitar valoraciones duplicadas por reintentos.
- Aplicar RLS y validación en servidor; no confiar únicamente en
  ocultar botones.
No añadas categorías por añadirlas: justifica su utilidad y evita que el
sistema se convierta en un formulario demasiado largo.
4.10. Claridad de textos y microinteracciones
Revisa los textos de la interfaz para que describan correctamente la
situación real.

Ejemplo detectado en la demostración:
- Texto actual: «Propuesta inicial (partner): 1.050 €».
- Texto más adecuado después de aceptar: «Precio acordado: 1.050 €».
Otros aspectos:
- Diferenciar oferta inicial, contraoferta y precio acordado.
- Explicar dónde se guardan las publicaciones creadas para una
  colaboración.
- Indicar claramente qué acción se espera del usuario.
- Usar mensajes de confirmación y error comprensibles.
- Evitar etiquetas ambiguas como «Completada» cuando solo se ha
  aprobado un entregable.
- Mantener consistencia entre los textos de chat, colaboración y
  publicación.
5. Requisitos técnicos y de calidad
Cualquier propuesta de implementación debe respetar estos requisitos:
Seguridad y autorización
- Comprobar que solo los participantes autorizados pueden consultar
  una colaboración.
- Validar en servidor quién puede modificar cada campo y ejecutar cada
  transición.
- Revisar RLS de todas las tablas afectadas.
- No confiar en el rol o el identificador enviado por el cliente.
- Revisar funciones SECURITY DEFINER, search_path y permisos de
  ejecución cuando se utilicen.
- No exponer datos privados de creadores o partners.
Integridad de datos
- Definir claramente la fuente de verdad de cada dato.
- Evitar duplicar brief, precio, fechas o entregables.
- Utilizar constraints e índices cuando aporten garantías reales.
- Mantener la coherencia entre colaboración, entregable y publicación.
- No sobrescribir acuerdos aceptados sin trazabilidad.
Concurrencia e idempotencia
- Proteger las transiciones frente a acciones simultáneas.
- Evitar duplicar colaboraciones, entregables, eventos o
  notificaciones por reintentos.
- Usar actualizaciones atómicas cuando una transición dependa del
  estado previo.
- Definir el comportamiento ante solicitudes repetidas.
Compatibilidad
- Analizar cómo tratar colaboraciones ya existentes.
- No asumir que los registros antiguos tienen brief o entregables
  estructurados.
- Diseñar valores por defecto y estados vacíos para datos históricos.
- No romper rutas, chats, ofertas ni publicaciones existentes.
- Si hace falta una migración, explicar su estrategia de
  compatibilidad y reversión.
Pruebas
Incluir pruebas relevantes para:
- Permisos de creador y partner.
- Acceso de usuarios ajenos a la colaboración.
- Aceptación y creación de colaboración.
- Relación entre colaboración y entregables.
- Vinculación con publicaciones.
- Transiciones válidas e inválidas.
- Solicitudes de revisión y aprobaciones.
- Varias revisiones del mismo entregable.
- Entregables múltiples.
- Finalización con entregables pendientes.
- Concurrencia.
- Idempotencia.
- Notificaciones.
- Datos históricos y estados vacíos.
No afirmes que algo está probado si no has ejecutado la prueba
correspondiente. Distingue entre tests escritos, tests ejecutados y
verificaciones manuales.
6. Diseño y experiencia de usuario
La evolución visual debe mantener la identidad de CIBERAN y aprovechar el
espacio disponible.

Criterios:
- Diseño profesional, limpio y cuidado.
- Uso intencional del ancho disponible.
- Jerarquía clara entre resumen, progreso y acciones.
- Menos tarjetas redundantes.
- Información contextual en lugar de bloques genéricos.
- Estados visuales inequívocos.
- Acciones principales visibles y secundarias discretas.
- Diseño responsive.
- Consistencia entre la experiencia del creador y la del partner,
  respetando sus diferentes permisos y necesidades.
No hagas cambios visuales masivos sin entender primero la arquitectura
de componentes existente. Reutiliza patrones cuando tenga sentido y
evita introducir variantes casi idénticas.
7. Pipeline de trabajo solicitado
No implementes todavía. Primero entrega una auditoría y un plan.

Organiza la propuesta en fases pequeñas, ordenadas por dependencias y
riesgo. Como orientación, puedes considerar esta secuencia, pero debes
modificarla si el análisis del código demuestra que otro orden es mejor:
Fase 0 --- Auditoría y diseño funcional
- Mapa del flujo actual.
- Modelo de datos y estados.
- Problemas confirmados.
- Decisiones de producto pendientes.
- Propuesta de UX y arquitectura.
Fase 1 --- Acuerdo y brief
- Definir la fuente de verdad.
- Completar la información del acuerdo.
- Resolver la compatibilidad con colaboraciones existentes.
Fase 2 --- Entregables y vínculo con Studio
- Modelar entregables si hace falta.
- Vincularlos con publicaciones.
- Definir progreso individual y global.
Fase 3 --- Estados y transiciones
- Formalizar reglas.
- Evitar estados contradictorios.
- Asegurar las transiciones en servidor.
Fase 4 --- Detalle de colaboración
- Convertirlo en centro de gestión.
- Mostrar acuerdo, progreso, entregables, revisiones e historial.
- Adaptar las acciones a cada rol.
Fase 5 --- Historial, notificaciones y calendario
- Trazabilidad.
- Acciones pendientes.
- Enlaces directos.
- Fechas e hitos.
Fase 6 --- Valoraciones y reputación
- Reglas de elegibilidad.
- Categorías y comentarios.
- Protección frente a duplicados o manipulaciones.
Fase 7 --- Pulido, pruebas y verificación
- UX responsive.
- Estados vacíos y errores.
- Regresión del flujo completo.
- Revisión de seguridad y documentación.
No es obligatorio mantener exactamente estas fases. Justifica el orden
definitivo y señala qué fases pueden agruparse o deben separarse.
8. Formato del resultado de auditoría
Entrega un documento Markdown con estas secciones:
1. Resumen ejecutivo: situación real del flujo.
2. Mapa del recorrido actual: desde el descubrimiento hasta el
   cierre.
3. Arquitectura existente: páginas, componentes, composables,
   tablas, RPC y endpoints relevantes.
4. Matriz de auditoría: correcto, parcial, ausente o no verificado.
5. Problemas confirmados: evidencia concreta y consecuencias.
6. Oportunidades de mejora: separadas de los defectos reales.
7. Propuesta de experiencia objetivo: recorrido de creador y
   partner.
8. Modelo funcional propuesto: acuerdo, entregables, estados e
   historial.
9. Pipeline de implementación: fases, dependencias y orden.
10. Plan de pruebas: por fase.
11. Riesgos y compatibilidad: especialmente datos existentes y
    seguridad.
12. Decisiones que necesitan mi aprobación: preguntas concretas, no
    decisiones asumidas.
Para cada fase incluye:
- Objetivo.
- Alcance exacto.
- Archivos y módulos previsiblemente afectados.
- Cambios de base de datos, si los hubiera.
- RPC o endpoints afectados.
- Tests necesarios.
- Dependencias.
- Riesgos.
- Criterios de aceptación.
- Qué queda expresamente fuera.
9. Instrucciones importantes
- No modifiques código, migraciones, base de datos ni configuración
  durante esta primera etapa.
- No apliques migraciones.
- No cambies el sistema de pagos ni Stripe.
- No reconstruyas funcionalidades que ya existen.
- No hagas refactors generales aprovechando el trabajo.
- No des por hecho que una propuesta de UX requiere cambios de
  backend.
- No inventes estados, tablas o funcionalidades y los presentes como
  existentes.
- No afirmes que has comprobado algo si no has podido verificarlo.
- Si hay decisiones de producto ambiguas, presenta alternativas y
  recomienda una con sus ventajas e inconvenientes.
- Si detectas dependencias con el trabajo de pagos de otro compañero,
  documenta el punto de integración y no lo modifiques.
El resultado de esta primera tarea debe ser exclusivamente una
auditoría y una propuesta de pipeline. Espera mi aprobación antes de
comenzar la implementación.
