export type ReviewerUser = {
  login?: string | null
  type?: 'User' | 'Bot' | null
}

export function isBotReviewer(user: ReviewerUser | null | undefined): boolean {
  if (user === null || user === undefined) return false
  if (user.type === 'Bot') return true
  const login = user.login
  if (typeof login === 'string' && login.endsWith('[bot]')) return true
  return false
}
