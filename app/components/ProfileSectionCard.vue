<script setup lang="ts">
import { NuxtLink } from '#components'
import type { Component } from 'vue'

/**
 * Carte de section du hub profil (chercheur `/profil` et prestataire
 * `/profil`), inspirée d'une maquette de référence fournie par
 * l'utilisateur : icône, titre, sous-titre, statut de complétion.
 *
 * Trois modes (#hub-profil-modales) :
 * - `to` fourni : navigation classique (ex. Abonnement, flux de paiement à
 *   part entière, mieux sur sa propre page qu'en fenêtre).
 * - `interactive` sans `to` : rendu en bouton, le clic (`@click` posé par
 *   l'appelant, transmis via le fallthrough d'attributs Vue) ouvre la
 *   fenêtre de la section depuis le hub, sans navigation.
 * - Ni l'un ni l'autre : carte informative non cliquable, sans statut (ex.
 *   « Avis reçus », « Compétences »).
 *
 * `tag` doit être la RÉFÉRENCE du composant NuxtLink (importée de
 * `#components`), pas la chaîne `'NuxtLink'` : NuxtLink n'est pas
 * enregistré dans le registre global de Vue (seul un usage statique
 * `<NuxtLink>` dans un template est résolu par l'auto-import de Nuxt), donc
 * `<component :is="'NuxtLink'">` échoue silencieusement et rend un élément
 * `<nuxtlink>` inerte — carte cliquable en apparence, mais qui ne navigue
 * jamais (bug constaté sur la carte « Abonnement »). `'button'`/`'div'`
 * restent des chaînes : ce sont des balises HTML natives, toujours
 * résolubles.
 */
const props = withDefaults(
  defineProps<{
    icon: string
    title: string
    subtitle: string
    complete?: boolean
    to?: string
    interactive?: boolean
  }>(),
  { complete: false, to: undefined, interactive: false },
)

const { t } = useI18n({ useScope: 'global' })

const tag = computed<Component | string>(() => (props.to ? NuxtLink : props.interactive ? 'button' : 'div'))
const showBadge = computed(() => !!props.to || props.interactive)
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :type="tag === 'button' ? 'button' : undefined"
    class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm"
    :class="(to || interactive) ? 'press block w-full text-left hover:border-primary/40' : ''"
  >
    <div class="mb-3 flex size-10 items-center justify-center rounded-field bg-primary/10 text-lg" aria-hidden="true">
      {{ icon }}
    </div>
    <p class="mb-1 text-[14.5px] font-bold text-dark">{{ title }}</p>
    <div class="flex items-end justify-between gap-2">
      <p class="text-[12.5px] leading-relaxed text-muted">{{ subtitle }}</p>
      <span
        v-if="showBadge"
        class="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold"
        :class="complete ? 'bg-primary/12 text-primary' : 'bg-error/10 text-error'"
      >
        {{ complete ? t('profileSectionCard.complete') : t('profileSectionCard.incomplete') }}
      </span>
    </div>
  </component>
</template>
