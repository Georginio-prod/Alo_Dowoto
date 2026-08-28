import { z } from 'zod'
import { isValidImageDataUrl } from '../../utils/imageDataUrl'

/**
 * Schéma de validation du domaine « vérification d'identité ». Porté **verbatim**
 * depuis `server/utils/apiValidationMisc.ts#submitVerificationSchema` (ADR-0016) :
 * mêmes messages français — condition du 400 iso vérifié par les tests. Les deux
 * pièces doivent être des data URI image acceptés (JPEG/PNG), même règle que les
 * avatars (`isValidImageDataUrl`, durcissement F1).
 */
export const submitVerificationSchema = z.object({
  idCardImage: z
    .unknown()
    .refine(isValidImageDataUrl, "La photo de la carte d'identité est requise (JPEG ou PNG, 5 Mo maximum)."),
  passportPhotoImage: z
    .unknown()
    .refine(isValidImageDataUrl, 'La photo passeport (fond blanc, format international) est requise (JPEG ou PNG, 5 Mo maximum).'),
})

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>
