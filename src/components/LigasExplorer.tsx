import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * EL EXPLORADOR DE LIGAS
 * ======================
 *
 * Muestra las 81 competiciones del catálogo de Gambeta Manager y deja abrir
 * cualquiera para ver sus clubes ordenados y sus figuras.
 *
 * ⚑ POR QUÉ NO VIENE TODO EN EL HTML: el catálogo completo son 1.339 clubes y
 *   37.160 jugadores. Volcarlo entero serían varios megas de HTML para que el
 *   99% de la gente mire dos ligas. Así que el resumen viaja en la página (y lo
 *   ve Google), la liga que se abre primero viene precargada desde el build, y
 *   el resto se pide por fetch recién cuando alguien la toca.
 */

// --- Tipos -----------------------------------------------------------------

export interface Club {
  id: string
  nombre: string
  sigla: string | null
  ciudad: string | null
  colores: { primary?: string; secondary?: string; text?: string } | null
  nivel: number
  reputacion: number
  estadio: string | null
  aforo: number | null
  tecnico: string | null
  plantel: number
  media: number
  mediaTitulares: number
}

export interface Figura {
  id: string
  nombre: string
  dorsal: number | null
  puesto: string
  puestoLabel: string
  linea: 'keeper' | 'defense' | 'midfield' | 'attack'
  pierna: string | null
  fuerza: number
  techo: number | null
  edad: number
  club: string
  liga: string | null
  paisNombre: string | null
  caracteristicas: string[]
}

/**
 * Lo mínimo para dibujar la pestaña y poder buscar. Ver la nota de
 * `ligasParaIsla` en Manager.astro: todo lo que se agregue acá pesa el doble.
 */
export interface LigaResumen {
  slug: string
  nombre: string
  pais: string | null
  paisNombre: string | null
}

export interface LigaDetalle {
  slug: string
  nombre: string
  paisNombre: string | null
  division: number
  media: number
  fechas: number | null
  descensos: number | null
  clubes: Club[]
  figuras: Figura[]
}

interface Props {
  ligas: LigaResumen[]
  detalleInicial: LigaDetalle
}

type Columna = 'mediaTitulares' | 'media' | 'plantel' | 'aforo' | 'nombre'

// --- Utilidades ------------------------------------------------------------

const COLOR_LINEA: Record<Figura['linea'], string> = {
  keeper: 'bg-dorado-500/15 text-dorado-300 ring-dorado-500/30',
  defense: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  midfield: 'bg-cesped-500/15 text-cesped-300 ring-cesped-500/30',
  attack: 'bg-red-500/15 text-red-300 ring-red-500/30',
}

const numero = (n: number | null | undefined) =>
  typeof n === 'number' ? n.toLocaleString('es-AR') : '—'

/** Verde para las medias altas, apagado para las bajas. Lee de un vistazo. */
function tonoMedia(media: number) {
  if (media >= 80) return 'text-cesped-300'
  if (media >= 70) return 'text-cesped-400'
  if (media >= 60) return 'text-hueso-200'
  return 'text-hueso-500'
}

/** Normaliza para buscar sin acentos ni mayúsculas. */
const plano = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// --- Componente ------------------------------------------------------------

