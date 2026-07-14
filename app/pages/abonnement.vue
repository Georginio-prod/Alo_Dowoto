<script setup lang="ts">
import { PLANS, findPlan, type PlanSlug } from '~/data/plans'

const { trialDays = 14 } = defineProps<{ trialDays?: number }>()

const selectedSlug = ref((PLANS.find((plan) => plan.tag) ?? PLANS[0]).slug)
const selectedPlan = computed(() => findPlan(selectedSlug.value) ?? PLANS[0])
const isSubmitting = ref(false)

function selectPlan(slug: PlanSlug) {
  selectedSlug.value = slug
}

async function continueToPayment() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/subscriptions', {
      method: 'POST',
      body: { plan: selectedSlug.value },
    })
    // Formulaire de paiement, voir #32.
    navigateTo('/paiement')
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      navigateTo({ path: '/auth', query: { role: 'prestataire' } })
      return
    }
    throw error
  } finally {
    isSubmitting.value = false
  }
}

function completeProfileLater() {
  // Tableau de bord prestataire, voir #36/#37.
  navigateTo('/dashboard')
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pb-32 pt-7">
    <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour</NuxtLink>

    <FlowSteps
      :steps="['Contact', 'Vérification', 'Secteur', 'Abonnement', 'Paiement']"
      :current-index="3"
    />

    <div class="mb-8 text-center">
      <h1 class="mb-2 text-xl font-bold text-dark">Choisissez votre formule prestataire</h1>
      <p class="text-sm text-muted">
        Essai gratuit de {{ trialDays }} jours, sans engagement au-delà de la première période.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <PlanCard
        v-for="plan in PLANS"
        :key="plan.slug"
        :plan="plan"
        :selected="plan.slug === selectedSlug"
        @select="selectPlan(plan.slug)"
      />
    </div>

    <div class="mb-8 mt-12">
      <h2 class="mb-4 text-lg font-bold text-dark">Fonctionnalités clés</h2>
      <PlanComparisonTable :selected-slug="selectedSlug" />
    </div>

    <div class="fixed inset-x-0 bottom-0 border-t border-hairline bg-surface px-5 py-4">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-[13px] text-muted">Formule sélectionnée</div>
          <div class="text-base font-bold text-dark">
            {{ selectedPlan.name }} — {{ selectedPlan.priceLabel }}{{ selectedPlan.period }}
          </div>
        </div>
        <div class="flex items-center gap-5">
          <button type="button" class="press text-[13.5px] text-muted underline" @click="completeProfileLater">
            Compléter mon profil plus tard
          </button>
          <button
            type="button"
            class="press rounded-field bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting"
            @click="continueToPayment"
          >
            Continuer vers le paiement
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
