<script setup lang="ts">
/**
 * Formulaire obligatoire à la première prise de contact avec un
 * prestataire (#129) : ne s'affiche qu'une fois par conversation (piloté
 * par `conversation.firstContactDone`, voir app/pages/messages/[id].vue).
 */

const props = defineProps<{ conversationId: string; prefillContact: string; providerName: string }>()
const emit = defineEmits<{ submitted: [] }>()

const description = ref('')
const contact = ref(props.prefillContact)
const urgency = ref('')
const submitError = ref('')
const isSubmitting = ref(false)

const isValid = computed(() => description.value.trim().length > 0 && contact.value.trim().length > 0)

async function submit() {
  if (!isValid.value || isSubmitting.value) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/first-contact`, {
      method: 'POST',
      body: { description: description.value.trim(), contact: contact.value.trim(), urgency: urgency.value.trim() || undefined },
    })
    emit('submitted')
  } catch (error) {
    submitError.value = apiErrorMessage(error, 'La demande n\'a pas pu être envoyée. Réessayez.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-5">
    <h2 class="mb-1 text-[15px] font-bold text-dark">Décrivez votre besoin à {{ providerName }}</h2>
    <p class="mb-4 text-[13px] leading-relaxed text-muted">
      Cette étape ne s'affiche qu'une fois : {{ providerName }} recevra votre message dès l'envoi.
    </p>

    <label for="first-contact-description" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Votre besoin <span class="text-error">*</span>
    </label>
    <textarea
      id="first-contact-description"
      v-model="description"
      rows="4"
      required
      placeholder="Décrivez précisément ce dont vous avez besoin…"
      aria-required="true"
      class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
    />

    <label for="first-contact-contact" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Vos coordonnées <span class="text-error">*</span>
    </label>
    <input
      id="first-contact-contact"
      v-model="contact"
      type="text"
      required
      placeholder="Téléphone ou email"
      aria-required="true"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <label for="first-contact-urgency" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Urgence / délai souhaité <span class="font-normal text-muted">(optionnel)</span>
    </label>
    <input
      id="first-contact-urgency"
      v-model="urgency"
      type="text"
      placeholder="Ex. dès que possible, sous 48h, la semaine prochaine…"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <p v-if="submitError" class="mb-2 text-[12.5px] text-error">{{ submitError }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isValid || isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Envoi…' : 'Envoyer la demande' }}
    </button>
  </div>
</template>
