// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

/**
 * Config del sitio de Gambeta.
 *
 * `site` no es decorativo: de ahí salen el canonical, las URLs del sitemap y las
 * de Open Graph. Si apunta a un dominio que no existe, **el link compartido sale
 * sin imagen de vista previa**, porque la etiqueta `og:image` queda apuntando a
 * un servidor que no contesta.
 *
 * ⚑ POR ESO SE PUEDE PISAR CON UNA VARIABLE. Mientras gambetagame.com no esté
 *   apuntado, el sitio vive en `gambetaweb.vercel.app` y conviene que las
 *   vistas previas funcionen ahí:
 *
 *       PUBLIC_SITIO=https://gambetaweb.vercel.app
 *
 *   El día que el dominio propio esté andando, **se borra esa variable** y todo
 *   vuelve solo al valor de abajo. No hay nada más que tocar.
 */
export default defineConfig({
  site: process.env.PUBLIC_SITIO?.trim() || 'https://gambetagame.com',

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
     * ⚠ EL SITIO YA NO ES UNA SOLA PÁGINA, y esto se revisó cuando se partió en
     *   seis (agosto de 2026). Ahora sí tiene una contra: el CSS se repite en
     *   cada HTML —unos 12 KB comprimidos por página— en vez de bajarse una vez
     *   y quedar en caché para las demás.
     *
     *   Se dejó igual porque se midió: con el CSS incrustado las seis páginas
     *   dan entre 98 y 100 de rendimiento, en teléfono y en escritorio. Sacarlo
     *   agrega un viaje que bloquea el render en CADA primera visita, que es la
     *   que importa. Si algún día el CSS crece mucho, vale volver a medir con
     *   `auto` antes de cambiarlo — pero medir, no suponer.
     */
    inlineStylesheets: 'always',
  },

  image: {
    // Astro optimiza a WebP en el build; el original queda como respaldo.
    responsiveStyles: true,
  },
})
