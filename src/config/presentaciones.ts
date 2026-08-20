/**
 * LAS PRESENTACIONES DE LA PORTADA
 * ================================
 *
 * Un scrollytelling corto por juego: el texto baja a la izquierda y la imagen
 * queda clavada a la derecha, cambiando con él. Lo dibuja `Recorrido.astro`,
 * el mismo componente que usa la página del Manager.
 *
 * ⚑ LA PORTADA CUENTA, LA PÁGINA DEL JUEGO EXPLICA. Acá van tres a cinco
 *   etapas y ni una más: el recorrido completo del Manager —diez del club y
 *   cuatro de la selección— vive en `/manager`. Repetirlo entero es lo que
 *   había dejado la página larguísima.
 *
 * ⚠ MANAGER LLEVA CAPTURAS DE VERDAD; PLAYER Y TEST, ARTE. Los dos que faltan
 *   no existen todavía como pantalla, así que no hay nada honesto que
 *   fotografiar. Van marcadas con `tipo: 'arte'` y el componente les pone el
 *   badge "Arte" — el visitante tiene que poder distinguir de un vistazo qué ya
 *   corre y qué es una promesa.
 */

import type { Etapa } from '@/config/recorrido'

export interface Presentacion {
  /** El mismo id que en `games.ts`. */
  juego: string
  rotulo: string
  /** El título de la sección, partido en dos para el degradé. */
  titulo: string
  tituloResaltado: string
  bajada: string
  etapas: Etapa[]
}

