<script setup lang="ts">
/**
 * Accueil à l'inscription (#tutoriel-onboarding — Couche 1, « la promesse »).
 *
 * 3 écrans role-aware, pas un de plus : une animation + une phrase courte + un
 * sous-titre d'une ligne. Ne décrit pas l'app, il rassure. « Passer » toujours
 * visible en haut à droite ; points de progression ; à la fin, deux boutons
 * (lancer le tutoriel complet / plus tard). Rien n'est perdu si l'utilisateur
 * passe : le parent affiche alors un bandeau de rappel discret.
 *
 * Animations en CSS/SVG (transform + opacity uniquement), neutralisées si le
 * système demande « réduire les animations ». Le texte est toujours rendu
 * immédiatement ; l'animation est décorative et dirige le regard.
 */
const props = defineProps<{ role?: string }>()
const emit = defineEmits<{ complete: []; postpone: [] }>()

const { t, locale } = useI18n({ useScope: 'global' })
const { track } = useAnalytics()

type ScreenIcon = 'locate' | 'shield' | 'check'
const base = computed(() => (props.role === 'prestataire' ? 'onboarding.provider' : 'onboarding.client'))
const icons: ScreenIcon[] = ['locate', 'shield', 'check']
const screens = computed(() =>
  [0, 1, 2].map((i) => ({
    title: t(`${base.value}.s${i + 1}.title`),
    subtitle: t(`${base.value}.s${i + 1}.subtitle`),
    icon: icons[i] as ScreenIcon,
  })),
)

const step = ref(0)
const isLast = computed(() => step.value === screens.value.length - 1)
// Écran courant garanti défini (step reste borné à l'index des 3 écrans).
const current = computed(() => screens.value[step.value] ?? screens.value[0]!)

// Narration vocale (#tutoriel-onboarding — Partie F) : bouton haut-parleur avec
// état mémorisé ; lecture automatique du contenu à chaque écran quand elle est active.
const { enabled: speechEnabled, supported: speechSupported, load: loadSpeech, speak: speakText, stop: stopSpeech, toggle: toggleSpeech } = useSpeech()
const speechLang = computed(() => (locale.value === 'en' ? 'en-US' : 'fr-FR'))
function narrateCurrent() {
  speakText(`${current.value.title}. ${current.value.subtitle}`, speechLang.value)
}
function onToggleSpeech() {
  toggleSpeech()
  track('tutorial_audio', { enabled: speechEnabled.value, where: 'welcome' })
  if (speechEnabled.value) narrateCurrent()
}
function onComplete() {
  track('welcome_complete')
  emit('complete')
}
function onPostpone() {
  track('welcome_abandon', { step: step.value + 1 })
  emit('postpone')
}
onMounted(() => {
  loadSpeech()
  track('welcome_open')
  if (speechEnabled.value) narrateCurrent()
})
watch(step, () => {
  track('welcome_step', { step: step.value + 1 })
  if (speechEnabled.value) narrateCurrent()
})
onBeforeUnmount(() => stopSpeech())

