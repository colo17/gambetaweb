/**
 * LA CUENTA DE GAMBETA
 * ====================
 *
 * Una sola cuenta para todos los juegos. La base es la MISMA que usa Gambeta
 * Manager Game —el Supabase del juego—, así que quien se registró jugando entra
 * acá con lo mismo y ve su carrera.
 *
 * ⚑ CÓMO SE PRENDE. Como con `PUBLIC_URL_MANAGER`, no hay que tocar código: se
 *   definen dos variables en Vercel y se vuelve a construir.
 *
 *       PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
 *       PUBLIC_SUPABASE_ANON_KEY=eyJhbGci…
 *
 *   La clave "anon" es pública por diseño —viaja en el bundle de cualquier app
 *   de Supabase, incluida la del juego— y no da acceso a nada: lo que se puede
 *   leer o escribir lo decide la RLS de la base, no la clave. La clave de
 *   servicio NO va acá ni en ningún lado de este repo.
 *
 * ⚠ MIENTRAS NO ESTÉN DEFINIDAS, la página de perfil muestra un cartel que lo
 *   dice y no rompe nada. Y el cliente de Supabase ni siquiera se descarga: se
 *   importa en forma dinámica, así que sin cuentas configuradas son ~40 KB de
 *   JavaScript que nadie baja.
 */

export const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL?.trim() || ''
export const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

/** ¿Están las dos variables? Si falta una, no hay cuentas. */
export const HAY_CUENTAS = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/**
 * Dónde guarda Supabase la sesión en el navegador.
 *
 * ⚑ ESTÁ ACÁ PARA QUE LO USEN DOS. El cliente lo recibe como `storageKey`, y el
 *   control de cuenta del header lo lee **a mano** para saber si hay alguien
 *   adentro sin tener que descargar el paquete de Supabase en las seis páginas.
 */
export const CLAVE_SESION = 'gambeta-web-auth'

/** La carrera de un entrenador, tal como la devuelve `coach_profile()`. */
export interface PerfilEntrenador {
  id: string
  display_name: string
  coach_code: string
  country_id: number | null
  created_at: string
  matches: number
  wins: number
  draws: number
  losses: number
  points: number
  titles: number
  clubs: number
  rooms: number
  seasons: number
}

/** Una etapa al frente de un club, tal como la devuelve `coach_spells()`. */
export interface EtapaEntrenador {
  room_id: string
  room_name: string
  club_name: string
  club_colors: { primary?: string; secondary?: string; text?: string } | null
  started_season: number
  ended_season: number | null
  end_reason: string | null
  matches_managed: number
  wins: number
  draws: number
  losses: number
  titles: number
  en_curso: boolean
}

/**
 * El cliente, creado una sola vez y recién cuando hace falta.
 *
 * ⚑ El `import()` es dinámico A PROPÓSITO: así el paquete de Supabase queda en
 *   su propio trozo y sólo lo baja quien abre /perfil con las cuentas prendidas.
 */
let promesaCliente: Promise<any> | null = null

export function clienteCuenta() {
  if (!HAY_CUENTAS) throw new Error('Las cuentas no están configuradas en este despliegue.')
  if (!promesaCliente) {
    promesaCliente = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          /**
           * ⚠ EN `true`, Y HACE FALTA.
           *
           * Estaba en `false` con el argumento de que el sitio no recibe
           * callbacks de OAuth. Es cierto, pero **el de recuperar la contraseña
           * sí es un callback**: el mail lleva a `/perfil` con el token en el
           * hash de la URL, y con esto apagado el token se ignoraba y la
           * persona caía en el login sin que pasara nada.
           *
           * Prendido, el cliente lee el token, abre una sesión temporal y
           * dispara `PASSWORD_RECOVERY`, que es lo que la isla escucha para
           * mostrar el formulario de contraseña nueva.
           */
          detectSessionInUrl: true,
          storageKey: CLAVE_SESION,
        },
      })
    )
  }
  return promesaCliente
}

/**
 * Traduce el error de Supabase a algo que se entienda.
 *
 * ⚠ NO SE DISTINGUE "no existe ese mail" de "la contraseña está mal", y es a
 *   propósito: contestar cuál de las dos falló le regala a cualquiera una forma
 *   de averiguar qué mails están registrados.
 */
export function decirElError(error: { message?: string } | null | undefined) {
  const mensaje = error?.message ?? ''
  if (/invalid login credentials/i.test(mensaje)) return 'Ese mail y esa contraseña no coinciden.'
  if (/email not confirmed/i.test(mensaje)) {
    return 'Falta confirmar el mail. Fijate en tu casilla, incluida la carpeta de correo no deseado.'
  }
  if (/user already registered/i.test(mensaje)) return 'Ese mail ya tiene una cuenta. Probá entrando.'
  if (/password should be at least/i.test(mensaje)) {
    return 'La contraseña es muy corta: tiene que tener al menos 6 caracteres.'
  }
  if (/rate limit|too many/i.test(mensaje)) return 'Demasiados intentos seguidos. Esperá un minuto.'
  if (/fetch|network/i.test(mensaje)) return 'No pudimos hablar con el servidor. Fijate la conexión.'
  return 'No pudimos completarlo. Probá de nuevo en un rato.'
}

/** "20 de agosto de 2026", que es como se lee una fecha en el sitio. */
export function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
