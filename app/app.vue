<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Montée une seule fois au niveau racine pour apparaître sur toutes les pages (#225). -->
    <FavoritesMessagingBar />
  </div>
</template>
