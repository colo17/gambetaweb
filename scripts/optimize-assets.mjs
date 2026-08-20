/**
 * PROCESADO DE ASSETS
 * ===================
 *
 * Toma lo que salió de Higgsfield y lo deja listo para la web:
 *
 *   1. El isotipo, limpio y con fondo transparente
 *   2. Los fondos, a WebP en dos anchos
 *   3. Favicon y ícono de iOS
 *   4. La imagen de compartir (Open Graph)
 *
 * Uso:  node scripts/optimize-assets.mjs
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Los originales de Higgsfield. Viven FUERA de public/ para no desplegar 25 MB. */
const SRC = join(ROOT, 'assets-src')
/** Lo procesado, que sí se publica. */
const GEN = join(ROOT, 'public/assets/generated')
const PUBLIC = join(ROOT, 'public')

const ok = (msg) => console.log(`  ✓ ${msg}`)

// ---------------------------------------------------------------------------
// 1. EL ISOTIPO
// ---------------------------------------------------------------------------
/**
 * Recraft devuelve el logo sobre un rectángulo negro, y los contornos internos
 * de la G son formas negras APOYADAS ENCIMA del verde, no agujeros de verdad.
 * Sobre el sitio (#050607) no se notaría, pero un logo de marca tiene que
 * funcionar en cualquier fondo.
 *
 * En vez de reescribir los `path` a mano —que es donde se rompen los logos— se
 * arma una MÁSCARA: el verde se pinta entero y las dos formas negras se usan
 * para recortarlo. La pelota dorada va después, sin máscara, porque vive
 * adentro de uno de esos recortes.
 */
