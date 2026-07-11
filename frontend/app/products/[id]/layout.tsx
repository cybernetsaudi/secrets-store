// Server component wrapper to generate static params
// For static export, we MUST return at least one param to ensure the route is registered.
// The actual product data is fetched client-side, but we still prebuild pages for all
// known product IDs at build time for faster initial load.
export async function generateStaticParams() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
    const response = await fetch(`${apiUrl}/products`, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      // API not available - return a placeholder to ensure route is registered
      return [{ id: '1' }]
    }
    
    const data = await response.json()
    const products = data.results || data || []
    
    if (products.length === 0) {
      // Return a placeholder to ensure route is registered
      return [{ id: '1' }]
    }
    
    // Generate pages for existing products for better initial load.
    return products.map((product: any) => ({
      id: product.id.toString(),
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    // Return a placeholder to ensure route is registered
    return [{ id: '1' }]
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

