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
  /** Imágenes adicionales; si están, el marco se parte en mosaico. */
  extra?: { imagen: string; pie: string }[]
}
