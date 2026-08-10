import React from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { palette } from '../tokens'
import { Text } from './Text'

export interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * Feuille de sélection basse (bottom sheet) et modale reposent sur la même
 * primitive Modal RN. `Sheet` s'ancre en bas (actions à une main, Phase 4).
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radii.card,
            borderTopRightRadius: theme.radii.card,
            paddingBottom: insets.bottom + theme.spacing.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.hairline }]} />
        {title ? (
          <Text variant="h2" style={styles.title}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </Modal>
  )
}

/** Modale centrée — même primitive, ancrage centre. */
export function CenterModal({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View
          style={[
            styles.centerCard,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card },
          ]}
        >
          {title ? (
            <Text variant="h2" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  title: { marginBottom: 4 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerCard: { width: '100%', maxWidth: 400, padding: 24, gap: 12 },
})
