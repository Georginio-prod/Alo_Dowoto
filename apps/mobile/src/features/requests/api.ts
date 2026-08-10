import { z } from 'zod'
import { request } from '@/services/http'
import {
  createRequestResponseSchema,
  serviceRequestSchema,
  type CreateRequestInput,
} from './types'

export async function createRequest(input: CreateRequestInput) {
  return request('/api/requests', {
    method: 'POST',
    body: input,
    schema: createRequestResponseSchema,
  })
}

export function listRequests() {
  return request('/api/requests', { schema: z.object({ requests: z.array(serviceRequestSchema) }) })
}

export function getRequest(id: string) {
  return request(`/api/requests/${id}`, {
    schema: z.object({ request: serviceRequestSchema }),
  })
}

export function getReceivedRequests() {
  return request('/api/requests/received', {
    schema: z.object({ requests: z.array(serviceRequestSchema) }),
  })
}
