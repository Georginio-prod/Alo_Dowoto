<script setup lang="ts">
/**
 * Socle de navigation du dashboard prestataire (#37).
 *
 * Point d'extension pour les futures sections (#36 est la seule
 * disponible pour l'instant) : ajouter une entrée ici avec `disabled:
 * false` et une route réelle suffit, sans toucher aux pages existantes.
 */
interface NavItem {
  label: string
  to: string | null
}

const NAV_ITEM_CLASSES = {
  active: 'bg-primary/10 text-primary',
  inactive: 'press text-muted hover:bg-bg hover:text-dark',
  disabled: 'cursor-not-allowed text-muted/60',
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', to: '/prestataire' },
  { label: 'Profil', to: null },
  { label: 'Demandes reçues', to: null },
  { label: 'Avis', to: null },
]

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <div class="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 lg:w-[220px]">
        <NuxtLink to="/" class="mb-5 block text-[19px] font-extrabold text-dark">
          Work<span class="text-primary">Togo</span>
        </NuxtLink>

        <nav class="flex flex-row gap-1.5 overflow-x-auto rounded-card border border-hairline bg-surface p-2 shadow-card-sm lg:flex-col lg:overflow-visible">
          <template v-for="item in NAV_ITEMS" :key="item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="whitespace-nowrap rounded-field px-3.5 py-2.5 text-[13.5px] font-semibold"
              :class="item.to === route.path ? NAV_ITEM_CLASSES.active : NAV_ITEM_CLASSES.inactive"
            >
              {{ item.label }}
            </NuxtLink>
            <span
              v-else
              class="whitespace-nowrap rounded-field px-3.5 py-2.5 text-[13.5px] font-semibold"
              :class="NAV_ITEM_CLASSES.disabled"
              aria-disabled="true"
            >
              {{ item.label }} <span class="text-[11px] font-normal">(bientôt)</span>
            </span>
          </template>
        </nav>
      </aside>

      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
