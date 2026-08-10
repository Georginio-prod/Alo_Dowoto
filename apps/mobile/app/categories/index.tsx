import React from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { SECTORS } from '@/data/sectors'

/** Liste des catégories (reprend categories/index.vue). */
export default function Categories() {
  const { t } = useTranslation()
  const theme = useTheme()
  return (
    <Screen>
      <ScreenHeader title={t('categories.title')} back />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {SECTORS.map((s) => (
          <Pressable
            key={s.slug}
            onPress={() => router.push(`/categories/${s.slug}`)}
            style={{
              width: '47%',
              minHeight: 96,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.card,
              borderWidth: 1,
              borderColor: theme.colors.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="h1">{s.emoji}</Text>
            <Text variant="label" center>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  )
}
