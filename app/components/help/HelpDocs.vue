<script setup lang="ts">
import { helpDocs } from '~/utils/help-docs'
</script>

<template>
  <section id="manuales" class="band band--paper" aria-labelledby="manuales-title">
    <div class="container">
      <h2 id="manuales-title" class="band__title">Elige tu guía.</h2>
      <p class="band__intro">Son PDF gratuitos, sin registro. Si ya tienes cuenta, también te ayudan a sacar más partido a cada pantalla.</p>

      <ul class="helpdocs" data-help-docs>
        <li v-for="doc in helpDocs" :key="doc.id" class="helpdoc" :data-help-doc="doc.id">
          <BaseCard padding="lg" class="helpdoc__card">
            <div class="helpdoc__head">
              <span class="helpdoc__icon" aria-hidden="true"><Icon :name="doc.icon" class="size-6" /></span>
              <Chip size="sm" tint="voltio">Para: {{ doc.audience }}</Chip>
            </div>
            <h3 class="helpdoc__title">{{ doc.title }}</h3>
            <p class="helpdoc__text">{{ doc.description }}</p>
            <ul class="helpdoc__list">
              <li v-for="h in doc.highlights" :key="h">
                <Icon name="ph:check-bold" class="size-4 shrink-0" aria-hidden="true" />{{ h }}
              </li>
            </ul>
            <div class="helpdoc__foot">
              <a :href="doc.href" :download="doc.filename" class="btn btn--primary btn--md" data-help-download>
                <Icon name="ph:download-simple-bold" class="btn__icon" aria-hidden="true" />
                <span>Descargar PDF</span>
              </a>
              <p class="helpdoc__meta">PDF · {{ doc.pages }} páginas · {{ doc.version }}</p>
            </div>
          </BaseCard>
        </li>
      </ul>
    </div>
  </section>
</template>
