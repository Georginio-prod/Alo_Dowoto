import { expect, type Page } from '@playwright/test'
import { signupViaApi, verifyIdentityViaApi, type TestUser } from './auth'

/**
 * Crée un compte prestataire *avec une fiche publiée* : c'est cette fiche qui
 * le rend visible dans la recherche (`/api/providers/search`). Sans elle, la
 * base de test étant vierge, tous les écrans de résultats seraient vides.
 */
export async function createVisibleProvider(
  page: Page,
  overrides: { sector?: string; city?: string; description?: string; verified?: boolean } = {},
): Promise<TestUser> {
  const user = await signupViaApi(page, 'prestataire')

  // Un prestataire non vérifié ne peut pas être contacté (voir
  // server/api/conversations/index.post.ts) : les tests de messagerie ont donc
  // besoin d'un compte vérifié, comme un vrai prestataire actif.
  if (overrides.verified !== false) await verifyIdentityViaApi(page)

  const response = await page.request.patch('/api/providers/me', {
    data: {
      sector: overrides.sector ?? 'btp',
      city: overrides.city ?? 'Lomé',
      payoutMethod: 'tmoney',
      description: overrides.description ?? 'Plomberie, dépannage et installation sanitaire.',
      rateFrom: 5000,
      rateTo: 15000,
      mobility: 'client',
      availability: 'Lundi au samedi',
    },
  })
  expect(response.ok(), `PATCH /api/providers/me → ${response.status()} ${await response.text()}`).toBeTruthy()

  return user
}
