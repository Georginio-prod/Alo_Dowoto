<script setup lang="ts">
import type { Component } from 'vue'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'
import CertificationsForm from '~/components/CertificationsForm.vue'
import ContactForm from '~/components/ContactForm.vue'
import CvForm from '~/components/CvForm.vue'
import FormationForm from '~/components/FormationForm.vue'
import IdentiteForm from '~/components/IdentiteForm.vue'
import IdentityVerificationForm from '~/components/IdentityVerificationForm.vue'
import LanguagesForm from '~/components/LanguagesForm.vue'
import PasswordForm from '~/components/PasswordForm.vue'
import PreferencesForm from '~/components/PreferencesForm.vue'
import ProfessionalProfileForm from '~/components/ProfessionalProfileForm.vue'

/**
 * Hub profil (chercheur et prestataire) : vue d'ensemble inspirée d'une
 * maquette de référence fournie par l'utilisateur — carte d'en-tête
 * (identité, statut, anneau de complétion) puis grille de cartes de
 * section. Chaque section s'ouvre désormais dans une fenêtre par-dessus le
 * hub (#hub-profil-modales) plutôt que de naviguer vers une page dédiée —
 * ces pages restent joignables directement (marque-page, lien direct) et
 * portent le même formulaire, extrait en composant partagé (ex.
 * IdentiteForm.vue) pour éviter toute divergence entre les deux. Seul
 * « Abonnement » reste une page à part entière (choix de formule + paiement
 * mobile money, un flux plus lourd qu'une fenêtre). Contenu volontairement
 * limité aux fonctionnalités réelles de WorkTogo (pas de section fictive).
 *
 * Layout dynamique (#profil-sidebar-prestataire) : un prestataire retrouve
 * la même barre latérale que le reste de son dashboard (Accueil, Profil,
 * Demandes reçues, Solde, Messages) pour passer d'une section à l'autre
 * sans revenir en arrière — impossible à fixer via `definePageMeta` seul,
 * le rôle n'étant connu qu'après la résolution de la session. Le chercheur,
 * qui n'a pas cette barre latérale ailleurs dans l'app, garde le layout
 * `blank` d'origine.
 */
// `alias` : rend ce hub également accessible sous /prestataire/profil (lien
// utilisé par la nav du dashboard prestataire) sans dupliquer le composant —
// /profil tout court reste la route canonique pour le chercheur, qui n'a pas
// de section /prestataire.
definePageMeta({ layout: false, middleware: 'auth', alias: '/prestataire/profil' })

const { user, ensure } = useSession()
await ensure()
const isProvider = computed(() => user.value?.role === 'prestataire')

