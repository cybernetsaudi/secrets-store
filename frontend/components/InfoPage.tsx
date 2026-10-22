'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import StorefrontPageShell from '@/components/StorefrontPageShell'
import type { InfoPageContent } from '@/lib/infoPages'

interface InfoPageProps {
  content: InfoPageContent
}

export default function InfoPage({ content }: InfoPageProps) {
  return (
    <StorefrontPageShell>
      <main id="main-content" className="px-6 lg:px-12 py-12 md:py-16 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-gray-200 bg-white p-8 md:p-10 shadow-sm mb-10 relative overflow-hidden"
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-violet-100/80 to-transparent rounded-bl-full pointer-events-none"
              aria-hidden
            />
            <p className="text-[10px] md:text-xs font-bold tracking-[0.35em] uppercase text-violet-600 mb-2 relative">
              {content.eyebrow}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3 relative">
              {content.title}
            </h1>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed relative">
              {content.subtitle}
            </p>
          </motion.header>

          <div className="space-y-8">
            {content.sections.map((section, index) => (
              <motion.section
                key={section.heading}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.06, duration: 0.35 }}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm"
              >
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 tracking-tight mb-4">
                  {section.heading}
                </h2>
                <div className="space-y-3 text-gray-600 text-sm md:text-base leading-relaxed">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </div>
                {section.highlight && (
                  <p className="mt-5 pt-5 border-t border-gray-100 text-sm md:text-base font-medium text-violet-800 bg-violet-50/50 -mx-2 px-4 py-3 rounded-xl">
                    {section.highlight}
                  </p>
                )}
              </motion.section>
            ))}
          </div>

          {content.cta && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 flex flex-wrap gap-4 items-center justify-between"
            >
              <Link
                href={content.cta.href}
                className="theme-btn-primary inline-flex items-center gap-2 hover:opacity-90 transition-opacity text-sm font-semibold rounded-full px-7 py-3 shadow-md"
              >
                {content.cta.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back to home
              </Link>
            </motion.div>
          )}
        </div>
      </main>
    </StorefrontPageShell>
  )
}
