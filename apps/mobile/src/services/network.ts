import { useEffect, useState } from 'react'
import * as Network from 'expo-network'

/**
 * État réseau réactif (Phase 3). Sert au bandeau hors-ligne et au rejeu de la
 * file d'attente d'actions. Sonde périodique légère (expo-network n'expose pas
 * partout un abonnement stable selon la plateforme).
 */
export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync()
        if (mounted) setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
      } catch {
        if (mounted) setOnline(true)
      }
    }
    check()
    const id = setInterval(check, 5000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  return online
}
