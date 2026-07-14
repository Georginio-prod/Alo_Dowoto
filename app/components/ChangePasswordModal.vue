<script setup lang="ts">
const emit = defineEmits<{ cancel: []; changed: [] }>()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const isSubmitting = ref(false)
const success = ref(false)

function passwordRuleScore(value: string): number {
  let score = 0
  if (value.length >= 8) score++
  if (/[A-Z]/.test(value)) score++
  if (/\d/.test(value)) score++
  if (/[^A-Za-z0-9]/.test(value)) score++
  return score
}
const passwordScore = computed(() => passwordRuleScore(newPassword.value))
const passwordsMatch = computed(() => newPassword.value.length > 0 && newPassword.value === confirmPassword.value)

async function submit() {
  if (isSubmitting.value) return
  error.value = ''

  if (!currentPassword.value) {
    error.value = 'Entrez votre mot de passe actuel.'
    return
  }
  if (passwordScore.value < 4) {
    error.value = 'Le nouveau mot de passe ne respecte pas encore toutes les règles ci-dessous.'
    return
  }
  if (!passwordsMatch.value) {
    error.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/auth/password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, password: newPassword.value, confirmPassword: confirmPassword.value },
    })
    success.value = true
    // Bref message de confirmation avant fermeture : le menu qui a ouvert
    // cette modale se referme dès l'ouverture, donc rien d'autre à l'écran
    // ne confirmerait autrement que le changement a bien eu lieu.
    setTimeout(() => emit('changed'), 1100)
  } catch (fetchError) {
    const statusMessage = (fetchError as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || "Le changement de mot de passe a échoué. Réessayez."
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
        aria-label="Changer le mot de passe"
      >
        <template v-if="success">
          <div class="flex flex-col items-center py-4 text-center">
            <div class="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/12 text-xl text-primary">
              ✓
            </div>
            <p class="text-[14.5px] font-semibold text-dark">Mot de passe modifié.</p>
          </div>
        </template>

        <template v-else>
          <h2 class="mb-5 text-lg font-bold text-dark">Changer le mot de passe</h2>

          <label for="change-pw-current" class="mb-1.5 block text-[13px] font-semibold text-dark">
            Mot de passe actuel
          </label>
          <input
            id="change-pw-current"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >

          <label for="change-pw-new" class="mb-1.5 block text-[13px] font-semibold text-dark">
            Nouveau mot de passe
          </label>
          <input
            id="change-pw-new"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            class="mb-2 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >

          <div v-if="newPassword" class="mb-3 flex gap-1">
            <span
              v-for="n in 4"
              :key="n"
              class="h-1.5 flex-1 rounded-pill bg-hairline"
              :class="{ 'bg-primary': n <= passwordScore }"
            />
          </div>

          <ul class="mb-3.5 list-inside list-disc space-y-0.5 text-[12px] text-muted">
            <li :class="{ 'text-primary': newPassword.length >= 8 }">8 caractères minimum</li>
            <li :class="{ 'text-primary': /[A-Z]/.test(newPassword) }">Une majuscule</li>
            <li :class="{ 'text-primary': /\d/.test(newPassword) }">Un chiffre</li>
            <li :class="{ 'text-primary': /[^A-Za-z0-9]/.test(newPassword) }">Un caractère spécial</li>
          </ul>

          <label for="change-pw-confirm" class="mb-1.5 block text-[13px] font-semibold text-dark">
            Confirmer le nouveau mot de passe
          </label>
          <input
            id="change-pw-confirm"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
            :class="confirmPassword && !passwordsMatch ? 'border-error' : 'border-hairline'"
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
              {{ isSubmitting ? 'Modification…' : 'Confirmer' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
