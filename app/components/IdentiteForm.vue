<script setup lang="ts">
import type { PublicUser } from '~~/server/utils/userStore'

/**
 * Édition de l'identité (nom d'utilisateur, prénom, nom, localisation) —
 * extrait de app/pages/profil/identite.vue (#hub-profil-modales) pour être
 * réutilisé à la fois par cette page dédiée et par la fenêtre ouverte depuis
 * le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

const { t } = useI18n({ useScope: 'global' })
const { user, set: setSession } = useSession()

const username = ref(user.value?.username ?? '')
const firstName = ref(user.value?.firstName ?? '')
const lastName = ref(user.value?.lastName ?? '')
const location = ref(user.value?.location ?? '')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

// Suppression de la position GPS enregistrée (#geoloc, partie 3 — vie
// privée) : action distincte de l'enregistrement du profil ci-dessus, voir
// server/utils/userStore.ts#clearUserPosition.
const hasStoredPosition = computed(() => user.value?.latitude !== undefined)
const isClearingPosition = ref(false)
const clearPositionError = ref('')

async function clearPosition() {
  if (isClearingPosition.value) return
  isClearingPosition.value = true
  clearPositionError.value = ''
  try {
    const { user: updated } = await $fetch<{ user: PublicUser }>('/api/auth/position', { method: 'DELETE' })
    setSession(updated)
  } catch (fetchError) {
    clearPositionError.value = apiErrorMessage(fetchError, t('identiteForm.errorClearPosition'))
  } finally {
    isClearingPosition.value = false
  }
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  if (!username.value.trim() || !firstName.value.trim() || !lastName.value.trim() || !location.value.trim()) {
    error.value = t('identiteForm.errorRequired')
    return
  }

  isSubmitting.value = true
  try {
    const { user: updated } = await $fetch<{ user: PublicUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: {
        username: username.value.trim(),
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        location: location.value.trim(),
      },
    })
    // État partagé (useSession.ts) : le prénom affiché sur "Mon espace" et
    // ailleurs se met à jour immédiatement, sans rechargement.
    setSession(updated)
    success.value = true
    emit('saved')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, t('identiteForm.errorSaveFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <label for="profile-username" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('identiteForm.usernameLabel') }}
    </label>
    <input
      id="profile-username"
      v-model="username"
      type="text"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <div class="mb-3.5 flex gap-2">
      <div class="flex-1">
        <label for="profile-first-name" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('identiteForm.firstNameLabel') }}</label>
        <input
          id="profile-first-name"
          v-model="firstName"
          type="text"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
      <div class="flex-1">
        <label for="profile-last-name" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('identiteForm.lastNameLabel') }}</label>
        <input
          id="profile-last-name"
          v-model="lastName"
          type="text"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
    </div>

    <label for="profile-location" class="mb-1.5 block text-[13px] font-semibold text-dark">{{ t('identiteForm.locationLabel') }}</label>
    <input
      id="profile-location"
      v-model="location"
      type="text"
      :placeholder="t('identiteForm.locationPlaceholder')"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">{{ t('identiteForm.success') }}</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? t('identiteForm.saving') : t('identiteForm.save') }}
    </button>

    <div class="mt-5 border-t border-hairline pt-4">
      <p class="mb-1 text-[13px] font-semibold text-dark">{{ t('identiteForm.gpsTitle') }}</p>
      <p class="mb-2 text-[12px] text-muted">
        {{ hasStoredPosition ? t('identiteForm.gpsStored') : t('identiteForm.gpsNotStored') }}
      </p>
      <button
        v-if="hasStoredPosition"
        type="button"
        class="press text-[12.5px] font-semibold text-error underline disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isClearingPosition"
        @click="clearPosition"
      >
        {{ isClearingPosition ? t('identiteForm.clearing') : t('identiteForm.clearPosition') }}
      </button>
      <p v-if="clearPositionError" class="mt-1 text-[12px] text-error">{{ clearPositionError }}</p>
    </div>
  </div>
</template>
