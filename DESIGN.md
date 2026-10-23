# FEEDMA — Rediseño funcional y visual de Descubrir

Quiero rediseñar la sección Descubrir de FEEDMA tomando como referencia la captura que adjunto.

La captura es una referencia visual, no una especificación exacta del comportamiento actual. En particular, no debes asumir que la barra lateral se desplaza como parece en la imagen: inspecciona el comportamiento real de la página y de su layout antes de hacer cambios.

FEEDMA conecta creadores de contenido con marcas y empresas para facilitar el descubrimiento mutuo y las colaboraciones.

El objetivo es convertir Descubrir en una sección visualmente atractiva, profesional, intuitiva y funcional, manteniendo la identidad visual de FEEDMA y utilizando los datos y operaciones reales que ya existen.

## 1. Auditoría antes de implementar

Inspecciona las páginas actuales de Descubrir para creadores y marcas, sus componentes, composables, consultas, endpoints y flujos de interacción.

Identifica cómo funcionan realmente:

- La búsqueda por texto.
- La búsqueda con filtros.
- El modo de búsqueda con IA.
- Los perfiles destacados.
- Los filtros por categorías y otros criterios.
- Los perfiles guardados o favoritos.
- La acción de proponer una colaboración.
- La navegación a los perfiles.
- La paginación o carga progresiva, si existe.
- Los estados de carga, error y ausencia de resultados.

Comprueba también si las funcionalidades anteriores están terminadas, parcialmente implementadas o son únicamente visuales.

Antes de empezar a programar, presenta un resumen breve de lo que vas a conservar, mejorar y descartar. Después, implementa los cambios en el código real.

## 2. Objetivo visual

Quiero conservar los aspectos positivos de la referencia:

- Navegación lateral oscura e identidad reconocible de FEEDMA.
- Fondo claro, con tonos neutros y acentos morados.
- Tarjetas con bordes sutiles, radios amplios y espaciado consistente.
- Tipografía legible y jerarquía visual clara.
- Imágenes de perfil o marca que ayuden a reconocer cada resultado.
- Botones y controles con estados visuales claros.

Pero no quiero copiar literalmente la distribución actual.

Aprovecha el ancho útil de la página, evita que todo el contenido quede concentrado a la izquierda con un gran vacío a la derecha y crea una composición equilibrada que se adapte al espacio disponible.

Utiliza los tokens y componentes visuales existentes de FEEDMA. No introduzcas otra identidad visual ni sombras, colores o radios arbitrarios.

## 3. Estructura de la página

### A. Cabecera de Descubrir

Crea una cabecera compacta que explique claramente qué puede hacer el usuario.

Para creadores, orienta el contenido a encontrar marcas y oportunidades de colaboración.

Para marcas, orienta el contenido a encontrar creadores adecuados para sus campañas.

Incluye la búsqueda principal en una posición visible y accesible. Reutiliza la cabecera global existente, sin duplicar innecesariamente el buscador, las notificaciones o el avatar.

### B. Búsqueda y modos

Revisa la organización actual de los controles «Filtros», «Buscar con IA» y «Guardados».

Quiero que cada opción tenga una finalidad clara y que no parezcan botones redundantes.

- **Búsqueda por texto:** debe permitir buscar perfiles con el comportamiento que el backend ya soporte.
- **Filtros:** deben permitir afinar los resultados con criterios reales.
- **Buscar con IA:** conserva el modo actual si funciona. Explica claramente qué hace y muestra sus estados de carga, error y resultado. No lo presentes como inteligencia artificial si la operación no utiliza realmente IA.
- **Guardados:** debe mostrar los perfiles guardados por el usuario y permitir acceder a ellos. Si ya existe un sistema de favoritos, reutilízalo.

No cambies de modo ni borres accidentalmente la búsqueda o los filtros aplicados.

Si la funcionalidad de una opción todavía no existe o no es fiable, no simules que funciona: mantenla desactivada con una explicación clara o documenta la limitación.

### C. Filtros útiles

