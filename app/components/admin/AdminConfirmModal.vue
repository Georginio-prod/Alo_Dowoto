<script setup lang="ts">
/**
 * Confirmation explicite pour toute action destructrice du dashboard admin
 * (#dashboard-admin) — suppression, remboursement, libération de fonds,
 * suspension... Un motif peut être exigé (`requireReason`) : consommé par le
 * journal d'audit (server/utils/auditLog.ts) côté route appelante.
 */
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  requireReason?: boolean
  reasonLabel?: string
  loading?: boolean
}>(), {
  description: '',
  confirmLabel: undefined,
  danger: false,
  requireReason: false,
  reasonLabel: undefined,
  loading: false,
})

const emit = defineEmits<{ confirm: [reason: string | undefined], cancel: [] }>()

const { t } = useI18n({ useScope: 'global' })

const reason = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) reason.value = ''
})

const canConfirm = computed(() => !props.requireReason || reason.value.trim().length > 0)

function confirm() {
  if (!canConfirm.value || props.loading) return
  emit('confirm', props.requireReason ? reason.value.trim() : undefined)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="emit('cancel')">
    <div class="w-full max-w-[420px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
      <p class="mb-1.5 text-[15px] font-bold text-dark">{{ title }}</p>
      <p v-if="description" class="mb-3.5 text-[13px] leading-relaxed text-muted">{{ description }}</p>

      <div v-if="requireReason" class="mb-4">
        <label class="mb-1.5 block text-[12px] font-semibold text-dark">{{ reasonLabel ?? t('admin.confirmModal.reasonLabel') }}</label>
        <textarea
          v-model="reason"
          rows="3"
          class="w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark"
        />
      </div>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ t('admin.confirmModal.cancel') }}
        </button>
        <button
          type="button"
          class="press rounded-field px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          :class="danger ? 'bg-error' : 'bg-primary hover:bg-primary-hover'"
          :disabled="!canConfirm || loading"
          @click="confirm"
        >
          {{ loading ? t('admin.confirmModal.loading') : (confirmLabel ?? t('admin.confirmModal.confirm')) }}
        </button>
      </div>
    </div>
  </div>
</template>
