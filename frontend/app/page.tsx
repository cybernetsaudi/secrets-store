'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [staffEmail, setStaffEmail] = useState<string | null>(null)
  const [heroImageIndex, setHeroImageIndex] = useState(0)
  
  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    landing_bg_image_url: string
    landing_tile_1_image: string // Development
    landing_tile_2_image: string // Squads
    landing_tile_3_image: string // Kit Packs
    landing_tile_4_image: string // ECAs
    landing_tile_5_image: string // GUFC Merchandise Store
    landing_tile_6_image: string // Contact us
    landing_bg_contrast?: number
    landing_bg_saturation?: number
    landing_bg_brightness?: number
  } | null>(null)

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/settings/contact`)
        if (!response.ok) return
        const data = await response.json()
        if (data.staff_email) {
          setStaffEmail(String(data.staff_email))
        }
      } catch {
        // silent fail – CTA will fall back to generic link
      }
    }
    
    const fetchVisualSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/settings/visual`)
        if (response.ok) {
          const data = await response.json()
          setVisualSettings({
            landing_bg_image_url: data.landing_bg_image_url || '',
            landing_tile_1_image: data.landing_tile_1_image || '',
            landing_tile_2_image: data.landing_tile_2_image || '',
            landing_tile_3_image: data.landing_tile_3_image || '',
            landing_tile_4_image: data.landing_tile_4_image || '',
            landing_tile_5_image: data.landing_tile_5_image || '',
            landing_tile_6_image: data.landing_tile_6_image || '',
            landing_bg_contrast: parseFloat(data.landing_bg_contrast) || 1,
            landing_bg_saturation: parseFloat(data.landing_bg_saturation) || 1,
            landing_bg_brightness: parseFloat(data.landing_bg_brightness) || 0.7,
          })
        }
      } catch {
        // silent fail – will use default images
      }
    }
    
    fetchContact()
    fetchVisualSettings()
  }, [])

  // Default images (fallback if API doesn't provide) - removed hardcoded images
  const defaultHeroBgImage = '' // No default - wait for API response
  const defaultTileImage = '' // No default - wait for API response

  // Use API images if available, otherwise use empty string (no image)
  const heroBgImage = visualSettings?.landing_bg_image_url || ''
  // Hero images use the background image (single image carousel)
  const heroImages = visualSettings?.landing_bg_image_url 
    ? [visualSettings.landing_bg_image_url] 
    : []
  
  // Tile images
  const tile1Image = visualSettings?.landing_tile_1_image || defaultTileImage
  const tile2Image = visualSettings?.landing_tile_2_image || defaultTileImage
  const tile3Image = visualSettings?.landing_tile_3_image || defaultTileImage
  const tile4Image = visualSettings?.landing_tile_4_image || defaultTileImage
  const tile5Image = visualSettings?.landing_tile_5_image || defaultTileImage
  const tile6Image = visualSettings?.landing_tile_6_image || defaultTileImage

  // Build filter CSS string from settings
  const landingBgFilter = `contrast(${visualSettings?.landing_bg_contrast ?? 1}) saturate(${visualSettings?.landing_bg_saturation ?? 1}) brightness(${visualSettings?.landing_bg_brightness ?? 0.7})`

  // Auto-rotate hero carousel
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000)

    return () => {
      clearInterval(heroInterval)
    }
  }, [heroImages.length])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" style={{ paddingTop: '3%' }}>
      {/* Full-screen background image - Sharp, colored footballer silhouette vector */}
      <div 
        className="fixed top-0 left-0 w-full h-screen overflow-hidden"
        style={{
          ...(heroBgImage ? {
            backgroundImage: `url(${heroBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: landingBgFilter,
          } : {}),
          zIndex: 0,
        }}
      >
        {/* Base gradient - very light so image shows through */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-[#003366]/30 to-gray-900/60"></div>
        {/* Colored overlay for vectorized sharp effect - very light */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.15) 0%, rgba(0, 51, 102, 0.15) 100%)',
          }}
        />
        {/* Minimal overlay so background image is CLEARLY VISIBLE */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/25 via-gray-900/15 to-gray-900/25"></div>
      </div>

      {/* Hero Section */}
      <main id="main-content" className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto"
        >
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                {/* Player avatars badge */}
                <motion.div
                  variants={itemVariants}
                  className="flex items-center bg-stone-700/50 rounded-full pl-4 pr-6 py-2 w-max mb-8"
                >
                  <div className="flex -space-x-3">
                    <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-gradient-to-br from-[#DC143C] to-[#003366] flex items-center justify-center text-xs font-bold text-white">GU</div>
                    <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-gradient-to-br from-[#003366] to-[#DC143C] flex items-center justify-center text-xs font-bold text-white">FC</div>
                    <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-700 flex items-center justify-center text-xs font-bold text-white">U5</div>
                    <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-600 flex items-center justify-center text-xs font-bold text-white">U10</div>
                    <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-500 flex items-center justify-center text-xs font-bold text-white">U21</div>
                  </div>
                  <span className="ml-4 text-sm font-medium">
                    <span className="font-semibold">500+</span> current Gulf United players
                  </span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="sm:text-5xl lg:text-7xl leading-tight text-4xl tracking-tight mt-2 mb-2 font-semibold"
                >
                  The home of youth development in the UAE
                </motion.h1>

                <motion.div
                  variants={itemVariants}
                  className="text-base sm:text-lg max-w-xl mt-6 text-stone-200 space-y-3"
                >
                  <p>
                    Join the Best academy in Dubai…with proven pathways, world class facilities and high-quality coaches!
                  </p>
                  <p className="text-sm text-stone-300/80 italic">
                    Please only pick a package after passing your trial.
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
                >
                  <a
                    href="https://www.gulfunitedfc.com/academy/applyfortrials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-full border border-stone-600 transition-all hover:border-stone-500 bg-stone-800/50 hover:bg-stone-700/50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Book a Trial Session
                  </a>
                  
                  {/* Badges on the right */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
                        <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
                        <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                        <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
                      </svg>
                      <span className="text-sm font-medium">UEFA Qualified Coaches</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">UAE FA Approved Academy</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="mt-12 flex items-center gap-8"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 fill-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-medium">4.9/5 Rating</span>
                  </div>
                </motion.div>
              </div>

              {/* Hero Image Carousel */}
              <motion.div
                variants={itemVariants}
                className="relative"
              >
                <div className="relative overflow-hidden h-80 sm:h-[28rem] rounded-3xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={heroImageIndex}
                      src={heroImages[heroImageIndex]}
                      alt="Elite soccer training"
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.8, ease: 'easeInOut' }}
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* Carousel indicators */}
                  <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                    {heroImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setHeroImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === heroImageIndex ? 'bg-white w-6' : 'bg-white/40'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="backdrop-blur-sm rounded-lg p-3 bg-white/10">
                      <div className="text-center text-sm text-white mb-2">
                        <span>Trusted by families all around Dubai</span>
                      </div>
                      <div className="mt-2 rounded-full h-1 bg-white/20">
                        <div className="rounded-full h-1 w-3/4 bg-gradient-to-r from-[#DC143C] to-[#003366]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Feature Cards Grid - 6 Tiles */}
            <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Tile 1: Development */}
              <Link href="/products/?search=Development" className="block">
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden lg:rounded-3xl hover:scale-105 transition-all min-h-[280px] flex flex-col bg-stone-800/60 border-stone-700/30 rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg group cursor-pointer"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${tile1Image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-10 backdrop-blur-sm rounded-lg p-3 bg-white/10">
                    <div className="text-center">
                      <h3 className="text-3xl lg:text-4xl text-white tracking-tight mb-2 font-semibold">Development</h3>
                    </div>
                  </div>
                </motion.article>
              </Link>

              {/* Tile 2: Squads */}
              <Link href="/products/?search=Squads" className="block">
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="relative overflow-hidden lg:rounded-3xl hover:scale-105 transition-all min-h-[280px] flex flex-col bg-stone-800/60 border-stone-700/30 rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg group cursor-pointer"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${tile2Image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-10 backdrop-blur-sm rounded-lg p-3 bg-white/10">
                    <div className="text-center">
                      <h3 className="text-3xl lg:text-4xl text-white tracking-tight mb-2 font-semibold">Squads</h3>
                    </div>
                  </div>
                </motion.article>
              </Link>

              {/* Tile 3: Kit Packs */}
              <Link href="/products/?search=Kit" className="block">
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="relative overflow-hidden lg:rounded-3xl hover:scale-105 transition-all min-h-[280px] flex flex-col bg-stone-800/60 border-stone-700/30 rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg group cursor-pointer"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${tile3Image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-10 backdrop-blur-sm rounded-lg p-3 bg-white/10">
                    <div className="text-center">
                      <h3 className="text-3xl lg:text-4xl text-white tracking-tight mb-2 font-semibold">Kit Packs</h3>
                    </div>
                  </div>
                </motion.article>
              </Link>

              {/* Tile 4: ECAs (After School Activities) - Clickable */}
              <Link href="/products/?search=ECA" className="block">
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="relative overflow-hidden lg:rounded-3xl hover:scale-105 transition-all min-h-[280px] flex flex-col bg-stone-800/60 border-stone-700/30 rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg group cursor-pointer"
                >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${tile4Image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 z-10 backdrop-blur-sm rounded-lg p-3 bg-white/10">
                  <div className="text-center">
                    <h3 className="text-3xl lg:text-4xl text-white tracking-tight mb-2 font-semibold">ECAs</h3>
                    <p className="text-sm text-stone-200/80">After School Activities</p>
                  </div>
                </div>
              </motion.article>
              </Link>

              {/* Tile 5: GUFC Merchandise Store - Clickable */}
              <Link href="/products/?search=Merchandise" className="block">
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="relative overflow-hidden lg:rounded-3xl hover:scale-105 transition-all min-h-[280px] flex flex-col bg-stone-800/60 border-stone-700/30 rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg group cursor-pointer"
                >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${tile5Image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 z-10 backdrop-blur-sm rounded-lg p-3 bg-white/10">
                  <div className="text-center">
                    <h3 className="text-3xl lg:text-4xl text-white tracking-tight mb-2 font-semibold">GUFC Merchandise Store</h3>
                  </div>
                </div>
              </motion.article>
              </Link>

              {/* Tile 6: Contact us - Clickable */}
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
                className="relative overflow-hidden lg:rounded-3xl min-h-[280px] flex flex-col bg-stone-800/60 border-stone-700/30 rounded-2xl shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] backdrop-blur-lg group cursor-pointer"
                onClick={() => window.open('https://wa.link/ublw90', '_blank', 'noopener,noreferrer')}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${tile6Image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute bottom-4 left-4 right-4 z-10 backdrop-blur-sm rounded-lg p-3 bg-white/10">
                  <div className="text-center">
                    <h3 className="text-3xl lg:text-4xl text-white tracking-tight mb-2 font-semibold">Contact us</h3>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

