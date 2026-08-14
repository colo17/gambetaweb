/**
 * LA PARTIDA DE MENTIRA QUE ALIMENTA EL HARNESS
 * =============================================
 *
 * Arma el estado que el store del juego espera, pero con clubes y jugadores
 * REALES del catálogo (`src/data/sala-demo.json`, generado por
 * `scripts/extract-catalog.mjs`).
 *
 * ⚑ Los nombres de campo son los de Postgres a propósito (`room_team_id`,
 *   `shirt_number`, `home_lineup`): así entran en los componentes del juego sin
 *   traducir nada. La forma sale de la que usa `scripts/test-render.mjs` del
 *   propio repo del juego.
 */

import sala from '../src/data/sala-demo.json'
import { FORMATIONS } from '@/game/formations.js'

export const { liga, equipos, jugadores } = sala

/** El club que dirige el "jugador" de la captura: el mejor de la liga. */
export const MI_EQUIPO = equipos[0]
export const RIVAL = equipos.find((e) => e.name === 'Livelpool') ?? equipos[2]

export const jugadoresPorId = new Map(jugadores.map((p) => [p.id, p]))
export const equiposPorId = new Map(equipos.map((t) => [t.id, t]))

export const plantelDe = (equipoId) => jugadores.filter((p) => p.room_team_id === equipoId)

/** El mejor once disponible para una formación dada. */
export function armarOnce(formacion, plantel) {
  const usados = new Set()
  return formacion.slots.map((slot) => {
    const candidato =
      plantel.find((p) => !usados.has(p.id) && p.position === slot.position) ??
      plantel.find((p) => !usados.has(p.id))
    if (candidato) usados.add(candidato.id)
    return candidato?.id ?? null
  })
}

// ---------------------------------------------------------------------------
// La fecha: diez partidos, con el mío en el medio
// ---------------------------------------------------------------------------

const COMPETENCIA = 'comp-prenier'

/** Empareja los veinte clubes de a dos, arrancando por el mío contra el rival. */
function armarPartidos() {
  const resto = equipos.filter((e) => e.id !== MI_EQUIPO.id && e.id !== RIVAL.id)
  const cruces = [[MI_EQUIPO, RIVAL]]
  for (let i = 0; i + 1 < resto.length; i += 2) cruces.push([resto[i], resto[i + 1]])

  return cruces.map(([local, visita], i) => ({
    id: `match-${i}`,
    room_competition_id: COMPETENCIA,
    matchday: 12,
    home_id: local.id,
    away_id: visita.id,
    home: local,
    away: visita,
    /**
     * ⚠ El once se ARMA por puesto, no se corta con `slice(0, 11)`.
     *   Cortando salían cuatro arqueros en cancha y los cracks en el banco,
     *   que es exactamente lo que un manager NO hace.
     */
    home_lineup: armarOnce(FORMATIONS['4-3-3'], plantelDe(local.id)).filter(Boolean),
    away_lineup: armarOnce(FORMATIONS['4-4-2'], plantelDe(visita.id)).filter(Boolean),
    status: 'live',
    /**
     * ⚠ Los goles son una COLUMNA del partido, no se derivan de los eventos.
     *   La planilla lee `home_goals`/`away_goals`; sin ellos los diez cruces
     *   aparecían sin marcador, con un guión en el medio.
     */
    home_goals: i === 0 ? 1 : (i * 3) % 3,
    away_goals: i === 0 ? 0 : (i * 5) % 2,
    attendance: 40000 + ((i * 3137) % 22000),
    gate_revenue: 1_200_000 + ((i * 91_000) % 900_000),
    summary: {
      added: { first: 2, second: 4 },
      // Las estadísticas de la planilla. Sin esto sale todo en cero.
      homePossession: 45 + ((i * 7) % 20),
      homeShots: 8 + (i % 9),
      awayShots: 6 + ((i * 3) % 8),
      homeOnTarget: 3 + (i % 5),
      awayOnTarget: 2 + ((i * 2) % 4),
      homeFouls: 7 + (i % 6),
      awayFouls: 9 + ((i * 2) % 5),
      homeTackles: 12 + (i % 8),
      awayTackles: 14 + ((i * 3) % 7),
      homePasses: 380 + ((i * 37) % 220),
      awayPasses: 300 + ((i * 53) % 200),
      homePassAccuracy: 82 + (i % 9),
      awayPassAccuracy: 78 + ((i * 2) % 10),
    },
  }))
}

