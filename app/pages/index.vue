<script setup lang="ts">
/**
 * Racine `/` — dans l'APK mobile, la vitrine marketing publique (hero,
 * secteurs, formules…) n'a pas lieu d'être : l'accueil de l'app est le
 * dashboard unifié role-aware (`/dashboard`, cf. app/pages/dashboard/index.vue).
 *
 * On redirige donc `/` au lieu d'afficher la vitrine :
 *   - prestataire → son espace (`/prestataire`, comportement inchangé) ;
 *   - chercheur   → `/dashboard` (écran « Bonjour … de quoi avez-vous besoin ? ») ;
 *   - visiteur non connecté → `/dashboard`, dont le middleware `auth` renvoie
 *     vers `/auth` pour la connexion.
 *
 * (La vitrine reste le site web ; ceci ne concerne que le build APK, branche `apk`.)
 */
const { user, ensure } = useSession()
await ensure()

if (user.value?.role === 'prestataire') {
  await navigateTo('/prestataire')
} else {
  await navigateTo('/dashboard')
}
</script>

<template>
  <div />
</template>
