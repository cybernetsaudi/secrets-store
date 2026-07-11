const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

// Source logo path
const sourceLogo = path.join(__dirname, '../../deployment/logos/header_logo_1763761740_6920de4c16ed6.png')
const publicDir = path.join(__dirname, '../public')

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Favicon sizes to generate
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
]

async function generateFavicons() {
  try {
    console.log('Generating favicons from logo...')
    
    // Check if source logo exists
    if (!fs.existsSync(sourceLogo)) {
      console.error(`Source logo not found: ${sourceLogo}`)
      process.exit(1)
    }

    // Generate all size variants
    for (const { size, name } of sizes) {
      const outputPath = path.join(publicDir, name)
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath)
      console.log(`✓ Generated ${name} (${size}x${size})`)
    }

    // Generate favicon.ico (16x16 and 32x32 combined)
    const favicon16 = await sharp(sourceLogo)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()

    const favicon32 = await sharp(sourceLogo)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()

    // For favicon.ico, we'll use the 32x32 version
    // Note: Creating a proper .ico file requires additional libraries
    // For now, we'll create a simple PNG and rename it, or use the 32x32 PNG
    // Most modern browsers accept PNG as favicon.ico
    await sharp(favicon32)
      .toFile(path.join(publicDir, 'favicon.ico'))
    console.log('✓ Generated favicon.ico')

    // Create site.webmanifest for Android
    const manifest = {
      name: 'Gulf United FC Store',
      short_name: 'GUFC Store',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      theme_color: '#DC143C',
      background_color: '#1c1917',
      display: 'standalone'
    }

    fs.writeFileSync(
      path.join(publicDir, 'site.webmanifest'),
      JSON.stringify(manifest, null, 2)
    )
    console.log('✓ Generated site.webmanifest')

    console.log('\n✅ All favicons generated successfully!')
    console.log(`📁 Files saved to: ${publicDir}`)
  } catch (error) {
    console.error('Error generating favicons:', error)
    process.exit(1)
  }
}

generateFavicons()