export const partidos = armarPartidos()

/**
 * Los eventos de la fecha. El mío va 1-0 con gol de córner al minuto 33; los
 * otros partidos llevan sus propios goles para que el marcador de los costados
 * no esté todo en cero.
 */
function armarEventos() {
  const evento = (o) => ({ id: Math.random().toString(36).slice(2), detail: {}, ...o })
  const salida = []

  const mio = partidos[0]
  const delantero = plantelDe(MI_EQUIPO.id).find((p) => p.position === 'DC') ?? plantelDe(MI_EQUIPO.id)[0]

  salida.push(
    evento({ match_id: mio.id, type: 'possession', minute: 29, room_team_id: mio.home_id, player_id: delantero.id }),
    evento({ match_id: mio.id, type: 'set_piece', minute: 30, room_team_id: mio.home_id, player_id: delantero.id, detail: { kind: 'corner' } }),
    evento({ match_id: mio.id, type: 'chance', minute: 32, room_team_id: mio.home_id, player_id: delantero.id, detail: { origin: 'corner', outcome: 'goal' } }),
    evento({ match_id: mio.id, type: 'goal', minute: 33, room_team_id: mio.home_id, player_id: delantero.id, detail: { origin: 'corner', outcome: 'goal' } })
  )

  // Un par de goles repartidos en los partidos de al lado.
  partidos.slice(1).forEach((p, i) => {
    if (i % 3 === 2) return
    const equipo = i % 2 ? p.away_id : p.home_id
    const autor = plantelDe(equipo)[i % 9]
    salida.push(
      evento({
        match_id: p.id,
        type: 'goal',
        minute: 12 + ((i * 9) % 25),
        room_team_id: equipo,
        player_id: autor?.id,
        detail: { origin: 'open', outcome: 'goal' },
      })
    )
  })

  return salida
}

export const eventos = armarEventos()

// ---------------------------------------------------------------------------
// Competiciones y tablas
// ---------------------------------------------------------------------------
/**
 * ⚑ ESTO NO SALE DEL CATÁLOGO, SE INVENTA ACÁ, y es la única parte del harness
 *   que no es dato real. El panel de Tablas no deriva las posiciones de los
 *   equipos: se las pide a la base con `loadCompetitions()` y
 *   `loadStandings(id)`. Como el Supabase del harness devuelve vacío, se
 *   reemplazan las dos funciones del store por estas, que arman una tabla
 *   verosímil a partir de la fuerza de cada plantel.
 */
export const competiciones = [
  { id: COMPETENCIA, name: liga.nombre, type: 'league', tier: 1, country: liga.pais },
  { id: 'copa-nacional', name: 'FA Cop', type: 'domestic_cup', tier: 1, country: liga.pais },
  { id: 'copa-continental', name: 'Champians League', type: 'continental', tier: 1, country: null },
  { id: 'copa-secundaria', name: 'Europa Leage', type: 'continental_secondary', tier: 2, country: null },
]

/** Fuerza media del once de un club, para ordenar la tabla con algún criterio. */
function fuerzaDe(equipoId) {
  const once = plantelDe(equipoId)
    .map((p) => p.strength)
    .sort((a, b) => b - a)
    .slice(0, 11)
  return once.reduce((a, b) => a + b, 0) / (once.length || 1)
}

