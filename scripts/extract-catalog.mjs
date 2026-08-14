/**
 * EXTRACTOR DEL CATÁLOGO DE GAMBETA MANAGER
 * =========================================
 *
 * Lee —SIN ESCRIBIR NADA— las migraciones SQL de `cyberfoot-online` y genera
 * los JSON que consume este sitio.
 *
 * ⛔ LA CARPETA DEL JUEGO ES SOLO LECTURA. Este script abre archivos con
 *    `readFileSync` y nada más. Todo lo que produce cae dentro de gambeta-web.
 *
 * POR QUÉ SE PARSEA SQL Y NO LOS JSON DE `scripts/raw/`
 * -----------------------------------------------------
 * Los crudos de `scripts/raw/` tienen NOMBRES REALES (Wikipedia, EA, Transfermarkt).
 * El catálogo del juego, en cambio, los muta a propósito. La cabecera de la 0081
 * lo dice sin vueltas:
 *
 *     "Nombres de club y de liga: reales con UNA letra cambiada.
 *      Nombres de jugador: generados a partir de nombres comunes de cada país.
 *      Ningún nombre real llega a esta base."
 *
 * O sea: la web tiene que mostrar "Prenier League" y no "Premier League". Es lo
 * que ve el jugador, y es lo único publicable.
 *
 * EL ORDEN IMPORTA
 * ----------------
 * El estado final de un jugador no está en una sola migración. Se replica la
 * cadena, en el mismo orden en que Postgres las corre:
 *
 *   0081  siembra el catálogo entero (países, ligas, clubes, jugadores)
 *   0110  marca como `excluded` los clubes femeniles (no los borra: FK CASCADE)
 *   0112  inserta los 10 clubes masculinos que le faltaban a la Liga MX
 *   0119  fuerza/habilidades de los 11.935 que cruzaron contra EA
 *   0120  los derivados, recalibrados
 *   0121  los de valor de mercado
 *   0122  los sintéticos, llevados a la misma escala
 *   0124  los doce puestos finos + pierna hábil
 *   0126  el techo (potencial)
 *
 * Uso:  node scripts/extract-catalog.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

/** ⛔ SOLO LECTURA. Nunca se escribe un byte dentro de esta ruta. */
const GAME = 'C:/Users/Juan/cyberfoot-online'
const MIGRATIONS = join(GAME, 'supabase/migrations')

const OUT_SRC = join(ROOT, 'src/data')
const OUT_PUBLIC = join(ROOT, 'public/data/ligas')

// ---------------------------------------------------------------------------
// 1. Un parser de literales de Postgres, lo justo y necesario
// ---------------------------------------------------------------------------

/**
 * Parte el interior de una tupla por las comas de PRIMER nivel.
 *
 * No alcanza con `split(',')`: los valores traen JSON (`{"a":1,"b":2}`), arrays
 * (`array['x','y']`) y textos con comas adentro (`'Club Atlético, S.A.'`).
 */
function splitTopLevel(inner) {
  const parts = []
  let buf = ''
  let depth = 0
  let inString = false

  for (let i = 0; i < inner.length; i += 1) {
    const c = inner[i]

    if (inString) {
      // En SQL una comilla se escapa duplicándola: 'D''Alessandro'
      if (c === "'" && inner[i + 1] === "'") { buf += "''"; i += 1; continue }
      if (c === "'") { inString = false; buf += c; continue }
      buf += c
      continue
    }

    if (c === "'") { inString = true; buf += c; continue }
    if (c === '(' || c === '[') { depth += 1; buf += c; continue }
    if (c === ')' || c === ']') { depth -= 1; buf += c; continue }
    if (c === ',' && depth === 0) { parts.push(buf.trim()); buf = ''; continue }

    buf += c
  }

  if (buf.trim()) parts.push(buf.trim())
  return parts
}

/** Saca el `::tipo` del final, respetando `::player_trait[]`. */
function stripCast(token) {
  return token.replace(/::[a-z_]+(\[\])?$/i, '').trim()
}

