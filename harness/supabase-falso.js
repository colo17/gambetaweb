/**
 * UN SUPABASE DE MENTIRA, PARA EL HARNESS
 * =======================================
 *
 * ⛔ POR QUÉ HACE FALTA: `src/lib/supabase.js` del juego TIRA UN ERROR al
 *    importarse si no encuentra `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`:
 *
 *        throw new Error('Faltan variables de entorno de Supabase…')
 *
 *    Y el store `gameSession.js` lo importa, así que sin esto no se puede
 *    montar ni una pantalla. Poner las claves de verdad tampoco serviría: el
 *    harness apuntaría a la base de PRODUCCIÓN del juego, que es exactamente
 *    lo que no hay que tocar.
 *
 * Este stub se engancha por alias en `vite.harness.config.mjs`, así que el
 * archivo original del juego queda intacto. Todo devuelve vacío: las pantallas
 * dibujan lo que ya está en el store, que es lo que queremos fotografiar.
 */

/**
 * Lo que devuelve cada tabla que alguna pantalla consulta directamente.
 *
 * ⚑ Algunos paneles no pasan por el store: le hablan a `supabase.from(...)` de
 *   una. Juveniles es el caso claro —lee `youth_players`— y con una respuesta
 *   vacía dibujaba "No hay juveniles en la academia", que es un cartel de error
 *   disfrazado, no una captura que muestre lo que hace el juego.
 */
const NOMBRES = ['Tomás', 'Nahuel', 'Bautista', 'Lautaro', 'Thiago']
const APELLIDOS = ['Ferrari', 'Quiroga', 'Bustos', 'Medrano', 'Silveira']

const POR_TABLA = {
  youth_players: NOMBRES.map((nombre, i) => ({
    id: `youth-${i}`,
    name: `${nombre} ${APELLIDOS[i]}`,
    position: ['DC', 'MC', 'DFC', 'POR', 'ED', 'LI'][i],
    side: i % 3 === 0 ? 'I' : 'D',
    age: 16 + (i % 3),
    fuerza: 44 + i * 3,
    potential: 68 + i * 4,
    development: 10 + i * 12,
    estrellas: 2.5 + (i % 4) * 0.5,
    country_id: 151,
  })),
}

/** Una respuesta de PostgREST vacía, pero con la forma correcta. */
const vacio = { data: [], error: null, count: 0 }

/**
 * Un constructor de consultas encadenable. Cualquier método devuelve `this`,
 * así que `.select().eq().order().limit()` funciona sin enumerar nada, y
 * `await` sobre él resuelve porque implementa `then`.
 */
function consulta(tabla) {
  const datos = POR_TABLA[tabla]
  const respuesta = datos ? { data: datos, error: null, count: datos.length } : vacio

  const objetivo = {
    then: (resolver) => Promise.resolve(respuesta).then(resolver),
    catch: () => Promise.resolve(respuesta),
    finally: (fn) => Promise.resolve(respuesta).finally(fn),
  }

  return new Proxy(objetivo, {
    get(destino, propiedad) {
      if (propiedad in destino) return destino[propiedad]
      // `single` y `maybeSingle` devuelven un objeto, no una lista.
      if (propiedad === 'single' || propiedad === 'maybeSingle') {
        return () => Promise.resolve({ data: datos?.[0] ?? null, error: null })
      }
      return () => consulta(tabla)
    },
  })
}

/** Las funciones de Postgres que alguna pantalla llama por `rpc`. */
const RPC = {
  // Juveniles pide las estrellas de a una, por jugador.
  youth_stars: 3,
}

export const supabase = {
  from: (tabla) => consulta(tabla),
  rpc: (nombre) =>
    nombre in RPC
      ? Promise.resolve({ data: RPC[nombre], error: null })
      : consulta(),
  auth: {
    getUser: async () => ({ data: { user: { id: 'harness' } }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  channel: () => ({
    on() { return this },
    subscribe() { return this },
    track: async () => {},
    send: async () => {},
    unsubscribe: async () => {},
  }),
  removeChannel: async () => {},
  functions: { invoke: async () => ({ data: null, error: null }) },
}

export async function callFunction() {
  return null
}