export const posiciones = equipos
  .map((equipo) => ({ equipo, fuerza: fuerzaDe(equipo.id) }))
  .sort((a, b) => b.fuerza - a.fuerza)
  .map(({ equipo, fuerza }, i) => {
    /**
     * ⚠ TODO ENTERO. Una versión anterior dividía por 6 y por 2,1 sin
     *   redondear, y la tabla mostraba "10.833333333333334 PG" y
     *   "33.666666666666664 puntos". Un partido ganado es uno o ninguno.
     */
    const jugados = 12
    const ganados = Math.max(0, Math.min(jugados, Math.round((fuerza - 63) / 2.2)))
    const empatados = Math.min(jugados - ganados, (i * 3) % 4)
    const perdidos = jugados - ganados - empatados
    const aFavor = Math.round(ganados * 2.4 + empatados)
    const enContra = Math.round(perdidos * 1.9 + empatados)
    return {
      room_team_id: equipo.id,
      team: equipo,
      played: jugados,
      won: ganados,
      drawn: empatados,
      lost: perdidos,
      goals_for: aFavor,
      goals_against: enContra,
      goal_diff: aFavor - enContra,
      points: ganados * 3 + empatados,
      group_label: null,
    }
  })
  .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff)

/**
 * Las funciones del store que el harness reemplaza.
 *
 * ⚑ Se pisan las acciones, no sólo los datos: en zustand viven en el mismo
 *   objeto de estado. Todo lo que abajo devuelve algo es porque alguna pantalla
 *   se lo pide a la base y, con el Supabase falso, si no vuelve nada la
 *   pantalla queda en blanco.
 */
export const accionesFalsas = {
  // --- Datos que alguna pantalla consulta ---
  loadCompetitions: async () => competiciones,
  loadStandings: async () => posiciones,
  loadBracket: async () => [],
  loadRoomPlayers: async () => jugadores,
  loadCatalog: async () => ({ rows: jugadores.slice(0, 60), total: jugadores.length }),
  loadCatalogTeams: async () => equipos,
  searchCatalog: async () => ({ rows: jugadores.slice(0, 40), total: jugadores.length }),
  ensureSquad: async () => {},
  ensurePlayersOf: async () => {},
  worldStatus: async () => ({ total: 1339, ready: 1339, pending: 0, done: true }),

  // --- Selecciones ---
  offerNationalTeams: async () => selecciones.slice(0, 3),
  takeNationalTeam: async () => true,
  loadCountryPlayers: async () => convocables,
  loadNationalSquad: async () => [],
  setNationalSquad: async () => true,

  // --- Acciones que no tienen que hacer nada ---
  loadRoom: async () => {},
  loadMatchday: async () => {},
  loadMatchdayEvents: async () => {},
  subscribe: () => () => {},
  setStatus: async () => {},
  setReady: async () => {},
  resumeRoom: async () => {},
  expandWorld: async () => {},
  assignTeam: async () => {},
  updateTeam: async () => {},
  updatePlayer: async () => {},
  addPlayer: async () => {},
  removePlayer: async () => {},
  swapTeamLeagues: async () => {},
  replaceRoomTeam: async () => {},
  startNextMatchday: async () => {},
  setMatchSpeed: async () => {},
  afterMatchdayPath: () => '/sala/GAMBET/desk',
  clearError: () => {},
  playableTeamIds: [],
  loadingSquad: false,

  /**
   * ⚠ `catalog` NO es una lista de jugadores: son las competiciones y los
   *   países del mundo, con un flag de "ya cargado".
   *
   *       catalog: { competitions: [], countries: [], loaded: false }
   *
   *   Habérselo pisado con `{ rows, total }` reventaba el mercado y el buscador
   *   con "Cannot read properties of undefined (reading 'map')", porque hacen
   *   `catalog.countries.map(...)`. Los nombres de campo del store del juego se
   *   respetan o no se tocan.
   */
  catalog: {
    loaded: true,
    competitions: competiciones,
    countries: [
      { id: 101, code: 'ENG', name: 'Inglaterra' },
      { id: 102, code: 'ESP', name: 'España' },
      { id: 151, code: 'ARG', name: 'Argentina' },
      { id: 152, code: 'BRA', name: 'Brasil' },
    ],
  },
}

