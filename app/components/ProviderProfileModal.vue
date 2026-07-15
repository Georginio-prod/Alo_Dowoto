<script setup lang="ts">
import type { ConversationSummary } from '~~/server/utils/conversationStore'
import type { ProviderDetail } from '~~/server/utils/providerDirectory'

/**
 * Fenêtre « Voir le profil » d'un prestataire (#127), ouverte depuis
 * ProviderCard/MatchCard. Le bouton « Contacter le prestataire » (#128)
 * reprend exactement le flux déjà utilisé par MatchCard (quota mensuel de
 * contacts #63 puis création/récupération de la conversation, #58/#59) pour
 * que ce nouveau point d'entrée ne le contourne pas.
 */

const props = defineProps<{ providerId: string }>()
const emit = defineEmits<{ close: [] }>()

const provider = ref<ProviderDetail | null>(null)
const isLoading = ref(true)
const loadError = ref('')

const isContacting = ref(false)
const contactError = ref('')

const filledStars = computed(() => (provider.value ? Math.round(provider.value.rating) : 0))

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const { provider: detail } = await $fetch<{ provider: ProviderDetail }>(`/api/providers/${props.providerId}`)
    provider.value = detail
  } catch {
    loadError.value = 'Impossible de charger ce profil pour le moment.'
  } finally {
    isLoading.value = false
  }
}

async function contactProvider() {
  if (isContacting.value) return
  isContacting.value = true
  contactError.value = ''
  try {
    await $fetch('/api/quotas/contacts', { method: 'POST' })
    const { conversation } = await $fetch<{ conversation: ConversationSummary }>('/api/conversations', {
      method: 'POST',
      body: { providerId: props.providerId },
    })
    navigateTo(`/messages/${conversation.id}`)
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401) {
      navigateTo({ path: '/auth', query: { role: 'client' } })
      return
    }
    if (statusCode === 429) {
      contactError.value = 'Quota de contacts atteint ce mois-ci. Réessayez le mois prochain.'
      return
    }
    if (statusCode === 403) {
      contactError.value = (error as { statusMessage?: string }).statusMessage
        || 'Vérifiez votre identité avant de contacter un prestataire.'
      return
    }
    contactError.value = 'Impossible de contacter ce prestataire pour le moment. Réessayez plus tard.'
  } finally {
    isContacting.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  load()
  if (!import.meta.client) return
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (!import.meta.client) return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,35,24,0.5)] p-5"
      @click.self="emit('close')"
    >
      <div
        class="max-h-[85vh] w-full max-w-[520px] animate-[wt-fade_0.18s_ease-out] overflow-y-auto rounded-2xl bg-white p-7"
        role="dialog"
        aria-modal="true"
        :aria-label="provider ? `Profil de ${provider.displayName}` : 'Profil prestataire'"
      >
        <button type="button" class="press float-right text-lg text-muted" aria-label="Fermer" @click="emit('close')">
          ✕
        </button>

        <p v-if="isLoading" class="py-8 text-center text-[13.5px] text-muted">Chargement du profil…</p>

        <p v-else-if="loadError || !provider" class="py-8 text-center text-[13.5px] text-error">
          {{ loadError || 'Prestataire introuvable.' }}
        </p>

        <template v-else>
          <div class="mb-4 flex items-center gap-3.5">
            <div
              class="flex size-16 shrink-0 items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
            >
              <span class="rounded-pill bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold text-white">photo</span>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[17px] font-bold text-dark">{{ provider.displayName }}</span>
                <span
                  v-if="provider.badges.identity"
                  class="rounded-pill bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary"
                >
                  ✓ Identité vérifiée
                </span>
                <span
                  v-if="provider.badges.skills"
                  class="rounded-pill bg-bg px-2 py-0.5 text-[11px] font-bold text-dark"
                >
                  ✓ Compétences vérifiées
                </span>
              </div>
              <p class="text-[13px] text-muted">{{ provider.subSector }} · {{ provider.city }}</p>
            </div>
          </div>

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="text-[13.5px] text-dark">
              <span aria-hidden="true">
                <span v-for="n in 5" :key="n" :class="n <= filledStars ? 'text-star' : 'text-hairline'">★</span>
              </span>
              <span class="ml-1 font-semibold">{{ provider.rating.toFixed(1) }}</span>
              <span class="text-muted"> ({{ provider.reviewCount }} avis)</span>
            </span>
            <span class="rounded-pill bg-bg px-2.5 py-1 text-[11.5px] font-semibold text-dark">
              {{ provider.experienceYears }} an{{ provider.experienceYears > 1 ? 's' : '' }} d'expérience
            </span>
          </div>

          <p class="mb-4 text-[13.5px] leading-relaxed text-dark">{{ provider.bio }}</p>

          <div class="mb-4 grid grid-cols-2 gap-3 rounded-field bg-bg p-3.5 text-[13px]">
            <div>
              <div class="mb-0.5 font-semibold text-dark">Localisation</div>
              <div class="text-muted">{{ provider.city }}</div>
            </div>
            <div>
              <div class="mb-0.5 font-semibold text-dark">Disponibilité</div>
              <div class="text-muted">{{ provider.availability }}</div>
            </div>
            <div>
              <div class="mb-0.5 font-semibold text-dark">Téléphone</div>
              <div class="text-muted">{{ provider.phone }}</div>
            </div>
            <div>
              <div class="mb-0.5 font-semibold text-dark">Email</div>
              <div class="truncate text-muted">{{ provider.email }}</div>
            </div>
          </div>
          <p v-if="!provider.contactRevealed" class="mb-4 text-[11.5px] text-muted">
            Coordonnées partiellement masquées — contactez ce prestataire pour les voir en clair.
          </p>

          <a
            v-if="provider.cvUrl"
            :href="provider.cvUrl"
            target="_blank"
            rel="noopener"
            class="press mb-1.5 block w-full rounded-field border border-hairline bg-white py-2.5 text-center text-[13.5px] font-semibold text-dark hover:border-primary"
          >
            Consulter le CV
          </a>
          <p v-else class="mb-4 text-[12.5px] text-muted">CV non communiqué par ce prestataire.</p>

          <p v-if="contactError" class="mb-2 text-[12.5px] text-error">{{ contactError }}</p>

          <button
            type="button"
            class="press w-full rounded-field bg-primary py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="isContacting"
            @click="contactProvider"
          >
            {{ isContacting ? 'Ouverture…' : 'Contacter le prestataire' }}
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>
