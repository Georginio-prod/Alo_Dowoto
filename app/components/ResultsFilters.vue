<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

const CITIES = ['Lomé', 'Kara', 'Sokodé', 'Kpalimé', 'Atakpamé', 'Dapaong']
const RATING_OPTIONS = computed<{ label: string; value: number | null }[]>(() => [
  { label: t('resultsFilters.ratingAll'), value: null },
  { label: t('resultsFilters.rating3Plus'), value: 3 },
  { label: t('resultsFilters.rating4Plus'), value: 4 },
  { label: t('resultsFilters.rating45Plus'), value: 4.5 },
])
const PRICE_MIN = 500
const PRICE_MAX = 6000
const PRICE_STEP = 500

defineProps<{
  subSectorOptions: string[]
}>()

const subSectors = defineModel<string[]>('subSectors', { required: true })
const city = defineModel<string>('city', { required: true })
const ratingMin = defineModel<number | null>('ratingMin', { required: true })
const priceMax = defineModel<number>('priceMax', { required: true })

function toggleSubSector(name: string) {
  subSectors.value = subSectors.value.includes(name)
    ? subSectors.value.filter((s) => s !== name)
    : [...subSectors.value, name]
}

function reset() {
  subSectors.value = []
  city.value = ''
  ratingMin.value = null
  priceMax.value = PRICE_MAX
}
</script>

<template>
  <div class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-[15px] font-bold text-dark">{{ t('resultsFilters.title') }}</h2>
      <button type="button" class="press text-[13px] font-semibold text-primary" @click="reset">
        {{ t('resultsFilters.reset') }}
      </button>
    </div>

    <div v-if="subSectorOptions.length" class="mb-5">
      <p class="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-muted">{{ t('resultsFilters.subSectorLabel') }}</p>
      <label
        v-for="name in subSectorOptions"
        :key="name"
        class="mb-2 flex items-center gap-2 text-[13.5px] text-ink last:mb-0"
      >
        <input
          type="checkbox"
          class="size-4 accent-primary"
          :checked="subSectors.includes(name)"
          @change="toggleSubSector(name)"
        >
        {{ name }}
      </label>
    </div>

    <div class="mb-5">
      <label for="filter-city" class="mb-2 block text-[11.5px] font-bold uppercase tracking-wide text-muted">
        {{ t('resultsFilters.cityLabel') }}
      </label>
      <select
        id="filter-city"
        v-model="city"
        class="h-[42px] w-full rounded-field border border-hairline bg-white px-3 text-[13.5px] text-ink outline-none focus:border-primary"
      >
        <option value="">{{ t('resultsFilters.allCities') }}</option>
        <option v-for="cityOption in CITIES" :key="cityOption" :value="cityOption">{{ cityOption }}</option>
      </select>
    </div>

    <div class="mb-5">
      <p class="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-muted">{{ t('resultsFilters.ratingLabel') }}</p>
      <div class="flex flex-col gap-2">
        <button
          v-for="option in RATING_OPTIONS"
          :key="option.label"
          type="button"
          class="press rounded-field border px-3 py-2 text-left text-[13px] font-semibold"
          :class="ratingMin === option.value ? 'border-primary bg-primary/10 text-dark' : 'border-hairline bg-white text-muted'"
          @click="ratingMin = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div>
      <label for="filter-price" class="mb-2 block text-[11.5px] font-bold uppercase tracking-wide text-muted">
        {{ t('resultsFilters.priceLabel', { price: priceMax }) }}
      </label>
      <input
        id="filter-price"
        v-model.number="priceMax"
        type="range"
        :min="PRICE_MIN"
        :max="PRICE_MAX"
        :step="PRICE_STEP"
        class="w-full accent-primary"
      >
    </div>
  </div>
</template>