/** Convierte un literal de Postgres al valor de JavaScript que corresponde. */
function parseValue(rawToken) {
  const token = stripCast(rawToken)

  if (token === '' || token.toLowerCase() === 'null') return null
  if (token.toLowerCase() === 'true') return true
  if (token.toLowerCase() === 'false') return false

  // array['passing','positioning']
  if (/^array\s*\[/i.test(token)) {
    const inner = token.slice(token.indexOf('[') + 1, token.lastIndexOf(']'))
    if (!inner.trim()) return []
    return splitTopLevel(inner).map((t) => parseValue(t))
  }

  if (token.startsWith("'")) {
    const text = token.slice(1, token.lastIndexOf("'")).replace(/''/g, "'")
    // Si el literal original venía casteado a jsonb, es un objeto.
    if (/::jsonb$/i.test(rawToken.trim())) {
      try { return JSON.parse(text) } catch { return text }
    }
    return text
  }

  const n = Number(token)
  return Number.isNaN(n) ? token : n
}

/**
 * Recorre un .sql y devuelve los bloques de filas que encuentra.
 *
 * Reconoce las dos formas que usan estas migraciones:
 *   `insert into tabla (a, b, c) values` ... `;`
 *   `from (values` ... `) as v(a, b, c)`
 */
function readBlocks(file) {
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
  const lines = sql.split('\n')
  const blocks = []

  let current = null
  let pending = ''

  const flushRow = (raw) => {
    const open = raw.indexOf('(')
    const close = raw.lastIndexOf(')')
    if (open === -1 || close === -1) return
    current.rows.push(splitTopLevel(raw.slice(open + 1, close)))
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('--')) continue

    const insert = trimmed.match(/^insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values/i)
    if (insert) {
      current = { kind: 'insert', table: insert[1], cols: insert[2].split(',').map((c) => c.trim()), rows: [] }
      blocks.push(current)
      continue
    }

    if (/^from\s*\(values/i.test(trimmed)) {
      current = { kind: 'update', table: null, cols: null, rows: [] }
      blocks.push(current)
      continue
    }

    // Cierre de un bloque `from (values ... ) as v(cols)`
    const asV = trimmed.match(/^\)\s*as\s+v\s*\(([^)]+)\)/i)
    if (asV && current) {
      current.cols = asV[1].split(',').map((c) => c.trim())
      current = null
      continue
    }

    if (!current) continue

    // Una fila puede, en teoría, venir cortada en varias líneas.
    const candidate = pending ? `${pending} ${trimmed}` : trimmed
    if (!candidate.startsWith('(')) { pending = ''; continue }

    let depth = 0
    let inString = false
    for (let i = 0; i < candidate.length; i += 1) {
      const c = candidate[i]
      if (inString) {
        if (c === "'" && candidate[i + 1] === "'") { i += 1; continue }
        if (c === "'") inString = false
        continue
      }
      if (c === "'") { inString = true; continue }
      if (c === '(' || c === '[') depth += 1
      if (c === ')' || c === ']') depth -= 1
    }

    if (depth === 0) { flushRow(candidate); pending = '' }
    else pending = candidate

    if (/;\s*$/.test(trimmed) || /^on\s+conflict/i.test(trimmed)) current = null
  }

  return blocks
}

