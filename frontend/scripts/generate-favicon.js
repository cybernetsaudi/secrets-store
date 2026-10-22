const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sourceLogo = path.join(
  __dirname,
  '../../brand-assets/icons/favicon/favicon-g-monogram.png'
)
const publicDir = path.join(__dirname, '../public')

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
]

async function generateFavicons() {
  if (!fs.existsSync(sourceLogo)) {
    console.error(`Source logo not found: ${sourceLogo}`)
    process.exit(1)
  }

  console.log('Generating favicons from GATVIA G monogram...')

  for (const { size, name } of sizes) {
    const outputPath = path.join(publicDir, name)
    await sharp(sourceLogo)
      .resize(size, size, {
        fit: 'cover',
        background: { r: 245, g: 245, b: 247, alpha: 1 },
      })
      .png()
      .toFile(outputPath)
    console.log(`✓ ${name}`)
  }

  await sharp(sourceLogo)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'))
  console.log('✓ favicon.ico')

  const manifest = {
    name: 'GATVIA Secrets',
    short_name: 'GATVIA',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: '#111827',
    background_color: '#ffffff',
    display: 'standalone',
  }

  fs.writeFileSync(
    path.join(publicDir, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2) + '\n'
  )
  console.log('✓ site.webmanifest')
}

generateFavicons().catch((error) => {
  console.error(error)
  process.exit(1)
})
