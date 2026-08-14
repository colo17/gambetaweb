/**
 * HARNESS DE CAPTURAS
 * ===================
 *
 * Monta las pantallas REALES de Gambeta Manager con datos REALES del catálogo
 * para poder fotografiarlas.
 *
 * ⛔ Nada de este archivo escribe en `cyberfoot-online`: sólo importa desde ahí.
 *
 * POR QUÉ EXISTE, Y QUÉ NO ES
 * ---------------------------
 * Lo honesto sería fotografiar una partida en curso. No se puede: sin sesión de
 * Supabase la app corta en el login (`App.jsx`: "Sin sesión no se ve nada"), y
 * la migración 0081 borró todas las salas. Crear una escribiría en la base de
 * producción del juego, que es justo lo que no hay que tocar.
 *
 * Entonces se hace lo segundo mejor, que sigue siendo verdad: se cargan los
 * MISMOS componentes y páginas, con el MISMO CSS, y se les da de comer una
 * partida armada con los clubes y jugadores del MISMO catálogo. Lo que se ve en
 * las capturas es la interfaz del juego, no una maqueta. Lo único inventado es
 * el estado de la partida.
 *
 * Es el mismo camino que ya usa `scripts/test-render.mjs` del juego.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DndContext } from '@dnd-kit/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// El sistema de diseño del juego, tal cual (ver la nota de estilos.css).
import './estilos.css'

import Pitch from '@/components/pitch/Pitch.jsx'
import SquadTable from '@/components/squad/SquadTable.jsx'
import TacticsPanel from '@/components/tactics/TacticsPanel.jsx'
import MiniPitch from '@/components/match/MiniPitch.jsx'
import DeskPanel from '@/components/desk/DeskPanel.jsx'
import Market from '@/components/desk/Market.jsx'
import Desk from '@/pages/Desk.jsx'
import Live from '@/pages/Live.jsx'
import Lobby from '@/pages/Lobby.jsx'
import Editor from '@/pages/Editor.jsx'
import Draft from '@/pages/Draft.jsx'
import Results from '@/pages/Results.jsx'
import National from '@/pages/National.jsx'
import { FORMATIONS } from '@/game/formations.js'
import { useGameSession } from '@/store/gameSession.js'

import {
  MI_EQUIPO,
  RIVAL,
  armarOnce,
  estadoPara,
  eventos,
  jugadoresPorId,
  partidos,
  plantelDe,
} from './datos.js'

// ---------------------------------------------------------------------------
// 1. Cargar la partida en el store, ANTES de montar nada
// ---------------------------------------------------------------------------

/**
 * ⚑ EL ESTADO DEPENDE DE LA PANTALLA PEDIDA, y se carga ANTES de montar nada.
 *
 * El lobby necesita la sala en `status: 'lobby'`; la de elegir selección
 * necesita que todavía no tengas una; la de armar los 23, que sí. Como cada
 * captura es una carga de página aparte, `estadoPara()` devuelve el momento de
 * la partida que corresponde. Ver la nota en `datos.js`.
 */
const pantallaPedida = new URLSearchParams(location.search).get('p')
useGameSession.setState(estadoPara(pantallaPedida))

const miPlantel = plantelDe(MI_EQUIPO.id)

/**
 * ⚠ `Pitch` hace `playersById[playerId]`, o sea que espera un OBJETO PLANO.
 *   `MiniPitch`, en cambio, usa `playerById.get(...)`. Son dos formas distintas
 *   en dos componentes y hay que respetarlas: pasarle un Map a Pitch deja los
 *   once casilleros vacíos sin tirar ningún error.
 */
const porId = Object.fromEntries(miPlantel.map((p) => [p.id, p]))

const formacion = FORMATIONS['4-3-3']
const once = armarOnce(formacion, miPlantel)

/**
 * `fits` y `effectives`: cuánto le cae el puesto a cada uno y con qué fuerza
 * termina jugando ahí. En el juego los calcula `compatibility.js`; acá alcanza
 * con reflejar el caso bueno, que es el que se quiere mostrar.
 */
