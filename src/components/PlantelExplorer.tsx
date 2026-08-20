import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COLOR_LINEA, labelDe, lineaDe, ordenDePuesto } from '@/config/puestos'

/**
 * EL BUSCADOR DE JUGADORES
 * ========================
 *
 * Elegís una liga, elegís un club, y ves el plantel entero. O escribís un
 * nombre y busca en los planteles de toda esa liga.
 *
 * ⚑ POR QUÉ LA BÚSQUEDA ES POR LIGA Y NO GLOBAL. Son 37.329 futbolistas. Un
 *   buscador que entre en todos necesita el padrón completo en el navegador:
 *   ~4,9 MB descargados para que la mayoría mire dos clubes. Con la liga como
 *   unidad se bajan ~60 KB de una sola vez y adentro la búsqueda es
 *   instantánea, que es el mismo trato que ya hace el explorador de ligas.
 *
 * ⚠ NO SE MUESTRA EL VALOR DE MERCADO, y no es un olvido: el extractor no lo
 *   recalcula para los clubes que tocó la migración 0143 del juego, así que
 *   estaría mal para algunos. Está explicado en `scripts/extract-catalog.mjs`.
 */

// --- Tipos -----------------------------------------------------------------

export interface JugadorPlantel {
  nombre: string
  dorsal: number | null
  puesto: string
  pierna: string | null
  fuerza: number
  techo: number | null
  edad: number
  pais: string | null
}

export interface ClubPlantel {
  id: string
  nombre: string
  sigla: string | null
  ciudad: string | null
  colores: { primary?: string; secondary?: string; text?: string } | null
  estadio: string | null
  tecnico: string | null
  media: number
  mediaTitulares: number
  jugadores: JugadorPlantel[]
}

export interface PlantelLiga {
  slug: string
  nombre: string
  paisNombre: string | null
  clubes: ClubPlantel[]
}

export interface LigaResumen {
  slug: string
  nombre: string
  pais: string | null
  paisNombre: string | null
}

interface Props {
  ligas: LigaResumen[]
  /** Con cuál se abre. Se pide al montar, no viaja en el HTML. */
  slugInicial: string
}

type Orden = 'fuerza' | 'puesto' | 'edad' | 'techo'

// --- Utilidades ------------------------------------------------------------

/** Normaliza para buscar sin acentos ni mayúsculas. */
const plano = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function tonoFuerza(f: number) {
  if (f >= 84) return 'text-cesped-300'
  if (f >= 75) return 'text-cesped-400'
  if (f >= 65) return 'text-hueso-200'
  return 'text-hueso-500'
}

// --- Componente ------------------------------------------------------------

