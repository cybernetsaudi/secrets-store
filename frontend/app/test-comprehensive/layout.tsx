'use client'

/**
 * Layout for test-comprehensive page
 * This ensures the test page doesn't inherit the main layout's header/navigation
 */
export default function TestComprehensiveLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}


