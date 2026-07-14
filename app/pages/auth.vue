<script setup lang="ts">
import type { SignupProfile } from '~/components/AuthContactStep.vue'
import { SECTORS } from '~/data/sectors'
import type { PublicUser } from '~~/server/utils/userStore'

type Tab = 'login' | 'signup'
type Role = 'client' | 'prestataire'
type Method = 'phone' | 'email'
type Step = 'contact' | 'otp' | 'password' | 'sector' | 'payout'

const route = useRoute()

// `mode=login` force l'onglet Connexion même quand `role` est fourni dans
// l'URL (ex. « Changer de compte » → « J'ai déjà un compte prestataire »,
// voir AccountMenu.vue) — sans ça, la présence de `role` seule bascule
// toujours sur Inscription.
const activeTab = ref<Tab>(route.query.mode === 'login' ? 'login' : route.query.role ? 'signup' : 'login')
const role = ref<Role>(route.query.role === 'prestataire' ? 'prestataire' : 'client')
const step = ref<Step>('contact')

const contactMethod = ref<Method>('phone')
const contactValue = ref('')
const otpDevCode = ref<string | undefined>(undefined)
const signupProfile = ref<SignupProfile | undefined>(undefined)

const sectorSlug = ref('')

const contactCta = computed(() => (activeTab.value === 'signup' ? 'Créer mon compte' : 'Se connecter'))
const flowSteps = computed(() =>
  role.value === 'prestataire'
    ? ['Contact', 'Vérification', 'Mot de passe', 'Secteur', 'Infos', 'Abonnement', 'Paiement']
    : ['Contact', 'Vérification', 'Mot de passe'],
)
const flowStepIndex = computed(() => {
  if (step.value === 'contact') return 0
  if (step.value === 'otp') return 1
  if (step.value === 'password') return 2
  if (step.value === 'sector') return 3
  return 4 // 'payout'
})

function selectTab(tab: Tab) {
  activeTab.value = tab
  role.value = 'client'
  sectorSlug.value = ''
  step.value = 'contact'
}

function selectRole(r: Role) {
  role.value = r
}

function onContactSent(payload: { method: Method; value: string; devCode?: string; profile?: SignupProfile }) {
  contactMethod.value = payload.method
  contactValue.value = payload.value
  otpDevCode.value = payload.devCode
  signupProfile.value = payload.profile
  step.value = 'otp'
}

function onOtpVerified() {
  step.value = 'password'
}

function landingPathFor(userRole: Role): string {
  return userRole === 'prestataire' ? '/prestataire' : '/resultats'
}

function onSignupPasswordSuccess() {
  if (role.value === 'client') {
    navigateTo({ path: '/resultats', query: typeof route.query.q === 'string' && route.query.q.trim() ? { q: route.query.q } : {} })
  } else {
    sectorSlug.value = ''
    step.value = 'sector'
  }
}

function onLoginSuccess(user: PublicUser) {
  navigateTo(landingPathFor(user.role))
}

function submitSector() {
  if (!sectorSlug.value) return
  step.value = 'payout'
}

function onPayoutSaved() {
  // Étape Abonnement, voir #29.
  navigateTo('/abonnement')
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
      </div>

      <FlowSteps v-if="activeTab === 'signup'" :steps="flowSteps" :current-index="flowStepIndex" />

      <div class="rounded-card border border-hairline bg-surface p-7 shadow-card-sm">
        <div class="mb-[22px] flex rounded-field bg-bg p-1">
          <button
            type="button"
            class="press flex-1 rounded-[8px] py-2.5 text-sm font-semibold"
            :class="activeTab === 'login' ? 'bg-white text-dark' : 'text-muted'"
            @click="selectTab('login')"
          >
            Connexion
          </button>
          <button
            type="button"
            class="press flex-1 rounded-[8px] py-2.5 text-sm font-semibold"
            :class="activeTab === 'signup' ? 'bg-white text-dark' : 'text-muted'"
            @click="selectTab('signup')"
          >
            Inscription
          </button>
        </div>

        <div v-if="activeTab === 'signup'" class="mb-5">
          <div class="mb-2 text-[12.5px] font-medium text-muted">Vous êtes :</div>
          <div class="flex gap-2">
            <button
              type="button"
              class="press relative flex-1 animate-[wt-fade_0.32s_ease-out] rounded-field border-[1.5px] px-3 py-2.5 text-left text-[13.5px] font-semibold"
              :class="role === 'client' ? 'border-primary bg-primary/10 text-dark' : 'border-hairline bg-white text-muted'"
              :aria-pressed="role === 'client'"
              @click="selectRole('client')"
            >
              <span
                v-if="role === 'client'"
                class="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-white"
                aria-hidden="true"
              >✓</span>
              <span class="block">Client</span>
              <span class="mt-0.5 block text-[11px] font-normal" :class="role === 'client' ? 'text-dark/70' : 'text-muted'">
                Je cherche un service
              </span>
            </button>
            <button
              type="button"
              class="press relative flex-1 animate-[wt-fade_0.32s_ease-out] rounded-field border-[1.5px] px-3 py-2.5 text-left text-[13.5px] font-semibold [animation-delay:60ms] [animation-fill-mode:backwards]"
              :class="role === 'prestataire' ? 'border-primary bg-primary/10 text-dark' : 'border-hairline bg-white text-muted'"
              :aria-pressed="role === 'prestataire'"
              @click="selectRole('prestataire')"
            >
              <span
                v-if="role === 'prestataire'"
                class="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-white"
                aria-hidden="true"
              >✓</span>
              <span class="block">Prestataire</span>
              <span class="mt-0.5 block text-[11px] font-normal" :class="role === 'prestataire' ? 'text-dark/70' : 'text-muted'">
                Je propose un service
              </span>
            </button>
          </div>
        </div>

        <AuthContactStep v-if="step === 'contact'" :cta="contactCta" :mode="activeTab" @sent="onContactSent" />

        <AuthOtpStep
          v-else-if="step === 'otp'"
          :method="contactMethod"
          :contact-value="contactValue"
          :dev-code="otpDevCode"
          @verified="onOtpVerified"
          @back="step = 'contact'"
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

        <div v-else-if="step === 'sector'">
          <label for="auth-sector" class="mb-1 block text-[13px] font-semibold text-dark">
            Secteur d'activité principal
          </label>
          <p class="mb-3 text-[13px] leading-relaxed text-muted">
            Choisissez le secteur qui correspond le mieux à votre activité.
          </p>

          <select
            id="auth-sector"
            v-model="sectorSlug"
            class="mb-3.5 h-[46px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >
            <option value="" disabled>Sélectionner un secteur…</option>
            <option v-for="sector in SECTORS" :key="sector.slug" :value="sector.slug">
              {{ sector.name }}
            </option>
          </select>

          <button
            type="button"
            class="press w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!sectorSlug"
            @click="submitSector"
          >
            Continuer
          </button>
        </div>

        <AuthPayoutStep v-else :sector-slug="sectorSlug" @saved="onPayoutSaved" />
      </div>
    </div>
  </div>
</template>
