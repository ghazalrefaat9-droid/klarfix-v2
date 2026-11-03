import { createHash, randomBytes } from 'crypto'

// Only the hash is stored, so a leaked database row cannot be turned into a working setup link.
export function createSetupToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashSetupToken(token) }
}

export function hashSetupToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function isWellFormedToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}
