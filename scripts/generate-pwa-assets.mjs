import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')
const svgPath = resolve(publicDir, 'codixia-icon.svg')

const svgBuffer = readFileSync(svgPath)

const BG = '#020617'

async function generateIcon(size) {
  const png = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: await sharp(svgBuffer).resize(Math.round(size * 0.7), Math.round(size * 0.7)).toBuffer(),
        gravity: 'centre',
      },
    ])
    .png()
    .toBuffer()

  const outPath = resolve(publicDir, `icon-${size}.png`)
  writeFileSync(outPath, png)
  console.log(`Generated ${outPath}`)
}

async function generateSplash(width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.2)
  const png = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: await sharp(svgBuffer).resize(iconSize, iconSize).toBuffer(),
        gravity: 'centre',
      },
    ])
    .png()
    .toBuffer()

  const outPath = resolve(publicDir, `splash-${width}x${height}.png`)
  writeFileSync(outPath, png)
  console.log(`Generated ${outPath}`)
}

async function main() {
  await generateIcon(192)
  await generateIcon(512)

  const splashes = [
    { width: 640, height: 1136, label: 'iPhone SE' },
    { width: 750, height: 1334, label: 'iPhone 6/7/8' },
    { width: 828, height: 1792, label: 'iPhone XR/11' },
    { width: 1125, height: 2436, label: 'iPhone X/XS/11 Pro' },
    { width: 1170, height: 2532, label: 'iPhone 12/13/14 Pro' },
    { width: 1284, height: 2778, label: 'iPhone 12/13/14 Pro Max' },
    { width: 1536, height: 2048, label: 'iPad' },
    { width: 2048, height: 2732, label: 'iPad Pro' },
  ]

  for (const s of splashes) {
    await generateSplash(s.width, s.height)
  }

  console.log('\nAll PWA assets generated.')
}

main().catch(console.error)
