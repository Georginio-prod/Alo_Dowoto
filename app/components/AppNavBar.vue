<script setup lang="ts">
import { SECTORS } from '~/data/sectors'
import { SECTOR_ICONS } from '~/utils/sectorIcons'

/**
 * Deuxième ligne de l'en-tête : menus déroulants "méga-menu" façon grandes
 * plateformes de mise en relation (secteurs, avantages prestataire, aide),
 * adaptés au contenu réel de WorkTogo plutôt qu'une simple liste de liens.
 * Desktop uniquement (`hidden lg:block`) : pas de version mobile pour ce
 * lot, l'en-tête compact existant (logo + recherche) reste inchangé et
 * suffisant sur petit écran.
 */

type MenuKey = 'trouver' | 'devenir' | 'aide'

const { t } = useI18n({ useScope: 'global' })

const CLOSE_DELAY_MS = 150

const root = ref<HTMLElement | null>(null)
const openMenu = ref<MenuKey | null>(null)
const supportsHover = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const sectorColumns = computed(() => [SECTORS.slice(0, 5), SECTORS.slice(5, 10)])

function clearCloseTimer() {
  if (!closeTimer) return
  clearTimeout(closeTimer)
  closeTimer = null
}

function scheduleClose() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    openMenu.value = null
  }, CLOSE_DELAY_MS)
}

function openOnHover(key: MenuKey) {
  if (!supportsHover.value) return
  clearCloseTimer()
  openMenu.value = key
}

function toggleOnClick(key: MenuKey) {
  clearCloseTimer()
  openMenu.value = openMenu.value === key ? null : key
}

