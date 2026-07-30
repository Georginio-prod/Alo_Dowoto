<script setup lang="ts">
import { MessageCircle, Search, Users, type LucideIcon } from '@lucide/vue'

const { t } = useI18n({ useScope: 'global' })

interface Step {
  n: number
  icon: LucideIcon
  title: string
  text: string
}

// Une icône par étape (#visuals) : Search (décrire son besoin), Users
// (comparer des profils de prestataires), MessageCircle (échanger/valider) —
// vient compléter le repère numéroté existant, pas le remplacer.
const steps = computed<Step[]>(() => [
  { n: 1, icon: Search, title: t('howItWorks.step1Title'), text: t('howItWorks.step1Text') },
  { n: 2, icon: Users, title: t('howItWorks.step2Title'), text: t('howItWorks.step2Text') },
  { n: 3, icon: MessageCircle, title: t('howItWorks.step3Title'), text: t('howItWorks.step3Text') },
])
</script>

<template>
  <section class="mt-10 border-y border-hairline bg-surface">
    <div class="mx-auto max-w-6xl px-6 py-12">
      <h2 v-reveal class="mb-7 text-center text-xl font-bold text-dark">{{ t('howItWorks.title') }}</h2>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-7">
        <div
          v-for="(step, i) in steps"
          :key="step.n"
          v-reveal
          :style="{ '--reveal-delay': `${i * 80}ms` }"
          class="group px-3 text-center"
        >
          <div class="relative mx-auto mb-3.5 flex size-[42px] items-center justify-center rounded-pill bg-primary text-white transition-transform duration-200 ease-out group-hover:scale-110">
            <component :is="step.icon" :size="20" :stroke-width="2.25" aria-hidden="true" />
            <span
              class="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-pill bg-dark text-[10px] font-bold text-white ring-2 ring-surface"
              aria-hidden="true"
            >
              {{ step.n }}
            </span>
          </div>
          <div class="mb-1.5 text-[15.5px] font-semibold text-dark">
            <span class="sr-only">{{ t('howItWorks.stepAria', { n: step.n }) }}</span>
            {{ step.title }}
          </div>
          <p class="text-[13.5px] leading-relaxed text-muted">{{ step.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
