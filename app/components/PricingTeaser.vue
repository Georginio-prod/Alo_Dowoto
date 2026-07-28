<script setup lang="ts">
import { PLANS } from '~/data/plans'

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <section class="border-y border-hairline bg-surface">
    <div class="mx-auto max-w-6xl px-6 py-14">
      <div class="mb-9 text-center">
        <h2 v-reveal class="mb-2 text-xl font-bold text-dark">{{ t('pricingTeaser.title') }}</h2>
        <i18n-t
          v-reveal
          keypath="pricingTeaser.description"
          tag="p"
          class="mx-auto max-w-xl text-[13.5px] leading-relaxed text-muted"
        >
          <template #free><strong class="text-dark">{{ t('pricingTeaser.descriptionFree') }}</strong></template>
        </i18n-t>
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div
          v-for="(plan, i) in PLANS"
          :key="plan.slug"
          v-reveal
          :style="{ '--reveal-delay': `${i * 80}ms` }"
        >
          <!-- `v-reveal` reste sur ce wrapper : sa règle `[data-reveal].is-visible
          { transform: none }` a la même spécificité CSS que les utilitaires
          Tailwind `hover:*` — sur le même élément, l'ordre de génération de
          Tailwind peut la faire gagner et bloquer l'effet de survol en
          permanence une fois l'apparition terminée. Le survol vit donc sur cet
          élément interne distinct (comme SectorGrid.vue : wrapper `v-reveal` +
          bouton animé au survol), via l'utilitaire `.card-hover` (main.css)
          qui centralise la charte de mouvement (#184) : un seul `transform`
          combiné + une seule courbe d'easing, survol actif uniquement sur les
          pointeurs qui le supportent (`hover: hover`), avec un équivalent
          `:active` pour le tap tactile. -->
          <div
            class="card-hover relative rounded-card border-2 bg-white p-5"
            :class="plan.hasTag ? 'border-primary hover:border-primary active:border-primary' : 'border-hairline hover:border-primary/40 active:border-primary/40'"
          >
            <div
              v-if="plan.hasTag"
              class="badge-glow absolute -top-3 left-5 rounded-pill bg-dark px-2.5 py-1 text-[11px] font-bold text-white"
            >
              {{ t(`plans.${plan.slug}.tag`) }}
            </div>
            <div class="mb-1 text-[13.5px] font-semibold text-dark">{{ t(`plans.${plan.slug}.name`) }}</div>
            <div class="mb-1">
              <span class="text-xl font-extrabold text-dark">{{ plan.priceLabel }}</span>
              <span class="text-[12.5px] text-muted">{{ t(`plans.${plan.slug}.period`) }}</span>
            </div>
            <div class="text-[12px] text-muted">{{ t(`plans.${plan.slug}.note`) }}</div>
          </div>
        </div>
      </div>

      <div class="mt-7 text-center">
        <NuxtLink to="/formules" class="press text-[13.5px] font-semibold text-primary hover:underline">
          {{ t('pricingTeaser.compareLink') }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
