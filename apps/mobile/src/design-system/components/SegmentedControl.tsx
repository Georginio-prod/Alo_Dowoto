import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface Segment<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
}

/** Sélecteur segmenté (ex. rôle chercheur/prestataire, urgence). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme()
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.colors.bg, borderRadius: theme.radii.field, padding: 4 },
      ]}
      accessibilityRole="tablist"
    >
      {segments.map((seg) => {
        const active = seg.value === value
        return (
          <Pressable
            key={seg.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(seg.value)}
            style={[
              styles.seg,
              {
                minHeight: theme.touchTarget.min - 8,
                borderRadius: theme.radii.field - 2,
                backgroundColor: active ? theme.colors.surface : 'transparent',
              },
              active && theme.shadows.sm,
            ]}
          >
            <Text variant="label" style={{ color: active ? theme.colors.ink : theme.colors.muted }}>
              {seg.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
})
