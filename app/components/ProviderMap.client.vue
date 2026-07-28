<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { getRegionBySlug } from '~~/app/data/regions'
import type { ProviderSearchResult } from '~~/server/utils/providerDirectory'

/**
 * Carte interactive des prestataires (#geoloc, 1.4/1.5). Suffixe `.client`
 * (même convention que app/plugins/*.client.ts) : Leaflet a besoin de
 * `window`/`document`, jamais exécuté côté serveur — Nuxt exclut ce
 * composant du rendu SSR et ne l'hydrate qu'au montage client.
 *
 * Bornée à la région fournie (`maxBounds`, Région Maritime par défaut) :
 * impossible de faire dériver la carte vers l'océan ou un pays voisin, la
 * zone couverte étant une donnée de configuration (app/data/regions.ts) et
 * non figée en dur ici.
 */
const props = withDefaults(
  defineProps<{
    providers: ProviderSearchResult[]
    searcherPosition?: { latitude: number; longitude: number } | null
    radiusKm?: number | null
    regionSlug?: string
  }>(),
  { searcherPosition: null, radiusKm: null, regionSlug: 'maritime' },
)

const emit = defineEmits<{ 'select-provider': [id: string] }>()

const { t } = useI18n({ useScope: 'global' })

// Correctif classique Leaflet + bundler (Vite) : les icônes par défaut sont
// référencées par un chemin relatif qui ne survit pas au bundling — sans ce
// correctif, les marqueurs prestataires n'ont aucune icône visible.
type IconDefaultPrototype = typeof L.Icon.Default.prototype & { _getIconUrl?: string }
delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

// Marqueur du chercheur : un point plein distinct des punaises prestataires,
// pour qu'on repère sa propre position en un coup d'œil sur la carte.
const searcherIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#14A800;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const mapEl = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let clusterGroup: L.MarkerClusterGroup | null = null
let searcherMarker: L.Marker | null = null
let radiusCircle: L.Circle | null = null

function renderMarkers() {
  if (!map || !clusterGroup) return
  clusterGroup.clearLayers()

  for (const provider of props.providers) {
    if (provider.latitude === null || provider.longitude === null) continue
    const marker = L.marker([provider.latitude, provider.longitude])
    const distance = provider.distanceKm !== null ? ` · ${t('providerMap.distanceSuffix', { km: provider.distanceKm })}` : ''
    marker.bindPopup(`<strong>${provider.displayName}</strong><br>${provider.subSector}${distance}`)
    marker.on('click', () => emit('select-provider', provider.id))
    clusterGroup.addLayer(marker)
  }

  searcherMarker?.remove()
  searcherMarker = props.searcherPosition
    ? L.marker([props.searcherPosition.latitude, props.searcherPosition.longitude], { icon: searcherIcon }).addTo(map)
    : null

  radiusCircle?.remove()
  radiusCircle = props.searcherPosition && props.radiusKm
    ? L.circle([props.searcherPosition.latitude, props.searcherPosition.longitude], {
        radius: props.radiusKm * 1000,
        color: '#14A800',
        weight: 1,
        fillOpacity: 0.06,
      }).addTo(map)
    : null
}

onMounted(() => {
  const region = getRegionBySlug(props.regionSlug)
  if (!mapEl.value || !region) return

  const bounds = L.latLngBounds(
    [region.bounds.south, region.bounds.west],
    [region.bounds.north, region.bounds.east],
  )
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  map = L.map(mapEl.value, {
    center: [region.center.latitude, region.center.longitude],
    zoom: 12,
    minZoom: 10,
    maxBounds: bounds,
    maxBoundsViscosity: 1,
    zoomAnimation: !prefersReducedMotion,
    markerZoomAnimation: !prefersReducedMotion,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  clusterGroup = L.markerClusterGroup()
  map.addLayer(clusterGroup)

  renderMarkers()
})

onUnmounted(() => {
  map?.remove()
  map = null
})

watch([() => props.providers, () => props.searcherPosition, () => props.radiusKm], renderMarkers)
</script>

<template>
  <div ref="mapEl" class="h-[420px] w-full overflow-hidden rounded-card border border-hairline" />
</template>
