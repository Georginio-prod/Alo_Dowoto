import { randomUUID } from 'node:crypto'
import type { ComplaintCategory } from '~/data/complaintCategories'

/**
 * Store en mémoire pour les réclamations déposées depuis /reclamation.
 * Remplace l'ancienne soumission purement locale (aucune route API, voir
 * l'historique de app/pages/reclamation.vue) par un vrai circuit, en
 * mémoire comme le reste de l'app tant qu'il n'y a pas de base de données
 * (voir #45/#46). Pas d'interface d'administration pour consulter/traiter
 * les réclamations dans ce lot — hors périmètre, seule la soumission est
 * couverte.
 *
 * La liste des catégories (COMPLAINT_CATEGORIES) vit dans
 * app/data/complaintCategories.ts, pas ici : ce fichier importe
 * `node:crypto` et ne doit jamais être importé (en valeur) depuis du code
 * client, sous peine d'échec du build Vite (module Node externalisé côté
 * navigateur).
 */

export type { ComplaintCategory }

export interface Complaint {
  id: string
  category: ComplaintCategory
  subject: string
  message: string
  /** Email de contact pour le suivi — pré-rempli depuis le compte si connecté, sinon fourni par l'utilisateur (voir #129, même logique que FirstContactForm). */
  contactEmail: string
  userId: string | null
  createdAt: number
}

const complaints: Complaint[] = []

export function addComplaint(
  category: ComplaintCategory,
  subject: string,
  message: string,
  contactEmail: string,
  userId: string | null,
): Complaint {
  const complaint: Complaint = {
    id: randomUUID(),
    category,
    subject,
    message,
    contactEmail,
    userId,
    createdAt: Date.now(),
  }
  complaints.push(complaint)
  return complaint
}

export function listComplaints(): Complaint[] {
  return [...complaints].sort((a, b) => b.createdAt - a.createdAt)
}

/** Référence courte et lisible affichée à l'utilisateur pour le suivi de sa réclamation. */
export function complaintReference(complaint: Complaint): string {
  return `REF-${complaint.id.slice(0, 8).toUpperCase()}`
}
