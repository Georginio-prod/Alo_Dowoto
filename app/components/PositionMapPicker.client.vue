<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { getRegionBySlug } from '~~/app/data/regions'

/**
 * Sélection de position par glisser-déposer (#geoloc, 1.2/1.4) : « la
 * méthode la plus fiable localement » d'après le besoin, l'adressage
 * classique étant peu utilisable dans de nombreux quartiers de Lomé.
 * Suffixe `.client` comme ProviderMap.client.vue — jamais rendu côté
 * serveur. Volontairement distinct de ProviderMap.client.vue : un seul
 * marqueur déplaçable, pas de clustering ni de cercle de rayon, un besoin
 * différent (se positionner soi-même, pas explorer des résultats).
 */
const props = withDefaults(
  defineProps<{ latitude?: number; longitude?: number; regionSlug?: string }>(),
  { latitude: undefined, longitude: undefined, regionSlug: 'maritime' },
)

const emit = defineEmits<{ 'update:latitude': [number]; 'update:longitude': [number] }>()

const { t } = useI18n({ useScope: 'global' })

type IconDefaultPrototype = typeof L.Icon.Default.prototype & { _getIconUrl?: string }
delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

const mapEl = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

function setPosition(lat: number, lng: number) {
  emit('update:latitude', lat)
  emit('update:longitude', lng)
  marker?.setLatLng([lat, lng])
}

onMounted(() => {
  const region = getRegionBySlug(props.regionSlug)
  if (!mapEl.value || !region) return

  const bounds = L.latLngBounds(
    [region.bounds.south, region.bounds.west],
    [region.bounds.north, region.bounds.east],
  )
  const start: L.LatLngTuple = props.latitude !== undefined && props.longitude !== undefined
    ? [props.latitude, props.longitude]
    : [region.center.latitude, region.center.longitude]

  map = L.map(mapEl.value, {
    center: start,
    zoom: 13,
    minZoom: 10,
    maxBounds: bounds,
    maxBoundsViscosity: 1,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  marker = L.marker(start, { draggable: true }).addTo(map)
  marker.on('dragend', () => {
    const position = marker?.getLatLng()
    if (position) setPosition(position.lat, position.lng)
  })
  map.on('click', (event: L.LeafletMouseEvent) => setPosition(event.latlng.lat, event.latlng.lng))
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div>
    <div ref="mapEl" class="h-[260px] w-full overflow-hidden rounded-field border border-hairline" />
    <p class="mt-1.5 text-[11.5px] text-muted">
      {{ t('positionMapPicker.helperText') }}
    </p>
  </div>
</template>
