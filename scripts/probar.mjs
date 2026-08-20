/**
 * PRUEBA FUNCIONAL DEL SITIO
 * ==========================
 *
 * No mira cómo se ve: mira si ANDA. Toca las cosas que un visitante toca y
 * verifica que respondan, en las seis páginas.
 *
 * ⚑ ANTES ERA UNA SOLA PÁGINA. Cuando el sitio se partió en seis, este script
 *   pasó a recorrerlas todas: lo que no se prueba, se rompe callado.
 *
 * Uso:  node scripts/probar.mjs [url]
 */

import { chromium } from 'playwright'

const BASE = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '')

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

const ir = async (ruta) => {
  await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' })
  await pagina.evaluate(() => document.fonts.ready)
}

// ===========================================================================
// 1. Lo que toda página tiene que traer
// ===========================================================================
console.log('\nEl armazón de cada página')

const RUTAS = ['/', '/gambeta', '/manager', '/player', '/test', '/perfil']

for (const ruta of RUTAS) {
  await ir(ruta)
  const nombre = ruta === '/' ? '/ (portada)' : ruta

  const titulo = await pagina.title()
  const descripcion = await pagina.getAttribute('meta[name="description"]', 'content')
  const og = await pagina.getAttribute('meta[property="og:image"]', 'content')
  const schemas = await pagina.locator('script[type="application/ld+json"]').count()
  const h1 = await pagina.locator('h1').count()

  verificar(
    `${nombre}: título, descripción, Open Graph y datos estructurados`,
    titulo.includes('Gambeta') && Boolean(descripcion) && Boolean(og) && schemas === 1,
    `título "${titulo.slice(0, 40)}…" · schemas ${schemas}`
  )
  verificar(`${nombre}: un solo h1`, h1 === 1, `${h1} encontrados`)
}

// El preload del hero sólo va en la portada: en las demás es peso al pedo.
await ir('/')
const preloadPortada = await pagina.locator('link[rel="preload"][as="image"]').count()
await ir('/gambeta')
const preloadOtra = await pagina.locator('link[rel="preload"][as="image"]').count()
verificar(
  'el preload del hero está sólo en la portada',
  preloadPortada === 1 && preloadOtra === 0,
  `portada ${preloadPortada} · gambeta ${preloadOtra}`
)

// ===========================================================================
// 2. La navegación entre páginas
// ===========================================================================
console.log('\nNavegación')

await ir('/')
const enlacesMenu = await pagina.locator('header nav[aria-label="Secciones"] a').count()
verificar('el menú de escritorio tiene las seis páginas', enlacesMenu === 6, `${enlacesMenu} enlaces`)

await pagina.locator('header nav[aria-label="Secciones"] a[href="/gambeta"]').first().click()
await pagina.waitForLoadState('networkidle')
verificar('el menú lleva a otra página', new URL(pagina.url()).pathname.startsWith('/gambeta'), pagina.url())

const marcado = await pagina.locator('header nav a[aria-current="page"]').first().textContent()
verificar('la página abierta queda marcada en el menú', marcado?.trim() === 'Gambeta', marcado?.trim())

// ===========================================================================
// 3. La portada
// ===========================================================================
console.log('\nPortada')

await ir('/')
const escenarios = await pagina.locator('[data-escenario]').count()
verificar('hay un scrollytelling por juego', escenarios === 3, `${escenarios} escenarios`)

verificar(
  'las tres cards del hub están',
  (await pagina.locator('#juegos article').count()) === 3
)

/**
 * El escenario responde al scroll: el panel fijo se reescribe y el fondo cambia.
 *
 * ⚠ NO SE MIRA UN ELEMENTO SUELTO: según dónde caiga el scroll al entrar, la
 *   etapa activa puede no ser la primera, y comparar contra la 0 no probaría
 *   nada. Lo que se compara es CUÁL etapa manda antes y después.
 */
const estadoEscenario = async () =>
  pagina.evaluate(() => {
    const bloque = document.querySelector('#presentacion-manager [data-escenario]')
    const fondos = [...bloque.querySelectorAll('[data-escenario-fondo]')]
    return {
      titulo: bloque.querySelector('[data-escenario-titulo]')?.textContent?.trim() ?? '',
      fondo: fondos.findIndex((f) => f.style.opacity === '1'),
    }
  })

