<script setup lang="ts">
import { getComplaintCategories } from '~/data/complaintCategories'

const { t } = useI18n({ useScope: 'global' })

useHead(() => ({ title: t('reclamationPage.pageTitle') }))

const COMPLAINT_CATEGORIES = computed(() => getComplaintCategories(t))

const { user } = useSession()

const category = ref('')
const subject = ref('')
const message = ref('')
const contactEmail = ref(user.value?.contact ?? '')
const error = ref('')
const isSubmitting = ref(false)
const reference = ref('')

const isValid = computed(() =>
  category.value !== ''
  && subject.value.trim().length >= 3
  && message.value.trim().length >= 10
  && contactEmail.value.trim().length > 0,
)

async function submit() {
  if (!isValid.value || isSubmitting.value) return
  isSubmitting.value = true
  error.value = ''
  try {
    const { reference: ref } = await $fetch<{ reference: string }>('/api/reclamations', {
      method: 'POST',
      body: {
        category: category.value,
        subject: subject.value.trim(),
        message: message.value.trim(),
        contactEmail: contactEmail.value.trim(),
      },
    })
    reference.value = ref
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('reclamationPage.errorSendFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">{{ t('reclamationPage.heading') }}</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      {{ t('reclamationPage.intro') }}
    </p>

    <div v-if="reference" class="rounded-card border border-hairline bg-surface p-5 text-center">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary">
        ✓
      </div>
      <p class="text-[14px] font-semibold text-dark">{{ t('reclamationPage.successText') }}</p>
      <p class="mt-1 text-[12.5px] text-muted">
        {{ t('reclamationPage.referenceLabel') }} <span class="font-mono font-semibold text-dark">{{ reference }}</span> {{ t('reclamationPage.referenceHint') }}
      </p>
    </div>

    <template v-else>
      <label for="reclamation-category" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('reclamationPage.categoryLabel') }}</label>
      <select
        id="reclamation-category"
        v-model="category"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >
        <option value="" disabled>{{ t('reclamationPage.categoryPlaceholder') }}</option>
        <option v-for="option in COMPLAINT_CATEGORIES" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <label for="reclamation-subject" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('reclamationPage.subjectLabel') }}</label>
      <input
        id="reclamation-subject"
        v-model="subject"
        type="text"
        :placeholder="t('reclamationPage.subjectPlaceholder')"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >

      <label for="reclamation-message" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('reclamationPage.messageLabel') }}</label>
      <textarea
        id="reclamation-message"
        v-model="message"
        rows="5"
        :placeholder="t('reclamationPage.messagePlaceholder')"
        class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
      />

      <label for="reclamation-contact" class="mb-1.5 block text-[13px] font-semibold text-dark">
        {{ t('reclamationPage.contactLabel') }}
      </label>
      <input
        id="reclamation-contact"
        v-model="contactEmail"
        type="text"
        :placeholder="t('reclamationPage.contactPlaceholder')"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >

      <p v-if="error" class="mb-3 text-[12.5px] text-error">{{ error }}</p>

      <button
        type="button"
        class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!isValid || isSubmitting"
        @click="submit"
      >
        {{ isSubmitting ? t('reclamationPage.submitting') : t('reclamationPage.submit') }}
      </button>
    </template>
  </div>
</template>
