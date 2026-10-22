import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from '@/contexts/CartContext'
import AppThemeProvider from '@/components/AppThemeProvider'
import CollectionAmbience from '@/components/CollectionAmbience'
import Header from '@/components/Header'
import ConditionalHeader from '@/components/ConditionalHeader'
import ConditionalFooter from '@/components/ConditionalFooter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GATVIA — Fashion Store',
  description: 'Classic, Premium, Designer & Limited Edition garments for men, women, and children',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <AppThemeProvider>
            <CollectionAmbience />
            <ConditionalHeader />
            {children}
            <ConditionalFooter />
            <Toaster position="top-right" />
          </AppThemeProvider>
        </CartProvider>
      </body>
    </html>
  )
}