// ---------------------------------------------------------------------------
// Algunos jugadores en el mercado, para que la pantalla de fichajes no esté vacía
// ---------------------------------------------------------------------------
jugadores.forEach((p, i) => {
  // Uno cada veintitantos, salteando a las figuras: los que se venden de verdad
  // son los suplentes y los que están de salida.
  if (i % 23 === 0 && p.strength < 84) p.transfer_listed = true
  if (i % 37 === 0 && p.strength < 80) p.loan_listed = true
})

// ---------------------------------------------------------------------------
// Los managers de la sala
// ---------------------------------------------------------------------------
/**
 * ⚠ `user_id: 'harness'` en el primero NO es casual: el store guarda el id del
 *   usuario que devuelve `supabase.auth.getUser()`, y el stub devuelve
 *   justamente ese. Si no coincidieran, el juego pensaría que sos un
 *   espectador y la mitad de los botones no aparecerían.
 */
export const miembros = [
  { id: 'm1', user_id: 'harness', name: 'Vos', is_host: true, is_online: true, is_ready: false, room_team_id: MI_EQUIPO.id },
  { id: 'm2', user_id: 'u2', name: 'Nico', is_host: false, is_online: true, is_ready: true, room_team_id: RIVAL.id },
  { id: 'm3', user_id: 'u3', name: 'Fran', is_host: false, is_online: true, is_ready: true, room_team_id: equipos[3]?.id },
  { id: 'm4', user_id: 'u4', name: 'Colo', is_host: false, is_online: false, is_ready: false, room_team_id: equipos[5]?.id },
]

// Los clubes repartidos entre los managers, para el sorteo y el escritorio.
miembros.forEach((m) => {
  const equipo = equipos.find((e) => e.id === m.room_team_id)
  if (equipo) equipo.controlled_by = m.user_id
})

// ---------------------------------------------------------------------------
// Selecciones
// ---------------------------------------------------------------------------
/**
 * Cuatro selecciones para la pantalla de "elegí una". El juego las ofrece de a
 * tres y te da cuatro fechas para decidir; acá alcanza con tenerlas cargadas
 * como equipos más, que es como viven en `room_teams`.
 */
export const selecciones = [
  { id: 'sel-arg', name: 'Argentina', short_name: 'ARG', country_id: 151, is_national: true, colors: { primary: '#75AADB', secondary: '#ffffff', text: '#0b0b0b' }, level: 25, reputation: 'world' },
  { id: 'sel-bra', name: 'Brasil', short_name: 'BRA', country_id: 152, is_national: true, colors: { primary: '#F7DF1E', secondary: '#009C3B', text: '#0b0b0b' }, level: 24, reputation: 'world' },
  { id: 'sel-esp', name: 'España', short_name: 'ESP', country_id: 102, is_national: true, colors: { primary: '#C60B1E', secondary: '#FFC400', text: '#ffffff' }, level: 24, reputation: 'world' },
  { id: 'sel-fra', name: 'Francia', short_name: 'FRA', country_id: 105, is_national: true, colors: { primary: '#002395', secondary: '#ffffff', text: '#ffffff' }, level: 24, reputation: 'world' },
]

/** Un plantel de selección: los mejores de la liga, que alcanzan y sobran. */
export const convocables = jugadores
  .slice()
  .sort((a, b) => b.strength - a.strength)
  .slice(0, 40)

