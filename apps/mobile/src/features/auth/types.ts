import { z } from 'zod'

/** Utilisateur public renvoyé par /api/auth/session (toPublicUser). */
export const userSchema = z.object({
  id: z.string(),
  role: z.enum(['client', 'prestataire']),
  username: z.string().optional().default(''),
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  location: z.string().optional().default(''),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  verified: z.boolean().optional(),
})
export type User = z.infer<typeof userSchema>

export const sessionResponseSchema = z.object({ user: userSchema })

export type ContactMethod = 'phone' | 'email'
export type Role = 'client' | 'prestataire'

export interface RegisterPayload {
  method: ContactMethod
  value: string
  role: Role
  username?: string
  firstName?: string
  lastName?: string
  location?: string
  latitude?: number
  longitude?: number
  referralCode?: string
  password?: string
}
