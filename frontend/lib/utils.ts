/**
 * Utility functions for domain and URL handling
 */

/**
 * Get the current base URL (domain) dynamically
 * Works in both browser and server environments
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use current origin
    return window.location.origin
  }
  // Server environment - use environment variable or fallback
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://secrets.gatvia.com'
}

/**
 * Get the API URL dynamically
 * Uses current domain to construct API URL
 */
export function getApiUrl(): string {
  const baseUrl = getBaseUrl()
  // If baseUrl already ends with /api, return as-is
  if (baseUrl.endsWith('/api')) {
    return baseUrl
  }
  // Otherwise append /api
  return `${baseUrl}/api`
}

/**
 * Get image URL - converts relative paths to absolute URLs
 */
export function getImageUrl(url: string): string {
  if (!url) return ''
  
  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Relative path starting with /api/ or / - prepend base URL
  const baseUrl = getBaseUrl()
  if (url.startsWith('/api/') || url.startsWith('/')) {
    return `${baseUrl}${url}`
  }
  
  // Other relative paths - prepend base URL with /
  return `${baseUrl}/${url}`
}

