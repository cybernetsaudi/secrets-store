// Server component wrapper to generate static params
// For static export, we MUST return at least one param to ensure the route is registered
// The actual product data is fetched client-side, so any product ID will work
// We generate a template page with a placeholder ID, then all IDs work via client-side routing
export async function generateStaticParams() {
  try {
    // Use environment variable or default - server-side, so we can't use window.location
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gatvia.pk/api'
    const response = await fetch(`${apiUrl}/products`, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      // API not available - return a placeholder to ensure route is registered
      // This ensures the route handler exists for client-side routing
      return [{ id: '1' }]
    }
    
    const data = await response.json()
    const products = data.results || data || []
    
    if (products.length === 0) {
      // Return a placeholder to ensure route is registered
      return [{ id: '1' }]
    }
    
    // Generate pages for existing products for better initial load
    // The page will work for ANY product ID via client-side routing, even if not listed here
    return products.map((product: any) => ({
      id: product.id.toString(),
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    // Return a placeholder to ensure route is registered
    // This is critical - empty array means route won't exist in static export
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

