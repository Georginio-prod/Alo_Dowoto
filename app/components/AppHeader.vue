<script setup lang="ts">
const query = ref('')

function onSearch() {
  const q = query.value.trim()
  if (!q) return
  // TODO: brancher sur la page de résultats de recherche (#39 / #55).
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-hairline bg-surface px-6 py-3.5">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
      <NuxtLink to="/" class="shrink-0 text-xl font-extrabold tracking-tight text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>

      <form
        role="search"
        class="flex min-w-60 flex-1 basis-80 items-center gap-2 rounded-pill border border-black/10 bg-bg py-2 pl-[18px] pr-2"
        @submit.prevent="onSearch"
      >
        <svg class="size-[18px] shrink-0 opacity-55" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" />
          <line x1="12.3" y1="12.3" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="min-w-0 flex-1 border-none bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted"
          placeholder="Rechercher un service : plomberie, ménage, développeur web…"
          aria-label="Rechercher un service"
        >
        <button
          type="submit"
          class="press shrink-0 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Rechercher
        </button>
      </form>

      <div class="ml-auto flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          class="press px-2 py-2.5 text-[14.5px] font-semibold text-dark hover:text-primary"
        >
          Se connecter
        </button>
        <button
          type="button"
          class="press rounded-[9px] bg-dark px-5 py-2.5 text-[14.5px] font-semibold text-white hover:bg-[#1a3a28]"
        >
          Devenir prestataire
        </button>
      </div>
    </div>
  </header>
</template>
