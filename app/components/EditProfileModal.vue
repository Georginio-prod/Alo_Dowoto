<script setup lang="ts">
import type { PublicUser } from '~~/server/utils/userStore'

const props = defineProps<{ user: PublicUser }>()
const emit = defineEmits<{ cancel: []; saved: [user: PublicUser] }>()

const username = ref(props.user.username)
const firstName = ref(props.user.firstName)
const lastName = ref(props.user.lastName)
const location = ref(props.user.location)
const error = ref('')
const isSubmitting = ref(false)
const success = ref(false)

async function submit() {
  if (isSubmitting.value) return
  error.value = ''

  if (!username.value.trim() || !firstName.value.trim() || !lastName.value.trim() || !location.value.trim()) {
    error.value = "Nom d'utilisateur, prénom, nom et localisation sont requis."
    return
  }

  isSubmitting.value = true
  try {
    const { user } = await $fetch<{ user: PublicUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: {
        username: username.value.trim(),
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        location: location.value.trim(),
      },
    })
    success.value = true
    // Bref message de confirmation avant fermeture, comme ChangePasswordModal
    // : le menu qui a ouvert cette modale s'est déjà refermé à l'ouverture.
    setTimeout(() => emit('saved', user), 900)
  } catch (fetchError) {
    const statusMessage = (fetchError as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || "La modification du profil a échoué. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => {
  if (!import.meta.client) return
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,35,24,0.5)] p-5"
      @click.self="emit('cancel')"
    >
      <div
        class="w-full max-w-[420px] animate-[wt-fade_0.18s_ease-out] rounded-2xl bg-white p-7"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier mon profil"
      >
        <template v-if="success">
          <div class="flex flex-col items-center py-4 text-center">
            <div class="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary">
              ✓
            </div>
            <p class="text-[14.5px] font-semibold text-dark">Profil mis à jour.</p>
          </div>
        </template>

        <template v-else>
          <h2 class="mb-5 text-lg font-bold text-dark">Modifier mon profil</h2>

          <label for="edit-profile-username" class="mb-1.5 block text-[13px] font-semibold text-dark">
            Nom d'utilisateur
          </label>
          <input
            id="edit-profile-username"
            v-model="username"
            type="text"
            class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >

          <div class="mb-3.5 flex gap-2">
            <div class="flex-1">
              <label for="edit-profile-first-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Prénom</label>
              <input
                id="edit-profile-first-name"
                v-model="firstName"
                type="text"
                class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
              >
            </div>
            <div class="flex-1">
              <label for="edit-profile-last-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Nom</label>
              <input
                id="edit-profile-last-name"
                v-model="lastName"
                type="text"
                class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
              >
            </div>
          </div>

          <label for="edit-profile-location" class="mb-1.5 block text-[13px] font-semibold text-dark">Localisation</label>
          <input
            id="edit-profile-location"
            v-model="location"
            type="text"
            placeholder="Ex. Lomé, Kara…"
            class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >

          <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="press flex-1 rounded-field border border-hairline bg-white py-3 text-[14px] font-semibold text-muted hover:text-dark"
              @click="emit('cancel')"
            >
              Annuler
            </button>
            <button
              type="button"
              class="press flex-1 rounded-field bg-primary py-3 text-[14px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="isSubmitting"
              @click="submit"
            >
              {{ isSubmitting ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
