import React from 'react'
import { View } from 'react-native'
import { Icon, Text, useTheme, type IconName } from '@/design-system'

/**
 * Icône d'onglet au trait (Feather), avec libellé texte géré par la barre
 * d'onglets. Pastille de notification rouge optionnelle (ex. Messages).
 */
export function TabIcon({
  name,
  color,
  badge,
}: {
  name: IconName
  color: string
  badge?: number
}) {
  const theme = useTheme()
  return (
    <View>
      <Icon name={name} size={22} color={color} />
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -10,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: 8,
            backgroundColor: theme.colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, lineHeight: 14 }} allowFontScaling={false}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
