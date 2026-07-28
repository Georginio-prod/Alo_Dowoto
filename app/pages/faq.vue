<script setup lang="ts">
import { FAQ_CATEGORIES } from '~/data/faq'

useHead({ title: 'FAQ — WorkTogo' })
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">Questions fréquentes</h1>
    <p class="mb-8 text-[14.5px] leading-relaxed text-muted">
      Vous ne trouvez pas votre réponse ? Consultez le
      <NuxtLink to="/aide" class="font-semibold text-primary">centre d'aide</NuxtLink>
      ou <NuxtLink to="/contact" class="font-semibold text-primary">contactez le support</NuxtLink>.
    </p>

    <div class="flex flex-col gap-9">
      <section v-for="category in FAQ_CATEGORIES" :id="category.id" :key="category.title" class="scroll-mt-24">
        <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">{{ category.title }}</h2>
        <div class="flex flex-col gap-4">
          <div v-for="item in category.items" :key="item.question" class="rounded-card border border-hairline bg-surface p-4">
            <h3 class="mb-1.5 text-[14.5px] font-bold text-dark">{{ item.question }}</h3>
            <p class="text-[13.5px] leading-relaxed text-muted">{{ item.answer }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