export default function LigasExplorer({ ligas, detalleInicial }: Props) {
  const [slug, setSlug] = useState(detalleInicial.slug)
  const [detalle, setDetalle] = useState<LigaDetalle>(detalleInicial)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<{ columna: Columna; desc: boolean }>({
    columna: 'mediaTitulares',
    desc: true,
  })

  /** Lo ya descargado, para que volver a una liga sea instantáneo. */
  const cache = useRef(new Map<string, LigaDetalle>([[detalleInicial.slug, detalleInicial]]))

  const ligasFiltradas = useMemo(() => {
    const termino = plano(busqueda.trim())
    if (!termino) return ligas
    return ligas.filter(
      (liga) =>
        plano(liga.nombre).includes(termino) ||
        plano(liga.paisNombre ?? '').includes(termino)
    )
  }, [ligas, busqueda])

  const abrirLiga = useCallback(async (nuevoSlug: string) => {
    setSlug(nuevoSlug)
    setError(null)

    const guardada = cache.current.get(nuevoSlug)
    if (guardada) {
      setDetalle(guardada)
      return
    }

    setCargando(true)
    try {
      const respuesta = await fetch(`/data/ligas/${nuevoSlug}.json`)
      if (!respuesta.ok) throw new Error(String(respuesta.status))
      const datos: LigaDetalle = await respuesta.json()
      cache.current.set(nuevoSlug, datos)
      setDetalle(datos)
    } catch {
      setError('No pudimos cargar esa liga. Probá de nuevo en un momento.')
    } finally {
      setCargando(false)
    }
  }, [])

  const clubesOrdenados = useMemo(() => {
    const copia = [...detalle.clubes]
    const { columna, desc } = orden
    copia.sort((a, b) => {
      if (columna === 'nombre') {
        return desc ? b.nombre.localeCompare(a.nombre) : a.nombre.localeCompare(b.nombre)
      }
      const va = (a[columna] ?? 0) as number
      const vb = (b[columna] ?? 0) as number
      return desc ? vb - va : va - vb
    })
    return copia
  }, [detalle.clubes, orden])

  const cambiarOrden = (columna: Columna) => {
    setOrden((actual) =>
      actual.columna === columna
        ? { columna, desc: !actual.desc }
        : { columna, desc: columna !== 'nombre' }
    )
  }

  const flecha = (columna: Columna) =>
    orden.columna !== columna ? '' : orden.desc ? ' ↓' : ' ↑'

  const ariaOrden = (columna: Columna): 'ascending' | 'descending' | 'none' =>
    orden.columna !== columna ? 'none' : orden.desc ? 'descending' : 'ascending'

  return (
    <div className="panel overflow-hidden">
      {/* ---- Elegir liga ---------------------------------------------- */}
      <div className="border-b border-white/8 p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="rotulo">Explorá el mundo</p>
            <p className="mt-1.5 text-sm text-hueso-400">
              {ligas.length} competiciones oficiales del catálogo del juego
            </p>
          </div>

          <label className="relative w-full md:w-72">
            <span className="solo-lectores">Buscar liga o país</span>
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar liga o país…"
              className="w-full rounded-lg border border-white/10 bg-carbon-900/80 px-3.5 py-2.5 text-sm text-hueso-100 placeholder:text-hueso-500 focus:border-cesped-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Las pestañas. Con 81 ligas es una tira que scrollea, no una grilla. */}
        <div
          className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
          role="tablist"
          aria-label="Ligas disponibles"
        >
          {ligasFiltradas.map((liga) => {
            const activa = liga.slug === slug
            return (
              <button
                key={liga.slug}
                role="tab"
                aria-selected={activa}
                onClick={() => abrirLiga(liga.slug)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  activa
                    ? 'border-cesped-500 bg-cesped-500/15 text-cesped-300'
                    : 'border-white/10 text-hueso-400 hover:border-white/25 hover:text-hueso-100'
                }`}
              >
                {liga.nombre}
                <span className="ml-2 text-xs text-hueso-500">{liga.pais}</span>
              </button>
            )
          })}
          {ligasFiltradas.length === 0 && (
            <p className="py-2 text-sm text-hueso-500">
              Ninguna liga coincide con «{busqueda}».
            </p>
          )}
        </div>
      </div>

      {/* ---- Cabecera de la liga abierta -------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-white/8 px-5 py-5 md:px-6">
        <div>
          <h3 className="text-2xl md:text-3xl">{detalle.nombre}</h3>
          <p className="mt-1 text-sm text-hueso-500">
            {detalle.paisNombre} · {detalle.division === 1 ? 'Primera división' : `División ${detalle.division}`}
          </p>
        </div>

        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-hueso-500">Clubes</dt>
            <dd className="font-display text-2xl text-hueso-50">{detalle.clubes.length}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-hueso-500">Media</dt>
            <dd className={`font-display text-2xl ${tonoMedia(detalle.media)}`}>{detalle.media}</dd>
          </div>
          {detalle.fechas ? (
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-hueso-500">Fechas</dt>
              <dd className="font-display text-2xl text-hueso-50">{detalle.fechas}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* ---- Estado ------------------------------------------------------ */}
      <div aria-live="polite" className="sr-only">
        {cargando ? 'Cargando liga' : `Mostrando ${detalle.nombre}`}
      </div>

      {error && (
        <p className="px-5 py-8 text-center text-sm text-red-300 md:px-6">{error}</p>
      )}

      <div className={cargando ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
        {/* ---- Tabla de clubes ------------------------------------------ */}
        <div className="max-h-[30rem] overflow-auto">
          {/*
            ⚠ SIN `min-w`. Antes tenía `min-w-[36rem]` (576px) dentro de un
              contenedor de 348px en un teléfono: 228px de tabla quedaban fuera
              de pantalla y había que arrastrar de costado para ver la media.
              Ahora las columnas que sobran se esconden por breakpoint y entra
              entera.
          */}
          <table className="w-full border-collapse text-left text-sm">
            <caption className="solo-lectores">
              Clubes de {detalle.nombre} con su media, plantel y estadio
            </caption>
            <thead className="sticky top-0 z-10 bg-carbon-850/95 backdrop-blur">
              <tr className="text-[0.65rem] uppercase tracking-[0.14em] text-hueso-500">
                <th scope="col" className="px-3 py-3 font-semibold md:px-6">#</th>
                <th scope="col" aria-sort={ariaOrden('nombre')} className="py-3 font-semibold">
                  <button onClick={() => cambiarOrden('nombre')} className="hover:text-hueso-200">
                    Club{flecha('nombre')}
                  </button>
                </th>
                <th scope="col" aria-sort={ariaOrden('mediaTitulares')} className="py-3 text-right font-semibold">
                  <button onClick={() => cambiarOrden('mediaTitulares')} className="hover:text-hueso-200">
                    Once{flecha('mediaTitulares')}
                  </button>
                </th>
                <th scope="col" aria-sort={ariaOrden('media')} className="hidden py-3 text-right font-semibold xs:table-cell">
                  <button onClick={() => cambiarOrden('media')} className="hover:text-hueso-200">
                    Plantel{flecha('media')}
                  </button>
                </th>
                <th scope="col" aria-sort={ariaOrden('plantel')} className="hidden py-3 text-right font-semibold sm:table-cell">
                  <button onClick={() => cambiarOrden('plantel')} className="hover:text-hueso-200">
                    Jug.{flecha('plantel')}
                  </button>
                </th>
                <th scope="col" aria-sort={ariaOrden('aforo')} className="hidden py-3 pr-3 text-right font-semibold md:table-cell md:pr-6">
                  <button onClick={() => cambiarOrden('aforo')} className="hover:text-hueso-200">
                    Estadio{flecha('aforo')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {clubesOrdenados.map((club, indice) => (
                <tr
                  key={club.id}
                  className="border-t border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2.5 text-hueso-500 tabular-nums md:px-6">{indice + 1}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-6 w-1.5 shrink-0 rounded-full"
                        style={{ background: club.colores?.primary ?? '#2c3531' }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-hueso-100">{club.nombre}</p>
                        {club.ciudad && (
                          <p className="truncate text-xs text-hueso-500">{club.ciudad}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={`py-2.5 text-right font-display text-lg tabular-nums ${tonoMedia(club.mediaTitulares)}`}>
                    {club.mediaTitulares}
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-hueso-400 xs:table-cell">
                    {club.media}
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-hueso-400 sm:table-cell">
                    {club.plantel}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-right md:table-cell md:pr-6">
                    <p className="truncate text-xs text-hueso-400">{club.estadio ?? '—'}</p>
                    <p className="text-xs text-hueso-500 tabular-nums">{numero(club.aforo)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Figuras de la liga ---------------------------------------- */}
        <div className="border-t border-white/8 p-5 md:p-6">
          <p className="rotulo mb-4">Las figuras de {detalle.nombre}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detalle.figuras.slice(0, 6).map((figura) => (
              <li
                key={figura.id}
                className="tarjeta-hover flex items-center gap-3 rounded-xl border border-white/8 bg-carbon-900/60 p-3"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg font-display text-lg ring-1 ${COLOR_LINEA[figura.linea]}`}
                  aria-hidden="true"
                >
                  {figura.fuerza}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-hueso-100">{figura.nombre}</p>
                  <p className="truncate text-xs text-hueso-500">
                    <span className="text-hueso-400">{figura.puesto}</span> · {figura.club} · {figura.edad} años
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
