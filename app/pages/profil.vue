<script setup lang="ts">
import type { Component } from 'vue'
import type { ProviderProfile } from '~~/server/utils/providerStore'
import type { Subscription } from '~~/server/utils/subscriptionStore'
import AvailabilityCalendar from '~/components/AvailabilityCalendar.vue'
import CertificationsForm from '~/components/CertificationsForm.vue'
import ContactForm from '~/components/ContactForm.vue'
import CvForm from '~/components/CvForm.vue'
import DataPrivacyPanel from '~/components/DataPrivacyPanel.vue'
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

const { t } = useI18n({ useScope: 'global' })
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
  | 'donnees'
  | 'disponibilite'

/**
 * `refreshOnSave` : les formulaires d'identité/vérification/mot de passe
 * mettent à jour l'état de session partagé eux-mêmes (`setSession`,
 * `refreshSession`) — seuls les formulaires qui modifient le profil
 * prestataire (`/api/providers/me`) ont besoin d'un rafraîchissement
 * explicite ici pour que les badges du hub restent à jour.
 */
const MODAL_CONFIG = computed<Record<ModalKey, { title: string; component: Component; refreshOnSave: boolean }>>(() => ({
  identite: { title: t('profilPage.modalTitleIdentite'), component: IdentiteForm, refreshOnSave: false },
  verification: { title: t('profilPage.modalTitleVerification'), component: IdentityVerificationForm, refreshOnSave: false },
  password: { title: t('profilPage.modalTitlePassword'), component: PasswordForm, refreshOnSave: false },
  'profil-professionnel': { title: t('profilPage.modalTitleProProfile'), component: ProfessionalProfileForm, refreshOnSave: true },
  cv: { title: t('profilPage.modalTitleCv'), component: CvForm, refreshOnSave: true },
  langues: { title: t('profilPage.modalTitleLangues'), component: LanguagesForm, refreshOnSave: true },
  formation: { title: t('profilPage.modalTitleFormation'), component: FormationForm, refreshOnSave: true },
  certifications: { title: t('profilPage.modalTitleCertifications'), component: CertificationsForm, refreshOnSave: true },
  preferences: { title: t('profilPage.modalTitlePreferences'), component: PreferencesForm, refreshOnSave: true },
  coordonnees: { title: t('profilPage.modalTitleCoordonnees'), component: ContactForm, refreshOnSave: true },
  // Export/effacement (#286) : ne modifie pas ProviderProfile, pas besoin de
  // rafraîchir les données du profil affichées ailleurs dans le hub.
  donnees: { title: t('profilPage.modalTitleDonnees'), component: DataPrivacyPanel, refreshOnSave: false },
  // Calendrier autonome (#290) : ne modifie pas ProviderProfile, pas besoin
  // de rafraîchir les données du profil affichées ailleurs dans le hub.
  disponibilite: { title: t('profilPage.modalTitleDisponibilite'), component: AvailabilityCalendar, refreshOnSave: false },
}))

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
  if (typeof key === 'string' && key in MODAL_CONFIG.value) openModal(key as ModalKey)
})
function closeModal() {
  activeModal.value = null
}
function onModalFormSaved() {
  if (activeModal.value && MODAL_CONFIG.value[activeModal.value].refreshOnSave) refreshProvider()
}

// Anneau de complétion et « prochaine section incomplète » (composable, voir
// app/composables/useProfileCompletion.ts — extrait pour rester sous la
// limite ESLint max-lines après l'ajout des sections « Mes données » (#286)
// et « Disponibilité » (#290)).
const { completionPercent, remainingCount, RING_CIRCUMFERENCE, ringOffset, firstIncompleteProviderSection } = useProfileCompletion({
  isProvider,
  subscriptionActive,
  baseSections: [
    { key: 'identite', complete: computed(() => !!user.value?.username && !!user.value?.location) },
    { key: 'verification', complete: computed(() => !!user.value?.verified) },
    { key: 'password', complete: computed(() => !!user.value?.passwordSet) },
  ],
  providerSections: [
    { key: 'profil-professionnel', complete: professionalProfileComplete },
    { key: 'cv', complete: cvComplete },
    { key: 'langues', complete: languagesComplete },
    { key: 'formation', complete: formationComplete },
    { key: 'certifications', complete: certificationsComplete },
    { key: 'preferences', complete: preferencesComplete },
    { key: 'coordonnees', complete: coordonneesComplete },
    { key: 'abonnement', complete: subscriptionActive },
  ],
})

function completeProfile() {
  if (!user.value?.username || !user.value?.location) { openModal('identite'); return }
  if (!user.value?.verified) { openModal('verification'); return }
  if (!user.value?.passwordSet) { openModal('password'); return }
  const next = firstIncompleteProviderSection.value
  if (next === 'abonnement') navigateTo('/abonnement')
  else if (next) openModal(next as ModalKey)
}
</script>

