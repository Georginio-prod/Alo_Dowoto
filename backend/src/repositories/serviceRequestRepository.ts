import type { PrismaClient, ServiceRequest as PrismaServiceRequest, ServiceRequestMatch as PrismaServiceRequestMatch } from '@prisma/client'
import { prisma } from '../config/prisma'

/** Représentation sérialisable d'une demande, indépendante de Prisma. */
export interface StoredServiceRequest {
  id: string
  userId: string
  title: string
  skills: string[]
  description: string
  budgetMax: number
  urgency: string
  location: string
  sector?: string
  createdAt: number
}

export interface StoredMatch {
  position: number
  providerId: string
  displayName: string
  subSector: string
  city: string
  verified: boolean
  rating: number
  reviewCount: number
  priceFrom: number
  experienceYears: number
  score: string
}

export interface StoredProviderMatch {
  request: StoredServiceRequest
  match: StoredMatch
}

function parseSkills(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every((skill) => typeof skill === 'string') ? parsed : []
  } catch {
    return []
  }
}

function toRequest(row: PrismaServiceRequest): StoredServiceRequest {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    skills: parseSkills(row.skills),
    description: row.description,
    budgetMax: row.budgetMax,
    urgency: row.urgency,
    location: row.location,
    sector: row.sector ?? undefined,
    createdAt: row.createdAt.getTime(),
  }
}

function toMatch(row: PrismaServiceRequestMatch): StoredMatch {
  return {
    position: row.position,
    providerId: row.providerId,
    displayName: row.displayName,
    subSector: row.subSector,
    city: row.city,
    verified: row.verified,
    rating: row.rating,
    reviewCount: row.reviewCount,
    priceFrom: row.priceFrom,
    experienceYears: row.experienceYears,
    score: row.score,
  }
}

export interface ServiceRequestRepository {
  create(request: StoredServiceRequest): Promise<StoredServiceRequest>
  findById(id: string): Promise<StoredServiceRequest | null>
  listByUser(userId: string): Promise<StoredServiceRequest[]>
  listRecent(limit: number): Promise<StoredServiceRequest[]>
  replaceMatches(requestId: string, matches: StoredMatch[]): Promise<void>
  listMatches(requestId: string): Promise<StoredMatch[]>
  listMatchesForProvider(providerId: string): Promise<StoredProviderMatch[]>
}

export function createServiceRequestRepository(db: PrismaClient): ServiceRequestRepository {
  return {
    async create(request) {
      const row = await db.serviceRequest.create({
        data: {
          id: request.id,
          userId: request.userId,
          title: request.title,
          skills: JSON.stringify(request.skills),
          description: request.description,
          budgetMax: request.budgetMax,
          urgency: request.urgency,
          location: request.location,
          sector: request.sector ?? null,
          createdAt: new Date(request.createdAt),
        },
      })
      return toRequest(row)
    },
    async findById(id) {
      const row = await db.serviceRequest.findUnique({ where: { id } })
      return row ? toRequest(row) : null
    },
    async listByUser(userId) {
      const rows = await db.serviceRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
      return rows.map(toRequest)
    },
    async listRecent(limit) {
      const rows = await db.serviceRequest.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
      return rows.map(toRequest)
    },
    async replaceMatches(requestId, matches) {
      await db.$transaction([
        db.serviceRequestMatch.deleteMany({ where: { requestId } }),
        db.serviceRequestMatch.createMany({
          data: matches.map((match) => ({
            requestId,
            position: match.position,
            providerId: match.providerId,
            displayName: match.displayName,
            subSector: match.subSector,
            city: match.city,
            verified: match.verified,
            rating: match.rating,
            reviewCount: match.reviewCount,
            priceFrom: match.priceFrom,
            experienceYears: match.experienceYears,
            score: match.score,
          })),
        }),
      ])
    },
    async listMatches(requestId) {
      const rows = await db.serviceRequestMatch.findMany({ where: { requestId }, orderBy: { position: 'asc' } })
      return rows.map(toMatch)
    },
    async listMatchesForProvider(providerId) {
      const rows = await db.serviceRequestMatch.findMany({
        where: { providerId },
        include: { request: true },
        orderBy: { request: { createdAt: 'desc' } },
      })
      return rows.map((row) => ({ request: toRequest(row.request), match: toMatch(row) }))
    },
  }
}

export const serviceRequestRepository = createServiceRequestRepository(prisma)
