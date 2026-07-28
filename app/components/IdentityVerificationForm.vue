<script setup lang="ts">
/**
 * Formulaire de vérification d'identité (#180+1) : télé-versement de la
 * carte d'identité puis d'une photo passeport (fond blanc, format
 * international). Réutilisé par AuthIdentityStep.vue (étape facultative de
 * l'inscription) et par profil.vue (complétion après coup) — voir
 * server/utils/verificationStore.ts pour la certification côté serveur.
 */

const emit = defineEmits<{ submitted: [] }>()

const { t } = useI18n({ useScope: 'global' })

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

const { user, refresh: refreshSession } = useSession()

const idCardImage = ref<string | null>(null)
const idCardFileName = ref('')
const passportPhotoImage = ref<string | null>(null)
const passportPhotoFileName = ref('')
const error = ref('')
const isSubmitting = ref(false)
const justSubmitted = ref(false)

const isVerified = computed(() => justSubmitted.value || (user.value?.verified ?? false))
const isValid = computed(() => idCardImage.value !== null && passportPhotoImage.value !== null)

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFileSelected(event: Event, target: 'idCard' | 'passportPhoto') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  error.value = ''

  if (!ACCEPTED_TYPES.includes(file.type)) {
    error.value = t('identityVerificationForm.errorFormat')
    input.value = ''
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = t('identityVerificationForm.errorSize')
    input.value = ''
    return
  }

  const dataUrl = await readFileAsDataUrl(file)
  if (target === 'idCard') {
    idCardImage.value = dataUrl
    idCardFileName.value = file.name
  } else {
    passportPhotoImage.value = dataUrl
    passportPhotoFileName.value = file.name
  }
}

async function submit() {
  if (!isValid.value || isSubmitting.value) return
  isSubmitting.value = true
  error.value = ''
  try {
    await $fetch('/api/verification', {
      method: 'POST',
      body: { idCardImage: idCardImage.value, passportPhotoImage: passportPhotoImage.value },
    })
    justSubmitted.value = true
    await refreshSession()
    emit('submitted')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('identityVerificationForm.errorSubmitFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isVerified" class="rounded-card border border-hairline bg-surface p-4">
    <p class="flex items-center gap-2 text-[13.5px] font-semibold text-dark">
      <span class="flex size-6 items-center justify-center rounded-full bg-primary/12 text-[12px] text-primary">✓</span>
      {{ t('identityVerificationForm.verifiedLabel') }}
    </p>
    <p class="mt-1 text-[12.5px] leading-relaxed text-muted">
      {{ t('identityVerificationForm.verifiedHint') }}
    </p>
  </div>

  <div v-else>
    <label for="verif-id-card" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('identityVerificationForm.idCardLabel') }}
    </label>
    <label
      for="verif-id-card"
      class="press mb-3.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ idCardFileName || t('identityVerificationForm.choosePhoto') }}
    </label>
    <input
      id="verif-id-card"
      type="file"
      accept="image/jpeg,image/png"
      class="sr-only"
      @change="onFileSelected($event, 'idCard')"
    >

    <label for="verif-passport-photo" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('identityVerificationForm.passportLabel') }}
    </label>
    <label
      for="verif-passport-photo"
      class="press mb-1.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ passportPhotoFileName || t('identityVerificationForm.choosePhoto') }}
    </label>
    <input
      id="verif-passport-photo"
      type="file"
      accept="image/jpeg,image/png"
      class="sr-only"
      @change="onFileSelected($event, 'passportPhoto')"
    >
    <p class="mb-3.5 text-[12px] text-muted">
      {{ t('identityVerificationForm.passportHint') }}
    </p>

    <p v-if="error" class="mb-3 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isValid || isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('identityVerificationForm.submitting') : t('identityVerificationForm.submit') }}
    </button>
  </div>
</template>
