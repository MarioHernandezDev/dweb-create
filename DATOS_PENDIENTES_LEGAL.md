# Datos pendientes para completar la documentación legal de CIBERAN

> Rama `feat/pronto` (web de pre-lanzamiento, carpeta `coming-soon/`). Mientras queden marcadores `[COMPLETAR: …]` visibles, **las páginas legales no están listas para publicar**. Los textos son un borrador técnico, no una certificación legal: debe revisarlos un profesional en protección de datos.

**Pregunta clave:** ¿operas como **autónomo (persona física)**, **sociedad limitada** u otra forma jurídica? Cambia qué datos son obligatorios (ver «Depende» abajo). Tampoco se ha dado por hecho que exista sociedad.

## 1. Aviso legal (`/aviso-legal`)

| Dato que necesito proporcionar | Para qué se utiliza | Dónde aparece | ¿Obligatorio? | Ejemplo de formato |
|---|---|---|---|---|
| Nombre y apellidos del titular (o denominación social) | Identificar al prestador (art. 10 LSSI-CE) | Aviso legal §1; Privacidad §1 | **Imprescindible** | `Nombre Apellido Apellido` / `Empresa, S.L.` |
| Forma jurídica | Indicar si es autónomo o sociedad | Aviso legal §1; Privacidad §1 | **Imprescindible** | `Autónomo` / `Sociedad Limitada` |
| NIF o CIF | Art. 10 LSSI-CE | Aviso legal §1 | **Imprescindible** | `12345678Z` / `B12345678` |
| Domicilio fiscal (o del establecimiento) | Art. 10 LSSI-CE | Aviso legal §1; Privacidad §1 | **Imprescindible** | `C/ Ejemplo 1, 2ºA, 28001 Madrid` |
| Correo electrónico de contacto | Comunicación directa con el titular (art. 10 LSSI-CE) y ejercicio de derechos | Aviso legal §1 y §5; Privacidad §1 y §6 | **Imprescindible** | `hola@ciberan.com` |
| Datos de inscripción en el Registro Mercantil (tomo, folio, hoja) | Art. 10 LSSI-CE | Aviso legal §1 | **Depende:** solo si es sociedad (o autónomo inscrito) | `Reg. Mercantil de Madrid, Tomo 1, Folio 2, Hoja M-3` |
| Teléfono | Contacto adicional | Aviso legal §1 (no incluido ahora) | Opcional | `+34 600 000 000` |

## 2. Política de privacidad (`/privacidad`)

| Dato que necesito proporcionar | Para qué se utiliza | Dónde aparece | ¿Obligatorio? | Ejemplo |
|---|---|---|---|---|
| Responsable del tratamiento (= titular) | Art. 13 RGPD | Privacidad §1 | **Imprescindible** (mismo dato que el aviso legal) | — |
| Correo para derechos RGPD | Ejercicio de derechos | Privacidad §6 | **Imprescindible** | `privacidad@ciberan.com` |
| Datos del delegado de protección de datos | Art. 37 RGPD | No incluido | **Depende:** casi seguro que no hace falta; confírmalo con un profesional | — |
| Confirmar que el único tratamiento es analítica, logs de Netlify y correos entrantes | Que el texto no invente ni omita tratamientos | Privacidad §2-§5 | **Imprescindible** (revisar) | Sí / No: añadir si hay otro |
| Confirmar plan y región de Netlify y que aceptaste su DPA | Transferencias internacionales | Privacidad §4 | **Depende** | — |

## 3. Política de cookies (`/cookies`)

| Dato que necesito proporcionar | Para qué se utiliza | Dónde aparece | ¿Obligatorio? | Ejemplo |
|---|---|---|---|---|
| Nombre real de la cookie `_ga_<ID>` (ID de medición sin «G-») | Documentar la cookie exacta | Cookies §2 | **Imprescindible tras activar GA4**: compruébalo en DevTools → Application → Cookies | `_ga_ABC123XYZ4` |
| Confirmar duración de cookies en tu propiedad | Que la tabla refleje la realidad | Cookies §2 | **Imprescindible** (verificar) | 2 años por defecto en GA4 |
| Cualquier otra etiqueta añadida en GTM | No ocultar cookies no declaradas | Cookies §2 | **Depende:** solo si añades etiquetas | — |

## 4. Configuración de Google Analytics

| Dato | Para qué | Dónde se introduce | ¿Obligatorio? | Ejemplo |
|---|---|---|---|---|
| ID de contenedor GTM | Cargar la etiqueta tras consentir | `coming-soon/js/config.js` → `gtmId` | **Depende:** ya configurado `GTM-WNBKBFNZ`; confirma que es tuyo | `GTM-XXXXXXX` |
| ID de medición GA4 | Cargar GA4 directamente (si no usas GTM) | `coming-soon/js/config.js` → `ga4Id` (deja `gtmId` vacío) | **Depende:** solo si no usas GTM | `G-XXXXXXXXXX` |
| Retención de datos en GA4 | Coherencia con la política (14 meses) | GA4 → Administrar → Recopilación de datos → Retención | **Imprescindible** (cambiar de 2 a 14 meses) | 14 meses |
| Aceptar condiciones de tratamiento de datos de Google | Contrato como encargado | GA4 → Administrar → Configuración de la cuenta | **Imprescindible** | — |

Los ID de medición son públicos; no son secretos. No pongas nunca claves privadas en el repositorio.
