<script setup lang="ts">
import type { PublicUser } from '~~/server/utils/userStore'

/**
 * Édition de l'identité (nom d'utilisateur, prénom, nom, localisation) —
 * extrait de app/pages/profil/identite.vue (#hub-profil-modales) pour être
 * réutilisé à la fois par cette page dédiée et par la fenêtre ouverte depuis
 * le hub `/profil`.
 */
const emit = defineEmits<{ saved: [] }>()

const { user, set: setSession } = useSession()

const username = ref(user.value?.username ?? '')
const firstName = ref(user.value?.firstName ?? '')
const lastName = ref(user.value?.lastName ?? '')
const location = ref(user.value?.location ?? '')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

async function submit() {
  if (isSubmitting.value) return
  error.value = ''
  success.value = false

  if (!username.value.trim() || !firstName.value.trim() || !lastName.value.trim() || !location.value.trim()) {
    error.value = "Nom d'utilisateur, prénom, nom et localisation sont requis."
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
    error.value = apiErrorMessage(fetchError, 'La modification du profil a échoué. Réessayez.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <label for="profile-username" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Nom d'utilisateur
    </label>
    <input
      id="profile-username"
      v-model="username"
      type="text"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <div class="mb-3.5 flex gap-2">
      <div class="flex-1">
        <label for="profile-first-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Prénom</label>
        <input
          id="profile-first-name"
          v-model="firstName"
          type="text"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
      <div class="flex-1">
        <label for="profile-last-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Nom</label>
        <input
          id="profile-last-name"
          v-model="lastName"
          type="text"
          class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </div>
    </div>

    <label for="profile-location" class="mb-1.5 block text-[13px] font-semibold text-dark">Localisation</label>
    <input
      id="profile-location"
      v-model="location"
      type="text"
      placeholder="Ex. Lomé, Kara…"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Profil mis à jour.</p>
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