export default function PlantelExplorer({ ligas, slugInicial }: Props) {
  const [liga, setLiga] = useState<PlantelLiga | null>(null)
  const [clubId, setClubId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('fuerza')

  /** Lo ya descargado. Volver a una liga que ya se miró es instantáneo. */
  const cache = useRef(new Map<string, PlantelLiga>())

  const abrirLiga = useCallback(async (slug: string) => {
    setError(null)

    const guardada = cache.current.get(slug)
    if (guardada) {
      setLiga(guardada)
      setClubId(guardada.clubes[0]?.id ?? '')
      return
    }

    setCargando(true)
    try {
      const respuesta = await fetch(`/data/planteles/${slug}.json`)
      if (!respuesta.ok) throw new Error(String(respuesta.status))
      const datos: PlantelLiga = await respuesta.json()
      cache.current.set(slug, datos)
      setLiga(datos)
      setClubId(datos.clubes[0]?.id ?? '')
    } catch {
      setError('No pudimos cargar los planteles de esa liga. Probá de nuevo en un momento.')
    } finally {
      setCargando(false)
    }
  }, [])

  /**
   * ⚑ LA PRIMERA LIGA TAMBIÉN SE PIDE, no viaja en el HTML.
   *
   * El explorador de ligas sí trae la suya precargada, porque son 11 KB y le
   * sirven a Google. Un plantel completo son ~60 KB, y las props de una isla
   * viajan DOS veces (el HTML ya dibujado y el JSON de hidratación): serían
   * 120 KB de tabla que la mayoría no abre. Un parpadeo de "cargando" cuesta
   * mucho menos que eso.
   */
  useEffect(() => {
    abrirLiga(slugInicial)
  }, [abrirLiga, slugInicial])

  const club = liga?.clubes.find((c) => c.id === clubId) ?? liga?.clubes[0] ?? null

  /**
   * Con algo escrito se busca en TODA la liga; sin nada, se muestra el plantel
   * del club elegido. Es un solo panel que cambia de modo, y no dos listas
   * compitiendo por la misma pantalla.
   */
  const termino = plano(busqueda.trim())
  const buscando = termino.length >= 2

  const resultados = useMemo(() => {
    if (!buscando || !liga) return []
    const encontrados: { jugador: JugadorPlantel; club: ClubPlantel }[] = []
    for (const c of liga.clubes) {
      for (const jugador of c.jugadores) {
        if (plano(jugador.nombre).includes(termino)) encontrados.push({ jugador, club: c })
      }
    }
    return encontrados.sort((a, b) => b.jugador.fuerza - a.jugador.fuerza).slice(0, 60)
  }, [liga, termino, buscando])

  const plantel = useMemo(() => {
    const lista = [...(club?.jugadores ?? [])]
    if (orden === 'fuerza') return lista
    if (orden === 'edad') return lista.sort((a, b) => a.edad - b.edad)
    if (orden === 'techo') return lista.sort((a, b) => (b.techo ?? 0) - (a.techo ?? 0))
    return lista.sort(
      (a, b) => ordenDePuesto(a.puesto) - ordenDePuesto(b.puesto) || b.fuerza - a.fuerza
    )
  }, [club, orden])

  /*
   * ⚠ EL CORTE VA DESPUÉS DE TODOS LOS HOOKS, no antes.
   *
   * Poner el `if (!liga) return` arriba —que es donde uno lo escribe— dejaba
   * los dos `useMemo` de abajo sin ejecutar en el primer render y ejecutados en
   * el segundo. React cuenta los hooks por orden, así que eso revienta la isla
   * entera en cuanto llegan los datos.
   */
  if (!liga || !club) {
    return (
      /*
       * ⚠ EL ALTO DEL HUECO ES EL DEL PANEL YA CARGADO, medido: 1.047px en un
       *   teléfono y 880 en escritorio. Con un placeholder de 24rem el panel
       *   crecía 660px de golpe al llegar los datos y el CLS de /gambeta se iba
       *   a 0,08. Reservar el lugar exacto lo deja en cero.
       */
      <div className="panel grid min-h-[65rem] place-items-center p-8 text-center lg:min-h-[55rem]">
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : (
          <p className="text-sm text-hueso-500" role="status" aria-live="polite">
            Cargando los planteles…
          </p>
        )}
      </div>
    )
  }

  const filas = buscando ? resultados : plantel.map((jugador) => ({ jugador, club }))

  return (
    <div className="panel overflow-hidden">
      {/* ---- Elegir liga y buscar -------------------------------------- */}
      <div className="border-b border-white/8 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <label className="w-full md:w-72">
            <span className="rotulo mb-2 block">Liga</span>
            {/*
              ⚠ UN `select` Y NO LA TIRA DE PESTAÑAS del explorador de ligas.
                Allá la tira funciona porque la liga ES el contenido; acá el
                contenido es el plantel, y 81 pestañas encima de la tira de
                clubes dejaban la tabla abajo del pliegue en el teléfono. El
                desplegable del sistema, además, ya trae búsqueda por teclado.
            */}
            <select
              value={liga.slug}
              onChange={(evento) => abrirLiga(evento.target.value)}
              className="w-full rounded-lg border border-white/10 bg-carbon-900 px-3.5 py-2.5 text-sm text-hueso-100 focus:border-cesped-500 focus:outline-none"
            >
              {ligas.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.nombre} — {l.paisNombre}
                </option>
              ))}
            </select>
          </label>

          <label className="w-full md:w-80">
            <span className="rotulo mb-2 block">Buscar futbolista</span>
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder={`Buscar en ${liga.nombre}…`}
              className="w-full rounded-lg border border-white/10 bg-carbon-900/80 px-3.5 py-2.5 text-sm text-hueso-100 placeholder:text-hueso-500 focus:border-cesped-500 focus:outline-none"
            />
          </label>
        </div>

        {/* La tira de clubes. Se apaga mientras se está buscando. */}
        {!buscando && (
          <div
            className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
            role="tablist"
            aria-label={`Clubes de ${liga.nombre}`}
          >
            {liga.clubes.map((c) => {
              const activo = c.id === club?.id
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setClubId(c.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                    activo
                      ? 'border-cesped-500 bg-cesped-500/15 text-cesped-300'
                      : 'border-white/10 text-hueso-400 hover:border-white/25 hover:text-hueso-100'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-1 shrink-0 rounded-full"
                    style={{ background: c.colores?.primary ?? '#2c3531' }}
                  />
                  {c.nombre}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- Cabecera del club, o del resultado de la búsqueda ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-white/8 px-5 py-5 md:px-6">
        {buscando ? (
          <div className="min-w-0">
            <h3 className="text-2xl md:text-3xl">
              {resultados.length === 60 ? 'Los 60 mejores' : `${resultados.length} futbolistas`}
            </h3>
            <p className="mt-1 truncate text-sm text-hueso-500">
              con «{busqueda.trim()}» en el nombre, en {liga.nombre}
            </p>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <h3 className="truncate text-2xl md:text-3xl">{club?.nombre}</h3>
              <p className="mt-1 truncate text-sm text-hueso-500">
                {[club?.ciudad, club?.estadio].filter(Boolean).join(' · ')}
                {club?.tecnico ? ` · DT ${club.tecnico}` : ''}
              </p>
            </div>

            <dl className="flex gap-6 text-right">
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-hueso-500">
                  Plantel
                </dt>
                <dd className="font-display text-2xl text-hueso-50">{club?.jugadores.length}</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-hueso-500">Media</dt>
                <dd className={`font-display text-2xl ${tonoFuerza(club?.media ?? 0)}`}>
                  {club?.media}
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-hueso-500">Once</dt>
                <dd className={`font-display text-2xl ${tonoFuerza(club?.mediaTitulares ?? 0)}`}>
                  {club?.mediaTitulares}
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {cargando ? 'Cargando planteles' : `Mostrando ${buscando ? 'resultados' : club?.nombre}`}
      </div>

      {error && <p className="px-5 py-8 text-center text-sm text-red-300 md:px-6">{error}</p>}

      {/* ---- Ordenar ---------------------------------------------------- */}
      {!buscando && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-5 py-3 md:px-6">
          <span className="mr-1 text-xs uppercase tracking-[0.14em] text-hueso-500">Ordenar</span>
          {(
            [
              ['fuerza', 'Fuerza'],
              ['puesto', 'Puesto'],
              ['techo', 'Techo'],
              ['edad', 'Más jóvenes'],
            ] as [Orden, string][]
          ).map(([clave, texto]) => (
            <button
              key={clave}
              onClick={() => setOrden(clave)}
              aria-pressed={orden === clave}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                orden === clave
                  ? 'border-cesped-500 bg-cesped-500/15 text-cesped-300'
                  : 'border-white/10 text-hueso-400 hover:border-white/25 hover:text-hueso-100'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      )}

      {/* ---- El plantel -------------------------------------------------- */}
      <div className={cargando ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
        <div className="max-h-[34rem] overflow-auto">
          {/*
            ⚠ SIN `min-w`, Y CON LAS COLUMNAS ESCALONADAS — la misma lección que
              la tabla de clubes:

                Dorsal · Futbolista · Fuerza   siempre
                + Techo                        desde sm  (640px)
                + Edad                         desde md  (768px)
                + Pierna                       desde lg  (1024px)

            ⚠ Y CADA COLUMNA NUMÉRICA CON SU PROPIO `pr`: cuál es la última
              cambia con el ancho, y sin padding el número toca el borde y se ve
              cortado. En un Pro Max (430px) la última es "Fuerza".
          */}
          <table className="w-full border-collapse text-left text-sm">
            <caption className="solo-lectores">
              {buscando
                ? `Futbolistas de ${liga.nombre} que coinciden con la búsqueda`
                : `Plantel de ${club?.nombre}`}
            </caption>
            <thead className="sticky top-0 z-10 bg-carbon-850/95 backdrop-blur">
              <tr className="text-[0.65rem] uppercase tracking-[0.14em] text-hueso-500">
                <th scope="col" className="px-3 py-3 font-semibold md:px-6">
                  {buscando ? '#' : 'N°'}
                </th>
                <th scope="col" className="py-3 font-semibold">
                  Futbolista
                </th>
                <th scope="col" className="py-3 pr-3 text-right font-semibold md:pr-4">
                  Fuerza
                </th>
                <th
                  scope="col"
                  className="hidden py-3 pr-3 text-right font-semibold sm:table-cell md:pr-4"
                >
                  Techo
                </th>
                <th
                  scope="col"
                  className="hidden py-3 pr-3 text-right font-semibold md:table-cell md:pr-4"
                >
                  Edad
                </th>
                <th
                  scope="col"
                  className="hidden py-3 pr-3 text-right font-semibold lg:table-cell lg:pr-6"
                >
                  Pierna
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ jugador, club: suClub }, indice) => (
                <tr
                  key={`${suClub.id}-${indice}-${jugador.nombre}`}
                  className="border-t border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2.5 text-hueso-500 tabular-nums md:px-6">
                    {buscando ? indice + 1 : (jugador.dorsal ?? '—')}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`grid h-7 w-9 shrink-0 place-items-center rounded text-[0.65rem] font-semibold ring-1 ${
                          COLOR_LINEA[lineaDe(jugador.puesto)]
                        }`}
                        title={labelDe(jugador.puesto)}
                      >
                        {jugador.puesto}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-hueso-100">{jugador.nombre}</p>
                        <p className="truncate text-xs text-hueso-500">
                          {buscando ? suClub.nombre : labelDe(jugador.puesto)}
                          {jugador.pais ? ` · ${jugador.pais}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right font-display text-lg tabular-nums md:pr-4 ${tonoFuerza(
                      jugador.fuerza
                    )}`}
                  >
                    {jugador.fuerza}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-right tabular-nums text-dorado-400/90 sm:table-cell md:pr-4">
                    {jugador.techo ?? '—'}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-right tabular-nums text-hueso-400 md:table-cell md:pr-4">
                    {jugador.edad}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-right text-xs text-hueso-400 lg:table-cell lg:pr-6">
                    {jugador.pierna ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {buscando && resultados.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-hueso-500 md:px-6">
              No hay ningún futbolista con «{busqueda.trim()}» en el nombre dentro de {liga.nombre}.
              Probá con otra liga.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
