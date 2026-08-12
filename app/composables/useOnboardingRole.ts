/**
 * Rôle choisi pendant l'onboarding mobile (écran d'accueil → inscription).
 *
 * Le rôle vit à deux endroits complémentaires :
 *  - `useState` partagé, pour survivre à la navigation entre l'écran 1
 *    (welcome) et l'écran 2 (auth) sans le repasser dans l'URL ;
 *  - `localStorage`, pour survivre à une fermeture accidentelle de l'app en
 *    plein milieu de l'inscription (partie E du cahier des charges). Au retour,
 *    l'utilisateur retrouve le bon type de compte présélectionné.
 *
 * La query `?role=` de l'URL reste la source prioritaire quand elle est
 * présente (lien direct, bouton « Changer »), sinon on retombe sur l'état
 * mémorisé, puis sur `client` par défaut.
 */
export type OnboardingRole = 'client' | 'prestataire'

const STORAGE_KEY = 'wt-onboarding-role'

function isRole(value: unknown): value is OnboardingRole {
  return value === 'client' || value === 'prestataire'
}

export function useOnboardingRole() {
  const role = useState<OnboardingRole>('onboarding-role', () => 'client')

  /** Recharge depuis le stockage local (client uniquement) au premier montage. */
  function hydrate() {
    if (!import.meta.client) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isRole(stored)) role.value = stored
    } catch {
      // localStorage indisponible (mode privé strict) : on garde la valeur par défaut.
    }
  }

  function set(next: OnboardingRole) {
    role.value = next
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Écriture impossible : le rôle reste au moins en mémoire pour la session.
    }
  }

  return { role, set, hydrate, isRole }
}