Mejora la presentación de los filtros que realmente existan en el proyecto.

Cuando sea pertinente, considera categorías, sector, presupuesto y otros criterios que ya admita la búsqueda actual.

Los filtros deben ser fáciles de entender, mostrar cuáles están activos y permitir eliminarlos individualmente o restablecerlos.

Evita añadir filtros decorativos que no modifiquen realmente los resultados.

En escritorio, valora si conviene utilizar una barra compacta de filtros o un panel lateral. En móvil, los filtros avanzados pueden abrirse en una hoja o panel adecuado a la interfaz existente.

### D. Perfiles destacados

Revisa el bloque de perfiles destacados de la parte superior.

Quiero que tenga presencia visual, pero que no consuma tanto espacio que dificulte explorar el resto de los resultados.

Utiliza una cuadrícula adaptable con tarjetas de tamaño consistente y una jerarquía visual cuidada.

Cada tarjeta debe mostrar, únicamente cuando los datos estén disponibles:

- Imagen real del perfil o marca.
- Nombre.
- Categorías relevantes.
- Descripción breve.
- Información útil para valorar la afinidad o la oportunidad.
- Botón para guardar.
- Acceso al perfil y, cuando corresponda, a proponer una colaboración.

Evita duplicar los mismos perfiles en destacados y resultados generales, salvo que exista una razón de producto clara.

No inventes imágenes, presupuestos, métricas, categorías ni recomendaciones personalizadas.

### E. Listado de resultados

Rediseña el listado para que resulte fácil comparar perfiles sin tener que abrir cada uno.

Utiliza un diseño coherente con las tarjetas destacadas, pero más compacto cuando corresponda.

Aprovecha el espacio disponible en escritorio y adapta la presentación a tablet y móvil.

Si existe suficiente información real, muestra datos que ayuden a tomar una decisión. Si un dato no existe, omite ese elemento en lugar de mostrar valores ficticios.

Incluye estados claros para:

- Carga inicial.
- Actualización de resultados.
- Búsqueda sin coincidencias.
- Error de consulta.
- Ausencia de perfiles guardados.
- Resultados adicionales, si la paginación o carga progresiva ya está soportada.

Si existe paginación, scroll infinito o carga progresiva, conserva su funcionamiento correcto. No cargues todos los perfiles de golpe ni introduzcas consultas sin límites.

### F. Guardados y favoritos

Revisa el comportamiento real del sistema de guardados.

El estado visual del botón debe corresponder al estado real del perfil.

Evita duplicar guardados, muestra confirmación cuando corresponda y conserva los cambios al navegar o recargar, de acuerdo con el mecanismo existente.

Si se produce un error, no muestres un éxito ficticio ni dejes el botón en un estado incorrecto.

### G. Proponer una colaboración

La acción «Proponer» es importante para el producto y debe ser clara.

Revisa el flujo actual antes de modificarlo.

- El botón debe abrir el proceso real de propuesta existente.
- La tarjeta no debe enviar una propuesta accidentalmente al navegar por ella.
- El usuario debe poder distinguir entre abrir un perfil y proponer una colaboración.
- Muestra estados de carga, éxito y error según el resultado real.
- Evita envíos duplicados mientras una operación está en curso.
- Respeta los permisos y validaciones actuales del servidor.

No crees un flujo alternativo que evite las comprobaciones existentes ni cambies el modelo de colaboración sin justificarlo.

## 4. Diferenciar creadores y marcas

Descubrir debe adaptarse al rol actual.

**Para creadores:** prioriza encontrar marcas relevantes y comprender qué tipo de colaboraciones podrían encajar.

**Para marcas:** prioriza encontrar creadores y comparar sus perfiles con criterios útiles para las campañas.

Reutiliza componentes comunes cuando tenga sentido, pero evita que ambas vistas sean idénticas con solo cambiar los textos.

Respeta los datos disponibles para cada rol y no muestres información privada que no corresponda.

## 5. Navegación, scroll y responsive

