<script setup lang="ts">
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'

/**
 * Hub profil (chercheur et prestataire) : vue d'ensemble inspirée d'une
 * maquette de référence fournie par l'utilisateur — carte d'en-tête
 * (identité, statut, anneau de complétion) puis grille de cartes de
 * section, chacune renvoyant vers une page dédiée existante (mot de passe,
 * vérification…) ou une nouvelle page ciblée (identité, profil
 * professionnel prestataire). Contenu volontairement limité aux
 * fonctionnalités réelles de WorkTogo (pas de section fictive).
 */
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { user, ensure } = useSession()
await ensure()
const isProvider = computed(() => user.value?.role === 'prestataire')

const { data: providerData } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me', {
  immediate: user.value?.role === 'prestataire',
})
const { data: subscriptionData } = await useFetch<{ subscription: Subscription | null }>('/api/subscriptions/me', {
  immediate: user.value?.role === 'prestataire',
})

const providerProfile = computed(() => providerData.value?.profile ?? null)
const subscriptionActive = computed(() => subscriptionData.value?.subscription?.status === 'actif')
const professionalProfileComplete = computed(() => {
  const profile = providerProfile.value
  return !!(profile?.photoUrl && profile?.description)
})
const cvComplete = computed(() => !!providerProfile.value?.cvUrl)
const languagesComplete = computed(() => !!providerProfile.value?.languages?.length)
const formationComplete = computed(() => !!providerProfile.value?.formations?.length)
const certificationsComplete = computed(() => !!providerProfile.value?.certifications?.length)
const preferencesComplete = computed(() => !!(providerProfile.value?.rateFrom && providerProfile.value?.mobility))
const coordonneesComplete = computed(() => !!(providerProfile.value?.whatsapp || providerProfile.value?.website))

