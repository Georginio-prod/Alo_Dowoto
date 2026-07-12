<script setup lang="ts">
defineProps<{
  steps: string[]
  currentIndex: number
}>()
</script>

<template>
  <div class="mb-6 flex flex-wrap justify-center gap-1.5">
    <div
      v-for="(label, i) in steps"
      :key="label"
      class="rounded-pill px-2.5 py-1.5 text-[11.5px] font-semibold"
      :class="{
        'bg-primary text-white': i === currentIndex,
        'bg-primary/12 text-primary': i < currentIndex,
        'bg-transparent text-muted': i > currentIndex,
      }"
    >
      {{ label }}
    </div>
  </div>
</template>
