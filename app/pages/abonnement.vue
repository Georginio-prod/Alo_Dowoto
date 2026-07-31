<script setup lang="ts">
import { PLANS, findPlan, type PlanSlug } from '~/data/plans'
import type { Subscription } from '~~/server/utils/subscriptionStore'

const { t } = useI18n({ useScope: 'global' })

const { trialDays = 14 } = defineProps<{ trialDays?: number }>()

const { user } = useSession()

const selectedSlug = ref((PLANS.find((plan) => plan.hasTag) ?? PLANS[0]).slug)
const selectedPlan = computed(() => findPlan(selectedSlug.value) ?? PLANS[0])
const isSubmitting = ref(false)

function selectPlan(slug: PlanSlug) {
  selectedSlug.value = slug
}

// Essai gratuit (#281) : la page promet "sans engagement" depuis toujours
// (voir le texte ci-dessous) — jusqu'ici sans contrepartie réelle, un
// prestataire était renvoyé vers le paiement immédiat quoi qu'il arrive.
// Éligible uniquement s'il n'a jamais eu le moindre abonnement (même
// abandonné en attente), vérifié une seule fois au chargement de la page.
const { data: existingSubscription } = await useFetch<{ subscription: Subscription | null }>('/api/subscriptions/me')
const isTrialEligible = computed(() => existingSubscription.value?.subscription === null)

async function startFreeTrial() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/subscriptions/trial', {
      method: 'POST',
      body: { plan: selectedSlug.value },
    })
    navigateTo(user.value?.role === 'prestataire' ? '/prestataire' : '/dashboard/client')
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

// « Compléter mon profil plus tard » doit renvoyer vers le tableau de bord
// correspondant au type de compte connecté (#186) : `/dashboard` n'existe
// pas en tant que route et renvoyait donc vers une page inexistante pour
// tout le monde. Cette page n'est aujourd'hui atteinte que par le parcours
// d'inscription prestataire (voir AuthPayoutStep → onPayoutSaved), mais elle
// reste aussi liée depuis la nav publique (« Formules et tarifs ») et donc
// potentiellement accessible à un chercheur connecté — le routage reste
// défensif pour les deux rôles plutôt que de supposer prestataire.
function completeProfileLater() {
  navigateTo(user.value?.role === 'prestataire' ? '/prestataire' : '/dashboard/client')
}

// Espace réservé sous le contenu pour la barre d'action fixe. Il était figé à
// 8rem (128 px), or la barre atteint ~204 px sur mobile quand ses trois actions
// passent à la ligne : les derniers blocs de la page restaient cachés dessous,
// sans moyen de les atteindre. On mesure donc la barre réellement rendue —
// sa hauteur dépend de la largeur, de la langue et de l'éligibilité à l'essai
// gratuit — plutôt que de deviner une valeur.
const actionBar = ref<HTMLElement | null>(null)
const actionBarHeight = ref(0)

onMounted(() => {
  if (!actionBar.value) return
  const observer = new ResizeObserver(([entry]) => {
    actionBarHeight.value = entry?.target.getBoundingClientRect().height ?? 0
  })
  observer.observe(actionBar.value)
  onUnmounted(() => observer.disconnect())
})

const contentPadding = computed(() =>
  actionBarHeight.value ? `${Math.round(actionBarHeight.value) + 24}px` : undefined,
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pb-32 pt-7" :style="{ paddingBottom: contentPadding }">
    <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">{{ t('abonnement.back') }}</NuxtLink>

    <FlowSteps
      :steps="[t('flowSteps.contact'), t('flowSteps.verification'), t('flowSteps.sector'), t('flowSteps.subscription'), t('flowSteps.payment')]"
      :current-index="3"
    />

    <div class="mb-8 text-center">
      <h1 class="mb-2 text-xl font-bold text-dark">{{ t('abonnement.heading') }}</h1>
      <p class="text-sm text-muted">
        {{ t('abonnement.subtitle', { days: trialDays }) }}
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
      <h2 class="mb-4 text-lg font-bold text-dark">{{ t('abonnement.featuresHeading') }}</h2>
      <PlanComparisonTable :selected-slug="selectedSlug" />
    </div>

    <div ref="actionBar" class="fixed inset-x-0 bottom-0 border-t border-hairline bg-surface px-5 py-3 sm:py-4">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <div class="text-[13px] text-muted">{{ t('abonnement.selectedPlanLabel') }}</div>
          <div class="text-[15px] font-bold text-dark sm:text-base">
            {{ t(`plans.${selectedPlan.slug}.name`) }} — {{ selectedPlan.priceLabel }}{{ t(`plans.${selectedPlan.slug}.period`) }}
          </div>
        </div>
        <!-- Sur mobile : les deux actions principales se partagent une ligne,
             « plus tard » passe dessous (`order-last`). Alignées d'un seul
             tenant comme sur desktop, les trois libellés — tous longs en
             français — tombaient chacun sur sa propre ligne et la barre
             occupait plus de 200 px, soit un quart de l'écran. -->
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-5">
          <button
            type="button"
            class="press order-last w-full text-center text-[13px] text-muted underline sm:order-none sm:w-auto sm:text-[13.5px]"
            @click="completeProfileLater"
          >
            {{ t('abonnement.laterCta') }}
          </button>
          <button
            v-if="isTrialEligible"
            type="button"
            class="press min-w-0 flex-1 basis-[45%] rounded-field bg-primary px-3 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:basis-auto sm:px-6 sm:py-3 sm:text-[14.5px]"
            :disabled="isSubmitting"
            @click="startFreeTrial"
          >
            {{ isSubmitting ? t('abonnement.trialActivating') : t('abonnement.trialCta', { days: trialDays }) }}
          </button>
          <button
            type="button"
            class="press min-w-0 flex-1 basis-[45%] rounded-field px-3 py-2.5 text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:basis-auto sm:px-6 sm:py-3 sm:text-[14.5px]"
            :class="isTrialEligible ? 'border border-hairline text-dark hover:border-primary' : 'bg-primary text-white hover:bg-primary-hover'"
            :disabled="isSubmitting"
            @click="continueToPayment"
          >
            {{ t('abonnement.continueToPayment') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