await pagina.locator('#presentacion-manager [data-etapa="p-sala"]').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(900)
const arriba = await estadoEscenario()
await pagina.locator('#presentacion-manager [data-etapa="p-tabla"]').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(900)
const abajo = await estadoEscenario()

verificar(
  'el panel fijo se reescribe al bajar',
  Boolean(arriba.titulo) && Boolean(abajo.titulo) && arriba.titulo !== abajo.titulo,
  `"${arriba.titulo}" → "${abajo.titulo}"`
)
verificar(
  'y el fondo cambia con la etapa',
  arriba.fondo !== -1 && abajo.fondo !== -1 && abajo.fondo > arriba.fondo,
  `fondo ${arriba.fondo} → ${abajo.fondo}`
)

// La portada dejó de usar GSAP: el escenario lo hace con JavaScript a secas.
verificar(
  'la portada no descarga GSAP',
  !(await pagina.content()).includes('gsap'),
  'aparece "gsap" en el HTML'
)

// El formulario de avisos
await pagina.locator('#avisame').scrollIntoViewIfNeeded()
await pagina.fill('[data-aviso] input[type="email"]', 'no-es-un-mail')
await pagina.click('[data-aviso] button[type="submit"]')
await pagina.waitForTimeout(300)
let mensaje = await pagina.locator('[data-aviso-mensaje]').textContent()
verificar('el formulario rechaza un mail inválido', /válido/i.test(mensaje ?? ''), mensaje?.trim())

await pagina.fill('[data-aviso] input[type="email"]', 'juan@ejemplo.com')
await pagina.click('[data-aviso] button[type="submit"]')
await pagina.waitForTimeout(600)
mensaje = await pagina.locator('[data-aviso-mensaje]').textContent()
verificar('y acepta uno válido', /listo/i.test(mensaje ?? ''), mensaje?.trim())

// ===========================================================================
// 4. El mundo: explorador de ligas
// ===========================================================================
console.log('\nExplorador de ligas')

await ir('/gambeta')
verificar(
  'los datos del catálogo llegan renderizados',
  (await pagina.content()).includes('Prenier League')
)

await pagina.locator('#ligas').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(1200)

const tablaLigas = pagina.locator('#ligas table tbody tr')
verificar('la tabla de clubes se pintó', (await tablaLigas.count()) > 10, `${await tablaLigas.count()} filas`)

await pagina.fill('#ligas input[type="search"]', 'argentina')
await pagina.waitForTimeout(400)
const pestanias = pagina.locator('#ligas [role="tab"]')
verificar(
  'el buscador de ligas filtra',
  (await pestanias.count()) > 0 && (await pestanias.count()) < 10,
  `${await pestanias.count()} ligas`
)

await pestanias.first().click()
await pagina.waitForTimeout(1400)
const encabezado = await pagina.locator('#ligas h3').first().textContent()
verificar('abrir otra liga trae sus datos', !encabezado?.includes('Prenier'), encabezado?.trim())
verificar('y la tabla se repobló', (await tablaLigas.count()) > 10, `${await tablaLigas.count()} filas`)

const antesDeOrdenar = await tablaLigas.first().textContent()
await pagina.locator('#ligas th button', { hasText: 'Jug.' }).click()
await pagina.waitForTimeout(300)
verificar('las columnas ordenan', antesDeOrdenar !== (await tablaLigas.first().textContent()))

// ===========================================================================
// 5. El mundo: buscador de jugadores
// ===========================================================================
console.log('\nBuscador de jugadores')

await pagina.locator('#jugadores').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(1800)

const tablaPlantel = pagina.locator('#jugadores table tbody tr')
verificar('el plantel del primer club se pintó', (await tablaPlantel.count()) > 15, `${await tablaPlantel.count()} filas`)

// Cambiar de club dentro de la liga
const clubes = pagina.locator('#jugadores [role="tab"]')
const primerJugador = await tablaPlantel.first().textContent()
await clubes.nth(2).click()
await pagina.waitForTimeout(400)
verificar(
  'cambiar de club cambia el plantel',
  primerJugador !== (await tablaPlantel.first().textContent())
)

// Ordenar por puesto: el primero pasa a ser un arquero
await pagina.locator('#jugadores button', { hasText: 'Puesto' }).click()
await pagina.waitForTimeout(300)
verificar(
  'ordenar por puesto arranca por el arco',
  ((await tablaPlantel.first().textContent()) ?? '').includes('POR'),
  (await tablaPlantel.first().textContent())?.trim().slice(0, 40)
)

