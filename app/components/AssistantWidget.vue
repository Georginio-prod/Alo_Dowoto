<script setup lang="ts">
/**
 * Assistant IA (#geoloc, 2.1) : widget de chat discret, monté une seule fois
 * au niveau racine (app.vue, même principe que FavoritesMessagingBar.vue)
 * pour apparaître sur toutes les pages. Ne connaît rien du fournisseur IA —
 * appelle uniquement POST /api/assistant/chat, qui gère lui-même le mode
 * dégradé (voir server/api/assistant/chat.post.ts) : ce composant affiche
 * simplement `degraded` tel quel, sans jamais savoir pourquoi.
 */
interface AssistantProvider {
  id: string
  nom: string
  secteur: string
  ville: string
  quartier: string | null
  note: number
  nombreAvis: number
  tarifDepart: number
  distanceKm: number | null
  verifie: boolean
}

interface AssistantToolCall {
  toolName: string
  result: unknown
}

interface ChatResponse {
  degraded: boolean
  text: string
  toolCalls: AssistantToolCall[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  degraded?: boolean
  providers?: AssistantProvider[]
}

const isOpen = ref(false)
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const isSending = ref(false)
const sendError = ref('')
const messageListEl = ref<HTMLElement | null>(null)
const selectedProviderId = ref<string | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (messageListEl.value) messageListEl.value.scrollTop = messageListEl.value.scrollHeight
  })
}

function extractProviders(toolCalls: AssistantToolCall[]): AssistantProvider[] {
  const call = toolCalls.find((entry) => entry.toolName === 'rechercherPrestataires')
  const result = call?.result as { resultats?: AssistantProvider[] } | undefined
  return result?.resultats ?? []
}

async function send() {
  const text = draft.value.trim()
  if (!text || isSending.value) return

  messages.value.push({ role: 'user', text })
  draft.value = ''
  isSending.value = true
  sendError.value = ''
  scrollToBottom()

  try {
    const response = await $fetch<ChatResponse>('/api/assistant/chat', { method: 'POST', body: { message: text } })
    messages.value.push({
      role: 'assistant',
      text: response.text,
      degraded: response.degraded,
      providers: extractProviders(response.toolCalls),
    })
  } catch (error) {
    sendError.value = (error as { statusCode?: number }).statusCode === 429
      ? 'Trop de messages envoyés en peu de temps. Patientez une minute.'
      : "L'assistant est momentanément indisponible. Réessayez dans un instant."
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

function reset() {
  messages.value = []
  sendError.value = ''
}
</script>

<template>
  <div class="fixed bottom-20 right-4 z-50">
    <button
      type="button"
      class="press flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-card-md hover:bg-primary-hover"
      :aria-expanded="isOpen"
      aria-label="Ouvrir l'assistant WorkTogo"
      @click="isOpen = !isOpen"
    >
      <span class="text-2xl" aria-hidden="true">{{ isOpen ? '✕' : '💬' }}</span>
    </button>

    <div
      v-if="isOpen"
      class="animate-[wt-fade_0.2s_ease] absolute bottom-[4.5rem] right-0 flex h-[520px] w-[340px] max-w-[90vw] flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card-lg"
      role="dialog"
      aria-label="Assistant WorkTogo"
    >
      <header class="flex shrink-0 items-center justify-between border-b border-hairline bg-dark px-4 py-3">
        <div>
          <p class="text-[13.5px] font-bold text-white">Assistant WorkTogo</p>
          <p class="text-[11px] text-white/70">Réponses générées par IA, pas par un humain</p>
        </div>
        <button v-if="messages.length" type="button" class="press text-[11px] font-semibold text-white/70 underline" @click="reset">
          Effacer
        </button>
      </header>

      <div ref="messageListEl" class="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
        <div v-if="messages.length === 0" class="rounded-card border border-dashed border-hairline p-3 text-center text-[12.5px] text-muted">
          Posez une question sur WorkTogo, ou demandez « Je cherche un plombier à Bè » : je cherche parmi les vrais prestataires inscrits.
        </div>

        <div v-for="(message, index) in messages" :key="index" class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
          <div
            class="animate-[wt-fade_0.25s_ease] max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px]"
            :class="message.role === 'user' ? 'rounded-br-md bg-dark text-white' : 'rounded-bl-md border border-hairline bg-bg text-dark'"
          >
            <p v-if="message.degraded" class="mb-1 text-[11px] font-semibold text-error">Mode dégradé — assistant IA indisponible</p>
            <p class="whitespace-pre-line">{{ message.text }}</p>

            <div v-if="message.providers?.length" class="mt-2 space-y-1.5">
              <NuxtLink
                v-for="provider in message.providers"
                :key="provider.id"
                to="/resultats"
                class="press block rounded-field border border-hairline bg-surface px-2.5 py-2 hover:border-primary/40"
                @click="selectedProviderId = provider.id"
              >
                <p class="text-[12.5px] font-bold text-dark">
                  {{ provider.nom }}
                  <span v-if="provider.verifie" class="text-primary">✓</span>
                </p>
                <p class="text-[11px] text-muted">
                  {{ provider.secteur }} · {{ provider.ville }}
                  <span v-if="provider.distanceKm !== null"> · à {{ provider.distanceKm }} km</span>
                  · {{ provider.note.toFixed(1) }}★
                </p>
              </NuxtLink>
            </div>
          </div>
        </div>

        <p v-if="isSending" class="text-[12px] text-muted">L'assistant réfléchit…</p>
        <p v-if="sendError" class="text-[12px] text-error">{{ sendError }}</p>
      </div>

      <form class="flex shrink-0 gap-2 border-t border-hairline p-2.5" @submit.prevent="send">
        <input
          v-model="draft"
          type="text"
          placeholder="Écrivez votre question…"
          aria-label="Votre question à l'assistant"
          class="h-[40px] min-w-0 flex-1 rounded-field border-[1.5px] border-hairline px-3 text-[13px] text-ink outline-none focus:border-primary"
        >
        <button
          type="submit"
          class="press rounded-field bg-primary px-3.5 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!draft.trim() || isSending"
        >
          Envoyer
        </button>
      </form>
      <p class="shrink-0 border-t border-hairline px-3 py-2 text-center text-[10.5px] text-muted">
        Besoin d'un humain ?
        <NuxtLink to="/contact" class="font-semibold text-primary underline">Contactez le support</NuxtLink>
      </p>
    </div>

    <ProviderProfileModal v-if="selectedProviderId" :provider-id="selectedProviderId" @close="selectedProviderId = null" />
  </div>
</template>
