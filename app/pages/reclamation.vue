<script setup lang="ts">
import { COMPLAINT_CATEGORIES } from '~/data/complaintCategories'

useHead({ title: 'Réclamation — WorkTogo' })

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
    error.value = apiErrorMessage(fetchError, "L'envoi de votre réclamation a échoué. Réessayez.")
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Déposer une réclamation</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      Décrivez le problème rencontré avec un chercheur, un prestataire ou le service : notre équipe reviendra vers
      vous par email.
    </p>

    <div v-if="reference" class="rounded-card border border-hairline bg-surface p-5 text-center">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary">
        ✓
      </div>
      <p class="text-[14px] font-semibold text-dark">Votre réclamation a bien été enregistrée.</p>
      <p class="mt-1 text-[12.5px] text-muted">
        Référence : <span class="font-mono font-semibold text-dark">{{ reference }}</span> — conservez-la pour le
        suivi de votre demande.
      </p>
    </div>

    <template v-else>
      <label for="reclamation-category" class="mb-1.5 block text-[13px] font-semibold text-dark">Catégorie</label>
      <select
        id="reclamation-category"
        v-model="category"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >
        <option value="" disabled>Sélectionner une catégorie…</option>
        <option v-for="option in COMPLAINT_CATEGORIES" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <label for="reclamation-subject" class="mb-1.5 block text-[13px] font-semibold text-dark">Sujet</label>
      <input
        id="reclamation-subject"
        v-model="subject"
        type="text"
        placeholder="Ex. Problème avec un prestataire"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >

      <label for="reclamation-message" class="mb-1.5 block text-[13px] font-semibold text-dark">Message</label>
      <textarea
        id="reclamation-message"
        v-model="message"
        rows="5"
        placeholder="Décrivez votre réclamation…"
        class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
      />

      <label for="reclamation-contact" class="mb-1.5 block text-[13px] font-semibold text-dark">
        Email ou téléphone de contact
      </label>
      <input
        id="reclamation-contact"
        v-model="contactEmail"
        type="text"
        placeholder="Pour vous répondre"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >

      <p v-if="error" class="mb-3 text-[12.5px] text-error">{{ error }}</p>

      <button
        type="button"
        class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!isValid || isSubmitting"
        @click="submit"
      >
        {{ isSubmitting ? 'Envoi…' : 'Envoyer la réclamation' }}
      </button>
    </template>
  </div>
</template>