Inspecciona el comportamiento real de la navegación lateral, la cabecera y el contenido al desplazarse.

No modifiques `SideRail`, `TopBar`, `BottomTabBar` ni `AppShell` salvo que encuentres un defecto directamente relacionado con Descubrir y lo documentes antes de actuar.

La navegación no debe desplazarse accidentalmente con una lista larga si su comportamiento previsto es permanecer fija. Evita también contenedores con scroll anidado innecesario.

En escritorio:
- Aprovecha el ancho disponible.
- Mantén los filtros accesibles.
- Evita grandes zonas vacías.
- Conserva una jerarquía visual clara.

En móvil:
- Evita tarjetas excesivamente anchas o altas.
- Mantén visibles las acciones principales.
- Facilita el acceso a filtros y búsqueda.
- Evita desbordamientos horizontales.
- Respeta la navegación móvil que ya existe.

## 6. Rendimiento y seguridad

- Reutiliza los composables, componentes y endpoints existentes cuando sean adecuados.
- Evita llamadas duplicadas y búsquedas innecesarias en cada renderizado.
- Cancela o ignora respuestas obsoletas cuando el usuario cambie rápidamente de búsqueda, si el patrón existente lo permite.
- Limita los resultados y conserva la paginación existente.
- Gestiona correctamente los estados de carga, error y ausencia de datos.
- Evita problemas de hidratación entre el renderizado del servidor y el cliente.
- No expongas datos privados de perfiles.
- No debilites políticas RLS, permisos, validaciones ni protecciones del servidor.
- No introduzcas datos de prueba en la experiencia normal de los usuarios.
- No añadas nuevas dependencias si no son necesarias.

## 7. Alcance

Prioriza la experiencia de Descubrir y sus componentes directamente relacionados.

No modifiques el servidor, las migraciones, las políticas RLS ni el sistema global de navegación para resolver problemas ajenos al rediseño.

Si descubres una limitación del backend que impide una mejora, documéntala en lugar de improvisar una solución que pueda comprometer la seguridad o ampliar el alcance.

## 8. Verificación

Después de implementar:

1. Ejecuta `npx vue-tsc --noEmit`.
2. Ejecuta `npm test -- --run`.
3. Ejecuta `npm run build`.
4. Comprueba las vistas de Descubrir para ambos roles.
5. Verifica búsqueda, filtros, guardados y propuesta de colaboración con las operaciones que realmente estén disponibles.
6. Comprueba carga, errores y ausencia de resultados.
7. Revisa los enlaces, estados de botones y posibles consultas duplicadas.
8. Revisa escritorio y móvil si dispones de herramientas para comprobarlo.

No afirmes haber probado interacciones o responsive visualmente si no has podido hacerlo.

## 9. Resultado esperado

Implementa el rediseño en el proyecto real de FEEDMA.

Al finalizar, resume:

- Qué ha cambiado visualmente.
- Qué ha mejorado funcionalmente.
- Qué componentes y operaciones existentes has reutilizado.
- Qué limitaciones siguen pendientes.
- Qué pruebas se han ejecutado realmente.
- Qué comprobaciones visuales o de interacción no se han podido realizar.

La prioridad es conseguir una experiencia de descubrimiento clara, atractiva y profesional que ayude a los usuarios a encontrar perfiles relevantes y avanzar hacia colaboraciones reales, sin añadir complejidad innecesaria ni presentar funcionalidades ficticias como si estuvieran terminadas.



## 1.1. Revisión específica del descubrimiento y la relevancia de los resultados

Antes de rediseñar las tarjetas, quiero que revises especialmente dos aspectos que son fundamentales para que Descubrir resulte útil: **cómo se seleccionan los perfiles destacados y cómo funciona la búsqueda cuando no hay texto introducido**.

No quiero crear un algoritmo nuevo desde cero si el proyecto ya dispone de un sistema que puede mejorarse.

### A. Perfiles destacados

Inspecciona cómo se obtienen actualmente los perfiles que aparecen en «Destacados para ti» y determina:

