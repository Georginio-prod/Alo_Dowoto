<script setup lang="ts">
import { SECTORS, type Sector } from '~/data/sectors'
import { SECTOR_ICONS } from '~/utils/sectorIcons'

/**
 * Menu déroulant des sous-secteurs au survol (#133) : uniquement sur les
 * appareils à pointeur fin (souris) — sur tactile/tablette, seul le clic
 * (ouverture de SectorDrawer via `select`) reste disponible, inchangé.
 */

const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits<{
  select: [sector: Sector]
  'select-sub': [sector: Sector, subSectorName: string]
}>()

const CLOSE_DELAY_MS = 150
const DROPDOWN_WIDTH_PX = 256

const supportsHover = ref(false)
const hoveredSlug = ref<string | null>(null)
const flipLeft = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  supportsHover.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
})

function clearCloseTimer() {
  if (!closeTimer) return
  clearTimeout(closeTimer)
  closeTimer = null
}

function scheduleClose() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    hoveredSlug.value = null
  }, CLOSE_DELAY_MS)
}

function onCardEnter(sector: Sector, event: Event) {
  if (!supportsHover.value) return
  clearCloseTimer()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  flipLeft.value = rect.left + DROPDOWN_WIDTH_PX > window.innerWidth - 16
  hoveredSlug.value = sector.slug
}

function onDropdownEnter() {
  if (!supportsHover.value) return
  clearCloseTimer()
}

function onSelectSub(sector: Sector, subSectorName: string) {
  hoveredSlug.value = null
  emit('select-sub', sector, subSectorName)
}

onUnmounted(clearCloseTimer)
</script>

<template>
  <section id="secteurs" class="mx-auto max-w-6xl scroll-mt-24 px-6 pb-16 pt-8">
    <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 v-reveal class="text-lg font-bold text-dark">{{ t('sectorGrid.heading') }}</h2>
      <NuxtLink to="/categories" class="press link-underline text-[13.5px] font-semibold text-primary">
        {{ t('sectorGrid.allCategories') }}
      </NuxtLink>
    </div>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      <!--
        Élévation de la carte survolée au-dessus de ses voisines (le pop-up
        est sinon « piégé » sous la rangée suivante, chaque carte formant un
        contexte d'empilement via `will-change` de v-reveal). Le z-index passe
        par `:style` et NON par `:class` : la directive `v-reveal` ajoute la
        classe `is-visible` directement au DOM, or un `:class` réactif ferait
        re-patcher `className` par Vue à chaque survol, écrasant `is-visible`
        et faisant disparaître les cartes. `:style` ne touche pas `className`.
      -->
      <div
        v-for="(sector, i) in SECTORS"
        :key="sector.slug"
        v-reveal
        :style="{ '--reveal-delay': `${i * 50}ms`, zIndex: hoveredSlug === sector.slug ? 30 : undefined }"
        class="relative"
        @mouseenter="onCardEnter(sector, $event)"
        @mouseleave="scheduleClose"
        @focusin="onCardEnter(sector, $event)"
        @focusout="scheduleClose"
      >
        <button
          type="button"
          class="press group flex h-full w-full flex-col items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/40 hover:shadow-card-md"
          @click="emit('select', sector)"
        >
          <div
            class="flex h-11 w-11 items-center justify-center rounded-[12px] transition-transform duration-200 ease-out group-hover:scale-110"
            :style="{ background: sector.color, color: sector.ink }"
          >
            <component :is="SECTOR_ICONS[sector.icon]" :size="22" :stroke-width="2" aria-hidden="true" />
          </div>
          <div class="flex w-full items-start justify-between gap-2">
            <div>
              <div class="flex min-h-[2.4em] items-start text-[14.5px] font-semibold leading-tight text-dark">{{ sector.name }}</div>
              <span class="mt-1 inline-block rounded-pill bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
                {{ t('sectorGrid.subSectorCount', { count: sector.subSectors.length }) }}
              </span>
            </div>
            <span class="translate-x-0 text-sm font-bold text-primary opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:opacity-100">
              →
            </span>
          </div>
        </button>

        <!--
          Conteneur ancré directement sous la carte (`top-full`, sans trou) :
          le retrait visuel de 8px est fourni par un « pont » transparent
          (`pt-2`) plutôt que par un décalage de position. Sans ce pont, le
          trajet de la souris entre la carte et le menu traversait une zone
          morte (le fond de la grille), ce qui déclenchait `mouseleave` et
          fermait le menu avant qu'on l'atteigne. Ici, carte → pont → menu
          restent tous descendants du même wrapper : aucun `mouseleave`.
        -->
        <div
          class="absolute top-full z-20 w-64 pt-2 transition-all duration-250 ease-out"
          :class="[
            flipLeft ? 'right-0' : 'left-0',
            hoveredSlug === sector.slug ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
          ]"
          role="menu"
          :aria-hidden="hoveredSlug !== sector.slug"
          :aria-label="t('sectorGrid.subSectorsOf', { name: sector.name })"
          @mouseenter="onDropdownEnter"
          @mouseleave="scheduleClose"
        >
          <div class="origin-top rounded-card border border-hairline bg-surface p-1.5 shadow-card-md">
            <button
              v-for="sub in sector.subSectors"
              :key="sub.name"
              type="button"
              role="menuitem"
              class="press block w-full rounded-field px-3 py-2 text-left text-[13px] text-dark hover:bg-bg"
              @click="onSelectSub(sector, sub.name)"
            >
              {{ sub.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
