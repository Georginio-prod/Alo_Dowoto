import { extractSessionToken } from '../http'

describe('extractSessionToken (auth cookie wt_session)', () => {
  it('extrait le jeton depuis un en-tête Set-Cookie', () => {
    const header = 'wt_session=abc123def; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax'
    expect(extractSessionToken(header)).toBe('abc123def')
  })
  it('renvoie null si le cookie est absent', () => {
    expect(extractSessionToken('other=1; Path=/')).toBeNull()
    expect(extractSessionToken(null)).toBeNull()
  })
  it('gère un jeton avec caractères URL-safe', () => {
    expect(extractSessionToken('wt_session=eyJ.abc-_1; Path=/')).toBe('eyJ.abc-_1')
  })
})