// Buscar un jugador en toda la liga
await pagina.fill('#jugadores input[type="search"]', 'ar')
await pagina.waitForTimeout(500)
const filasBusqueda = await tablaPlantel.count()
verificar('buscar por nombre devuelve resultados de toda la liga', filasBusqueda > 5, `${filasBusqueda} filas`)

await pagina.fill('#jugadores input[type="search"]', 'zzzzqx')
await pagina.waitForTimeout(400)
verificar(
  'y avisa cuando no hay ninguno',
  await pagina.locator('#jugadores', { hasText: 'No hay ningún futbolista' }).isVisible()
)
await pagina.fill('#jugadores input[type="search"]', '')

// Cambiar de liga: pide el JSON de la nueva
await pagina.selectOption('#jugadores select', { index: 3 })
await pagina.waitForTimeout(1500)
verificar('cambiar de liga trae otros planteles', (await tablaPlantel.count()) > 10, `${await tablaPlantel.count()} filas`)

// ===========================================================================
// 6. El formulario de "sumá tu equipo"
// ===========================================================================
console.log('\nSumá tu equipo')

await pagina.locator('#sumate').scrollIntoViewIfNeeded()
await pagina.fill('[data-sumate] input[name="nombre"]', 'Ferro Carril Oeste')
await pagina.fill('[data-sumate] input[name="pais"]', 'Argentina')
await pagina.fill('[data-sumate] input[name="email"]', 'no-es-un-mail')
await pagina.click('[data-sumate] button[type="submit"]')
await pagina.waitForTimeout(300)
let mensajeSumate = await pagina.locator('[data-sumate-mensaje]').textContent()
verificar('rechaza un mail inválido', /válido/i.test(mensajeSumate ?? ''), mensajeSumate?.trim())

await pagina.fill('[data-sumate] input[type="email"]', 'juan@ejemplo.com')
await pagina.click('[data-sumate] button[type="submit"]')
await pagina.waitForTimeout(600)
mensajeSumate = await pagina.locator('[data-sumate-mensaje]').textContent()
verificar('y guarda el pedido', /listo/i.test(mensajeSumate ?? ''), mensajeSumate?.trim())

const guardado = await pagina.evaluate(() => JSON.parse(localStorage.getItem('gambeta:pedidos') ?? '[]'))
verificar(
  'el pedido queda guardado con su tipo y su origen',
  guardado.length > 0 && guardado[0].nombre === 'Ferro Carril Oeste' && Boolean(guardado[0].origen),
  JSON.stringify(guardado[0] ?? {}).slice(0, 60)
)

// ===========================================================================
// 7. La página del Manager
// ===========================================================================
console.log('\nManager')

await ir('/manager')
verificar(
  'la página tiene sus tres escenarios (club, selección y alma)',
  (await pagina.locator('[data-escenario]').count()) === 3,
  `${await pagina.locator('[data-escenario]').count()}`
)
verificar(
  'y las catorce etapas, cada una con su fondo',
  (await pagina.locator('#camino [data-paso]').count()) === 14 &&
    (await pagina.locator('#camino [data-escenario-fondo]').count()) === 14,
  `${await pagina.locator('#camino [data-paso]').count()} pasos`
)
verificar(
  'la etapa "y mucho más" sigue mostrando su mosaico',
  (await pagina.locator('[data-etapa="mas"] img').count()) === 4
)
verificar(
  'las capturas del juego están',
  (await pagina.locator('img[src*="/assets/screenshots/"]').count()) > 10,
  `${await pagina.locator('img[src*="/assets/screenshots/"]').count()} imágenes`
)
verificar('el alma sigue estando', (await pagina.locator('#alma').count()) === 1)

/**
 * LA PIZARRA DEL ALMA.
 *
 * ⚠ ESTAS PRUEBAS EXISTEN POR DOS ERRORES QUE TUVO QUE REPORTAR EL DUEÑO:
 *
 *   1. la versión con GSAP se rompió al cambiar el layout y las fichas
 *      quedaron congeladas, sin error ni aviso;
 *   2. el arreglo se pasó de largo y puso CUATRO pizarras scrolleando como si
 *      fueran fotos, cuando lo que tiene que haber es UNA con los once
 *      moviéndose adentro.
 *
 * Por eso se verifica que haya una sola, y que las fichas cambien de lugar
 * de verdad al pasar de una etapa a la otra.
 */
