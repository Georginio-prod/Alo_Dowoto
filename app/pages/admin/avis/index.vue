<script setup lang="ts">
/** Avis & modération (#dashboard-admin, module 8). */
definePageMeta({ layout: 'admin', middleware: 'auth', authRole: 'admin' })

interface ReviewRow {
  id: string
  conversationId: string
  authorId: string
  targetId: string
  rating: number
  comment: string | null
  createdAt: number
  hidden: boolean
  hiddenReason: string | null
  flagged: boolean
  autoFlagReason: 'phone' | 'off_platform_mention' | 'insult' | null
}

const { t } = useI18n({ useScope: 'global' })
const flaggedOnly = ref(false)
const query = computed(() => ({ flagged: flaggedOnly.value ? '1' : '0' }))
const { data, pending, error, refresh } = await useFetch<{ reviews: ReviewRow[] }>('/api/admin/reviews', { query })

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const AUTO_FLAG_LABEL = computed<Record<string, string>>(() => ({
  phone: t('admin.reviews.autoFlagPhone'),
  off_platform_mention: t('admin.reviews.autoFlagOffPlatform'),
  insult: t('admin.reviews.autoFlagInsult'),
}))

const busy = ref(false)
const toast = ref('')
async function withBusy(action: () => Promise<void>) {
  busy.value = true
  try { await action(); await refresh() } catch (err) { toast.value = err instanceof Error ? err.message : t('admin.common.error') } finally { busy.value = false }
}

const hideTarget = ref<string | null>(null)
async function hideReview(reason?: string) {
  const id = hideTarget.value
  hideTarget.value = null
  if (!id || !reason) return
  await withBusy(async () => { await $fetch(`/api/admin/reviews/${id}/hide`, { method: 'POST', body: { reason } }) })
}

const deleteTarget = ref<string | null>(null)
async function deleteReview(reason?: string) {
  const id = deleteTarget.value
  deleteTarget.value = null
  if (!id || !reason) return
  await withBusy(async () => { await $fetch(`/api/admin/reviews/${id}/delete`, { method: 'POST', body: { reason } }) })
}

async function restoreReview(id: string) {
  await withBusy(async () => { await $fetch(`/api/admin/reviews/${id}/restore`, { method: 'POST' }) })
}

const contactTarget = ref<ReviewRow | null>(null)
const contactSubject = ref('')
const contactBody = ref('')
async function contactAuthor() {
  const review = contactTarget.value
  if (!review) return
  await withBusy(async () => {
    await $fetch(`/api/admin/reviews/${review.id}/contact-author`, { method: 'POST', body: { subject: contactSubject.value, body: contactBody.value } })
    contactTarget.value = null
    contactSubject.value = ''
    contactBody.value = ''
  })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-[19px] font-extrabold text-dark">{{ t('admin.reviews.title') }}</h1>

    <p v-if="toast" class="mb-4 rounded-field border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{{ toast }}</p>

    <label class="mb-4 flex w-fit items-center gap-1.5 rounded-field border border-hairline bg-white px-2.5 py-1.5 text-[12.5px] text-dark">
      <input v-model="flaggedOnly" type="checkbox">
      {{ t('admin.reviews.flaggedOnly') }}
    </label>

    <p v-if="pending" class="text-[13px] text-muted">{{ t('admin.common.loading') }}</p>
    <p v-else-if="error" class="text-[13px] text-error">{{ t('admin.common.error') }}</p>
    <p v-else-if="data?.reviews.length === 0" class="rounded-card border border-hairline bg-surface p-6 text-center text-[13px] text-muted shadow-card-sm">{{ t('admin.common.empty') }}</p>

    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="review in data?.reviews" :key="review.id" class="rounded-card border p-4 shadow-card-sm" :class="review.flagged ? 'border-error/30 bg-error/5' : 'border-hairline bg-surface'">
        <div class="mb-1.5 flex items-center justify-between gap-2">
          <span class="font-semibold text-dark">{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
          <div class="flex items-center gap-1.5">
            <AdminBadge v-if="review.autoFlagReason" tone="danger">{{ AUTO_FLAG_LABEL[review.autoFlagReason] }}</AdminBadge>
            <AdminBadge v-if="review.hidden" tone="neutral">{{ t('admin.reviews.hiddenBadge') }}</AdminBadge>
            <span class="text-[11.5px] text-muted">{{ formatDate(review.createdAt) }}</span>
          </div>
        </div>
        <p class="mb-2 text-[12.5px] text-dark">{{ review.comment || t('admin.reviews.noComment') }}</p>
        <div class="flex flex-wrap gap-2">
          <button v-if="!review.hidden" type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[11.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="hideTarget = review.id">
            {{ t('admin.reviews.hideCta') }}
          </button>
          <button v-else type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[11.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="restoreReview(review.id)">
            {{ t('admin.reviews.restoreCta') }}
          </button>
          <button type="button" class="press rounded-field border border-error px-3 py-1.5 text-[11.5px] font-semibold text-error disabled:opacity-60" :disabled="busy" @click="deleteTarget = review.id">
            {{ t('admin.common.delete') }}
          </button>
          <button type="button" class="press rounded-field border border-hairline bg-white px-3 py-1.5 text-[11.5px] font-semibold text-dark disabled:opacity-60" :disabled="busy" @click="contactTarget = review">
            {{ t('admin.reviews.contactAuthorCta') }}
          </button>
        </div>
      </li>
    </ul>

    <AdminConfirmModal :open="hideTarget !== null" :title="t('admin.reviews.hideCta')" require-reason :loading="busy" @confirm="hideReview" @cancel="hideTarget = null" />
    <AdminConfirmModal :open="deleteTarget !== null" :title="t('admin.common.delete')" require-reason danger :loading="busy" @confirm="deleteReview" @cancel="deleteTarget = null" />

    <div v-if="contactTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="contactTarget = null">
      <div class="w-full max-w-[420px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
        <p class="mb-3 text-[15px] font-bold text-dark">{{ t('admin.reviews.contactAuthorCta') }}</p>
        <input v-model="contactSubject" type="text" :placeholder="t('admin.providers.messageSubject')" class="mb-2 w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
        <textarea v-model="contactBody" rows="4" :placeholder="t('admin.providers.messageBody')" class="mb-3 w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark" />
        <div class="flex justify-end gap-2">
          <button type="button" class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted" @click="contactTarget = null">{{ t('admin.confirmModal.cancel') }}</button>
          <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="busy || !contactSubject || !contactBody" @click="contactAuthor">
            {{ t('admin.providers.messageSend') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
