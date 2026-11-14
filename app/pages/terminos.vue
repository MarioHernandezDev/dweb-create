<script setup lang="ts">
import { legal } from '~/utils/legal'

useHead({ title: 'Términos y condiciones' })
</script>

<template>
  <LegalDocument
    title="Términos y condiciones"
    intro="Las reglas de uso de CIBERAN, una plataforma que conecta a creadores de contenido con marcas y agencias (partners)."
  >
    <h2>1. Quiénes somos</h2>
    <p>
      {{ legal.brand }} es un servicio de <LegalValue :value="legal.ownerName" />, con NIF/CIF <LegalValue :value="legal.ownerTaxId" /> y domicilio en <LegalValue :value="legal.ownerAddress" />.
      <template v-if="legal.registry">Datos registrales: <LegalValue :value="legal.registry" />.</template>
      Contacto: <LegalValue :value="legal.contactEmail" />.
    </p>

    <h2>2. Qué es CIBERAN y qué no</h2>
    <p>CIBERAN facilita que creadores y partners se encuentren, negocien colaboraciones, gestionen publicaciones, se comuniquen y paguen. <strong>CIBERAN es una plataforma intermediaria:</strong> el acuerdo de colaboración es entre el creador y el partner, y CIBERAN no es parte de él ni garantiza resultados, métricas ni que la otra parte cumpla.</p>

    <h2>3. Tu cuenta</h2>
    <ul>
      <li>Debes ser mayor de edad y dar información veraz.</li>
      <li>Eres responsable de la confidencialidad de tu contraseña y de lo que ocurra con tu cuenta.</li>
      <li>Tienes un rol (creador o partner) y solo accedes a las funciones de ese rol.</li>
      <li>Puedes eliminar tu cuenta cuando quieras; ver la <NuxtLink to="/privacidad">política de privacidad</NuxtLink> para el tratamiento de tus datos.</li>
    </ul>

    <h2>4. Uso aceptable</h2>
    <p>No está permitido: suplantar a otras personas, publicar contenido ilegal, engañoso u ofensivo, acosar a otros usuarios, intentar acceder a cuentas ajenas, automatizar el uso para saturar el servicio, ni eludir los límites o medidas de seguridad. Podemos suspender o cerrar cuentas que incumplan estas reglas.</p>

    <h2>5. Contenido y propiedad intelectual</h2>
    <p>Conservas los derechos sobre el contenido que subes. Nos concedes una licencia limitada para alojarlo y mostrarlo dentro de la plataforma con el único fin de prestar el servicio. Los derechos sobre el contenido de una colaboración (uso, exclusividad, duración) los acuerdan entre sí creador y partner. La marca, el diseño y el software de CIBERAN pertenecen a su titular.</p>

    <h2>6. Conexión con redes sociales</h2>
    <p>Por ahora CIBERAN no se conecta con tus cuentas de redes sociales ni lee datos de ellas. Si en el futuro lo ofrece, te lo pediremos de forma expresa y actualizaremos estos términos antes de hacerlo.</p>

    <h2>7. Precios, suscripciones y pagos</h2>
    <ul>
      <li>Hay un plan gratuito y un plan de pago (Pro) para creadores; los precios vigentes se muestran antes de contratar.</li>
      <li>Los pagos se procesan a través de Stripe. CIBERAN no almacena datos de tarjeta.</li>
      <li>La suscripción se renueva automáticamente hasta que la canceles; la cancelación surte efecto al final del periodo ya pagado.</li>
      <li>Pagos de colaboraciones: el partner paga a través de la plataforma y el importe se transfiere al creador. Comisión de la plataforma: <LegalValue :value="legal.platformFee" />.</li>
      <li>Cada parte es responsable de sus propias obligaciones fiscales (IRPF, IVA, alta como autónomo, etc.). CIBERAN no presta asesoramiento fiscal.</li>
      <li>Desistimiento y reembolsos: <LegalValue value="[POR COMPLETAR: política de devoluciones y derecho de desistimiento para consumidores]" /></li>
    </ul>

    <h2>8. Sugerencias y predicciones</h2>
    <p>Las predicciones de rendimiento y las sugerencias generadas con IA son orientativas. No garantizan resultados y no deben sustituir tu criterio profesional.</p>

    <h2>9. Disponibilidad y cambios</h2>
    <p>Procuramos que el servicio esté disponible, pero puede haber interrupciones por mantenimiento o causas ajenas. Podemos modificar o retirar funciones, avisando con antelación razonable cuando afecte de forma importante.</p>

    <h2>10. Responsabilidad</h2>
    <p>En la medida que permita la ley, CIBERAN no responde de los incumplimientos entre creadores y partners, de los resultados de una campaña ni del contenido publicado por los usuarios. Esto no limita derechos que la ley reconozca a los consumidores.</p>
    <p><strong>Fraudes, engaños e incumplimientos entre usuarios.</strong> CIBERAN no verifica la identidad ni la solvencia de las personas y empresas que usan la plataforma más allá de lo que se indique expresamente en su perfil (por ejemplo, una cuenta marcada como verificada), y no es responsable de fraudes, estafas, impagos, suplantaciones o cualquier otro perjuicio causado por un usuario a otro. Tampoco garantiza que una persona vaya a cumplir lo acordado en una colaboración. Antes de aceptar una colaboración, comprueba con quién tratas.</p>
    <p><strong>Qué hacemos con los reportes.</strong> Si un usuario reporta a otro, revisamos lo ocurrido con la información que tengamos y, si procede, podemos avisar, limitar, bloquear o cerrar cuentas. No somos un órgano judicial ni de arbitraje: no podemos obligar a nadie a pagar, entregar o cumplir, ni reclamar ni recuperar importes en nombre de nadie, ni emprender acciones legales por ti. Revisar un reporte no implica asumir responsabilidad por lo reportado ni garantizar un resultado concreto. Si has sufrido un fraude o un perjuicio, puedes acudir a las autoridades competentes (por ejemplo, denunciar ante la Policía o la Guardia Civil) o a un profesional del derecho; podremos facilitar la información que la ley nos exija ante un requerimiento oficial.</p>

    <h2>11. Ley aplicable y jurisdicción</h2>
    <p>Estos términos se rigen por la ley española. Para cualquier conflicto serán competentes <LegalValue :value="legal.jurisdiction" />, sin perjuicio de los fueros que correspondan a los consumidores.</p>

    <h2>12. Cambios en estos términos</h2>
    <p>Podemos actualizar estos términos. Si el cambio es relevante, te lo avisaremos; seguir usando el servicio tras el aviso supone su aceptación. La fecha de la última actualización figura al inicio de esta página.</p>
  </LegalDocument>
</template>
