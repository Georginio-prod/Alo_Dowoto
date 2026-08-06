<script setup lang="ts">
/**
 * Bac à sable chercheur — « Essayer sans risque » (#tutoriel-onboarding — Partie D).
 *
 * Démonstration réellement manipulable sur des données FICTIVES, isolée :
 * **aucun appel API, aucune écriture en base, aucun service de paiement**. Tout
 * l'état vit dans des refs locales et l'estimation est calculée côté client.
 * Bandeau « Mode démonstration » permanent, sortie possible à tout moment, et
 * à la fin un renvoi vers l'action réelle. Un utilisateur qui a « payé » une
 * fois en démo ose payer pour de vrai.
 */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t, locale } = useI18n({ useScope: 'global' })

const { track } = useAnalytics()
onMounted(() => track('sandbox_enter', { role: 'client' }))

const TOTAL_STEPS = 5
const step = ref(0)

// --- Données fictives + tarification locale (jamais d'API) ---
type Problem = 'leak' | 'power' | 'clean'
const problem = ref<Problem>('leak')
const urgent = ref(false)
const hours = ref(2)
type Plan = 'essential' | 'recommended' | 'complete'
const plan = ref<Plan>('recommended')

const BASE_PER_HOUR: Record<Problem, number> = { leak: 4000, power: 5000, clean: 2500 }
const PLAN_MULT: Record<Plan, number> = { essential: 1, recommended: 1.15, complete: 1.35 }

const subtotal = computed(() => BASE_PER_HOUR[problem.value] * hours.value)
const withUrgency = computed(() => Math.round(subtotal.value * (urgent.value ? 1.3 : 1)))
const total = computed(() => Math.round(withUrgency.value * PLAN_MULT[plan.value]))

function fmt(n: number): string {
  return `${new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'fr-FR').format(n)} FCFA`
}
const estimateLow = computed(() => fmt(Math.round(withUrgency.value * 0.95)))
const estimateHigh = computed(() => fmt(Math.round(withUrgency.value * 1.25)))

const PROBLEMS: Problem[] = ['leak', 'power', 'clean']
const PLANS: Plan[] = ['essential', 'recommended', 'complete']

function setHours(delta: number) {
  hours.value = Math.min(8, Math.max(1, hours.value + delta))
}
function next() {
  if (step.value < TOTAL_STEPS - 1) step.value += 1
}
function exit() {
  navigateTo('/comment-ca-marche')
}
</script>

