<script setup lang="ts">
/**
 * Socle de navigation du dashboard prestataire (#37).
 *
 * Point d'extension pour les futures sections (Avis) : ajouter une route
 * réelle à l'entrée ici suffit, sans toucher aux pages existantes.
 */
interface NavItem {
  label: string
  to: string | null
  activePaths?: string[]
}

const NAV_ITEM_CLASSES = {
  active: 'bg-primary/10 text-primary',
  inactive: 'press text-muted hover:bg-bg hover:text-dark',
  disabled: 'cursor-not-allowed text-muted/60',
}

// Sous-pages du profil accessibles en lien direct (marque-page) plutôt que
// depuis une fenêtre du hub /profil (#hub-profil-modales) — elles doivent
// quand même faire ressortir l'entrée « Profil » de la nav, sinon rien ne
// s'allume alors qu'on est bien dans cette section.
const PROFILE_SUBPAGES = [
  '/prestataire/profil-professionnel',
  '/prestataire/cv',
  '/prestataire/langues',
  '/prestataire/formation',
  '/prestataire/certifications',
  '/prestataire/preferences',
  '/prestataire/coordonnees',
]

// La nav pointe vers les alias sous /prestataire/… (voir `alias` dans
// definePageMeta de prestataire/index.vue, profil.vue et messages/index.vue)
// pour que l'URL reflète toujours « section prestataire » — /prestataire,
// /profil et /messages restent aussi valides (liens externes, redirections
// de connexion) et sont donc gardés dans `activePaths` pour ne pas casser
// la surbrillance si on y arrive par un autre chemin.
const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', to: '/prestataire/accueil', activePaths: ['/prestataire'] },
  { label: 'Profil', to: '/prestataire/profil', activePaths: ['/profil', ...PROFILE_SUBPAGES] },
  { label: 'Demandes reçues', to: '/prestataire/demandes' },
  { label: 'Solde', to: '/prestataire/solde' },
  { label: 'Messages', to: '/prestataire/messages', activePaths: ['/messages'] },
  { label: 'Avis', to: null },
]

const route = useRoute()

function isActive(item: NavItem): boolean {
  return item.to === route.path || !!item.activePaths?.includes(route.path)
}
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <div class="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 lg:w-[220px]">
        <NuxtLink to="/prestataire/accueil" class="mb-5 block text-[19px] font-extrabold text-dark">
          Work<span class="text-primary">Togo</span>
        </NuxtLink>

        <nav class="flex flex-row gap-1.5 overflow-x-auto rounded-card border border-hairline bg-surface p-2 shadow-card-sm lg:flex-col lg:overflow-visible">
          <template v-for="item in NAV_ITEMS" :key="item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="whitespace-nowrap rounded-field px-3.5 py-2.5 text-[13.5px] font-semibold"
              :class="isActive(item) ? NAV_ITEM_CLASSES.active : NAV_ITEM_CLASSES.inactive"
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
