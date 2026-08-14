import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import os from 'node:os'

/**
 * SERVIDOR DEL HARNESS DE CAPTURAS
 * ================================
 *
 * Levanta los componentes REALES de `cyberfoot-online` —mismo JSX, mismo CSS,
 * mismas fuentes— para poder fotografiarlos, sin arrancar el juego entero (que
 * pide sesión de Supabase y una sala que hoy no existe).
 *
 * ⛔ REGLA DEL PROYECTO: LA CARPETA DEL JUEGO ES SOLO LECTURA.
 *
 * Vite escribe una cosa sola, la caché de dependencias, y por defecto la deja
 * en `<root>/node_modules/.vite`. Acá el `root` es la carpeta `harness/` de
 * ESTE proyecto, y además `cacheDir` apunta al temporal del sistema. El
 * repo del juego se lee y nada más:
 *
 *   · `root`      → gambeta-web/harness      (nuestro)
 *   · `cacheDir`  → %TEMP%/gambeta-harness   (nuestro)
 *   · el juego    → sólo entra por el alias `@` y por `fs.allow`
 */

const JUEGO = path.resolve('C:/Users/Juan/cyberfoot-online')
const AQUI = path.resolve('.')

export default defineConfig({
  root: path.join(AQUI, 'harness'),
  cacheDir: path.join(os.tmpdir(), 'gambeta-harness-vite'),

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: [
      /**
       * ⚑ El stub de Supabase va PRIMERO: Vite prueba los alias en orden y
       *   `@/` matchearía igual. Sin esto, importar el store del juego tira
       *   "Faltan variables de entorno de Supabase" y no se monta nada.
       *   Ver `harness/supabase-falso.js`.
       */
      {
        find: /^@\/lib\/supabase\.js$/,
        replacement: path.join(AQUI, 'harness/supabase-falso.js'),
      },
      // El mismo alias que usa el juego en su propio vite.config.js
      { find: /^@\//, replacement: path.join(JUEGO, 'src') + '/' },
    ],
    // Una sola copia de React: el harness y los componentes del juego viven en
    // node_modules distintos, y dos Reacts rompen los hooks.
    dedupe: ['react', 'react-dom'],
  },

  server: {
    port: 5199,
    strictPort: false,
    fs: {
      // Servir archivos de la carpeta del juego (leer, no escribir).
      allow: [JUEGO, AQUI],
    },
  },
})
