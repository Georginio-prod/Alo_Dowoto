import { describe, expect, it } from 'vitest'
import { detectContournementAttempt } from '~~/server/utils/contournementDetector'

describe('detectContournementAttempt (#265, anti-fuite dans la messagerie)', () => {
  it('détecte un numéro de téléphone togolais avec espaces', () => {
    expect(detectContournementAttempt('Vous pouvez me joindre au 90 12 34 56')).toBe('phone')
  })

  it('détecte un numéro avec indicatif international', () => {
    expect(detectContournementAttempt('Appelez le +228 90 12 34 56 directement')).toBe('phone')
  })

  it('détecte une adresse e-mail', () => {
    expect(detectContournementAttempt('Écrivez-moi à jean.dupont@example.com')).toBe('email')
  })

  it('détecte une mention de paiement hors plateforme', () => {
    expect(detectContournementAttempt('On peut faire ça en cash, hors app si vous préférez')).toBe('off_platform_mention')
  })

  it("ne bloque pas un message ordinaire sans coordonnées ni mention hors plateforme", () => {
    expect(detectContournementAttempt('Bonjour, êtes-vous disponible demain matin ?')).toBeNull()
  })

  it('ne bloque pas la mention d’un prix raisonnable (peu de chiffres)', () => {
    expect(detectContournementAttempt('Le tarif est de 15 000 FCFA pour cette prestation.')).toBeNull()
  })

  it('ne bloque pas une date écrite avec des barres obliques (pas un numéro de téléphone)', () => {
    expect(detectContournementAttempt('Je suis disponible le 12/07/2026 à 14h.')).toBeNull()
  })
})
