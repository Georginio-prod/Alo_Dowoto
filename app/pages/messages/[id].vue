<script setup lang="ts">
import type { ConversationSummary, Message } from '~~/server/utils/conversationStore'
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'
import type { RecurringService } from '~~/server/utils/recurringServiceStore'

interface MessagesResponse {
  conversation: ConversationSummary
  messages: Message[]
  escrowOrder: EscrowOrder | null
  recurringService: RecurringService | null
  awaitingPayment: boolean
}

definePageMeta({ layout: 'messages', middleware: 'auth' })

const { t } = useI18n({ useScope: 'global' })
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

// Paiement en séquestre obligatoire avant transmission au prestataire (#194,
// epic #191) : tant que la commande n'est pas payée, le chercheur voit une
// invite de paiement (au lieu du fil) et le prestataire un message d'attente
// (le serveur ne renvoie d'ailleurs aucun contenu de message dans ce cas,
// voir messages.get.ts — cette page ne fait que refléter cet état).
const escrowOrder = computed(() => data.value?.escrowOrder ?? null)
const recurringService = computed(() => data.value?.recurringService ?? null)
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
        ? t('messageThreadPage.errorInsufficientBalance')
        : t('messageThreadPage.errorPaymentFailed')
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

// Service récurrent (#271) : logique de mutation possédée par
// RecurringServicePanel.vue, cette page ne fait que rafraîchir ses données
// quand le composant émet `changed`.
function onRecurringServiceChanged() {
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

// Composeur (auto-agrandissement, envoi) possédé par MessageComposer.vue et
// fil (regroupement par jour, suggestions de démarrage, défilement) possédé
// par MessageThread.vue — extraits pour rester sous la limite de lignes par
// fichier, sur le même principe que MessageBubble.vue/EscrowStatusPanel.vue.
// `composerRef` permet uniquement aux suggestions du fil vide de préremplir
// le champ de saisie du composeur.
const composerRef = ref<{ focusWithText: (text: string) => void } | null>(null)

function onSuggestionPicked(text: string) {
  composerRef.value?.focusWithText(text)
}

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
      reviewError.value = t('messageThreadPage.errorReviewFailed')
    }
  } finally {
    isSubmittingReview.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="relative flex shrink-0 items-center gap-3 overflow-hidden border-b border-hairline bg-surface px-4 py-3">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent" />

      <NuxtLink to="/messages" class="press z-10 text-lg text-muted sm:hidden" :aria-label="t('messageThreadPage.backAria')">←</NuxtLink>

      <template v-if="conversation">
        <ConversationAvatar :name="conversation.otherPartyName" :seed="conversation.id" size="sm" ring class="z-10" />
        <div class="z-10 min-w-0">
          <div class="truncate text-[14.5px] font-bold text-dark">{{ conversation.otherPartyName }}</div>
          <div v-if="conversation.otherPartySector" class="truncate text-[12px] text-muted">
            {{ conversation.otherPartySector }}
          </div>
        </div>
      </template>
    </header>

    <div class="flex min-h-0 flex-1 flex-col px-4 py-4">
      <p v-if="pending" class="text-[13px] text-muted">{{ t('messageThreadPage.loading') }}</p>

      <ResultsEmptyState
        v-else-if="error"
        :title="t('messageThreadPage.notFoundTitle')"
        :description="t('messageThreadPage.notFoundDescription')"
        :action-label="t('messageThreadPage.backToMessages')"
        @action="navigateTo('/messages')"
      />

      <FirstContactForm
        v-else-if="showFirstContactForm && conversation"
        :conversation-id="conversation.id"
        :prefill-contact="currentUserContact"
        :provider-name="conversation.otherPartyName"
        :sector-slug="conversation.sectorSlug"
        @submitted="onFirstContactSubmitted"
      />

      <div v-else-if="showPaymentPrompt" class="rounded-card border border-hairline bg-surface p-5">
        <p class="text-[14.5px] font-semibold text-dark">{{ t('messageThreadPage.paymentRequiredTitle') }}</p>
        <p class="mt-1 text-[13px] text-muted">
          {{ t('messageThreadPage.paymentRequiredText', { name: conversation?.otherPartyName }) }}
        </p>
        <p class="mt-3 text-[18px] font-bold text-dark">{{ escrowOrder?.amount.toLocaleString('fr-FR') }} F CFA</p>
        <button
          type="button"
          class="press mt-3 rounded-field bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isPaying"
          @click="handlePayEscrowOrder"
        >
          {{ isPaying ? t('messageThreadPage.paying') : t('messageThreadPage.payCta') }}
        </button>
        <p v-if="payError" class="mt-2 text-[12.5px] text-error">{{ payError }}</p>
      </div>

      <div v-else-if="showAwaitingPaymentNotice" class="rounded-card border border-hairline bg-surface p-5 text-center">
        <p class="text-[14.5px] font-semibold text-dark">{{ t('messageThreadPage.awaitingPaymentTitle') }}</p>
        <p class="mt-1 text-[13px] text-muted">
          {{ t('messageThreadPage.awaitingPaymentText') }}
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

        <RecurringServicePanel
          v-if="isViewerClient"
          :recurring-service="recurringService"
          :conversation-id="conversationId"
          @changed="onRecurringServiceChanged"
        />

        <MessageThread
          :messages="messages"
          :conversation="conversation"
          :conversation-id="conversationId"
          :current-user-id="currentUserId"
          :is-viewer-provider="isViewerProvider"
          :is-viewer-client="isViewerClient"
          @changed="onMessageActionChanged"
          @suggestion-picked="onSuggestionPicked"
        />

        <MessageComposer ref="composerRef" :conversation-id="conversationId" @sent="onMessageActionChanged" />

        <div
          v-if="conversation && escrowOrder?.status === 'released'"
          class="relative mt-5 shrink-0 overflow-hidden rounded-card border border-hairline bg-surface p-4"
        >
          <div class="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-star/10 blur-2xl" />

          <p v-if="alreadyReviewed" class="flex items-center gap-2 text-[13px] font-semibold text-dark">
            <span class="text-star">★</span> {{ t('messageThreadPage.alreadyReviewed') }}
          </p>

          <template v-else>
            <p class="mb-3 text-[13.5px] font-semibold text-dark">
              {{ t('messageThreadPage.reviewPrompt', { name: conversation.otherPartyName }) }}
            </p>

            <div class="mb-3 flex gap-1.5" role="radiogroup" :aria-label="t('messageThreadPage.reviewRatingAriaLabel')">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="press text-[26px] leading-none transition-transform hover:scale-110"
                :class="n <= (reviewHoverRating || reviewRating) ? 'text-star' : 'text-hairline'"
                :aria-pressed="n <= reviewRating"
                :aria-label="t('messageThreadPage.starAriaLabel', { n })"
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
              :placeholder="t('messageThreadPage.reviewCommentPlaceholder')"
              :aria-label="t('messageThreadPage.reviewCommentAria')"
              class="mb-3 w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
            />

            <button
              type="button"
              class="press rounded-field bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="reviewRating < 1 || isSubmittingReview"
              @click="submitReview"
            >
              {{ isSubmittingReview ? t('messageThreadPage.publishing') : t('messageThreadPage.publish') }}
            </button>
            <p v-if="reviewError" class="mt-2 text-[12.5px] text-error">{{ reviewError }}</p>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
