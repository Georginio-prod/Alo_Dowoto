<script setup lang="ts">
/**
 * Étape « contact » (première page) du parcours d'authentification — envoie
 * le code OTP réel (#125). En inscription uniquement, collecte aussi le nom
 * d'utilisateur, le prénom, le nom et la localisation (pour chercheur et
 * prestataire). Le bouton Google démarre le vrai flux OAuth (#219) via
 * l'événement `google` ; au retour d'une inscription Google, `google`
 * (prop) préremplit le formulaire et l'étape OTP est sautée (l'email est
 * déjà vérifié par Google côté serveur).
 */

type Method = 'phone' | 'email'

export interface SignupProfile {
  username: string
  firstName: string
  lastName: string
  location: string
}

export interface PendingGoogleSignup {
  email: string
  firstName: string
  lastName: string
}

const props = defineProps<{
  cta: string
  mode: 'login' | 'signup'
  /** Profil Google en attente d'inscription (retour du callback OAuth, #219). */
  google?: PendingGoogleSignup | null
}>()
const emit = defineEmits<{
  sent: [payload: { method: Method; value: string; devCode?: string; profile?: SignupProfile; skipOtp?: boolean }]
  google: []
}>()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const method = ref<Method>(props.google ? 'email' : 'phone')
const phone = ref('')
const email = ref(props.google?.email ?? '')
const contactError = ref('')
const isSubmitting = ref(false)

const username = ref('')
const firstName = ref(props.google?.firstName ?? '')
const lastName = ref(props.google?.lastName ?? '')
const location = ref('')

const contactValue = computed(() => (method.value === 'phone' ? phone.value : email.value))
const isSignup = computed(() => props.mode === 'signup')
const isGoogleSignup = computed(() => isSignup.value && !!props.google)

function selectMethod(m: Method) {
  method.value = m
  contactError.value = ''
}

