const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const repoRoot = path.join(__dirname, '../..')
const publicBranding = path.join(__dirname, '../public/branding')
const placeholderDir = path.join(publicBranding, 'product-placeholders')
const maxBytes = 150 * 1024

const placeholders = [
  { id: 'classic', source: 'tile-classic.png' },
  { id: 'premium', source: 'tile-premium.png' },
  { id: 'designer', source: 'tile-designer.png' },
  { id: 'limited', source: 'tile-limited.png' },
]

async function writeUnderBudget(src, dest, format) {
  const widths = [1200, 1000, 900, 800, 700, 600]
  const qualities = [82, 74, 66, 58]

  for (const width of widths) {
    for (const quality of qualities) {
      const pipeline = sharp(src).resize({
        width,
        withoutEnlargement: true,
        fit: 'inside',
      })

      if (format === 'webp') {
        await pipeline.webp({ quality }).toFile(dest)
      } else {
        await pipeline.jpeg({ quality, mozjpeg: true }).toFile(dest)
      }

      const size = fs.statSync(dest).size
      if (size <= maxBytes) {
        return size
      }
    }
  }

  return fs.statSync(dest).size
}

async function optimizePlaceholders() {
  fs.mkdirSync(placeholderDir, { recursive: true })

  for (const { id, source } of placeholders) {
    const src = path.join(
      repoRoot,
      'brand-assets/ui-placeholders/collection-tiles',
      source
    )
    const dest = path.join(placeholderDir, `${id}.webp`)
    const size = await writeUnderBudget(src, dest, 'webp')
    console.log(`✓ ${id}.webp (${Math.round(size / 1024)}KB)`)

    if (size > maxBytes) {
      throw new Error(`${id}.webp is still ${size} bytes (target < ${maxBytes})`)
    }
  }
}

async function optimizeLogos() {
  const logos = fs
    .readdirSync(publicBranding)
    .filter((name) => name.startsWith('gatvia-logo-') && name.endsWith('.png'))

  for (const name of logos) {
    const src = path.join(publicBranding, name)
    const sizeBefore = fs.statSync(src).size
    if (sizeBefore <= maxBytes) {
      console.log(`✓ ${name} already ${Math.round(sizeBefore / 1024)}KB`)
      continue
    }

    const dest = path.join(publicBranding, name.replace(/\.png$/, '.webp'))
    const size = await writeUnderBudget(src, dest, 'webp')
    fs.unlinkSync(src)
    console.log(`✓ ${path.basename(dest)} (${Math.round(size / 1024)}KB)`)
  }
}

async function main() {
  console.log('Optimizing branding assets (<150KB each)...')
  await optimizePlaceholders()
  await optimizeLogos()
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
