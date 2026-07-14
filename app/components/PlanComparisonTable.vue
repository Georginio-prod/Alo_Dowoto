<script setup lang="ts">
import { PLANS, PLAN_COMPARISON, type PlanComparisonValue, type PlanSlug } from '~/data/plans'

defineProps<{ selectedSlug: PlanSlug }>()

function isBoolean(value: PlanComparisonValue): value is boolean {
  return typeof value === 'boolean'
}
</script>

<template>
  <div class="overflow-x-auto rounded-card border border-hairline bg-surface">
    <table class="w-full min-w-[560px] border-collapse text-left">
      <thead>
        <tr class="border-b border-hairline">
          <th class="w-[46%] px-5 py-4 text-[13px] font-semibold text-muted">Fonctionnalités</th>
          <th
            v-for="plan in PLANS"
            :key="plan.slug"
            class="px-4 py-4 text-center"
            :class="plan.slug === selectedSlug ? 'bg-primary/8' : ''"
          >
            <div class="text-[13.5px] font-bold text-dark">{{ plan.name }}</div>
            <div class="text-[11.5px] text-muted">{{ plan.priceLabel }}{{ plan.period }}</div>
          </th>
        </tr>
      </thead>
      <template v-for="category in PLAN_COMPARISON" :key="category.title">
        <tbody>
          <tr class="border-b border-hairline bg-bg">
            <td :colspan="1 + PLANS.length" class="px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              {{ category.title }}
            </td>
          </tr>
          <tr v-for="row in category.rows" :key="row.label" class="border-b border-hairline last:border-b-0">
            <td class="px-5 py-3 text-[13px] text-ink">{{ row.label }}</td>
            <td
              v-for="plan in PLANS"
              :key="plan.slug"
              class="px-4 py-3 text-center text-[13px]"
              :class="plan.slug === selectedSlug ? 'bg-primary/8' : ''"
            >
              <template v-if="isBoolean(row.values[plan.slug])">
                <span v-if="row.values[plan.slug]" class="font-bold text-primary" aria-label="Inclus">✓</span>
                <span v-else class="text-hairline" aria-label="Non inclus">—</span>
              </template>
              <span v-else class="font-semibold text-dark">{{ row.values[plan.slug] }}</span>
            </td>
          </tr>
        </tbody>
      </template>
    </table>
  </div>
</template>
