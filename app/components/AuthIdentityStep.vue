<script setup lang="ts">
/**
 * Étape « Identité » du parcours d'inscription (#180+1) : facultative à ce
 * stade (voir bouton « Passer pour l'instant »), mais requise ensuite pour
 * qu'un chercheur publie sa première demande ou qu'un prestataire puisse
 * être contacté (server/api/requests, server/api/conversations). Extrait de
 * app/pages/auth.vue pour respecter la limite de lignes par fichier.
 */

const props = defineProps<{ role: 'client' | 'prestataire' }>()
const emit = defineEmits<{ done: [] }>()

const { t } = useI18n({ useScope: 'global' })
const { user } = useSession()
const isVerified = computed(() => user.value?.verified ?? false)

const requirementCopy = computed(() =>
  props.role === 'prestataire'
    ? t('authIdentityStep.requirementProvider')
    : t('authIdentityStep.requirementClient'),
)
</script>

<template>
  <div>
    <label class="mb-1 block text-[13px] font-semibold text-dark">{{ t('authIdentityStep.label') }}</label>
    <p class="mb-3.5 text-[13px] leading-relaxed text-muted">{{ requirementCopy }}</p>

    <IdentityVerificationForm @submitted="emit('done')" />

    <button
      v-if="!isVerified"
      type="button"
      class="press mt-3 w-full text-[13px] font-semibold text-muted hover:text-dark"
      @click="emit('done')"
    >
      {{ t('authIdentityStep.skip') }}
    </button>
    <button
      v-else
      type="button"
      class="press mt-3.5 w-full rounded-field bg-primary py-3.5 text-[15px] font-semibold text-white hover:bg-primary-hover"
      @click="emit('done')"
    >
      {{ t('authIdentityStep.continueCta') }}
    </button>
  </div>
</template>
