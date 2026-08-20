import { useCallback, useEffect, useState } from 'react'
import {
  HAY_CUENTAS,
  clienteCuenta,
  decirElError,
  fechaLarga,
  type EtapaEntrenador,
  type PerfilEntrenador,
} from '@/lib/cuenta'

/**
 * EL PERFIL DE ENTRENADOR
 * =======================
 *
 * La cuenta es la MISMA que la del juego, así que esto no inventa un padrón
 * propio: entra contra el Supabase de Gambeta Manager Game y le pide la carrera
 * a dos funciones que ya existen en la base (migración 0144 del juego):
 *
 *   coach_profile(uuid)  la carrera sumada de TODAS las salas
 *   coach_spells(uuid)   una fila por etapa al frente de un club
 *
 * ⚑ POR QUÉ FUNCIONES Y NO CONSULTAS. La RLS del juego —bien puesta— sólo deja
 *   leer las salas donde uno es miembro. Un perfil de carrera es justo lo
 *   contrario: la suma de todas. Por eso las dos son `security definer` y
 *   devuelven agregados, nunca filas de otra partida.
 *
 * ⚠ NO HAY "TIEMPO JUGADO", y no es un olvido de esta pantalla: el juego no
 *   registra minutos de sesión en ningún lado. Lo que sí lleva —y es mejor
 *   medida de una carrera— son las temporadas dirigidas, que es lo que se
 *   muestra en su lugar.
 *
 * ⚠ Y NO SE MUESTRAN `career_points` / `career_titles` / `career_matches` de la
 *   tabla `profiles`: existen desde la migración 0003 y nadie las escribió
 *   nunca, así que están en cero para todo el mundo. Los números salen de
 *   `manager_spells`, que es lo que el juego sí actualiza.
 */

type Modo = 'entrar' | 'crear' | 'olvide'

interface Props {
  /** Los juegos, para la tira de "dónde jugaste". Viene de `games.ts`. */
  juegos: { id: string; nombre: string; estado: string; icono: string; ruta: string }[]
}

const n = (valor: number) => Number(valor ?? 0).toLocaleString('es-AR')