- Si proceden de datos reales o de contenido de demostración.
- Qué consulta, endpoint o composable los proporciona.
- Qué criterio determina el orden de los resultados.
- Si se excluye al usuario actual cuando corresponda.
- Si se evita mostrar perfiles duplicados entre destacados y el listado general.
- Si los resultados respetan el rol y los permisos del usuario.
- Si las imágenes, categorías, descripciones y presupuestos mostrados corresponden realmente a cada perfil.
- Qué ocurre cuando hay pocos perfiles disponibles o no hay ninguno.

Si la selección actual es arbitraria, repetitiva o poco relevante, mejora el criterio utilizando los datos reales que ya existen en FEEDMA.

Prioriza criterios sencillos, explicables y fiables. Por ejemplo, puedes aprovechar las categorías y preferencias disponibles, la información del perfil y los filtros existentes, siempre que esos datos estén realmente disponibles.

No presentes los resultados como recomendaciones personalizadas por IA si no se ha ejecutado un sistema de IA que las genere. Tampoco inventes puntuaciones de afinidad, popularidad o rendimiento.

Si no hay información suficiente para personalizar los destacados, muestra perfiles reales de forma coherente y utiliza un título neutral, sin prometer una personalización inexistente.

### B. Búsqueda sin texto

Inspecciona el comportamiento de `useDiscover().search('filters', '', {...})` y del endpoint existente que utiliza.

Comprueba qué sucede cuando el usuario pulsa Buscar sin escribir ningún término:

- Si devuelve perfiles reales y relevantes.
- Si aplica correctamente los filtros seleccionados.
- Si el orden de los resultados es estable y razonable.
- Si devuelve resultados duplicados.
- Si realiza consultas innecesarias.
- Si carga más resultados de los que la interfaz necesita.
- Si el resultado cambia de forma inesperada al cambiar de página o volver a Descubrir.
- Si los estados de carga, error y ausencia de resultados funcionan correctamente.

Mejora el comportamiento existente para que una búsqueda sin texto sea útil como modo de exploración general, respetando los filtros activos y los límites de resultados que soporte el sistema.

Si ya existe un mecanismo de ordenación adecuado, reutilízalo. Si no existe, no introduzcas un sistema complejo de ranking sin necesidad: prioriza un orden estable y razonable basado en los datos disponibles.

Evita realizar una nueva búsqueda en cada renderizado o repetir la misma consulta innecesariamente. Si el usuario cambia rápidamente los filtros o el texto, evita que una respuesta antigua sobrescriba resultados más recientes cuando sea posible con la arquitectura actual.

### C. Relación entre destacados, búsqueda y guardados

Comprueba que los tres elementos se comportan de forma coherente:

- Los destacados no deben presentar perfiles ficticios ni información desactualizada.
- Los filtros deben afectar a los resultados de búsqueda, no ser únicamente decorativos.
- Los guardados deben reflejar el estado real del usuario.
- Un perfil guardado debe seguir apareciendo como guardado al volver a la página, de acuerdo con el mecanismo existente.
- Los cambios de modo entre filtros, búsqueda con IA y guardados no deben borrar información del usuario de forma inesperada.

No es necesario que los perfiles destacados y el listado general utilicen exactamente el mismo criterio de ordenación, pero la diferencia debe tener sentido y no provocar duplicaciones innecesarias.

### D. Alcance de las mejoras

Haz primero el diagnóstico y después corrige los problemas que puedas resolver con los componentes, composables y endpoints existentes.

No crees un endpoint nuevo, no modifiques migraciones ni políticas RLS y no añadas nuevas dependencias para este trabajo.

Si una mejora requiere cambios de backend, un nuevo modelo de datos o información que actualmente no existe, documenta esa limitación y propone la solución por separado. No amplíes el alcance sin justificarlo.

Al terminar, explica brevemente qué criterio utilizaba el sistema antes, qué has cambiado y cómo has comprobado que los resultados proceden de datos reales.