<script setup lang="ts">
/**
 * Page dédiée « Comment ça marche » (#tutoriel-onboarding — Couche 3, « la
 * référence »). Accessible en permanence depuis l'onglet Compte.
 *
 * Catalogue role-aware des modules avec vignette, durée estimée et statut
 * (vu / à voir), barre de progression globale, recherche, FAQ en accordéon et
 * bouton support. Un chercheur curieux peut basculer sur les modules prestataire.
 */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { t } = useI18n({ useScope: 'global' })
const { user } = useSession()
const tutorials = useTutorials()

onMounted(() => tutorials.load())

// Rôle affiché : le sien par défaut, basculable pour la curiosité.
const viewRole = ref<'client' | 'prestataire'>(user.value?.role === 'prestataire' ? 'prestataire' : 'client')
const ns = computed(() => (viewRole.value === 'prestataire' ? 'provider' : 'client'))
const modules = computed(() => modulesForRole(viewRole.value))
const query = ref('')

const decorated = computed(() =>
  modules.value.map((m) => ({
    ...m,
    title: t(`tutorials.${ns.value}.modules.${m.id}.title`),
    desc: t(`tutorials.${ns.value}.modules.${m.id}.desc`),
    seen: tutorials.hasSeen(m.seenKey ?? m.id),
  })),
)
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return decorated.value
  return decorated.value.filter((m) => m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q))
})

const seenCount = computed(() => decorated.value.filter((m) => m.seen).length)
const total = computed(() => modules.value.length)
const progressPct = computed(() => (total.value ? Math.round((seenCount.value / total.value) * 100) : 0))

const faqKeys = [1, 2, 3, 4] as const
const openFaq = ref<number | null>(null)
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

function toggleRole() {
  viewRole.value = viewRole.value === 'prestataire' ? 'client' : 'prestataire'
  query.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-[720px] px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-6">
    <header class="mb-5">
      <NuxtLink to="/profil" class="press mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-dark">
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        {{ t('tutorials.back') }}
      </NuxtLink>
      <h1 class="text-[26px] font-extrabold leading-tight text-dark">{{ t('tutorials.title') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ t('tutorials.subtitle') }}</p>
    </header>

    <!-- Progression globale. -->
    <div class="mb-5">
      <p class="mb-1.5 text-sm font-semibold text-dark">{{ t('tutorials.progress', { done: seenCount, total }) }}</p>
      <div class="h-2 overflow-hidden rounded-pill bg-hairline" role="progressbar" :aria-valuenow="progressPct" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-pill bg-primary transition-all duration-500" :style="{ width: `${progressPct}%` }" />
      </div>
    </div>

    <!-- Recherche. -->
    <label class="mb-5 flex items-center gap-2.5 rounded-pill border border-hairline bg-surface px-4 py-3 shadow-card-sm focus-within:border-primary">
      <span class="sr-only">{{ t('tutorials.searchPlaceholder') }}</span>
      <svg class="size-[18px] shrink-0 text-muted" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" />
        <path d="m12.5 12.5 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <input v-model="query" type="search" :placeholder="t('tutorials.searchPlaceholder')" class="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted">
    </label>

    <!-- Modules. -->
    <ul v-if="filtered.length" class="mb-8 space-y-2.5">
      <li v-for="m in filtered" :key="m.id">
        <button type="button" class="press flex w-full items-center gap-3 rounded-card border border-hairline bg-surface p-3.5 text-left shadow-card-sm hover:border-primary/40" @click="navigateTo(m.path)">
          <span class="grid size-11 shrink-0 place-items-center rounded-[12px] bg-primary/10 text-2xl" aria-hidden="true">{{ m.icon }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-[14.5px] font-bold text-dark">{{ m.title }}</span>
            <span class="mt-0.5 block truncate text-[12.5px] text-muted">{{ m.desc }}</span>
            <span class="mt-1 flex items-center gap-2 text-[11.5px]">
              <span class="text-muted">{{ t('tutorials.durationSec', { sec: m.durationSec }) }}</span>
              <span
                class="inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 font-semibold"
                :class="m.seen ? 'bg-primary/10 text-primary' : 'bg-hairline text-muted'"
              >
                <svg v-if="m.seen" viewBox="0 0 12 12" class="size-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.5 5 9l4.5-5" /></svg>
                {{ m.seen ? t('tutorials.statusSeen') : t('tutorials.statusNew') }}
              </span>
            </span>
          </span>
          <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </li>
    </ul>
    <p v-else class="mb-8 rounded-card border border-hairline bg-surface p-6 text-center text-sm text-muted">{{ t('tutorials.noResults') }}</p>

    <!-- FAQ en accordéon. -->
    <section class="mb-8">
      <h2 class="mb-3 text-[15px] font-bold text-dark">{{ t('tutorials.faqHeading') }}</h2>
      <div class="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
        <div v-for="i in faqKeys" :key="i">
          <button type="button" class="press flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left" :aria-expanded="openFaq === i" @click="toggleFaq(i)">
            <span class="text-[13.5px] font-semibold text-dark">{{ t(`tutorials.faq.q${i}`) }}</span>
            <svg viewBox="0 0 24 24" class="size-4 shrink-0 text-muted transition-transform" :class="{ 'rotate-180': openFaq === i }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <p v-if="openFaq === i" class="px-4 pb-4 text-[13px] leading-relaxed text-muted">{{ t(`tutorials.faq.a${i}`) }}</p>
        </div>
      </div>
    </section>

    <!-- Support + bascule de rôle. -->
    <NuxtLink to="/contact" class="press mb-4 flex w-full items-center justify-center gap-2 rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover">
      {{ t('tutorials.contactSupport') }}
    </NuxtLink>
    <button type="button" class="press block w-full py-2 text-center text-sm font-semibold text-primary" @click="toggleRole">
      {{ viewRole === 'prestataire' ? t('tutorials.seeClient') : t('tutorials.seeProvider') }}
    </button>
  </div>
</template>
