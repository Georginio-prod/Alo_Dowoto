<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()

const { t } = useI18n({ useScope: 'global' })

const resolvedTitle = computed(() => props.title ?? t('resultsEmptyState.defaultTitle'))
const resolvedDescription = computed(() => props.description ?? t('resultsEmptyState.defaultDescription'))
const resolvedActionLabel = computed(() => props.actionLabel ?? t('resultsEmptyState.defaultActionLabel'))
</script>

<template>
  <div class="flex flex-col items-center rounded-card border border-hairline bg-surface px-6 py-16 text-center">
    <img
      src="/images/empty-state-illustration.svg"
      :alt="t('resultsEmptyState.illustrationAlt')"
      loading="lazy"
      decoding="async"
      width="220"
      height="215"
      class="mb-4 w-full max-w-[180px]"
    >
    <p class="mb-1 text-[15px] font-bold text-dark">{{ resolvedTitle }}</p>
    <p class="mb-5 text-[13.5px] text-muted">{{ resolvedDescription }}</p>
    <button
      type="button"
      class="press rounded-field bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover"
      @click="$emit('action')"
    >
      {{ resolvedActionLabel }}
    </button>
  </div>
</template>