function closeMenu() {
  clearCloseTimer()
  openMenu.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

function onClickOutside(e: MouseEvent) {
  if (openMenu.value && root.value && !e.composedPath().includes(root.value)) closeMenu()
}

onMounted(() => {
  if (!import.meta.client) return
  supportsHover.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  window.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  clearCloseTimer()
  if (!import.meta.client) return
  window.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div ref="root" class="relative hidden border-t border-hairline lg:block" @keydown="onKeydown" @mouseleave="scheduleClose">
    <nav class="mx-auto flex max-w-6xl items-center justify-center gap-1 px-6" :aria-label="t('nav.ariaLabel')">
      <button
        type="button"
        class="press flex items-center gap-1 rounded-field px-3 py-2.5 text-[13.5px] font-semibold text-dark hover:bg-bg"
        :aria-expanded="openMenu === 'trouver'"
        @mouseenter="openOnHover('trouver')"
        @click="toggleOnClick('trouver')"
      >
        {{ t('nav.find.menu') }}
        <svg class="size-3.5 transition-transform" :class="{ 'rotate-180': openMenu === 'trouver' }" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        class="press flex items-center gap-1 rounded-field px-3 py-2.5 text-[13.5px] font-semibold text-dark hover:bg-bg"
        :aria-expanded="openMenu === 'devenir'"
        @mouseenter="openOnHover('devenir')"
        @click="toggleOnClick('devenir')"
      >
        {{ t('nav.become.menu') }}
        <svg class="size-3.5 transition-transform" :class="{ 'rotate-180': openMenu === 'devenir' }" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        class="press flex items-center gap-1 rounded-field px-3 py-2.5 text-[13.5px] font-semibold text-dark hover:bg-bg"
        :aria-expanded="openMenu === 'aide'"
        @mouseenter="openOnHover('aide')"
        @click="toggleOnClick('aide')"
      >
        {{ t('nav.why.menu') }}
        <svg class="size-3.5 transition-transform" :class="{ 'rotate-180': openMenu === 'aide' }" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <NuxtLink to="/formules" class="press rounded-field px-3 py-2.5 text-[13.5px] font-semibold text-dark hover:bg-bg">
        {{ t('nav.pricing') }}
      </NuxtLink>
    </nav>

    <div
      v-if="openMenu"
      class="absolute inset-x-0 top-full z-30 animate-[wt-fade_0.16s_ease-out] border-b border-hairline bg-surface shadow-card-md"
      @mouseenter="clearCloseTimer"
    >
      <div class="mx-auto max-w-6xl px-6 py-8">
          <!-- Trouver un prestataire : secteurs (côté chercheur) -->
          <div v-if="openMenu === 'trouver'" class="flex gap-10">
            <div class="w-[220px] shrink-0">
              <h2 class="mb-2 text-[17px] font-bold leading-snug text-dark">{{ t('nav.find.title') }}</h2>
              <p class="text-[13px] leading-relaxed text-muted">
                {{ t('nav.find.description') }}
              </p>
            </div>
            <div class="grid flex-1 grid-cols-2 gap-x-8">
              <div v-for="(column, i) in sectorColumns" :key="i" class="flex flex-col gap-4">
                <NuxtLink
                  v-for="sector in column"
                  :key="sector.slug"
                  :to="`/categories/${sector.slug}`"
                  class="group press flex items-start gap-2.5 rounded-field p-1.5 hover:bg-bg"
                  @click="closeMenu"
                >
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-transform duration-200 ease-out group-hover:scale-110"
                    :style="{ background: sector.color, color: sector.ink }"
                  >
                    <component :is="SECTOR_ICONS[sector.icon]" :size="16" :stroke-width="2.25" aria-hidden="true" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-[13.5px] font-semibold text-dark">{{ sector.name }}</span>
                    <span class="block truncate text-[12px] text-muted">
                      {{ sector.subSectors.slice(0, 2).map((s) => s.name).join(', ') }}
                    </span>
                  </span>
                </NuxtLink>
              </div>
            </div>
            <div class="flex w-[180px] shrink-0 flex-col gap-2.5 border-l border-hairline pl-8 text-[13.5px] font-semibold">
              <NuxtLink to="/categories" class="press text-primary hover:underline" @click="closeMenu">
                {{ t('nav.find.allCategories') }}
              </NuxtLink>
              <NuxtLink to="/demande" class="press text-primary hover:underline" @click="closeMenu">
                {{ t('nav.find.postRequest') }}
              </NuxtLink>
            </div>
          </div>

          <!-- Devenir prestataire : avantages (côté prestataire) -->
          <div v-else-if="openMenu === 'devenir'" class="flex gap-10">
            <div class="w-[220px] shrink-0">
              <h2 class="mb-2 text-[17px] font-bold leading-snug text-dark">{{ t('nav.become.title') }}</h2>
              <p class="text-[13px] leading-relaxed text-muted">
                {{ t('nav.become.description') }}
              </p>
            </div>
            <div class="grid flex-1 grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p class="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">{{ t('nav.become.advantagesLabel') }}</p>
                <div class="flex flex-col gap-1">
                  <div class="-mx-1.5 rounded-field px-1.5 py-1.5 transition-colors duration-150 hover:bg-bg">
                    <div class="text-[13.5px] font-semibold text-dark">{{ t('nav.become.verifiedProfile') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.become.verifiedProfileDesc') }}</div>
                  </div>
                  <div class="-mx-1.5 rounded-field px-1.5 py-1.5 transition-colors duration-150 hover:bg-bg">
                    <div class="text-[13.5px] font-semibold text-dark">{{ t('nav.become.mobileMoney') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.become.mobileMoneyDesc') }}</div>
                  </div>
                  <div class="-mx-1.5 rounded-field px-1.5 py-1.5 transition-colors duration-150 hover:bg-bg">
                    <div class="text-[13.5px] font-semibold text-dark">{{ t('nav.become.freeTrial') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.become.freeTrialDesc') }}</div>
                  </div>
                </div>
              </div>
              <div>
                <p class="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">{{ t('nav.become.dailyLabel') }}</p>
                <div class="flex flex-col gap-1">
                  <div class="-mx-1.5 rounded-field px-1.5 py-1.5 transition-colors duration-150 hover:bg-bg">
                    <div class="text-[13.5px] font-semibold text-dark">{{ t('nav.become.targetedRequests') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.become.targetedRequestsDesc') }}</div>
                  </div>
                  <div class="-mx-1.5 rounded-field px-1.5 py-1.5 transition-colors duration-150 hover:bg-bg">
                    <div class="text-[13.5px] font-semibold text-dark">{{ t('nav.become.messaging') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.become.messagingDesc') }}</div>
                  </div>
                  <div class="-mx-1.5 rounded-field px-1.5 py-1.5 transition-colors duration-150 hover:bg-bg">
                    <div class="text-[13.5px] font-semibold text-dark">{{ t('nav.become.support') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.become.supportDesc') }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex w-[180px] shrink-0 flex-col gap-2.5 border-l border-hairline pl-8 text-[13.5px] font-semibold">
              <NuxtLink to="/auth?role=prestataire" class="press text-primary hover:underline" @click="closeMenu">
                {{ t('nav.become.cta') }}
              </NuxtLink>
              <NuxtLink to="/formules" class="press text-primary hover:underline" @click="closeMenu">
                {{ t('nav.become.seePlans') }}
              </NuxtLink>
            </div>
          </div>

          <!-- Pourquoi WorkTogo : confiance, aide, ressources -->
          <div v-else-if="openMenu === 'aide'" class="flex gap-10">
            <div class="w-[220px] shrink-0">
              <h2 class="mb-2 text-[17px] font-bold leading-snug text-dark">{{ t('nav.why.title') }}</h2>
              <p class="text-[13px] leading-relaxed text-muted">
                {{ t('nav.why.description') }}
              </p>
            </div>
            <div class="grid flex-1 grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p class="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">{{ t('nav.why.resourcesLabel') }}</p>
                <div class="flex flex-col gap-3.5">
                  <NuxtLink to="/a-propos" class="press block" @click="closeMenu">
                    <div class="text-[13.5px] font-semibold text-dark hover:text-primary">{{ t('nav.why.about') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.why.aboutDesc') }}</div>
                  </NuxtLink>
                  <NuxtLink to="/faq" class="press block" @click="closeMenu">
                    <div class="text-[13.5px] font-semibold text-dark hover:text-primary">{{ t('nav.why.faq') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.why.faqDesc') }}</div>
                  </NuxtLink>
                </div>
              </div>
              <div>
                <p class="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">{{ t('nav.why.helpLabel') }}</p>
                <div class="flex flex-col gap-3.5">
                  <NuxtLink to="/aide" class="press block" @click="closeMenu">
                    <div class="text-[13.5px] font-semibold text-dark hover:text-primary">{{ t('nav.why.helpCenter') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.why.helpCenterDesc') }}</div>
                  </NuxtLink>
                  <NuxtLink to="/contact" class="press block" @click="closeMenu">
                    <div class="text-[13.5px] font-semibold text-dark hover:text-primary">{{ t('nav.why.contact') }}</div>
                    <div class="text-[12px] text-muted">{{ t('nav.why.contactDesc') }}</div>
                  </NuxtLink>
                </div>
              </div>
            </div>
            <div class="flex w-[180px] shrink-0 flex-col gap-2.5 border-l border-hairline pl-8 text-[13.5px] font-semibold">
              <NuxtLink to="/aide" class="press text-primary hover:underline" @click="closeMenu">
                {{ t('nav.why.seeAllHelp') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
