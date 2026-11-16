# Textos legales de CIBERAN · borradores para revisión

**Estado: borradores, no publicados.** No están enlazados en la app. Los `.vue` y `app/utils/legal.ts` siguen sin tocar; se actualizan después de la revisión del abogado.

## Contenido

| Archivo | Qué es | Público |
|---|---|---|
| [01-AVISO-LEGAL.md](01-AVISO-LEGAL.md) | Aviso legal (art. 10 LSSI) | Sí |
| [02-POLITICA-DE-PRIVACIDAD.md](02-POLITICA-DE-PRIVACIDAD.md) | Política de privacidad (arts. 13 y 14 RGPD) | Sí |
| [03-POLITICA-DE-COOKIES.md](03-POLITICA-DE-COOKIES.md) | Política de cookies y almacenamiento local | Sí |
| [04-TERMINOS-Y-CONDICIONES.md](04-TERMINOS-Y-CONDICIONES.md) | Términos y condiciones de uso | Sí |
| [PREGUNTAS-PARA-EL-ABOGADO.md](PREGUNTAS-PARA-EL-ABOGADO.md) | Dudas agrupadas, plazos propuestos y verificaciones técnicas | No |
| [internos/REGISTRO-ACTIVIDADES-TRATAMIENTO.md](internos/REGISTRO-ACTIVIDADES-TRATAMIENTO.md) | Registro de actividades de tratamiento (art. 30 RGPD) | No |
| [internos/PROCEDIMIENTO-BRECHA-SEGURIDAD.md](internos/PROCEDIMIENTO-BRECHA-SEGURIDAD.md) | Procedimiento ante brechas (arts. 33-34 RGPD) | No |
| [PASO2-DISCREPANCIAS.md](PASO2-DISCREPANCIAS.md) | Discrepancias texto-app y cambios de código (0 a 7) | No |

## Convenciones de marcas

- `[TITULAR_NOMBRE]`, `[TITULAR_DNI]`, `[TITULAR_DOMICILIO]`, `[EMAIL_CONTACTO]`: datos del titular, pendientes.
- `[DEPENDE DE CAMBIO N]`: la frase solo es cierta cuando se haya hecho el cambio de código N del Paso 2. **No se publica la frase hasta entonces** (o se reescribe).
- `[DUDA: …]`: pregunta concreta; todas están recogidas en `PREGUNTAS-PARA-EL-ABOGADO.md`.
- `(propuesta, a confirmar con el abogado)`: cifra elegida por quien redacta; no es una decisión tomada.
- Los bloques «Nota para el abogado (no publicar)» desaparecen en la versión final.

## Qué cambio de código afecta a qué texto

| Cambio | Resumen | Documentos y apartados afectados |
|---|---|---|
| 0 | Interruptor del modo IA de Discover | Privacidad §9; Términos §10 |
| 1 | Casilla de mayoría de edad | Términos §3; Privacidad §10 |
| 2 | Borrar archivos de Storage al borrar la cuenta | Privacidad §6 y §7 |
| 3 | Imágenes de Unsplash desde nuestro dominio | Aviso legal §4; Cookies §4; Privacidad §5 |
| 4 | Denunciar perfil/contenido + email de contacto legal | Aviso legal §6; Términos §8; Privacidad §8 |
| 5 | Plazos de conservación y purga | Privacidad §6; registro de actividades (T5, T6, T7, T8, T9) |
| 5b | Dejar de guardar el texto de las búsquedas (`discovery_searches`) | Privacidad §2, §4, §6 y §7; registro de actividades (T8) |
| 6 | Plazo definido de respuesta a solicitudes de borrado | Privacidad §7 |
| 7 | Perfiles públicos con `noindex` y texto junto al interruptor | Privacidad §3; Términos §6 |

## Notas de mantenimiento

- **Dominio:** el aviso legal indica `ciberan.com` como pendiente de registrar. Si el dominio se transfiere de registrador (hoy se maneja IONOS en los borradores), actualizar la **Política de privacidad §5** y el **registro de actividades** (encargados y T10).
- **Proveedor de correo:** si se abandona el Gmail actual como remitente (ver pregunta 16), actualizar también Privacidad §5, el apartado de transferencias y el tratamiento T5 del registro.
- **Hosting y región de Supabase:** al decidirlos, rellenar Privacidad §5 y el registro de actividades.

## Antes de publicar

1. Rellenar los datos del titular (y `app/utils/legal.ts`).
2. Haber hecho los cambios de código de los que dependa cada frase, o reescribir la frase.
3. Resolver o aceptar las `[DUDA]` con el abogado.
4. Hacer las verificaciones técnicas de la última sección de `PREGUNTAS-PARA-EL-ABOGADO.md`.
5. Subir `TERMS_VERSION` en `app/utils/legal.ts` para que todos los usuarios acepten los textos nuevos.
