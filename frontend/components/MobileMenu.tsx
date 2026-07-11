'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import CurrencySelector from './CurrencySelector'
import SearchBar from './SearchBar'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { itemCount } = useCart()
  const pathname = usePathname()

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with strong blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-gradient-to-br from-gray-900/95 via-[#003366]/90 to-gray-900/95 backdrop-blur-xl z-[9998] md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Full Screen Menu Container */}
          <motion.nav
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] md:hidden flex flex-col items-center justify-center p-6"
            role="navigation"
            aria-label="Main navigation"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
              {/* Glassmorphism Menu Card - Matching site design */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="w-full max-w-md rounded-3xl overflow-hidden bg-stone-800/90 border border-stone-700/50 backdrop-blur-3xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with gradient accent */}
                <div className="relative bg-gradient-to-r from-[#DC143C]/20 via-[#003366]/20 to-[#DC143C]/20 border-b border-stone-700/50 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DC143C] to-[#003366] flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">GU</span>
                      </div>
                      <h2 className="text-xl font-bold text-white">Menu</h2>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      aria-label="Close navigation menu"
                      className="p-2 text-stone-300 hover:text-white hover:bg-stone-700/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] rounded-lg"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Menu Content */}
                <div className="p-6 space-y-3">
                  {/* Search Bar - Mobile */}
                  <div className="mb-6">
                    <SearchBar onClose={() => setIsOpen(false)} mobile />
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-2">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Link
                        href="/"
                        className="flex items-center space-x-4 px-5 py-4 rounded-xl bg-stone-700/40 hover:bg-stone-700/60 border border-stone-600/30 hover:border-[#DC143C]/30 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] group"
                        onClick={() => {
                          setTimeout(() => setIsOpen(false), 150)
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#003366]/20 flex items-center justify-center group-hover:from-[#DC143C]/30 group-hover:to-[#003366]/30 transition-all">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <span className="font-semibold text-lg">Home</span>
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Link
                        href="/products/"
                        className="flex items-center space-x-4 px-5 py-4 rounded-xl bg-stone-700/40 hover:bg-stone-700/60 border border-stone-600/30 hover:border-[#DC143C]/30 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] group"
                        onClick={() => {
                          setTimeout(() => setIsOpen(false), 150)
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#003366]/20 flex items-center justify-center group-hover:from-[#DC143C]/30 group-hover:to-[#003366]/30 transition-all">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="font-semibold text-lg">Products</span>
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Link
                        href="/cart"
                        className="flex items-center space-x-4 px-5 py-4 rounded-xl bg-stone-700/40 hover:bg-stone-700/60 border border-stone-600/30 hover:border-[#DC143C]/30 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] group relative"
                        onClick={() => {
                          setTimeout(() => setIsOpen(false), 150)
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#003366]/20 flex items-center justify-center group-hover:from-[#DC143C]/30 group-hover:to-[#003366]/30 transition-all">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-lg">Cart</span>
                        {itemCount > 0 && (
                          <span className="ml-auto bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg" aria-label={`${itemCount} items in cart`}>
                            {itemCount}
                          </span>
                        )}
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                      className="pt-4 border-t border-stone-600/50"
                    >
                      <div className="text-center text-stone-300 text-sm mb-3 font-medium">Currency</div>
                      <div className="flex justify-center">
                        <CurrencySelector />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Link
                        href="/admin/login"
                        className="flex items-center space-x-4 px-5 py-4 rounded-xl bg-stone-700/40 hover:bg-stone-700/60 border border-stone-600/30 hover:border-[#DC143C]/30 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] group"
                        onClick={() => {
                          setTimeout(() => setIsOpen(false), 150)
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DC143C]/20 to-[#003366]/20 flex items-center justify-center group-hover:from-[#DC143C]/30 group-hover:to-[#003366]/30 transition-all">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-lg">Admin</span>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
  )

  return (
    <>
      {/* Hamburger Button - Visible on mobile only */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Render menu as portal to body - ensures full screen coverage */}
      {mounted && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  )
}






