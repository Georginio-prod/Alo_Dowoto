<script setup lang="ts">
/**
 * Écrans 2 et 3 du parcours mobile — Connexion / Inscription puis Vérification
 * du code (parties C, D, E).
 *
 * Version mobile native de l'authentification : on réutilise les étapes déjà
 * éprouvées du parcours web (AuthContactStep, AuthOtpStep, AuthPasswordStep,
 * AuthIdentityStep, AuthPayoutStep + endpoints /api/auth/*), mais présentées
 * dans un layout nu, sans la barre du site, sans carte flottante, sans bulle
 * de chat ni sélecteur de thème. On ajoute ce qui manquait : rappel du rôle
 * choisi, consentement légal, bannière hors connexion, lien d'aide discret,
 * et une coche animée à la vérification réussie.
 */
import type { SignupProfile } from '~/components/AuthContactStep.vue'
import { SECTORS } from '~/data/sectors'
import type { PublicUser } from '~~/server/utils/userStore'

type Tab = 'login' | 'signup'
type Role = 'client' | 'prestataire'
type Method = 'phone' | 'email'
type Step = 'contact' | 'otp' | 'password' | 'identity' | 'sector' | 'payout'

definePageMeta({
  layout: 'onboarding',
  pageTransition: { name: 'ob-slide', mode: 'out-in' },
})

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const { role: storedRole, set: setStoredRole, hydrate: hydrateRole, isRole } = useOnboardingRole()

hydrateRole()

// Présélection automatique (partie C) : arrivée depuis un bouton de rôle de
// l'écran 1 → onglet Inscription ; arrivée depuis « déjà un compte ? » →
// onglet Connexion. `mode=login` force la connexion même si un rôle traîne.
const activeTab = ref<Tab>(route.query.mode === 'login' ? 'login' : 'signup')

// Rôle : priorité à l'URL, sinon rôle mémorisé (survit à une fermeture
// accidentelle, partie E), sinon client par défaut.
const initialRole: Role = isRole(route.query.role) ? route.query.role : storedRole.value
const role = ref<Role>(initialRole)
if (activeTab.value === 'signup') setStoredRole(role.value)

const step = ref<Step>('contact')

const contactMethod = ref<Method>('phone')
const contactValue = ref('')
const otpDevCode = ref<string | undefined>(undefined)
const signupProfile = ref<SignupProfile | undefined>(undefined)
const sectorSlug = ref('')

// --- Consentement légal (partie C, obligatoire sur l'inscription) ----------
const consent = ref(false)
const consentError = ref(false)
// Tant que le consentement n'est pas donné, on neutralise le formulaire
// d'inscription (impossible d'envoyer un code sans avoir accepté).
const signupGated = computed(() => activeTab.value === 'signup' && step.value === 'contact' && !consent.value)

// --- État réseau : bannière hors connexion (partie C) ----------------------
const online = ref(true)
function refreshOnline() {
  online.value = !import.meta.client || navigator.onLine
}

// --- Succès de la vérification : coche animée avant l'écran suivant --------
const showSuccess = ref(false)

const contactCta = computed(() => (activeTab.value === 'signup' ? t('auth.signupCta') : t('auth.loginCta')))
const roleName = computed(() =>
  role.value === 'prestataire' ? t('onboarding.welcome.roleProvider') : t('onboarding.welcome.roleClient'),
)

function selectTab(tab: Tab) {
  activeTab.value = tab
  step.value = 'contact'
  sectorSlug.value = ''
  consentError.value = false
}

function goChangeRole() {
  navigateTo('/m/welcome')
}

// Tap sur le formulaire encore verrouillé : on met en évidence le consentement
// manquant plutôt que de laisser l'utilisateur deviner pourquoi rien ne réagit.
function onGatedPointer() {
  if (signupGated.value) consentError.value = true
}

function startGoogle() {
  const target = activeTab.value === 'signup' ? `/api/auth/google?role=${role.value}` : '/api/auth/google'
  navigateTo(target, { external: true })
}

function onContactSent(payload: { method: Method; value: string; devCode?: string; profile?: SignupProfile; skipOtp?: boolean }) {
  contactMethod.value = payload.method
  contactValue.value = payload.value
  otpDevCode.value = payload.devCode
  signupProfile.value = payload.profile
  step.value = payload.skipOtp ? 'password' : 'otp'
  pushHistoryStep()
}

function onOtpVerified() {
  // Coche animée de 400 ms (partie D) puis passage à l'étape suivante.
  showSuccess.value = true
  window.setTimeout(() => {
    showSuccess.value = false
    step.value = 'password'
    pushHistoryStep()
  }, 700)
}