verificar(
  'hay UNA sola pizarra',
  (await pagina.locator('[data-pizarra]').count()) === 1,
  `${await pagina.locator('[data-pizarra]').count()}`
)
verificar(
  'con sus once fichas',
  (await pagina.locator('#alma .ficha').count()) === 11,
  `${await pagina.locator('#alma .ficha').count()} fichas`
)

const dondeEsta = (ficha) =>
  pagina.locator(`#alma [data-ficha="${ficha}"]`).evaluate((el) => getComputedStyle(el).transform)
const laEtiqueta = () => pagina.locator('#alma [data-pizarra-etiqueta]').textContent()

await pagina.locator('[data-etapa="alma-pizarra"]').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(1500)
const formacionUno = await laEtiqueta()
const fichaUno = await dondeEsta(9)

await pagina.locator('[data-etapa="alma-partido"]').scrollIntoViewIfNeeded()
await pagina.waitForTimeout(1600)
const formacionDos = await laEtiqueta()
const fichaDos = await dondeEsta(9)

verificar(
  'las fichas se mueven al cambiar de etapa',
  fichaUno !== fichaDos,
  `${fichaUno} → ${fichaDos}`
)
verificar(
  'y la formación anunciada cambia con ellas',
  formacionUno !== formacionDos,
  `${formacionUno?.trim()} → ${formacionDos?.trim()}`
)

// El cabeceo permanente: aunque no se scrollee, la cancha no está muerta.
const cabeceoAntes = await pagina
  .locator('#alma .ficha')
  .first()
  .evaluate((el) => getComputedStyle(el).translate)
await pagina.waitForTimeout(1100)
verificar(
  'y cabecean aunque no se scrollee',
  cabeceoAntes !==
    (await pagina.locator('#alma .ficha').first().evaluate((el) => getComputedStyle(el).translate)),
  cabeceoAntes
)

verificar('y /manager dejó de cargar GSAP', !(await pagina.content()).includes('gsap'))

// ===========================================================================
// 8. Las dos que vienen
// ===========================================================================
console.log('\nPlayer y Test')

for (const ruta of ['/player', '/test']) {
  await ir(ruta)
  const video = await pagina.locator('[data-video-pronto]').count()
  const poster = await pagina.locator('[data-imagen-pronto]').count()
  verificar(`${ruta}: tiene video de fondo con su póster`, video === 1 && poster === 1)
  verificar(
    `${ruta}: dice que todavía no salió`,
    /muy pronto/i.test((await pagina.locator('main').textContent()) ?? '')
  )
  verificar(`${ruta}: tiene el formulario para avisar`, (await pagina.locator('[data-aviso]').count()) === 1)
}

// ===========================================================================
// 9. El perfil
// ===========================================================================
console.log('\nPerfil')

await ir('/perfil')
await pagina.waitForTimeout(1200)
const textoPerfil = (await pagina.locator('main').textContent()) ?? ''
const hayCuentas = !/Las cuentas abren con el juego/i.test(textoPerfil)
verificar(
  hayCuentas
    ? 'la isla del perfil muestra el formulario de entrada'
    : 'sin cuentas configuradas, el perfil lo dice y no rompe',
  hayCuentas
    ? (await pagina.locator('input[type="password"]').count()) === 1
    : /Las cuentas abren con el juego/i.test(textoPerfil)
)

// ===========================================================================
// 10. Accesibilidad y salud general
// ===========================================================================
console.log('\nAccesibilidad')

await ir('/')
await pagina.keyboard.press('Tab')
const foco = await pagina.evaluate(() => {
  const el = document.activeElement
  return { etiqueta: el?.tagName, contorno: getComputedStyle(el).outlineWidth }
})
verificar('el foco de teclado se ve', foco.contorno !== '0px', JSON.stringify(foco))

let sinAltTotal = 0
for (const ruta of RUTAS) {
  await ir(ruta)
  sinAltTotal += await pagina.evaluate(
    () => [...document.querySelectorAll('img')].filter((i) => i.getAttribute('alt') === null).length
  )
}
verificar('todas las imágenes de las seis páginas tienen alt', sinAltTotal === 0, `${sinAltTotal} sin alt`)

verificar('sin errores de JavaScript', erroresJs.length === 0, erroresJs[0]?.slice(0, 140))

await navegador.close()

console.log(`\n${ok} bien · ${mal} mal\n`)
process.exit(mal === 0 ? 0 : 1)
