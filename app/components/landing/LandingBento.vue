<script setup lang="ts">
import { coverPhotos, localPhotos } from '~/utils/images'

const creator = coverPhotos.creator
const metrics = localPhotos.metrics
</script>

<template>
  <section class="band band--sunken">
    <div class="container">
      <div class="band__head reveal">
        <h2 class="band__title">Una entrega, cuatro miradas.</h2>
        <p class="band__intro">Lo mismo se ve distinto según quién lo mira. CIBERAN lo enseña todo a la vez.</p>
      </div>

      <div class="bento">
        <article class="bento__tile bento__tile--a reveal">
          <NuxtImg
            provider="unsplash" :src="creator.id" :alt="creator.alt" fit="crop" :width="1000" :height="700"
            :quality="78" format="webp" class="bento__photo" loading="lazy"
          />
          <p class="bento__caption">El creador marca el ritmo de la semana: qué se graba y cuándo.</p>
        </article>

        <article class="bento__tile bento__tile--b bento__tile--text bento__tile--menta reveal">
          <PhaseChip status="ready_for_review" class="self-start" />
          <p class="bento__text-title">La marca revisa y aprueba antes de que salga nada.</p>
        </article>

        <article class="bento__tile bento__tile--c bento__tile--text bento__tile--lila reveal">
          <span class="chip chip--outline self-start">Predicción de éxito</span>
          <p class="bento__text-title">Antes de publicar, una estimación de cómo puede funcionar cada pieza.</p>
        </article>

        <article class="bento__tile bento__tile--d reveal">
          <NuxtImg
            :src="metrics.src" :alt="metrics.alt" fit="cover" :width="1000" :height="700"
            :quality="78" format="webp" class="bento__photo" loading="lazy"
          />
          <p class="bento__caption">Y la marca ve crecer el resultado real, no una maqueta.</p>
        </article>
      </div>
    </div>
  </section>
</template>
