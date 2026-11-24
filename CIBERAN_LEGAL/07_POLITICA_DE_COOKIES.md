# POLÍTICA DE COOKIES Y ALMACENAMIENTO LOCAL — CIBERAN

> **BORRADOR NO PUBLICABLE · v0.1 · 24-nov-2026.** Requiere revisión profesional (**ASE**). Los nombres y duraciones de las cookies deben **comprobarse en un navegador** antes de publicar (**V06**).
> **Dos ámbitos:** (A) la **web de presentación** `ciberan.com` (existe y usa analítica con consentimiento) y (B) la **aplicación** (no desplegada; criterio de la decisión **D13**).
> **Alcance provisional:** usuarios en España (**D22 pendiente**).
> **Etiquetas:** **[OLC]** obligación legal confirmada · **[REC]** recomendación · **[ASE]** pendiente de asesor.

---

## TEXTO PARA PUBLICAR (borrador)

**Última actualización:** `[POR COMPLETAR]` · **Versión:** 0.1

### 1. Qué son las cookies y el almacenamiento local
Son pequeños archivos o datos que una página guarda en tu dispositivo. Esta política cubre las **cookies** y también el **almacenamiento local** del navegador (`localStorage`, `sessionStorage` y similares), que se tratan igual a efectos de información y consentimiento.

### 2. Quién es el responsable
Los titulares de CIBERAN, como corresponsables (ver el [Aviso legal] y la [Política de privacidad]).

### 3. Qué usamos

#### A. Web de presentación (`ciberan.com`)
| Nombre | Tipo | Origen | Finalidad | Duración | ¿Necesita consentimiento? |
|---|---|---|---|---|---|
| `ciberan-consent` | Almacenamiento local (técnico) | Propia | Recordar si aceptaste o rechazaste la analítica | 12 meses | **No** (necesario para respetar tu elección) |
| `_ga` | Cookie de analítica | Google Analytics (vía Google Tag Manager) | Distinguir visitantes de forma anónima para medir el uso | `[POR COMPLETAR: comprobar; documentación de Google: 2 años]` | **Sí** |
| `_ga_<ID>` | Cookie de analítica | Google Analytics | Mantener el estado de la sesión de medición | `[POR COMPLETAR: comprobar]` | **Sí** |

- **Solo se instalan las cookies de analítica si las aceptas.** Si no eliges, **no se activa nada**.
- **No usamos cookies de publicidad.**
- `[POR COMPLETAR: identificar la función del script /.netlify/scripts/hud del alojamiento y, si guarda o lee datos en tu dispositivo, incluirlo aquí — V05]`.

#### B. Aplicación (cuando se abra)
**Criterio adoptado (D13): en el dispositivo solo se guarda lo necesario para mantener tu sesión.** Todo lo demás (tutorial, avisos cerrados, preferencias y borradores) se guarda en **tu cuenta en nuestros servidores**, no en tu dispositivo.
| Elemento | Tipo | Finalidad | Duración | ¿Necesita consentimiento? |
|---|---|---|---|---|
| Sesión de autenticación (`[POR COMPLETAR: nombres exactos, p. ej. sb-<proyecto>-auth-token — V06]`) | Cookie o almacenamiento del proveedor de autenticación | Mantenerte conectado y proteger tu cuenta | `[POR COMPLETAR: duración real de la sesión]` | **No**: **estrictamente necesario** para el servicio que solicitas |
| Cookie de seguridad CSRF u otras técnicas del servidor `[POR COMPLETAR si existen]` | Técnica | Seguridad | Sesión | **No** |

**No usamos** cookies de analítica ni de publicidad en la aplicación. **Si en el futuro lo hiciéramos, te pediremos consentimiento antes** y actualizaremos esta política.

### 4. Cómo gestionar tu elección
- **Primera visita:** te preguntamos si aceptas la analítica. «**Aceptar todas**», «**Rechazar todas**» y «**Configurar**» se muestran con **el mismo peso**.
- **Cambiar o retirar el consentimiento:** en cualquier momento desde el enlace «**Configurar cookies**» del pie de página. Al retirarlo, **se borran** las cookies de analítica.
- **Desde tu navegador:** puedes bloquear o borrar cookies en sus ajustes (las instrucciones dependen de cada navegador).
- La elección se recuerda **12 meses**; después te la volveremos a pedir.

### 5. Transferencias
Google Analytics y Google Tag Manager implican a Google Ireland Limited y Google LLC. `[POR COMPLETAR: transferencia y garantías (Marco de Privacidad UE–EE. UU.); verificar certificación vigente — V07]`. Más información en la [Política de privacidad].

### 6. Cambios
Actualizaremos esta política cuando cambien las cookies o el almacenamiento que usamos; la versión y la fecha figuran al principio.

---

## NOTAS DE REDACCIÓN (no publicar)

| Punto | Tipo | Fuente / estado | Pendiente |
|---|---|---|---|
| Consentimiento previo para almacenar o leer datos en el dispositivo, salvo lo estrictamente necesario | **[OLC]** | LSSI-CE art. 22.2 [B] (resumen oficial; **confirmar literal**) | **[ASE]** |
| Aceptar y rechazar con el mismo peso; «Rechazar» en primera capa | **[REC]** / criterio AEPD | Guía de cookies AEPD, julio 2023 [C]; no leída directamente | Citar apartado exacto tras leerla |
| Sesión exenta (necesaria para el servicio solicitado) | **[IJR fuerte]** | LSSI 22.2 [B] | Comprobar nombres y duración (V06) |
| Tutorial, avisos y borradores **fuera del dispositivo** | **Decisión D13** | Cerrada; **cambio técnico pendiente (Fase 6)** | **No publicar el bloque B hasta implantarlo**; si no se implanta, listar `ciberan:tour`, `ciberan:launch-notice`, `ciberan:post-draft` y la clave antigua de búsquedas con su finalidad y analizar su exención |
| Landing: flujo completo aceptar / rechazar / retirar | Hecho por verificar | V06 (estado inicial sin cookies **comprobado el 24-nov**; el resto no) | Probar con herramienta de red |
| Script `hud` de Netlify | Dato por verificar | V05 | — |
| Sanciones | Informativo | LSSI arts. 38–39 [B]: infracción **leve** por cookies sin información o consentimiento, hasta 30.000 € | — |
| Sentry (si se activa) | Dato por verificar | V09 | Comprobar si escribe en el dispositivo |
