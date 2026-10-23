/**
 * Clasificación de avisos — hallazgo #2 de la auditoría de usabilidad:
 * "Has iniciado sesión" se mezclaba con solicitudes/ofertas/valoraciones y
 * enterraba lo importante (el límite de 30 avisos de la bandeja podía
 * llenarse entero solo de inicios de sesión durante una sesión de pruebas
 * larga, dejando lo accionable fuera de la vista sin que nadie lo notara).
 *
 * "Actividad": ruido de cuenta, no pide ninguna acción (inicio de sesión,
 * bienvenida). Todo lo demás es "importante" — solicitudes, ofertas,
 * cambios pedidos, aprobaciones, valoraciones, pagos.
 */
export const ACTIVITY_NOTIFICATION_TYPES = ['login', 'welcome'] as const