function construirIsotipo() {
  const bruto = readFileSync(join(SRC, 'logo-b.svg'), 'utf8')
  // El manifiesto C2PA son ~4 KB de metadatos que no pintan nada.
  const limpio = bruto.replace(/<metadata>[\s\S]*?<\/metadata>/, '')

  const paths = [...limpio.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map((m) => ({
    d: m[1],
    fill: (m[0].match(/fill="([^"]*)"/) || [])[1],
  }))

  const negros = paths.filter((p) => p.fill === 'rgb(10,10,10)')
  const verde = paths.find((p) => p.fill === 'rgb(11,110,79)')
  const dorado = paths.find((p) => p.fill === 'rgb(245,158,11)')

  if (!verde || !dorado || negros.length < 3) {
    throw new Error('El SVG del logo no tiene la forma esperada; revisar a mano.')
  }

  // El primero de los negros es el rectángulo del fondo: se descarta.
  const recortes = negros.filter((p) => p.d.length > 100)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" role="img" aria-label="Gambeta">
  <defs>
    <linearGradient id="cesped" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#12B76A"/>
      <stop offset="100%" stop-color="#0B6E4F"/>
    </linearGradient>
    <mask id="recorte">
      <rect width="2048" height="2048" fill="#fff"/>
${recortes.map((p) => `      <path d="${p.d}" fill="#000"/>`).join('\n')}
    </mask>
  </defs>
  <path d="${verde.d}" fill="url(#cesped)" mask="url(#recorte)"/>
  <path d="${dorado.d}" fill="#F59E0B"/>
</svg>
`
  writeFileSync(join(PUBLIC, 'logo.svg'), svg, 'utf8')
  writeFileSync(join(PUBLIC, 'favicon.svg'), svg, 'utf8')
  ok('logo.svg + favicon.svg (isotipo transparente)')
  return svg
}

// ---------------------------------------------------------------------------
// 2. LOS FONDOS A WEBP
// ---------------------------------------------------------------------------
async function convertirFondos() {
  const fondos = readdirSync(SRC).filter((f) => f.startsWith('bg-') && f.endsWith('.png'))

  for (const archivo of fondos) {
    const base = archivo.replace('.png', '')
    const origen = join(SRC, archivo)

    // 1600 para escritorio, 900 para teléfono. Nada de 4K: es un fondo.
    for (const ancho of [1600, 900]) {
      const destino = join(GEN, `${base}-${ancho}.webp`)
      await sharp(origen)
        .resize(ancho, null, { withoutEnlargement: true })
        .webp({ quality: 76, effort: 6 })
        .toFile(destino)
    }

    // Un LQIP de 24px, en base64, para que no haya un rectángulo vacío mientras carga.
    const buf = await sharp(origen).resize(24).blur(1.4).webp({ quality: 32 }).toBuffer()
    writeFileSync(join(GEN, `${base}.lqip.txt`), `data:image/webp;base64,${buf.toString('base64')}`)

    ok(`${base} → webp 1600 + 900 + lqip`)
  }
}

// ---------------------------------------------------------------------------
// 3. ÍCONOS
// ---------------------------------------------------------------------------
async function generarIconos(svg) {
  const buffer = Buffer.from(svg)

  await sharp(buffer, { density: 400 })
    .resize(180, 180, { fit: 'contain', background: { r: 5, g: 6, b: 7, alpha: 1 } })
    .flatten({ background: { r: 5, g: 6, b: 7 } })
    .png()
    .toFile(join(GEN, 'icono-180.png'))
  ok('icono-180.png (apple touch icon)')

  await sharp(buffer, { density: 400 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(GEN, 'icono-512.png'))
  ok('icono-512.png')
}

// ---------------------------------------------------------------------------
// 4. LA IMAGEN DE COMPARTIR
// ---------------------------------------------------------------------------
/**
 * ⚠ La tipografía de la marca es Anton, y el renderizador de SVG de sharp no
 * carga fuentes del proyecto: usa las del sistema. Por eso el texto va en
 * Impact, que está en todas las máquinas y es el pariente más cercano a Anton
 * (grotesca condensada de display). Si alguna vez esto se genera en un
 * navegador, conviene volver a Anton.
 */
async function generarOg() {
  const ANCHO = 1200
  const ALTO = 630

  /**
   * ⚠ EL ORIGINAL DE LA PIZARRA YA NO ESTÁ en `assets-src/`, y la imagen de
   *   compartir que salió de él sí está en `public/` y anda bien. Sin esta
   *   guarda, `npm run assets` reventaba entero en este paso y no llegaba a
   *   procesar ningún fondo nuevo.
   *
   *   Si alguna vez hay que rehacer el og.jpg, hay que volver a generar ese
   *   fondo o apuntar a otro de los que sí están.
   */
  const original = join(SRC, 'bg-pizarra.png')
  if (!existsSync(original)) {
    console.log('  · og.jpg: falta assets-src/bg-pizarra.png, se deja el que ya está')
    return
  }

  const fondo = await sharp(original)
    .resize(ANCHO, ALTO, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.42, saturation: 1.1 })
    .toBuffer()

  const isotipo = await sharp(Buffer.from(readFileSync(join(PUBLIC, 'logo.svg'))), { density: 400 })
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const capa = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">
    <defs>
      <linearGradient id="velo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#050607" stop-opacity="0.55"/>
        <stop offset="55%" stop-color="#050607" stop-opacity="0.78"/>
        <stop offset="100%" stop-color="#050607" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#velo)"/>
    <text x="${ANCHO / 2}" y="400" text-anchor="middle"
          font-family="Impact, 'Arial Narrow', sans-serif" font-size="112"
          letter-spacing="4" fill="#FAF9F6">GAMBETA</text>
    <text x="${ANCHO / 2}" y="452" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="24" font-weight="600"
          letter-spacing="7" fill="#22C97C">SÉ EL DT. ESCRIBÍ TU HISTORIA.</text>
    <rect x="${ANCHO / 2 - 60}" y="500" width="120" height="3" fill="#F59E0B"/>
    <text x="${ANCHO / 2}" y="556" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="20" letter-spacing="2"
          fill="#A8A49A">gambetagame.com</text>
  </svg>`)

  await sharp(fondo)
    .composite([
      { input: capa, top: 0, left: 0 },
      { input: isotipo, top: 78, left: Math.round(ANCHO / 2 - 90) },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(join(GEN, 'og.jpg'))
  ok('og.jpg (1200×630)')
}

// ---------------------------------------------------------------------------

console.log('\nProcesando assets…\n')
if (!existsSync(GEN)) mkdirSync(GEN, { recursive: true })

const svg = construirIsotipo()
await convertirFondos()
await generarIconos(svg)
await generarOg()

console.log('\nListo.\n')
