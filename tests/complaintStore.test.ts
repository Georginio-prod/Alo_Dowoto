import { describe, expect, it } from 'vitest'
import { addComplaint, complaintReference, listComplaints } from '~~/server/utils/complaintStore'

describe('complaintStore (page Réclamation)', () => {
  it('ajoute une réclamation et la retrouve en tête de liste', () => {
    const before = listComplaints().length
    const added = addComplaint('prestataire', 'Prestataire injoignable', 'Aucune réponse depuis une semaine.', 'client@example.tg', 'user-1')

    const after = listComplaints()
    expect(after.length).toBe(before + 1)
    expect(after[0]?.id).toBe(added.id)
  })

  it('accepte une réclamation sans compte associé (visiteur non connecté)', () => {
    const added = addComplaint('technique', 'Erreur au paiement', "Le paiement Mobile Money échoue à chaque tentative.", 'visiteur@example.tg', null)
    expect(added.userId).toBeNull()
  })

  it('génère une référence courte et lisible à partir de l\'id', () => {
    const added = addComplaint('autre', 'Question générale', 'Comment fonctionne le service exactement ?', 'a@example.tg', null)
    const ref = complaintReference(added)
    expect(ref).toMatch(/^REF-[A-F0-9]{8}$/)
  })
})
