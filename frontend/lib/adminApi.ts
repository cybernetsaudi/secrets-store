const CSRF_STORAGE_KEY = 'csrf_token'

export function setCsrfToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CSRF_STORAGE_KEY, token)
  } catch (_) {}
}

export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY)
  } catch (_) {
    return null
  }
}
