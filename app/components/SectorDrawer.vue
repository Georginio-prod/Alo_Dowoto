<script setup lang="ts">
import type { Sector } from '~/data/sectors'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  sector: Sector | null
}>()

const emit = defineEmits<{
  close: []
  select: [name: string]
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.sector,
  (sector) => {
    if (!import.meta.client) return
    document.body.style.overflow = sector ? 'hidden' : ''
    if (sector) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onUnmounted(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="sector"
      class="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(15,35,24,0.45)] sm:items-center sm:p-5"
      @click.self="emit('close')"
    >
      <div
        class="max-h-[78vh] w-full max-w-[560px] animate-[wt-fade_0.18s_ease-out] overflow-auto rounded-t-[18px] bg-white p-5 pb-7 sm:rounded-[18px]"
        role="dialog"
        aria-modal="true"
        :aria-label="sector.name"
      >
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-base font-bold"
              :style="{ background: sector.color, color: sector.ink }"
            >
              {{ sector.emoji }}
            </div>
            <div class="text-[17px] font-bold text-dark">{{ sector.name }}</div>
          </div>
          <button
            type="button"
            :aria-label="t('sectorDrawer.close')"
            class="press flex h-8 w-8 items-center justify-center rounded-full bg-bg text-base text-muted"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <button
            v-for="sub in sector.subSectors"
            :key="sub.name"
            type="button"
            class="press flex items-center justify-between rounded-[10px] border-[1.5px] border-transparent bg-bg px-4 py-3.5 text-left text-[14.5px] font-medium text-ink transition-colors hover:border-primary hover:bg-white"
            @click="emit('select', sub.name)"
          >
            <span>{{ sub.name }}</span>
            <span class="font-bold text-primary">→</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
