# Tests de extremo a extremo (Playwright)

Navegador real (Chrome del sistema, `channel: 'chrome'`: no se descarga nada). Tres capas de test en el proyecto:

| Capa | Comando | Qué cubre | ¿CI? |
|---|---|---|---|
| Unitarios | `npm test` | Lógica pura (`app/utils`, composables) | Sí |
| Integración | `npm run test:integration` | RLS, funciones y permisos contra Supabase | No (base compartida) |
| E2E | `npm run test:e2e` | Flujos reales en el navegador | No (base compartida) |

## Ejecutar

```bash
npm run test:e2e:public   # sin cuentas: landing, login, guardas de ruta, móvil
npm run test:e2e          # todo; los autenticados se saltan solos si faltan credenciales
npm run test:e2e:report   # abre el informe HTML (trazas y capturas de los fallos)
```

La app se reutiliza si ya corre en `localhost:3000`; si no, Playwright lanza `npm run dev`.

## Cuentas de prueba

Crea `.env.e2e` (ignorado por git; **nunca** lo subas) con cuentas de PRUEBA, una por rol:

```
E2E_CREATOR_EMAIL=...
E2E_CREATOR_PASSWORD=...
E2E_PARTNER_EMAIL=...
E2E_PARTNER_PASSWORD=...
```

`collaboration.partner.spec.ts` además usa `SUPABASE_SERVICE_ROLE_KEY` del `.env` para sembrar solicitudes (mismo patrón que `tests/integration/chat-fixture.ts`).

## Qué escriben

Solo filas con prefijo `[E2E]` (imágenes de biblioteca, paquetes, solicitudes) y las borran al terminar, incluso si el test falla. Aun así, la base es la compartida: no los lances en mitad de una demo.

## Cobertura

- **public**: landing sin errores JS, login (vacío / credenciales erróneas), «olvidé mi contraseña», legales, redirección a login de rutas protegidas, sin scroll horizontal a 375 px.
- **creator**: inicio, guarda de rol, 404, sesión tras recargar, paleta Ctrl+K, biblioteca (subir, validar, renombrar/etiquetar, deshacer, borrar), paquetes (crear/borrar, validación), móvil.
- **partner**: inicio, guarda de rol, solicitudes, paleta (sin rutas del creador), móvil.
- **collaboration.partner**: rechazar (con cancelar), aceptar y búsqueda de la solicitud en la paleta.

## Pendiente de automatizar

Negociación completa con contraoferta entre dos sesiones, chat en tiempo real, calendario con arrastrar, plantillas de publicación y borrado de pieza con colaboración. Todo eso se ha probado a mano.
