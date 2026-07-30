import {
  BookOpen,
  Factory,
  Hammer,
  Laptop,
  PartyPopper,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  type LucideIcon,
} from '@lucide/vue'
import type { Sector } from '~/data/sectors'

/**
 * Icône Lucide par secteur (`Sector.icon`) — remplace l'emoji comme rendu
 * visuel principal (inconsistant selon OS/navigateur, non stylable). L'emoji
 * reste dans `sectors.ts` en repli texte (aria-label, notifications…).
 */
export const SECTOR_ICONS: Record<Sector['icon'], LucideIcon> = {
  hammer: Hammer,
  laptop: Laptop,
  sparkles: Sparkles,
  scissors: Scissors,
  'party-popper': PartyPopper,
  'book-open': BookOpen,
  truck: Truck,
  'shopping-bag': ShoppingBag,
  factory: Factory,
  stethoscope: Stethoscope,
}
