<script setup lang="ts">
/**
 * Fenêtre générique pour compléter une section du hub profil (#hub-profil-modales)
 * sans quitter `/profil` — même schéma (Teleport, overlay, Échap, blocage du
 * scroll) que ProviderProfileModal.vue (« Voir le profil »). Le contenu
 * (formulaire de chaque section) est fourni par le slot par défaut.
 */
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
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
      @click.self="emit('close')"
    >
      <div
        class="max-h-[85vh] w-full max-w-[460px] animate-[wt-fade_0.18s_ease-out] overflow-y-auto rounded-2xl bg-white p-7"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="mb-5 flex items-center justify-between gap-3">
          <h2 class="text-lg font-bold text-dark">{{ title }}</h2>
          <button type="button" class="press shrink-0 text-lg text-muted" aria-label="Fermer" @click="emit('close')">
            ✕
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
