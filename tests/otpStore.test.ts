import { describe, expect, it } from 'vitest'
import { consumeVerifiedContact, generateOtp, verifyOtp } from '~~/server/utils/otpStore'

function sendOtp(contact: string): string {
  const result = generateOtp(contact)
  if (!result.ok) throw new Error('OTP non envoyé (cooldown inattendu dans le test)')
  return result.code
}

describe('otpStore (#21 vérification OTP)', () => {
  it('vérifie un code correct', () => {
    const contact = '+22890000001'
    const code = sendOtp(contact)
    expect(verifyOtp(contact, code)).toEqual({ ok: true })
  })

  it('rejette un code erroné (cas limite)', () => {
    const contact = '+22890000002'
    sendOtp(contact)
    expect(verifyOtp(contact, '000000')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejette un code pour un contact sans OTP envoyé', () => {
    expect(verifyOtp('+22890000099', '123456')).toEqual({ ok: false, reason: 'expired' })
  })

  it('bloque après trop de tentatives (cas limite)', () => {
    const contact = '+22890000003'
    sendOtp(contact)
    for (let i = 0; i < 5; i++) verifyOtp(contact, '000000')
    expect(verifyOtp(contact, '000000')).toEqual({ ok: false, reason: 'too_many_attempts' })
  })

  it('empêche le renvoi immédiat du code (cooldown)', () => {
    const contact = '+22890000004'
    generateOtp(contact)
    const second = generateOtp(contact)
    expect(second.ok).toBe(false)
  })

  it('marque le contact comme vérifié une seule fois (usage unique)', () => {
    const contact = '+22890000005'
    const code = sendOtp(contact)
    verifyOtp(contact, code)
    expect(consumeVerifiedContact(contact)).toBe(true)
    expect(consumeVerifiedContact(contact)).toBe(false)
  })
})
