import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRequest, getReceivedRequests, getRequest, listRequests } from './api'
import type { CreateRequestInput } from './types'

export function useRequests() {
  return useQuery({ queryKey: ['requests'], queryFn: listRequests })
}

export function useRequest(id: string) {
  return useQuery({ queryKey: ['requests', id], queryFn: () => getRequest(id), enabled: !!id })
}

export function useReceivedRequests() {
  return useQuery({ queryKey: ['requests', 'received'], queryFn: getReceivedRequests })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRequestInput) => createRequest(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  })
}
