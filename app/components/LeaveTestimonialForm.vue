<script setup lang="ts">
import type { Testimonial, TestimonialRole } from '~~/server/utils/testimonialStore'

const emit = defineEmits<{ posted: [testimonial: Testimonial] }>()

const { user } = useSession()

const name = ref(user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : '')
const role = ref<TestimonialRole>(user.value?.role ?? 'client')
const message = ref('')
const rating = ref(0)
const hoverRating = ref(0)
const error = ref('')
const success = ref(false)
const isSubmitting = ref(false)

function setRating(n: number) {
  rating.value = n
}

async function submit() {
  if (isSubmitting.value) return
  error.value = ''

  if (name.value.trim().length < 2) {
    error.value = 'Entrez votre nom (2 caractères minimum).'
    return
  }
  if (message.value.trim().length < 10) {
    error.value = 'Votre avis doit contenir au moins 10 caractères.'
    return
  }
  if (rating.value < 1) {
    error.value = 'Sélectionnez une note de 1 à 5 étoiles.'
    return
  }

  isSubmitting.value = true
  try {
    const { testimonial } = await $fetch<{ testimonial: Testimonial }>('/api/testimonials', {
      method: 'POST',
      body: { name: name.value.trim(), role: role.value, message: message.value.trim(), rating: rating.value },
    })
    success.value = true
    message.value = ''
    rating.value = 0
    emit('posted', testimonial)
  } catch (fetchError) {
    const statusMessage = (fetchError as { statusMessage?: string })?.statusMessage
    error.value = statusMessage || "La publication de votre avis a échoué. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-white p-6">
    <h3 class="mb-1 text-[16px] font-bold text-dark">Donnez votre avis</h3>
    <p class="mb-4 text-[13px] leading-relaxed text-muted">
      Vous avez trouvé un prestataire ou décroché une mission grâce à WorkTogo ? Racontez-le en quelques mots.
    </p>

    <div class="mb-3.5 flex gap-2">
      <div class="flex-1">
        <label for="testimonial-name" class="mb-1.5 block text-[13px] font-semibold text-dark">Votre nom</label>
        <input
          id="testimonial-name"
          v-model="name"
          type="text"
          placeholder="Ex. Ama K."
          class="h-[44px] w-full rounded-field border-[1.5px] border-hairline px-3.5 text-[14px] text-ink outline-none focus:border-primary"
        >
      </div>
      <div class="w-[150px] shrink-0">
        <label for="testimonial-role" class="mb-1.5 block text-[13px] font-semibold text-dark">Je suis</label>
        <select
          id="testimonial-role"
          v-model="role"
          class="h-[44px] w-full rounded-field border-[1.5px] border-hairline bg-white px-3 text-[14px] text-ink outline-none focus:border-primary"
        >
          <option value="client">Chercheur</option>
          <option value="prestataire">Prestataire</option>
        </select>
      </div>
    </div>

    <label class="mb-1.5 block text-[13px] font-semibold text-dark">Votre note</label>
    <div class="mb-3.5 flex gap-1" role="radiogroup" aria-label="Note">
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        class="press text-2xl leading-none"
        :class="n <= (hoverRating || rating) ? 'text-star' : 'text-hairline'"
        :aria-pressed="n <= rating"
        :aria-label="`${n} étoile(s)`"
        @mouseenter="hoverRating = n"
        @mouseleave="hoverRating = 0"
        @click="setRating(n)"
      >
        ★
      </button>
    </div>

    <label for="testimonial-message" class="mb-1.5 block text-[13px] font-semibold text-dark">Votre avis</label>
    <textarea
      id="testimonial-message"
      v-model="message"
      rows="3"
      placeholder="Décrivez votre expérience sur WorkTogo…"
      class="mb-3.5 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
    />

    <p v-if="success" class="mb-2 text-[12.5px] font-semibold text-primary">
      Merci, votre avis a été publié !
    </p>
    <p v-if="error" class="mb-2 text-[12.5px] text-error">{{ error }}</p>

    <button
      type="button"
      class="press rounded-field bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isSubmitting"
      @click="submit"
    >
      {{ isSubmitting ? 'Publication…' : 'Publier mon avis' }}
    </button>
  </div>
</template>
