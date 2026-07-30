<script setup lang="ts">
import { Gift, Lock, ShieldCheck, Star, type LucideIcon } from '@lucide/vue'

/**
 * Bande de réassurance de la page d'accueil (pattern Upwork/Fiverr/Malt) :
 * lève les principaux freins à l'inscription et à la recherche en rendant
 * visibles les garanties déjà offertes par la plateforme. Chaque point
 * correspond à une fonctionnalité réelle de WorkTogo (vérification d'identité,
 * avis mutuels de fin de prestation, paiement bloquant en séquestre, gratuité
 * côté client) — aucune promesse qui ne soit pas tenue par le produit.
 *
 * Icônes Lucide (#visuals) à la place des emojis d'origine : rendu cohérent
 * quel que soit l'OS/navigateur, et stylables dans le vert de marque.
 */
const { t } = useI18n({ useScope: 'global' })

interface TrustPoint {
  icon: LucideIcon
  title: string
  text: string
}

const points = computed<TrustPoint[]>(() => [
  { icon: ShieldCheck, title: t('reassurance.point1Title'), text: t('reassurance.point1Text') },
  { icon: Star, title: t('reassurance.point2Title'), text: t('reassurance.point2Text') },
  { icon: Lock, title: t('reassurance.point3Title'), text: t('reassurance.point3Text') },
  { icon: Gift, title: t('reassurance.point4Title'), text: t('reassurance.point4Text') },
])
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 py-10" :aria-label="t('reassurance.ariaLabel')">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="(point, i) in points"
        :key="point.title"
        v-reveal
        :style="{ '--reveal-delay': `${i * 70}ms` }"
        class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm"
      >
        <div class="mb-3 flex size-11 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
          <component :is="point.icon" :size="22" :stroke-width="2" aria-hidden="true" />
        </div>
        <h3 class="mb-1 text-[14.5px] font-bold text-dark">{{ point.title }}</h3>
        <p class="text-[13px] leading-relaxed text-muted">{{ point.text }}</p>
      </div>
    </div>
  </section>
</template>
