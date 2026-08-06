<script setup lang="ts">
import type { Urgency } from '~~/server/utils/matchingEngine'
import type { ServiceRequest } from '~~/server/utils/requestStore'

definePageMeta({ layout: 'blank' })

const { t } = useI18n({ useScope: 'global' })

const URGENCY_OPTIONS = computed<{ value: Urgency; label: string }[]>(() => [
  { value: 'immediate', label: t('demande.urgencyImmediate') },
  { value: 'semaine', label: t('demande.urgencyWeek') },
  { value: 'flexible', label: t('demande.urgencyFlexible') },
])

const route = useRoute()

const title = ref('')
const skillsInput = ref('')
const description = ref('')
const budgetMax = ref<number | null>(null)
const urgency = ref<Urgency | ''>('')
const location = ref('')
const formError = ref('')
const needsVerification = ref(false)
const isSubmitting = ref(false)

onMounted(() => {
  const q = route.query.q
  if (typeof q === 'string' && q.trim()) {
    skillsInput.value = q.trim()
    title.value = t('demande.searchTitlePrefix', { term: q.trim() })
  }
})

function selectUrgency(value: Urgency) {
  urgency.value = value
}

async function submit() {
  if (isSubmitting.value) return
  formError.value = ''
  needsVerification.value = false

  const skills = skillsInput.value.split(',').map((skill) => skill.trim()).filter(Boolean)

  if (!title.value.trim()) {
    formError.value = t('demande.errorTitleRequired')
    return
  }
  if (skills.length === 0) {
    formError.value = t('demande.errorSkillsRequired')
    return
  }
  if (!budgetMax.value || budgetMax.value <= 0) {
    formError.value = t('demande.errorBudgetInvalid')
    return
  }
  if (!urgency.value) {
    formError.value = t('demande.errorUrgencyRequired')
    return
  }
  if (!location.value.trim()) {
    formError.value = t('demande.errorLocationRequired')
    return
  }

  isSubmitting.value = true
  try {
    const { request } = await $fetch<{ request: ServiceRequest }>('/api/requests', {
      method: 'POST',
      body: {
        title: title.value.trim(),
        skills,
        description: description.value.trim(),
        budgetMax: budgetMax.value,
        urgency: urgency.value,
        location: location.value.trim(),
      },
    })
    navigateTo(`/matching/${request.id}`)
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401) {
      navigateTo({ path: '/auth', query: { role: 'client' } })
      return
    }
    if (statusCode === 403) {
      formError.value = apiErrorMessage(error, t('demande.errorVerifyIdentity'))
      needsVerification.value = true
      return
    }
    formError.value = t('demande.errorGeneric')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[520px]">
      <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">{{ t('demande.back') }}</NuxtLink>

      <div class="mb-[22px] text-center">
        <!-- Même raison que sur /auth : la page n'avait aucun `h1`, la marque
             seule ne décrivant pas l'écran. -->
        <h1 class="text-[22px] font-extrabold text-dark">
          Work<span class="text-primary">Togo</span>
          <span class="sr-only"> — {{ t('demande.pageTitle') }}</span>
        </h1>
        <p class="mt-1 text-[13.5px] text-muted">{{ t('demande.subtitle') }}</p>
      </div>

      <form class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm" @submit.prevent="submit">
        <label for="req-title" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('demande.titleLabel') }}</label>
        <input
          id="req-title"
          v-model="title"
          type="text"
          :placeholder="t('demande.titlePlaceholder')"
          :aria-label="t('demande.titleLabel')"
          class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <label for="req-skills" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('demande.skillsLabel') }}</label>
        <input
          id="req-skills"
          v-model="skillsInput"
          type="text"
          :placeholder="t('demande.skillsPlaceholder')"
          :aria-label="t('demande.skillsAria')"
          class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
        <p class="mb-3.5 text-[12px] text-muted">{{ t('demande.skillsHint') }}</p>

        <label for="req-description" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('demande.descriptionLabel') }}</label>
        <textarea
          id="req-description"
          v-model="description"
          rows="3"
          :placeholder="t('demande.descriptionPlaceholder')"
          :aria-label="t('demande.descriptionAria')"
          class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-primary"
        />

        <label for="req-budget" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('demande.budgetLabel') }}</label>
        <input
          id="req-budget"
          v-model.number="budgetMax"
          type="number"
          min="0"
          inputmode="numeric"
          :placeholder="t('demande.budgetPlaceholder')"
          :aria-label="t('demande.budgetAria')"
          class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <div class="mb-1.5 text-[13px] font-semibold text-dark">{{ t('demande.urgencyLabel') }}</div>
        <div class="mb-3.5 flex gap-2">
          <button
            v-for="option in URGENCY_OPTIONS"
            :key="option.value"
            type="button"
            class="press min-w-0 flex-1 rounded-field border-[1.5px] px-3 py-2.5 text-[13px] font-semibold"
            :class="urgency === option.value ? 'border-primary bg-primary/10 text-dark' : 'border-hairline bg-white text-muted'"
            @click="selectUrgency(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <label for="req-location" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('demande.locationLabel') }}</label>
        <input
          id="req-location"
          v-model="location"
          type="text"
          :placeholder="t('demande.locationPlaceholder')"
          :aria-label="t('demande.locationAria')"
          class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >

        <p v-if="formError" class="my-1 text-[12.5px] text-error">
          {{ formError }}
          <NuxtLink v-if="needsVerification" to="/profil" class="font-semibold underline">{{ t('demande.verifyIdentityLink') }}</NuxtLink>
        </p>

        <button
          type="submit"
          class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? t('demande.submitting') : t('demande.submit') }}
        </button>
      </form>
    </div>

    <ContextualHint hint-key="hint-demande" :text="t('hint.demande')" />
  </div>
</template>
