<script setup lang="ts">
import type { ConversationSummary, Message } from '~~/server/utils/conversationStore'
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

interface MessagesResponse {
  conversation: ConversationSummary
  messages: Message[]
  escrowOrder: EscrowOrder | null
  awaitingPayment: boolean
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

// Défilement automatique vers le dernier message (chargement initial, envoi,
// ou nouveau message automatique WorkTogo) : le fil vit dans un conteneur
// `overflow-y-auto` propre, sans quoi un message ajouté après coup (ex. la
// confirmation du prestataire, la demande de localisation) reste invisible
// sous le pli tant que le lecteur ne scrolle pas manuellement. `onMounted`
// gère la position initiale (les données sont déjà résolues via SSR à ce
// stade, donc le `watch` seul — dont le premier déclenchement `immediate`
// tombe pendant `setup()`, avant que la ref du template ne soit attachée —
// ne suffit pas à positionner le scroll au premier rendu).
const messageListEl = ref<HTMLElement | null>(null)
function scrollMessagesToBottom() {
  if (messageListEl.value) messageListEl.value.scrollTop = messageListEl.value.scrollHeight
}
onMounted(async () => {
  await nextTick()
  scrollMessagesToBottom()
})
watch(() => messages.value.length, async () => {
  await nextTick()
  scrollMessagesToBottom()
})

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

// Paiement en séquestre obligatoire avant transmission au prestataire (#194,
// epic #191) : tant que la commande n'est pas payée, le chercheur voit une
// invite de paiement (au lieu du fil) et le prestataire un message d'attente
// (le serveur ne renvoie d'ailleurs aucun contenu de message dans ce cas,
// voir messages.get.ts — cette page ne fait que refléter cet état).
const escrowOrder = computed(() => data.value?.escrowOrder ?? null)
const isViewerClient = computed(() => conversation.value?.clientId === currentUserId.value)
const isViewerProvider = computed(() => conversation.value?.providerId === currentUserId.value)
const showPaymentPrompt = computed(
  () => isViewerClient.value && escrowOrder.value?.status === 'awaiting_payment',
)
const showAwaitingPaymentNotice = computed(() => data.value?.awaitingPayment === true && !isViewerClient.value)

const isPaying = ref(false)
const payError = ref('')

async function handlePayEscrowOrder() {
  if (isPaying.value) return
  isPaying.value = true
  payError.value = ''
  try {
    await $fetch(`/api/conversations/${conversationId.value}/pay`, { method: 'POST' })
    await refresh()
    refreshConversationList()
  } catch (fetchError) {
    payError.value =
      (fetchError as { statusCode?: number }).statusCode === 402
        ? 'Solde insuffisant. Rechargez votre portefeuille WorkTogo puis réessayez.'
        : "Le paiement n'a pas pu être effectué. Réessayez."
  } finally {
    isPaying.value = false
  }
}

// Double validation avant libération des fonds (#195, epic #191) : la
// logique de mutation vit dans EscrowStatusPanel.vue, cette page ne fait que
// rafraîchir ses données quand le composant émet `changed`.
function onEscrowStatusChanged() {
  refresh()
}

// Confirmation de prise en charge et partage de localisation
// (#hub-messages-automatiques) : logique de mutation possédée par
// MessageBubble.vue (comme EscrowStatusPanel.vue pour le séquestre), cette
// page ne fait que rafraîchir le fil quand le composant émet `changed`.
function onMessageActionChanged() {
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

// Reprendre ce prestataire (#266, rebooking rapide) : disponible côté
// chercheur une fois la précédente commande terminée (released) ou annulée
// (refunded) — voir la logique correspondante dans createEscrowOrder,
// server/utils/escrowOrderStore.ts. Formulaire possédé par RebookPrompt.vue
// (comme EscrowStatusPanel.vue pour le séquestre), cette page ne fait que
// rafraîchir ses données quand le composant émet `changed`.
const canRebook = computed(
  () => isViewerClient.value && (escrowOrder.value?.status === 'released' || escrowOrder.value?.status === 'refunded'),
)

function onRebookChanged() {
  refresh()
  refreshConversationList()
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

      <div v-else-if="showPaymentPrompt" class="rounded-card border border-hairline bg-surface p-5">
        <p class="text-[14.5px] font-semibold text-dark">Paiement sécurisé requis</p>
        <p class="mt-1 text-[13px] text-muted">
          Votre demande ne sera transmise à {{ conversation?.otherPartyName }} qu'une fois le paiement confirmé.
          Les fonds restent en séquestre WorkTogo jusqu'à la fin de la prestation.
        </p>
        <p class="mt-3 text-[18px] font-bold text-dark">{{ escrowOrder?.amount.toLocaleString('fr-FR') }} F CFA</p>
        <button
          type="button"
          class="press mt-3 rounded-field bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isPaying"
          @click="handlePayEscrowOrder"
        >
          {{ isPaying ? 'Paiement…' : 'Payer et transmettre ma demande' }}
        </button>
        <p v-if="payError" class="mt-2 text-[12.5px] text-error">{{ payError }}</p>
      </div>

      <div v-else-if="showAwaitingPaymentNotice" class="rounded-card border border-hairline bg-surface p-5 text-center">
        <p class="text-[14.5px] font-semibold text-dark">En attente du paiement du chercheur</p>
        <p class="mt-1 text-[13px] text-muted">
          Le détail de cette demande vous sera transmis dès que le paiement sera confirmé côté chercheur.
        </p>
      </div>

      <template v-else>
        <EscrowStatusPanel
          v-if="escrowOrder && escrowOrder.status !== 'awaiting_payment'"
          :escrow-order="escrowOrder"
          :conversation-id="conversationId"
          :is-viewer-client="isViewerClient"
          :is-viewer-provider="isViewerProvider"
          @changed="onEscrowStatusChanged"
        />

        <RebookPrompt
          v-if="canRebook"
          :conversation-id="conversationId"
          :provider-name="conversation?.otherPartyName ?? ''"
          @changed="onRebookChanged"
        />

        <div ref="messageListEl" class="flex-1 space-y-3 overflow-y-auto pb-4">
          <p v-if="messages.length === 0" class="text-center text-[13px] text-muted">
            Aucun message. Écrivez le premier pour démarrer la conversation.
          </p>

          <MessageBubble
            v-for="message in messages"
            :key="message.id"
            :message="message"
            :conversation-id="conversationId"
            :current-user-id="currentUserId"
            :is-viewer-provider="isViewerProvider"
            :is-viewer-client="isViewerClient"
            @changed="onMessageActionChanged"
          />
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
