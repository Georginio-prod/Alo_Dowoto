<script setup lang="ts">
import { PLANS, findPlan, type PlanSlug } from '~/data/plans'

const { t } = useI18n({ useScope: 'global' })

useHead(() => ({ title: t('formules.pageTitle') }))

// Page publique de comparaison des formules (#183) : contrairement à
// /abonnement (étape finale du tunnel d'inscription prestataire, qui
// déclenche un POST /api/subscriptions), cette page n'exécute aucune action
// de paiement ni requête réseau — elle ne fait qu'afficher les formules et
// le tableau comparatif. La navigation vers le tunnel d'inscription
// (/auth?role=prestataire, le vrai point d'entrée — voir auth.vue) ne se
// produit que sur clic explicite du CTA final.
const selectedSlug = ref((PLANS.find((plan) => plan.hasTag) ?? PLANS[0]).slug)
const selectedPlan = computed(() => findPlan(selectedSlug.value) ?? PLANS[0])

function selectPlan(slug: PlanSlug) {
  selectedSlug.value = slug
}

function startSignup() {
  navigateTo({ path: '/auth', query: { role: 'prestataire' } })
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pb-16 pt-7">
    <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">{{ t('formules.back') }}</NuxtLink>

    <div class="mb-8 text-center">
      <h1 class="mb-2 text-xl font-bold text-dark">{{ t('formules.heading') }}</h1>
      <p class="mx-auto max-w-xl text-sm text-muted">
        {{ t('formules.subtitle') }}
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
      <h2 class="mb-4 text-lg font-bold text-dark">{{ t('formules.featuresHeading') }}</h2>
      <PlanComparisonTable :selected-slug="selectedSlug" />
    </div>

    <div class="rounded-card border border-hairline bg-surface p-6 text-center">
      <div class="mb-1 text-base font-bold text-dark">
        {{ t('formules.readyHeading', { plan: t(`plans.${selectedPlan.slug}.name`) }) }}
      </div>
      <p class="mb-4 text-[13px] text-muted">
        {{ t('formules.readySubtitle') }}
      </p>
      <button
        type="button"
        class="press rounded-field bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover"
        @click="startSignup"
      >
        {{ t('formules.signUpCta') }}
      </button>
    </div>
  </div>
</template>
