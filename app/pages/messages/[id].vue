<script setup lang="ts">
import type { ConversationSummary, Message } from '~~/server/utils/conversationStore'

interface MessagesResponse {
  conversation: ConversationSummary
  messages: Message[]
}

definePageMeta({ layout: 'messages', middleware: 'auth' })

const route = useRoute()
const conversationId = computed(() => String(route.params.id))

const { data, pending, error, refresh } = await useFetch<MessagesResponse>(
  () => `/api/conversations/${conversationId.value}/messages`,
)
// Nécessaire côté client pour savoir quels messages sont "les miens" (alignement des bulles).
const { user: sessionUser } = useSession()
// Pour que la barre latérale reflète le dernier message / la première prise
// de contact / l'avis sans attendre une navigation (voir useConversations.ts).
const { refresh: refreshConversationList } = useConversations()

const conversation = computed(() => data.value?.conversation ?? null)
const messages = computed(() => data.value?.messages ?? [])
const currentUserId = computed(() => sessionUser.value?.id ?? '')
const currentUserContact = computed(() => sessionUser.value?.contact ?? '')

// Formulaire obligatoire de première prise de contact (#129) : uniquement
// pour le client, une seule fois par conversation (le serveur fait foi via
// `conversation.firstContactDone`, recalculé à chaque chargement).
const showFirstContactForm = computed(
  () => conversation.value?.clientId === currentUserId.value && conversation.value?.firstContactDone === false,
)

function onFirstContactSubmitted() {
  refresh()
  refreshConversationList()
}

const draft = ref('')
const isSending = ref(false)
const sendError = ref('')

// Notation mutuelle de fin de collaboration (#60) : le serveur fait foi
// (`conversation.alreadyReviewed`, recalculé côté API à chaque chargement),
// `reviewJustSubmitted` ne sert qu'à basculer l'affichage immédiatement
// après un envoi réussi, sans attendre le prochain `refresh()`.
const reviewRating = ref(0)
const reviewHoverRating = ref(0)
const reviewComment = ref('')
const isSubmittingReview = ref(false)
const reviewError = ref('')
const reviewJustSubmitted = ref(false)

const alreadyReviewed = computed(() => conversation.value?.alreadyReviewed === true || reviewJustSubmitted.value)

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function sendMessage() {
  const text = draft.value.trim()
  if (!text || isSending.value) return

  isSending.value = true
  sendError.value = ''
  try {
    await $fetch(`/api/conversations/${conversationId.value}/messages`, {
      method: 'POST',
      body: { body: text },
    })
    draft.value = ''
    await refresh()
    refreshConversationList()
  } catch {
    sendError.value = "Le message n'a pas pu être envoyé. Réessayez."
  } finally {
    isSending.value = false
  }
}

function setReviewRating(rating: number) {
  reviewRating.value = rating
}