const fits = Object.fromEntries(once.filter(Boolean).map((id) => [id, 'natural']))
const effectives = Object.fromEntries(
  once.filter(Boolean).map((id) => [id, porId[id]?.strength ?? 70])
)

const colores = MI_EQUIPO.colors ?? { primary: '#12b76a', secondary: '#ffffff', text: '#ffffff' }

/**
 * Los cuatro roles del planteo.
 *
 * ⚠ Las claves son las de la tabla `lineups`, en camelCase: `captainId`,
 *   `penaltyId`, `freekickId`, `cornerId`. Con cualquier otro nombre los cuatro
 *   selectores se dibujan en "— Nadie —" y no avisa nadie.
 */
const ROLES = {
  captainId: once[6],
  penaltyId: once[9],
  freekickId: once[8],
  cornerId: once[7],
}

// ---------------------------------------------------------------------------
// 2. El marco de cada captura
// ---------------------------------------------------------------------------

const FONDO = '#070a12'

function Pantalla({ id, titulo, bajada, ancho = '100%', children }) {
  // Cada pantalla se dibuja sólo si es la pedida por `?p=`. Ver la nota de
  // PANTALLAS: montarlas todas juntas crashea la pestaña.
  if (id !== elegida) return null

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px',
        gap: '16px',
        background: FONDO,
      }}
    >
      {/*
        ⚠ EL ENCABEZADO QUEDA FUERA DE LA CAPTURA (`data-captura` está abajo, en
          el contenido). Es un rótulo mío para orientarme mirando el harness, no
          del juego: cuando entraba en la foto, la captura parecía una lámina de
          presentación en vez de una pantalla del juego, y encima repetía el
          título de la etapa que va al lado en el sitio.
      */}
      <header style={{ flexShrink: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: '#45598a',
            fontFamily: 'Inter Variable, system-ui, sans-serif',
          }}
        >
          {bajada}
        </p>
        <h1
          style={{
            margin: '6px 0 0',
            fontSize: '26px',
            color: '#e4e9f5',
            fontFamily: "'Barlow Condensed', system-ui, sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {titulo}
        </h1>
      </header>
      <div data-captura={id} style={{ flex: 1, minHeight: 0, maxWidth: ancho }}>
        {children}
      </div>
    </section>
  )
}

/** Los paneles del escritorio se abren adentro de un `DeskPanel`. */
function Panel({ clave }) {
  return <DeskPanel panelKey={clave} onClose={() => {}} />
}

/**
 * Las páginas del juego usan `useParams()`, así que necesitan un router con la
 * ruta de verdad. `MemoryRouter` alcanza y no toca la barra de direcciones.
 */
