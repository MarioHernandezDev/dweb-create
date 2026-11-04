# CIBERAN — AUDITORÍA INTEGRAL, QA Y PRODUCCIÓN DE DEMOSTRACIÓN AUDIOVISUAL

## CONTEXTO

CIBERAN es una plataforma marketplace de dos lados que conecta creadores de contenido con marcas y empresas interesadas en colaborar con ellos.

La aplicación está desarrollada con:

- Nuxt 4.
- Vue.
- Supabase.
- Stripe.
- TypeScript.

La plataforma dispone de dos experiencias diferenciadas:

**CREATOR**
- Dashboard.
- Perfil público.
- Gestión de publicaciones.
- Tablero de trabajo.
- Calendario.
- Métricas de redes sociales.
- Descubrimiento de oportunidades.
- Chat.
- Recepción y negociación de ofertas.
- Gestión de colaboraciones.
- CIBERAN Studio.

**PARTNER**
- Dashboard.
- Perfil de empresa.
- Descubrimiento de creadores.
- Búsqueda y filtros.
- Chat.
- Envío y negociación de ofertas.
- Gestión de colaboraciones.
- Seguimiento de campañas.

El objetivo es llevar CIBERAN a una fase de estabilización, validación y preparación para una futura presentación pública.

Este proyecto requiere una auditoría exhaustiva y la creación de una demostración audiovisual profesional de la aplicación.

---

# REGLAS FUNDAMENTALES

1. No inventes funcionalidades que no existan.
2. No consideres una funcionalidad terminada simplemente porque su interfaz esté implementada.
3. Distingue entre implementado, probado, parcialmente probado y pendiente de verificación.
4. No marques como verificado algo que no hayas ejecutado realmente.
5. No ocultes errores ni resultados negativos.
6. No modifiques funcionalidades sensibles sin autorización.
7. No apliques migraciones a producción.
8. No realices cobros reales de Stripe.
9. No utilices datos personales reales en las demostraciones.
10. No destruyas, sobrescribas ni alteres información existente.
11. No cambies arbitrariamente la arquitectura.
12. Mantén un registro de todas las comprobaciones realizadas.
13. Cuando encuentres una dependencia externa o una tarea que requiera intervención humana, documenta exactamente qué necesitas.
14. No afirmes que has grabado, renderizado o generado un vídeo si no existe realmente el archivo resultante.

Puedes realizar inspecciones, lecturas, análisis estáticos, pruebas aisladas y preparación de documentación.

Para cualquier modificación importante, presenta primero el diagnóstico, el cambio propuesto y sus posibles consecuencias.

---

# FASE 0 — INSPECCIÓN Y MAPA DEL PROYECTO

Antes de realizar cualquier auditoría:

1. Inspecciona la estructura completa del repositorio.
2. Identifica las rutas de Nuxt.
3. Identifica layouts y componentes principales.
4. Localiza composables, stores y servicios.
5. Inspecciona las migraciones de Supabase.
6. Identifica las tablas, funciones RPC, triggers y políticas RLS.
7. Identifica las Edge Functions.
8. Inspecciona la integración de Stripe.
9. Identifica las integraciones de redes sociales.
10. Localiza las pruebas automatizadas existentes.
11. Identifica los documentos de arquitectura y roadmap.
12. Comprueba el estado de Git y las modificaciones pendientes.

No deduzcas la arquitectura únicamente por los nombres de archivos. Sigue las dependencias y comprueba las implementaciones.

### Entregable

Crear:

`docs/audit/00_PROJECT_MAP.md`

Debe contener un mapa comprensible de toda la aplicación y sus dependencias.

---

# FASE 1 — AUDITORÍA TÉCNICA

Revisar exhaustivamente:

- Arquitectura Nuxt 4.
- Organización de componentes.
- TypeScript.
- Composables.
- Gestión del estado.
- Consultas Supabase.
- Tratamiento de errores.
- Validaciones.
- Rendimiento.
- Hidratación.
- Dependencias.
- Código duplicado.
- Accesibilidad.
- Mantenibilidad.

Ejecutar las comprobaciones disponibles:

- Type checking.
- Lint.
- Build.
- Tests unitarios.
- Tests de integración.

No modifiques código para conseguir que una prueba pase sin documentar el problema original.

