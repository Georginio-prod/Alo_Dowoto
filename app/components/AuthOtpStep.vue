<script setup lang="ts">
/** Étape « vérification OTP » du parcours d'authentification — vérifie le code réel (#125). */

type Method = 'phone' | 'email'

const props = defineProps<{ method: Method; contactValue: string }>()
const emit = defineEmits<{ verified: []; back: [] }>()

const RESEND_DELAY = 30

const otp = ref<string[]>(['', '', '', '', '', ''])
const otpError = ref('')
const otpInvalid = ref(false)
const isVerifying = ref(false)
const resendSeconds = ref(RESEND_DELAY)
let resendTimer: ReturnType<typeof setInterval> | null = null

const isOtpComplete = computed(() => otp.value.every((d) => d !== ''))
const destinationPrefix = computed(() => (props.method === 'phone' ? 'au' : 'à'))
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
    await $fetch('/api/auth/otp/send', { method: 'POST', body: { method: props.method, value: props.contactValue } })
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
    const statusMessage = (error as { statusMessage?: string })?.statusMessage
    otpError.value = statusMessage || 'Code invalide. Réessayez.'
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
      Code envoyé {{ destinationPrefix }}
      <strong class="text-dark">{{ destination }}</strong>.
      <button type="button" class="press font-semibold text-primary" @click="emit('back')">
        Modifier
      </button>
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
      <template v-if="resendSeconds > 0">Renvoyer dans {{ resendSeconds }}s</template>
      <button v-else type="button" class="press font-semibold text-primary" @click="resendCode">
        Renvoyer le code
      </button>
    </p>

    <button
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="!isOtpComplete || isVerifying"
      @click="verify"
    >
      {{ isVerifying ? 'Vérification…' : 'Vérifier le code' }}
    </button>
  </div>
</template>
