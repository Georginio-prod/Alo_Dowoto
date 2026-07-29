<script setup lang="ts">
import type { SignupProfile } from '~/components/AuthContactStep.vue'
import type { PublicUser } from '~~/server/utils/userStore'

/**
 * Étape « mot de passe » du parcours d'authentification (#125 création à
 * l'inscription, #126 saisie obligatoire à la connexion). Extrait de
 * app/pages/auth.vue pour respecter la limite de lignes par fichier.
 */

const props = defineProps<{
  mode: 'signup' | 'login'
  method: 'phone' | 'email'
  contactValue: string
  role: 'client' | 'prestataire'
  /** Collecté à la première page (#username/prénom/nom/localisation), requis à la création du compte. */
  profile?: SignupProfile
  /** Porté par le lien de parrainage partagé (#365, /parrainage) — voir app/pages/auth.vue. */
  referralCode?: string
}>()

const emit = defineEmits<{
  'signup-success': []
  'login-success': [user: PublicUser]
}>()

const { t } = useI18n({ useScope: 'global' })
const { set: setSession } = useSession()

const signupPassword = ref('')
const signupConfirmPassword = ref('')
const loginPassword = ref('')
const rememberMe = ref(true)
const passwordError = ref('')
const isSubmitting = ref(false)
const forgotPasswordMessage = ref('')

function passwordRuleScore(value: string): number {
  let score = 0
  if (value.length >= 8) score++
  if (/[A-Z]/.test(value)) score++
  if (/\d/.test(value)) score++
  if (/[^A-Za-z0-9]/.test(value)) score++
  return score
}
const passwordScore = computed(() => passwordRuleScore(signupPassword.value))
const passwordStrengthLabel = computed(() => {
  if (!signupPassword.value) return ''
  const keys = ['strengthTooWeak', 'strengthWeak', 'strengthMedium', 'strengthGood', 'strengthStrong']
  return t(`authPasswordStep.${keys[passwordScore.value]}`)
})
const passwordStrengthClass = computed(() => {
  if (passwordScore.value <= 1) return 'bg-error'
  if (passwordScore.value === 2) return 'bg-star'
  return 'bg-primary'
})
const passwordsMatch = computed(
  () => signupPassword.value.length > 0 && signupPassword.value === signupConfirmPassword.value,
)


async function submitSignupPassword() {
  if (isSubmitting.value) return
  passwordError.value = ''

  if (passwordScore.value < 4) {
    passwordError.value = t('authPasswordStep.errorRulesNotMet')
    return
  }
  if (!passwordsMatch.value) {
    passwordError.value = t('authPasswordStep.errorMismatch')
    return
  }

  isSubmitting.value = true
  try {
    const { user } = await $fetch<{ user: PublicUser }>('/api/auth/session', {
      method: 'POST',
      body: {
        method: props.method,
        value: props.contactValue,
        role: props.role,
        username: props.profile?.username,
        firstName: props.profile?.firstName,
        lastName: props.profile?.lastName,
        location: props.profile?.location,
        latitude: props.profile?.latitude,
        longitude: props.profile?.longitude,
        referralCode: props.referralCode,
      },
    })
    await $fetch('/api/auth/password', {
      method: 'POST',
      body: { password: signupPassword.value, confirmPassword: signupConfirmPassword.value },
    })
    setSession(user)
    emit('signup-success')
  } catch (error) {
    const message = apiErrorMessage(error, '')
    // Contact déjà associé à un compte finalisé (voir server/api/auth/session.post.ts) :
    // le formulaire ci-dessus ne propose que des champs de *nouveau* mot de
    // passe, donc renvoyer tel quel « Mot de passe requis. » serait
    // incompréhensible ici — on oriente explicitement vers la connexion.
    passwordError.value =
      message === 'Mot de passe requis.'
        ? t('authPasswordStep.errorAccountExists')
        : message || t('authPasswordStep.errorSignupFailed')
  } finally {
    isSubmitting.value = false
  }
}

async function submitLoginPassword() {
  if (isSubmitting.value || !loginPassword.value) return
  isSubmitting.value = true
  passwordError.value = ''
  try {
    const { user } = await $fetch<{ user: PublicUser }>('/api/auth/session', {
      method: 'POST',
      body: { method: props.method, value: props.contactValue, password: loginPassword.value, rememberMe: rememberMe.value },
    })
    setSession(user)
    emit('login-success', user)
  } catch (error) {
    passwordError.value = apiErrorMessage(error, t('authPasswordStep.errorLoginFailed'))
  } finally {
    isSubmitting.value = false
  }
}