### Entregable

`docs/audit/01_TECHNICAL_AUDIT.md`

---

# FASE 2 — AUDITORÍA DE SEGURIDAD

Esta fase es prioritaria.

Revisar:

- Todas las políticas RLS.
- Separación de permisos entre creadores y partners.
- Protección de rutas.
- Autenticación.
- Gestión de sesiones.
- Operaciones RPC.
- SECURITY DEFINER.
- search_path.
- Permisos EXECUTE.
- Edge Functions.
- Gestión de secretos.
- Variables de entorno.
- Validación de datos.
- Acceso a información de otros usuarios.
- Seguridad de conversaciones.
- Seguridad de ofertas.
- Seguridad de colaboraciones.
- Seguridad de pagos.
- Webhooks.
- Idempotencia.
- Manipulación de identificadores.

Comprobar especialmente que ningún usuario pueda modificar, consultar o eliminar información que no le corresponde.

### Pendiente conocido

Existe una tarea para retirar al navegador el permiso de borrar registros de `social_accounts`.

Analiza su implementación actual y prepara una propuesta de migración.

No la apliques automáticamente.

### Entregable

`docs/audit/02_SECURITY_AUDIT.md`

Clasifica los hallazgos:

- CRÍTICO.
- ALTO.
- MEDIO.
- BAJO.
- INFORMATIVO.

Incluye evidencia técnica, ubicación, impacto y solución propuesta.

---

# FASE 3 — AUDITORÍA FUNCIONAL Y QA

Recorre toda la aplicación desde las perspectivas de ambos roles.

Comprueba:

1. Autenticación.
2. Onboarding.
3. Dashboard creator.
4. Dashboard partner.
5. Perfiles privados y públicos.
6. Descubrir.
7. Búsquedas y filtros.
8. Chat.
9. Ofertas.
10. Negociación.
11. Aceptación de ofertas.
12. Creación de colaboraciones.
13. Pagos.
14. Publicaciones.
15. Tablero.
16. Calendario.
17. Métricas.
18. Integraciones sociales.
19. CIBERAN Studio.
20. Solicitudes de revisión.
21. Aprobaciones.
22. Notificaciones.
23. Configuración.

Para cada funcionalidad documenta:

- Qué debería hacer.
- Qué hace realmente.
- Cómo se ha probado.
- Resultado.
- Errores encontrados.
- Dependencias.
- Mejoras propuestas.

No confundas errores de interfaz con errores de backend.

Presta especial atención a los flujos completos entre módulos.

### Entregable

`docs/audit/03_FUNCTIONAL_QA.md`

Incluye una matriz de funcionalidades y estados:

- Implementada y verificada.
- Implementada parcialmente.
- Implementada sin verificar.
- Pendiente.
- Bloqueada por dependencia externa.

---

# FASE 4 — AUDITORÍA VISUAL Y UX

Realiza una revisión visual completa.

Evalúa:

- Jerarquía visual.
- Consistencia.
- Espaciados.
- Tipografía.
- Paleta.
- Responsive.
- Navegación.
- Estados vacíos.
- Skeletons.
- Feedback de acciones.
- Formularios.
- Modales.
- Transiciones.
- Animaciones.
- Accesibilidad.

Comprueba las páginas en diferentes resoluciones.

No propongas rediseñar toda la aplicación por preferencias personales. Identifica problemas reales y oportunidades concretas.

El objetivo es que CIBERAN transmita la sensación de un producto SaaS profesional y cohesionado.

### Entregable

`docs/audit/04_UX_AUDIT.md`

---

# FASE 5 — PENDIENTES CONOCIDOS

Investiga expresamente los siguientes elementos:

## Stripe y pagos

Actualmente existe el botón de pago y parte de la lógica, pero el flujo completo no está verificado.

Analiza:

- Creación de sesiones.
- Checkout.
- Webhooks.
- Confirmación de pagos.
- Estados de transacción.
- Idempotencia.
- Reembolsos, si están implementados.
- Gestión de errores.
- Sincronización con colaboraciones.

Prepara un plan de pruebas utilizando Stripe Test Mode.

No ejecutes transacciones reales.

## A-R4 y A-R12

Identifica las dependencias de Mario:

- Respuesta M-L1.
- Función compartida de base de datos.

