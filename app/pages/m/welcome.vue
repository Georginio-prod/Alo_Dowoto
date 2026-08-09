<script setup lang="ts">
/**
 * Écran 1 du parcours mobile — « Bienvenue » (parties A et B).
 *
 * Premier écran de l'app quand personne n'est connecté : vidéo de fond plein
 * cadre, choix du rôle (bifurcation à poids égal), lien de connexion. Un
 * utilisateur déjà authentifié n'a rien à faire ici — on le renvoie
 * directement sur son accueil sans jamais monter la vidéo (partie E).
 */
definePageMeta({
  layout: 'onboarding',
  // Glissement horizontal entre l'accueil et la connexion (partie E).
  pageTransition: { name: 'ob-slide', mode: 'out-in' },
})

const { t } = useI18n({ useScope: 'global' })
const { user, ensure } = useSession()
const { set: setRole } = useOnboardingRole()

// Vérifie la session AVANT de peindre la vidéo : un compte déjà connecté
// part droit sur le dashboard (aucun second écran d'attente, partie E).
await ensure()
if (user.value) {
  await navigateTo('/dashboard', { replace: true })
}

function chooseRole(role: 'client' | 'prestataire') {
  setRole(role)
  navigateTo({ path: '/m/auth', query: { role, mode: 'signup' } })
}

function goSignIn() {
  navigateTo({ path: '/m/auth', query: { mode: 'login' } })
}
</script>

<template>
  <section class="relative flex h-[100dvh] flex-col overflow-hidden">
    <!-- Fond vidéo / poster / repli animé, plein cadre. -->
    <OnboardingBackdrop class="ob-backdrop" />

    <!-- En-tête : logo (gauche) + pastille de langue (droite). Seuls éléments
         autorisés en haut de l'écran. -->
    <header class="relative z-10 flex items-start justify-between px-5 pt-5">
      <span class="ob-logo text-[20px] font-extrabold leading-none text-white" :aria-label="t('onboarding.logoAria')">
        Work<span class="opacity-90">Togo</span>
      </span>
      <OnboardingLangPill class="ob-logo" />
    </header>

    <!-- La vidéo respire : rien au milieu. -->
    <div class="flex-1" />

    <!-- Contenu posé dans le tiers inférieur. -->
    <div class="relative z-10 px-5 pb-8">
      <h1 class="ob-title max-w-[22ch] text-left font-extrabold leading-[1.12] text-white">
        {{ t('onboarding.welcome.title') }}
      </h1>
      <p class="ob-subtitle mt-3 text-[16px] text-white/85">
        {{ t('onboarding.welcome.subtitle') }}
      </p>

      <!-- Deux choix de rôle, poids visuel strictement égal. Passent en colonne
           sur écran étroit (< 340 dp) plutôt que de tronquer leur texte. -->
      <div class="ob-roles mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          class="press ob-role-btn"
          :aria-label="t('onboarding.welcome.roleClientAria')"
          @click="chooseRole('client')"
        >
          {{ t('onboarding.welcome.roleClient') }}
        </button>
        <button
          type="button"
          class="press ob-role-btn"
          :aria-label="t('onboarding.welcome.roleProviderAria')"
          @click="chooseRole('prestataire')"
        >
          {{ t('onboarding.welcome.roleProvider') }}
        </button>
      </div>

      <!-- Lien de connexion centré, cible tactile ≥ 48 dp. -->
      <div class="ob-signin mt-4 text-center">
        <button
          type="button"
          class="press inline-flex min-h-[48px] items-center justify-center text-[14px] text-white/90"
          @click="goSignIn"
        >
          {{ t('onboarding.welcome.haveAccount') }}
          <span class="ml-1 font-bold underline underline-offset-2">{{ t('onboarding.welcome.signIn') }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Tailles typographiques en rem pour suivre l'agrandissement de la police
   système ; le titre se réduit et les boutons passent en colonne plutôt que
   de tronquer (partie F). */
.ob-title {
  font-size: 2rem; /* 32 px au facteur par défaut */
}
@media (max-width: 360px) {
  .ob-title {
    font-size: 1.75rem; /* 28 px */
  }
  .ob-roles {
    flex-direction: column;
  }
  .ob-role-btn {
    width: 100%;
  }
}

.ob-role-btn {
  flex: 1 1 140px;
  min-width: 140px;
  height: 52px;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  background: transparent;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-inline: 12px;
  text-align: center;
}

/* ---- Chorégraphie d'entrée, une seule fois au lancement (partie B) ---- */
.ob-backdrop {
  animation: ob-fade 0.4s cubic-bezier(0.05, 0.7, 0.1, 1) both;
}
.ob-logo {
  animation: ob-fade 0.2s cubic-bezier(0.05, 0.7, 0.1, 1) both;
}
.ob-title {
  animation: ob-rise 0.35s cubic-bezier(0.05, 0.7, 0.1, 1) 0.15s both;
}
.ob-subtitle {
  animation: ob-rise 0.35s cubic-bezier(0.05, 0.7, 0.1, 1) 0.22s both;
}
.ob-roles {
  animation: ob-rise 0.35s cubic-bezier(0.05, 0.7, 0.1, 1) 0.3s both;
}
.ob-signin {
  animation: ob-fade 0.35s cubic-bezier(0.05, 0.7, 0.1, 1) 0.38s both;
}

@keyframes ob-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ob-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .ob-backdrop,
  .ob-logo,
  .ob-title,
  .ob-subtitle,
  .ob-roles,
  .ob-signin {
    animation: none;
  }
}
</style>
