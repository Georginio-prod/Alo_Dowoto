export interface FavoriteItem {
  providerId: string
  createdAt: number
  provider: ReturnType<typeof getProviderById>
}

export default defineEventHandler((event) => {
  const user = requireClientRole(event)
  const favorites: FavoriteItem[] = listFavorites(user.id).map((favorite) => ({
    providerId: favorite.providerId,
    createdAt: favorite.createdAt,
    // Les favoris ne correspondent pas forcément à un prestataire de
    // l'annuaire de démonstration (#43) : on renvoie alors `provider: null`
    // et l'appelant retombe sur le seul `providerId`.
    provider: getProviderById(favorite.providerId),
  }))
  return { favorites }
})
