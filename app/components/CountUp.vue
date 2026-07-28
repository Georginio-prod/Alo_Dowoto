<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  suffix?: string
  duration?: number
}>(), {
  suffix: '',
  duration: 1400,
})

const { locale, locales } = useI18n({ useScope: 'global' })
const languageTag = computed(() =>
  (locales.value as Array<{ code: string, language?: string }>).find((l) => l.code === locale.value)?.language ?? 'fr-FR',
)

const display = ref(0)
const el = ref<HTMLElement | null>(null)
let started = false
let io: IntersectionObserver | null = null

onMounted(() => {
  if (!el.value) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    display.value = props.value
    return
  }

  const run = () => {
    if (started) return
    started = true
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / props.duration)
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      display.value = Math.round(eased * props.value)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && run()),
    { threshold: 0.4 },
  )
  io.observe(el.value)
})

onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <span ref="el">{{ display.toLocaleString(languageTag) }}{{ suffix }}</span>
</template>
