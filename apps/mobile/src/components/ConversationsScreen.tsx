import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Avatar, Card, Screen, Text, useTheme } from '@/design-system'
import { useConversations, type Conversation } from '@/features/missions'
import { QueryState } from './QueryState'

type Filter = 'all' | 'active' | 'unread'

/** Liste des conversations (design-edo §4.1) — onglets + aperçu + non-lus. */
export function ConversationsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const conversations = useConversations()
  const [filter, setFilter] = useState<Filter>('all')

  const apply = (list: Conversation[]) =>
    list.filter((c) =>
      filter === 'unread' ? (c.unreadCount ?? 0) > 0 : filter === 'active' ? !!c.status : true,
    )

  return (
    <Screen>
      <Text variant="h1">{t('messages.title')}</Text>

      {/* Onglets de filtre */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {(
          [
            ['all', 'Tous'],
            ['active', 'En cours'],
            ['unread', 'Non lus'],
          ] as [Filter, string][]
        ).map(([key, label]) => {
          const on = filter === key
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 8,
                borderRadius: theme.radii.pill,
                backgroundColor: on ? theme.colors.dark : theme.colors.surface,
                borderWidth: 1,
                borderColor: on ? theme.colors.dark : theme.colors.hairline,
              }}
            >
              <Text variant="caption" style={{ color: on ? '#fff' : theme.colors.ink }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <QueryState
        isLoading={conversations.isLoading}
        isError={conversations.isError}
        data={conversations.data?.conversations}
        onRetry={() => conversations.refetch()}
        isEmpty={(d) => apply(d).length === 0}
        emptyTitle={t('messages.empty')}
        emptyGlyph="💬"
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {apply(list).map((c) => {
              const unread = c.unreadCount ?? 0
              return (
                <Card key={c.id} onPress={() => router.push(`/mission/${c.id}`)}>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                    <Avatar name={c.otherPartyName} size={48} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyBold" numberOfLines={1}>
                        {c.otherPartyName || '—'}
                      </Text>
                      {c.otherPartySector ? (
                        <Text variant="caption" color="muted" numberOfLines={1}>
                          {c.otherPartySector}
                        </Text>
                      ) : null}
                      {c.lastMessage?.body ? (
                        <Text
                          variant="label"
                          color={unread > 0 ? 'ink' : 'muted'}
                          numberOfLines={1}
                          style={unread > 0 ? { fontFamily: theme.typography.bodyBold.fontFamily } : undefined}
                        >
                          {c.lastMessage.body}
                        </Text>
                      ) : null}
                    </View>
                    {unread > 0 ? (
                      <View
                        style={{
                          minWidth: 20,
                          height: 20,
                          paddingHorizontal: 5,
                          borderRadius: 10,
                          backgroundColor: theme.colors.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11 }} allowFontScaling={false}>
                          {unread > 9 ? '9+' : unread}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              )
            })}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
