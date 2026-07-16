<script setup lang="ts">
import type { PublicUser } from '~~/server/utils/userStore'

definePageMeta({ layout: 'blank', middleware: 'auth' })

const { user, set: setSession } = useSession()

const username = ref(user.value?.username ?? '')
const firstName = ref(user.value?.firstName ?? '')
const lastName = ref(user.value?.lastName ?? '')
const location = ref(user.value?.location ?? '')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

const backPath = computed(() => (user.value?.role === 'prestataire' ? '/prestataire' : '/dashboard/client'))

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
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, 'La modification du profil a échoué. Réessayez.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink :to="backPath" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
        <p class="mt-1 text-[13.5px] text-muted">Modifiez vos informations quand vous le souhaitez.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Modifier mon profil</h1>

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

      <div class="mt-5 rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h2 class="mb-1.5 text-lg font-bold text-dark">Vérification d'identité</h2>
        <p class="mb-5 text-[13px] leading-relaxed text-muted">
          Obligatoire avant votre première demande (chercheur) ou avant de pouvoir être contacté (prestataire).
        </p>
        <IdentityVerificationForm />
      </div>
    </div>
  </div>
</template>
