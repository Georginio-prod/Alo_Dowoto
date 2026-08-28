import { Readable } from 'node:stream'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'
import type { Request, Response } from 'express'
import { updatesService } from '../services/updatesService'

/**
 * Relais de fichiers de mise à jour Electron (#auto-update), porté iso depuis
 * `server/api/updates/[...file].get.ts` (ADR-0016). La résolution de la release
 * et l'ouverture de l'asset vivent dans `updatesService` ; ce contrôleur gère la
 * couche HTTP : relais des en-têtes de plage et streaming de l'octet-stream.
 */
export async function relayUpdateFile(req: Request, res: Response): Promise<void> {
  // Catch-all `[...file]` Nitro → wildcard Express : le nom de fichier est le
  // segment capturé (`latest.yml`, `WorkTogo-Admin-Setup-x.y.z.exe[.blockmap]`).
  const file = (req.params[0] as string | undefined) ?? ''

  const release = await updatesService.getLatestRelease()
  const asset = updatesService.findAsset(release, file)

  const range = typeof req.headers.range === 'string' ? req.headers.range : undefined
  const upstream = await updatesService.openAsset(asset.id, range, file)

  const isYml = file.endsWith('.yml')
  res.status(upstream.status)
  res.setHeader('Content-Type', isYml ? 'text/yaml; charset=utf-8' : 'application/octet-stream')
  // Reprend les en-têtes utiles au (re)téléchargement partiel côté updater.
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h)
    if (v) res.setHeader(h, v)
  }
  // Les métadonnées (latest.yml) doivent toujours être fraîches ; les binaires
  // sont immuables (nom versionné) et inutiles à mettre en cache ici.
  res.setHeader('Cache-Control', 'no-store')

  if (!upstream.body) {
    res.end()
    return
  }

  // Pont flux web (fetch) → flux Node (réponse Express). Une erreur de flux en
  // cours de transfert (en-têtes déjà envoyés) ne peut plus produire de réponse
  // d'erreur JSON : on coupe simplement la connexion, comme le ferait Nitro.
  const nodeStream = Readable.fromWeb(upstream.body as NodeWebReadableStream<Uint8Array>)
  nodeStream.on('error', () => {
    if (!res.destroyed) res.destroy()
  })
  nodeStream.pipe(res)
}
