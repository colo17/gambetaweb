/**
 * EL CATÁLOGO DE JUEGOS DE GAMBETA
 * ================================
 *
 * ⚑ ACÁ SE AGREGA UN JUEGO NUEVO, Y EN NINGÚN OTRO LADO. La grilla del hub, el
 *   menú del header y los datos estructurados de SEO se arman solos a partir de
 *   este archivo. Sumar un juego es empujar un objeto a `JUEGOS`, no tocar UI.
 */

export type EstadoJuego = 'live' | 'coming-soon'

export interface Juego {
  /** Clave estable. Se usa como ancla (#id) y como key de React. */
  id: string
  nombre: string
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
 * definir la variable de entorno en Vercel/Netlify y volver a construir.
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
    url: URL_MANAGER,
  },
  {
    id: 'player',
    nombre: 'Gambeta Player Game',
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
    url: null,
  },
  {
    id: 'test',
    nombre: 'Gambeta Test',
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
    url: null,
  },
]

/** El juego que manda en el hero. */
export const JUEGO_DESTACADO = JUEGOS[0]

/** A dónde apunta cualquier CTA de "jugar": al juego, o al formulario de aviso. */
export const CTA_JUGAR = {
  href: URL_MANAGER ?? '#avisame',
  texto: URL_MANAGER ? 'Jugar ahora' : 'Quiero jugar',
  externo: Boolean(URL_MANAGER),
}

/**
 * Las secciones del menú. El hub sale de `JUEGOS`, así que no se repite acá.
 *
 * ⚑ EL ORDEN ES EL MISMO QUE EL DE LA PÁGINA, y tiene que seguir siéndolo: un
 *   menú que enumera las secciones en otro orden del que aparecen al bajar
 *   desorienta. Si se mueve una sección en `index.astro`, se mueve acá.
 */
export const NAVEGACION = [
  { href: '#camino', texto: 'Cómo se juega' },
  { href: '#manager', texto: 'Manager' },
  { href: '#alma', texto: 'El alma' },
  { href: '#juegos', texto: 'Juegos' },
  { href: '#proximamente', texto: 'Próximamente' },
]
