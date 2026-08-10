import React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Avatar,
  Card,
  Icon,
  IconTile,
  OfflineBanner,
  StatusBadge,
  Text,
  useTheme,
} from '@/design-system'
import { SECTORS } from '@/data/sectors'
import { SectorCard } from '@/components/SectorCard'
import { useSessionStore } from '@/features/auth/store'
import { useWallet } from '@/features/payments'
import { useConversations } from '@/features/missions'
import { formatFcfa } from '@/features/pricing/utils'

/** Accueil client (design-edo §2.1). */
export default function ChercheurHome() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const wallet = useWallet()
  const conversations = useConversations()

  const active = conversations.data?.conversations[0]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <OfflineBanner />
      {/* Barre supérieure : marque + pastille solde */}
      <View style={styles(theme).topbar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconTile glyph="W" color={theme.colors.primary} size={30} />
          <Text variant="bodyBold" style={{ fontFamily: theme.typography.h1.fontFamily, fontSize: 18 }}>
            WorkTogo
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(chercheur)/solde')}
          style={[styles(theme).walletPill, { borderRadius: theme.radii.pill }]}
        >
          <Icon name="credit-card" size={15} color={theme.colors.primary} />
          <Text variant="caption" style={{ color: theme.colors.dark, fontFamily: theme.typography.bodyBold.fontFamily }}>
            {formatFcfa(wallet.data?.balance ?? 0)}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1">
          {t('home.hello', { name: user?.firstName || '👋' })}
        </Text>

        {/* Champ de recherche */}
        <Pressable onPress={() => router.push('/(chercheur)/recherche')}>
          <View style={[styles(theme).searchBar, { borderRadius: theme.radii.field }]}>
            <Icon name="search" size={18} color={theme.colors.muted} />
            <Text color="muted">{t('home.searchPlaceholder')}</Text>
          </View>
        </Pressable>

        {/* Secteurs */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="h2">{t('home.categories')}</Text>
          <Pressable onPress={() => router.push('/categories')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="label" color="primary">
              {t('common.seeAll')}
            </Text>
            <Icon name="chevron-right" size={15} color={theme.colors.primary} />
          </Pressable>
        </View>
        <View style={{ gap: theme.spacing.md }}>
          {rows(SECTORS.slice(0, 4)).map((pair, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              {pair.map((s) => (
                <SectorCard key={s.slug} sector={s} onPress={() => router.push(`/categories/${s.slug}`)} />
              ))}
            </View>
          ))}
        </View>

        {/* Reprendre là où vous étiez */}
        {active ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="h2">Reprendre là où vous étiez</Text>
            <Card onPress={() => router.push(`/mission/${active.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Avatar name={active.otherPartyName} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyBold" numberOfLines={1}>
                    {active.otherPartyName || '—'}
                  </Text>
                  <Text variant="label" color="muted" numberOfLines={1}>
                    {active.lastMessage?.body || active.otherPartySector || t('mission.title')}
                  </Text>
                </View>
                {(active.unreadCount ?? 0) > 0 ? (
                  <StatusBadge label={String(active.unreadCount)} tone="danger" />
                ) : (
                  <Icon name="chevron-right" size={18} color={theme.colors.muted} />
                )}
              </View>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function rows<T>(arr: readonly T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2) as T[])
  return out
}

const styles = (theme: ReturnType<typeof useTheme>) => ({
  topbar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  walletPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    paddingHorizontal: 14,
    minHeight: 50,
  },
})
