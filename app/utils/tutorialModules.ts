/**
 * Registre des modules de tutoriel (#tutoriel-onboarding — Couche 3).
 *
 * Source unique partagée par la page dédiée « Comment ça marche » (et, à terme,
 * par le lancement des tutoriels contextuels et la sync serveur). Les libellés
 * vivent dans l'i18n (`tutorials.<role>.modules.<id>.title|desc`), jamais ici.
 *
 * `seenKey` relie un module à l'identifiant de section suivi par useTutorials
 * quand son tutoriel contextuel existe déjà (ex. `find` ↔ le coach mark de
 * l'accueil chercheur). Les autres n'ont pas encore de suivi : ils restent
 * « à voir » tant que leur tutoriel n'est pas construit (statut honnête).
 */
export interface TutorialModule {
  id: string
  /** Emoji de vignette (pas d'image incrustée : traduisible, lisible en TTS). */
  icon: string
  durationSec: number
  /** Écran réel vers lequel le module renvoie. */
  path: string
  /** Clé de suivi useTutorials si un tutoriel contextuel existe déjà. */
  seenKey?: string
}

export const CLIENT_MODULES: TutorialModule[] = [
  { id: 'find', icon: '🔎', durationSec: 25, path: '/dashboard', seenKey: 'dashboard-seeker' },
  { id: 'form', icon: '📝', durationSec: 30, path: '/demande' },
  { id: 'plan', icon: '🧾', durationSec: 25, path: '/formules' },
  { id: 'pay', icon: '🔒', durationSec: 35, path: '/paiement' },
  { id: 'track', icon: '📍', durationSec: 25, path: '/messages' },
  { id: 'revision', icon: '⚖️', durationSec: 30, path: '/messages' },
  { id: 'validate', icon: '✅', durationSec: 25, path: '/dashboard' },
]

export const PROVIDER_MODULES: TutorialModule[] = [
  { id: 'profile', icon: '💼', durationSec: 30, path: '/prestataire/profil-professionnel' },
  { id: 'subscription', icon: '💳', durationSec: 25, path: '/abonnement' },
  { id: 'request', icon: '📨', durationSec: 30, path: '/prestataire/demandes' },
  { id: 'checkin', icon: '📍', durationSec: 20, path: '/prestataire/demandes' },
  { id: 'adjust', icon: '⚖️', durationSec: 35, path: '/prestataire/demandes' },
  { id: 'finish', icon: '🏁', durationSec: 25, path: '/prestataire/solde' },
  { id: 'why', icon: '🛡️', durationSec: 30, path: '/aide' },
]

export function modulesForRole(role: string | undefined): TutorialModule[] {
  return role === 'prestataire' ? PROVIDER_MODULES : CLIENT_MODULES
}
