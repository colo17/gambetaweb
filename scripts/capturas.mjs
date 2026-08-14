/**
 * CAPTURAS DE GAMBETA MANAGER
 * ===========================
 *
 * Levanta el harness (`vite.harness.config.mjs`), que monta los componentes
 * reales del juego, y los fotografía en escritorio y teléfono.
 *
 * ⛔ NO TOCA `cyberfoot-online`. El harness lo lee por alias; Vite escribe su
 *    caché en el temporal del sistema. Ver la nota larga en la config.
 *
 * ⚑ USA EL CHROME YA INSTALADO (`channel: 'chrome'`) en vez de bajar los ~150 MB
 *   de Chromium de Playwright. Si algún día no está, `npx playwright install
 *   chromium` lo arregla.
 *
 * Uso:  node scripts/capturas.mjs
 */

import { chromium } from 'playwright'
import sharp from 'sharp'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = join(ROOT, 'public/assets/screenshots')
const PUERTO = 5199
const URL = `http://localhost:${PUERTO}/`
/** El fondo de la app del juego (`--color-ink-950`). Lo usa el recorte. */
const FONDO = '#070a12'

/**
 * Las pantallas, en el orden del recorrido del sitio.
 *
 * `antes` corre justo antes de disparar: algunas pantallas no muestran nada
 * hasta que alguien escribe o toca algo, y una captura de un formulario vacío
 * no cuenta lo que hace el juego.
 */
const PANTALLAS = [
  { id: 'sala' },
  { id: 'editor' },
  { id: 'reparto' },
  { id: 'escritorio' },
  { id: 'equipo' },
  { id: 'plantel' },
  { id: 'planilla' },
  { id: 'juveniles' },
  { id: 'tecnicos' },
  { id: 'estadio' },
  { id: 'seleccion-elegir' },
  { id: 'seleccion-armar' },
  { id: 'seleccion-plantel' },
  {
    id: 'buscador',
    /**
     * El buscador abre en la pestaña "En venta", donde casi nadie hay, y con el
     * campo vacío no muestra ninguna fila. Se pasa a "Con contrato" y se busca
     * una letra común, que es lo que haría cualquiera buscando un refuerzo.
     */
    antes: async (pagina) => {
      const pestaña = pagina.locator('[data-captura="buscador"] button', { hasText: 'Con contrato' }).first()
      if (await pestaña.count()) await pestaña.click()
      const campo = pagina.locator('[data-captura="buscador"] input[type="text"], [data-captura="buscador"] input[type="search"]').first()
      if (await campo.count()) await campo.fill('an')
      await pagina.waitForTimeout(1000)
    },
  },
  { id: 'mercado' },
  { id: 'tablas' },
  { id: 'agenda' },
  { id: 'partido' },
  { id: 'cancha-vivo' },
].map((p) => ({ nombre: p.id, ...p }))

const VISTAS = [
  { nombre: 'desktop', ancho: 1600, alto: 1000, escala: 1 },
  { nombre: 'mobile', ancho: 420, alto: 900, escala: 2 },
]

// ---------------------------------------------------------------------------

function levantarHarness() {
  return new Promise((resolver, rechazar) => {
    // ⚠ Se invoca el .js de Vite con el propio Node en vez de `npx`. En Windows,
    //   Node 24 se niega a lanzar un `.cmd` sin shell (`spawn EINVAL`), y meter
    //   un shell trae problemas de comillas en rutas con espacios.
    const proceso = spawn(
      process.execPath,
      [
        join(ROOT, 'node_modules/vite/bin/vite.js'),
        '--config',
        'vite.harness.config.mjs',
        '--port',
        String(PUERTO),
      ],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    )

    const alFallar = setTimeout(() => rechazar(new Error('El harness no levantó en 60s')), 60_000)

    proceso.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('ready in')) {
        clearTimeout(alFallar)
        // Un respiro para que Vite termine de pre-transformar los módulos.
        setTimeout(() => resolver(proceso), 1200)
      }
    })
    proceso.stderr.on('data', (chunk) => {
      const texto = chunk.toString()
      if (texto.includes('Error')) console.error('  harness:', texto.trim().slice(0, 200))
    })
  })
}

