# Registro de actividades de tratamiento (art. 30 RGPD)

> **DOCUMENTO INTERNO. No publicar.** Borrador para revisión del abogado.
> Reflejo del código a fecha 2026-11-15, con los lanzamientos decididos: gratuito, sin IA en Discover, sin Sentry, sin pagos, sin métricas de redes. Los plazos son **propuestas, a confirmar con el abogado**. Las columnas marcadas `[CAMBIO N]` solo serán ciertas cuando se haga ese cambio del Paso 2.

## Responsable

- **Responsable:** `[TITULAR_NOMBRE]` (persona física), DNI `[TITULAR_DNI]`, domicilio `[TITULAR_DOMICILIO]`, contacto `[EMAIL_CONTACTO]`.
- **Delegado de protección de datos:** no designado. `[DUDA: abogado, ¿obligatorio? Se estima que no.]`
- **Encargados de tratamiento:** Supabase (BD, autenticación, almacenamiento; `[DUDA: región]`), Google (SMTP), proveedor de alojamiento `[DUDA]`, IONOS (dominio/DNS) `[DUDA: rol]`.
- **Obligación de llevar el registro:** la excepción para menos de 250 empleados no se aplica si el tratamiento no es ocasional, que es el caso. `[DUDA: abogado]`

## Actividades de tratamiento

### T1. Cuentas y autenticación
| Campo | Contenido |
|---|---|
| Finalidad | Alta, inicio de sesión, verificación de correo, recuperación de contraseña |
| Personas | Usuarios registrados (creadores y partners), mayores de 18 años `[CAMBIO 1]` |
| Datos | Correo, contraseña (hash), nombre, rol, versión de términos aceptada y fecha |
| Base legal | Ejecución del contrato (art. 6.1.b) |
| Destinatarios | Supabase (Auth), Google (envío de correos) |
| Transferencias | Google: EE. UU. `[DUDA: garantía]`. Supabase: según región `[DUDA]` |
| Plazo | Mientras exista la cuenta |
| Medidas | Contraseña con hash; acceso por clave de servicio solo en servidor; correo de verificación obligatorio al alta |

### T2. Perfiles y descubrimiento
| Campo | Contenido |
|---|---|
| Finalidad | Mostrar perfiles, buscar, guardar perfiles y búsquedas |
| Personas | Usuarios |
| Datos | Nombre público o empresa, foto, portada, bio, ubicación, web, categorías, tarifas/presupuesto, qué buscan, audiencia; guardados |
| Base legal | Ejecución del contrato |
| Destinatarios | Otras personas usuarias; cualquier persona con el enlace si la ficha pública está activa (por defecto sí) `[CAMBIO 7]` |
| Transferencias | Ninguna adicional a T1 |
| Plazo | Mientras exista la cuenta |
| Medidas | Reglas de acceso por fila (RLS); la ficha pública sale de una lista cerrada de campos; tarifas, audiencia y presupuesto no se muestran sin sesión |

### T3. Colaboraciones, chat y ofertas
| Campo | Contenido |
|---|---|
| Finalidad | Gestionar solicitudes, ofertas, condiciones, entregables, aprobaciones, valoraciones y mensajes |
| Personas | Creadores y partners; terceros mencionados en briefs |
| Datos | Textos de brief y mensajes, presupuestos, condiciones, registro de eventos, valoraciones y comentarios |
| Base legal | Ejecución del contrato |
| Destinatarios | La otra parte de la colaboración |
| Plazo | Mientras la otra parte mantenga su cuenta (propuesta) |
| Medidas | RLS por participante; los mensajes solo se insertan mediante funciones controladas |

### T4. Archivos y multimedia
| Campo | Contenido |
|---|---|
| Finalidad | Fotos de perfil y portada, imágenes de publicaciones, archivos de colaboración |
| Datos | Imágenes (≤ 8 MB) en `post-media` (**URL pública**); documentos (≤ 10 MB) en `collab-files` (**privado**, solo participantes) |
| Base legal | Ejecución del contrato |
| Plazo | Propuesta: se borran con la cuenta `[CAMBIO 2]`. Hoy **no** se borran de Storage al eliminar la cuenta |
| Medidas | Tipos MIME y tamaño limitados; carpetas por usuario o colaboración con políticas de acceso |

