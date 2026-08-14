/**
 * REVISIÓN VISUAL DEL SITIO
 * =========================
 *
 * Abre el sitio con Chrome, recorre la página tomando capturas a distintas
 * alturas y reporta errores de consola, imágenes rotas y problemas de layout.
 *
 * Uso:  node scripts/revisar.mjs [url]     (por defecto http://localhost:4321)
 */

import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(ROOT, '.revision')
const URL = process.argv[2] ?? 'http://localhost:4321'

if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true })

const VISTAS = [
  { nombre: 'desktop', ancho: 1440, alto: 900 },
  { nombre: 'mobile', ancho: 390, alto: 844 },
]

/** Las alturas que interesan, en fracción del alto total del documento. */
const PARADAS = [0, 0.12, 0.26, 0.42, 0.58, 0.72, 0.86, 1]

const navegador = await chromium.launch({ channel: 'chrome' })
const problemas = []

for (const vista of VISTAS) {
  const contexto = await navegador.newContext({
    viewport: { width: vista.ancho, height: vista.alto },
    deviceScaleFactor: 1,
    locale: 'es-AR',
  })
  const pagina = await contexto.newPage()

  pagina.on('console', (mensaje) => {
    if (mensaje.type() === 'error') problemas.push(`[${vista.nombre}] consola: ${mensaje.text()}`)
  })
  pagina.on('pageerror', (error) => problemas.push(`[${vista.nombre}] JS: ${error.message}`))
  pagina.on('requestfailed', (peticion) =>
    problemas.push(`[${vista.nombre}] no cargó: ${peticion.url().slice(-70)}`)
  )

  await pagina.goto(URL, { waitUntil: 'networkidle' })
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.waitForTimeout(600)

  const alto = await pagina.evaluate(() => document.body.scrollHeight)

  for (const [indice, fraccion] of PARADAS.entries()) {
    await pagina.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(alto * fraccion))
    // Las animaciones de scroll necesitan un cuadro para asentarse.
    await pagina.waitForTimeout(500)
    await pagina.screenshot({ path: join(SALIDA, `${vista.nombre}-${indice}.png`) })
  }

  // --- Chequeos automáticos --------------------------------------------
  const revision = await pagina.evaluate(() => {
    const fallas = []

    // Imágenes que no cargaron o sin alt
    document.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) fallas.push(`imagen rota: ${img.getAttribute('src')}`)
      if (img.getAttribute('alt') === null) fallas.push(`sin alt: ${img.getAttribute('src')}`)
    })

    /**
     * Desborde horizontal, el pecado más común en móvil.
     *
     * ⚠ NO se mira `scrollWidth`: da falsos positivos. Cualquier tira con
     *   `overflow-x:auto` —la de las 81 ligas mide 13.000px— infla el
     *   `scrollWidth` del documento aunque la página no se mueva un pixel.
     *   Lo que importa es si el usuario PUEDE arrastrar la página al costado,
     *   así que se prueba moviéndola.
     */
    const antes = window.scrollX
    window.scrollTo(400, window.scrollY)
    const corrio = window.scrollX
    window.scrollTo(antes, window.scrollY)
    if (corrio > 0) fallas.push(`la página se desplaza ${corrio}px en horizontal`)

    // Un h1 y sólo uno
    const h1 = document.querySelectorAll('h1').length
    if (h1 !== 1) fallas.push(`hay ${h1} elementos h1, debería haber 1`)

    return fallas
  })

  revision.forEach((falla) => problemas.push(`[${vista.nombre}] ${falla}`))

  console.log(`  ✓ ${vista.nombre}: ${PARADAS.length} capturas · documento de ${alto}px`)
  await contexto.close()
}

await navegador.close()

console.log('')
if (problemas.length === 0) {
  console.log('Sin problemas detectados.\n')
} else {
  console.log(`${problemas.length} cosa(s) para mirar:`)
  ;[...new Set(problemas)].forEach((p) => console.log(`  · ${p}`))
  console.log('')
}
