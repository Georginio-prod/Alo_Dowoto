<script setup lang="ts">
/**
 * Programme de parrainage (#365) : code personnel + lien à partager, et
 * tableau de suivi des filleuls. Accessible aux deux rôles (chercheur et
 * prestataire) — layout dynamique comme profil.vue, même raison (le rôle
 * n'est connu qu'après résolution de la session).
 */
definePageMeta({ layout: false, middleware: 'auth' })

interface ReferralRow {
  id: string
  status: 'pending' | 'rewarded'
  createdAt: number
  rewardedAt: number | null
  referredName: string | null
}

const { t, locale, locales } = useI18n({ useScope: 'global' })
const { user } = useSession()
const isProvider = computed(() => user.value?.role === 'prestataire')

const { data } = await useFetch<{ referralCode: string; bonusAmount: number; referrals: ReferralRow[] }>('/api/referrals/me')
const referralCode = computed(() => data.value?.referralCode ?? '')
const bonusAmount = computed(() => data.value?.bonusAmount ?? 0)
const referrals = computed(() => data.value?.referrals ?? [])

const languageTag = computed(() =>
  (locales.value as Array<{ code: string, language?: string }>).find((l) => l.code === locale.value)?.language ?? 'fr-FR',
)
const formattedBonus = computed(() => `${bonusAmount.value.toLocaleString(languageTag.value)} F CFA`)

const referralLink = computed(() => {
  if (!import.meta.client || !referralCode.value) return ''
  return `${window.location.origin}/auth?role=client&ref=${referralCode.value}`
})

const copied = ref(false)
async function copyLink() {
  if (!referralLink.value) return
  await navigator.clipboard.writeText(referralLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(languageTag.value, { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <NuxtLayout :name="isProvider ? 'dashboard-prestataire' : 'blank'">
    <div class="mx-auto max-w-[720px] px-5 py-8">
      <h1 class="text-[26px] font-extrabold text-dark">{{ t('parrainagePage.heading') }}</h1>
      <p class="mt-1 text-[13.5px] text-muted">
        {{ t('parrainagePage.subtitle', { amount: formattedBonus }) }}
      </p>

      <div v-reveal class="mt-5 rounded-card border border-hairline bg-surface p-6 shadow-card-sm">
        <p class="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">{{ t('parrainagePage.codeLabel') }}</p>
        <p class="mb-4 text-[24px] font-extrabold tracking-wide text-dark">{{ referralCode }}</p>

        <p class="mb-1.5 text-[13px] font-semibold text-dark">{{ t('parrainagePage.linkLabel') }}</p>
        <div class="flex items-center gap-2">
          <input
            :value="referralLink"
            readonly
            :aria-label="t('parrainagePage.linkLabel')"
            class="h-[42px] w-full rounded-field border border-hairline bg-bg px-3 text-[13px] text-muted"
            @focus="($event.target as HTMLInputElement).select()"
          >
          <button
            type="button"
            class="press shrink-0 rounded-field bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-hover"
            @click="copyLink"
          >
            {{ copied ? t('parrainagePage.copied') : t('parrainagePage.copyCta') }}
          </button>
        </div>
      </div>

      <div v-reveal :style="{ '--reveal-delay': '80ms' }" class="mt-5 rounded-card border border-hairline bg-surface p-5 shadow-card-sm">
        <p class="mb-4 text-[14.5px] font-bold text-dark">{{ t('parrainagePage.trackingHeading') }}</p>

        <p v-if="referrals.length === 0" class="text-center text-[13px] text-muted">{{ t('parrainagePage.noReferrals') }}</p>

        <ul v-else class="space-y-2">
          <li
            v-for="referral in referrals"
            :key="referral.id"
            class="flex items-center justify-between gap-3 rounded-field border border-hairline px-3.5 py-2.5"
          >
            <div class="min-w-0">
              <p class="truncate text-[13px] font-semibold text-dark">{{ referral.referredName ?? t('parrainagePage.unknownName') }}</p>
              <p class="text-[11.5px] text-muted">{{ t('parrainagePage.joinedOn', { date: formatDate(referral.createdAt) }) }}</p>
            </div>
            <span
              class="shrink-0 rounded-pill px-2.5 py-1 text-[11.5px] font-bold"
              :class="referral.status === 'rewarded' ? 'bg-primary/12 text-primary' : 'bg-bg text-muted'"
            >
              {{ referral.status === 'rewarded' ? t('parrainagePage.statusRewarded') : t('parrainagePage.statusPending') }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </NuxtLayout>
</template>
