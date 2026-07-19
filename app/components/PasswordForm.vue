<script setup lang="ts">
/**
 * Changement de mot de passe — extrait de app/pages/mot-de-passe.vue
 * (#hub-profil-modales) pour être réutilisé à la fois par cette page dédiée
 * et par la fenêtre ouverte depuis le hub `/profil`.
 */
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

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
  success.value = false

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
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, 'Le changement de mot de passe a échoué. Réessayez.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <label for="pw-current" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Mot de passe actuel
    </label>
    <input
      id="pw-current"
      v-model="currentPassword"
      type="password"
      autocomplete="current-password"
      class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <label for="pw-new" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Nouveau mot de passe
    </label>
    <input
      id="pw-new"
      v-model="newPassword"
      type="password"
      autocomplete="new-password"
      class="mb-2 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <div v-if="newPassword" class="mb-1 flex gap-1">
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

    <label for="pw-confirm" class="mb-1.5 block text-[13px] font-semibold text-dark">
      Confirmer le nouveau mot de passe
    </label>
    <input
      id="pw-confirm"
      v-model="confirmPassword"
      type="password"
      autocomplete="new-password"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      :class="confirmPassword && !passwordsMatch ? 'border-error' : 'border-hairline'"
    >

    <p v-if="success" class="my-1 text-[12.5px] font-semibold text-primary">Mot de passe modifié.</p>
    <p v-if="error" class="my-1 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Modification…' : 'Confirmer' }}
    </button>
  </div>
</template>