function next() {
  if (isLast.value) onComplete()
  else step.value += 1
}
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex flex-col bg-surface"
    role="dialog"
    aria-modal="true"
    :aria-label="t('onboarding.ariaLabel')"
  >
    <!-- Barre haute : haut-parleur (si supporté) à gauche, « Passer » toujours visible à droite. -->
    <div class="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <button
        v-if="speechSupported"
        type="button"
        class="press grid size-10 place-items-center rounded-full text-muted hover:text-dark"
        :aria-label="speechEnabled ? t('speech.off') : t('speech.on')"
        :aria-pressed="speechEnabled"
        @click="onToggleSpeech"
      >
        <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" :fill="speechEnabled ? 'currentColor' : 'none'" :fill-opacity="speechEnabled ? '0.12' : '0'" />
          <template v-if="speechEnabled"><path d="M16 8.5a4 4 0 0 1 0 7" /></template>
          <template v-else><path d="M22 9l-4 6M18 9l4 6" /></template>
        </svg>
      </button>
      <span v-else aria-hidden="true" />
      <button
        type="button"
        class="press rounded-pill px-4 py-2 text-sm font-semibold text-muted hover:text-dark"
        @click="onPostpone"
      >
        {{ t('onboarding.skip') }}
      </button>
    </div>

    <!-- Contenu : illustration + titre + sous-titre. Transition glissement + fondu. -->
    <div class="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <Transition name="ob-slide" mode="out-in">
        <div :key="step" class="flex flex-col items-center">
          <div class="ob-illus mb-8 text-primary" aria-hidden="true">
            <!-- Localisation : trouver un pro près de chez soi. -->
            <svg v-if="current.icon === 'locate'" viewBox="0 0 120 120" class="size-40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle class="ob-ring" cx="60" cy="52" r="26" opacity="0.5" />
              <circle class="ob-ring ob-ring-2" cx="60" cy="52" r="26" opacity="0.3" />
              <path d="M60 30a18 18 0 0 0-18 18c0 13 18 30 18 30s18-17 18-30a18 18 0 0 0-18-18z" fill="currentColor" fill-opacity="0.12" />
              <circle cx="60" cy="48" r="7" fill="currentColor" fill-opacity="0.25" />
              <path class="ob-float" d="M40 92h40" stroke-opacity="0.4" />
            </svg>
            <!-- Bouclier + cadenas : argent bloqué en sécurité. -->
            <svg v-else-if="current.icon === 'shield'" viewBox="0 0 120 120" class="size-40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path class="ob-float" d="M60 22 30 34v22c0 20 13 34 30 42 17-8 30-22 30-42V34L60 22z" fill="currentColor" fill-opacity="0.1" />
              <rect x="49" y="56" width="22" height="18" rx="3" fill="currentColor" fill-opacity="0.2" />
              <path d="M53 56v-5a7 7 0 0 1 14 0v5" />
              <circle class="ob-pulse" cx="60" cy="65" r="3.2" fill="currentColor" stroke="none" />
            </svg>
            <!-- Validation : vous validez, il est payé. -->
            <svg v-else viewBox="0 0 120 120" class="size-40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="60" cy="60" r="34" fill="currentColor" fill-opacity="0.1" />
              <path class="ob-check" d="M44 61l11 11 22-24" stroke-width="5" />
              <circle class="ob-coin" cx="88" cy="40" r="8" fill="currentColor" fill-opacity="0.25" />
            </svg>
          </div>
          <h2 class="text-2xl font-extrabold leading-tight text-dark">{{ current.title }}</h2>
          <p class="mt-3 max-w-xs text-base leading-relaxed text-muted">{{ current.subtitle }}</p>
        </div>
      </Transition>
    </div>

    <!-- Annonce du changement d'étape aux lecteurs d'écran. -->
    <p class="sr-only" aria-live="polite">{{ t('onboarding.stepStatus', { current: step + 1, total: screens.length }) }}</p>

    <!-- Bas : points de progression + actions. -->
    <div class="px-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div class="mb-6 flex items-center justify-center gap-2" aria-hidden="true">
        <span
          v-for="(s, i) in screens"
          :key="i"
          class="h-2 rounded-pill transition-all duration-300"
          :class="i === step ? 'w-6 bg-primary' : 'w-2 bg-hairline'"
        />
      </div>

      <template v-if="isLast">
        <button
          type="button"
          class="press mb-3 w-full rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover"
          @click="onComplete"
        >
          {{ t('onboarding.startTutorial') }}
        </button>
        <button
          type="button"
          class="press w-full rounded-pill py-3 text-base font-semibold text-muted hover:text-dark"
          @click="onPostpone"
        >
          {{ t('onboarding.later') }}
        </button>
      </template>
      <button
        v-else
        type="button"
        class="press w-full rounded-pill bg-primary py-3.5 text-base font-bold text-white hover:bg-primary-hover"
        @click="next"
      >
        {{ t('onboarding.next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Transition entre deux étapes : glissement horizontal + fondu, 300 ms. */
.ob-slide-enter-active,
.ob-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.05, 0.7, 0.1, 1), opacity 0.3s ease;
}
.ob-slide-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.ob-slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

/* Boucles décoratives : anneaux de localisation, flottement, pulsation, tracé. */
.ob-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: ob-ping 1.8s ease-out infinite;
}
.ob-ring-2 {
  animation-delay: 0.9s;
}
@keyframes ob-ping {
  0% { transform: scale(0.7); opacity: 0.5; }
  80%, 100% { transform: scale(1.25); opacity: 0; }
}
.ob-float {
  transform-box: fill-box;
  transform-origin: center;
  animation: ob-float 3.2s ease-in-out infinite;
}
@keyframes ob-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.ob-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: ob-pulse 1.6s ease-out infinite;
}
@keyframes ob-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}
.ob-coin {
  transform-box: fill-box;
  transform-origin: center;
  animation: ob-float 3.6s ease-in-out infinite;
}
.ob-check {
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  animation: ob-draw 0.7s cubic-bezier(0.05, 0.7, 0.1, 1) 0.15s forwards;
}
@keyframes ob-draw {
  to { stroke-dashoffset: 0; }
}

/* « Réduire les animations » : plus aucune boucle ni tracé, la coche reste tracée. */
@media (prefers-reduced-motion: reduce) {
  .ob-slide-enter-active,
  .ob-slide-leave-active { transition: opacity 0.1s ease; }
  .ob-slide-enter-from,
  .ob-slide-leave-to { transform: none; }
  .ob-ring,
  .ob-ring-2,
  .ob-float,
  .ob-pulse,
  .ob-coin { animation: none; }
  .ob-check { stroke-dashoffset: 0; animation: none; }
}
</style>