/** Convierte los bloques de una tabla en objetos {columna: valor}. */
function rowsOf(blocks, predicate) {
  const out = []
  for (const block of blocks) {
    if (!predicate(block)) continue
    for (const row of block.rows) {
      const obj = {}
      block.cols.forEach((col, i) => { obj[col] = parseValue(row[i] ?? 'null') })
      out.push(obj)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// 2. Vocabulario del juego (copiado de src/game/positions.js del repo original)
// ---------------------------------------------------------------------------

const POSITION_LABEL = {
  POR: 'Arquero',
  DFC: 'Defensor central',
  LD: 'Lateral derecho',
  LI: 'Lateral izquierdo',
  MCD: 'Volante central defensivo',
  MC: 'Volante central',
  MCO: 'Volante central ofensivo',
  MD: 'Volante por derecha',
  MI: 'Volante por izquierda',
  ED: 'Extremo derecho',
  EI: 'Extremo izquierdo',
  DC: 'Delantero centro',
  // Los cinco viejos, por si algún jugador nunca llegó a la 0124
  G: 'Arquero', DL: 'Lateral', V: 'Volante', A: 'Delantero',
}

const POSITION_LINE = {
  POR: 'keeper', G: 'keeper',
  DFC: 'defense', LD: 'defense', LI: 'defense', DL: 'defense',
  MCD: 'midfield', MC: 'midfield', MCO: 'midfield', MD: 'midfield', MI: 'midfield', V: 'midfield',
  ED: 'attack', EI: 'attack', DC: 'attack', A: 'attack',
}

const FOOT_LABEL = { D: 'Diestro', I: 'Zurdo', A: 'Ambidiestro', C: 'Diestro' }

/**
 * Estrella y crack, con el umbral del juego.
 *
 * ⚠ Se RECALCULA desde la fuerza final en vez de leer las columnas `is_star` /
 * `is_world_class` de la 0081: esos flags se escribieron antes de la
 * recalibración de las 0119-0122, así que quedaron desfasados. El umbral sale
 * de `scripts/derive/rating.mjs` del repo original:
 *
 *     return { isStar: strength >= 84, isWorldClass: strength >= 91 }
 */
const STAR_FROM = 84
const WORLD_CLASS_FROM = 91

/** Slug estable para URLs y nombres de archivo. */
function slugify(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0)
const round1 = (n) => Math.round(n * 10) / 10

// ---------------------------------------------------------------------------
// 3. Replicar la cadena de migraciones
// ---------------------------------------------------------------------------

console.log('Leyendo el catálogo… (solo lectura sobre cyberfoot-online)\n')

// --- 0081: la siembra completa -------------------------------------------
const seed = readBlocks('0081_seed_catalogo_v17.sql')

const countries = new Map()
for (const c of rowsOf(seed, (b) => b.kind === 'insert' && b.table === 'countries')) {
  countries.set(c.id, c)
}

const competitions = new Map()
for (const c of rowsOf(seed, (b) => b.kind === 'insert' && b.table === 'competitions')) {
  competitions.set(c.id, c)
}

const teams = new Map()
for (const t of rowsOf(seed, (b) => b.kind === 'insert' && b.table === 'teams')) {
  teams.set(t.id, { ...t, excluded: false })
}

const players = new Map()
for (const p of rowsOf(seed, (b) => b.kind === 'insert' && b.table === 'players')) {
  players.set(p.id, p)
}

console.log(`  0081  ${countries.size} países · ${competitions.size} competiciones · ${teams.size} clubes · ${players.size} jugadores`)

// --- 0110: los femeniles salen (marcados, no borrados) --------------------
// El regex es el mismo de la migración, sobre los nombres YA MUTADOS.
const FEMENIL = /femen|fenen|femin|fenin|women|ladies|frauen|damen/i
let excluded = 0
for (const t of teams.values()) {
  if (FEMENIL.test(t.name)) { t.excluded = true; excluded += 1 }
}
console.log(`  0110  ${excluded} clubes marcados como excluidos`)

// --- 0112: la Liga MX recupera sus masculinos -----------------------------
const ligaMx = readBlocks('0112_liga_mx_recovers_its_mens_clubs.sql')
let addedTeams = 0
for (const t of rowsOf(ligaMx, (b) => b.kind === 'insert' && b.table === 'teams')) {
  if (!teams.has(t.id)) { teams.set(t.id, { ...t, excluded: false }); addedTeams += 1 }
}
let addedPlayers = 0
for (const p of rowsOf(ligaMx, (b) => b.kind === 'insert' && b.table === 'players')) {
  if (!players.has(p.id)) { players.set(p.id, p); addedPlayers += 1 }
}
console.log(`  0112  +${addedTeams} clubes · +${addedPlayers} jugadores`)

// --- 0119 a 0122: la fuerza definitiva ------------------------------------
for (const file of [
  '0119_real_player_ratings.sql',
  '0120_recalibrated_derived_ratings.sql',
  '0121_market_value_ratings.sql',
  '0122_synthetic_players_same_scale.sql',
]) {
  let touched = 0
  for (const patch of rowsOf(readBlocks(file), (b) => b.kind === 'update')) {
    const player = players.get(patch.id)
    if (!player) continue
    Object.assign(player, patch)
    touched += 1
  }
  console.log(`  ${file.slice(0, 4)}  ${touched} jugadores actualizados`)
}

// --- 0124: los doce puestos finos ----------------------------------------
// ⚠ La 0124 trae DOS clases de bloque intercalados: 75 de `(id, position,
//   secondary, side)` y 75 de `(id, pace, shooting, ...)`. Si se asigna a
//   ciegas, el bloque de habilidades pisa `position` con undefined.
let repositioned = 0
for (const patch of rowsOf(readBlocks('0124_fine_positions_and_feet.sql'), (b) => b.kind === 'update')) {
  const player = players.get(patch.id)
  if (!player || patch.position === undefined) continue
  player.position = patch.position
  player.secondary = patch.secondary
  player.side = patch.side
  repositioned += 1
}
console.log(`  0124  ${repositioned} jugadores con puesto fino`)

// --- 0126: el techo -------------------------------------------------------
let withCeiling = 0
for (const patch of rowsOf(readBlocks('0126_the_ceiling_is_real.sql'), (b) => b.kind === 'update')) {
  const player = players.get(patch.id)
  if (!player) continue
  player.potential = patch.potential
  withCeiling += 1
}
console.log(`  0126  ${withCeiling} jugadores con techo\n`)

// ---------------------------------------------------------------------------
// 4. Armar el modelo que consume el sitio
// ---------------------------------------------------------------------------

// Sólo ligas de verdad, y sólo clubes que el juego sigue mostrando.
const liveTeams = [...teams.values()].filter((t) => !t.excluded && competitions.has(t.competition_id))
const teamById = new Map(liveTeams.map((t) => [t.id, t]))

const squadOf = new Map()
for (const p of players.values()) {
  if (!teamById.has(p.team_id)) continue
  if (!squadOf.has(p.team_id)) squadOf.set(p.team_id, [])
  squadOf.get(p.team_id).push(p)
}

/** Un jugador, con lo justo para pintarlo en pantalla. */
function playerCard(p, team) {
  const competition = competitions.get(team.competition_id)
  const country = countries.get(p.country_id)
  return {
    id: p.id,
    nombre: p.name,
    dorsal: p.shirt_number,
    puesto: p.position,
    puestoLabel: POSITION_LABEL[p.position] ?? p.position,
    linea: POSITION_LINE[p.position] ?? 'midfield',
    pierna: FOOT_LABEL[p.side] ?? null,
    fuerza: p.strength,
    techo: p.potential ?? null,
    edad: p.age,
    valor: p.value,
    crack: p.strength >= WORLD_CLASS_FROM,
    estrella: p.strength >= STAR_FROM,
    caracteristicas: Array.isArray(p.traits) ? p.traits : [],
    club: team.name,
    clubColores: team.colors ?? null,
    liga: competition?.name ?? null,
    pais: country?.code ?? null,
    paisNombre: country?.name ?? null,
  }
}

/** Un club, con la media de su plantel. */
function teamCard(t) {
  const squad = squadOf.get(t.id) ?? []
  const strengths = squad.map((p) => p.strength).filter((n) => typeof n === 'number')
  const eleven = [...strengths].sort((a, b) => b - a).slice(0, 11)
  return {
    id: t.id,
    nombre: t.name,
    sigla: t.short_name,
    ciudad: t.city,
    colores: t.colors ?? null,
    nivel: t.level,
    reputacion: t.reputation,
    estadio: t.stadium_name,
    aforo: t.stadium_seats,
    tecnico: t.manager_name,
    presupuesto: t.base_budget,
    plantel: squad.length,
    media: round1(avg(strengths)),
    mediaTitulares: round1(avg(eleven)),
  }
}

const leagues = []
for (const comp of competitions.values()) {
  const country = countries.get(comp.country_id)
  const clubs = liveTeams.filter((t) => t.competition_id === comp.id)
  if (!clubs.length) continue

  const cards = clubs.map(teamCard).sort((a, b) => b.mediaTitulares - a.mediaTitulares)
  const squad = clubs.flatMap((t) => squadOf.get(t.id) ?? [])
  const strengths = squad.map((p) => p.strength).filter((n) => typeof n === 'number')

  leagues.push({
    id: comp.id,
    slug: slugify(`${country?.code ?? 'x'}-${comp.name}`),
    nombre: comp.name,
    pais: country?.code ?? null,
    paisNombre: country?.name ?? null,
    confederacion: country?.confederation ?? null,
    division: comp.tier,
    equipos: cards.length,
    jugadores: squad.length,
    fechas: comp.format?.matchdays ?? null,
    formato: comp.format?.kind ?? null,
    descensos: comp.format?.relegation_slots ?? null,
    media: round1(avg(strengths)),
    orden: comp.display_order,
    // Lo que se pinta sin abrir la liga
    mejorClub: cards[0]?.nombre ?? null,
    mejorClubMedia: cards[0]?.mediaTitulares ?? null,
    clubes: cards,
    figuras: squad
      .slice()
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10)
      .map((p) => playerCard(p, teamById.get(p.team_id))),
  })
}

leagues.sort((a, b) => b.media - a.media)

// ---------------------------------------------------------------------------
// 5. Escribir (todo dentro de gambeta-web)
// ---------------------------------------------------------------------------

if (!existsSync(OUT_SRC)) mkdirSync(OUT_SRC, { recursive: true })
if (!existsSync(OUT_PUBLIC)) mkdirSync(OUT_PUBLIC, { recursive: true })

const write = (path, data) => {
  writeFileSync(path, JSON.stringify(data, null, 0), 'utf8')
  const kb = Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024)
  console.log(`  → ${path.replace(ROOT, '.')}  ${kb} KB`)
}

// 5.1 Resumen de ligas: liviano, se renderiza en el HTML.
write(join(OUT_SRC, 'ligas.json'), leagues.map(({ clubes, figuras, ...rest }) => ({
  ...rest,
  clubesTop: clubes.slice(0, 3).map((c) => ({ nombre: c.nombre, media: c.mediaTitulares, colores: c.colores })),
})))

// 5.2 El detalle de cada liga: se pide sólo cuando el usuario abre la pestaña.
const detalle = (league) => ({
  slug: league.slug,
  nombre: league.nombre,
  paisNombre: league.paisNombre,
  division: league.division,
  media: league.media,
  fechas: league.fechas,
  descensos: league.descensos,
  clubes: league.clubes,
  figuras: league.figuras,
})

for (const league of leagues) {
  write(join(OUT_PUBLIC, `${league.slug}.json`), detalle(league))
}

// La liga que se muestra abierta al entrar viaja EN el HTML: sin spinner en el
// primer pintado, y con contenido de verdad para el buscador.
write(join(OUT_SRC, 'liga-destacada.json'), detalle(leagues[0]))

// 5.3 Las figuras del mundo.
const everyone = [...players.values()].filter((p) => teamById.has(p.team_id))
const top = everyone
  .slice()
  .sort((a, b) => b.strength - a.strength)
  .slice(0, 24)
  .map((p) => playerCard(p, teamById.get(p.team_id)))
write(join(OUT_SRC, 'figuras.json'), top)

// 5.4 Las promesas: mayor margen de crecimiento, sub-21.
const promises = everyone
  .filter((p) => p.age <= 21 && typeof p.potential === 'number')
  .map((p) => ({ p, margen: p.potential - p.strength }))
  .sort((a, b) => (b.p.potential - a.p.potential) || (b.margen - a.margen))
  .slice(0, 12)
  .map(({ p, margen }) => ({ ...playerCard(p, teamById.get(p.team_id)), margen }))
write(join(OUT_SRC, 'promesas.json'), promises)

// 5.4b El plantel completo de un club, para el harness de capturas.
//
// `scripts/capturas.mjs` monta los componentes REALES del juego (la cancha, la
// planilla del plantel, el panel de táctica) y necesita jugadores con la misma
// forma que tienen en la base. Se elige el mejor club de la mejor liga.
const clubDemo = liveTeams.find((t) => t.id === leagues[0].clubes[0].id)
if (clubDemo) {
  const squad = (squadOf.get(clubDemo.id) ?? [])
    .slice()
    .sort((a, b) => b.strength - a.strength)
  write(join(OUT_SRC, 'plantel-demo.json'), {
    club: {
      id: clubDemo.id,
      name: clubDemo.name,
      short_name: clubDemo.short_name,
      colors: clubDemo.colors,
      stadium_name: clubDemo.stadium_name,
      manager_name: clubDemo.manager_name,
      level: clubDemo.level,
    },
    // Los nombres de campo son los de Postgres a propósito: así entran en los
    // componentes del juego sin traducir nada.
    jugadores: squad.map((p, i) => ({
      id: p.id,
      name: p.name,
      shirt_number: p.shirt_number ?? i + 1,
      position: p.position,
      side: p.side,
      strength: p.strength,
      age: p.age,
      value: p.value,
      potential: p.potential ?? null,
      is_star: p.strength >= STAR_FROM,
      is_world_class: p.strength >= WORLD_CLASS_FROM,
      // Estado del día: el catálogo no lo trae porque nace con la sala.
      condition: 100,
      morale: 75,
      ban_matches: 0,
      injured_until: null,
    })),
  })
}

// 5.4c UNA SALA ENTERA, para el harness de capturas.
//
// El escritorio, el buscador, el mercado, las tablas y la fecha en vivo no
// dibujan un plantel: dibujan una PARTIDA. Necesitan la liga completa, con sus
// veinte clubes y sus quinientos y pico de jugadores, y con la forma exacta que
// tienen las filas de `room_teams` / `room_players` en la base.
const ligaDemo = leagues[0]
const clubesDemo = ligaDemo.clubes
  .map((c) => teamById.get(c.id))
  .filter(Boolean)

/** Reparte estadísticas de temporada verosímiles a partir de la fuerza. */
function estadisticas(player, indice) {
  const semilla = (player.strength * 7 + indice * 13) % 100
  const titular = player.strength >= 78
  const partidos = titular ? 8 + (semilla % 5) : semilla % 7
  const atacante = ['DC', 'ED', 'EI', 'MCO'].includes(player.position)
  return {
    apps: partidos,
    goals: atacante ? Math.round((partidos * (semilla % 9)) / 14) : Math.round(partidos / 12),
    assists: Math.round((partidos * (semilla % 6)) / 18),
    clean_sheets: player.position === 'POR' ? Math.round(partidos / 3) : 0,
    rating_sum: partidos * (5.8 + (player.strength - 60) / 25),
  }
}

write(join(OUT_SRC, 'sala-demo.json'), {
  liga: { nombre: ligaDemo.nombre, pais: ligaDemo.paisNombre, codigo: ligaDemo.pais },
  equipos: clubesDemo.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    colors: t.colors,
    level: t.level,
    budget: t.base_budget,
    reputation: 'national',
    stadium_name: t.stadium_name,
    stadium_seats: t.stadium_seats,
    manager_name: t.manager_name,
  })),
  jugadores: clubesDemo.flatMap((t) =>
    (squadOf.get(t.id) ?? []).map((p, i) => ({
      id: p.id,
      room_team_id: t.id,
      name: p.name,
      shirt_number: p.shirt_number ?? i + 1,
      position: p.position,
      side: p.side,
      strength: p.strength,
      potential: p.potential ?? null,
      age: p.age,
      value: p.value,
      wage: p.wage,
      traits: Array.isArray(p.traits) ? p.traits : [],
      is_star: p.strength >= STAR_FROM,
      is_world_class: p.strength >= WORLD_CLASS_FROM,
      country_id: p.country_id,
      condition: 100,
      morale: 75,
      contract_until: 2 + (i % 3),
      injured_until: 0,
      ban_matches: 0,
      yellows: i % 3,
      reds: 0,
      transfer_listed: false,
      loan_listed: false,
      ...estadisticas(p, i),
    }))
  ),
})

// 5.5 Los números grandes del hero.
const allStrengths = everyone.map((p) => p.strength).filter((n) => typeof n === 'number')
write(join(OUT_SRC, 'numeros.json'), {
  paises: new Set(leagues.map((l) => l.pais)).size,
  ligas: leagues.length,
  clubes: liveTeams.length,
  jugadores: everyone.length,
  confederaciones: new Set(leagues.map((l) => l.confederacion)).size,
  mediaMundial: round1(avg(allStrengths)),
  cracks: everyone.filter((p) => p.strength >= WORLD_CLASS_FROM).length,
  estrellas: everyone.filter((p) => p.strength >= STAR_FROM).length,
  mejorFuerza: Math.max(...allStrengths),
  temporada: '2026/27',
  generado: new Date().toISOString().slice(0, 10),
})

console.log(`\nListo. ${leagues.length} ligas · ${liveTeams.length} clubes · ${everyone.length} jugadores.`)
