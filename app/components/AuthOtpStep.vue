<script setup lang="ts">
/** Étape « vérification OTP » du parcours d'authentification — vérifie le code réel (#125). */

type Method = 'phone' | 'email'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{ method: Method; contactValue: string; devCode?: string }>()
const emit = defineEmits<{ verified: []; back: [] }>()

const RESEND_DELAY = 30

const otp = ref<string[]>(['', '', '', '', '', ''])
const otpError = ref('')
const otpInvalid = ref(false)
const isVerifying = ref(false)
const resendSeconds = ref(RESEND_DELAY)
let resendTimer: ReturnType<typeof setInterval> | null = null

// `devCode` n'est renvoyé par l'API que hors production (pas de provider
// SMS/email réel, #23) : affiché tel quel pour permettre de tester le
// parcours sans lire les logs serveur. Mis à jour au renvoi du code.
const currentDevCode = ref(props.devCode)

const isOtpComplete = computed(() => otp.value.every((d) => d !== ''))
const destinationPrefix = computed(() =>
  t(props.method === 'phone' ? 'authOtpStep.sentCodePrefixPhone' : 'authOtpStep.sentCodePrefixEmail'),
)
const destination = computed(() => (props.method === 'phone' ? `+228 ${props.contactValue}` : props.contactValue))

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

async function resendCode() {
  if (resendSeconds.value > 0) return
  try {
    const { devCode } = await $fetch<{ devCode?: string }>('/api/auth/otp/send', {
      method: 'POST',
      body: { method: props.method, value: props.contactValue },
    })
    currentDevCode.value = devCode
  } catch {
    // Cooldown serveur (429) indépendant du timer local : on l'ignore, le
    // bouton redevient actif au prochain tick.
  }
  startResendTimer()
}

function onOtpChange(digits: string[]) {
  otp.value = digits
  otpError.value = ''
  otpInvalid.value = false
}

async function verify() {
  if (!isOtpComplete.value || isVerifying.value) return
  isVerifying.value = true
  otpError.value = ''
  const code = otp.value.join('')

  try {
    await $fetch('/api/auth/otp/verify', { method: 'POST', body: { method: props.method, value: props.contactValue, code } })
    stopResendTimer()
    emit('verified')
  } catch (error) {
    otpInvalid.value = true
    otpError.value = apiErrorMessage(error, t('authOtpStep.errorInvalidCode'))
    otp.value = ['', '', '', '', '', '']
  } finally {
    isVerifying.value = false
  }
}

onMounted(startResendTimer)
onUnmounted(stopResendTimer)
</script>

<template>
  <div>
    <p class="mb-[18px] text-[13.5px] leading-relaxed text-muted">
      {{ t('authOtpStep.sentCodeLabel') }} {{ destinationPrefix }}
      <strong class="text-dark">{{ destination }}</strong>.
      <button type="button" class="press font-semibold text-primary" @click="emit('back')">
        {{ t('authOtpStep.modify') }}
      </button>
    </p>

    <p
      v-if="currentDevCode"
      class="mb-3.5 rounded-field border border-dashed border-primary/40 bg-primary/5 px-3.5 py-2.5 text-center text-[13px] text-dark"
    >
      {{ t('authOtpStep.devModeLabel') }} <strong class="font-mono tracking-widest">{{ currentDevCode }}</strong>
    </p>

    <OtpInput
      :model-value="otp"
      :invalid="otpInvalid"
      :disabled="isVerifying"
      @update:model-value="onOtpChange"
      @complete="verify"
    />
    <p v-if="otpError" class="mt-2 text-center text-[12.5px] text-error">{{ otpError }}</p>

    <p class="mt-3 text-center text-[13px] text-muted">
      <template v-if="resendSeconds > 0">{{ t('authOtpStep.resendIn', { seconds: resendSeconds }) }}</template>
      <button v-else type="button" class="press font-semibold text-primary" @click="resendCode">
        {{ t('authOtpStep.resendCta') }}
      </button>
    </p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isOtpComplete || isVerifying"
      @click="verify"
    >
      {{ isVerifying ? t('authOtpStep.verifying') : t('authOtpStep.verifyCta') }}
    </button>
  </div>
</template>
