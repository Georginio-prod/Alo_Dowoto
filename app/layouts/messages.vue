<script setup lang="ts">
/**
 * Coquille à deux volets (liste + fil actif) pour /messages : la liste vit
 * ici, dans le layout, pour rester montée d'une conversation à l'autre — si
 * elle vivait dans chaque page, changer de conversation la remonterait et
 * la refetcherait à chaque clic (état perdu, clignotement).
 *
 * Sur mobile, un seul volet à la fois : la liste occupe tout l'écran sur
 * /messages, le fil actif occupe tout l'écran sur /messages/[id] (avec son
 * propre lien de retour vers la liste).
 */
const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
// `route.params.id` plutôt qu'une comparaison de chemin en dur : /messages
// est aussi accessible via l'alias /prestataire/messages (voir
// app/pages/messages/index.vue), qui ne matcherait jamais '/messages'.
const isConversationOpen = computed(() => !!route.params.id)
</script>

<template>
  <!-- `pb-tabbar` : réserve la hauteur de la barre d'onglets globale pour que
       le champ de saisie du fil ne passe pas dessous (#refonte-tabbar). Nul sur
       desktop (≥ lg) où la barre est masquée. -->
  <div class="flex h-screen flex-col bg-bg text-ink pb-tabbar">
    <div class="mx-auto flex w-full max-w-[1200px] shrink-0 items-center border-x border-b border-hairline bg-surface px-4 py-2.5">
      <NuxtLink to="/" class="press flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-dark" :aria-label="t('messagesLayout.backAria')">
        {{ t('messagesLayout.back') }}
      </NuxtLink>
    </div>

    <div class="mx-auto flex w-full max-w-[1200px] flex-1 overflow-hidden border-x border-hairline bg-surface">
      <aside
        class="w-full shrink-0 overflow-hidden border-r border-hairline sm:w-[340px]"
        :class="isConversationOpen ? 'hidden sm:block' : 'block'"
      >
        <ConversationList />
      </aside>

      <main class="min-w-0 flex-1" :class="isConversationOpen ? 'block' : 'hidden sm:block'">
        <slot />
      </main>
    </div>
  </div>
</template>
