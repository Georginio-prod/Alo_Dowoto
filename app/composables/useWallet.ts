import type { WalletMovement } from '~~/server/utils/walletStore'

interface WalletResponse {
  balance: number
  movements: WalletMovement[]
}

/**
 * État du portefeuille WorkTogo partagé (#189/#190, epic #191) — même
 * raisonnement que `useSession.ts` : la puce de solde vit dans `AppHeader`
 * (jamais démonté d'une navigation à l'autre) et doit rester synchronisée
 * avec le panneau détaillé « Mon solde » sans attendre une navigation.
 */
export function useWallet() {
  const balance = useState<number | null>('wallet-balance', () => null)
  const movements = useState<WalletMovement[]>('wallet-movements', () => [])
  const loaded = useState('wallet-loaded', () => false)
  const requestFetch = useRequestFetch()

  async function refresh() {
    try {
      const response = await requestFetch<WalletResponse>('/api/wallet/me')
      balance.value = response.balance
      movements.value = response.movements
    } catch {
      balance.value = null
      movements.value = []
    } finally {
      loaded.value = true
    }
  }

  async function ensure() {
    if (!loaded.value) await refresh()
  }

  return { balance, movements, loaded, refresh, ensure }
}
