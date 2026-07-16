import { describe, expect, it } from 'vitest'
import { buildGoogleAuthUrl, toGoogleProfile } from '~~/server/utils/googleAuth'

describe('googleAuth (#219 connexion avec Google)', () => {
  it("construit l'URL d'autorisation avec les bons paramètres", () => {
    const url = new URL(buildGoogleAuthUrl('client-123', 'http://localhost:3000/api/auth/google/callback', 'state-abc'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/google/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('state')).toBe('state-abc')
  })

  it('mappe le userinfo Google vers le profil interne (email normalisé)', () => {
    const profile = toGoogleProfile({
      sub: 'g-123',
      email: '  Marie.Dupont@Gmail.com ',
      email_verified: true,
      given_name: 'Marie',
      family_name: 'Dupont',
    })
    expect(profile).toEqual({
      googleId: 'g-123',
      email: 'marie.dupont@gmail.com',
      emailVerified: true,
      firstName: 'Marie',
      lastName: 'Dupont',
    })
  })

  it('rejette un userinfo sans sub ou sans email (cas limite)', () => {
    expect(toGoogleProfile({ email: 'a@b.com' })).toBeNull()
    expect(toGoogleProfile({ sub: 'g-1' })).toBeNull()
  })

  it("un email non vérifié est signalé comme tel (l'appelant refuse alors la connexion)", () => {
    const profile = toGoogleProfile({ sub: 'g-2', email: 'a@b.com' })
    expect(profile?.emailVerified).toBe(false)
  })
})
