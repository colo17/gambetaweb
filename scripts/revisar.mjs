/**
 * REVISIÓN VISUAL DEL SITIO
 * =========================
 *
 * Abre cada página con Chrome, la recorre tomando capturas a distintas alturas
 * y reporta errores de consola, imágenes rotas y problemas de layout.
 *
 * ⚑ RECORRE LAS SEIS PÁGINAS. Hasta agosto de 2026 el sitio era una sola y este
 *   script miraba una sola URL. Con el sitio partido, revisar sólo la portada
 *   deja el 80% sin mirar.
 *
 * ⚠ Y MIRA A 390 Y A 430px. El teléfono del dueño es un Pro Max, que mide 430:
 *   varios cortes de columna "justos" entraban en 390 y se partían al medio en
 *   430. Un solo ancho de teléfono no alcanza.
 *
 * Uso:  node scripts/revisar.mjs [url]     (por defecto http://localhost:4321)
 */

import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(ROOT, '.revision')
const BASE = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '')

if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true })

const PAGINAS = [
  { nombre: 'inicio', ruta: '/' },
  { nombre: 'gambeta', ruta: '/gambeta' },
  { nombre: 'manager', ruta: '/manager' },
  { nombre: 'player', ruta: '/player' },
  { nombre: 'test', ruta: '/test' },
  { nombre: 'perfil', ruta: '/perfil' },
]

const VISTAS = [
  { nombre: 'desktop', ancho: 1440, alto: 900 },
  { nombre: 'movil390', ancho: 390, alto: 844 },
  { nombre: 'movil430', ancho: 430, alto: 932 },
]

/** Las alturas que interesan, en fracción del alto total del documento. */
const PARADAS = [0, 0.33, 0.66, 1]

const navegador = await chromium.launch({ channel: 'chrome' })
const problemas = []

for (const vista of VISTAS) {
  const contexto = await navegador.newContext({
    viewport: { width: vista.ancho, height: vista.alto },
    deviceScaleFactor: 1,
    locale: 'es-AR',
  })
  const pagina = await contexto.newPage()

  let dondeEstoy = ''
  pagina.on('console', (mensaje) => {
    if (mensaje.type() === 'error') problemas.push(`[${dondeEstoy}] consola: ${mensaje.text()}`)
  })
  pagina.on('pageerror', (error) => problemas.push(`[${dondeEstoy}] JS: ${error.message}`))
  pagina.on('requestfailed', (peticion) =>
    problemas.push(`[${dondeEstoy}] no cargó: ${peticion.url().slice(-70)}`)
  )

  for (const hoja of PAGINAS) {
    dondeEstoy = `${hoja.nombre} ${vista.nombre}`

    await pagina.goto(BASE + hoja.ruta, { waitUntil: 'networkidle' })
    await pagina.evaluate(() => document.fonts.ready)
    await pagina.waitForTimeout(600)

    const alto = await pagina.evaluate(() => document.body.scrollHeight)

    for (const [indice, fraccion] of PARADAS.entries()) {
      await pagina.evaluate(
        (y) => window.scrollTo({ top: y, behavior: 'instant' }),
        Math.round(alto * fraccion)
      )
      // Las animaciones de scroll necesitan un cuadro para asentarse.
      await pagina.waitForTimeout(450)
      await pagina.screenshot({ path: join(SALIDA, `${hoja.nombre}-${vista.nombre}-${indice}.png`) })
    }

    // --- Chequeos automáticos ------------------------------------------
    const revision = await pagina.evaluate(() => {
      const fallas = []

      // Imágenes que no cargaron o sin alt
      document.querySelectorAll('img').forEach((img) => {
        if (img.complete && img.naturalWidth === 0) {
          fallas.push(`imagen rota: ${img.getAttribute('src')}`)
        }
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

      // Ids repetidos: el bug de "el menú lleva a la card y no a la sección"
      const vistos = new Set()
      for (const elemento of document.querySelectorAll('[id]')) {
        if (vistos.has(elemento.id)) fallas.push(`id repetido: #${elemento.id}`)
        vistos.add(elemento.id)
      }

      return fallas
    })

    revision.forEach((falla) => problemas.push(`[${dondeEstoy}] ${falla}`))
    console.log(`  ✓ ${dondeEstoy.padEnd(20)} documento de ${alto}px`)
  }

  await contexto.close()
}

await navegador.close()

console.log('')
if (problemas.length === 0) {
  console.log('Sin problemas detectados.\n')
} else {
  const unicos = [...new Set(problemas)]
  console.log(`${unicos.length} cosa(s) para mirar:`)
  unicos.forEach((p) => console.log(`  · ${p}`))
  console.log('')
}
