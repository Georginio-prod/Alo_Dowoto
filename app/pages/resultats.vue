<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()

const searchTerm = computed(() => {
  const q = route.query.q
  return typeof q === 'string' ? q.trim() : ''
})

function restartDemo() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p class="text-[14.5px] text-muted">
            Résultats pour <strong class="text-dark">{{ searchTerm || 'tous les prestataires' }}</strong>
          </p>
        </div>

        <button
          type="button"
          class="press rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-dark"
          @click="restartDemo"
        >
          ↺ Recommencer la démo
        </button>
      </div>
    </header>

    <div class="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 lg:w-[240px]">
        <div class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
          <p class="text-[13px] font-semibold text-muted">Filtres à venir (#40)</p>
        </div>
      </aside>

      <section class="min-w-0 flex-1">
        <div class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
          <p class="text-[13px] font-semibold text-muted">Grille de résultats à venir (#41, #42)</p>
        </div>
      </section>
    </div>
  </div>
</template>