// ---------------------------------------------------------------------------

console.log('\nLevantando el harness…')
const harness = await levantarHarness()
console.log(`  ✓ corriendo en ${URL}\n`)

if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true })

const navegador = await chromium.launch({ channel: 'chrome' })
let tomadas = 0

try {
  for (const vista of VISTAS) {
    const contexto = await navegador.newContext({
      viewport: { width: vista.ancho, height: vista.alto },
      deviceScaleFactor: vista.escala,
      colorScheme: 'dark',
      locale: 'es-AR',
    })
    const pagina = await contexto.newPage()

    const errores = []
    pagina.on('pageerror', (error) => errores.push(error.message))

    for (const pantalla of PANTALLAS) {
      /**
       * ⚑ UNA NAVEGACIÓN POR PANTALLA. El harness dibuja sólo la que se le
       *   pide con `?p=`; montarlas todas juntas crasheaba la pestaña (la
       *   fecha en vivo sola dibuja diez canchas animadas).
       *
       * ⚠ `load` y no `networkidle`: el reloj del partido deja la red
       *   trabajando para siempre y `networkidle` se agota a los 30 s.
       */
      await pagina.goto(`${URL}?p=${pantalla.id}`, { waitUntil: 'load' })
      // Las tipografías del juego se empaquetan con la app: si no se esperan,
      // la captura sale con la fuente de respaldo.
      await pagina.evaluate(() => document.fonts.ready)
      await pagina.waitForTimeout(1800)

      const elemento = pagina.locator(`[data-captura="${pantalla.id}"]`)
      if ((await elemento.count()) === 0) {
        console.error(`  ✗ no se dibujó la pantalla "${pantalla.id}"`)
        continue
      }

      if (pantalla.antes) await pantalla.antes(pagina)

      const destino = join(SALIDA, `${pantalla.nombre}-${vista.nombre}.webp`)
      /**
       * ⚠ `animations: 'disabled'` y un timeout corto NO son opcionales.
       *   Playwright espera a que el elemento quede QUIETO antes de disparar, y
       *   la fecha en vivo tiene el reloj del partido corriendo: sin esto, la
       *   captura se cuelga para siempre.
       */
      const crudo = await elemento.screenshot({ animations: 'disabled', timeout: 15_000 })

      /**
       * Cada pantalla ocupa 100vh para que Playwright la aísle, pero la
       * táctica y el partido llenan mucho menos: quedaba media captura de
       * negro. `trim` recorta el borde de color uniforme y después se le
       * devuelve un margen parejo.
       */
      /**
       * ⚠ WEBP Y NO PNG. En PNG las nueve capturas sumaban 2,3 MB y la nota de
       *   rendimiento móvil de Lighthouse se caía de 91 a 78: en el teléfono la
       *   página carga las ocho de una. Son fotos de una interfaz que después
       *   se muestran a la mitad de su tamaño, así que la compresión con
       *   pérdida no se nota y pesan una quinta parte.
       */
      const recortado = await sharp(crudo)
        .trim({ background: FONDO, threshold: 6 })
        .extend({ top: 28, bottom: 28, left: 28, right: 28, background: FONDO })
        .webp({ quality: 80, effort: 6 })
        .toFile(destino)

      tomadas += 1
      const kb = Math.round(recortado.size / 1024)
      console.log(`  ✓ ${pantalla.nombre}-${vista.nombre}.webp  ${recortado.width}×${recortado.height}  ${kb} KB`)
    }

    if (errores.length) {
      console.error(`  ⚠ errores de JS en ${vista.nombre}:`)
      ;[...new Set(errores)].slice(0, 5).forEach((e) => console.error(`     ${e.slice(0, 170)}`))
    }

    await contexto.close()
  }
} finally {
  await navegador.close()
  harness.kill()
}

console.log(`\n${tomadas} capturas en public/assets/screenshots/\n`)
