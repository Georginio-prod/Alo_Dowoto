import { describe, expect, it } from 'vitest'
import { consumeVerifiedContact, generateOtp, verifyOtp } from '~~/server/utils/otpStore'

async function sendOtp(contact: string): Promise<string> {
  const result = await generateOtp(contact)
  if (!result.ok) throw new Error('OTP non envoyé (cooldown inattendu dans le test)')
  return result.code
}

describe('otpStore (#21 vérification OTP, persistance #218)', () => {
  it('vérifie un code correct', async () => {
    const contact = '+22890000001'
    const code = await sendOtp(contact)
    expect(await verifyOtp(contact, code)).toEqual({ ok: true })
  })

  it('rejette un code erroné (cas limite)', async () => {
    const contact = '+22890000002'
    await sendOtp(contact)
    expect(await verifyOtp(contact, '000000')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejette un code pour un contact sans OTP envoyé', async () => {
    expect(await verifyOtp('+22890000099', '123456')).toEqual({ ok: false, reason: 'expired' })
  })

  it('bloque après trop de tentatives (cas limite)', async () => {
    const contact = '+22890000003'
    await sendOtp(contact)
    for (let i = 0; i < 5; i++) await verifyOtp(contact, '000000')
    expect(await verifyOtp(contact, '000000')).toEqual({ ok: false, reason: 'too_many_attempts' })
  })

  it('empêche le renvoi immédiat du code (cooldown)', async () => {
    const contact = '+22890000004'
    await generateOtp(contact)
    const second = await generateOtp(contact)
    expect(second.ok).toBe(false)
  })

  it('marque le contact comme vérifié une seule fois (usage unique)', async () => {
    const contact = '+22890000005'
    const code = await sendOtp(contact)
    await verifyOtp(contact, code)
    expect(await consumeVerifiedContact(contact)).toBe(true)
    expect(await consumeVerifiedContact(contact)).toBe(false)
  })
})
