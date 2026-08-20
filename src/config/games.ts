/**
 * EL CATÁLOGO DE JUEGOS DE GAMBETA
 * ================================
 *
 * ⚑ ACÁ SE AGREGA UN JUEGO NUEVO, Y EN NINGÚN OTRO LADO. La grilla del hub, el
 *   menú del header, el footer y los datos estructurados de SEO se arman solos
 *   a partir de este archivo.
 *
 * ⚑ DESDE QUE EL SITIO TIENE VARIAS PÁGINAS, cada juego trae su `ruta`. Sumar
 *   un juego, entonces, son dos pasos: empujar un objeto acá y crear
 *   `src/pages/<ruta>.astro`. La navegación aparece sola.
 */

export type EstadoJuego = 'live' | 'coming-soon'

export interface Juego {
  /** Clave estable. Se usa como ancla, como key de React y como id de la presentación. */
  id: string
  nombre: string
  /** El nombre corto, para el menú y las migas. */
  nombreCorto: string
  /** El subtítulo de una línea que va abajo del nombre. */
  tagline: string
  descripcion: string
  estado: EstadoJuego
  /** Qué dice el badge de la card. */
  etiqueta: string
  /** Emoji o glifo del ícono. Barato y no pide una request más. */
  icono: string
  /** Los tres bullets que se muestran en la card. */
  claves: string[]
  /** Color de acento de la card, en formato de token de Tailwind. */
  acento: 'cesped' | 'dorado' | 'hueso'
  /** La página propia del juego dentro de este sitio. */
  ruta: string
  /** Si está `live`, a dónde lleva "Jugar". `null` mientras no haya deploy. */
  url: string | null
}

/**
 * A DÓNDE LLEVA EL BOTÓN "JUGAR AHORA"
 *
 * ⚠ EL JUEGO TODAVÍA NO ESTÁ PUBLICADO. Mientras no lo esté, esta constante
 *   vale `null` y todos los CTA del sitio caen en el formulario de aviso.
 *
 * Para prenderlo el día del deploy NO hay que tocar componentes: alcanza con
 * definir la variable de entorno en Vercel y volver a construir.
 *
 *     PUBLIC_URL_MANAGER=https://jugar.gambetagame.com
 *
 * El sitio entero —header, hero, card del hub, datos estructurados— cambia solo.
 */
export const URL_MANAGER: string | null =
  import.meta.env.PUBLIC_URL_MANAGER?.trim() || null

export const JUEGOS: Juego[] = [
  {
    id: 'manager',
    nombre: 'Gambeta Manager Game',
    nombreCorto: 'Manager',
    tagline: 'Sos el DT. El resultado es tuyo.',
    descripcion:
      'Un manager por turnos para jugar una liga entera con amigos. No jugás la pelota: elegís el club, armás el plantel, peleás el mercado, plantás la táctica y te bancás los noventa minutos desde el banco.',
    estado: 'live',
    etiqueta: 'Jugable',
    icono: '⚽',
    claves: [
      '81 ligas de 64 países, con planteles reales',
      'Multijugador con sala y código de invitación',
      'Fecha en vivo: se ve el partido mientras se juega',
    ],
    acento: 'cesped',
    ruta: '/manager',
    url: URL_MANAGER,
  },
  {
    id: 'player',
    nombre: 'Gambeta Player Game',
    nombreCorto: 'Player',
    tagline: 'Una carrera. Una sola.',
    descripcion:
      'Del ascenso a la selección, pero desde adentro de la cancha. Elegís un pibe, y cada decisión —el club que firma, el puesto, el minuto que te toca— escribe una carrera que no se puede repetir.',
    estado: 'coming-soon',
    etiqueta: 'Próximamente',
    icono: '👟',
    claves: [
      'Carrera de jugador, de las inferiores al retiro',
      'Decisiones que no tienen vuelta atrás',
      'El mismo mundo de 37.000 futbolistas',
    ],
    acento: 'dorado',
    ruta: '/player',
    url: null,
  },
  {
    id: 'test',
    nombre: 'Gambeta Test',
    nombreCorto: 'Test',
    tagline: '¿Cuánto fútbol sabés de verdad?',
    descripcion:
      'Trivia rápida para discutir en el grupo. Formaciones, transferencias, camisetas, finales y esos datos que uno jura que sabe hasta que se lo preguntan.',
    estado: 'coming-soon',
    etiqueta: 'Próximamente',
    icono: '🧠',
    claves: [
      'Partidas de un minuto',
      'Duelos y tabla entre amigos',
      'Preguntas sacadas del mundo de Gambeta',
    ],
    acento: 'hueso',
    ruta: '/test',
    url: null,
  },
]

/** El juego que manda en el hero. */
export const JUEGO_DESTACADO = JUEGOS[0]

export const juegoPorId = (id: string) => JUEGOS.find((juego) => juego.id === id)!

/**
 * A dónde apunta cualquier CTA de "jugar": al juego, o al formulario de aviso.
 *
 * ⚠ EL ANCLA ES ABSOLUTA (`/#avisame`) Y NO RELATIVA (`#avisame`). El botón
 *   vive en el header, o sea en las seis páginas; con el ancla relativa, desde
 *   /gambeta o /perfil no llevaba a ningún lado porque ahí el formulario no
 *   existe.
 */
export const CTA_JUGAR = {
  href: URL_MANAGER ?? '/#avisame',
  texto: URL_MANAGER ? 'Jugar ahora' : 'Quiero jugar',
  externo: Boolean(URL_MANAGER),
}

/**
 * EL MENÚ.
 *
 * ⚑ SON PÁGINAS, NO ANCLAS. Hasta agosto de 2026 el sitio era una sola página y
 *   el menú saltaba a secciones; quedó demasiado largo y se partió en seis.
 *
 * ⚠ El orden es el del recorrido que se espera: primero la marca, después el
 *   mundo, después los juegos de más a menos terminado, y la cuenta al final.
 */
export const NAVEGACION = [
  { href: '/', texto: 'Inicio' },
  { href: '/gambeta', texto: 'Gambeta' },
  { href: '/manager', texto: 'Manager' },
  { href: '/player', texto: 'Player' },
  { href: '/test', texto: 'Test' },
  { href: '/perfil', texto: 'Perfil' },
]

/** ¿Esta ruta es la que está abierta? Sirve para marcar el ítem del menú. */
export function rutaActiva(href: string, pathname: string) {
  const limpia = (r: string) => (r !== '/' && r.endsWith('/') ? r.slice(0, -1) : r)
  return limpia(href) === limpia(pathname)
}
