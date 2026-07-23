import { describe, expect, it } from 'vitest'
import { addComplaint, complaintReference, listComplaints } from '~~/server/utils/complaintStore'

describe('complaintStore (page Réclamation, persistance #357)', () => {
  it('ajoute une réclamation et la retrouve en tête de liste', async () => {
    const before = (await listComplaints()).length
    const added = await addComplaint('prestataire', 'Prestataire injoignable', 'Aucune réponse depuis une semaine.', 'client@example.tg', 'user-1')

    const after = await listComplaints()
    expect(after.length).toBe(before + 1)
    expect(after[0]?.id).toBe(added.id)
  })

  it('accepte une réclamation sans compte associé (visiteur non connecté)', async () => {
    const added = await addComplaint('technique', 'Erreur au paiement', "Le paiement Mobile Money échoue à chaque tentative.", 'visiteur@example.tg', null)
    expect(added.userId).toBeNull()
  })

  it('génère une référence courte et lisible à partir de l\'id', async () => {
    const added = await addComplaint('autre', 'Question générale', 'Comment fonctionne le service exactement ?', 'a@example.tg', null)
    const ref = complaintReference(added)
    expect(ref).toMatch(/^REF-[A-F0-9]{8}$/)
  })
})