Documenta qué está bloqueado y qué puede avanzarse independientemente.

## Planificador de sincronización

Analiza Q3 y la necesidad de `SYNC_CRON_SECRET`.

Documenta:

- Funcionamiento actual.
- Diseño propuesto.
- Seguridad.
- Frecuencia recomendada.
- Reintentos.
- Control de errores.
- Observabilidad.

No inventes una decisión para Q3.

## Despliegue

Inspecciona la configuración actual y prepara:

- Variables de entorno.
- Dominios.
- Supabase.
- Stripe.
- Cron.
- Build.
- Migraciones.
- HTTPS.
- Logs.
- Monitorización.
- Backups.
- Checklist de lanzamiento.

No despliegues nada sin autorización.

### Entregable

`docs/audit/05_PENDING_WORK.md`

---

# FASE 6 — PLAN MAESTRO DE CORRECCIONES

Agrupa todos los hallazgos.

Prioriza según:

1. Seguridad.
2. Integridad de datos.
3. Pagos.
4. Errores funcionales.
5. Bloqueos de lanzamiento.
6. UX.
7. Mejoras opcionales.

Cada tarea debe tener:

- Identificador.
- Descripción.
- Gravedad.
- Dependencias.
- Archivos afectados.
- Riesgos.
- Criterio de aceptación.
- Pruebas necesarias.

No empieces a implementar todo automáticamente.

### Entregable

`docs/audit/06_REMEDIATION_ROADMAP.md`

---

# FASE 7 — PREPARACIÓN DEL ENTORNO DE DEMOSTRACIÓN

Queremos crear un escenario completo y coherente.

Prepara dos perfiles ficticios:

CREATOR:
- Nombre: AREZZ.
- Perfil completo.
- Fotografía.
- Biografía.
- Redes sociales de demostración.
- Estadísticas ficticias claramente identificadas.
- Paquetes comerciales.
- Publicaciones.
- Historial de colaboraciones.

PARTNER:
- Nombre: NOVA STUDIO.
- Logotipo.
- Descripción.
- Sector.
- Presupuesto ficticio.
- Campañas.
- Ofertas.

Prepara un escenario narrativo:

1. NOVA STUDIO busca un creador.
2. Descubre AREZZ.
3. Visita su perfil.
4. Consulta sus estadísticas.
5. Inicia una conversación.
6. Envía una oferta.
7. AREZZ recibe la oferta.
8. Negocian.
9. AREZZ acepta.
10. Se crea una colaboración.
11. Se gestiona mediante CIBERAN Studio.
12. Se crea una publicación.
13. Se envía a revisión.
14. NOVA STUDIO solicita cambios.
15. AREZZ modifica el contenido.
16. NOVA STUDIO aprueba.
17. Se completa el flujo de trabajo.

Los datos deben ser coherentes entre sí.

IMPORTANTE:

- No contamines producción con datos ficticios.
- No utilices cuentas reales de usuarios.
- No utilices credenciales reales en grabaciones.
- No falsifiques métricas presentándolas como datos reales.
- Si una funcionalidad no se puede ejecutar, documenta la limitación.
- Prioriza un entorno aislado de demostración.

### Entregable

`docs/demo/DEMO_DATA_PLAN.md`

---

# FASE 8 — GUION AUDIOVISUAL

Diseña una demostración profesional de CIBERAN.

No debe parecer un tutorial improvisado.

Debe explicar el producto, mostrar su funcionamiento y transmitir confianza.

Prepara un storyboard con:

- Número de escena.
- Duración estimada.
- Página que se muestra.
- Acción que se realiza.
- Mensaje que se quiere transmitir.
- Narración.
- Subtítulos.
- Transición.
- Elementos visuales destacados.

El recorrido debe incluir:

1. Introducción.
2. Presentación del producto.
3. Experiencia del creador.
4. Métricas.
5. Descubrimiento.
6. Experiencia de la marca.
7. Chat.
8. Ofertas.
9. Colaboraciones.
10. CIBERAN Studio.
11. Publicaciones.
12. Revisiones.
13. Calendario.
14. Cierre.

Adapta el recorrido a las funcionalidades verificadas.

No muestres funcionalidades rotas como si funcionaran.

### Estilo audiovisual

