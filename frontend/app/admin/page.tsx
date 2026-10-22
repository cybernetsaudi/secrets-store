'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /admin/ has no standalone content — send users to login (or dashboard after auth).
 */
export default function AdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

    fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          router.replace('/admin/dashboard/')
        } else {
          router.replace('/admin/login/')
        }
      })
      .catch(() => {
        router.replace('/admin/login/')
      })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="mt-4 text-sm text-gray-400">Loading admin…</p>
      </div>
    </div>
  )
}
