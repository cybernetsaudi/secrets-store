'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { SUPPORTED_CURRENCIES, Currency } from '@/lib/currency'
import { motion, AnimatePresence } from 'framer-motion'

export default function CurrencySelector() {
  const { currency, setCurrency } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative" style={{ zIndex: 102 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isOpen) {
            setIsOpen(false)
          }
        }}
        aria-label="Select currency"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center space-x-2 px-3 py-2 border border-white/10 rounded-lg hover:border-white/20 transition-all duration-200 bg-white/5 hover:bg-white/10 font-medium text-neutral-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
      >
        <span>{currency}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[99]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-36 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-[101] overflow-hidden"
              style={{ position: 'absolute' }}
              role="listbox"
              aria-label="Currency options"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <button
                  key={curr}
                  onClick={async () => {
                    await setCurrency(curr)
                    setIsOpen(false)
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      await setCurrency(curr)
                      setIsOpen(false)
                    }
                  }}
                  role="option"
                  aria-selected={currency === curr}
                  className={`w-full text-left px-4 py-2.5 hover:bg-neutral-800 transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-inset ${
                    currency === curr
                      ? 'bg-[#DC143C]/20 text-[#DC143C]/90 border-l-4 border-[#DC143C]/60'
                      : 'text-neutral-400'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


