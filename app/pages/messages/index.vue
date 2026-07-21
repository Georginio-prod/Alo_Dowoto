<script setup lang="ts">
// `alias` : rend cette page également accessible sous /prestataire/messages
// (lien utilisé par la nav du dashboard prestataire) sans dupliquer le
// composant — /messages tout court reste la route canonique partagée avec
// le chercheur.
definePageMeta({ layout: 'messages', middleware: 'auth', alias: '/prestataire/messages' })
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
    <div class="mb-2 flex size-14 items-center justify-center rounded-full bg-bg text-2xl">💬</div>
    <p class="text-[15px] font-bold text-dark">Vos messages</p>
    <p class="max-w-[320px] text-[13.5px] leading-relaxed text-muted">
      Sélectionnez une conversation à gauche pour l'afficher, ou contactez un prestataire depuis ses résultats de
      recherche pour en démarrer une nouvelle.
    </p>
  </div>
</template>
