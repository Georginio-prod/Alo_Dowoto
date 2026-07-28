<script setup lang="ts">
import type { Plan } from '~/data/plans'

const { t } = useI18n({ useScope: 'global' })

defineProps<{
  plan: Plan
  selected: boolean
}>()

defineEmits<{
  select: []
}>()
</script>

<template>
  <div
    class="relative flex flex-col rounded-card border-2 bg-surface p-6"
    :class="selected ? 'border-primary' : 'border-hairline'"
  >
    <div
      v-if="plan.hasTag"
      class="absolute -top-3 left-6 rounded-pill bg-dark px-3 py-1 text-[11.5px] font-bold text-white"
    >
      {{ t(`plans.${plan.slug}.tag`) }}
    </div>

    <div class="mb-1 text-base font-bold text-dark">{{ t(`plans.${plan.slug}.name`) }}</div>
    <div class="mb-1">
      <span class="text-2xl font-extrabold text-dark">{{ plan.priceLabel }}</span>
      <span class="text-sm text-muted">{{ t(`plans.${plan.slug}.period`) }}</span>
    </div>
    <div class="mb-4 text-[13px] text-muted">{{ t(`plans.${plan.slug}.note`) }}</div>

    <ul class="mb-5 flex flex-1 flex-col gap-2.5">
      <li
        v-for="feature in plan.features"
        :key="feature.labelKey"
        class="flex items-start gap-2 text-[13.5px]"
        :class="feature.included ? 'text-ink' : 'text-muted'"
      >
        <span :class="feature.included ? 'text-primary' : 'text-muted'">{{ feature.included ? '✓' : '✕' }}</span>
        <span>{{ t(`plans.features.${feature.labelKey}`) }}</span>
      </li>
    </ul>

    <button
      type="button"
      class="press w-full rounded-field py-3 text-[14.5px] font-semibold"
      :class="selected ? 'bg-primary text-white' : 'bg-bg text-dark'"
      @click="$emit('select')"
    >
      {{ selected ? t('plans.selected') : t('plans.choose') }}
    </button>
  </div>
</template>
