<script setup lang="ts">
import type { Testimonial } from '~~/server/utils/testimonialStore'

const { data, refresh } = await useFetch<{ testimonials: Testimonial[] }>('/api/testimonials')
const testimonials = computed(() => data.value?.testimonials ?? [])
const visibleTestimonials = computed(() => testimonials.value.slice(0, 6))

const roleLabel = (role: Testimonial['role']) => (role === 'prestataire' ? 'Prestataire' : 'Chercheur')

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function onPosted() {
  refresh()
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 py-14">
    <div class="mb-9 text-center">
      <h2 v-reveal class="mb-2 text-xl font-bold text-dark">Ce que nos utilisateurs en disent</h2>
      <p v-reveal class="mx-auto max-w-xl text-[13.5px] leading-relaxed text-muted">
        Des chercheurs qui ont trouvé leur prestataire, des prestataires qui développent leur activité.
      </p>
    </div>

    <div class="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(testimonial, i) in visibleTestimonials"
        :key="testimonial.id"
        v-reveal
        :style="{ '--reveal-delay': `${i * 60}ms` }"
        class="flex flex-col rounded-card border border-hairline bg-surface p-5"
      >
        <div class="mb-2.5 flex gap-0.5" aria-hidden="true">
          <span v-for="n in 5" :key="n" :class="n <= testimonial.rating ? 'text-star' : 'text-hairline'">★</span>
        </div>
        <p class="mb-4 flex-1 text-[13.5px] leading-relaxed text-ink">« {{ testimonial.message }} »</p>
        <div class="flex items-center gap-2.5">
          <ConversationAvatar :name="testimonial.name" :seed="testimonial.id" size="sm" />
          <div class="min-w-0">
            <div class="truncate text-[13px] font-semibold text-dark">{{ testimonial.name }}</div>
            <div class="text-[11.5px] text-muted">{{ roleLabel(testimonial.role) }} · {{ formatDate(testimonial.createdAt) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-xl">
      <LeaveTestimonialForm @posted="onPosted" />
    </div>
  </section>
</template>
