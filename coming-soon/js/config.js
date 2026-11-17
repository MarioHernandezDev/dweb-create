// CIBERAN · configuración pública de analítica (estos IDs NO son secretos).
// Esta web es estática y no tiene paso de compilación, por eso el ID se pone aquí
// y no en una variable de entorno. Nunca pongas aquí claves privadas ni secretos de API.
//
// Opción A (actual): Google Tag Manager. La etiqueta de GA4 se gestiona en el contenedor.
// Opción B: GA4 directo. Deja gtmId vacío ("") y pon tu ID de medición en ga4Id (G-XXXXXXXXXX).
// Si ambos están vacíos, no se carga nada de Google.
window.CIBERAN_CONFIG = {
  gtmId: "GTM-WNBKBFNZ",
  ga4Id: ""
};