const { data: providerData, refresh: refreshProvider } = await useFetch<{ profile: ProviderProfile | null }>('/api/providers/me', {
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

type ModalKey =
  | 'identite'
  | 'verification'
  | 'password'
  | 'profil-professionnel'
  | 'cv'
  | 'langues'
  | 'formation'
  | 'certifications'
  | 'preferences'
  | 'coordonnees'

/**
 * `refreshOnSave` : les formulaires d'identité/vérification/mot de passe
 * mettent à jour l'état de session partagé eux-mêmes (`setSession`,
 * `refreshSession`) — seuls les formulaires qui modifient le profil
 * prestataire (`/api/providers/me`) ont besoin d'un rafraîchissement
 * explicite ici pour que les badges du hub restent à jour.
 */
const MODAL_CONFIG: Record<ModalKey, { title: string; component: Component; refreshOnSave: boolean }> = {
  identite: { title: 'Identité', component: IdentiteForm, refreshOnSave: false },
  verification: { title: "Vérification d'identité", component: IdentityVerificationForm, refreshOnSave: false },
  password: { title: 'Changer le mot de passe', component: PasswordForm, refreshOnSave: false },
  'profil-professionnel': { title: 'Profil professionnel', component: ProfessionalProfileForm, refreshOnSave: true },
  cv: { title: 'CV', component: CvForm, refreshOnSave: true },
  langues: { title: 'Langues', component: LanguagesForm, refreshOnSave: true },
  formation: { title: 'Formation', component: FormationForm, refreshOnSave: true },
  certifications: { title: 'Certifications', component: CertificationsForm, refreshOnSave: true },
  preferences: { title: 'Préférences', component: PreferencesForm, refreshOnSave: true },
  coordonnees: { title: 'Coordonnées', component: ContactForm, refreshOnSave: true },
}

const activeModal = ref<ModalKey | null>(null)
function openModal(key: ModalKey) {
  activeModal.value = key
}

// Deep-link (ex. bandeau « Vérifiez votre identité » du dashboard prestataire,
// `/profil?open=verification`) : ouvre directement la bonne section au lieu de
// forcer un clic de plus sur la grille.
const route = useRoute()
onMounted(() => {
  const key = route.query.open
  if (typeof key === 'string' && key in MODAL_CONFIG) openModal(key as ModalKey)
})
function closeModal() {
  activeModal.value = null
}
function onModalFormSaved() {
  if (activeModal.value && MODAL_CONFIG[activeModal.value].refreshOnSave) refreshProvider()
}

const firstIncomplete = computed<ModalKey | 'abonnement'>(() => {
  if (!user.value?.username || !user.value?.location) return 'identite'
  if (!user.value?.verified) return 'verification'
  if (!user.value?.passwordSet) return 'password'
  if (isProvider.value && !professionalProfileComplete.value) return 'profil-professionnel'
  if (isProvider.value && !cvComplete.value) return 'cv'
  if (isProvider.value && !languagesComplete.value) return 'langues'
  if (isProvider.value && !formationComplete.value) return 'formation'
  if (isProvider.value && !certificationsComplete.value) return 'certifications'
  if (isProvider.value && !preferencesComplete.value) return 'preferences'
  if (isProvider.value && !coordonneesComplete.value) return 'coordonnees'
  if (isProvider.value && !subscriptionActive.value) return 'abonnement'
  return 'identite'
})

function completeProfile() {
  const next = firstIncomplete.value
  if (next === 'abonnement') navigateTo('/abonnement')
  else openModal(next)
}
</script>

<template>
  <NuxtLayout :name="isProvider ? 'dashboard-prestataire' : 'blank'">
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
            <button
              v-if="remainingCount > 0"
              type="button"
              class="press mt-2 inline-block rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
              @click="completeProfile"
            >
              Compléter mon profil
            </button>
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
          interactive
          :complete="!!user?.username && !!user?.location"
          @click="openModal('identite')"
        />
        <ProfileSectionCard
          icon="🛡️"
          title="Vérification"
          subtitle="Carte d'identité et photo passeport"
          interactive
          :complete="!!user?.verified"
          @click="openModal('verification')"
        />
        <ProfileSectionCard
          icon="🔒"
          title="Mot de passe"
          subtitle="Sécurité de votre compte"
          interactive
          :complete="!!user?.passwordSet"
          @click="openModal('password')"
        />

        <template v-if="isProvider">
          <ProfileSectionCard
            icon="💼"
            title="Profil professionnel"
            subtitle="Secteur, description, photo"
            interactive
            :complete="professionalProfileComplete"
            @click="openModal('profil-professionnel')"
          />
          <ProfileSectionCard
            icon="📄"
            title="CV"
            subtitle="Votre CV principal"
            interactive
            :complete="cvComplete"
            @click="openModal('cv')"
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
            interactive
            :complete="languagesComplete"
            @click="openModal('langues')"
          />
          <ProfileSectionCard
            icon="🎓"
            title="Formation"
            subtitle="Diplômes et formations suivies"
            interactive
            :complete="formationComplete"
            @click="openModal('formation')"
          />
          <ProfileSectionCard
            icon="📜"
            title="Certifications"
            subtitle="Faites certifier vos aptitudes"
            interactive
            :complete="certificationsComplete"
            @click="openModal('certifications')"
          />
          <ProfileSectionCard
            icon="⚙️"
            title="Préférences"
            subtitle="Tarifs, mobilité, disponibilité"
            interactive
            :complete="preferencesComplete"
            @click="openModal('preferences')"
          />
          <ProfileSectionCard
            icon="☎️"
            title="Coordonnées"
            subtitle="WhatsApp, site web, réseaux"
            interactive
            :complete="coordonneesComplete"
            @click="openModal('coordonnees')"
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

      <ProfileFormModal v-if="activeModal" :title="MODAL_CONFIG[activeModal].title" @close="closeModal">
        <component :is="MODAL_CONFIG[activeModal].component" @saved="onModalFormSaved" />
      </ProfileFormModal>
    </div>
  </NuxtLayout>
</template>
