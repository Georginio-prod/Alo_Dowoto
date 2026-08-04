<script setup lang="ts">
/** Fenêtre d'envoi d'un message direct (#dashboard-admin) — réutilisée par les fiches Prestataires/Chercheurs/Avis. */
defineProps<{ open: boolean, loading: boolean }>()
const emit = defineEmits<{ send: [subject: string, body: string], cancel: [] }>()

const { t } = useI18n({ useScope: 'global' })

const subject = ref('')
const body = ref('')

function send() {
  if (!subject.value || !body.value) return
  emit('send', subject.value, body.value)
  subject.value = ''
  body.value = ''
}

function cancel() {
  subject.value = ''
  body.value = ''
  emit('cancel')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4" @click.self="cancel">
    <div class="w-full max-w-[420px] rounded-card border border-hairline bg-surface p-5 shadow-card-lg">
      <p class="mb-3 text-[15px] font-bold text-dark">{{ t('admin.providers.messageCta') }}</p>
      <input v-model="subject" type="text" :placeholder="t('admin.providers.messageSubject')" class="mb-2 w-full rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark">
      <textarea v-model="body" rows="4" :placeholder="t('admin.providers.messageBody')" class="mb-3 w-full resize-none rounded-field border border-hairline bg-white px-3 py-2 text-[13px] text-dark" />
      <div class="flex justify-end gap-2">
        <button type="button" class="press rounded-field border border-hairline bg-white px-4 py-2 text-[13px] font-semibold text-muted" @click="cancel">{{ t('admin.confirmModal.cancel') }}</button>
        <button type="button" class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60" :disabled="loading || !subject || !body" @click="send">
          {{ t('admin.providers.messageSend') }}
        </button>
      </div>
    </div>
  </div>
</template>
