<script setup lang="ts">
import type { ConversationSummary, Message } from '~~/server/utils/conversationStore'
import type { User } from '~~/server/utils/userStore'

interface MessagesResponse {
  conversation: ConversationSummary
  messages: Message[]
}

definePageMeta({ layout: 'blank' })

const route = useRoute()
const conversationId = computed(() => String(route.params.id))

const { data, pending, error, refresh } = await useFetch<MessagesResponse>(
  () => `/api/conversations/${conversationId.value}/messages`,
)
// Nécessaire côté client pour savoir quels messages sont "les miens" (alignement
// des bulles) : aucun composable de session n'existe encore ailleurs dans
// l'app (l'écran d'auth #21/#23 est encore simulé côté front), on interroge
// donc directement la route de session existante (#24).
const { data: sessionData } = await useFetch<{ user: User }>('/api/auth/session')

const conversation = computed(() => data.value?.conversation ?? null)
const messages = computed(() => data.value?.messages ?? [])
const currentUserId = computed(() => sessionData.value?.user?.id ?? '')

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
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[720px] items-center gap-3 px-5 py-4">
        <NuxtLink to="/messages" class="press text-sm text-muted">← Retour</NuxtLink>

        <template v-if="conversation">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
          >
            <span class="rounded-pill bg-black/40 px-1 py-0.5 text-[7px] font-semibold text-white">photo</span>
          </div>
          <div class="min-w-0">
            <div class="truncate text-[14.5px] font-bold text-dark">{{ conversation.otherPartyName }}</div>
            <div v-if="conversation.otherPartySector" class="truncate text-[12px] text-muted">
              {{ conversation.otherPartySector }}
            </div>
          </div>
        </template>
      </div>
    </header>

    <div class="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 py-6">
      <p v-if="pending" class="text-[13px] text-muted">Chargement…</p>

      <ResultsEmptyState
        v-else-if="error"
        title="Conversation introuvable"
        description="Cette conversation n'existe pas ou vous n'y avez pas accès."
        action-label="Retour à mes messages"
        @action="navigateTo('/messages')"
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

        <form class="flex gap-2 border-t border-hairline pt-4" @submit.prevent="sendMessage">
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
        <p v-if="sendError" class="mt-2 text-[12.5px] text-error">{{ sendError }}</p>

        <div v-if="conversation" class="mt-5 rounded-card border border-hairline bg-surface p-4">
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
