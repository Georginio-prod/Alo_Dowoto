<script setup lang="ts">
/**
 * Fond de l'écran d'accueil (partie B du cahier des charges).
 *
 * Trois couches, du fond vers l'avant :
 *   1. Poster fixe (peint immédiatement, jamais de rectangle noir).
 *   2. Vidéo en boucle muette qui apparaît en fondu de 400 ms une fois prête.
 *   3. Dégradé sombre bas→haut + voile uni 20 % pour garantir le contraste du
 *      texte posé par-dessus, quelle que soit l'image la plus claire.
 *
 * Repli automatique sur le poster seul — animé d'un lent zoom aller-retour —
 * sans jamais bloquer l'écran, dans tous ces cas : réglage « Réduire les
 * animations », mode économie d'énergie / données, appareil peu puissant, ou
 * échec de décodage de la vidéo. Le média est purement décoratif : marqué
 * aria-hidden, ignoré des lecteurs d'écran.
 */
withDefaults(
  defineProps<{
    /** Vidéo embarquée dans l'APK (fournie séparément — voir le rapport final). */
    videoSrc?: string
    posterSrc?: string
  }>(),
  {
    videoSrc: '/onboarding/welcome.mp4',
    posterSrc: '/onboarding/welcome-poster.svg',
  },
)

const video = ref<HTMLVideoElement | null>(null)
const videoReady = ref(false)
// Repli sur image fixe animée : vrai tant qu'on n'a pas décidé de jouer la vidéo.
const staticFallback = ref(true)

let cleanup: Array<() => void> = []

/** Heuristique « appareil peu puissant / économie d'énergie / données ». */
function prefersLightweight(): boolean {
  if (!import.meta.client) return true
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const reduceData = window.matchMedia?.('(prefers-reduced-data: reduce)').matches
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean }
    deviceMemory?: number
  }
  const saveData = nav.connection?.saveData === true
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2
  return Boolean(reduceMotion || reduceData || saveData || lowMemory)
}

/** Batterie faible et hors charge → on épargne le décodage vidéo (éco-énergie). */
async function batteryWantsLightweight(): Promise<boolean> {
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number; charging: boolean }>
  }
  if (!nav.getBattery) return false
  try {
    const battery = await nav.getBattery()
    return battery.level <= 0.2 && !battery.charging
  } catch {
    return false
  }
}

function pauseVideo() {
  video.value?.pause()
}

function resumeVideo() {
  if (staticFallback.value) return
  // `play()` peut être rejeté (onglet caché) : sans effet, on ignore.
  video.value?.play().catch(() => {})
}

onMounted(async () => {
  // Décision de repli : synchronement pour les signaux immédiats, puis batterie.
  if (prefersLightweight() || (await batteryWantsLightweight())) {
    staticFallback.value = true
    return
  }
  staticFallback.value = false
  await nextTick()

  const el = video.value
  if (!el) return

  const onReady = () => {
    videoReady.value = true
    resumeVideo()
  }
  // Échec de décodage / fichier absent : on reste sur le poster animé.
  const onError = () => {
    staticFallback.value = true
    videoReady.value = false
  }
  el.addEventListener('canplay', onReady)
  el.addEventListener('error', onError)
  cleanup.push(() => el.removeEventListener('canplay', onReady))
  cleanup.push(() => el.removeEventListener('error', onError))

  // Mise en pause dès que l'app passe en arrière-plan (partie B).
  const onVisibility = () => (document.hidden ? pauseVideo() : resumeVideo())
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('blur', pauseVideo)
  window.addEventListener('focus', resumeVideo)
  cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility))
  cleanup.push(() => window.removeEventListener('blur', pauseVideo))
  cleanup.push(() => window.removeEventListener('focus', resumeVideo))

  resumeVideo()
})

// Pause quand l'utilisateur quitte l'écran (KeepAlive) ou démonte.
onDeactivated(pauseVideo)
onUnmounted(() => {
  cleanup.forEach((fn) => fn())
  cleanup = []
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
    <!-- Couche 1 : poster fixe, peint immédiatement. Animé d'un zoom lent
         aller-retour quand on est en repli (presque aussi vivant, coût nul). -->
    <img
      :src="posterSrc"
      alt=""
      class="ob-poster absolute inset-0 h-full w-full object-cover"
      :class="{ 'ob-zoom': staticFallback }"
    >

    <!-- Couche 2 : vidéo muette en boucle, apparaît en fondu de 400 ms. -->
    <video
      v-if="!staticFallback"
      ref="video"
      class="ob-video absolute inset-0 h-full w-full object-cover"
      :class="{ 'is-ready': videoReady }"
      :src="videoSrc"
      muted
      loop
      autoplay
      playsinline
      preload="auto"
    />

    <!-- Couche 3a : dégradé sombre bas→haut, courbe douce (pas linéaire brut). -->
    <div class="ob-gradient absolute inset-0"/>
    <!-- Couche 3b : voile uni noir 20 % pour stabiliser le contraste. -->
    <div class="absolute inset-0 bg-black/20"/>
  </div>
</template>

<style scoped>
.ob-video {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.ob-video.is-ready {
  opacity: 1;
}

/* Zoom lent 1.00 → 1.08 sur 12 s, aller-retour — n'anime que transform. */
.ob-zoom {
  animation: ob-zoom 24s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes ob-zoom {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

/* Dégradé bas→haut : 90 % d'opacité en bas, 0 % vers 45 % de la hauteur.
   Courbe adoucie par des paliers intermédiaires plutôt qu'une rampe linéaire. */
.ob-gradient {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.78) 12%,
    rgba(0, 0, 0, 0.55) 24%,
    rgba(0, 0, 0, 0.28) 36%,
    rgba(0, 0, 0, 0) 45%
  );
}

@media (prefers-reduced-motion: reduce) {
  .ob-zoom {
    animation: none;
  }
}
</style>
