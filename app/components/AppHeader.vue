<script setup lang="ts">
const { open } = useChoiceModal()

const query = ref('')

// État partagé (voir useSession.ts) : ne refait pas la requête si un autre
// composant (ex. le middleware `auth`) l'a déjà résolue pour cette
// navigation, et reste à jour après une connexion/déconnexion ailleurs
// dans l'app puisque `sessionUser` est la même ref partagée.
const { user: sessionUser, ensure } = useSession()
await ensure()

// Bascule clair/sombre (#188) : `theme` est un `useState` partagé, initialisé
// dès le chargement de la page par `app/plugins/theme.client.ts` (choix
// mémorisé, sinon `prefers-color-scheme`), donc déjà à jour ici.
const { theme, toggle: toggleTheme } = useTheme()

function onSearch() {
  const q = query.value.trim()
  if (!q) return

  // Déjà connecté en tant que chercheur : la modale de choix de compte n'a
  // plus lieu d'être, on va directement aux résultats (voir index.vue#onSelectSubSector).
  if (sessionUser.value?.role === 'client') {
    navigateTo({ path: '/resultats', query: { q } })
    return
  }

  open(q)
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-hairline bg-surface">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3.5">
      <NuxtLink to="/" class="shrink-0 text-xl font-extrabold tracking-tight text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>

      <form
        role="search"
        class="flex min-w-60 flex-1 basis-80 items-center gap-2 rounded-pill border border-black/10 bg-bg py-2 pl-[18px] pr-2"
        @submit.prevent="onSearch"
      >
        <svg class="size-[18px] shrink-0 opacity-55" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" />
          <line x1="12.3" y1="12.3" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="min-w-0 flex-1 rounded-sm border-none bg-transparent text-[14.5px] text-ink outline-none placeholder:text-muted"
          placeholder="Rechercher un service : plomberie, ménage, développeur web…"
          aria-label="Rechercher un service"
        >
        <button
          type="submit"
          class="press shrink-0 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Rechercher
        </button>
      </form>

      <div class="ml-auto flex shrink-0 items-center gap-2.5">
        <WalletBalanceChip v-if="sessionUser?.role === 'client'" />
        <button
          type="button"
          class="press grid size-9 shrink-0 place-items-center rounded-pill border border-hairline text-dark hover:text-primary"
          :aria-label="theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" class="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <line x1="12" y1="2.5" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="21.5" />
              <line x1="2.5" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="21.5" y2="12" />
              <line x1="4.9" y1="4.9" x2="6.6" y2="6.6" />
              <line x1="17.4" y1="17.4" x2="19.1" y2="19.1" />
              <line x1="17.4" y1="6.6" x2="19.1" y2="4.9" />
              <line x1="4.9" y1="19.1" x2="6.6" y2="17.4" />
            </g>
          </svg>
          <svg v-else class="size-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="currentColor" />
          </svg>
        </button>

        <AccountMenu v-if="sessionUser" :user="sessionUser" />
        <template v-else>
          <NuxtLink
            to="/auth"
            class="press px-2 py-2.5 text-[14.5px] font-semibold text-dark hover:text-primary"
          >
            Se connecter
          </NuxtLink>
          <NuxtLink
            to="/auth?role=prestataire"
            class="press rounded-[9px] bg-dark px-5 py-2.5 text-[14.5px] font-semibold text-white hover:bg-dark-hover"
          >
            Devenir prestataire
          </NuxtLink>
        </template>
      </div>
    </div>

    <AppNavBar />
  </header>
</template>
