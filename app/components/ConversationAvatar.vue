<script setup lang="ts">
/** Palette reprise de app/data/sectors.ts, pour rester dans les couleurs de marque. */
const PALETTE = [
  { bg: '#D97706', ink: '#1A1A1A' },
  { bg: '#2563EB', ink: '#FFFFFF' },
  { bg: '#14A800', ink: '#FFFFFF' },
  { bg: '#DB2777', ink: '#FFFFFF' },
  { bg: '#7C3AED', ink: '#FFFFFF' },
  { bg: '#4F46E5', ink: '#FFFFFF' },
  { bg: '#EA580C', ink: '#FFFFFF' },
  { bg: '#0E7490', ink: '#FFFFFF' },
  { bg: '#57534E', ink: '#FFFFFF' },
  { bg: '#DC2626', ink: '#FFFFFF' },
]

const props = withDefaults(defineProps<{ name: string; seed?: string; size?: 'sm' | 'md'; ring?: boolean }>(), {
  seed: undefined,
  size: 'md',
  ring: false,
})

const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '?')

const FALLBACK_COLOR = { bg: '#57534E', ink: '#FFFFFF' }

// Hash simple sur `seed` (ou le nom) pour une couleur stable par conversation,
// plutôt qu'une couleur qui change à chaque re-rendu.
const colors = computed(() => {
  const key = props.seed || props.name
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length] ?? FALLBACK_COLOR
})

const sizeClasses = computed(() => (props.size === 'sm' ? 'size-9 text-[13px]' : 'size-11 text-[15px]'))
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center rounded-full font-bold"
    :class="[sizeClasses, ring ? 'ring-2 ring-primary/25 ring-offset-2 ring-offset-surface' : '']"
    :style="{ background: colors.bg, color: colors.ink }"
  >
    {{ initial }}
  </div>
</template>
