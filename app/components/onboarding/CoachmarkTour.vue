<script setup lang="ts">
/**
 * Moteur de tutoriels contextuels — coach marks (#tutoriel-onboarding — Couche 2).
 *
 * Superpose au vrai écran : un masque sombre (65 %) troué autour de l'élément
 * ciblé (rayon 8 px, marge 12 px), un halo pulsé, et une bulle d'explication
 * (une phrase) qui se place automatiquement au-dessus ou en dessous de la cible
 * sans sortir de l'écran. « Suivant » avance, « Passer » quitte à tout moment.
 *
 * Cibles désignées par sélecteur CSS (`[data-tour="…"]`). Le halo et la bulle
 * n'animent que transform/opacity ; sous « réduire les animations » le halo ne
 * pulse plus et les transitions deviennent de simples fondus.
 */
interface CoachStep {
  /** Sélecteur CSS de l'élément à mettre en évidence. */
  target: string
  title: string
  text: string
}

const props = defineProps<{ steps: CoachStep[] }>()
const emit = defineEmits<{ finish: []; skip: [] }>()

const { t, locale } = useI18n({ useScope: 'global' })

const PAD = 12
const index = ref(0)
const rect = reactive({ top: 0, left: 0, width: 0, height: 0, ready: false })
const viewport = reactive({ w: 0, h: 0 })

const currentStep = computed(() => props.steps[index.value] ?? props.steps[0]!)
const isLast = computed(() => index.value === props.steps.length - 1)

const nextBtn = ref<HTMLButtonElement | null>(null)

// Narration vocale (#tutoriel-onboarding — Partie F).
const { enabled: speechEnabled, supported: speechSupported, load: loadSpeech, speak: speakText, stop: stopSpeech, toggle: toggleSpeech } = useSpeech()
const speechLang = computed(() => (locale.value === 'en' ? 'en-US' : 'fr-FR'))
function narrateCurrent() {
  speakText(`${currentStep.value.title}. ${currentStep.value.text}`, speechLang.value)
}
function onToggleSpeech() {
  toggleSpeech()
  if (speechEnabled.value) narrateCurrent()
}

function findTarget(): HTMLElement | null {
  const step = props.steps[index.value]
  if (!step || !import.meta.client) return null
  return document.querySelector<HTMLElement>(step.target)
}

function measure() {
  if (!import.meta.client) return
  viewport.w = window.innerWidth
  viewport.h = window.innerHeight
  const el = findTarget()
  if (!el) {
    rect.ready = false
    return
  }
  const r = el.getBoundingClientRect()
  rect.top = r.top
  rect.left = r.left
  rect.width = r.width
  rect.height = r.height
  rect.ready = true
}

/** Amène la cible à l'écran puis mesure (deux frames pour laisser le scroll poser). */
function focusStep() {
  const el = findTarget()
  if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' })
  requestAnimationFrame(() => {
    measure()
    requestAnimationFrame(measure)
  })
}

// Géométrie du trou : rectangle de la cible élargi de PAD sur chaque côté.
const spotlight = computed(() => ({
  top: rect.top - PAD,
  left: rect.left - PAD,
  width: rect.width + PAD * 2,
  height: rect.height + PAD * 2,
}))

const spotlightStyle = computed(() => ({
  top: `${spotlight.value.top}px`,
  left: `${spotlight.value.left}px`,
  width: `${spotlight.value.width}px`,
  height: `${spotlight.value.height}px`,
}))

// Bulle : au-dessus ou en dessous selon la place, jamais hors écran.
const bubbleStyle = computed(() => {
  const width = Math.min(viewport.w - 32, 340)
  const centerX = spotlight.value.left + spotlight.value.width / 2
  const left = Math.max(16, Math.min(centerX - width / 2, viewport.w - width - 16))
  const spaceBelow = viewport.h - (spotlight.value.top + spotlight.value.height)
  const placeBelow = spaceBelow >= 180 || spaceBelow >= spotlight.value.top
  const base: Record<string, string> = { width: `${width}px`, left: `${left}px` }
  if (placeBelow) base.top = `${spotlight.value.top + spotlight.value.height + 12}px`
  else base.bottom = `${viewport.h - spotlight.value.top + 12}px`
  return base
})

