<script setup lang="ts">
/** Pagination côté serveur des tableaux admin (#dashboard-admin) — voir server/utils/adminPagination.ts. */
const props = defineProps<{ page: number, pageSize: number, total: number }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()

const { t } = useI18n({ useScope: 'global' })

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

function go(page: number) {
  if (page < 1 || page > pageCount.value || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-[12.5px] text-muted">
    <p>{{ t('admin.pagination.range', { start: rangeStart, end: rangeEnd, total }) }}</p>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="press rounded-field border border-hairline bg-white px-3 py-1.5 font-semibold text-dark disabled:opacity-40"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        {{ t('admin.pagination.previous') }}
      </button>
      <span class="px-2 font-semibold text-dark">{{ t('admin.pagination.pageOf', { page, pageCount }) }}</span>
      <button
        type="button"
        class="press rounded-field border border-hairline bg-white px-3 py-1.5 font-semibold text-dark disabled:opacity-40"
        :disabled="page >= pageCount"
        @click="go(page + 1)"
      >
        {{ t('admin.pagination.next') }}
      </button>
    </div>
  </div>
</template>