<template>
  <NuxtLayout :name="isProvider ? 'dashboard-prestataire' : 'blank'">
    <div class="mx-auto max-w-[880px] px-5 py-8" :class="{ 'pb-tabbar': !isProvider }">
      <h1 class="text-[26px] font-extrabold text-dark">{{ t('profilPage.heading') }}</h1>
      <p class="mt-1 text-[13.5px] text-muted">
        {{ t('profilPage.subtitle') }}
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
                {{ subscriptionActive ? t('profilPage.premium') : t('profilPage.notPremium') }}
              </span>
              <span class="rounded-pill px-2.5 py-1 text-[11px] font-bold" :class="user?.verified ? 'bg-primary/12 text-primary' : 'bg-bg text-muted'">
                {{ user?.verified ? t('profilPage.identityVerified') : t('profilPage.identityNotVerified') }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="text-[11px] font-bold uppercase tracking-wide text-muted">{{ t('profilPage.profileCompleteLabel') }}</p>
            <p v-if="remainingCount > 0" class="text-[12.5px] text-muted">
              {{ t('profilPage.remainingSections', remainingCount) }}
            </p>
            <p v-else class="text-[12.5px] font-semibold text-primary">{{ t('profilPage.profileCompleteDone') }}</p>
            <button
              v-if="remainingCount > 0"
              type="button"
              class="press mt-2 inline-block rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
              @click="completeProfile"
            >
              {{ t('profilPage.completeProfileCta') }}
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
          <span class="sr-only">{{ t('profilPage.completionSr', { percent: completionPercent }) }}</span>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileSectionCard
          icon="🪪"
          :title="t('profilPage.sectionIdentiteTitle')"
          :subtitle="t('profilPage.sectionIdentiteSubtitle')"
          interactive
          :complete="!!user?.username && !!user?.location"
          @click="openModal('identite')"
        />
        <ProfileSectionCard
          icon="🛡️"
          :title="t('profilPage.sectionVerificationTitle')"
          :subtitle="t('profilPage.sectionVerificationSubtitle')"
          interactive
          :complete="!!user?.verified"
          @click="openModal('verification')"
        />
        <ProfileSectionCard
          icon="🔒"
          :title="t('profilPage.sectionPasswordTitle')"
          :subtitle="t('profilPage.sectionPasswordSubtitle')"
          interactive
          :complete="!!user?.passwordSet"
          @click="openModal('password')"
        />
        <ProfileSectionCard
          icon="🔐"
          :title="t('profilPage.sectionDonneesTitle')"
          :subtitle="t('profilPage.sectionDonneesSubtitle')"
          interactive
          @click="openModal('donnees')"
        />
        <ProfileSectionCard
          icon="🎁" to="/parrainage"
          :title="t('profilPage.sectionParrainageTitle')"
          :subtitle="t('profilPage.sectionParrainageSubtitle')"
        />
        <ProfileSectionCard
          icon="💡" to="/comment-ca-marche"
          :title="t('tutorials.title')"
          :subtitle="t('tutorials.subtitle')"
        />

        <template v-if="isProvider">
          <ProfileSectionCard
            icon="💼"
            :title="t('profilPage.sectionProProfileTitle')"
            :subtitle="t('profilPage.sectionProProfileSubtitle')"
            interactive
            :complete="professionalProfileComplete"
            @click="openModal('profil-professionnel')"
          />
          <ProfileSectionCard
            icon="📄"
            :title="t('profilPage.sectionCvTitle')"
            :subtitle="t('profilPage.sectionCvSubtitle')"
            interactive
            :complete="cvComplete"
            @click="openModal('cv')"
          />
          <ProfileSectionCard
            icon="🧩"
            :title="t('profilPage.sectionSkillsTitle')"
            :subtitle="t('profilPage.sectionSkillsSubtitle')"
          />
          <ProfileSectionCard
            icon="🗣️"
            :title="t('profilPage.sectionLanguesTitle')"
            :subtitle="t('profilPage.sectionLanguesSubtitle')"
            interactive
            :complete="languagesComplete"
            @click="openModal('langues')"
          />
          <ProfileSectionCard
            icon="🎓"
            :title="t('profilPage.sectionFormationTitle')"
            :subtitle="t('profilPage.sectionFormationSubtitle')"
            interactive
            :complete="formationComplete"
            @click="openModal('formation')"
          />
          <ProfileSectionCard
            icon="📜"
            :title="t('profilPage.sectionCertificationsTitle')"
            :subtitle="t('profilPage.sectionCertificationsSubtitle')"
            interactive
            :complete="certificationsComplete"
            @click="openModal('certifications')"
          />
          <ProfileSectionCard
            icon="⚙️"
            :title="t('profilPage.sectionPreferencesTitle')"
            :subtitle="t('profilPage.sectionPreferencesSubtitle')"
            interactive
            :complete="preferencesComplete"
            @click="openModal('preferences')"
          />
          <ProfileSectionCard
            icon="☎️"
            :title="t('profilPage.sectionCoordonneesTitle')"
            :subtitle="t('profilPage.sectionCoordonneesSubtitle')"
            interactive
            :complete="coordonneesComplete"
            @click="openModal('coordonnees')"
          />
          <ProfileSectionCard
            icon="📅"
            :title="t('profilPage.sectionDisponibiliteTitle')"
            :subtitle="t('profilPage.sectionDisponibiliteSubtitle')"
            interactive
            @click="openModal('disponibilite')"
          />
          <ProfileSectionCard
            icon="💳"
            :title="t('profilPage.sectionAbonnementTitle')"
            :subtitle="t('profilPage.sectionAbonnementSubtitle')"
            to="/abonnement"
            :complete="subscriptionActive"
          />
          <ProfileSectionCard
            icon="⭐"
            :title="t('profilPage.sectionAvisTitle')"
            :subtitle="t('profilPage.sectionAvisSubtitle')"
          />
        </template>

        <ProfileSectionCard
          v-else
          icon="👛"
          :title="t('profilPage.sectionSoldeTitle')"
          :subtitle="t('profilPage.sectionSoldeSubtitle')"
          to="/solde"
        />
      </div>

      <ProfileFormModal v-if="activeModal" :title="MODAL_CONFIG[activeModal].title" @close="closeModal">
        <component :is="MODAL_CONFIG[activeModal].component" @saved="onModalFormSaved" />
      </ProfileFormModal>
    </div>
  </NuxtLayout>
</template>
