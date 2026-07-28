<script setup lang="ts">
import type { ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Dépôt du CV prestataire — extrait de app/pages/prestataire/cv.vue
 * (#hub-profil-modales) pour être réutilisé à la fois par cette page dédiée
 * et par la fenêtre ouverte depuis le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n({ useScope: 'global' })

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ACCEPTED_TYPES = ['application/pdf']

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const existing = data.value?.profile ?? null

const cvUrl = ref<string | null>(existing?.cvUrl ?? null)
const cvFileName = ref(existing?.cvFileName ?? '')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  error.value = ''
  if (!ACCEPTED_TYPES.includes(file.type)) {
    error.value = t('cvForm.errorFormat')
    input.value = ''
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = t('cvForm.errorSize')
    input.value = ''
    return
  }

  cvUrl.value = await readFileAsDataUrl(file)
  cvFileName.value = file.name
}

function removeCv() {
  cvUrl.value = null
  cvFileName.value = ''
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', {
      method: 'PATCH',
      body: {
        cvUrl: cvUrl.value,
        cvFileName: cvUrl.value ? cvFileName.value : null,
      },
    })
    success.value = true
    emit('saved')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('cvForm.errorSaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <label for="cv-file" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('cvForm.label') }}</label>
    <label
      for="cv-file"
      class="press mb-1.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ cvFileName || t('cvForm.choose') }}
    </label>
    <input id="cv-file" type="file" accept="application/pdf" class="sr-only" @change="onFileSelected">

    <div v-if="cvUrl" class="mb-3.5 flex items-center justify-between gap-3">
      <a :href="cvUrl" target="_blank" rel="noopener" class="press text-[12.5px] font-semibold text-primary">
        {{ t('cvForm.viewCurrent') }}
      </a>
      <button type="button" class="press text-[12.5px] font-semibold text-error" @click="removeCv">
        {{ t('cvForm.remove') }}
      </button>
    </div>
    <div v-else class="mb-3.5" />

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">{{ t('cvForm.success') }}</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('cvForm.saving') : t('cvForm.save') }}
    </button>
  </div>
</template>