export const PRESENTACIONES: Presentacion[] = [
  {
    juego: 'manager',
    rotulo: 'El que ya se juega',
    titulo: 'Dirigí un club',
    tituloResaltado: 'y peleá la liga con tus amigos',
    bajada:
      'Cinco momentos de una temporada. Todas las pantallas son capturas del juego funcionando, no maquetas.',
    etapas: [
      {
        id: 'p-sala',
        numero: '01',
        titulo: 'Se abre una sala y entran todos',
        texto:
          'Sale un código de seis letras, lo pasás por WhatsApp y cada uno entra desde su navegador, sin instalar nada. Después cada manager agarra su club: el grande de tu liga o uno del ascenso para hacerlo subir.',
        imagen: '/assets/screenshots/sala-desktop.webp',
        pie: 'La sala, con el código para invitar',
      },
      {
        id: 'p-mercado',
        numero: '02',
        titulo: 'Se pelea el mercado',
        texto:
          'Ofertas, contraofertas y subastas contra los otros managers y contra la computadora. Cesiones, cláusulas y renovaciones, con un buscador que entra en los 37.000 futbolistas del mundo y no sólo en tu partida.',
        imagen: '/assets/screenshots/mercado-desktop.webp',
        pie: 'El mercado de pases',
      },
      {
        id: 'p-equipo',
        numero: '03',
        titulo: 'Se planta el equipo',
        texto:
          'Once en la cancha, arrastrando con el dedo o con el mouse, y al lado el planteo: actitud, presión, marca, por dónde atacás y quién patea los penales.',
        imagen: '/assets/screenshots/equipo-desktop.webp',
        pie: 'La cancha y el planteo, juntos',
      },
      {
        id: 'p-partido',
        numero: '04',
        titulo: 'Y se juega la fecha, en vivo',
        texto:
          'Todos marcan «listo» y se ven los diez partidos a la vez: el tuyo en el medio, los demás a los costados con sus goles, y la crónica cayendo abajo. Ahí ya no tocás nada. Mirás.',
        imagen: '/assets/screenshots/partido-desktop.webp',
        pie: 'La fecha en vivo, minuto 33',
      },
      {
        id: 'p-tabla',
        numero: '05',
        titulo: 'Treinta y ocho fechas después',
        texto:
          'Sale campeón uno solo; los demás pelean el descenso, la copa o el orgullo. Después se abre el mercado, los pibes crecen, los veteranos aflojan, y arranca la temporada siguiente.',
        imagen: '/assets/screenshots/tablas-desktop.webp',
        pie: 'La tabla, con lo que quedó',
      },
    ],
  },
  {
    juego: 'player',
    rotulo: 'El que viene',
    titulo: 'Una carrera.',
    tituloResaltado: 'Una sola.',
    bajada:
      'El mismo mundo, pero desde adentro de la cancha. Todavía no se juega: esto es hacia dónde va.',
    etapas: [
      {
        id: 'pl-cantera',
        numero: '01',
        titulo: 'Empezás sin ser nadie',
        texto:
          'Un pibe en las inferiores de un club que a lo mejor nunca escuchaste nombrar. Sin contrato, sin dorsal y sin nadie mirándote. Lo único que tenés es el puesto que elegiste y las ganas de que el técnico se acuerde de tu nombre.',
        imagen: '/assets/generated/bg-player-cantera-1600.webp',
        imagenChica: '/assets/generated/bg-player-cantera-900.webp',
        tipo: 'arte',
        pie: 'Las inferiores, donde arranca todo',
      },
      {
        id: 'pl-decision',
        numero: '02',
        titulo: 'Y cada decisión te firma',
        texto:
          'El club que te ofrece más plata o el que te ofrece jugar. Quedarte de titular en un chico o ir al banco de un grande. Pedir el cambio de puesto. Cada una cierra una puerta: en Player Game no hay partida guardada para volver atrás.',
        imagen: '/assets/generated/bg-player-decision-1600.webp',
        imagenChica: '/assets/generated/bg-player-decision-900.webp',
        tipo: 'arte',
        pie: 'La decisión que no tiene vuelta',
      },
      {
        id: 'pl-gloria',
        numero: '03',
        titulo: 'Hasta que un día te llaman',
        texto:
          'De la reserva a la primera, de la primera a Europa, y si la carrera te dio para tanto, a la selección. Un retiro, un número final, y una historia que no se va a repetir igual nunca más.',
        imagen: '/assets/generated/bg-player-gloria-1600.webp',
        imagenChica: '/assets/generated/bg-player-gloria-900.webp',
        tipo: 'arte',
        pie: 'El final que te ganaste',
      },
    ],
  },
  {
    juego: 'test',
    rotulo: 'El otro que viene',
    titulo: '¿Cuánto fútbol',
    tituloResaltado: 'sabés de verdad?',
    bajada:
      'Trivia rápida para discutir en el grupo. Tampoco se juega todavía, pero la idea es esta.',
    etapas: [
      {
        id: 'te-pregunta',
        numero: '01',
        titulo: 'Diez segundos por pregunta',
        texto:
          'Formaciones, transferencias, camisetas, finales y esos datos que uno jura que sabe hasta que se lo preguntan. Partidas de un minuto, para jugar parado en el colectivo.',
        imagen: '/assets/generated/bg-test-pregunta-1600.webp',
        imagenChica: '/assets/generated/bg-test-pregunta-900.webp',
        tipo: 'arte',
        pie: 'Una pregunta, diez segundos',
      },
      {
        id: 'te-duelo',
        numero: '02',
        titulo: 'Y el que se hace el que sabe',
        texto:
          'Duelos mano a mano contra el amigo que siempre dice que la tiene clara. Mismas preguntas, mismo tiempo, y un resultado que no se discute.',
        imagen: '/assets/generated/bg-test-duelo-1600.webp',
        imagenChica: '/assets/generated/bg-test-duelo-900.webp',
        tipo: 'arte',
        pie: 'El duelo, mano a mano',
      },
      {
        id: 'te-tabla',
        numero: '03',
        titulo: 'Queda escrito en la tabla',
        texto:
          'Una tabla por grupo, que arranca de nuevo cada semana. Y las preguntas salen del mundo de Gambeta, así que el que juega el Manager corre con ventaja.',
        imagen: '/assets/generated/bg-test-tabla-1600.webp',
        imagenChica: '/assets/generated/bg-test-tabla-900.webp',
        tipo: 'arte',
        pie: 'La tabla del grupo',
      },
    ],
  },
]

export const presentacionDe = (juego: string) =>
  PRESENTACIONES.find((p) => p.juego === juego)!
