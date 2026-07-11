export default defineNuxtPlugin((nuxtApp) => {
  let revealIO: IntersectionObserver | null = null
  const getRevealIO = () => {
    if (revealIO) return revealIO
    if (!('IntersectionObserver' in window)) return null
    revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            revealIO?.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    return revealIO
  }

  nuxtApp.vueApp.directive('reveal', {
    getSSRProps() {
      return { 'data-reveal': '' }
    },
    mounted(el: HTMLElement) {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.92) {
        el.classList.add('is-visible')
        return
      }
      const io = getRevealIO()
      if (io) io.observe(el)
      else el.classList.add('is-visible')
    },
    unmounted(el: HTMLElement) {
      revealIO?.unobserve(el)
    },
  })

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let parallaxEls: { el: HTMLElement; factor: number }[] = []
  let ticking = false
  const updateParallax = () => {
    ticking = false
    const y = window.scrollY
    for (const { el, factor } of parallaxEls) {
      el.style.transform = `translateY(${(y * factor).toFixed(1)}px)`
    }
  }
  const onScroll = () => {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(updateParallax)
    }
  }

  nuxtApp.vueApp.directive('parallax', {
    getSSRProps() {
      return { 'data-parallax': '' }
    },
    mounted(el: HTMLElement, binding) {
      if (reduceMotion()) return
      const factor = typeof binding.value === 'number' ? binding.value : 0.1
      parallaxEls.push({ el, factor })
      if (parallaxEls.length === 1) window.addEventListener('scroll', onScroll, { passive: true })
      updateParallax()
    },
    unmounted(el: HTMLElement) {
      parallaxEls = parallaxEls.filter((p) => p.el !== el)
      if (parallaxEls.length === 0) window.removeEventListener('scroll', onScroll)
    },
  })
})
