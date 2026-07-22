<script setup lang="ts">
/**
 * Bande de réassurance de la page d'accueil (pattern Upwork/Fiverr/Malt) :
 * lève les principaux freins à l'inscription et à la recherche en rendant
 * visibles les garanties déjà offertes par la plateforme. Chaque point
 * correspond à une fonctionnalité réelle de WorkTogo (vérification d'identité,
 * avis mutuels de fin de prestation, paiement bloquant en séquestre, gratuité
 * côté client) — aucune promesse qui ne soit pas tenue par le produit.
 */
interface TrustPoint {
  icon: string
  title: string
  text: string
}

const points: TrustPoint[] = [
  { icon: '🛡️', title: 'Prestataires vérifiés', text: 'Identité et documents contrôlés avant la mise en relation.' },
  { icon: '⭐', title: 'Avis authentiques', text: 'Notes laissées après chaque prestation réellement effectuée.' },
  { icon: '🔒', title: 'Paiement sécurisé', text: 'Fonds bloqués en séquestre, libérés une fois le travail validé.' },
  { icon: '🆓', title: 'Gratuit côté client', text: 'Rechercher, comparer et contacter des prestataires ne coûte rien.' },
]
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 py-10" aria-label="Nos garanties de confiance">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="(point, i) in points"
        :key="point.title"
        v-reveal
        :style="{ '--reveal-delay': `${i * 70}ms` }"
        class="rounded-card border border-hairline bg-surface p-5 shadow-card-sm"
      >
        <div class="mb-3 flex size-11 items-center justify-center rounded-[12px] bg-primary/10 text-xl">
          {{ point.icon }}
        </div>
        <h3 class="mb-1 text-[14.5px] font-bold text-dark">{{ point.title }}</h3>
        <p class="text-[13px] leading-relaxed text-muted">{{ point.text }}</p>
      </div>
    </div>
  </section>
</template>
