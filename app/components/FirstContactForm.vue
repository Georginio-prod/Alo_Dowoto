<script setup lang="ts">
/**
 * Formulaire obligatoire à la première prise de contact avec un
 * prestataire (#129) : ne s'affiche qu'une fois par conversation (piloté
 * par `conversation.firstContactDone`, voir app/pages/messages/[id].vue).
 *
 * Les champs additionnels sous « Votre besoin » varient selon le secteur du
 * prestataire (#295, ex. adresse de départ/arrivée pour un transporteur,
 * fréquence pour du ménage) — voir app/data/firstContactSectorFields.ts.
 */
import { getSectorFields } from '~/data/firstContactSectorFields'

const props = defineProps<{ conversationId: string; prefillContact: string; providerName: string; sectorSlug: string | null }>()
const emit = defineEmits<{ submitted: [] }>()

const { t } = useI18n({ useScope: 'global' })

const description = ref('')
const contact = ref(props.prefillContact)
const urgency = ref('')
const submitError = ref('')
const isSubmitting = ref(false)

const sectorFields = computed(() => getSectorFields(props.sectorSlug, t))
const sectorAnswers = ref<Record<string, string>>({})

const isValid = computed(() => {
  if (description.value.trim().length === 0 || contact.value.trim().length === 0) return false
  return sectorFields.value.every((field) => !field.required || (sectorAnswers.value[field.key] ?? '').trim().length > 0)
})

async function submit() {
  if (!isValid.value || isSubmitting.value) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    const answers = Object.fromEntries(
      sectorFields.value
        .map((field) => [field.key, (sectorAnswers.value[field.key] ?? '').trim()] as const)
        .filter(([, value]) => value.length > 0),
    )
    await $fetch(`/api/conversations/${props.conversationId}/first-contact`, {
      method: 'POST',
      body: {
        description: description.value.trim(),
        contact: contact.value.trim(),
        urgency: urgency.value.trim() || undefined,
        sectorAnswers: Object.keys(answers).length > 0 ? answers : undefined,
      },
    })
    emit('submitted')
  } catch (error) {
    submitError.value = apiErrorMessage(error, t('firstContactForm.errorSendFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-5">
    <h2 class="mb-1 text-[15px] font-bold text-dark">{{ t('firstContactForm.heading', { name: providerName }) }}</h2>
    <p class="mb-4 text-[13px] leading-relaxed text-muted">
      {{ t('firstContactForm.subtitle', { name: providerName }) }}
    </p>

    <label for="first-contact-description" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('firstContactForm.needLabel') }} <span class="text-error">*</span>
    </label>
    <textarea
      id="first-contact-description"
      v-model="description"
      rows="4"
      required
      :placeholder="t('firstContactForm.needPlaceholder')"
      aria-required="true"
      class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
    />

    <template v-for="field in sectorFields" :key="field.key">
      <label :for="`first-contact-sector-${field.key}`" class="mb-1.5 block text-[13px] font-semibold text-dark">
        {{ field.label }} <span v-if="field.required" class="text-error">*</span>
        <span v-else class="font-normal text-muted">{{ t('firstContactForm.optional') }}</span>
      </label>
      <select
        v-if="field.type === 'select'"
        :id="`first-contact-sector-${field.key}`"
        v-model="sectorAnswers[field.key]"
        :required="field.required"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >
        <option value="" disabled>{{ t('firstContactForm.selectPlaceholder') }}</option>
        <option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <input
        v-else
        :id="`first-contact-sector-${field.key}`"
        v-model="sectorAnswers[field.key]"
        type="text"
        :required="field.required"
        :placeholder="field.placeholder"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >
    </template>

    <label for="first-contact-contact" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('firstContactForm.contactLabel') }} <span class="text-error">*</span>
    </label>
    <input
      id="first-contact-contact"
      v-model="contact"
      type="text"
      required
      :placeholder="t('firstContactForm.contactPlaceholder')"
      aria-required="true"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <label for="first-contact-urgency" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('firstContactForm.urgencyLabel') }} <span class="font-normal text-muted">{{ t('firstContactForm.optional') }}</span>
    </label>
    <input
      id="first-contact-urgency"
      v-model="urgency"
      type="text"
      :placeholder="t('firstContactForm.urgencyPlaceholder')"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <p v-if="submitError" class="mb-2 text-[12.5px] text-error">{{ submitError }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isValid || isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('firstContactForm.sending') : t('firstContactForm.sendCta') }}
    </button>
  </div>
</template>