function Ruta({ path, entrada, children }) {
  return (
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// 3. Las pantallas
// ---------------------------------------------------------------------------

/**
 * ⚑ SE DIBUJA UNA PANTALLA POR VEZ, elegida con `?p=`.
 *
 * Montarlas todas juntas hacía CRASHEAR la pestaña: la fecha en vivo dibuja
 * diez canchas a la vez, cada una con su propio `requestAnimationFrame`, más el
 * escritorio, más el mercado, todos con los 560 jugadores de la liga en el
 * store. `capturas.mjs` navega a cada una por separado, y así cada captura
 * arranca con la memoria limpia.
 */
const PANTALLAS = [
  // El camino del club, en orden
  'sala', 'editor', 'reparto', 'escritorio', 'mercado', 'equipo',
  'partido', 'planilla',
  // Los paneles del escritorio
  'juveniles', 'tecnicos', 'estadio', 'tablas', 'buscador', 'agenda',
  // La selección
  'seleccion-elegir', 'seleccion-armar', 'seleccion-plantel',
  // Sueltas
  'plantel', 'cancha-vivo',
]

const elegida = pantallaPedida

function Indice() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Inter Variable, system-ui, sans-serif' }}>
      <h1 style={{ color: '#e4e9f5', fontFamily: "'Barlow Condensed', sans-serif" }}>
        Harness de capturas
      </h1>
      <p style={{ color: '#8e9dc0' }}>Elegí una pantalla:</p>
      <ul style={{ color: '#22c97c', lineHeight: 2 }}>
        {PANTALLAS.map((p) => (
          <li key={p}>
            <a href={`?p=${p}`} style={{ color: '#22c97c' }}>{p}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Harness() {
  if (!elegida) return <Indice />

  return (
    <div style={{ background: FONDO }}>
      {/* 0a · LA SALA ---------------------------------------------------- */}
      <Pantalla id="sala" bajada="Código GAMBET · 4 managers" titulo="Creá la sala e invitá">
        <Ruta path="/sala/:code/lobby" entrada="/sala/GAMBET/lobby">
          <Lobby />
        </Ruta>
      </Pantalla>

      {/* 0b · EL EDITOR --------------------------------------------------- */}
      <Pantalla id="editor" bajada="Antes de repartir, se puede tocar todo" titulo="El editor de equipos">
        <Ruta path="/sala/:code/editor" entrada="/sala/GAMBET/editor">
          <Editor />
        </Ruta>
      </Pantalla>

      {/* 0c · EL REPARTO -------------------------------------------------- */}
      <Pantalla id="reparto" bajada="Un club para cada uno" titulo="Repartan los equipos">
        <Ruta path="/sala/:code/draft" entrada="/sala/GAMBET/draft">
          <Draft />
        </Ruta>
      </Pantalla>

      {/* 1 · EL ESCRITORIO ---------------------------------------------- */}
      <Pantalla id="escritorio" bajada={`${MI_EQUIPO.name} · temporada 1, fecha 12`} titulo="El escritorio del club">
        <MemoryRouter initialEntries={['/sala/GAMBET/desk']}>
          <Routes>
            <Route path="/sala/:code/desk" element={<Desk />} />
          </Routes>
        </MemoryRouter>
      </Pantalla>

      {/* 2 · ARMAR EL EQUIPO: cancha y táctica juntas --------------------- */}
      <Pantalla id="equipo" bajada={`${MI_EQUIPO.name} · ${formacion.name}`} titulo="Armar el equipo">
        <DndContext>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 460px) minmax(0, 1fr)',
              gap: '24px',
              height: 'calc(100vh - 150px)',
              alignItems: 'start',
            }}
          >
            <div style={{ height: '100%' }}>
              <Pitch
                formation={formacion}
                starters={once}
                playersById={porId}
                fits={fits}
                effectives={effectives}
                colors={colores}
                captainId={ROLES.captainId}
                onClearSlot={() => {}}
                onPickSlot={() => {}}
              />
            </div>
            <TacticsPanel
              tactic="balanced"
              attitude="offensive"
              press="high"
              focus="wings"
              mark="zonal"
              onTactical={() => {}}
              roles={ROLES}
              starters={once}
              playersById={porId}
              onRole={() => {}}
            />
          </div>
        </DndContext>
      </Pantalla>

      {/* 3 · EL PLANTEL --------------------------------------------------- */}
      <Pantalla id="plantel" bajada={`${MI_EQUIPO.name} · ${miPlantel.length} jugadores`} titulo="El plantel">
        <SquadTable
          players={miPlantel}
          starters={once}
          bench={miPlantel.slice(11, 18).map((p) => p.id)}
          currentMatchday={12}
          onSelect={() => {}}
        />
      </Pantalla>

      {/* 4 · EL BUSCADOR -------------------------------------------------- */}
      <Pantalla id="buscador" bajada="37.160 futbolistas en 81 ligas" titulo="Buscar jugadores" ancho="1100px">
        <Panel clave="search" />
      </Pantalla>

      {/* 5 · EL MERCADO --------------------------------------------------- */}
      <Pantalla id="mercado" bajada="Fichajes, ofertas y subastas" titulo="El mercado de pases" ancho="1100px">
        <Market />
      </Pantalla>

      {/* 6 · LAS TABLAS Y LAS COPAS --------------------------------------- */}
      <Pantalla id="tablas" bajada="Ligas, copas nacionales y torneos continentales" titulo="Tablas y copas" ancho="1100px">
        <Panel clave="standings" />
      </Pantalla>

      {/* 7 · LA AGENDA ---------------------------------------------------- */}
      <Pantalla id="agenda" bajada="Todas las competiciones del club" titulo="La agenda" ancho="1100px">
        <Panel clave="schedule" />
      </Pantalla>

      {/* 8 · LA FECHA EN VIVO --------------------------------------------- */}
      <Pantalla id="partido" bajada={`${MI_EQUIPO.name} vs ${RIVAL.name} · fecha 12`} titulo="La fecha, en vivo">
        <MemoryRouter initialEntries={['/sala/GAMBET/desk/live/12']}>
          <Routes>
            <Route path="/sala/:code/desk/live/:matchday" element={<Live />} />
          </Routes>
        </MemoryRouter>
      </Pantalla>

      {/* 8b · LA PLANILLA DE LA FECHA ------------------------------------- */}
      <Pantalla id="planilla" bajada="Resultados, tabla y equipo ideal" titulo="La planilla de la fecha">
        <Ruta path="/sala/:code/desk/results/:matchday" entrada="/sala/GAMBET/desk/results/12">
          <Results />
        </Ruta>
      </Pantalla>

      {/* 8c · LOS PANELES DEL ESCRITORIO ---------------------------------- */}
      <Pantalla id="juveniles" bajada="La cantera del club" titulo="Juveniles" ancho="1100px">
        <Panel clave="youth" />
      </Pantalla>

      <Pantalla id="tecnicos" bajada="Ranking, movimientos y trofeos" titulo="Técnicos" ancho="1100px">
        <Panel clave="manager_ranking" />
      </Pantalla>

      <Pantalla id="estadio" bajada="Ampliar y fijar precios" titulo="El estadio" ancho="1100px">
        <Panel clave="stadium" />
      </Pantalla>

      {/* 8d · LA SELECCIÓN ------------------------------------------------ */}
      <Pantalla id="seleccion-elegir" bajada="Tenés cuatro fechas para decidir" titulo="Elegí tu selección">
        <Ruta path="/sala/:code/desk/national" entrada="/sala/GAMBET/desk/national">
          <National />
        </Ruta>
      </Pantalla>

      <Pantalla id="seleccion-armar" bajada="Los 23 que van al torneo" titulo="Armá la selección">
        <Ruta path="/sala/:code/desk/national" entrada="/sala/GAMBET/desk/national">
          <National />
        </Ruta>
      </Pantalla>

      <Pantalla id="seleccion-plantel" bajada="Argentina · el plantel completo" titulo="El plantel de la selección">
        <Ruta path="/sala/:code/desk" entrada="/sala/GAMBET/desk">
          <Desk />
        </Ruta>
      </Pantalla>

      {/* 9 · LA CANCHA DEL PARTIDO, sola ---------------------------------- */}
      <Pantalla id="cancha-vivo" bajada={`${MI_EQUIPO.name} 1 - 0 ${RIVAL.name} · minuto 33`} titulo="El gol" ancho="900px">
        <MiniPitch
          match={partidos[0]}
          events={eventos.filter((e) => e.match_id === partidos[0].id)}
          minuteOf={() => 33}
          speed={2}
          homePlayers={partidos[0].home_lineup.map((id) => jugadoresPorId.get(id))}
          awayPlayers={partidos[0].away_lineup.map((id) => jugadoresPorId.get(id))}
          playerById={jugadoresPorId}
          halfTime={47}
        />
      </Pantalla>
    </div>
  )
}

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <Harness />
  </StrictMode>
)
