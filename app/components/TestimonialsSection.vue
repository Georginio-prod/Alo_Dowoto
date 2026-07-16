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
      >
        <!-- Survol sur un élément distinct du wrapper `v-reveal` : voir la
        note dans PricingTeaser.vue (conflit de spécificité CSS entre
        `[data-reveal].is-visible` et les utilitaires `hover:` de Tailwind
        quand les deux ciblent le même élément). -->
        <div class="group flex h-full flex-col rounded-card border border-hairline bg-surface p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-md">
          <div class="mb-2.5 flex gap-0.5" aria-hidden="true">
            <span v-for="n in 5" :key="n" :class="n <= testimonial.rating ? 'text-star' : 'text-hairline'">★</span>
          </div>
          <p class="mb-4 flex-1 text-[13.5px] leading-relaxed text-ink">« {{ testimonial.message }} »</p>
          <div class="flex items-center gap-2.5">
            <div class="transition-transform duration-200 ease-out group-hover:scale-110">
              <ConversationAvatar :name="testimonial.name" :seed="testimonial.id" size="sm" />
            </div>
            <div class="min-w-0">
              <div class="truncate text-[13px] font-semibold text-dark">{{ testimonial.name }}</div>
              <div class="text-[11.5px] text-muted">{{ roleLabel(testimonial.role) }} · {{ formatDate(testimonial.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-reveal class="mx-auto max-w-[720px]">
      <LeaveTestimonialForm @posted="onPosted" />
    </div>
  </section>
</template>
