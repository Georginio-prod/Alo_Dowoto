<script setup lang="ts">
/** Étape « contact » (téléphone/email) du parcours d'authentification — envoie le code OTP réel (#125). */

type Method = 'phone' | 'email'

defineProps<{ cta: string }>()
const emit = defineEmits<{ sent: [payload: { method: Method; value: string }] }>()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const method = ref<Method>('phone')
const phone = ref('')
const email = ref('')
const contactError = ref('')
const isSubmitting = ref(false)

const contactValue = computed(() => (method.value === 'phone' ? phone.value : email.value))

function selectMethod(m: Method) {
  method.value = m
  contactError.value = ''
}

async function submit() {
  if (method.value === 'phone') {
    if (phone.value.replace(/\D/g, '').length < 8) {
      contactError.value = 'Entrez un numéro valide (8 chiffres).'
      return
    }
  } else if (!EMAIL_RE.test(email.value.trim())) {
    contactError.value = 'Entrez une adresse email valide.'
    return
  }

  if (isSubmitting.value) return
  isSubmitting.value = true
  contactError.value = ''
  try {
    await $fetch('/api/auth/otp/send', { method: 'POST', body: { method: method.value, value: contactValue.value } })
    emit('sent', { method: method.value, value: contactValue.value })
  } catch (error) {
    const statusMessage = (error as { statusMessage?: string })?.statusMessage
    contactError.value = statusMessage || "L'envoi du code a échoué. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
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
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Envoi…' : cta }}
    </button>
    <p class="mt-3.5 text-center text-[11.5px] leading-relaxed text-muted">
      En continuant, un code à 6 chiffres vous sera envoyé pour vérifier votre identité.
    </p>
  </div>
</template>
