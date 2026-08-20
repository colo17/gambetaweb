/**
 * LAS FORMACIONES DE LA PIZARRA
 * =============================
 *
 * Las posiciones de los once, en coordenadas de la cancha que dibuja
 * `Pizarra.astro` (400 × 600). El arco propio está abajo: se ataca hacia
 * arriba, y el primero de la lista siempre es el arquero.
 *
 * ⚑ VIVEN ACÁ Y NO EN EL COMPONENTE porque las necesitan dos: la pizarra para
 *   dibujarlas y el escenario para poner la etiqueta ("4-3-3") en el pie de la
 *   figura. De un `.astro` no se puede importar nada, así que van sueltas.
 */

export interface Formacion {
  /** Lo que se lee en el pie de la pizarra. */
  etiqueta: string
  /** Los once, en orden: arquero, defensa, medio, ataque. */
  jugadores: [number, number][]
  /** Dónde está la pelota en ese momento. */
  pelota: [number, number]
}

export const FORMACIONES: Record<string, Formacion> = {
  '4-2-3-1': {
    etiqueta: '4-2-3-1',
    jugadores: [
      [200, 545],
      [70, 438], [154, 454], [246, 454], [330, 438],
      [148, 344], [252, 344],
      [76, 240], [200, 258], [324, 240],
      [200, 140],
    ],
    pelota: [200, 300],
  },
  '4-4-2': {
    etiqueta: '4-4-2',
    jugadores: [
      [200, 545],
      [72, 440], [156, 458], [244, 458], [328, 440],
      [72, 300], [156, 312], [244, 312], [328, 300],
      [156, 168], [244, 168],
    ],
    pelota: [236, 268],
  },
  '4-3-3': {
    etiqueta: '4-3-3',
    jugadores: [
      [200, 545],
      [66, 436], [152, 452], [248, 452], [334, 436],
      [124, 322], [200, 346], [276, 322],
      [74, 168], [200, 128], [326, 168],
    ],
    pelota: [260, 200],
  },
  /**
   * El abrazo del final. No es una formación: es lo que queda cuando terminó.
   * Por eso el arquero también está adentro del montón.
   */
  festejo: {
    etiqueta: '⚑ Campeón',
    jugadores: [
      [200, 214], [172, 228], [228, 228], [186, 254], [214, 254],
      [158, 250], [242, 250], [200, 268], [176, 200], [224, 200], [200, 240],
    ],
    pelota: [200, 62],
  },
}
