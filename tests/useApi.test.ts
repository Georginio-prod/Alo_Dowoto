import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, useApi } from '~/composables/useApi'

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('always sends session cookies with same-origin API calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('$fetch', fetchMock)

    await apiFetch('/api/example', { method: 'POST', credentials: 'omit' })

    expect(fetchMock).toHaveBeenCalledWith('/api/example', {
      method: 'POST',
      credentials: 'include',
    })
  })

  it('exposes the same client through the composable', () => {
    expect(useApi().apiFetch).toBe(apiFetch)
  })
})