export default function Perfil({ juegos }: Props) {
  const [arrancando, setArrancando] = useState(true)
  const [sesion, setSesion] = useState<{ id: string; email: string | null } | null>(null)
  const [perfil, setPerfil] = useState<PerfilEntrenador | null>(null)
  const [etapas, setEtapas] = useState<EtapaEntrenador[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(false)

  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; bien: boolean } | null>(null)

  // --- Sesión --------------------------------------------------------------

  useEffect(() => {
    if (!HAY_CUENTAS) {
      setArrancando(false)
      return
    }

    let vivo = true
    let desuscribir: (() => void) | undefined

    clienteCuenta()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession()
        if (!vivo) return
        const usuario = data.session?.user ?? null
        setSesion(usuario ? { id: usuario.id, email: usuario.email ?? null } : null)
        setArrancando(false)

        const { data: escucha } = supabase.auth.onAuthStateChange((_evento: string, sesionNueva: any) => {
          const u = sesionNueva?.user ?? null
          setSesion(u ? { id: u.id, email: u.email ?? null } : null)
        })
        desuscribir = () => escucha?.subscription?.unsubscribe()
      })
      .catch(() => {
        if (vivo) setArrancando(false)
      })

    return () => {
      vivo = false
      desuscribir?.()
    }
  }, [])

  // --- La carrera ----------------------------------------------------------

  useEffect(() => {
    if (!sesion) {
      setPerfil(null)
      setEtapas([])
      return
    }

    let vivo = true
    setCargandoDatos(true)

    clienteCuenta()
      .then(async (supabase) => {
        const [ficha, carrera] = await Promise.all([
          supabase.rpc('coach_profile', { p_coach: sesion.id }),
          supabase.rpc('coach_spells', { p_coach: sesion.id }),
        ])
        if (!vivo) return
        // `coach_profile` devuelve SIEMPRE una fila, incluso para el que nunca
        // jugó: ahí van todos los contadores en cero.
        setPerfil((ficha.data?.[0] as PerfilEntrenador) ?? null)
        setEtapas((carrera.data as EtapaEntrenador[]) ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setCargandoDatos(false)
      })

    return () => {
      vivo = false
    }
  }, [sesion])

  // --- Acciones ------------------------------------------------------------

  const enviar = useCallback(
    async (evento: React.FormEvent) => {
      evento.preventDefault()
      setAviso(null)

      const correo = email.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
        setAviso({ texto: 'Ese mail no parece válido.', bien: false })
        return
      }
      if (modo !== 'olvide' && clave.length < 6) {
        setAviso({ texto: 'La contraseña tiene que tener al menos 6 caracteres.', bien: false })
        return
      }

      setEnviando(true)
      try {
        const supabase = await clienteCuenta()

        if (modo === 'entrar') {
          const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
          if (error) throw error
          setClave('')
        } else if (modo === 'crear') {
          const { error } = await supabase.auth.signUp({
            email: correo,
            password: clave,
            // ⚑ El mismo campo que usa el juego: de acá sale `display_name` en
            //   `profiles`, porque el trigger `handle_new_user` lo lee de ahí.
            options: { data: { display_name: nombre.trim() || correo.split('@')[0] } },
          })
          if (error) throw error
          setClave('')
          setAviso({
            texto: 'Listo. Si te pide confirmar el mail, fijate en tu casilla y volvé.',
            bien: true,
          })
        } else {
          /**
           * ⚠ EL `redirectTo` NO ES OPCIONAL ACÁ.
           *
           * Sin él, Supabase manda a la persona a la **Site URL** del proyecto,
           * que es una sola y la comparten el juego y la web. Hoy vale
           * `http://localhost:3000`: el mail de recuperación llevaba a una
           * máquina de desarrollo que del otro lado no existe.
           *
           * Con esto vuelve al /perfil del mismo sitio desde el que lo pidió, y
           * anda igual en producción y en local sin configurar nada.
           *
           * ⚑ La URL tiene que estar en la lista blanca de Supabase
           *   (Authentication → URL Configuration → Redirect URLs). Si no está,
           *   Supabase la ignora y cae de nuevo en la Site URL.
           */
          const { error } = await supabase.auth.resetPasswordForEmail(correo, {
            redirectTo: `${window.location.origin}/perfil`,
          })
          if (error) throw error
          setAviso({ texto: 'Te mandamos un mail para cambiar la contraseña.', bien: true })
        }
      } catch (error: any) {
        setAviso({ texto: decirElError(error), bien: false })
      } finally {
        setEnviando(false)
      }
    },
    [email, clave, nombre, modo]
  )

  const salir = useCallback(async () => {
    const supabase = await clienteCuenta()
    await supabase.auth.signOut()
    setSesion(null)
  }, [])

  // --- Sin cuentas configuradas -------------------------------------------

  if (!HAY_CUENTAS) {
    return (
      <div className="panel mx-auto max-w-2xl p-8 text-center md:p-12">
        <p className="rotulo">Todavía no</p>
        <h2 className="mt-4 text-[clamp(1.5rem,4vw,2.25rem)]">Las cuentas abren con el juego</h2>
        <p className="mx-auto mt-4 max-w-md text-hueso-400">
          El perfil se conecta a la misma cuenta con la que vas a jugar. Se
          prende el día que el Manager salga para todos, y ahí vas a poder ver
          acá tus partidos, tus títulos y todos los clubes que dirigiste.
        </p>
        <a href="/#avisame" className="boton boton-primario mt-8">
          Avisame cuando abra
        </a>
      </div>
    )
  }

  if (arrancando) {
    return (
      <div className="panel mx-auto grid min-h-[20rem] max-w-2xl place-items-center p-8">
        <p className="text-sm text-hueso-500" role="status" aria-live="polite">
          Buscando tu sesión…
        </p>
      </div>
    )
  }

  // --- Sin entrar ----------------------------------------------------------

  if (!sesion) {
    const titulos: Record<Modo, string> = {
      entrar: 'Entrá a tu cuenta',
      crear: 'Creá tu cuenta',
      olvide: 'Recuperá tu contraseña',
    }

    return (
      <div className="panel mx-auto max-w-md p-6 md:p-8">
        <h2 className="text-2xl">{titulos[modo]}</h2>
        <p className="mt-2 text-sm text-hueso-400">
          Es la misma cuenta con la que jugás. Una sola para todos los juegos de
          Gambeta.
        </p>

        <form className="mt-6 space-y-4" onSubmit={enviar} noValidate>
          {modo === 'crear' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-hueso-200">
                Cómo te llamás <span className="text-hueso-500">(lo ven los demás)</span>
              </span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="nickname"
                placeholder="El Colo"
                className="w-full rounded-lg border border-white/12 bg-carbon-900/80 px-4 py-3 text-hueso-100 placeholder:text-hueso-500 focus:border-cesped-500 focus:outline-none"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-hueso-200">Tu mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@mail.com"
              className="w-full rounded-lg border border-white/12 bg-carbon-900/80 px-4 py-3 text-hueso-100 placeholder:text-hueso-500 focus:border-cesped-500 focus:outline-none"
            />
          </label>

          {modo !== 'olvide' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-hueso-200">Contraseña</span>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
                className="w-full rounded-lg border border-white/12 bg-carbon-900/80 px-4 py-3 text-hueso-100 focus:border-cesped-500 focus:outline-none"
              />
            </label>
          )}

          <button type="submit" className="boton boton-primario w-full justify-center" disabled={enviando}>
            {enviando
              ? 'Un segundo…'
              : modo === 'entrar'
                ? 'Entrar'
                : modo === 'crear'
                  ? 'Crear la cuenta'
                  : 'Mandame el mail'}
          </button>

          {aviso && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${aviso.bien ? 'text-cesped-300' : 'text-red-300'}`}
            >
              {aviso.texto}
            </p>
          )}
        </form>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-5 text-sm">
          {modo !== 'entrar' && (
            <button onClick={() => { setModo('entrar'); setAviso(null) }} className="text-cesped-300 hover:text-cesped-200">
              Ya tengo cuenta
            </button>
          )}
          {modo !== 'crear' && (
            <button onClick={() => { setModo('crear'); setAviso(null) }} className="text-cesped-300 hover:text-cesped-200">
              Crear una cuenta
            </button>
          )}
          {modo !== 'olvide' && (
            <button onClick={() => { setModo('olvide'); setAviso(null) }} className="text-hueso-400 hover:text-hueso-200">
              Me olvidé la contraseña
            </button>
          )}
        </div>
      </div>
    )
  }

  // --- Adentro -------------------------------------------------------------

  const jugados = perfil ? Number(perfil.matches) : 0
  const ganados = perfil ? Number(perfil.wins) : 0
  const efectividad = jugados > 0 ? Math.round((ganados / jugados) * 100) : 0

  const cifras = [
    { valor: n(perfil?.matches ?? 0), etiqueta: 'partidos dirigidos' },
    { valor: `${efectividad}%`, etiqueta: 'de victorias' },
    { valor: n(perfil?.titles ?? 0), etiqueta: 'títulos' },
    { valor: n(perfil?.seasons ?? 0), etiqueta: 'temporadas' },
    { valor: n(perfil?.clubs ?? 0), etiqueta: 'clubes dirigidos' },
    { valor: n(perfil?.rooms ?? 0), etiqueta: 'partidas' },
    { valor: n(perfil?.points ?? 0), etiqueta: 'puntos sumados' },
    {
      valor: `${n(perfil?.wins ?? 0)}-${n(perfil?.draws ?? 0)}-${n(perfil?.losses ?? 0)}`,
      etiqueta: 'ganados · empatados · perdidos',
    },
  ]

  return (
    <div className="space-y-8">
      {/* ---- La ficha ---------------------------------------------------- */}
      <div className="panel p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="rotulo">Entrenador</p>
            <h2 className="mt-2 truncate text-[clamp(1.75rem,5vw,2.75rem)]">
              {perfil?.display_name ?? sesion.email ?? 'Entrenador'}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-hueso-500">
              {perfil?.coach_code && (
                <span
                  className="rounded-full border border-cesped-500/30 bg-cesped-500/10 px-3 py-1 font-display tracking-wider text-cesped-300"
                  title="Tu ID de entrenador: no cambia aunque te cambies el nombre"
                >
                  {perfil.coach_code}
                </span>
              )}
              {perfil?.created_at && <span>En Gambeta desde el {fechaLarga(perfil.created_at)}</span>}
            </div>
          </div>

          <button onClick={salir} className="boton boton-secundario !px-5 !py-2.5 !text-sm">
            Salir
          </button>
        </div>
      </div>

      {/* ---- Los números ------------------------------------------------- */}
      <div>
        <p className="rotulo mb-4">Tu carrera, sumando todas las partidas</p>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 md:grid-cols-4">
          {cifras.map((cifra) => (
            <div key={cifra.etiqueta} className="dato-hover bg-carbon-900 px-4 py-5 md:px-5 md:py-6">
              <dt className="dato-valor font-display text-[clamp(1.5rem,5vw,2.5rem)] leading-none text-hueso-50">
                {cargandoDatos ? '—' : cifra.valor}
              </dt>
              <dd className="mt-2 text-[0.65rem] uppercase tracking-[0.12em] text-hueso-500">
                {cifra.etiqueta}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-hueso-500">
          Los partidos y los títulos salen de cada etapa tuya al frente de un
          club, en todas las salas que jugaste. El juego no lleva la cuenta de
          las horas, así que lo que se mide es lo que se dirigió.
        </p>
      </div>

      {/* ---- Club por club ----------------------------------------------- */}
      <div>
        <p className="rotulo mb-4">Club por club</p>
        {etapas.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-hueso-400">
              {cargandoDatos
                ? 'Buscando tu carrera…'
                : 'Todavía no dirigiste a nadie. En cuanto agarres tu primer club, esto se llena solo.'}
            </p>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="max-h-[30rem] overflow-auto">
              {/*
                ⚠ Columnas escalonadas, la misma lección que las otras tablas del
                  sitio: en un teléfono se muestran tres y punto.

                    Club · Temporadas · PJ    siempre
                    + Récord                  desde sm  (640px)
                    + Títulos                 desde md  (768px)
                    + Partida                 desde lg  (1024px)
              */}
              <table className="w-full border-collapse text-left text-sm">
                <caption className="solo-lectores">
                  Los clubes que dirigiste, con sus temporadas y su récord
                </caption>
                <thead className="sticky top-0 z-10 bg-carbon-850/95 backdrop-blur">
                  <tr className="text-[0.65rem] uppercase tracking-[0.14em] text-hueso-500">
                    <th scope="col" className="px-3 py-3 font-semibold md:px-6">Club</th>
                    <th scope="col" className="py-3 pr-3 text-right font-semibold md:pr-4">Temp.</th>
                    <th scope="col" className="py-3 pr-3 text-right font-semibold md:pr-4">PJ</th>
                    <th scope="col" className="hidden py-3 pr-3 text-right font-semibold sm:table-cell md:pr-4">
                      G-E-P
                    </th>
                    <th scope="col" className="hidden py-3 pr-3 text-right font-semibold md:table-cell md:pr-4">
                      Títulos
                    </th>
                    <th scope="col" className="hidden py-3 pr-3 text-right font-semibold lg:table-cell lg:pr-6">
                      Partida
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {etapas.map((etapa, indice) => (
                    <tr
                      key={`${etapa.room_id}-${indice}`}
                      className="border-t border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-2.5 md:px-6">
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="h-6 w-1.5 shrink-0 rounded-full"
                            style={{ background: etapa.club_colors?.primary ?? '#2c3531' }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-hueso-100">{etapa.club_name}</p>
                            {etapa.en_curso && (
                              <p className="text-xs text-cesped-400">dirigiendo ahora</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-hueso-400 md:pr-4">
                        {etapa.started_season}
                        {etapa.ended_season && etapa.ended_season !== etapa.started_season
                          ? `–${etapa.ended_season}`
                          : ''}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-display text-lg tabular-nums text-hueso-100 md:pr-4">
                        {etapa.matches_managed}
                      </td>
                      <td className="hidden py-2.5 pr-3 text-right tabular-nums text-hueso-400 sm:table-cell md:pr-4">
                        {etapa.wins}-{etapa.draws}-{etapa.losses}
                      </td>
                      <td className="hidden py-2.5 pr-3 text-right tabular-nums md:table-cell md:pr-4">
                        <span className={etapa.titles > 0 ? 'text-dorado-400' : 'text-hueso-500'}>
                          {etapa.titles}
                        </span>
                      </td>
                      <td className="hidden py-2.5 pr-3 text-right lg:table-cell lg:pr-6">
                        <p className="truncate text-xs text-hueso-400">{etapa.room_name}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ---- Los juegos --------------------------------------------------- */}
      <div>
        <p className="rotulo mb-4">Tus juegos</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {juegos.map((juego) => {
            const jugable = juego.estado === 'live'
            return (
              <a
                key={juego.id}
                href={juego.ruta}
                className="panel tarjeta-hover flex items-center gap-4 p-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/5 text-xl ring-1 ring-white/10">
                  {juego.icono}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-hueso-100">{juego.nombre}</p>
                  <p className="truncate text-xs text-hueso-500">
                    {jugable
                      ? `${n(perfil?.matches ?? 0)} partidos · ${n(perfil?.titles ?? 0)} títulos`
                      : 'Todavía no salió'}
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
