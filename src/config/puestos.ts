/**
 * EL VOCABULARIO DE PUESTOS DEL JUEGO
 *
 * ⚑ ES UNA COPIA DE `src/game/positions.js` DE `cyberfoot-online`, que es solo
 *   lectura. Se copia y no se importa a propósito: importar de esa carpeta
 *   ataría el build del sitio al del juego.
 *
 * ⚑ Y VIVE ACÁ, y no dentro del JSON de cada plantel: son 37.329 jugadores, así
 *   que repetir "Volante central defensivo" en cada fila serían megas de texto
 *   duplicado. El archivo manda la sigla y el navegador la traduce.
 */

export const PUESTO_LABEL: Record<string, string> = {
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
  // Los cinco viejos, por si algún jugador nunca llegó a la migración 0124.
  G: 'Arquero',
  DL: 'Lateral',
  V: 'Volante',
  A: 'Delantero',
}

export type Linea = 'keeper' | 'defense' | 'midfield' | 'attack'

export const PUESTO_LINEA: Record<string, Linea> = {
  POR: 'keeper', G: 'keeper',
  DFC: 'defense', LD: 'defense', LI: 'defense', DL: 'defense',
  MCD: 'midfield', MC: 'midfield', MCO: 'midfield', MD: 'midfield', MI: 'midfield', V: 'midfield',
  ED: 'attack', EI: 'attack', DC: 'attack', A: 'attack',
}

/** Los colores de cada línea, para que se lea de un vistazo quién es qué. */
export const COLOR_LINEA: Record<Linea, string> = {
  keeper: 'bg-dorado-500/15 text-dorado-300 ring-dorado-500/30',
  defense: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  midfield: 'bg-cesped-500/15 text-cesped-300 ring-cesped-500/30',
  attack: 'bg-red-500/15 text-red-300 ring-red-500/30',
}

export const lineaDe = (puesto: string): Linea => PUESTO_LINEA[puesto] ?? 'midfield'
export const labelDe = (puesto: string) => PUESTO_LABEL[puesto] ?? puesto

/**
 * El orden en que se lee un plantel: del arco para adelante.
 *
 * ⚠ Ordenar por fuerza está bien para el ranking, pero un plantel se mira por
 *   línea. El archivo viene ordenado por fuerza; esto lo reordena cuando el
 *   visitante elige "por puesto".
 */
const ORDEN_LINEA: Record<Linea, number> = { keeper: 0, defense: 1, midfield: 2, attack: 3 }
export const ordenDePuesto = (puesto: string) => ORDEN_LINEA[lineaDe(puesto)]
