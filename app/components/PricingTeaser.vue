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
          class="relative rounded-card border-2 bg-white p-5"
          :class="plan.tag ? 'border-primary' : 'border-hairline'"
        >
          <div
            v-if="plan.tag"
            class="absolute -top-3 left-5 rounded-pill bg-dark px-2.5 py-1 text-[11px] font-bold text-white"
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

      <div class="mt-7 text-center">
        <NuxtLink to="/abonnement" class="press text-[13.5px] font-semibold text-primary hover:underline">
          Comparer toutes les fonctionnalités des formules →
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
