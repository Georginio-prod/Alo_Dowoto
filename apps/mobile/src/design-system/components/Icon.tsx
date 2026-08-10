import React from 'react'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '../theme'

/**
 * Icônes au trait (Feather = même famille que Lucide utilisé sur le web).
 * Fournies par @expo/vector-icons (embarqué avec Expo, aucun module natif à
 * ajouter). On expose un sous-ensemble typé pour rester cohérent.
 */
export type IconName =
  | 'home'
  | 'search'
  | 'message-circle'
  | 'credit-card'
  | 'user'
  | 'calendar'
  | 'inbox'
  | 'arrow-left'
  | 'chevron-right'
  | 'check'
  | 'star'
  | 'map-pin'
  | 'lock'
  | 'bell'
  | 'settings'
  | 'help-circle'
  | 'plus'
  | 'shield'
  | 'heart'
  | 'gift'
  | 'log-out'
  | 'camera'
  | 'send'
  | 'sliders'
  | 'x'

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName
  size?: number
  color?: string
}) {
  const theme = useTheme()
  return <Feather name={name} size={size} color={color ?? theme.colors.ink} />
}
