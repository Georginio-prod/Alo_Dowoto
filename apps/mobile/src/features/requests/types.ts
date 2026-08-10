import { z } from 'zod'

/** Miroir de createServiceRequestSchema (server/utils/apiValidation.ts). */
export const createRequestSchema = z.object({
  title: z.string().min(3),
  skills: z.array(z.string()).min(1),
  description: z.string().min(1),
  budgetMax: z.number().positive(),
  urgency: z.enum(['immediate', 'semaine', 'flexible']),
  location: z.string().min(1),
  sector: z.string().optional(),
})
export type CreateRequestInput = z.infer<typeof createRequestSchema>

export const serviceRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  skills: z.array(z.string()).optional().default([]),
  budgetMax: z.number().optional(),
  urgency: z.enum(['immediate', 'semaine', 'flexible']).optional(),
  location: z.string().optional().default(''),
  sector: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
})
export type ServiceRequest = z.infer<typeof serviceRequestSchema>

export const matchSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  name: z.string().optional(),
  score: z.number().optional(),
})
export type Match = z.infer<typeof matchSchema>

export const createRequestResponseSchema = z.object({
  request: serviceRequestSchema,
  matches: z.array(matchSchema).optional().default([]),
})
