<script setup lang="ts">
/**
 * Formulaire de réclamation (#132, colonne Assistance du footer). Pas de
 * route API dédiée pour l'instant (hors périmètre de ce lot) : la
 * soumission reste locale, avec confirmation explicite à l'utilisateur
 * plutôt qu'un faux envoi silencieux.
 */
useHead({ title: 'Réclamation — WorkTogo' })

const subject = ref('')
const message = ref('')
const submitted = ref(false)

const isValid = computed(() => subject.value.trim().length > 0 && message.value.trim().length > 0)

function submit() {
  if (!isValid.value) return
  submitted.value = true
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Déposer une réclamation</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      Décrivez le problème rencontré, notre équipe reviendra vers vous par email.
    </p>

    <div v-if="submitted" class="rounded-card border border-hairline bg-surface p-5 text-center">
      <p class="text-[14px] font-semibold text-dark">Votre réclamation a bien été enregistrée.</p>
      <p class="mt-1 text-[12.5px] text-muted">
        Prototype : ce formulaire n'est pas encore relié à un circuit de traitement réel.
      </p>
    </div>

    <template v-else>
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

      <button
        type="button"
        class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!isValid"
        @click="submit"
      >
        Envoyer la réclamation
      </button>
    </template>
  </div>
</template>