### T5. Avisos y comunicaciones
| Campo | Contenido |
|---|---|
| Finalidad | Avisos en la aplicación y resumen por correo de avisos sin leer; correos de registro y recuperación |
| Datos | Correo, título y texto de los avisos |
| Base legal | Contrato (avisos en app); interés legítimo (resumen por correo, con baja en cada correo) |
| Destinatarios | Google (SMTP, buzón `info.ciberan@gmail.com`) |
| Plazo | Avisos: 12 meses (propuesta). Correos enviados en el buzón: `[DUDA: política de borrado del buzón]` |
| Medidas | Contraseña de aplicación de Google, solo en variables de entorno y panel de Supabase; baja con enlace firmado |

### T6. Moderación y denuncias
| Campo | Contenido |
|---|---|
| Finalidad | Recibir y resolver denuncias; bloquear cuentas |
| Datos | Denunciante, motivo, detalle, colaboración, estado, nota de resolución |
| Base legal | Interés legítimo; obligación legal en contenido ilícito |
| Plazo | 3 años desde el cierre (propuesta) |
| Medidas | Solo el equipo de administración revisa; para cerrar hay que anotar la decisión |
| Nota | Hoy solo se denuncia dentro de una colaboración `[CAMBIO 4]` |

### T7. Administración y auditoría
| Campo | Contenido |
|---|---|
| Finalidad | Soporte, seguridad, auditoría de acciones del equipo, alertas por correo |
| Datos | Correo y nombre de usuarios (vista de administración), actividad, registro de acciones (`admin_audit_log`: quién, qué, sobre quién) |
| Base legal | Interés legítimo |
| Plazo | Registro de acciones: 2 años (propuesta) |
| Medidas | Panel con cookie `httpOnly` y `SameSite=Strict` de 8 h; cuentas personales con roles; alertas |

### T8. Estadísticas de búsquedas (`discovery_searches`)
| Campo | Contenido |
|---|---|
| Finalidad | Estadísticas internas de uso de Descubrir |
| Datos | Filtros, número de resultados, rol, modo y usuario (`profile_id`, que se anula al borrar la cuenta). **Hoy además se guarda el texto de la búsqueda (`query_text`)**, que sobrevive al borrado de la cuenta. Con el cambio 5b deja de guardarse. `[CAMBIO 5b]` |
| Base legal | Interés legítimo |
| Plazo | Filas desvinculadas al borrar la cuenta; borrado a los 12 meses (propuesta) `[CAMBIO 5]`. El texto de las búsquedas ya guardado en pruebas habría que vaciarlo (requiere permiso expreso por ser base compartida). |
| Nota | El campo de texto libre solo existe en la búsqueda con IA, que estará apagada, así que tras el cambio 0 el texto sería casi siempre nulo. |

### T9. Atención de derechos y bajas
| Campo | Contenido |
|---|---|
| Finalidad | Atender solicitudes de eliminación y otros derechos |
| Datos | Solicitud, motivo (≤ 1000 caracteres), estado, fechas, nombre y correo |
| Base legal | Obligación legal (arts. 15-22 RGPD) |
| Plazo | 3 años desde la resolución (propuesta). Respuesta: máximo 1 mes `[CAMBIO 6]` |

### T10. Seguridad y límites de uso
| Campo | Contenido |
|---|---|
| Finalidad | Frenar abusos y ataques |
| Datos | IP, solo en memoria del servidor |
| Base legal | Interés legítimo |
| Plazo | Ventana corta en memoria; se pierde al reiniciar. Registros del hosting: `[DUDA]` |

### T11. Preferencias de interfaz
Cookie `ciberan-rail-collapsed`, claves de `localStorage` (aviso de bienvenida, recorrido) y cookie de sesión. Datos técnicos o de preferencia; ver la política de cookies.

## Tratamientos previstos, hoy apagados (no operan; no hay datos)

| Tratamiento | Estado | Qué habrá que hacer antes de activarlo |
|---|---|---|
| Cobros con Stripe (`PAYMENTS_ENABLED`) | Apagado | Actualizar privacidad y términos; contrato de encargado; conservación de datos fiscales; evaluar necesidad de nueva aceptación |
| IA en Discover | Apagado `[CAMBIO 0]` | Evaluar proveedor, ubicación, entrenamiento con datos, y actualizar textos |
| Métricas de redes (Instagram, YouTube) | Aplazado; tablas `social_accounts` y `metrics` existen | Verificar que están vacías antes de desplegar; evaluación de impacto si se activa |
| Sentry | Sin DSN en producción | Si se activa: región, sin datos personales, actualizar textos |
| Acceso con Google | Apagado | Actualizar textos |

## Revisión

Revisar este registro: antes de cada despliegue que cambie datos o proveedores, y al menos una vez al año. Fecha de la última revisión: `[FECHA]`.
