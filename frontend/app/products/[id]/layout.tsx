import { PRODUCT_STATIC_TEMPLATE_ID } from '@/lib/staticExport'

/**
 * Single template page for all /products/{id}/ URLs (Option A).
 * Catalog changes do not require a frontend rebuild.
 */
export async function generateStaticParams() {
  return [{ id: PRODUCT_STATIC_TEMPLATE_ID }]
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