function next() {
  if (isLast.value) {
    emit('finish')
    return
  }
  index.value += 1
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('skip')
}

let rafId = 0
function onReposition() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(measure)
}

watch(index, () => {
  rect.ready = false
  focusStep()
  nextTick(() => nextBtn.value?.focus())
  if (speechEnabled.value) narrateCurrent()
})

onMounted(() => {
  if (!import.meta.client) return
  loadSpeech()
  focusStep()
  nextTick(() => nextBtn.value?.focus())
  if (speechEnabled.value) narrateCurrent()
  window.addEventListener('resize', onReposition, { passive: true })
  window.addEventListener('scroll', onReposition, { passive: true, capture: true })
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  stopSpeech()
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, { capture: true } as EventListenerOptions)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="fixed inset-0 z-[70]"
    role="dialog"
    aria-modal="true"
    :aria-label="t('coachmark.ariaLabel')"
  >
    <template v-if="rect.ready">
      <!-- Masque sombre troué : l'ombre portée immense assombrit tout sauf le trou. -->
      <div class="cm-spotlight pointer-events-none absolute rounded-lg" :style="spotlightStyle" />
      <!-- Halo pulsé autour de la zone. -->
      <div class="cm-halo pointer-events-none absolute rounded-lg" :style="spotlightStyle" />
    </template>
    <!-- Repli si la cible est introuvable : un voile plein pour garder le focus. -->
    <div v-else class="absolute inset-0 bg-[rgba(15,35,24,0.65)]" />

    <!-- Bulle d'explication. -->
    <Transition name="cm-bubble">
      <div
        :key="index"
        class="absolute rounded-card bg-surface p-4 shadow-card-lg"
        :style="rect.ready ? bubbleStyle : { left: '16px', right: '16px', bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }"
      >
        <p class="mb-1 text-xs font-semibold text-primary">{{ t('coachmark.stepStatus', { current: index + 1, total: steps.length }) }}</p>
        <h3 class="text-base font-bold text-dark">{{ currentStep.title }}</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted" aria-live="polite">{{ currentStep.text }}</p>
        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-1">
            <button
              v-if="speechSupported"
              type="button"
              class="press grid size-9 place-items-center rounded-full text-muted hover:text-dark"
              :aria-label="speechEnabled ? t('speech.off') : t('speech.on')"
              :aria-pressed="speechEnabled"
              @click="onToggleSpeech"
            >
              <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" :fill="speechEnabled ? 'currentColor' : 'none'" :fill-opacity="speechEnabled ? '0.12' : '0'" />
                <template v-if="speechEnabled"><path d="M16 8.5a4 4 0 0 1 0 7" /></template>
                <template v-else><path d="M22 9l-4 6M18 9l4 6" /></template>
              </svg>
            </button>
            <button
              type="button"
              class="press rounded-pill px-3 py-2 text-sm font-semibold text-muted hover:text-dark"
              @click="emit('skip')"
            >
              {{ t('coachmark.skip') }}
            </button>
          </div>
          <button
            ref="nextBtn"
            type="button"
            class="press rounded-pill bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
            @click="next"
          >
            {{ isLast ? t('coachmark.done') : t('coachmark.next') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cm-spotlight {
  box-shadow: 0 0 0 100vmax rgba(15, 35, 24, 0.65);
}
.cm-halo {
  border: 2px solid var(--color-primary);
  transform-box: border-box;
  transform-origin: center;
  animation: cm-pulse 1.6s ease-out infinite;
}
@keyframes cm-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.12); opacity: 0; }
}
.cm-bubble-enter-active,
.cm-bubble-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.05, 0.7, 0.1, 1);
}
.cm-bubble-enter-from,
.cm-bubble-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
@media (prefers-reduced-motion: reduce) {
  .cm-halo { animation: none; opacity: 0.6; }
  .cm-bubble-enter-active,
  .cm-bubble-leave-active { transition: opacity 0.1s ease; }
  .cm-bubble-enter-from,
  .cm-bubble-leave-to { transform: none; }
}
</style>
