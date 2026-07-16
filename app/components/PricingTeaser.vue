<script setup lang="ts">
import { PLANS } from '~/data/plans'
</script>

<template>
  <section class="border-y border-hairline bg-surface">
    <div class="mx-auto max-w-6xl px-6 py-14">
      <div class="mb-9 text-center">
        <h2 v-reveal class="mb-2 text-xl font-bold text-dark">Des tarifs simples et transparents</h2>
        <p v-reveal class="mx-auto max-w-xl text-[13.5px] leading-relaxed text-muted">
          Chercher et contacter un prestataire reste <strong class="text-dark">gratuit</strong>. Les prestataires
          choisissent la formule qui correspond au rythme de leur activité.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div
          v-for="(plan, i) in PLANS"
          :key="plan.slug"
          v-reveal
          :style="{ '--reveal-delay': `${i * 80}ms` }"
        >
          <!-- `v-reveal` reste sur ce wrapper : sa règle `[data-reveal].is-visible
          { transform: none }` a la même spécificité CSS que l'utilitaire Tailwind
          `hover:-translate-y-1` — sur le même élément, l'ordre de génération de
          Tailwind peut la faire gagner et bloquer l'effet de survol en
          permanence une fois l'apparition terminée. Le survol vit donc sur cet
          élément interne distinct (comme SectorGrid.vue : wrapper `v-reveal` +
          bouton animé au survol). -->
          <div
            class="relative rounded-card border-2 bg-white p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:shadow-card-md"
            :class="plan.tag ? 'border-primary hover:border-primary' : 'border-hairline hover:border-primary/40'"
          >
            <div
              v-if="plan.tag"
              class="badge-glow absolute -top-3 left-5 rounded-pill bg-dark px-2.5 py-1 text-[11px] font-bold text-white"
            >
              {{ plan.tag }}
            </div>
            <div class="mb-1 text-[13.5px] font-semibold text-dark">{{ plan.name }}</div>
            <div class="mb-1">
              <span class="text-xl font-extrabold text-dark">{{ plan.priceLabel }}</span>
              <span class="text-[12.5px] text-muted">{{ plan.period }}</span>
            </div>
            <div class="text-[12px] text-muted">{{ plan.note }}</div>
          </div>
        </div>
      </div>

      <div class="mt-7 text-center">
        <NuxtLink to="/formules" class="press text-[13.5px] font-semibold text-primary hover:underline">
          Comparer toutes les fonctionnalités des formules →
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
