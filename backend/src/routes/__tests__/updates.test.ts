import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createServer } from '../../config/server'
import { createUpdatesService, type GhRelease } from '../../services/updatesService'

/**
 * Contrat du relais de mises à jour Electron (#auto-update) porté vers Express
 * (Phase 2, ADR-0016). La logique (cache release, résolution d'asset, relais de
 * plage, erreurs 500/502/404) est testée sur le service avec un `fetch` injecté
 * — aucun appel réseau réel — et le câblage HTTP via une requête sur l'app.
 */
describe('Contrat — relais de mises à jour (/api/updates)', () => {
  const repo = 'org/worktogo-admin'
  const release: GhRelease = {
    tag_name: 'v1.2.3',
    assets: [
      { id: 42, name: 'latest.yml', size: 100 },
      { id: 43, name: 'WorkTogo-Admin-Setup-1.2.3.exe', size: 5000 },
    ],
  }

  function jsonResponse(body: unknown, status = 200): Response {
    return { ok: status >= 200 && status < 300, status, json: async () => body, headers: new Headers(), body: null } as unknown as Response
  }

  describe('updatesService', () => {
    it('sans jeton configuré → 500 explicite', async () => {
      const svc = createUpdatesService({ token: '', repo, fetchImpl: vi.fn() })
      await expect(svc.getLatestRelease()).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('non configuré'),
      })
    })

    it('met la release en cache (un seul appel GitHub pour deux lectures)', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(release))
      const svc = createUpdatesService({ token: 'tok', repo, fetchImpl: fetchImpl as unknown as typeof fetch })

      expect((await svc.getLatestRelease()).tag_name).toBe('v1.2.3')
      await svc.getLatestRelease()
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      // Jeton en Bearer + en-tête d'API GitHub.
      const [, init] = fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit]
      expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' })
    })

    it('GitHub injoignable → 502', async () => {
      const svc = createUpdatesService({ token: 'tok', repo, fetchImpl: (async () => jsonResponse({}, 500)) as unknown as typeof fetch })
      await expect(svc.getLatestRelease()).rejects.toMatchObject({ statusCode: 502 })
    })

    it('findAsset : trouvé, sinon 404', () => {
      const svc = createUpdatesService({ token: 'tok', repo, fetchImpl: vi.fn() })
      expect(svc.findAsset(release, 'latest.yml').id).toBe(42)
      expect(() => svc.findAsset(release, 'absent.exe')).toThrow(/introuvable/)
    })

    it('openAsset : propage le Range et accepte un 206', async () => {
      const fetchImpl = vi.fn(async () => ({ ok: false, status: 206, headers: new Headers({ 'content-range': 'bytes 0-9/5000' }), body: null } as unknown as Response))
      const svc = createUpdatesService({ token: 'tok', repo, fetchImpl: fetchImpl as unknown as typeof fetch })

      const upstream = await svc.openAsset(43, 'bytes=0-9', 'WorkTogo-Admin-Setup-1.2.3.exe')
      expect(upstream.status).toBe(206)
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit]
      expect(String(url)).toContain('/releases/assets/43')
      expect(init.headers).toMatchObject({ Range: 'bytes=0-9', Accept: 'application/octet-stream' })
    })

    it('openAsset : échec GitHub (hors 206) → 502', async () => {
      const svc = createUpdatesService({ token: 'tok', repo, fetchImpl: (async () => jsonResponse({}, 404)) as unknown as typeof fetch })
      await expect(svc.openAsset(43, undefined, 'x.exe')).rejects.toMatchObject({ statusCode: 502 })
    })
  })

  describe('route', () => {
    it('GET /api/updates/latest.yml sans configuration → 500 au format Nitro', async () => {
      // Le singleton du relais lit `env.githubUpdateToken`, vide en test.
      const res = await request(createServer()).get('/api/updates/latest.yml')
      expect(res.status).toBe(500)
      expect(res.body).toMatchObject({ error: true, statusCode: 500 })
      expect(res.body.message).toContain('non configuré')
    })
  })
})
