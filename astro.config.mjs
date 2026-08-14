// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

/**
 * Config del sitio de Gambeta.
 *
 * `site` no es decorativo: de ahí salen las URLs absolutas del sitemap y de las
 * etiquetas Open Graph. Si el dominio cambia, se cambia acá y nada más.
 */
export default defineConfig({
  site: 'https://gambetagame.com',

  integrations: [react(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    /**
     * El CSS va INCRUSTADO en el HTML, no en un <link>.
     *
     * Medido: el LCP de esta página es un bloque de TEXTO (el párrafo del
     * hero), así que lo único que lo demora es el CSS que bloquea el render.
     * Con `auto`, las hojas grandes salen como <link> y en 4G eso cuesta un
     * viaje entero de ida y vuelta antes de poder pintar una letra.
     *
     * El sitio es una sola página: no hay CSS compartido entre rutas que
     * convenga cachear aparte, así que incrustar no tiene contra.
     */
    inlineStylesheets: 'always',
  },

  image: {
    // Astro optimiza a WebP en el build; el original queda como respaldo.
    responsiveStyles: true,
  },
})
