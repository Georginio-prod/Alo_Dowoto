<script setup lang="ts">
/**
 * Dashboard unifié « Mon espace » (cible mobile / APK, voir mobile/).
 *
 * Fusionne en UNE seule route role-aware les deux tableaux de bord jusqu'ici
 * séparés — chercheur (app/pages/dashboard/client.vue, layout `blank`) et
 * prestataire (app/pages/prestataire/index.vue, layout `dashboard-prestataire`
 * à barre latérale). L'utilisateur connecté ne voit donc qu'un seul écran
 * cohérent et scrollable adapté à son rôle.
 *
 * Ne modifie ni ne remplace les pages existantes : elle réutilise exactement
 * les mêmes API et clés i18n. Cette page ne porte que la coquille commune
 * (en-tête, aiguillage de rôle, barre d'onglets) ; le corps de chaque rôle vit
 * dans son propre composant, qui n'est monté — et ne déclenche donc ses appels
 * API — que pour ce rôle.
 *
 * Mise en page alignée sur la maquette « WorkTogo — App mobile, de A à Z »
 * (écrans 2.1 « Accueil client » et 6.1 « Tableau de bord prestataire »).
 */

definePageMeta({ layout: 'blank', middleware: 'auth' })

const { user } = useSession()

// Rôle connu dès le setup : le middleware `auth` a déjà résolu la session
// (refresh) avant le rendu de la page.
const isProvider = computed(() => user.value?.role === 'prestataire')
</script>

<template>
  <div class="mx-auto max-w-[720px] px-5 pb-28 pt-6 lg:pb-8">
    <!-- Ce <div> doit rester l'unique nœud racine (transitions de page Nuxt) :
         même un commentaire placé avant lui compte pour un second nœud.
         `pb-28` dégage la hauteur de MobileTabBar (fixe) pour que le dernier
         bloc reste atteignable au scroll.

         En-tête commun aux deux rôles : le solde n'est jamais à plus d'un
         geste côté chercheur (côté prestataire il vit dans la carte encre). -->
    <header class="mb-6 flex items-center justify-between gap-3">
      <NuxtLink to="/dashboard" class="text-[19px] font-extrabold text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>
      <div class="flex items-center gap-1.5">
        <WalletBalanceChip v-if="!isProvider" />
        <NotificationBell />
      </div>
    </header>

    <DashboardProviderHome v-if="isProvider" />
    <DashboardSeekerHome v-else />

    <MobileTabBar :role="user?.role" />
  </div>
</template>
