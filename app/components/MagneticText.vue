<script setup lang="ts">
/**
 * Effet « curseur magnétique » (#362, reprise de #226/#231) : un cercle
 * suit le pointeur avec inertie (lerp par frame, comme `v-parallax` dans
 * plugins/animations.ts) et révèle `hoverText` en négatif à l'intérieur.
 * En dehors du cercle, `text` reste affiché normalement — c'est aussi lui,
 * jamais `hoverText` masqué en `aria-hidden`, qui porte le contenu lu par
 * un lecteur d'écran.
 *
 * Contrairement à #226 (appliqué à tout le `<h1>`, un cercle de 90px avait
 * fini coupé net par l'`overflow-hidden` du hero sur certains hovers près
 * des bords de section), ce composant cible ici uniquement le mot-clé
 * court mis en valeur (`hero-highlight`) : bien plus de marge autour du
 * cercle avant d'atteindre les bords de la section, donc plus de risque de
 * découpe visuelle.
 *
 * Gating strict à l'activation : `pointer: fine` (souris réelle — sur
 * tactile, pointerenter/move ont un comportement dégradé sans intérêt) ET
 * `prefers-reduced-motion: no-preference`. Si l'une des deux conditions
 * n'est pas remplie, aucun écouteur n'est attaché et `text` reste affiché
 * seul, statique.
 */
const props = defineProps<{
  text: string
  hoverText: string
}>()

const LERP_POSITION = 0.18
const LERP_RADIUS = 0.22
const TARGET_RADIUS = 60
const SETTLE_EPSILON = 0.5

const rootEl = ref<HTMLElement | null>(null)
const effectEnabled = ref(false)

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
  if (!effectEnabled.value || !rootEl.value) return
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
  if (!effectEnabled.value || !rootEl.value) return
  const { x, y } = relativePosition(rootEl.value, event)
  targetX = x
  targetY = y
  ensureLoop()
}

function onPointerLeave() {
  if (!effectEnabled.value) return
  targetRadius = 0
  ensureLoop()
}

onMounted(() => {
  effectEnabled.value = window.matchMedia('(pointer: fine)').matches
    && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
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
    <span v-if="effectEnabled" class="magnetic-text__reveal" aria-hidden="true">{{ props.hoverText }}</span>
  </span>
</template>