async function submit() {
  if (isSignup.value) {
    if (!username.value.trim() || !firstName.value.trim() || !lastName.value.trim() || !location.value.trim()) {
      contactError.value = 'Merci de renseigner nom d\'utilisateur, prénom, nom et localisation.'
      return
    }
  }

  if (method.value === 'phone') {
    if (phone.value.replace(/\D/g, '').length < 8) {
      contactError.value = 'Entrez un numéro valide (8 chiffres).'
      return
    }
  } else if (!EMAIL_RE.test(email.value.trim())) {
    contactError.value = 'Entrez une adresse email valide.'
    return
  }

  const profile = isSignup.value
    ? {
        username: username.value.trim(),
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        location: location.value.trim(),
      }
    : undefined

  // Inscription via Google : l'email a déjà été vérifié par Google (le
  // callback a marqué le contact comme vérifié côté serveur, #219) — pas
  // d'OTP à envoyer, on passe directement à l'étape mot de passe.
  if (isGoogleSignup.value) {
    emit('sent', { method: 'email', value: email.value, profile, skipOtp: true })
    return
  }

  if (isSubmitting.value) return
  isSubmitting.value = true
  contactError.value = ''
  try {
    // `devCode` n'est renvoyé que hors production (voir server/api/auth/otp/send.post.ts)
    // — en l'absence de provider SMS/email réel (#23), c'est le seul moyen de
    // tester le parcours sans lire les logs serveur.
    const { devCode } = await $fetch<{ devCode?: string }>('/api/auth/otp/send', {
      method: 'POST',
      body: { method: method.value, value: contactValue.value },
    })
    emit('sent', { method: method.value, value: contactValue.value, devCode, profile })
  } catch (error) {
    contactError.value = apiErrorMessage(error, "L'envoi du code a échoué. Réessayez.")
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <template v-if="!isGoogleSignup">
      <button
        type="button"
        class="press mb-3.5 flex w-full items-center justify-center gap-2.5 rounded-field border-[1.5px] border-hairline bg-white py-3 text-[14px] font-semibold text-dark hover:border-primary/40"
        @click="emit('google')"
      >
        <svg class="size-[18px]" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
        </svg>
        {{ isSignup ? "S'inscrire avec Google" : 'Se connecter avec Google' }}
      </button>

      <div class="mb-3.5 flex items-center gap-3 text-[11.5px] font-semibold uppercase text-muted">
        <span class="h-px flex-1 bg-hairline" />
        ou
        <span class="h-px flex-1 bg-hairline" />
      </div>
    </template>

    <div
      v-else
      class="mb-3.5 flex items-center gap-2.5 rounded-field border-[1.5px] border-primary/30 bg-primary/5 px-3.5 py-3 text-[13px] text-dark"
    >
      <svg class="size-[18px] shrink-0" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
      </svg>
      <span>
        Compte Google vérifié : <strong>{{ google?.email }}</strong>.
        Complétez votre profil pour terminer l'inscription.
      </span>
    </div>

    <template v-if="isSignup">
      <label for="auth-username" class="mb-1.5 block text-[13px] font-semibold text-dark">Nom d'utilisateur</label>
      <input
        id="auth-username"
        v-model="username"
        type="text"
        placeholder="Ex. marie90"
        aria-label="Nom d'utilisateur"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >

      <div class="mb-3.5 flex gap-2">
        <div class="flex-1">
          <label for="auth-first-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Prénom</label>
          <input
            id="auth-first-name"
            v-model="firstName"
            type="text"
            placeholder="Marie"
            aria-label="Prénom"
            class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >
        </div>
        <div class="flex-1">
          <label for="auth-last-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Nom</label>
          <input
            id="auth-last-name"
            v-model="lastName"
            type="text"
            placeholder="Dupont"
            aria-label="Nom"
            class="h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >
        </div>
      </div>

      <label for="auth-location" class="mb-1.5 block text-[13px] font-semibold text-dark">Localisation</label>
      <input
        id="auth-location"
        v-model="location"
        type="text"
        placeholder="Ex. Lomé, Kara…"
        aria-label="Localisation"
        class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
      >
    </template>

    <template v-if="!isGoogleSignup">
      <div class="mb-[18px] flex gap-2">
        <button
          type="button"
          class="press flex-1 rounded-[8px] border py-2.5 text-[13px] font-semibold"
          :class="method === 'phone' ? 'border-transparent bg-dark text-white' : 'border-hairline bg-white text-muted'"
          @click="selectMethod('phone')"
        >
          Téléphone
        </button>
        <button
          type="button"
          class="press flex-1 rounded-[8px] border py-2.5 text-[13px] font-semibold"
          :class="method === 'email' ? 'border-transparent bg-dark text-white' : 'border-hairline bg-white text-muted'"
          @click="selectMethod('email')"
        >
          Email
        </button>
      </div>

      <template v-if="method === 'phone'">
        <label for="auth-phone" class="mb-1.5 block text-[13px] font-semibold text-dark">Numéro de téléphone</label>
        <div class="mb-1.5 flex gap-2">
          <div class="flex h-[46px] w-16 shrink-0 items-center justify-center rounded-field border-[1.5px] border-hairline bg-bg text-[14.5px] font-semibold text-dark">
            +228
          </div>
          <input
            id="auth-phone"
            v-model="phone"
            type="tel"
            inputmode="numeric"
            placeholder="90 12 34 56"
            aria-label="Numéro de téléphone"
            class="h-[46px] min-w-0 flex-1 rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >
        </div>
      </template>
      <template v-else>
        <label for="auth-email" class="mb-1.5 block text-[13px] font-semibold text-dark">Adresse email</label>
        <input
          id="auth-email"
          v-model="email"
          type="email"
          placeholder="vous@exemple.com"
          aria-label="Adresse email"
          class="mb-1.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
      </template>
    </template>

    <p v-if="contactError" class="my-1 text-[12.5px] text-error">{{ contactError }}</p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Envoi…' : cta }}
    </button>
    <p v-if="!isGoogleSignup" class="mt-3.5 text-center text-[11.5px] leading-relaxed text-muted">
      En continuant, un code à 6 chiffres vous sera envoyé pour vérifier votre identité.
    </p>
  </div>
</template>