function submitPassword() {
  if (props.mode === 'signup') submitSignupPassword()
  else submitLoginPassword()
}

function requestPasswordReset() {
  forgotPasswordMessage.value = t('authPasswordStep.forgotPasswordMessage')
}
</script>

<template>
  <div v-if="mode === 'signup'">
    <label for="auth-password" class="mb-1 block text-[13px] font-semibold text-dark">
      {{ t('authPasswordStep.signupLabel') }}
    </label>
    <p class="mb-3 text-[13px] leading-relaxed text-muted">
      {{ t('authPasswordStep.signupHint') }}
    </p>

    <input
      id="auth-password"
      v-model="signupPassword"
      type="password"
      autocomplete="new-password"
      :placeholder="t('authPasswordStep.passwordPlaceholder')"
      :aria-label="t('authPasswordStep.passwordPlaceholder')"
      class="mb-2 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
    >

    <div v-if="signupPassword" class="mb-1 flex gap-1">
      <span
        v-for="n in 4"
        :key="n"
        class="h-1.5 flex-1 rounded-pill bg-hairline"
        :class="{ [passwordStrengthClass]: n <= passwordScore }"
      />
    </div>
    <p v-if="signupPassword" class="mb-3 text-[12px] font-semibold text-muted">
      {{ t('authPasswordStep.strengthPrefix', { label: passwordStrengthLabel }) }}
    </p>

    <ul class="mb-3.5 list-inside list-disc space-y-0.5 text-[12px] text-muted">
      <li :class="{ 'text-primary': signupPassword.length >= 8 }">{{ t('authPasswordStep.ruleMinLength') }}</li>
      <li :class="{ 'text-primary': /[A-Z]/.test(signupPassword) }">{{ t('authPasswordStep.ruleUppercase') }}</li>
      <li :class="{ 'text-primary': /\d/.test(signupPassword) }">{{ t('authPasswordStep.ruleDigit') }}</li>
      <li :class="{ 'text-primary': /[^A-Za-z0-9]/.test(signupPassword) }">{{ t('authPasswordStep.ruleSpecial') }}</li>
    </ul>

    <input
      v-model="signupConfirmPassword"
      type="password"
      autocomplete="new-password"
      :placeholder="t('authPasswordStep.confirmPlaceholder')"
      :aria-label="t('authPasswordStep.confirmPlaceholder')"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      :class="signupConfirmPassword && !passwordsMatch ? 'border-error' : 'border-hairline'"
    >
    <p v-if="signupConfirmPassword && !passwordsMatch" class="mb-1 text-[12.5px] text-error">
      {{ t('authPasswordStep.confirmMismatch') }}
    </p>

    <p v-if="passwordError" class="my-1 text-[12.5px] text-error">{{ passwordError }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submitPassword"
    >
      {{ isSubmitting ? t('authPasswordStep.creating') : t('authPasswordStep.continueCta') }}
    </button>
  </div>

  <div v-else>
    <label for="auth-login-password" class="mb-1.5 block text-[13px] font-semibold text-dark">
      {{ t('authPasswordStep.loginPasswordLabel') }}
    </label>
    <input
      id="auth-login-password"
      v-model="loginPassword"
      type="password"
      autocomplete="current-password"
      :placeholder="t('authPasswordStep.loginPasswordPlaceholder')"
      :aria-label="t('authPasswordStep.loginPasswordLabel')"
      class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      @keyup.enter="submitPassword"
    >

    <p v-if="passwordError" class="my-1 text-[12.5px] text-error">{{ passwordError }}</p>

    <div class="mt-2 flex items-center justify-between">
      <label class="flex items-center gap-2 text-[12.5px] text-muted">
        <input v-model="rememberMe" type="checkbox" class="size-4 rounded-sm border-hairline accent-primary">
        {{ t('authPasswordStep.rememberMe') }}
      </label>
      <button type="button" class="press text-[12.5px] font-semibold text-primary" @click="requestPasswordReset">
        {{ t('authPasswordStep.forgotPassword') }}
      </button>
    </div>
    <p v-if="forgotPasswordMessage" class="mt-1.5 text-[12px] text-muted">{{ forgotPasswordMessage }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!loginPassword || isSubmitting"
      @click="submitPassword"
    >
      {{ isSubmitting ? t('authPasswordStep.connecting') : t('authPasswordStep.loginCta') }}
    </button>
  </div>
</template>