<template>
  <div class="min-h-screen bg-bg">
    <!-- Bandeau « Mode démonstration » permanent. -->
    <div class="sticky top-0 z-20 flex items-center gap-2 bg-dark px-4 py-2.5 text-white" style="padding-top: calc(env(safe-area-inset-top) + 0.625rem);">
      <span class="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-[11px] font-bold" aria-hidden="true">i</span>
      <p class="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{{ t('demo.banner') }}</p>
      <button type="button" class="press shrink-0 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25" @click="exit">
        {{ t('demo.exit') }}
      </button>
    </div>

    <div class="mx-auto max-w-[560px] px-5 pb-32 pt-5">
      <p v-if="step < TOTAL_STEPS - 1" class="mb-4 text-xs font-semibold text-primary">{{ t('demo.stepOf', { current: step + 1, total: TOTAL_STEPS - 1 }) }}</p>

      <!-- 0 — Fiche préalable fictive + estimation en direct. -->
      <section v-if="step === 0">
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demo.form.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ t('demo.form.subtitle') }}</p>

        <p class="mb-2 mt-5 text-[13px] font-bold text-dark">{{ t('demo.form.problemLabel') }}</p>
        <div class="grid grid-cols-3 gap-2.5">
          <button
            v-for="p in PROBLEMS" :key="p" type="button"
            class="press rounded-card border p-3 text-center"
            :class="problem === p ? 'border-primary bg-primary/5' : 'border-hairline bg-surface'"
            @click="problem = p"
          >
            <span class="block text-2xl" aria-hidden="true">{{ p === 'leak' ? '🚰' : p === 'power' ? '💡' : '🧹' }}</span>
            <span class="mt-1 block text-[12px] font-semibold text-dark">{{ t(`demo.form.${p}`) }}</span>
          </button>
        </div>

        <p class="mb-2 mt-5 text-[13px] font-bold text-dark">{{ t('demo.form.urgencyLabel') }}</p>
        <div class="grid grid-cols-2 gap-2.5">
          <button type="button" class="press rounded-pill border py-2.5 text-[13px] font-semibold" :class="urgent ? 'border-primary bg-primary/5 text-primary' : 'border-hairline bg-surface text-dark'" @click="urgent = true">{{ t('demo.form.urgent') }}</button>
          <button type="button" class="press rounded-pill border py-2.5 text-[13px] font-semibold" :class="!urgent ? 'border-primary bg-primary/5 text-primary' : 'border-hairline bg-surface text-dark'" @click="urgent = false">{{ t('demo.form.notUrgent') }}</button>
        </div>

        <p class="mb-2 mt-5 text-[13px] font-bold text-dark">{{ t('demo.form.hoursLabel') }}</p>
        <div class="flex items-center gap-4">
          <button type="button" class="press grid size-11 place-items-center rounded-full border border-hairline bg-surface text-xl font-bold text-dark" :aria-label="'-1'" @click="setHours(-1)">−</button>
          <span class="min-w-[3ch] text-center text-lg font-bold text-dark">{{ t('demo.form.hours', { n: hours }) }}</span>
          <button type="button" class="press grid size-11 place-items-center rounded-full border border-hairline bg-surface text-xl font-bold text-dark" :aria-label="'+1'" @click="setHours(1)">+</button>
        </div>
      </section>

      <!-- 1 — Choix de formule. -->
      <section v-else-if="step === 1">
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demo.plan.title') }}</h1>
        <div class="mt-5 space-y-2.5">
          <button
            v-for="p in PLANS" :key="p" type="button"
            class="press flex w-full items-center gap-3 rounded-card border p-4 text-left"
            :class="plan === p ? 'border-primary bg-primary/5' : 'border-hairline bg-surface'"
            @click="plan = p"
          >
            <span class="grid size-5 shrink-0 place-items-center rounded-full border-2" :class="plan === p ? 'border-primary' : 'border-hairline'">
              <span v-if="plan === p" class="size-2.5 rounded-full bg-primary" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="text-[14.5px] font-bold text-dark">{{ t(`demo.plan.${p}`) }}</span>
                <span v-if="p === 'recommended'" class="rounded-pill bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">★</span>
              </span>
              <span class="mt-0.5 block text-[12.5px] text-muted">{{ t(`demo.plan.${p}Desc`) }}</span>
            </span>
            <span class="shrink-0 text-[14px] font-extrabold text-primary">{{ fmt(Math.round(withUrgency * PLAN_MULT[p])) }}</span>
          </button>
        </div>
      </section>

      <!-- 2 — Paiement de l'avance (démo, aucun débit). -->
      <section v-else-if="step === 2" class="text-center">
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demo.pay.title') }}</h1>
        <p class="mt-6 text-sm font-semibold text-muted">{{ t('demo.pay.amount') }}</p>
        <p class="mt-1 text-[40px] font-extrabold leading-none text-dark">{{ fmt(total) }}</p>
        <div class="mx-auto mt-6 flex max-w-sm items-start gap-2.5 rounded-card border border-primary/30 bg-primary/5 p-4 text-left">
          <span class="mt-0.5 text-lg" aria-hidden="true">🔒</span>
          <p class="text-[13px] leading-relaxed text-dark">{{ t('demo.pay.safe') }}</p>
        </div>
      </section>

      <!-- 3 — Validation finale (démo). -->
      <section v-else-if="step === 3" class="text-center">
        <span class="mx-auto mb-4 block text-5xl" aria-hidden="true">📍</span>
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demo.validate.title') }}</h1>
        <p class="mt-2 text-sm text-muted">{{ t('demo.validate.subtitle') }}</p>
      </section>

      <!-- 4 — Félicitations + renvoi vers l'action réelle. -->
      <section v-else class="text-center">
        <span class="mx-auto mb-4 block text-6xl" aria-hidden="true">🎉</span>
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demo.done.title') }}</h1>
        <p class="mx-auto mt-2 max-w-xs text-sm text-muted">{{ t('demo.done.subtitle') }}</p>
        <NuxtLink to="/demande" class="press mt-7 flex w-full items-center justify-center rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover">
          {{ t('demo.done.realCta') }}
        </NuxtLink>
        <button type="button" class="press mt-3 w-full py-2 text-sm font-semibold text-muted hover:text-dark" @click="exit">
          {{ t('demo.done.backTutorials') }}
        </button>
      </section>
    </div>

    <!-- Barre d'action collée en bas (sauf écran final). Estimation en direct sur la fiche. -->
    <div v-if="step < TOTAL_STEPS - 1" class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface px-5 pt-3" style="padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem);">
      <div v-if="step === 0" class="mb-2 flex items-baseline justify-between">
        <span class="text-[12px] font-semibold text-muted">{{ t('demo.form.estimate') }}</span>
        <span class="text-[15px] font-extrabold text-dark">{{ estimateLow }} – {{ estimateHigh }}</span>
      </div>
      <button
        type="button"
        class="press w-full rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover"
        @click="next"
      >
        {{ step === 2 ? t('demo.pay.cta') : step === 3 ? t('demo.validate.cta') : t('demo.next') }}
      </button>
    </div>
  </div>
</template>
