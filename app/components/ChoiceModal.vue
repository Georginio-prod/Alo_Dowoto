<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    searchTerm?: string | null
    trialDays?: number
  }>(),
  {
    searchTerm: null,
    trialDays: 14,
  },
)

const emit = defineEmits<{
  cancel: []
}>()

const heading = computed(() =>
  props.searchTerm ? `Recherche : "${props.searchTerm}"` : 'Que souhaitez-vous faire ?',
)

function query() {
  return props.searchTerm ? { q: props.searchTerm } : {}
}

function chooseClient() {
  // La modale est affichée par le layout via `v-if="isOpen"` (état externe
  // au composant) : sans ce `cancel`, elle reste visible par-dessus la
  // page de destination après la navigation, puisque rien d'autre ne la
  // referme.
  emit('cancel')
  navigateTo({ path: '/auth', query: { role: 'client', ...query() } })
}

function chooseProvider() {
  emit('cancel')
  navigateTo({ path: '/auth', query: { role: 'prestataire', ...query() } })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => {
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
      @click.self="emit('cancel')"
    >
      <div
        class="w-full max-w-[680px] animate-[wt-fade_0.18s_ease-out] rounded-2xl bg-white p-8"
        role="dialog"
        aria-modal="true"
        :aria-label="heading"
      >
        <div class="mb-[26px] text-center">
          <h2 class="mb-2 text-xl font-bold text-dark">{{ heading }}</h2>
          <p class="text-sm text-muted">Choisissez comment vous voulez utiliser WorkTogo</p>
        </div>

        <div class="flex flex-wrap gap-4">
          <button
            type="button"
            class="lift flex-1 basis-[260px] rounded-[14px] border-2 border-transparent bg-bg p-[22px] text-left hover:border-primary hover:bg-white"
            @click="chooseClient"
          >
            <div class="mb-3.5 inline-block rounded-pill bg-primary/12 px-2.5 py-1 text-[13px] font-bold text-primary">
              Inscription gratuite
            </div>
            <div class="mb-2 text-[17px] font-bold text-dark">Je cherche un service</div>
            <div class="text-[13.5px] leading-relaxed text-muted">
              Trouvez un prestataire vérifié, comparez les tarifs et contactez-le gratuitement.
            </div>
          </button>

          <button
            type="button"
            class="lift flex-1 basis-[260px] rounded-[14px] border-2 border-transparent bg-dark p-[22px] text-left hover:border-primary"
            @click="chooseProvider"
          >
            <div class="mb-3.5 flex flex-wrap items-center justify-between gap-2">
              <span class="rounded-pill bg-white/15 px-2.5 py-1 text-[13px] font-bold text-white">
                Essai gratuit {{ trialDays }} jours
              </span>
              <span class="whitespace-nowrap rounded-pill bg-white px-2.5 py-1 text-[11px] font-bold text-dark">
                Abonnement requis
              </span>
            </div>
            <div class="mb-2 text-[17px] font-bold text-white">Je propose un service</div>
            <div class="text-[13.5px] leading-relaxed text-white/75">
              Recevez des demandes de clients près de chez vous et développez votre activité.
            </div>
          </button>
        </div>

        <button
          type="button"
          class="press mx-auto mt-5 block bg-transparent text-[13.5px] text-muted"
          @click="emit('cancel')"
        >
          Annuler
        </button>
      </div>
    </div>
  </Teleport>
</template>
