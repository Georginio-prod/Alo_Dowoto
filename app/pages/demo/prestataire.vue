<script setup lang="ts">
/**
 * Bac à sable prestataire — « Essayer sans risque » (#tutoriel-onboarding — Partie D).
 *
 * Démonstration manipulable sur données FICTIVES, isolée : **aucun appel API,
 * aucune écriture en base, aucun service de paiement, aucune géolocalisation
 * réelle**. Tout l'état vit dans des refs locales. Le prestataire reçoit une
 * demande fictive, l'accepte, fait un check-in simulé, teste l'ajustement de
 * prix, puis termine. Bandeau démo permanent, sortie à tout moment.
 */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t, locale } = useI18n({ useScope: 'global' })

const { track } = useAnalytics()
onMounted(() => track('sandbox_enter', { role: 'prestataire' }))

const TOTAL_STEPS = 5
const step = ref(0)

const PROPOSED = 12000
const adjustAmount = ref(15000)

function fmt(n: number): string {
  return `${new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'fr-FR').format(n)} FCFA`
}
function setAmount(delta: number) {
  adjustAmount.value = Math.min(60000, Math.max(PROPOSED, adjustAmount.value + delta))
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
      <p class="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{{ t('demoProvider.banner') }}</p>
      <button type="button" class="press shrink-0 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25" @click="exit">
        {{ t('demoProvider.exit') }}
      </button>
    </div>

    <div class="mx-auto max-w-[560px] px-5 pb-32 pt-5">
      <p v-if="step < TOTAL_STEPS - 1" class="mb-4 text-xs font-semibold text-primary">{{ t('demoProvider.stepOf', { current: step + 1, total: TOTAL_STEPS - 1 }) }}</p>

      <!-- 0 — Demande entrante fictive. -->
      <section v-if="step === 0">
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demoProvider.request.title') }}</h1>
        <div class="mt-5 rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
          <div class="flex items-center gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary" aria-hidden="true">K</span>
            <span class="min-w-0 flex-1">
              <span class="block text-[14.5px] font-bold text-dark">{{ t('demoProvider.request.clientName') }}</span>
              <span class="block text-[12.5px] text-muted">📍 {{ t('demoProvider.request.distance') }}</span>
            </span>
          </div>
          <p class="mt-3 text-[14px] font-semibold text-dark">🚰 {{ t('demoProvider.request.job') }}</p>
          <div class="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
            <span class="text-[12.5px] text-muted">{{ t('demoProvider.request.amountLabel') }}</span>
            <span class="text-[18px] font-extrabold text-primary">{{ fmt(PROPOSED) }}</span>
          </div>
        </div>
      </section>

      <!-- 1 — Check-in simulé (aucune géoloc réelle). -->
      <section v-else-if="step === 1" class="text-center">
        <span class="mx-auto mb-4 block text-5xl" aria-hidden="true">📍</span>
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demoProvider.checkin.title') }}</h1>
        <p class="mx-auto mt-2 max-w-xs text-sm text-muted">{{ t('demoProvider.checkin.subtitle') }}</p>
      </section>

      <!-- 2 — Ajustement de prix. -->
      <section v-else-if="step === 2">
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demoProvider.adjust.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ t('demoProvider.adjust.subtitle') }}</p>
        <p class="mb-2 mt-5 text-[13px] font-bold text-dark">{{ t('demoProvider.adjust.newAmount') }}</p>
        <div class="flex items-center gap-4">
          <button type="button" class="press grid size-11 place-items-center rounded-full border border-hairline bg-surface text-xl font-bold text-dark" aria-label="-1000" @click="setAmount(-1000)">−</button>
          <span class="min-w-[8ch] text-center text-lg font-extrabold text-dark">{{ fmt(adjustAmount) }}</span>
          <button type="button" class="press grid size-11 place-items-center rounded-full border border-hairline bg-surface text-xl font-bold text-dark" aria-label="+1000" @click="setAmount(1000)">+</button>
        </div>
        <div class="mt-4 rounded-card border border-hairline bg-surface p-3.5">
          <p class="text-[12.5px] font-semibold text-muted">{{ t('demoProvider.adjust.reasonLabel') }}</p>
          <p class="mt-0.5 text-[13.5px] font-semibold text-dark">⚠️ {{ t('demoProvider.adjust.reason') }}</p>
        </div>
      </section>

      <!-- 3 — Terminer. -->
      <section v-else-if="step === 3" class="text-center">
        <span class="mx-auto mb-4 block text-5xl" aria-hidden="true">🏁</span>
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demoProvider.finish.title') }}</h1>
        <p class="mx-auto mt-2 max-w-xs text-sm text-muted">{{ t('demoProvider.finish.subtitle') }}</p>
      </section>

      <!-- 4 — Félicitations + renvoi vers l'action réelle. -->
      <section v-else class="text-center">
        <span class="mx-auto mb-4 block text-6xl" aria-hidden="true">🎉</span>
        <h1 class="text-[22px] font-extrabold leading-tight text-dark">{{ t('demoProvider.done.title') }}</h1>
        <p class="mx-auto mt-2 max-w-xs text-sm text-muted">{{ t('demoProvider.done.subtitle') }}</p>
        <NuxtLink to="/prestataire/demandes" class="press mt-7 flex w-full items-center justify-center rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover">
          {{ t('demoProvider.done.realCta') }}
        </NuxtLink>
        <button type="button" class="press mt-3 w-full py-2 text-sm font-semibold text-muted hover:text-dark" @click="exit">
          {{ t('demoProvider.done.backTutorials') }}
        </button>
      </section>
    </div>

    <!-- Barre d'action collée en bas (sauf écran final). -->
    <div v-if="step < TOTAL_STEPS - 1" class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface px-5 pt-3" style="padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem);">
      <!-- Étape 0 : accepter / refuser. -->
      <div v-if="step === 0" class="flex gap-2.5">
        <button type="button" class="press flex-1 rounded-pill border border-hairline bg-surface py-3.5 text-base font-semibold text-muted hover:text-dark" @click="exit">
          {{ t('demoProvider.request.refuse') }}
        </button>
        <button type="button" class="press flex-1 rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover" @click="next">
          {{ t('demoProvider.request.accept') }}
        </button>
      </div>
      <!-- Étape 2 : proposer / ne rien changer. -->
      <div v-else-if="step === 2" class="space-y-2.5">
        <button type="button" class="press w-full rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover" @click="next">
          {{ t('demoProvider.adjust.send') }}
        </button>
        <button type="button" class="press w-full py-1.5 text-sm font-semibold text-muted hover:text-dark" @click="next">
          {{ t('demoProvider.adjust.skip') }}
        </button>
      </div>
      <!-- Étapes 1 et 3 : action unique. -->
      <button v-else type="button" class="press w-full rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover" @click="next">
        {{ step === 1 ? t('demoProvider.checkin.cta') : t('demoProvider.finish.cta') }}
      </button>
    </div>
  </div>
</template>
