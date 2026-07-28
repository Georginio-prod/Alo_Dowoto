<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

interface Step {
  n: number
  title: string
  text: string
}

const steps = computed<Step[]>(() => [
  { n: 1, title: t('howItWorks.step1Title'), text: t('howItWorks.step1Text') },
  { n: 2, title: t('howItWorks.step2Title'), text: t('howItWorks.step2Text') },
  { n: 3, title: t('howItWorks.step3Title'), text: t('howItWorks.step3Text') },
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
          <div class="mx-auto mb-3.5 flex size-[42px] items-center justify-center rounded-pill bg-primary text-[17px] font-bold text-white transition-transform duration-200 ease-out group-hover:scale-110">
            {{ step.n }}
          </div>
          <div class="mb-1.5 text-[15.5px] font-semibold text-dark">{{ step.title }}</div>
          <p class="text-[13.5px] leading-relaxed text-muted">{{ step.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
