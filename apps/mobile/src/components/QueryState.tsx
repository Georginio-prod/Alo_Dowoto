import React from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, ErrorState, SkeletonList } from '@/design-system'

interface QueryStateProps<T> {
  isLoading: boolean
  isError: boolean
  data: T | undefined
  onRetry?: () => void
  isEmpty?: (data: T) => boolean
  emptyTitle?: string
  emptyMessage?: string
  emptyGlyph?: string
  children: (data: T) => React.ReactNode
}

/**
 * Enveloppe les quatre états d'un écran piloté par une requête (Phase 4) :
 * chargement (squelette), erreur (Réessayer), vide (pédagogique), contenu.
 * Évite de répéter cette logique dans chaque écran.
 */
export function QueryState<T>({
  isLoading,
  isError,
  data,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyMessage,
  emptyGlyph,
  children,
}: QueryStateProps<T>) {
  const { t } = useTranslation()
  if (isLoading && data === undefined) return <SkeletonList />
  if (isError && data === undefined)
    return <ErrorState message={t('common.genericError')} onRetry={onRetry} />
  if (data === undefined) return null
  if (isEmpty?.(data))
    return (
      <EmptyState
        title={emptyTitle ?? '—'}
        message={emptyMessage}
        glyph={emptyGlyph}
      />
    )
  return <>{children(data)}</>
}
