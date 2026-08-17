export interface FavoriteItem {
  providerId: string
  createdAt: number
  provider: Awaited<ReturnType<typeof getProviderById>>
}

export default defineEventHandler(async (event) => {
  const user = await requireClientRole(event)
  const favorites: FavoriteItem[] = await Promise.all(
    (await listFavorites(user.id)).map(async (favorite) => ({
      providerId: favorite.providerId,
      createdAt: favorite.createdAt,
      // Les favoris ne correspondent pas forcément à un prestataire de
      // l'annuaire de démonstration (#43) : on renvoie alors `provider: null`
      // et l'appelant retombe sur le seul `providerId`.
      provider: await getProviderById(favorite.providerId),
    })),
  )
  return { favorites }
})
