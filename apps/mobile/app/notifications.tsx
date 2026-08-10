import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useMarkNotificationsRead, useNotifications } from '@/features/notifications'
import { QueryState } from '@/components/QueryState'

/** Notifications (reprend le centre de notifications web). */
export default function Notifications() {
  const { t } = useTranslation()
  const theme = useTheme()
  const notifications = useNotifications()
  const markRead = useMarkNotificationsRead()

  return (
    <Screen>
      <ScreenHeader
        title={t('notifications.title')}
        back
        right={
          <Button
            label={t('notifications.markRead')}
            variant="ghost"
            fullWidth={false}
            onPress={() => {
              const ids = notifications.data?.notifications.map((n) => n.id) ?? []
              if (ids.length) markRead.mutate(ids)
            }}
          />
        }
      />
      <QueryState
        isLoading={notifications.isLoading}
        isError={notifications.isError}
        data={notifications.data?.notifications}
        onRetry={() => notifications.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('notifications.empty')}
        emptyGlyph="🔔"
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((n) => (
              <Card key={n.id} elevation={n.read ? 'none' : 'sm'}>
                <Text variant="bodyBold">{n.title}</Text>
                {n.body ? (
                  <Text variant="label" color="muted">
                    {n.body}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
