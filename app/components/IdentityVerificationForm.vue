<script setup lang="ts">
/**
 * Formulaire de vérification d'identité (#180+1) : télé-versement de la
 * carte d'identité puis d'une photo passeport (fond blanc, format
 * international). Réutilisé par AuthIdentityStep.vue (étape facultative de
 * l'inscription) et par profil.vue (complétion après coup) — voir
 * server/utils/verificationStore.ts pour la certification côté serveur.
 */

const emit = defineEmits<{ submitted: [] }>()

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
    error.value = 'Formats acceptés : JPEG ou PNG.'
    input.value = ''
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    error.value = 'Chaque photo doit faire 5 Mo maximum.'
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
    const statusMessage = (fetchError as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || 'L\'envoi de vos documents a échoué. Réessayez.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isVerified" class="rounded-card border border-hairline bg-surface p-4">
    <p class="flex items-center gap-2 text-[13.5px] font-semibold text-dark">
      <span class="flex size-6 items-center justify-center rounded-full bg-primary/12 text-[12px] text-primary">✓</span>
      Identité vérifiée
    </p>
    <p class="mt-1 text-[12.5px] leading-relaxed text-muted">
      Votre compte est certifié. Cette vérification n'est à faire qu'une seule fois.
    </p>
  </div>

  <div v-else>
    <label for="verif-id-card" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Carte d'identité (recto)
    </label>
    <label
      for="verif-id-card"
      class="press mb-3.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ idCardFileName || 'Choisir une photo (JPEG ou PNG, 5 Mo max)' }}
    </label>
    <input
      id="verif-id-card"
      type="file"
      accept="image/jpeg,image/png"
      class="sr-only"
      @change="onFileSelected($event, 'idCard')"
    >

    <label for="verif-passport-photo" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Photo passeport (fond blanc, format international)
    </label>
    <label
      for="verif-passport-photo"
      class="press mb-1.5 flex h-[46px] w-full cursor-pointer items-center rounded-field border-[1.5px] border-dashed border-hairline px-3.5 text-[13.5px] text-muted hover:border-primary/40"
    >
      {{ passportPhotoFileName || 'Choisir une photo (JPEG ou PNG, 5 Mo max)' }}
    </label>
    <input
      id="verif-passport-photo"
      type="file"
      accept="image/jpeg,image/png"
      class="sr-only"
      @change="onFileSelected($event, 'passportPhoto')"
    >
    <p class="mb-3.5 text-[12px] text-muted">
      Visage centré, expression neutre, fond blanc uni — comme pour une photo d'identité officielle.
    </p>

    <p v-if="error" class="mb-3 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isValid || isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Envoi…' : 'Vérifier mon identité' }}
    </button>
  </div>
</template>
