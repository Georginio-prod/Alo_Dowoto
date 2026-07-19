<script setup lang="ts">
import type { FormationEntry, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Parcours de formation du prestataire — extrait de
 * app/pages/prestataire/formation.vue (#hub-profil-modales) pour être
 * réutilisé à la fois par cette page dédiée et par la fenêtre ouverte
 * depuis le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

function emptyFormation(): FormationEntry {
  return { title: '', institution: '', year: '' }
}

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const existing = data.value?.profile?.formations ?? []
const formations = ref<FormationEntry[]>(existing.length ? existing.map((f) => ({ ...f })) : [emptyFormation()])
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

function addFormation() {
  formations.value.push(emptyFormation())
}

function removeFormation(index: number) {
  formations.value.splice(index, 1)
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  const cleaned = formations.value
    .map((f) => ({ title: f.title.trim(), institution: f.institution.trim(), year: f.year.trim() }))
    .filter((f) => f.title)

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', { method: 'PATCH', body: { formations: cleaned } })
    formations.value = cleaned.length ? cleaned : [emptyFormation()]
    success.value = true
    emit('saved')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, "L'enregistrement a échoué. Réessayez.")
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div
      v-for="(formation, index) in formations"
      :key="index"
      class="mb-4 rounded-field border border-hairline p-3.5"
    >
      <div class="mb-2.5 flex items-center justify-between">
        <span class="text-[12px] font-bold uppercase tracking-wide text-muted">Formation {{ index + 1 }}</span>
        <button
          v-if="formations.length > 1"
          type="button"
          class="press text-[12px] font-semibold text-error"
          @click="removeFormation(index)"
        >
          Retirer
        </button>
      </div>

      <label :for="`formation-title-${index}`" class="mb-1.5 block text-[12.5px] font-semibold text-dark">
        Intitulé
      </label>
      <input
        :id="`formation-title-${index}`"
        v-model="formation.title"
        type="text"
        placeholder="Ex. CAP Électricité"
        class="mb-2.5 h-[42px] w-full rounded-field border-[1.5px] border-hairline px-3 text-[13.5px] text-ink outline-none focus:border-primary"
      >

      <label :for="`formation-institution-${index}`" class="mb-1.5 block text-[12.5px] font-semibold text-dark">
        Établissement
      </label>
      <input
        :id="`formation-institution-${index}`"
        v-model="formation.institution"
        type="text"
        placeholder="Ex. Lycée technique de Lomé"
        class="mb-2.5 h-[42px] w-full rounded-field border-[1.5px] border-hairline px-3 text-[13.5px] text-ink outline-none focus:border-primary"
      >

      <label :for="`formation-year-${index}`" class="mb-1.5 block text-[12.5px] font-semibold text-dark">
        Année
      </label>
      <input
        :id="`formation-year-${index}`"
        v-model="formation.year"
        type="text"
        inputmode="numeric"
        placeholder="Ex. 2019"
        class="h-[42px] w-full rounded-field border-[1.5px] border-hairline px-3 text-[13.5px] text-ink outline-none focus:border-primary"
      >
    </div>

    <button
      type="button"
      class="press mb-3.5 w-full rounded-field border-[1.5px] border-dashed border-hairline py-2.5 text-[13px] font-semibold text-muted hover:border-primary/40 hover:text-primary"
      @click="addFormation"
    >
      + Ajouter une formation
    </button>

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Formations mises à jour.</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
    </button>
  </div>
</template>
