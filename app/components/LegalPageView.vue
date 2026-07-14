<script setup lang="ts">
import { getLegalPage } from '~/data/legalPages'

const props = defineProps<{ slug: string }>()

const page = computed(() => getLegalPage(props.slug))

useHead(() => ({ title: page.value ? `${page.value.title} — WorkTogo` : 'WorkTogo' }))
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <template v-if="page">
      <h1 class="mb-2 text-2xl font-extrabold text-dark">{{ page.title }}</h1>
      <p v-if="page.updatedAt" class="mb-3 text-[12px] font-medium text-muted">
        Dernière mise à jour : {{ page.updatedAt }}
      </p>
      <p class="mb-8 text-[14.5px] leading-relaxed text-muted">{{ page.intro }}</p>

      <section v-for="section in page.sections" :key="section.heading" class="mb-7">
        <h2 class="mb-2 text-[16px] font-bold text-dark">{{ section.heading }}</h2>
        <p v-for="(paragraph, i) in section.body" :key="i" class="mb-2 text-[13.5px] leading-relaxed text-muted">
          {{ paragraph }}
        </p>
        <ul v-if="section.list" class="list-disc space-y-1 pl-5">
          <li v-for="(item, i) in section.list" :key="i" class="text-[13.5px] leading-relaxed text-muted">
            {{ item }}
          </li>
        </ul>
      </section>
    </template>
    <p v-else class="text-[13.5px] text-muted">Page introuvable.</p>
  </div>
</template>
