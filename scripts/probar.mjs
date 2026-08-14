/**
 * PRUEBA FUNCIONAL DEL SITIO
 * ==========================
 *
 * No mira cómo se ve: mira si ANDA. Toca las cosas que un visitante toca y
 * verifica que respondan.
 *
 * Uso:  node scripts/probar.mjs [url]
 */

import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:4321'

let ok = 0
let mal = 0
const verificar = (descripcion, condicion, detalle = '') => {
  if (condicion) { ok += 1; console.log(`  ok    ${descripcion}`) }
  else { mal += 1; console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`) }
}

const navegador = await chromium.launch({ channel: 'chrome' })
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-AR' })
const pagina = await contexto.newPage()

const erroresJs = []
pagina.on('pageerror', (e) => erroresJs.push(e.message))

await pagina.goto(URL, { waitUntil: 'networkidle' })
await pagina.evaluate(() => document.fonts.ready)

// --- 1. Lo que tiene que estar en el HTML ---------------------------------
console.log('\nContenido y SEO')
verificar('el título menciona Gambeta', (await pagina.title()).includes('Gambeta'))
verificar(
  'hay meta description',
  Boolean(await pagina.getAttribute('meta[name="description"]', 'content'))
)
verificar('hay imagen de Open Graph', Boolean(await pagina.getAttribute('meta[property="og:image"]', 'content')))
verificar('hay datos estructurados', (await pagina.locator('script[type="application/ld+json"]').count()) === 1)
verificar('un solo h1', (await pagina.locator('h1').count()) === 1)
verificar(
  'las tres cards de juegos están',
  (await pagina.locator('#juegos article').count()) === 3
)
verificar(
  'los datos del catálogo llegan renderizados',
  (await pagina.content()).includes('Prenier League')
)

// --- 2. El explorador de ligas --------------------------------------------
console.log('\nExplorador de ligas')
await pagina.locator('#manager').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(1200)

const tabla = pagina.locator('table tbody tr')
verificar('la tabla de clubes se pintó', (await tabla.count()) > 10, `${await tabla.count()} filas`)

const primerClub = await tabla.first().textContent()
verificar('el primer club tiene nombre', Boolean(primerClub?.trim()), primerClub?.trim().slice(0, 30))

// Buscar una liga y abrirla: es el fetch bajo demanda
await pagina.fill('input[type="search"]', 'argentina')
await pagina.waitForTimeout(400)
const pestañas = pagina.locator('[role="tab"]')
verificar('el buscador filtra', (await pestañas.count()) > 0 && (await pestañas.count()) < 10, `${await pestañas.count()} ligas`)

await pestañas.first().click()
await pagina.waitForTimeout(1400)
const encabezado = await pagina.locator('#manager h3').first().textContent()
verificar('abrir otra liga trae sus datos', !encabezado?.includes('Prenier'), encabezado?.trim())
verificar('y la tabla se repobló', (await tabla.count()) > 10, `${await tabla.count()} filas`)

// Ordenar por una columna
const antesDeOrdenar = await tabla.first().textContent()
await pagina.locator('th button', { hasText: 'Jug.' }).click()
await pagina.waitForTimeout(300)
const despues = await tabla.first().textContent()
verificar('las columnas ordenan', antesDeOrdenar !== despues)

// --- 3. El formulario ------------------------------------------------------
console.log('\nFormulario de aviso')
await pagina.locator('#avisame').scrollIntoViewIfNeeded()
await pagina.fill('input[type="email"]', 'no-es-un-mail')
await pagina.click('[data-aviso] button[type="submit"]')
await pagina.waitForTimeout(300)
let mensaje = await pagina.locator('[data-aviso-mensaje]').textContent()
verificar('rechaza un mail inválido', /válido/i.test(mensaje ?? ''), mensaje?.trim())

await pagina.fill('input[type="email"]', 'juan@ejemplo.com')
await pagina.click('[data-aviso] button[type="submit"]')
await pagina.waitForTimeout(600)
mensaje = await pagina.locator('[data-aviso-mensaje]').textContent()
verificar('acepta un mail válido', /listo/i.test(mensaje ?? ''), mensaje?.trim())

// --- 4. Navegación ---------------------------------------------------------
console.log('\nNavegación')
// El enlace existe dos veces —en la barra y en el menú de teléfono—, así que
// se apunta al de la barra, que es el que se ve a 1440px.
await pagina.locator('header nav[aria-label="Secciones"] a[href="#juegos"]').first().click()
await pagina.waitForTimeout(800)
const enJuegos = await pagina.evaluate(() => {
  const seccion = document.querySelector('#juegos')
  const r = seccion.getBoundingClientRect()
  return r.top < window.innerHeight / 2
})
verificar('el menú lleva a la sección', enJuegos)

// --- 5. Teclado ------------------------------------------------------------
console.log('\nAccesibilidad')
await pagina.keyboard.press('Tab')
const foco = await pagina.evaluate(() => {
  const el = document.activeElement
  return { etiqueta: el?.tagName, contorno: getComputedStyle(el).outlineWidth }
})
verificar('el foco de teclado se ve', foco.contorno !== '0px', JSON.stringify(foco))

const sinAlt = await pagina.evaluate(
  () => [...document.querySelectorAll('img')].filter((i) => i.getAttribute('alt') === null).length
)
verificar('todas las imágenes tienen alt', sinAlt === 0, `${sinAlt} sin alt`)

// --- Cierre ----------------------------------------------------------------
verificar('sin errores de JavaScript', erroresJs.length === 0, erroresJs[0]?.slice(0, 120))

await navegador.close()

console.log(`\n${ok} bien · ${mal} mal\n`)
process.exit(mal === 0 ? 0 : 1)
