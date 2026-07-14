<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { user } = useSession()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

const backPath = computed(() => (user.value?.role === 'prestataire' ? '/prestataire' : '/dashboard/client'))

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
    const statusMessage = (fetchError as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || 'Le changement de mot de passe a échoué. Réessayez.'
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
        <p class="mt-1 text-[13.5px] text-muted">Changez votre mot de passe quand vous le souhaitez.</p>
      </div>

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <h1 class="mb-5 text-lg font-bold text-dark">Changer le mot de passe</h1>

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
    </div>
  </div>
</template>
