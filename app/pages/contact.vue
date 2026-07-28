<script setup lang="ts">
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '~/data/companyInfo'

const { t } = useI18n({ useScope: 'global' })

useHead(() => ({ title: t('contact.pageTitle') }))

interface ContactReason {
  labelKey: string
  to: string
  descriptionKey: string
}

const OTHER_REASONS: ContactReason[] = [
  { labelKey: 'contact.reasonFaqLabel', to: '/faq', descriptionKey: 'contact.reasonFaqDesc' },
  { labelKey: 'contact.reasonComplaintLabel', to: '/reclamation', descriptionKey: 'contact.reasonComplaintDesc' },
]
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="mb-2 text-2xl font-extrabold text-dark">{{ t('contact.heading') }}</h1>
    <p class="mb-6 text-[14.5px] leading-relaxed text-muted">
      {{ t('contact.intro') }}
    </p>

    <div class="mb-6 flex flex-col gap-3">
      <a :href="`mailto:${SUPPORT_EMAIL}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 hover:border-primary/40">
        <span class="text-[13.5px] font-semibold text-dark">{{ t('contact.email') }}</span>
        <span class="text-[13.5px] text-primary">{{ SUPPORT_EMAIL }}</span>
      </a>
      <a :href="`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`" class="press flex items-center justify-between rounded-card border border-hairline bg-surface p-4 hover:border-primary/40">
        <span class="text-[13.5px] font-semibold text-dark">{{ t('contact.phone') }}</span>
        <span class="text-[13.5px] text-primary">{{ SUPPORT_PHONE }}</span>
      </a>
    </div>

    <p class="mb-8 text-[12.5px] leading-relaxed text-muted">
      {{ t('contact.hours') }}
    </p>

    <h2 class="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">{{ t('contact.otherNeed') }}</h2>
    <div class="flex flex-col gap-3">
      <NuxtLink
        v-for="reason in OTHER_REASONS"
        :key="reason.to"
        :to="reason.to"
        class="press rounded-card border border-hairline bg-surface p-4 hover:border-primary/40"
      >
        <div class="mb-1 text-[13.5px] font-bold text-dark">{{ t(reason.labelKey) }}</div>
        <p class="text-[13px] text-muted">{{ t(reason.descriptionKey) }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
