<script setup lang="ts">
/**
 * En-tête persistant du dashboard admin (#dashboard-admin) : recherche
 * globale (comptes), alertes (litiges/KYC/paiements bloqués) et compte
 * connecté. `menuButton` ouvre le tiroir de navigation mobile (voir
 * app/layouts/admin.vue).
 */
const emit = defineEmits<{ 'toggle-menu': [] }>()

interface SearchResult { id: string, label: string, contact: string, role: string }
interface Alerts { disputesOpen: number, kycPending: number, paymentsBlocked: number, total: number }

const { t } = useI18n({ useScope: 'global' })
const { user } = useSession()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const searchOpen = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchQuery, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (value.trim().length < 2) {
    searchResults.value = []
    searchOpen.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    const data = await $fetch<{ results: SearchResult[] }>('/api/admin/search', { query: { q: value.trim() } })
    searchResults.value = data.results
    searchOpen.value = true
  }, 250)
})

function targetFor(result: SearchResult): string {
  return result.role === 'prestataire' ? `/admin/prestataires/${result.id}` : `/admin/chercheurs/${result.id}`
}

const { data: alertsData, refresh: refreshAlerts } = await useFetch<Alerts>('/api/admin/alerts')
const alertsOpen = ref(false)
const accountOpen = ref(false)

const alerts = computed(() => alertsData.value ?? { disputesOpen: 0, kycPending: 0, paymentsBlocked: 0, total: 0 })

const { clear: clearSession } = useSession()
async function logout() {
  await $fetch('/api/auth/session', { method: 'DELETE' })
  clearSession()
  navigateTo('/')
}

onMounted(() => {
  refreshAlerts()
})
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-surface px-4 py-3">
    <button
      type="button"
      class="press rounded-field border border-hairline bg-white p-2 text-dark lg:hidden"
      :aria-label="t('admin.header.openMenu')"
      @click="emit('toggle-menu')"
    >
      ☰
    </button>

    <div class="relative min-w-0 flex-1">
      <input
        v-model="searchQuery"
        type="search"
        :placeholder="t('admin.header.searchPlaceholder')"
        :aria-label="t('admin.header.searchPlaceholder')"
        class="w-full max-w-[420px] rounded-field border border-hairline bg-white px-3.5 py-2 text-[13px] text-dark"
        @focus="searchOpen = searchResults.length > 0"
        @blur="() => setTimeout(() => (searchOpen = false), 150)"
      >
      <div
        v-if="searchOpen && searchResults.length > 0"
        class="absolute left-0 top-full z-40 mt-1 w-full max-w-[420px] rounded-card border border-hairline bg-surface p-1.5 shadow-card-lg"
      >
        <NuxtLink
          v-for="result in searchResults"
          :key="result.id"
          :to="targetFor(result)"
          class="press flex items-center justify-between rounded-field px-3 py-2 text-[13px] hover:bg-bg"
        >
          <span class="font-semibold text-dark">{{ result.label }}</span>
          <span class="text-[11.5px] text-muted">{{ result.contact }}</span>
        </NuxtLink>
      </div>
    </div>

    <div class="relative shrink-0">
      <button
        type="button"
        class="press relative rounded-field border border-hairline bg-white p-2 text-dark"
        :aria-label="t('admin.header.alerts')"
        @click="alertsOpen = !alertsOpen; accountOpen = false"
      >
        🔔
        <span
          v-if="alerts.total > 0"
          class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-error px-1 text-[10px] font-bold text-white"
        >
          {{ alerts.total }}
        </span>
      </button>
      <div v-if="alertsOpen" class="absolute right-0 top-full z-40 mt-1 w-[260px] rounded-card border border-hairline bg-surface p-2 shadow-card-lg">
        <NuxtLink to="/admin/litiges" class="press flex items-center justify-between rounded-field px-3 py-2 text-[12.5px] hover:bg-bg" @click="alertsOpen = false">
          <span class="text-dark">{{ t('admin.header.alertDisputes') }}</span>
          <span class="font-bold text-error">{{ alerts.disputesOpen }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/prestataires?kyc=pending" class="press flex items-center justify-between rounded-field px-3 py-2 text-[12.5px] hover:bg-bg" @click="alertsOpen = false">
          <span class="text-dark">{{ t('admin.header.alertKyc') }}</span>
          <span class="font-bold text-error">{{ alerts.kycPending }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/paiements?blocked=1" class="press flex items-center justify-between rounded-field px-3 py-2 text-[12.5px] hover:bg-bg" @click="alertsOpen = false">
          <span class="text-dark">{{ t('admin.header.alertPayments') }}</span>
          <span class="font-bold text-error">{{ alerts.paymentsBlocked }}</span>
        </NuxtLink>
        <p v-if="alerts.total === 0" class="px-3 py-2 text-[12px] text-muted">{{ t('admin.header.noAlerts') }}</p>
      </div>
    </div>

    <div class="relative shrink-0">
      <button
        type="button"
        class="press flex items-center gap-2 rounded-field border border-hairline bg-white px-2.5 py-1.5"
        @click="accountOpen = !accountOpen; alertsOpen = false"
      >
        <span class="flex h-7 w-7 items-center justify-center rounded-pill bg-primary/10 text-[12px] font-bold text-primary">
          {{ (user?.firstName?.[0] ?? 'A').toUpperCase() }}
        </span>
        <span class="hidden text-[12.5px] font-semibold text-dark sm:inline">{{ user?.firstName || t('admin.header.accountFallback') }}</span>
      </button>
      <div v-if="accountOpen" class="absolute right-0 top-full z-40 mt-1 w-[180px] rounded-card border border-hairline bg-surface p-1.5 shadow-card-lg">
        <button type="button" class="press block w-full rounded-field px-3 py-2 text-left text-[12.5px] font-semibold text-error hover:bg-error/10" @click="logout">
          {{ t('admin.header.logout') }}
        </button>
      </div>
    </div>
  </header>
</template>
