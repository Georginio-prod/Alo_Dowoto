<script setup lang="ts">
/**
 * Effet « curseur magnétique » (#226) : un cercle suit le pointeur avec
 * inertie (lerp par frame, comme `v-parallax` dans plugins/animations.ts)
 * et révèle `hoverText` en négatif à l'intérieur. En dehors du cercle (et
 * tout le temps si `prefers-reduced-motion` est actif), `text` reste
 * affiché normalement — c'est aussi lui, jamais `hoverText` masqué en
 * `aria-hidden`, qui porte le contenu lu par un lecteur d'écran.
 * Réservé au titre d'accroche de l'accueil (HeroSection.vue) pour ce lot.
 */
const props = defineProps<{
  text: string
  hoverText: string
}>()

const LERP_POSITION = 0.18
const LERP_RADIUS = 0.22
// Volontairement modeste : HeroSection.vue a `overflow-hidden` sur la
// section (nécessaire pour .hero-glow) — un cercle trop grand par rapport
// à la hauteur d'une ligne du titre dépasse de la boîte de texte et se
// retrouve coupé net par cet overflow au lieu de rester rond.
const TARGET_RADIUS = 40
const SETTLE_EPSILON = 0.5

const rootEl = ref<HTMLElement | null>(null)
const reduceMotion = ref(false)

let targetX = 0
let targetY = 0
let currentX = 0
let currentY = 0
let currentRadius = 0
let targetRadius = 0
let rafId: number | null = null

function applyVars() {
  const el = rootEl.value
  if (!el) return
  el.style.setProperty('--mx', `${currentX}px`)
  el.style.setProperty('--my', `${currentY}px`)
  el.style.setProperty('--mr', `${currentRadius}px`)
}

function tick() {
  currentX += (targetX - currentX) * LERP_POSITION
  currentY += (targetY - currentY) * LERP_POSITION
  currentRadius += (targetRadius - currentRadius) * LERP_RADIUS
  applyVars()

  const settled = Math.abs(targetRadius - currentRadius) < SETTLE_EPSILON
    && Math.abs(targetX - currentX) < SETTLE_EPSILON
    && Math.abs(targetY - currentY) < SETTLE_EPSILON

  rafId = settled ? null : requestAnimationFrame(tick)
}

function ensureLoop() {
  if (rafId === null) rafId = requestAnimationFrame(tick)
}

function relativePosition(el: HTMLElement, event: PointerEvent): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onPointerEnter(event: PointerEvent) {
  if (reduceMotion.value || !rootEl.value) return
  const { x, y } = relativePosition(rootEl.value, event)
  // Le cercle apparaît directement à l'endroit où le pointeur entre (pas de
  // vol depuis une position par défaut), puis grandit avec inertie.
  currentX = targetX = x
  currentY = targetY = y
  targetRadius = TARGET_RADIUS
  applyVars()
  ensureLoop()
}

function onPointerMove(event: PointerEvent) {
  if (reduceMotion.value || !rootEl.value) return
  const { x, y } = relativePosition(rootEl.value, event)
  targetX = x
  targetY = y
  ensureLoop()
}

function onPointerLeave() {
  targetRadius = 0
  ensureLoop()
}

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<template>
  <span
    ref="rootEl"
    class="magnetic-text"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <span class="magnetic-text__base">{{ props.text }}</span>
    <span v-if="!reduceMotion" class="magnetic-text__reveal" aria-hidden="true">{{ props.hoverText }}</span>
  </span>
</template>
