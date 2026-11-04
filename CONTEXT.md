Traspaso técnico CIBERAN a Claude Code
23 oct 2026 · @Alex
Este documento resume la auditoría de usabilidad de CIBERAN del 23 de octubre de 2026 para continuar en Claude Code sin repetirla; en el código del proyecto no se ha cambiado ningún archivo todavía.
Estado actual
La auditoría está terminada y documentada, pero no se ha implementado ninguna mejora: todo lo que aparece como hallazgo o recomendación sigue pendiente.
Elemento
Estado
Auditoría de usabilidad (público, creador y partner)
Hecha el 23 de octubre de 2026, solo en formato móvil y en modo desarrollo
Cambios en el código del proyecto
Ninguno. No se tocó ningún archivo
Hallazgos
21 en el informe (#1 a #21) y 2 nuevos (N1 y N2) en este documento; todos abiertos
Recomendaciones
Propuestas; el desarrollador no ha aprobado ninguna una por una
Decisión cerrada
La fuente de los títulos no debe ser la del título CIBERAN (interpretado como los títulos de pantalla; el alcance exacto está por confirmar)
Decisiones abiertas
Fuente concreta y alcance del cambio, entorno de pruebas, definición de los contadores y futuro de las cuentas demo (ver Decisiones y preguntas abiertas)
Informe de referencia
"Informe de usabilidad CIBERAN", con la misma numeración #1 a #21
Contexto técnico
CIBERAN es una app Nuxt con Supabase en la nube y dos roles, creador y partner. Todo lo siguiente sale de inspeccionar el navegador y las peticiones de red; el código fuente no se ha leído.
Aspecto
Dato
Origen
Carpeta del proyecto
dweb-create (ruta vista en las peticiones de Vite: C:/Users/mexpl/Documents/dweb-create)
Observado
Framework
Nuxt en modo desarrollo en http://localhost:3000, con Vite y Nuxt DevTools
Observado
Backend
Módulo @nuxtjs/supabase; la URL de Supabase apunta a un proyecto alojado en la nube (está en runtimeConfig.public.supabase.url), no a uno local
Observado
Pagos
Existe stripePublishableKey en runtimeConfig.public; no se probó ningún flujo de pago
Observado
Otros módulos
@nuxt/image (proveedores unsplash, ipx e imgix), @nuxt/icon, GSAP con ScrollTrigger
Observado
Tipografía
Títulos h1 y h2: Snasm. Texto, botones y enlaces: Hanken Grotesk. Los nombres "Hanken Grotesk Fallback" sugieren @nuxt/fonts
Observado e inferido
API propia
POST /api/discover/search (búsqueda con IA de Descubrir)
Observado
Archivos vistos en las peticiones (no abiertos)
pages/onboarding.vue, pages/login.vue, components/ui/BaseCard.vue, components/ui/CoverImage.vue, components/landing/LandingFilmstrip.vue, components/landing/LandingFooter.vue, utils/status.ts, utils/images.ts
Observado
Composables vistos (no abiertos)
useAccountCache, useMyTrends, useMyCredits, useCollabRequests, useNotifications, useRatings, useSavedProfiles, usePostRevisions, useCollaborationLog, useMyProfileId, useGsap, useScrollReveal
Observado
Rutas vistas
Zona
Rutas
Público
/, /onboarding, /login
Creador
/creator (Hoy), /creator/timeline (Tablero), /creator/discover, /creator/requests (Colaboraciones), /creator/profile, /creator/socials (Redes), /creator/metrics, /creator/post/<id> (detalle de publicación; solo se vio el enlace, no se abrió)
Partner
/partner (Inicio), /partner/discover, /partner/requests, /partner/profile
Compartidas
/chat, /chat/<id>, /inbox, /favorites, /profile/creator/<id> (perfil público)
/partner/post/<id> devolvió 404, pero era una URL inventada durante la prueba, así que no prueba que falte una ruta.
Cuentas y navegación
• Cuentas demo del equipo, con acceso de un clic en /login: creator@feedma.test (perfil Nora Blake) y partner@feedma.test (Alma Beauty Co.). No se conocen ni se usaron sus contraseñas.
• Barra inferior del creador: Hoy, Tablero, Descubrir, Colaboraciones y Más (Redes, Métricas, Chat, Bandeja de entrada, Guardados, Ajustes).
• Barra inferior del partner: Inicio, Descubrir, Colaboraciones y Más.
• Cabecera de la app: buscar perfiles, chat con contador, bandeja con contador y avatar que lleva al perfil.
• La prueba se hizo con un viewport de entre 443 y 611 px de ancho, es decir, en formato móvil.
Cambios ya realizados
En el código no se ha cambiado nada. Las pruebas sí dejaron algunos efectos en los datos y en la sesión del entorno, que usa un Supabase compartido en la nube; conviene saberlo antes de interpretar contadores o limpiar datos.
Qué se hizo
Efecto y qué revisar
Código del proyecto
Ninguno. No se modificó ningún archivo, así que no hay nada que revertir
Permiso del navegador
El desarrollador autorizó al navegador integrado de Claude a usar http://localhost:3000; se puede retirar en los ajustes de la app de escritorio
Intento de alta de cuenta con datos inventados (prueba.claude@feedma.test)
Supabase lo rechazó por email inválido y no se creó ningún usuario. Dejó un error 400 en la consola
Inicios de sesión
Se entró como creador con el acceso demo antes de explorar, se cerró sesión con permiso expreso y se entró como partner con el acceso demo. Cada acceso generó un aviso "Has iniciado sesión" en la bandeja. La sesión quedó abierta como partner en el panel del navegador
Mensaje de chat enviado desde el partner a Nora Blake: "[prueba Claude] mensaje de prueba de usabilidad"
Sigue en la conversación /chat/9137e4d3-5514-49c8-af9a-ba2b687e2ece; no se borró
Apertura de ese chat como partner
El contador de 5 mensajes sin leer del partner desapareció, así que probablemente se marcaron como leídos
Una consulta de búsqueda con IA ("busco un creador de fitness con contenido técnico, presupuesto 200-500€")
Llamó a POST /api/discover/search; pudo consumir cuota del proveedor de IA, sin medir
Formulario "Ofertar: Reel de lanzamiento 7505" abierto con el precio vaciado, y formulario "Contactar a Paula Ibáñez" abierto y cerrado
No se observó ninguna oferta ni solicitud nuevas; el botón de enviar estaba desactivado en la oferta
Visita a una URL inventada (/partner/post/<id>)
Dejó un 404 en la consola
Documentos
Se crearon "Informe de usabilidad CIBERAN" y este traspaso, que viven en Claude y no en el repositorio
Borrados
Ninguno. No se eliminó ningún dato
Hallazgos de prioridad alta
Son hechos observados en el navegador, sin interpretación de causa. La columna de pistas son hipótesis a partir de nombres de archivo y no se han verificado en el código.
ID
Hallazgo
Evidencia concreta
Pista por dónde empezar
#1
Datos incoherentes entre las vistas de creador y partner
Creador, Hoy: 18 colaboraciones activas, 1 entrega próxima y "Entrega en 3 días: Rutina de skincare". Creador, Tablero: esa misma pieza está en Publicado (1) y las demás columnas están a 0. Partner, Inicio: 19 colaboraciones activas, 0 por revisar, 0 entregas próximas y calendario con "0% revisado" y "Aquí no hay ninguna publicación todavía"
utils/status.ts, useCollabRequests, usePostRevisions
#2
Bandeja de entrada saturada
Creador, /inbox: unas 12 entradas "Has iniciado sesión" y muchas "Nueva solicitud de colaboración" de Alma Beauty Co., mezcladas con "Te han pedido cambios", "Publicación aprobada", "Has recibido una valoración" y "Colaboración completada". Contadores "9+" en chat, bandeja y Más
useNotifications y el origen de los avisos de login
#3
Residuos de pruebas automáticas en datos visibles
Chat Nora Blake: unos 20 mensajes "oferta de test de integración", cada uno con "Oferta aceptada. Precio acordado: 111.11 €", además de "test webhook" (50.00 €) y ofertas de "Reel de lanzamiento 7505" y "7823" (400 € y 450 €). Los más recientes tenían entre "hace 23 min" y "hace 47 min", así que se siguen generando. Paquetes del creador con nombre numerado ("Reel de lanzamiento 7505" y "7823", 450 € cada uno). Bandeja del creador: "[TEST] falta el logo" y ofertas sobre "[test-integración] 1792766396801". Descubrir del partner: perfiles con texto de relleno, por ejemplo "asasas"
Los scripts de pruebas de integración y de webhook, y el .env que apunta a Supabase
#4
Accesos demo visibles en el login
/login muestra "Cuentas de prueba (equipo) — un clic y dentro:" con los botones Creador de contenido y Partner. No se inspeccionó cómo se autentican ni si las credenciales están en el cliente
pages/login.vue
#5
Cerrar sesión enterrado
Verificado en el creador: Más, luego Ajustes, pestaña Cuenta, bajar al final, pulsar "Cerrar sesión" y confirmar en el modal "¿Cerrar sesión?". "Ajustes" y el avatar llevan a la misma ruta, /creator/profile. En el partner no se abrió el menú Más
/creator/profile, /partner/profile
#6
Búsqueda con IA lenta y sin efecto visible
Partner, Descubrir, pestaña "Buscar con IA", consulta de fitness técnico con 200–500 €. Siguió "la IA está analizando…" pasados 13 segundos y terminó antes de unos 30. Durante la carga el texto decía "Mostrando destacados 1 a 1 de 11". Al terminar, los 9 primeros perfiles quedaron en el mismo orden: Paula Ibáñez (música) primera y Marcos Peña (fitness) segunda. No salió recuento ni motivo. Se vieron 3 peticiones POST /api/discover/search en la página, sin confirmar si había duplicadas
/api/discover/search y su proveedor de IA
Hallazgos de prioridad media y baja
Siguen la numeración del informe (#7 a #21). N1 y N2 son hallazgos nuevos, detectados después de redactar el informe.
Prioridad media
ID
Hallazgo
Evidencia concreta
#7
Contactar no avisa de duplicados
Partner, Colaboraciones, Pendientes (1): Paula Ibáñez, 567 €, "Pendiente de respuesta", hace 3 h. En Descubrir, "Contactar a Paula Ibáñez" abrió el formulario sin ningún aviso de esa solicitud
#8
Cifra de audiencia sin texto de unidad
Las tarjetas de Descubrir del partner muestran un icono de personas y "75 mil" o "290 mil", sin texto que diga si son seguidores o audiencia. Alejandro Suárez Durán aparece solo con "8"
#9
Perfiles incompletos en Descubrir
Creador: "Alma Beauty Co." (Belleza) sin descripción ni rango de presupuesto. Partner: "Nora Blake" (Belleza y skincare) sin rango, y "Alejandro Suárez Durán" (Informática) con texto de relleno
#10
Filtro del Tablero con entradas repetidas
"Todas las colaboraciones" lista "Alma Beauty Co." unas 23 veces. Hoy dice 18 colaboraciones activas y el Tablero muestra 1 pieza
#11
Métricas y Redes no coinciden
/creator/metrics: "Ve a Redes y conecta Instagram o YouTube". /creator/socials lista TikTok, YouTube, X, Instagram, Facebook y LinkedIn, todas "No conectada"
#12
Métricas vacías sin vista previa
Solo hay el texto "Conecta una red para ver tus métricas" y el botón "Ir a Redes"
#13
Créditos de predicción sin explicación
Perfil, Cuenta: "Créditos de predicción — 122 restantes", sin texto sobre su coste o renovación
#14
Barra de ficha sin detalle
Creador "Tu ficha está completa al 71%" y partner "43%"; en lo leído no se listan los campos que faltan. Hoy sí muestra avisos con botón "Completar"
#15
Tablero largo en móvil
Las fases Idea, En producción, Para revisar, Programado y Publicado se apilan en vertical; las vacías muestran "Suelta aquí". La tarjeta mostró chips de fase, que podrían ser la alternativa a arrastrar; no se probó
#16
Chat con poca altura útil y sin estado de entrega
El campo de mensaje, con "+" y botón de enviar, queda apilado sobre la barra inferior. El mensaje enviado muestra "ahora" y no indica entregado ni leído
#17
Oferta sin precio sin mensaje
Al vaciar "Precio propuesto (€)", "Enviar oferta" se vuelve gris sin texto de validación
N1
Contador de solicitudes del partner frente a su lista
Partner, Inicio: "Solicitudes pendientes 0". Partner, Colaboraciones: "Pendientes (1)". Puede ser una definición distinta (por responder frente a pendientes de respuesta) o un fallo del contador
N2
Bloque "Mensajes sin leer" del partner con el nombre equivocado
Partner, Inicio: el bloque muestra "Alma Beauty Co.", que es la propia cuenta, con "Oferta aceptada. Precio acordado: 111.11 €". En el chat, esa misma conversación aparece como "Nora Blake" con 5 sin leer. Parece que usa el nombre del usuario en lugar del de la otra parte; confirmar en el código
Prioridad baja
ID
Hallazgo
Evidencia concreta
#18
Posible falta de nombre accesible
En el árbol de accesibilidad salieron sin nombre el botón de enviar del login, las dos tarjetas de rol del onboarding, su botón de enviar, el botón Más de la barra inferior y "Enviar oferta". Los elementos de la lista de chat no aparecieron como enlaces ni botones. Puede deberse a cómo se leyó el árbol: confirmar con una auditoría de accesibilidad
#19
Error de Supabase crudo y en inglés
Alta con email de dominio .test: "Email address "prueba.claude@feedma.test" is invalid", en rojo bajo el campo de contraseña
#20
404 de Nuxt por defecto
Fondo oscuro, "404 Page not found" en inglés y enlace "Go back home"
#21
Landing
Pie de página, Producto: "Cómo funciona", "Para quién es" e "Instalaciones". Hero a 443 px: una línea punteada con iconos morados cruza el subtítulo y no se ve imagen del producto. Solo se revisó con capturas el primer tramo de la landing; el resto, por texto
Resultados de las pruebas en navegador
Pantallas y flujos recorridos en localhost:3000, con lo que funcionó y lo que se observó. Los problemas están numerados en la sección de hallazgos; aquí queda el registro de lo visto.
Público
Pantalla
Resultado
Landing /
Cargó sin errores de consola. Hero "CIBERAN — El parte de rodaje de tu contenido" con "Crear cuenta" y "Ya tengo cuenta". Secciones: las cinco fases, "Una entrega, cuatro miradas" (TOMA 01/04 a 04/04), "Para quién es", cierre con llamada a la acción, y pie con las seis redes y crédito de Unsplash
Onboarding /onboarding
Paso 1 "¿Quién eres?" con Creador de contenido y Partner. Paso 2 del creador: nombre, nicho opcional, email y contraseña (mínimo 8 caracteres). Un alta con email .test devolvió el error crudo del #19
Login /login
Email, contraseña, "Acceder", enlace "Crea una cuenta" y accesos demo. El acceso demo de Partner llevó a /partner. Cerrar sesión llevó a /login
Creador
Pantalla
Resultado
Hoy /creator
Tarjetas: colaboraciones activas 18, solicitudes pendientes 0, entregas próximas 1, objetivo semanal 1/5. "Entrega en 3 días: Rutina de skincare" con enlace a /creator/post/<id> (no abierto). Marcas sugeridas: SoundWave Academy (100–300 €), ProForma Sport (200–600 €), EcoHogar (150–450 €). "Necesita tu atención": Rutina de skincare con Alma Beauty Co. y "Oferta aceptada. Precio acordado: 111.11 €"
Tablero /creator/timeline
Búsqueda por título, filtro de redes, filtro de colaboraciones y "Seleccionar". Fases: Idea 0, En producción 0, Para revisar 0, Programado 0, Publicado 1
Descubrir /creator/discover
Pestañas "Filtros" y "Buscar con IA", Guardados (1), carrusel de 10 marcas con botón "Proponer". No se probó "Proponer" ni los filtros
Colaboraciones /creator/requests
Pestañas Pendientes e Historial. Pendientes vacío con texto explicativo. No se abrió Historial
Perfil /creator/profile
Pestañas Cuenta, Ficha pública, Paquetes y Privacidad y pagos; ficha al 71%. Cuenta: perfil público, redes conectadas, 122 créditos de predicción, objetivo semanal editable (5) y Cerrar sesión. Ficha pública: bio, 18 categorías, tarifa desde y hasta, y tipo de marcas. No se abrieron Paquetes ni Privacidad y pagos
Redes /creator/socials
Seis redes, todas "No conectada", con botón "Conectar". No se pulsó ninguno
Métricas /creator/metrics
Solo el estado vacío con el botón "Ir a Redes"
Chat e inbox
Chat: Alma Beauty Co. (11 sin leer), ProForma Sport ("Oferta enviada", hace 3 h) y Alejandro Suárez Durán ("Oferta enviada", hace 8 h). Inbox con "Marcar todo como leído", que no se pulsó
Cerrar sesión
Modal propio "¿Cerrar sesión?" con Cancelar y Cerrar sesión; al confirmar redirige a /login
Partner
Pantalla
Resultado
Inicio /partner
19 colaboraciones activas, 0 solicitudes pendientes, 0 por revisar, 0 entregas próximas y calendario vacío. Creadores sugeridos: Paula Ibáñez (100–280 €), Marcos Peña (180–450 €), Elena Ruiz (150–400 €). El bloque "Mensajes sin leer" muestra "Alma Beauty Co." con "Oferta aceptada. Precio acordado: 111.11 €"
Descubrir /partner/discover
11 creadores con botón "Contactar", pestañas Filtros y Buscar con IA, y Guardados. Resultado de la búsqueda con IA en el #6
Colaboraciones /partner/requests
Pendientes (1): Paula Ibáñez, 567 €, "Pendiente de respuesta". No se abrió Historial
Perfil /partner/profile
"Alma Beauty Co." con ficha al 43%. Pestañas Cuenta, Ficha pública, Necesidades y Privacidad. Campos: bio, categorías que buscas, presupuesto desde y hasta, y tipo de creador. No se abrió el menú Más
Chat /chat
Lista con Nora Blake (5 sin leer) y Alejandro Suárez Durán ("alma marcela gozo", hace 2 días). La conversación con Nora Blake carga con unos 20 mensajes de test. El envío de un mensaje fue instantáneo
Oferta desde el chat
El botón "+" abre "Elige un paquete" con dos paquetes y luego "Ofertar", con precio editable (450 € por defecto) y mensaje opcional. No se envió
Contactar
Formulario con "Cuéntales tu campaña", "Presupuesto (€)", la nota de que el pago se hace desde CIBERAN con comisión de la plataforma y "Detalles de la propuesta (opcional)". "Enviar solicitud" estuvo desactivado hasta rellenar. No se envió
Consola y red
• Durante la navegación normal no hubo errores propios de la app en la consola. Los únicos fueron un 400 del intento de alta y un 404 de la URL inventada.
• La landing cargó unas 314 peticiones, casi todas módulos de Vite en modo desarrollo; no se midió el rendimiento en producción.
• Todas las peticiones de la landing fueron a localhost:3000. La autenticación y los datos van a Supabase.
Valores de referencia antes de cambiar nada
Sirven para comparar después. Pueden moverse si las pruebas automáticas siguen escribiendo datos.
Dónde
Valor observado
Creador, Hoy
18 activas, 0 pendientes, 1 entrega próxima, objetivo 1/5
Creador, Tablero
Idea 0, En producción 0, Para revisar 0, Programado 0, Publicado 1
Creador, Perfil
Ficha 71%, 122 créditos de predicción
Partner, Inicio
19 activas, 0 pendientes, 0 por revisar, 0 entregas próximas
Partner, Colaboraciones
Pendientes (1), Paula Ibáñez, 567 €
Descubrir
10 marcas para el creador y 11 creadores para el partner
Decisiones, recomendaciones y preguntas abiertas
Las decisiones cerradas son pocas y de proceso o tipografía; todo lo demás son recomendaciones que el desarrollador aún no ha aprobado una por una.
Decisiones cerradas
• El feedback de la auditoría se usará para mejorar CIBERAN, y el informe junto con este traspaso son la referencia: no hay que repetir la auditoría.
• La fuente de los títulos no debe ser la misma que la del título CIBERAN. Se interpreta como los títulos de pantalla; el alcance exacto está por confirmar (ver preguntas abiertas).
• Para las pruebas, el desarrollador autorizó probar las funciones, cerrar sesión y entrar como partner con el acceso demo.
Recomendaciones de enfoque (no aprobadas)
• Empezar por el entorno y los datos: sin eso, los contadores y las pruebas posteriores no son fiables.
• Una fase por rama y con su comprobación; no mezclar la tipografía con cambios de datos.
• No tocar Stripe, las políticas de permisos de Supabase ni el esquema de datos salvo que una tarea lo exija; si lo exige, parar y confirmar antes.
• Medir antes de cambiar y comparar con los valores de referencia de este documento.
• Verificar en el código cada pista de la sección de hallazgos antes de aplicarla, porque salen de nombres de archivo y no de leer el código.
• Tipografía: dejar Snasm solo para el logo, usar Sora en los títulos (alternativas Space Grotesk y Bricolage Grotesque) y mantener Hanken Grotesk para el texto.
Preguntas abiertas para el desarrollador
1. ¿Qué fuente concreta se usa y el cambio alcanza solo a los títulos o también al texto? Hay un comentario pendiente de respuesta en el informe.
2. ¿El entorno de pruebas será un segundo proyecto de Supabase en la nube o Supabase en local?
3. ¿Los accesos demo deben existir también en producción, por ejemplo para demostraciones, o solo en desarrollo?
4. ¿Qué cuenta como "colaboración activa", "entrega próxima" y "solicitud pendiente" para cada rol?
5. ¿Los datos de prueba actuales se pueden borrar, o hay datos reales mezclados en el mismo proyecto de Supabase?
Plan de implementación por fases
El orden va de lo que da fiabilidad (entorno y datos) a lo visual. Cada fase debe cerrarse con las pruebas de su sección antes de empezar la siguiente. Todas las tareas están pendientes; las recomendaciones citan el ID del hallazgo.
Fase 0: preparación, sin cambios funcionales
• Crear una rama de trabajo y confirmar que el árbol está limpio.
• Exportar o copiar los datos de Supabase antes de cualquier limpieza; no se ha hecho ninguna copia.
• Leer el código de las pistas de los hallazgos y confirmar de dónde salen los contadores, las notificaciones y los accesos demo.
• Resolver las preguntas abiertas 2 a 5.
• Registrar los valores de referencia actuales con las cuentas demo.
Fase 1: entorno y datos (#3, #4)
• #3: crear un entorno de pruebas separado y apuntar a él los tests de integración y de webhook. Marcar los datos de test con un campo como is_test u otro criterio, excluirlos de las consultas de la interfaz y limpiar los existentes con un script revisable y reversible.
• #4: mostrar los accesos demo solo en desarrollo, por ejemplo con import.meta.dev o una variable de entorno. En producción, desactivar esas cuentas o cambiar sus credenciales, y comprobar si las credenciales están en el código del cliente.
• Depende de la Fase 0 y de las preguntas 2, 3 y 5.
Fase 2: notificaciones y coherencia de datos (#2, #1, #10, N1, N2)
• #2: dejar de generar un aviso por cada inicio de sesión o llevarlo a un apartado de Seguridad, agrupar las solicitudes duplicadas, separar "Importantes" de "Actividad" y hacer que el contador solo cuente lo importante.
• #1, N1: una única fuente de verdad para contadores y estados de ambos roles, con la definición escrita en el código. Añadir una prueba que compare los dos paneles con los mismos datos.
• #10: que el filtro del Tablero muestre el título de cada colaboración o agrupe por marca.
• N2: mostrar el nombre de la otra parte en "Mensajes sin leer" del partner.
• Depende de la Fase 1, con los datos limpios, y de la pregunta 4.
Fase 3: navegación, cuenta y tipografía (#5)
• #5: mover "Cerrar sesión" al menú Más o al avatar y separar "Ajustes" de "Perfil", o dejar un solo nombre. Revisar el menú Más del partner, que no se abrió.
• Tipografía: Snasm solo en el logo y los títulos con la nueva fuente (Sora, recomendada) mediante una variable como --font-display. Revisar los tamaños, porque Snasm es muy ancha, el hero de la landing y el onboarding.
• Depende de la pregunta 1.
Fase 4: búsqueda con IA y Descubrir (#6, #7, #8, #9)
• #6: estado de carga visible con texto, botón de cancelar y tiempo máximo; recuento de perfiles que encajan y motivo en cada tarjeta; reordenar por afinidad; cachear consultas repetidas y comprobar si hay peticiones duplicadas a /api/discover/search. Vigilar el coste del proveedor de IA al probar.
• #7: mostrar "Pendiente de respuesta" en la tarjeta y avisar o desactivar el botón antes de crear una segunda solicitud.
• #8: añadir texto de unidad a la cifra de audiencia.
• #9: exigir un mínimo de ficha para aparecer en Descubrir o mostrar "Ficha en construcción".
• Depende de la Fase 1, para que los datos de test no salgan en Descubrir.
Fase 5: calidad y pulido (#11 a #21)
• #18: añadir aria-label a los botones de icono, usar enlaces o botones reales en la lista de chat y confirmar con una auditoría de accesibilidad.
• #19: traducir los errores de autenticación a mensajes en español con una acción clara.
• #20: crear error.vue con la marca y el texto en español.
• #11: unificar en Métricas las redes que se mencionan con las de Redes. #12: vista previa con datos de ejemplo. #13: explicar el coste de los créditos de predicción y cuándo se renuevan. #14: lista de campos pendientes en la barra de ficha.
• #15: colapsar las columnas vacías del Tablero en móvil. #16: ocultar la barra inferior dentro del chat; el estado de entregado o leído puede exigir un cambio de datos, así que tratarlo aparte. #17: mensaje de validación junto al precio de la oferta.
• #21: corregir "Instalaciones", bajar la opacidad de la línea decorativa del hero y añadir una captura real del panel.
Precauciones para no romper nada
Ninguna de las mejoras propuestas pide tocar pagos ni permisos, y conviene que siga así; estas son las zonas de riesgo y qué cuidar en cada una. La columna central dice lo que se sabe y lo que no.
Área
Qué se sabe
Precaución
Pagos
Hay stripePublishableKey en la configuración pública. El formulario Contactar dice que el pago se hace desde CIBERAN con comisión de la plataforma. El perfil del creador tiene la pestaña "Privacidad y pagos". El mensaje "test webhook" sugiere que hay webhooks. No se probó ningún pago
No modificar claves, webhooks, comisiones ni los textos de pago salvo petición expresa. Usar solo claves de prueba y no ejecutar pagos reales. Al separar entornos, apuntar los webhooks de pruebas a su propio endpoint y no al de producción. Cualquier cambio en el texto de Contactar debe seguir reflejando el flujo real de cobro
Permisos
Hay dos árboles de rutas, /creator/* y /partner/*, y Supabase como backend. No se probó el acceso cruzado (por ejemplo, un creador abriendo /partner) ni se revisaron las políticas de seguridad de filas
No cambiar las políticas de seguridad ni el control de rutas dentro de estas mejoras. Antes de la Fase 2, probar el acceso cruzado y anotar el resultado como línea base. Si los contadores (#1) o las notificaciones (#2) exigen consultas nuevas, comprobar que cada rol solo ve sus datos
Datos
Un único proyecto de Supabase en la nube recibe pruebas manuales y automáticas, hay datos de test mezclados y no se sabe si hay datos reales
Exportar antes de limpiar. Borrar solo con un criterio explícito (marca de test o patrón de nombre), nunca con un borrado sin filtro. Probar el script primero en el entorno separado. Cualquier cambio de esquema, con migración versionada
Colaboraciones
Una colaboración reúne solicitudes, ofertas, chat, publicaciones, revisiones y valoraciones (composables useCollabRequests, usePostRevisions, useCollaborationLog y useRatings). El chat muestra mensajes de sistema como "Oferta aceptada"
Al unificar contadores (#1), cambiar solo cómo se cuentan y se muestran, no los estados ni sus transiciones. Mantener intactos los mensajes de sistema, las valoraciones y el registro de colaboración. Probar el ciclo completo con cuentas de prueba antes y después: solicitud, oferta, aceptación, entrega, revisión, publicación y valoración
Notificaciones
Los avisos salen en la bandeja y en los contadores de chat y bandeja. No se sabe si se crean en el cliente, en funciones de la base de datos o en un servicio
Localizar dónde se crea el aviso de inicio de sesión antes de quitarlo, por si otra función depende de él. No eliminar avisos de cambios pedidos, aprobaciones, valoraciones ni ofertas
Búsqueda con IA
POST /api/discover/search, unos 20–30 s, proveedor y coste desconocidos
Poner tiempo máximo y límite de uso antes de probar en bucle. No exponer claves del proveedor en el cliente. No cambiar el formato de la respuesta sin actualizar la interfaz
Cuentas demo
Hay dos cuentas del equipo con acceso de un clic
Al desactivarlas o rotarlas, avisar al equipo y actualizar las pruebas que las usen. No guardar contraseñas en el repositorio ni en documentos
Tipografía
Snasm está declarada con peso 300 y Hanken Grotesk con pesos de 400 a 800
Comprobar que el logo conserva Snasm tras cambiar la regla de h1 y h2, que las demás fuentes siguen cargando y que los títulos largos no se cortan en móvil
Proceso
No se ha cambiado nada todavía
Una rama por fase, commits pequeños, sin mezclar limpieza de datos con cambios de interfaz. No dar un hallazgo por resuelto sin repetir su comprobación de la sección de pruebas
Pruebas tras cada fase
Una fase se da por cerrada cuando pasan las pruebas de humo comunes y las de su fase, y se ha actualizado la referencia de valores. Lo que envía mensajes o crea datos se prueba solo en el entorno de pruebas, no en el compartido de hoy.
Pruebas de humo comunes
1. Entrar como creador y como partner con el acceso demo, y cerrar sesión en ambos.
2. Recorrer las rutas de cada rol (las listadas en Contexto técnico) sin 404 ni pantallas en blanco, en un viewport de 443 a 611 px.
3. Consola sin errores nuevos respecto a la línea base: ninguno propio de la app.
4. Comparar los valores de referencia de este documento; si los datos se limpiaron, anotar la nueva línea base.
5. En el chat, enviar un mensaje, abrir "Elige un paquete" y el formulario Contactar.
6. Acceso cruzado: un creador no puede usar las rutas /partner/* ni un partner las de /creator/*.
Pruebas específicas por fase
Fase
Pruebas manuales
Comprobaciones técnicas
0
Registrar los valores de referencia y probar el acceso cruzado de rutas entre roles
Exportación de datos verificada y compilación y pruebas del proyecto en verde antes de tocar nada
1
Con el entorno nuevo, los tests de integración y de webhook pasan y no escriben en el entorno de uso manual. Chat, Descubrir y bandeja ya no muestran datos de test. /login no muestra accesos demo con la configuración de producción y sí en desarrollo
Compilación de producción; buscar en el código generado que no queden credenciales demo; confirmar a qué URL de Supabase apunta cada entorno y a qué endpoint apuntan los webhooks de pruebas
2
Iniciar sesión varias veces: la bandeja no acumula avisos de login (o van a Seguridad). Crear dos solicitudes iguales: salen agrupadas. Los contadores de creador y partner coinciden con los mismos datos. En el partner, "Solicitudes pendientes" coincide con Colaboraciones y "Mensajes sin leer" nombra a la otra parte. Ciclo completo de una colaboración sin regresiones
Prueba automática que compare los contadores de ambos roles. Siguen llegando los avisos de cambios pedidos, aprobación, valoración y oferta. Acceso cruzado sin cambios
3
Cerrar sesión en dos toques como máximo desde cualquier pantalla de ambos roles, con su modal. Títulos con la nueva fuente en landing, onboarding, login, Hoy, Inicio, Tablero, Descubrir, Perfil y chat, y el logo con Snasm. A 443 y 611 px los títulos no se cortan ni desbordan
Fuentes calculadas en la página (document.fonts): Hanken Grotesk sigue cargando todos sus pesos; sin salto de fuente notable al cargar; Lighthouse
4
Búsqueda con IA con la consulta de fitness técnico y 200–500 €: carga visible, se puede cancelar, termina dentro del tiempo máximo y muestra recuento y motivo, con los perfiles de fitness por delante. Contactar con un creador que ya tiene solicitud pendiente avisa. Las cifras de audiencia llevan unidad. Los perfiles incompletos no salen o muestran el texto de ficha en construcción
Una sola petición por búsqueda en la pestaña de red; errores y tiempo máximo del proveedor controlados; coste por búsqueda anotado
5
Navegación por teclado y lector de pantalla en login, onboarding, chat y menú Más. Errores de alta en español con un email inválido en el entorno de pruebas. 404 con la marca. Métricas y Redes con la misma lista de redes. Tablero en móvil sin columnas vacías largas. Chat con el campo visible y la barra inferior oculta. Oferta sin precio con mensaje. Landing con "Integraciones" y sin la línea cruzando el texto
Auditoría de accesibilidad (Lighthouse o axe) sin botones sin nombre; consola sin errores; la página de error propia se ve en rutas inexistentes con la compilación de producción
Límites de la auditoría
La auditoría vio la parte visible de la app en un solo recorrido, y estas áreas quedaron sin valorar; no hay que darlas por buenas ni por malas.
• Aprobar o pedir cambios en una entrega: no había ninguna en "Para revisar", no se abrió el detalle de publicación (/creator/post/<id>) y no se localizó la ruta equivalente del partner.
• Aceptar o rechazar ofertas como creador, enviar ofertas o solicitudes de contacto (solo se abrieron los formularios) y el botón "Proponer" del creador.
• Conectar redes sociales, que concede permisos OAuth, y las predicciones de éxito con créditos.
• Pestañas Paquetes y Privacidad y pagos del creador, y Necesidades y Privacidad del partner; guardar una ficha; Guardados; los Filtros de Descubrir; el Historial de Colaboraciones.
• Pagos y todo lo relacionado con Stripe.
• Acceso cruzado entre roles y políticas de permisos del backend.
• El menú Más del partner.
• Pantallas de escritorio y tablet: solo se probó entre 443 y 611 px de ancho.
• Rendimiento y accesibilidad reales: todo se probó en modo desarrollo y la accesibilidad se leyó desde el árbol de la página, sin lector de pantalla.
• Código fuente: no se leyó ningún archivo. Las pistas de los hallazgos son hipótesis a partir de nombres de archivo.
• Datos: durante la prueba seguían entrando datos de tests automáticos, así que los valores de referencia pueden haber cambiado.
El primer paso para continuar es la Fase 0 del plan.