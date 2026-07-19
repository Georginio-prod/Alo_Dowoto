<script setup lang="ts">
import type { ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Langues maîtrisées par le prestataire — extrait de
 * app/pages/prestataire/langues.vue (#hub-profil-modales) pour être
 * réutilisé à la fois par cette page dédiée et par la fenêtre ouverte
 * depuis le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

const SUGGESTED_LANGUAGES = ['Français', 'Anglais', 'Ewe', 'Kabiyè', 'Mina', 'Haoussa', 'Moba']

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const languages = ref<string[]>([...(data.value?.profile?.languages ?? [])])
const newLanguage = ref('')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

const availableSuggestions = computed(() =>
  SUGGESTED_LANGUAGES.filter((lang) => !languages.value.includes(lang)),
)

function addLanguage(lang: string) {
  const trimmed = lang.trim()
  if (!trimmed || languages.value.includes(trimmed)) return
  languages.value.push(trimmed)
}

function addFromInput() {
  addLanguage(newLanguage.value)
  newLanguage.value = ''
}

function removeLanguage(lang: string) {
  languages.value = languages.value.filter((l) => l !== lang)
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', { method: 'PATCH', body: { languages: languages.value } })
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
    <div v-if="languages.length" class="mb-3.5 flex flex-wrap gap-2">
      <span
        v-for="lang in languages"
        :key="lang"
        class="flex items-center gap-1.5 rounded-pill bg-primary/10 py-1.5 pl-3 pr-2 text-[12.5px] font-semibold text-primary"
      >
        {{ lang }}
        <button
          type="button"
          class="press flex size-4 items-center justify-center rounded-full text-[11px] hover:bg-primary/20"
          :aria-label="`Retirer ${lang}`"
          @click="removeLanguage(lang)"
        >
          ×
        </button>
      </span>
    </div>

    <div v-if="availableSuggestions.length" class="mb-3.5 flex flex-wrap gap-1.5">
      <button
        v-for="lang in availableSuggestions"
        :key="lang"
        type="button"
        class="press rounded-pill border border-hairline px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-primary/40 hover:text-primary"
        @click="addLanguage(lang)"
      >
        + {{ lang }}
      </button>
    </div>

    <label for="lang-custom" class="mb-1.5 block text-[13px] font-semibold text-dark">Autre langue</label>
    <div class="mb-3.5 flex gap-2">
      <input
        id="lang-custom"
        v-model="newLanguage"
        type="text"
        placeholder="Ex. Allemand…"
        class="h-[46px] flex-1 rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        @keydown.enter.prevent="addFromInput"
      >
      <button
        type="button"
        class="press shrink-0 rounded-field border-[1.5px] border-hairline px-4 text-[13.5px] font-semibold text-dark hover:border-primary/40"
        @click="addFromInput"
      >
        Ajouter
      </button>
    </div>

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Langues mises à jour.</p>
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