function landingPathFor(userRole: Role): string {
  return userRole === 'prestataire' ? '/prestataire' : '/resultats'
}

function onSignupPasswordSuccess() {
  step.value = 'identity'
  pushHistoryStep()
}

function onIdentityStepDone() {
  if (role.value === 'client') {
    navigateTo({ path: '/resultats', query: typeof route.query.q === 'string' && route.query.q.trim() ? { q: route.query.q } : {} })
  } else {
    sectorSlug.value = ''
    step.value = 'sector'
    pushHistoryStep()
  }
}

function onLoginSuccess(user: PublicUser) {
  navigateTo(landingPathFor(user.role))
}

function submitSector() {
  if (!sectorSlug.value) return
  step.value = 'payout'
  pushHistoryStep()
}

function onPayoutSaved() {
  navigateTo('/abonnement')
}

// --- Retour : flèche d'en-tête + bouton physique Android (partie E) ---------
const STEP_ORDER: Step[] = ['contact', 'otp', 'password', 'identity', 'sector', 'payout']

function stepBack() {
  const idx = STEP_ORDER.indexOf(step.value)
  if (idx <= 0) {
    // Depuis l'étape contact, le retour ramène à l'écran d'accueil.
    navigateTo('/m/welcome')
    return
  }
  // Depuis l'étape mot de passe on saute la case OTP (déjà validée).
  const previous = STEP_ORDER[idx - 1] ?? 'contact'
  step.value = step.value === 'password' ? 'contact' : previous
  consentError.value = false
}

// Une entrée d'historique « tampon » est maintenue en permanence : le bouton
// retour Android la consomme, on recule alors d'une étape et on en repose une.
// Depuis l'étape contact, on laisse le retour remonter vers l'accueil.
function pushHistoryStep() {
  if (import.meta.client) history.pushState({ obStep: step.value }, '')
}
function onPopState() {
  if (step.value === 'contact') {
    navigateTo('/m/welcome')
    return
  }
  stepBack()
  pushHistoryStep()
}