const initials = computed(() => {
  const first = user.value?.firstName?.charAt(0) ?? ''
  const last = user.value?.lastName?.charAt(0) ?? ''
  return (first + last).toUpperCase() || '?'
})
const fullName = computed(() => [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ') || user.value?.username)

interface Check { complete: boolean }

const checks = computed<Check[]>(() => {
  const base: Check[] = [
    { complete: !!user.value?.username && !!user.value?.location },
    { complete: !!user.value?.verified },
    { complete: !!user.value?.passwordSet },
  ]
  if (!isProvider.value) return base
  return [
    ...base,
    { complete: professionalProfileComplete.value },
    { complete: cvComplete.value },
    { complete: languagesComplete.value },
    { complete: formationComplete.value },
    { complete: certificationsComplete.value },
    { complete: preferencesComplete.value },
    { complete: coordonneesComplete.value },
    { complete: subscriptionActive.value },
  ]
})

const completionPercent = computed(() => {
  const total = checks.value.length
  const done = checks.value.filter((check) => check.complete).length
  return total === 0 ? 0 : Math.round((done / total) * 100)
})
const remainingCount = computed(() => checks.value.filter((check) => !check.complete).length)

// Anneau SVG (stroke-dasharray) : circonférence d'un cercle de rayon 34.
const RING_CIRCUMFERENCE = 2 * Math.PI * 34
const ringOffset = computed(() => RING_CIRCUMFERENCE * (1 - completionPercent.value / 100))

const firstIncompletePath = computed(() => {
  if (!user.value?.username || !user.value?.location) return '/profil/identite'
  if (!user.value?.verified) return '/profil/verification'
  if (!user.value?.passwordSet) return '/mot-de-passe'
  if (isProvider.value && !professionalProfileComplete.value) return '/prestataire/profil-professionnel'
  if (isProvider.value && !cvComplete.value) return '/prestataire/cv'
  if (isProvider.value && !languagesComplete.value) return '/prestataire/langues'
  if (isProvider.value && !formationComplete.value) return '/prestataire/formation'
  if (isProvider.value && !certificationsComplete.value) return '/prestataire/certifications'
  if (isProvider.value && !preferencesComplete.value) return '/prestataire/preferences'
  if (isProvider.value && !coordonneesComplete.value) return '/prestataire/coordonnees'
  if (isProvider.value && !subscriptionActive.value) return '/abonnement'
  return '/profil/identite'
})
</script>

<template>
  <div class="mx-auto max-w-[880px] px-5 py-8">
    <h1 class="text-[26px] font-extrabold text-dark">Votre profil.</h1>
    <p class="mt-1 text-[13.5px] text-muted">
      Toutes vos informations WorkTogo, en un seul endroit.
    </p>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-card border border-hairline bg-surface p-6 shadow-card-sm">
      <div class="flex items-center gap-4">
        <span class="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/12 text-lg font-bold text-primary">
          {{ initials }}
        </span>
        <div>
          <p class="text-[16.5px] font-bold text-dark">{{ fullName }}</p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <span v-if="isProvider" class="rounded-pill px-2.5 py-1 text-[11px] font-bold" :class="subscriptionActive ? 'bg-primary/12 text-primary' : 'bg-bg text-muted'">
              {{ subscriptionActive ? 'Premium' : 'Non premium' }}
            </span>
            <span class="rounded-pill px-2.5 py-1 text-[11px] font-bold" :class="user?.verified ? 'bg-primary/12 text-primary' : 'bg-bg text-muted'">
              {{ user?.verified ? 'Identité vérifiée' : 'Identité non vérifiée' }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-[11px] font-bold uppercase tracking-wide text-muted">Profil complet</p>
          <p v-if="remainingCount > 0" class="text-[12.5px] text-muted">
            Encore {{ remainingCount }} section{{ remainingCount > 1 ? 's' : '' }} à compléter
          </p>
          <p v-else class="text-[12.5px] font-semibold text-primary">Profil complet, bravo !</p>
          <NuxtLink
            v-if="remainingCount > 0"
            :to="firstIncompletePath"
            class="press mt-2 inline-block rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
          >
            Compléter mon profil
          </NuxtLink>
        </div>

        <svg width="80" height="80" viewBox="0 0 80 80" class="shrink-0 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-hairline)" stroke-width="6" />
          <circle
            cx="40" cy="40" r="34" fill="none" stroke="var(--color-primary)" stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringOffset"
          />
        </svg>
        <span class="sr-only">{{ completionPercent }}% du profil complété</span>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ProfileSectionCard
        icon="🪪"
        title="Identité"
        subtitle="Nom, pseudo, localisation"
        to="/profil/identite"
        :complete="!!user?.username && !!user?.location"
      />
      <ProfileSectionCard
        icon="🛡️"
        title="Vérification"
        subtitle="Carte d'identité et photo passeport"
        to="/profil/verification"
        :complete="!!user?.verified"
      />
      <ProfileSectionCard
        icon="🔒"
        title="Mot de passe"
        subtitle="Sécurité de votre compte"
        to="/mot-de-passe"
        :complete="!!user?.passwordSet"
      />

      <template v-if="isProvider">
        <ProfileSectionCard
          icon="💼"
          title="Profil professionnel"
          subtitle="Secteur, description, photo"
          to="/prestataire/profil-professionnel"
          :complete="professionalProfileComplete"
        />
        <ProfileSectionCard
          icon="📄"
          title="CV"
          subtitle="Votre CV principal"
          to="/prestataire/cv"
          :complete="cvComplete"
        />
        <ProfileSectionCard
          icon="🧩"
          title="Compétences"
          subtitle="Bientôt disponible"
        />
        <ProfileSectionCard
          icon="🗣️"
          title="Langues"
          subtitle="Langues que vous maîtrisez"
          to="/prestataire/langues"
          :complete="languagesComplete"
        />
        <ProfileSectionCard
          icon="🎓"
          title="Formation"
          subtitle="Diplômes et formations suivies"
          to="/prestataire/formation"
          :complete="formationComplete"
        />
        <ProfileSectionCard
          icon="📜"
          title="Certifications"
          subtitle="Faites certifier vos aptitudes"
          to="/prestataire/certifications"
          :complete="certificationsComplete"
        />
        <ProfileSectionCard
          icon="⚙️"
          title="Préférences"
          subtitle="Tarifs, mobilité, disponibilité"
          to="/prestataire/preferences"
          :complete="preferencesComplete"
        />
        <ProfileSectionCard
          icon="☎️"
          title="Coordonnées"
          subtitle="WhatsApp, site web, réseaux"
          to="/prestataire/coordonnees"
          :complete="coordonneesComplete"
        />
        <ProfileSectionCard
          icon="💳"
          title="Abonnement"
          subtitle="Formule et mode de paiement"
          to="/abonnement"
          :complete="subscriptionActive"
        />
        <ProfileSectionCard
          icon="⭐"
          title="Avis reçus"
          subtitle="Retours de vos clients"
        />
      </template>

      <ProfileSectionCard
        v-else
        icon="👛"
        title="Mon solde"
        subtitle="Recharge et historique des paiements"
        to="/solde"
      />
    </div>
  </div>
</template>
