/**
 * LA FORMA DE UNA ETAPA DE SCROLLYTELLING
 *
 * ⚑ VIVE ACÁ Y NO EN `Recorrido.astro` porque de un componente `.astro` no se
 *   puede importar un tipo: el frontmatter no es un módulo. Los tres lugares
 *   que arman etapas —la portada, el camino del club y el de la selección—
 *   necesitan la misma forma, así que la forma vive aparte.
 */
export interface Etapa {
  id: string
  numero: string
  titulo: string
  texto: string
  imagen: string
  /** La misma imagen más chica, para el teléfono. Sólo la usa el arte: las
   *  capturas del juego no tienen otra medida. */
  imagenChica?: string
  pie: string
  /** 'juego' (por defecto) o 'arte'; cambia el badge y el encuadre. */
  tipo?: 'juego' | 'arte'
  /**
   * La imagen que va DE FONDO en el escenario de la portada, cuando tiene que
   * ser distinta de la que se muestra en el marco.
   *
   * ⚑ Existe por las capturas del juego: una captura de interfaz no sirve de
   *   fondo a sangre —se estira, se oscurece y no se lee—, pero el bloque sin
   *   fondo queda negro al lado de los otros dos. Con esto, cada etapa del
   *   Manager tiene su propia ilustración atrás y su captura nítida adelante.
   *
   * Si no está, el escenario usa la imagen de la etapa (difuminada, si es una
   * captura).
   */
  fondo?: string
  /** La misma de fondo, más chica, para el teléfono. */
  fondoChico?: string
  /** Imágenes adicionales; si están, el marco se parte en mosaico. */
  extra?: { imagen: string; pie: string }[]
}
