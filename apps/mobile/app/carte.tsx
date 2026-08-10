import React, { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, UrlTile } from 'react-native-maps'
import { Avatar, Button, Card, Icon, StatusBadge, Text, useTheme } from '@/design-system'
import { providerMeta, providerName, useProviderSearch, type Provider } from '@/features/providers'
import { formatFcfa } from '@/features/pricing/utils'

/** Vue carte des résultats (design-edo §2.5). Tuiles OSM (sans clé Google). */
const LOME = { latitude: 6.1319, longitude: 1.2228, latitudeDelta: 0.12, longitudeDelta: 0.12 }

export default function Carte() {
  const theme = useTheme()
  const { sector, q } = useLocalSearchParams<{ sector?: string; q?: string }>()
  const search = useProviderSearch({ sector, q })
  const providers = search.data?.providers ?? []
  const withCoords = providers.filter((p) => p.latitude != null && p.longitude != null)
  const [selected, setSelected] = useState<Provider | null>(null)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <View style={{ flex: 1 }}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={LOME}>
          {/* Fond OpenStreetMap : rend la carte sans clé Google Maps. */}
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
          {withCoords.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude as number, longitude: p.longitude as number }}
              onPress={() => setSelected(p)}
            >
              <View style={[styles.pin, { backgroundColor: theme.colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 11 }} allowFontScaling={false}>
                  ★ {p.rating ? p.rating.toFixed(1) : '?'}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Bouton retour liste */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.listBtn, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill }, theme.shadows.md]}
        >
          <Icon name="arrow-left" size={16} color={theme.colors.ink} />
          <Text variant="caption" style={{ fontFamily: theme.typography.bodyBold.fontFamily }}>
            Liste
          </Text>
        </Pressable>

        {/* Carte prestataire sélectionné */}
        {selected ? (
          <View style={styles.bottomCard}>
            <Card elevation="lg">
              <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                <Avatar uri={selected.photoUrl} name={providerName(selected)} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                      {providerName(selected)}
                    </Text>
                    {selected.verified ? <StatusBadge label="Vérifié" tone="success" glyph="✓" /> : null}
                  </View>
                  <Text variant="caption" color="muted" numberOfLines={1}>
                    {providerMeta(selected)}
                    {selected.priceFrom ? ` · dès ${formatFcfa(selected.priceFrom)}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: theme.spacing.md }}>
                <Button label="Voir le profil" onPress={() => router.push(`/prestataire/${selected.id}`)} haptic />
              </View>
            </Card>
          </View>
        ) : withCoords.length === 0 ? (
          <View style={styles.bottomCard}>
            <Card>
              <Text variant="label" color="muted" center>
                Aucun prestataire géolocalisé pour cette recherche. Touchez « Liste » pour la vue
                détaillée.
              </Text>
            </Card>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  pin: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
  },
  listBtn: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bottomCard: { position: 'absolute', left: 16, right: 16, bottom: 24 },
})
