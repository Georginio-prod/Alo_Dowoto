<script setup lang="ts">
interface Step {
  n: number
  title: string
  text: string
}

const steps: Step[] = [
  {
    n: 1,
    title: 'Décrivez votre besoin',
    text: 'Recherchez un secteur ou tapez directement ce que vous cherchez.',
  },
  {
    n: 2,
    title: 'Comparez les prestataires',
    text: 'Consultez profils, avis et tarifs indicatifs près de chez vous.',
  },
  {
    n: 3,
    title: 'Contactez et faites-vous aider',
    text: 'Échangez directement avec le prestataire et validez la prestation.',
  },
]
</script>

<template>
  <section class="mt-10 border-y border-hairline bg-surface">
    <div class="mx-auto max-w-6xl px-6 py-12">
      <h2 v-reveal class="mb-7 text-center text-xl font-bold text-dark">Comment ça marche</h2>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-7">
        <div
          v-for="(step, i) in steps"
          :key="step.n"
          v-reveal
          :style="{ '--reveal-delay': `${i * 80}ms` }"
          class="px-3 text-center"
        >
          <div class="mx-auto mb-3.5 flex size-[42px] items-center justify-center rounded-pill bg-primary text-[17px] font-bold text-white">
            {{ step.n }}
          </div>
          <div class="mb-1.5 text-[15.5px] font-semibold text-dark">{{ step.title }}</div>
          <p class="text-[13.5px] leading-relaxed text-muted">{{ step.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
