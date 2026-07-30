<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const { open } = useChoiceModal()

const query = ref('')

// État partagé (voir useSession.ts) : ne refait pas la requête si un autre
// composant (ex. le middleware `auth`) l'a déjà résolue pour cette
// navigation, et reste à jour après une connexion/déconnexion ailleurs
// dans l'app puisque `sessionUser` est la même ref partagée.
const { user: sessionUser, ensure } = useSession()
await ensure()

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
    <!--
      Sur mobile, l'en-tête s'organise en deux bandes : le logo et les actions
      de compte sur la première (`order-2` pour les actions), la recherche sur
      toute la largeur en dessous (`order-3` + `basis-full`). Auparavant, la
      barre de recherche gardait sa largeur minimale de 240 px au milieu de la
      ligne et repoussait « Se connecter » / « Devenir prestataire » sur deux
      lignes supplémentaires, soit un en-tête de quatre bandes qui occupait le
      tiers supérieur de l'écran. À partir de `sm`, la disposition d'origine
      (logo · recherche · actions) reprend.
    -->
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2.5 px-5 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
      <NuxtLink to="/" class="order-1 shrink-0 text-xl font-extrabold tracking-tight text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>

      <form
        role="search"
        class="order-3 flex w-full min-w-0 basis-full items-center gap-2 rounded-pill border border-black/10 bg-bg py-2 pl-[18px] pr-2 sm:order-2 sm:w-auto sm:min-w-60 sm:flex-1 sm:basis-80"
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
          :placeholder="t('header.searchPlaceholder')"
          :aria-label="t('header.searchAriaLabel')"
        >
        <button
          type="submit"
          class="press shrink-0 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {{ t('header.searchSubmit') }}
        </button>
      </form>

      <!-- `flex-wrap` + `min-w-0` (au lieu de `shrink-0`) : « Se connecter » et
           « Devenir prestataire » mis côte à côte mesurent ~357 px, plus que la
           largeur utile d'un écran de 320-375 px — le bloc débordait alors et
           toute la page défilait horizontalement. -->
      <!-- `flex-1 basis-0` sur mobile : sans base souple, le bloc d'actions est
           placé à sa largeur maximale (~330 px), ne tient pas à côté du logo et
           bascule en entier sur une ligne à lui. Avec une base nulle il reste
           sur la ligne du logo et ce sont ses propres enfants qui se répartissent
           sur deux lignes. -->
      <div class="order-2 ml-auto flex min-w-0 flex-1 basis-0 flex-wrap items-center justify-end gap-x-2.5 gap-y-2 sm:order-3 sm:flex-none sm:basis-auto">
        <LanguageSwitcher />
        <WalletBalanceChip v-if="sessionUser?.role === 'client'" />
        <NotificationBell v-if="sessionUser" />
        <AccountMenu v-if="sessionUser" :user="sessionUser" />
        <template v-else>
          <NuxtLink
            to="/auth"
            class="press px-2 py-2.5 text-[14.5px] font-semibold text-dark hover:text-primary"
          >
            {{ t('header.login') }}
          </NuxtLink>
          <NuxtLink
            to="/auth?role=prestataire"
            class="press rounded-[9px] bg-dark px-5 py-2.5 text-[14.5px] font-semibold text-white hover:bg-dark-hover"
          >
            {{ t('header.becomeProvider') }}
          </NuxtLink>
        </template>
      </div>
    </div>

    <AppNavBar />
  </header>
</template>
