<script setup lang="ts">
/**
 * Carte de section du hub profil (chercheur `/profil` et prestataire
 * `/profil`), inspirée d'une maquette de référence fournie par
 * l'utilisateur : icône, titre, sous-titre, statut de complétion. `to` est
 * facultatif — sans destination, la carte est informative uniquement (ex.
 * « Avis reçus », rien à compléter, voir profil.vue).
 */
withDefaults(
  defineProps<{
    icon: string
    title: string
    subtitle: string
    complete?: boolean
    /** Absent : carte informative, non cliquable et sans statut « À faire ». */
    to?: string
  }>(),
  { complete: false, to: undefined },
)
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'div'"
    :to="to"
    class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm"
    :class="to ? 'press block hover:border-primary/40' : ''"
  >
    <div class="mb-3 flex size-10 items-center justify-center rounded-field bg-primary/10 text-lg" aria-hidden="true">
      {{ icon }}
    </div>
    <p class="mb-1 text-[14.5px] font-bold text-dark">{{ title }}</p>
    <div class="flex items-end justify-between gap-2">
      <p class="text-[12.5px] leading-relaxed text-muted">{{ subtitle }}</p>
      <span
        v-if="to"
        class="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold"
        :class="complete ? 'bg-primary/12 text-primary' : 'bg-error/10 text-error'"
      >
        {{ complete ? 'Complété' : 'À faire' }}
      </span>
    </div>
  </component>
</template>