- Resolución 1920x1080 como mínimo.
- 16:9.
- Movimientos de cámara suaves mediante zoom y recortes.
- Transiciones elegantes.
- Música ambiental discreta.
- Narración en español.
- Subtítulos sincronizados.
- Tipografía coherente con CIBERAN.
- Identidad visual de la aplicación.
- Pantalla inicial y final.

La duración final debe permitir explicar el producto sin resultar excesivamente largo. Propón una duración adecuada según el contenido real.

---

# FASE 9 — GRABACIÓN Y POSTPRODUCCIÓN

Investiga qué herramientas están disponibles en el entorno.

Valora Playwright para automatizar la navegación y capturar los flujos reales.

Valora herramientas como FFmpeg para montaje, composición, música, narración y subtítulos.

La grabación debe:

- Utilizar el entorno de demostración.
- Tener datos preparados.
- Evitar errores de navegación.
- Evitar movimientos bruscos.
- Mostrar correctamente las acciones.
- Utilizar una resolución uniforme.
- Mantener continuidad entre escenas.

Genera, si el entorno lo permite:

- Vídeo final MP4.
- Subtítulos SRT.
- Guion de narración.
- Storyboard.
- Capturas de apoyo.
- Proyecto o archivos auxiliares necesarios para editar posteriormente.

No inventes funcionalidades durante el montaje.

Si no puedes generar voz, documenta qué herramienta externa sería necesaria y deja preparada la narración.

Si no puedes realizar una grabación completa, no simules haberla realizado. Entrega el material preparado y especifica qué falta.

---

# FASE 10 — VALIDACIÓN FINAL

Antes de dar el trabajo por terminado:

1. Comprueba que el vídeo existe.
2. Reproduce el vídeo completo.
3. Comprueba que el audio está sincronizado.
4. Comprueba los subtítulos.
5. Comprueba que no aparecen credenciales.
6. Comprueba que los datos son ficticios.
7. Comprueba que los flujos mostrados son coherentes.
8. Comprueba que no se han mostrado errores como éxitos.
9. Verifica la calidad visual.
10. Documenta las limitaciones.

### Entregable

`docs/demo/FINAL_DEMO_REPORT.md`

---

# INFORME MAESTRO

Al terminar, crea:

`docs/audit/CIBERAN_FINAL_AUDIT.md`

Debe ofrecer una visión ejecutiva de:

- Estado general del producto.
- Nivel de preparación para una demo.
- Nivel de preparación para producción.
- Problemas críticos.
- Problemas pendientes.
- Dependencias de Mario.
- Seguridad.
- Calidad técnica.
- Calidad funcional.
- UX.
- Recomendaciones.
- Próximos pasos.

Incluye una puntuación orientativa por categorías, explicando los criterios utilizados. No inventes una puntuación global sin evidencias.

---

# INSTRUCCIÓN FINAL

Actúa con el máximo rigor.

No queremos simplemente que CIBERAN compile.

Queremos saber si CIBERAN funciona realmente, si es segura, si sus flujos tienen sentido y si está preparada para que otras personas la utilicen.

El vídeo debe ser una demostración fiel del producto real, no una presentación ficticia.

La prioridad es obtener una visión completa, honesta y verificable del estado de CIBERAN.

Empieza exclusivamente por la FASE 0.

Cuando termines cada fase:

1. Presenta los resultados.
2. Actualiza los documentos.
3. Enumera los hallazgos.
4. Identifica bloqueos.
5. Propón la siguiente fase.

No avances a modificaciones destructivas ni a tareas que requieran autorización.

No sacrifiques rigor por velocidad. Este trabajo es una auditoría integral de un proyecto que lleva bastante tiempo desarrollándose. No quiero que pierdas tiempo reconstruyendo decisiones que ya están documentadas.

Antes de empezar, revisa los documentos existentes del proyecto, especialmente el roadmap, los informes de auditoría anteriores, las decisiones técnicas y los registros de trabajo.

Utiliza el estado actual del repositorio como fuente de verdad. Si encuentras contradicciones entre documentación y código, prevalece el código y documenta la discrepancia.

Quiero que trabajes con profundidad, utilizando el máximo razonamiento disponible, sin escatimar en análisis ni en pruebas cuando sean seguras y estén dentro del alcance autorizado.