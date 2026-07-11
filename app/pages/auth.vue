<script setup lang="ts">
type Tab = 'login' | 'signup'
type Role = 'client' | 'prestataire'
type Method = 'phone' | 'email'
type Step = 'contact' | 'otp' | 'sector'

// Pas de backend OTP disponible (#23) : "123456" fait office de code valide
// pour pouvoir démontrer/tester les parcours de succès et d'échec.
const MOCK_VALID_OTP = '123456'
const RESEND_DELAY = 30

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const route = useRoute()

const activeTab = ref<Tab>(route.query.role ? 'signup' : 'login')
const role = ref<Role>(route.query.role === 'prestataire' ? 'prestataire' : 'client')
const step = ref<Step>('contact')

const method = ref<Method>('phone')
const phone = ref('')
const email = ref('')
const contactError = ref('')

const otp = ref<string[]>(['', '', '', '', '', ''])
const otpError = ref('')
const otpInvalid = ref(false)
const isVerifying = ref(false)
const resendSeconds = ref(RESEND_DELAY)
let resendTimer: ReturnType<typeof setInterval> | null = null

const contactCta = computed(() => (activeTab.value === 'signup' ? 'Créer mon compte' : 'Se connecter'))
const isOtpComplete = computed(() => otp.value.every((d) => d !== ''))
const otpDestinationPrefix = computed(() => (method.value === 'phone' ? 'au' : 'à'))
const otpDestination = computed(() => (method.value === 'phone' ? `+228 ${phone.value}` : email.value))

function selectTab(tab: Tab) {
  activeTab.value = tab
  role.value = 'client'
  resetContact()
  backToContact()
}

function selectRole(r: Role) {
  role.value = r
}

function selectMethod(m: Method) {
  method.value = m
  contactError.value = ''
}

function resetContact() {
  method.value = 'phone'
  phone.value = ''
  email.value = ''
  contactError.value = ''
}

function submitContact() {
  if (method.value === 'phone') {
    if (phone.value.replace(/\D/g, '').length < 8) {
      contactError.value = 'Entrez un numéro valide (8 chiffres).'
      return
    }
  } else if (!EMAIL_RE.test(email.value.trim())) {
    contactError.value = 'Entrez une adresse email valide.'
    return
  }
  contactError.value = ''
  step.value = 'otp'
  otp.value = ['', '', '', '', '', '']
  otpError.value = ''
  otpInvalid.value = false
  startResendTimer()
}

function backToContact() {
  step.value = 'contact'
  otp.value = ['', '', '', '', '', '']
  otpError.value = ''
  otpInvalid.value = false
  stopResendTimer()
}

function onOtpChange(digits: string[]) {
  otp.value = digits
  otpError.value = ''
  otpInvalid.value = false
}

function startResendTimer() {
  resendSeconds.value = RESEND_DELAY
  stopResendTimer()
  resendTimer = setInterval(() => {
    resendSeconds.value--
    if (resendSeconds.value <= 0) stopResendTimer()
  }, 1000)
}

function stopResendTimer() {
  if (!resendTimer) return
  clearInterval(resendTimer)
  resendTimer = null
}

function resendCode() {
  if (resendSeconds.value > 0) return
  // TODO: appeler l'API de renvoi du code (#23).
  startResendTimer()
}

async function verifyOtp() {
  if (!isOtpComplete.value || isVerifying.value) return
  isVerifying.value = true
  const code = otp.value.join('')
  // Simulation locale en l'absence de backend (#23).
  await new Promise((resolve) => setTimeout(resolve, 500))
  isVerifying.value = false

  if (code !== MOCK_VALID_OTP) {
    otpInvalid.value = true
    otpError.value = 'Code invalide. Réessayez.'
    otp.value = ['', '', '', '', '', '']
    return
  }

  stopResendTimer()
  if (role.value === 'client') {
    // Résultats de matching, voir #39.
    navigateTo('/resultats')
  } else {
    // Étape secteur, voir #26.
    step.value = 'sector'
  }
}

onUnmounted(() => {
  stopResendTimer()
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center px-5 pb-16 pt-7">
    <div class="w-full max-w-[440px]">
      <NuxtLink to="/" class="press mb-2 inline-block py-2 text-sm text-muted">← Retour</NuxtLink>

      <div class="mb-[22px] text-center">
        <div class="text-[22px] font-extrabold text-dark">Work<span class="text-primary">Togo</span></div>
      </div>

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
              class="press flex-1 rounded-field border-[1.5px] px-3 py-2.5 text-[13.5px] font-semibold"
              :class="role === 'client' ? 'border-primary bg-primary/10 text-dark' : 'border-hairline bg-white text-muted'"
              @click="selectRole('client')"
            >
              Client
            </button>
            <button
              type="button"
              class="press flex-1 rounded-field border-[1.5px] px-3 py-2.5 text-[13.5px] font-semibold"
              :class="role === 'prestataire' ? 'border-primary bg-primary/10 text-dark' : 'border-hairline bg-white text-muted'"
              @click="selectRole('prestataire')"
            >
              Prestataire
            </button>
          </div>
        </div>

        <div v-if="step === 'contact'">
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

          <p v-if="contactError" class="my-1 text-[12.5px] text-error">{{ contactError }}</p>

          <button
            type="button"
            class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover"
            @click="submitContact"
          >
            {{ contactCta }}
          </button>
          <p class="mt-3.5 text-center text-[11.5px] leading-relaxed text-muted">
            En continuant, un code à 6 chiffres vous sera envoyé pour vérifier votre identité.
          </p>
        </div>

        <div v-else-if="step === 'otp'">
          <p class="mb-[18px] text-[13.5px] leading-relaxed text-muted">
            Code envoyé {{ otpDestinationPrefix }}
            <strong class="text-dark">{{ otpDestination }}</strong>.
            <button type="button" class="press font-semibold text-primary" @click="backToContact">
              Modifier
            </button>
          </p>

          <OtpInput
            :model-value="otp"
            :invalid="otpInvalid"
            :disabled="isVerifying"
            @update:model-value="onOtpChange"
            @complete="verifyOtp"
          />
          <p v-if="otpError" class="mt-2 text-center text-[12.5px] text-error">{{ otpError }}</p>

          <p class="mt-3 text-center text-[13px] text-muted">
            <template v-if="resendSeconds > 0">Renvoyer dans {{ resendSeconds }}s</template>
            <button v-else type="button" class="press font-semibold text-primary" @click="resendCode">
              Renvoyer le code
            </button>
          </p>

          <button
            type="button"
            class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!isOtpComplete || isVerifying"
            @click="verifyOtp"
          >
            {{ isVerifying ? 'Vérification…' : 'Vérifier le code' }}
          </button>
        </div>

        <div v-else class="text-center text-sm text-muted">
          Étape secteur à venir (#26).
        </div>
      </div>
    </div>
  </div>
</template>