/** El estado completo, listo para `useGameSession.setState`. */
export const estadoDeLaSala = {
  room: {
    id: 'room-demo',
    code: 'GAMBET',
    season: 1,
    status: 'desk',
    settings: {},
    database_id: 'db-demo',
    matchday: 12,
    /**
     * EL RELOJ COMPARTIDO DE LA FECHA EN VIVO (tabla `rooms.live`, migración 0028).
     *
     * `Live.jsx` saca el minuto de acá:
     *     minuto = (paused_at − started_at − offset_ms) / 1000 × speed
     *
     * Con 16,5 s de diferencia y velocidad 2 da el minuto 33, que es cuando
     * cae el gol de córner. Va PAUSADO a propósito: congela el marcador para
     * que la captura salga siempre igual, y de paso muestra la pausa, que es
     * una función real del juego.
     */
    live: {
      started_at: new Date(Date.now() - 20_000).toISOString(),
      paused_at: new Date(Date.now() - 3_500).toISOString(),
      offset_ms: 0,
      speed: 2,
      halftime_done: false,
    },
  },
  // Las selecciones viajan en la misma lista que los clubes, como en `room_teams`.
  teams: [...equipos, ...selecciones],
  players: jugadores,
  members: miembros,
  myTeamId: MI_EQUIPO.id,
  myNationalTeamId: null,
  nationalView: false,
  viewingNational: () => false,
  matchday: {
    number: 12,
    loaded: true,
    matches: partidos,
    events: eventos,
    eventsLoaded: true,
  },
  loading: false,
  error: null,
}

// ---------------------------------------------------------------------------
// El estado que le toca a cada pantalla
// ---------------------------------------------------------------------------
/**
 * Algunas pantallas necesitan la sala en otro momento de la partida. El lobby
 * pide `status: 'lobby'`; la de elegir selección pide que TODAVÍA no tengas
 * una, y la de armar los 23 pide que sí. Como cada captura es una carga de
 * página aparte (`?p=`), alcanza con devolver el estado que corresponde.
 */
export function estadoPara(pantalla) {
  const base = { ...estadoDeLaSala, ...accionesFalsas }

  switch (pantalla) {
    case 'sala':
      return { ...base, room: { ...base.room, status: 'lobby' } }

    case 'reparto':
      return { ...base, room: { ...base.room, status: 'draft' } }

    case 'editor':
      return { ...base, room: { ...base.room, status: 'editor' } }

    // Elegir selección: sin selección tomada, con tres ofertas esperando.
    case 'seleccion-elegir':
      return { ...base, myNationalTeamId: null }

    // Armar los 23: la selección ya tomada, pero sin convocatoria hecha.
    case 'seleccion-armar':
      return {
        ...base,
        myNationalTeamId: selecciones[0].id,
        nationalView: true,
        viewingNational: () => true,
        offerNationalTeams: async () => [],
      }

    /**
     * El escritorio de la selección, con los 23 YA convocados.
     *
     * ⚠ LOS CONVOCADOS NO SE MUEVEN DE CLUB. El propio Desk.jsx lo aclara:
     *
     *     "Los convocados NO salen de `room_team_id`: siguen en su club (0093).
     *      Se cruzan los ids de `national_squads` contra el pool del país."
     *
     *   O sea que hay que llenar DOS campos del store —`nationalPool` con los
     *   futbolistas del país y `nationalSquad` con los ids citados— y no tocar
     *   el club de nadie. Reasignarles `room_team_id` no hacía nada: la
     *   pantalla seguía diciendo "Todavía no armaste la convocatoria".
     */
    case 'seleccion-plantel': {
      const pool = convocables.slice(0, 40)
      return {
        ...base,
        myNationalTeamId: selecciones[0].id,
        nationalView: true,
        viewingNational: () => true,
        offerNationalTeams: async () => [],
        nationalPool: pool,
        nationalSquad: pool.slice(0, 23).map((p) => p.id),
        /**
         * ⚠ Y HAY QUE TAPAR `loadNationalDesk`. El escritorio lo llama al
         *   montarse y esa acción rellena pool y convocatoria desde la base;
         *   con el Supabase falso volvía vacía y borraba los 23 que acabábamos
         *   de poner. Por eso la pantalla seguía diciendo "0 de 23" aunque el
         *   estado inicial estuviera bien.
         */
        loadNationalDesk: async () => {},
      }
    }

    default:
      return base
  }
}