async function submitReview() {
  if (reviewRating.value < 1 || isSubmittingReview.value) return

  isSubmittingReview.value = true
  reviewError.value = ''
  try {
    await $fetch(`/api/conversations/${conversationId.value}/review`, {
      method: 'POST',
      body: { rating: reviewRating.value, comment: reviewComment.value.trim() || undefined },
    })
    reviewJustSubmitted.value = true
    await refresh()
  } catch (fetchError) {
    // 409 : déjà noté (ex. deux onglets ouverts) — on aligne simplement
    // l'affichage sur cet état plutôt que d'afficher une erreur.
    if ((fetchError as { statusCode?: number }).statusCode === 409) {
      reviewJustSubmitted.value = true
    } else {
      reviewError.value = "L'avis n'a pas pu être publié. Réessayez."
    }
  } finally {
    isSubmittingReview.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3">
      <NuxtLink to="/messages" class="press text-lg text-muted sm:hidden" aria-label="Retour aux messages">←</NuxtLink>

      <template v-if="conversation">
        <ConversationAvatar :name="conversation.otherPartyName" :seed="conversation.id" size="sm" />
        <div class="min-w-0">
          <div class="truncate text-[14.5px] font-bold text-dark">{{ conversation.otherPartyName }}</div>
          <div v-if="conversation.otherPartySector" class="truncate text-[12px] text-muted">
            {{ conversation.otherPartySector }}
          </div>
        </div>
      </template>
    </header>

    <div class="flex min-h-0 flex-1 flex-col px-4 py-4">
      <p v-if="pending" class="text-[13px] text-muted">Chargement…</p>

      <ResultsEmptyState
        v-else-if="error"
        title="Conversation introuvable"
        description="Cette conversation n'existe pas ou vous n'y avez pas accès."
        action-label="Retour à mes messages"
        @action="navigateTo('/messages')"
      />

      <FirstContactForm
        v-else-if="showFirstContactForm && conversation"
        :conversation-id="conversation.id"
        :prefill-contact="currentUserContact"
        :provider-name="conversation.otherPartyName"
        @submitted="onFirstContactSubmitted"
      />

      <template v-else>
        <div class="flex-1 space-y-3 overflow-y-auto pb-4">
          <p v-if="messages.length === 0" class="text-center text-[13px] text-muted">
            Aucun message. Écrivez le premier pour démarrer la conversation.
          </p>

          <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="message.senderId === currentUserId ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[75%] rounded-card px-3.5 py-2.5 text-[13.5px]"
              :class="
                message.senderId === currentUserId
                  ? 'bg-dark text-white'
                  : 'border border-hairline bg-surface text-dark'
              "
            >
              <p>{{ message.body }}</p>
              <p class="mt-1 text-[10.5px] opacity-70">{{ formatTime(message.createdAt) }}</p>
            </div>
          </div>
        </div>

        <form class="flex shrink-0 gap-2 border-t border-hairline pt-4" @submit.prevent="sendMessage">
          <input
            v-model="draft"
            type="text"
            placeholder="Écrivez votre message…"
            aria-label="Votre message"
            class="h-[46px] min-w-0 flex-1 rounded-field border-[1.5px] border-hairline px-3.5 text-[14.5px] text-ink outline-none focus:border-primary"
          >
          <button
            type="submit"
            class="press rounded-field bg-primary px-5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!draft.trim() || isSending"
          >
            Envoyer
          </button>
        </form>
        <p v-if="sendError" class="mt-2 shrink-0 text-[12.5px] text-error">{{ sendError }}</p>

        <div v-if="conversation" class="mt-5 shrink-0 overflow-y-auto rounded-card border border-hairline bg-surface p-4">
          <p v-if="alreadyReviewed" class="text-[13px] font-semibold text-dark">
            Merci, votre avis sur cette collaboration a déjà été publié.
          </p>

          <template v-else>
            <p class="mb-3 text-[13.5px] font-semibold text-dark">
              Comment s'est passée votre collaboration avec {{ conversation.otherPartyName }} ?
            </p>

            <div class="mb-3 flex gap-1" role="radiogroup" aria-label="Note de la collaboration">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="press text-2xl leading-none"
                :class="n <= (reviewHoverRating || reviewRating) ? 'text-star' : 'text-hairline'"
                :aria-pressed="n <= reviewRating"
                :aria-label="`${n} étoile(s)`"
                @mouseenter="reviewHoverRating = n"
                @mouseleave="reviewHoverRating = 0"
                @click="setReviewRating(n)"
              >
                ★
              </button>
            </div>

            <textarea
              v-model="reviewComment"
              rows="2"
              placeholder="Commentaire (optionnel)"
              aria-label="Commentaire sur la collaboration"
              class="mb-3 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
            />

            <button
              type="button"
              class="press rounded-field bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="reviewRating < 1 || isSubmittingReview"
              @click="submitReview"
            >
              {{ isSubmittingReview ? 'Publication…' : 'Publier' }}
            </button>
            <p v-if="reviewError" class="mt-2 text-[12.5px] text-error">{{ reviewError }}</p>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
