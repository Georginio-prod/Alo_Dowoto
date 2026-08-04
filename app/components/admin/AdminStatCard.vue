<script setup lang="ts">
/** Carte de KPI (#dashboard-admin, module Vue d'ensemble). */
defineProps<{ label: string, value: string, hint?: string }>()
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-4 shadow-card-sm">
    <p class="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-muted">{{ label }}</p>
    <p class="text-[22px] font-extrabold text-dark">{{ value }}</p>
    <p v-if="hint" class="mt-1 text-[11.5px] text-muted">{{ hint }}</p>
  </div>
</template>