onMounted(() => {
  refreshOnline()
  window.addEventListener('online', refreshOnline)
  window.addEventListener('offline', refreshOnline)
  window.addEventListener('popstate', onPopState)
  pushHistoryStep()
})
onUnmounted(() => {
  window.removeEventListener('online', refreshOnline)
  window.removeEventListener('offline', refreshOnline)
  window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <div class="flex min-h-[100dvh] flex-col bg-surface text-ink">
    <!-- En-tête fin : flèche de retour + logo, rien d'autre. -->
    <header class="flex items-center gap-1 border-b border-hairline px-2 py-2">
      <button
        type="button"
        class="press flex size-12 items-center justify-center rounded-full text-ink"
        :aria-label="t('onboarding.auth.backAria')"
        @click="stepBack"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="text-[18px] font-extrabold text-dark" :aria-label="t('onboarding.logoAria')">
        Work<span class="text-primary">Togo</span>
      </span>
    </header>

    <!-- Bannière hors connexion (partie C). -->
    <p
      v-if="!online"
      class="bg-error/10 px-5 py-2.5 text-center text-[13px] font-medium text-error"
      role="status"
    >
      {{ t('onboarding.auth.offline') }}
    </p>

    <!-- Contenu : marges 20 dp, pleine largeur, défilable pour laisser remonter
         le formulaire quand le clavier s'ouvre (le bouton d'action reste
         atteignable en bas). -->
    <main class="flex-1 overflow-y-auto px-5 pb-24 pt-4">
      <!-- Onglets Connexion / Inscription. -->
      <div class="mb-5 flex rounded-field bg-bg p-1">
        <button
          type="button"
          class="press flex-1 rounded-[8px] py-2.5 text-sm font-semibold"
          :class="activeTab === 'login' ? 'bg-white text-dark shadow-card-sm' : 'text-muted'"
          @click="selectTab('login')"
        >
          {{ t('auth.loginTab') }}
        </button>
        <button
          type="button"
          class="press flex-1 rounded-[8px] py-2.5 text-sm font-semibold"
          :class="activeTab === 'signup' ? 'bg-white text-dark shadow-card-sm' : 'text-muted'"
          @click="selectTab('signup')"
        >
          {{ t('auth.signupTab') }}
        </button>
      </div>

      <!-- Rappel du rôle choisi + « Changer » (partie C). -->
      <div
        v-if="activeTab === 'signup' && step === 'contact'"
        class="mb-4 flex items-center justify-between rounded-field border border-hairline bg-bg px-3.5 py-2.5"
      >
        <span class="text-[13px] font-semibold text-dark">
          {{ t('onboarding.auth.tagSignup') }} — {{ roleName }}
        </span>
        <button type="button" class="press text-[13px] font-semibold text-primary underline underline-offset-2" @click="goChangeRole">
          {{ t('onboarding.auth.change') }}
        </button>
      </div>

      <!-- Consentement légal, requis avant toute création de compte (partie C). -->
      <div v-if="activeTab === 'signup' && step === 'contact'" class="mb-4">
        <label class="flex items-start gap-2.5 text-[13px] leading-relaxed text-dark">
          <input
            v-model="consent"
            type="checkbox"
            class="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
            @change="consentError = false"
          >
          <span>
            {{ t('onboarding.auth.consentIAccept') }}
            <NuxtLink to="/cgu" class="font-semibold text-primary underline underline-offset-2" target="_blank">
              {{ t('onboarding.auth.consentTerms') }}
            </NuxtLink>
            {{ t('onboarding.auth.consentAnd') }}
            <NuxtLink to="/confidentialite" class="font-semibold text-primary underline underline-offset-2" target="_blank">
              {{ t('onboarding.auth.consentPrivacy') }}
            </NuxtLink>.
          </span>
        </label>
        <p v-if="consentError" class="mt-1.5 text-[12.5px] text-error">{{ t('onboarding.auth.consentRequired') }}</p>
      </div>

      <!-- Étape contact — neutralisée tant que le consentement n'est pas donné
           (inscription uniquement). Le wrapper externe reste cliquable pour
           signaler qu'il faut d'abord cocher le consentement ; seul le contenu
           interne est neutralisé. -->
      <div v-if="step === 'contact'" @pointerdown="onGatedPointer">
        <div :class="signupGated ? 'pointer-events-none select-none opacity-45' : ''" :aria-disabled="signupGated">
          <AuthContactStep
            :cta="contactCta"
            :mode="activeTab"
            :google="null"
            @sent="onContactSent"
            @google="startGoogle"
          />
        </div>
      </div>

      <!-- Écran 3 : vérification du code. -->
      <AuthOtpStep
        v-else-if="step === 'otp'"
        :method="contactMethod"
        :contact-value="contactValue"
        :dev-code="otpDevCode"
        @verified="onOtpVerified"
        @back="stepBack"
      />

      <AuthPasswordStep
        v-else-if="step === 'password'"
        :mode="activeTab === 'signup' ? 'signup' : 'login'"
        :method="contactMethod"
        :contact-value="contactValue"
        :role="role"
        :profile="signupProfile"
        @signup-success="onSignupPasswordSuccess"
        @login-success="onLoginSuccess"
      />

      <AuthIdentityStep v-else-if="step === 'identity'" :role="role" @done="onIdentityStepDone" />

      <div v-else-if="step === 'sector'">
        <label for="m-auth-sector" class="mb-1 block text-[13px] font-semibold text-dark">{{ t('auth.sectorLabel') }}</label>
        <p class="mb-3 text-[13px] leading-relaxed text-muted">{{ t('auth.sectorHint') }}</p>
        <select
          id="m-auth-sector"
          v-model="sectorSlug"
          class="mb-3.5 h-[52px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
        >
          <option value="" disabled>{{ t('auth.sectorPlaceholder') }}</option>
          <option v-for="sector in SECTORS" :key="sector.slug" :value="sector.slug">{{ sector.name }}</option>
        </select>
        <button
          type="button"
          class="press h-[52px] w-full rounded-field bg-primary text-[16px] font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!sectorSlug"
          @click="submitSector"
        >
          {{ t('auth.continueCta') }}
        </button>
      </div>

      <AuthPayoutStep v-else :sector-slug="sectorSlug" @saved="onPayoutSaved" />

      <!-- Lien d'aide discret (remplace la bulle de chat, partie C). -->
      <div class="mt-8 text-center">
        <NuxtLink to="/aide" class="press inline-flex min-h-[44px] items-center justify-center text-[13px] text-muted underline underline-offset-2">
          {{ t('onboarding.auth.help') }}
        </NuxtLink>
      </div>
    </main>

    <!-- Coche animée de succès (partie D), 400 ms, par-dessus l'écran. -->
    <OnboardingSuccessCheck :show="showSuccess" :label="t('onboarding.auth.successTitle')" />
  </div>
</template>
