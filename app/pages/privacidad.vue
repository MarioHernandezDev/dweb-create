<script setup lang="ts">
import { legal } from '~/utils/legal'

useHead({ title: 'Política de privacidad' })
</script>

<template>
  <LegalDocument
    title="Política de privacidad"
    intro="Qué datos tratamos en FEEDMA, para qué, con quién los compartimos y cómo puedes ejercer tus derechos."
  >
    <h2>1. Responsable del tratamiento</h2>
    <ul>
      <li><strong>Titular:</strong> <LegalValue :value="legal.ownerName" /></li>
      <li><strong>NIF/CIF:</strong> <LegalValue :value="legal.ownerTaxId" /></li>
      <li><strong>Domicilio:</strong> <LegalValue :value="legal.ownerAddress" /></li>
      <li><strong>Contacto:</strong> <LegalValue :value="legal.contactEmail" /></li>
    </ul>

    <h2>2. Qué datos tratamos</h2>
    <ul>
      <li><strong>Cuenta:</strong> nombre, email, contraseña (almacenada cifrada, nunca en claro) y rol (creador o partner).</li>
      <li><strong>Perfil:</strong> foto, descripción, nicho, ubicación y demás datos que decidas añadir y mostrar.</li>
      <li><strong>Actividad en la plataforma:</strong> solicitudes de colaboración, ofertas, publicaciones, mensajes de chat, notificaciones y valoraciones.</li>
      <li><strong>Redes sociales conectadas:</strong> si conectas una cuenta (Instagram, YouTube u otras), guardamos su identificador, métricas públicas y el token de acceso, que se almacena cifrado.</li>
      <li><strong>Pagos:</strong> el estado y el importe de suscripciones y colaboraciones. Los datos de tarjeta los gestiona Stripe; FEEDMA no los recibe ni los guarda.</li>
      <li><strong>Datos técnicos:</strong> dirección IP y registros del servidor para seguridad y prevención de abusos.</li>
    </ul>

    <h2>3. Para qué y con qué base legal</h2>
    <ul>
      <li><strong>Prestar el servicio</strong> (crear tu cuenta, conectar creadores con partners, chat, publicaciones, pagos): ejecución del contrato.</li>
      <li><strong>Seguridad y prevención del fraude</strong> (límites de uso, revisión de abusos): interés legítimo.</li>
      <li><strong>Sugerencias y predicciones</strong> sobre tu contenido: ejecución del contrato; las sugerencias de IA son orientativas y no producen efectos jurídicos sobre ti.</li>
      <li><strong>Conectar tus redes sociales:</strong> tu consentimiento, que puedes retirar desconectando la cuenta en cualquier momento.</li>
      <li><strong>Obligaciones legales</strong> (fiscales y contables sobre pagos): obligación legal.</li>
    </ul>

    <h2>4. Con quién compartimos tus datos</h2>
    <p>Solo con los proveedores necesarios para prestar el servicio, que actúan como encargados del tratamiento:</p>
    <ul>
      <li><strong>Supabase:</strong> base de datos, autenticación y almacenamiento de archivos.</li>
      <li><strong>Stripe:</strong> cobros, suscripciones y pagos a creadores.</li>
      <li><strong>Meta (Instagram) y Google (YouTube):</strong> solo si conectas esas cuentas, para leer los datos que autorices.</li>
      <li><strong>OpenRouter:</strong> proveedor del modelo de IA para las sugerencias. Solo se le envía el texto necesario de la consulta, no tu email ni tus credenciales.</li>
      <li><strong>Proveedor de alojamiento:</strong> <LegalValue value="[POR COMPLETAR: dónde se despliega la aplicación]" /></li>
    </ul>
    <p>Algunos de estos proveedores pueden estar fuera del Espacio Económico Europeo; en ese caso se apoyan en garantías adecuadas como las cláusulas contractuales tipo. No vendemos tus datos.</p>
    <p>Los datos de tu perfil que decidas hacer visibles, y el contenido que compartas en chats y colaboraciones, los verán las otras personas implicadas.</p>

    <h2>5. Cuánto tiempo los conservamos</h2>
    <p>Mientras mantengas la cuenta. Si la eliminas, borramos tus datos personales, salvo los que la ley nos obliga a conservar (datos fiscales y de pagos durante <LegalValue :value="legal.fiscalRetention" />), que se mantienen bloqueados y solo para ese fin.</p>

    <h2>6. Tus derechos</h2>
    <p>Puedes solicitar el acceso, la rectificación, la supresión, la oposición, la limitación del tratamiento y la portabilidad de tus datos escribiendo a <LegalValue :value="legal.contactEmail" />. Responderemos en el plazo legal de un mes.</p>
    <p>Si consideras que no hemos tratado tus datos correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).</p>

    <h2>7. Cookies y almacenamiento local</h2>
    <p>Usamos únicamente almacenamiento técnico necesario para mantener tu sesión iniciada y recordar preferencias de la interfaz. No usamos cookies de publicidad ni de seguimiento de terceros. Si en el futuro se añadiera analítica o publicidad, pediremos tu consentimiento previo.</p>

    <h2>8. Menores</h2>
    <p>El servicio está dirigido a mayores de edad. Si detectamos una cuenta de un menor sin autorización, la eliminaremos.</p>

    <h2>9. Cambios en esta política</h2>
    <p>Si cambiamos algo relevante, lo avisaremos en la plataforma o por email. La fecha de la última actualización figura al inicio de esta página.</p>
  </LegalDocument>
</template>
