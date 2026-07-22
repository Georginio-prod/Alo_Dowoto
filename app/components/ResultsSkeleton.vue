<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]" role="status" aria-label="Chargement des résultats">
    <div
      v-for="n in 6"
      :key="n"
      class="overflow-hidden rounded-card border border-hairline bg-surface"
    >
      <div class="skeleton-shimmer h-[140px] bg-hairline" />
      <div class="flex flex-col gap-2 p-4">
        <div class="skeleton-shimmer h-4 w-2/3 rounded bg-hairline" />
        <div class="skeleton-shimmer h-3 w-1/2 rounded bg-hairline" />
        <div class="skeleton-shimmer h-3 w-1/3 rounded bg-hairline" />
        <div class="skeleton-shimmer h-4 w-1/2 rounded bg-hairline" />
        <div class="skeleton-shimmer h-9 w-full rounded-field bg-hairline" />
      </div>
    </div>
  </div>
</template>
