<script setup lang="ts">
import type { CertificationEntry, ProviderProfile } from '~~/server/utils/providerStore'

/**
 * Certification des aptitudes du prestataire — extrait de
 * app/pages/prestataire/certifications.vue (#hub-profil-modales) pour être
 * réutilisé à la fois par cette page dédiée et par la fenêtre ouverte
 * depuis le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n({ useScope: 'global' })

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const STATUS_LABEL = computed<Record<CertificationEntry['status'], string>>(() => ({
  en_attente: t('certificationsForm.statusPending'),
  verifiee: t('certificationsForm.statusVerified'),
}))
const STATUS_STYLE: Record<CertificationEntry['status'], string> = {
  en_attente: 'bg-primary/12 text-primary',
  verifiee: 'bg-primary text-white',
}

const { data } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me')
const certifications = ref<CertificationEntry[]>(
  (data.value?.profile?.certifications ?? []).map((c) => ({ ...c })),
)
const newTitle = ref('')
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
  if (!newTitle.value.trim()) {
    error.value = t('certificationsForm.errorTitleRequired')
    input.value = ''
    return
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    error.value = t('certificationsForm.errorFormat')
    input.value = ''
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = t('certificationsForm.errorSize')
    input.value = ''
    return
  }

  const fileUrl = await readFileAsDataUrl(file)
  certifications.value.push({
    id: crypto.randomUUID(),
    title: newTitle.value.trim(),
    fileUrl,
    fileName: file.name,
    status: 'en_attente',
  })
  newTitle.value = ''
  input.value = ''
}

function removeCertification(id: string) {
  certifications.value = certifications.value.filter((c) => c.id !== id)
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  isSubmitting.value = true
  try {
    await $fetch('/api/providers/me', { method: 'PATCH', body: { certifications: certifications.value } })
    success.value = true
    emit('saved')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('certificationsForm.errorSaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="certifications.length" class="mb-4 flex flex-col gap-2.5">
      <div
        v-for="cert in certifications"
        :key="cert.id"
        class="flex items-center justify-between gap-3 rounded-field border border-hairline p-3"
      >
        <div class="min-w-0">
          <p class="truncate text-[13.5px] font-semibold text-dark">{{ cert.title }}</p>
          <span class="mt-1 inline-block rounded-pill px-2 py-0.5 text-[10.5px] font-bold" :class="STATUS_STYLE[cert.status]">
            {{ STATUS_LABEL[cert.status] }}
          </span>
        </div>
        <button
          type="button"
          class="press shrink-0 text-[12px] font-semibold text-error"
          @click="removeCertification(cert.id)"
        >
          {{ t('certificationsForm.remove') }}
        </button>
      </div>
    </div>

    <label for="cert-title" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('certificationsForm.titleLabel') }}</label>
    <input
      id="cert-title"
      v-model="newTitle"
      type="text"
      :placeholder="t('certificationsForm.titlePlaceholder')"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <label for="cert-file" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('certificationsForm.fileLabel') }}</label>
    <label
      for="cert-file"
      class="press mb-3.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ t('certificationsForm.chooseFile') }}
    </label>
    <input id="cert-file" type="file" accept="application/pdf,image/jpeg,image/png" class="sr-only" @change="onFileSelected">

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">{{ t('certificationsForm.success') }}</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('certificationsForm.saving') : t('certificationsForm.save') }}
    </button>
  </div>
</template>
