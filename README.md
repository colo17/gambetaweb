# Gambeta — sitio oficial

Landing y hub de **Gambeta**, la marca que agrupa nuestros juegos de fútbol.
Dominio: **gambetagame.com**.

Hoy hay un juego jugable (*Gambeta Manager Game*) y dos en camino
(*Player Game* y *Test*). El sitio está armado para que sumar un juego nuevo sea
editar un archivo de datos, no rehacer pantallas.

> **¿Venís de cero o de otra ventana?** Leé **[CONTEXTO.md](CONTEXTO.md)** antes
> de tocar nada: tiene la regla de que la carpeta del juego es solo lectura, lo
> que falta por hacer, y —sobre todo— **lo que ya se probó y no funcionó**.
> [HANDOFF.md](HANDOFF.md) es la crónica de cómo se construyó.

---

## Arranque rápido

```bash
npm install
npm run dev
```

Queda en <http://localhost:4321>.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build ya hecho |
| `npm run datos` | Regenera los JSON del catálogo desde el repo del juego |
| `npm run assets` | Reprocesa logo, fondos, íconos y la imagen de compartir |
| `npm run capturas` | Vuelve a fotografiar las pantallas del juego |
| `npm run harness` | Levanta sólo el harness de capturas, para mirarlo a ojo |
| `npm run probar` | Prueba funcional del sitio (19 verificaciones) |
| `npm run revisar` | Revisión visual: capturas a distintas alturas + chequeos |

Las tres últimas piden que haya un servidor levantado; `probar` y `revisar`
aceptan la URL como argumento (`node scripts/probar.mjs http://localhost:4400`).

---

## Stack

- **Astro 7** — el contenido sale en HTML de verdad, que es lo que necesita el SEO.
- **React 19** — sólo para la isla interactiva (el explorador de ligas).
- **Tailwind CSS 4** — el tema entero vive en `src/styles/global.css`, no hay `tailwind.config`.
- **GSAP + ScrollTrigger** — los dos scrollytelling.
- **TypeScript** en la config y la isla.

Todo estático: no hay servidor propio ni base de datos.

---

## Cómo está organizado

```
src/
  config/games.ts        ← EL CATÁLOGO DE JUEGOS. Se agrega un juego acá.
  data/*.json            ← generados por `npm run datos`, no editar a mano
  components/
    Header · Hero
    Camino               ← scrollytelling #2: "tu camino en el juego" (va 1º)
    Manager              ← la sección con los datos del juego
    LigasExplorer.tsx    ← la única isla React
    Alma                 ← scrollytelling #1: "el alma del manager" (va 3º)
    Juegos · Avisame · Footer
  layouts/Base.astro     ← título, Open Graph, favicon, datos estructurados
  pages/index.astro
scripts/                 ← extracción de datos, assets, capturas, pruebas
harness/                 ← monta los componentes del juego para fotografiarlos
assets-src/              ← los originales de Higgsfield (no se publican)
public/
  data/ligas/*.json      ← el detalle de cada liga, se pide bajo demanda
  assets/generated/      ← lo procesado y optimizado
  assets/screenshots/    ← las capturas del juego
```

---

## Agregar un juego nuevo

Se toca **un solo archivo**: `src/config/games.ts`. Se empuja un objeto a
`JUEGOS` y aparecen solos la card del hub, el enlace del footer y la entrada en
los datos estructurados de SEO.

```ts
{
  id: 'penales',
  nombre: 'Gambeta Penales',
  tagline: 'Cinco tiros y a llorar a la iglesia.',
  descripcion: '…',
  estado: 'coming-soon',      // o 'live'
  etiqueta: 'Próximamente',
  icono: '🥅',
  claves: ['…', '…', '…'],
  acento: 'dorado',           // cesped | dorado | hueso
  url: null,                  // o la URL si ya se juega
}
```

---

## ⚑ Conectar el juego (el link de "Jugar ahora")

**Hoy el Manager todavía no está publicado**, así que todos los botones de jugar
caen en el formulario de "avisame". El día que haya URL **no hay que tocar
código**: se define una variable de entorno en Vercel/Netlify y se reconstruye.

```
PUBLIC_URL_MANAGER=https://jugar.gambetagame.com
```

Con eso, el header, el hero, la card del hub, el footer y el JSON-LD pasan a
apuntar al juego y a decir "Jugar ahora" en vez de "Quiero jugar".
Está centralizado en `URL_MANAGER` y `CTA_JUGAR`, en `src/config/games.ts`.

Y para que el formulario de mails deje de guardar en el navegador y empiece a
mandar de verdad:

```
PUBLIC_FORM_ENDPOINT=https://formspree.io/f/xxxxxxx
```

Sirve cualquier servicio que acepte un POST con JSON.

---

## Los datos del juego

La sección Manager no tiene datos inventados: todo sale del catálogo real de
`cyberfoot-online`, que `scripts/extract-catalog.mjs` lee **sin escribir nada**
en esa carpeta.

El estado final de cada jugador no está en un solo archivo, así que el script
replica la cadena de migraciones en orden:

| Migración | Qué aporta |
|---|---|
| `0081_seed_catalogo_v17` | países, ligas, clubes y jugadores |
| `0110` | marca los clubes femeniles como excluidos |
| `0112` | los 10 clubes masculinos que le faltaban a la Liga MX |
| `0119`–`0122` | la fuerza y las habilidades definitivas |
| `0124` | los doce puestos finos y la pierna hábil |
| `0126` | el techo (potencial) |

Resultado: **81 ligas · 1.339 clubes · 37.160 futbolistas**, media mundial 64,6.

### ⚠ Los nombres están cambiados a propósito

En el sitio se lee *Prenier League*, *LaRiga*, *Arsenel*, *Erlinj Haaland*. **No
son erratas.** La cabecera del seed del juego lo dice:

> *"Nombres de club y de liga: reales con UNA letra cambiada. Nombres de jugador:
> generados a partir de nombres comunes de cada país. Ningún nombre real llega a
> esta base."*

Es una decisión de derechos del juego, y la web muestra exactamente lo que ve el
jugador. Los crudos con nombres reales (`scripts/raw/fifaindex`, de EA) **no se
publican**.

Para regenerar después de un cambio en el juego:

```bash
npm run datos
```

---

## Las capturas del juego

Son de la interfaz real: mismos componentes, mismo CSS, jugadores del mismo
catálogo.

**Por qué no son de una partida en curso:** sin sesión de Supabase la app corta
en el login (`App.jsx`: *"Sin sesión no se ve nada"*), y la migración 0081 borró
todas las salas. Crear una escribiría en la base de producción del juego. Así
que `harness/` monta las pantallas reales y `scripts/capturas.mjs` las
fotografía con Playwright, en escritorio y teléfono.

Se capturan **diecinueve pantallas**, en escritorio y teléfono:

| Grupo | Pantallas |
|---|---|
| El armado | `sala` · `editor` · `reparto` |
| El club | `escritorio` · `plantel` · `equipo` · `mercado` · `buscador` |
| La fecha | `partido` · `cancha-vivo` · `planilla` |
| Los paneles | `juveniles` · `tecnicos` · `estadio` · `tablas` · `agenda` |
| La selección | `seleccion-elegir` · `seleccion-armar` · `seleccion-plantel` |

Lo único armado a mano es el estado de la partida: los clubes, los jugadores,
sus fuerzas y sus nombres salen del catálogo, y la interfaz es la del juego.

Cinco cosas que costaron y conviene no volver a romper:

- **El store se carga antes de montar**, con `useGameSession.setState()`. Es el
  mismo camino de `scripts/test-render.mjs` del juego.
- **Se reemplazan algunas acciones del store** (`loadStandings`,
  `loadCompetitions`…). Los paneles no derivan nada de lo cargado: se lo piden a
  la base, y con el Supabase falso eso vuelve vacío.
- **Se dibuja una pantalla por vez**, elegida con `?p=`. Montarlas todas juntas
  crasheaba la pestaña: la fecha en vivo sola dibuja diez canchas animadas.
- **Cada pantalla puede pedir otro momento de la partida.** El lobby necesita
  la sala en `status: 'lobby'`; la de elegir selección, que todavía no tengas
  una. Lo resuelve `estadoPara()` en `harness/datos.js`.
- **El rótulo del harness queda FUERA de la captura.** `data-captura` va en el
  contenido, no en la sección: cuando el título entraba en la foto, la captura
  parecía una lámina de presentación en vez de una pantalla del juego.

Y dos trampas de datos que el propio juego documenta, y que hay que respetar:

- **Los convocados de la selección no cambian de club.** No salen de
  `room_team_id`: se cruzan `nationalSquad` (ids) contra `nationalPool`. Y hay
  que tapar `loadNationalDesk`, que al montar el escritorio los vuelve a pedir
  a la base y los borra.
- **`catalog` no es una lista de jugadores**, son las competiciones y los países
  (`{ competitions, countries, loaded }`). Pisarlo con otra forma revienta el
  mercado y el buscador.

```bash
npm run capturas
```

### ⛔ La carpeta del juego es de solo lectura

`C:\Users\Juan\cyberfoot-online` **no se toca nunca**. El harness la lee por el
alias `@` y manda la caché de Vite al temporal del sistema
(`vite.harness.config.mjs`), así que ni siquiera se reescribe
`node_modules/.vite`.

---

## Los assets generados con IA

Se generaron con el MCP de **Higgsfield**. Los originales quedan en
`assets-src/` (fuera de `public/`, para no desplegar 25 MB) y
`npm run assets` produce lo que se publica: WebP en dos anchos, LQIP, íconos y
la imagen de compartir.

| Archivo | Modelo | Prompt |
|---|---|---|
| `logo-b.svg` → `public/logo.svg` | `recraft_v4_1` (vector, 1k) | *Minimal flat vector monogram icon: the letter G built from a single continuous curved dribbling trajectory line that wraps around a small football at its centre. Geometric, thick strokes, deep green with a warm gold accent, on black. Icon only, no other text, no words, perfectly centered, premium sports brand mark.* |
| `bg-pizarra.png` | `z_image` (16:9) | *Cinematic football tactics board glowing in the dark, magnetic player markers and curved chalk arrows over a pitch diagram, deep moody shadows, emerald green and warm amber rim lighting, volumetric haze, premium video game key art, wide banner composition, ultra detailed, no text, no letters, no logos* |
| `bg-potrero.png` | `z_image` (16:9) | *Cinematic night football pitch in a Buenos Aires potrero, rusty chain link fence, single floodlight cutting through haze, wet worn grass, puddles reflecting amber light, deep green and gold palette, moody premium key art, atmospheric, empty, no people, no text, no letters* |
| `bg-estadio.png` | `z_image` (16:9) | *Empty football stadium at night seen from the touchline, towering floodlights blazing through fog, deep emerald pitch stripes, amber glow on empty stands, cinematic haze and lens flare, dark premium video game key art, no people, no text, no letters, no logos* |
| `bg-tablero.png` | `z_image` (16:9) | *Extreme close up of a coach tactical board, magnetic markers and hand drawn chalk arrows, shallow depth of field, dark charcoal background, emerald green and warm gold rim light, cinematic product photography, premium and moody, no text, no letters, no numbers* |
| `bg-mundial.png` | `z_image` (16:9) | *Cinematic wide shot of a packed football stadium at night during a world tournament final, thousands of tiny lights and flags of many nations blurred in the stands, confetti drifting through floodlight beams, deep emerald pitch below, warm gold and green colour grade, epic premium video game key art, moody and atmospheric, no readable text, no letters, no logos, no faces in focus* |
| `hero-1` … `hero-5` (los cinco clips del hero) | `seedance1_5` (4 s, 720p) y `kling3_0_turbo` (8 s, 1080p) para el nº 2 | El micro llegando al estadio bajo la lluvia · el partido de noche desde la tribuna · el entretiempo en el vestuario · el partido desde el césped · la vuelta olímpica con la copa. Los prompts completos están en el historial del proyecto; todos piden *documentary realism, natural human motion, no morphing, no readable text, no logos*. |

### ⚠ Los fondos de los scrollytelling son video, y el scroll los mueve

No son loops: el video **no se reproduce nunca**. `Camino.astro` le fija
`currentTime` en proporción a cuánto se bajó dentro del bloque, así que los
fotogramas acompañan la lectura. Tres cosas que hacen falta para que ande:

- **Encodeados con `-g 5`** (un keyframe cada cinco cuadros). Con el GOP por
  defecto, saltar a un punto cualquiera obliga a esperar al próximo keyframe y
  el fondo se ve a los tirones.
- **El video va en un `sticky` de un alto de pantalla**, no estirado al alto del
  bloque. Un bloque de diez etapas mide más de 10.000px: puesto a `h-full`,
  `object-cover` lo agranda unas doce veces y sólo se ve un pedazo borroso.
- **Sólo se cargan en pantallas grandes**, igual que el del hero, y el póster
  es un WebP chico. Con pósters en JPG de 87 KB la nota móvil se caía a 85.

### Teléfono: tres cosas que estaban mal y cómo quedaron

- **El hero no tenía video.** Estaba desactivado por debajo de 1024px "por
  rendimiento". Ahora sí carga, pero un juego de clips aparte a 720px de ancho
  y más compresión: **1,1 MB los cinco** contra 3,0 MB los grandes. Se saltea
  igual con `prefers-reduced-motion`, `saveData`, 2G o 3G.
- **Y el velo del hero es distinto en cada tamaño.** En escritorio va de
  izquierda a derecha, porque el texto vive en la mitad izquierda. Ese mismo
  velo en un teléfono —donde el texto ocupa todo el ancho— oscurecía la pantalla
  entera y el video casi no se veía. En teléfono es un manto parejo más suave,
  con el peso abajo, y el video sube de 45% a 60% de opacidad.
- **Las capturas del scrollytelling salían recortadas.** Dos versiones malas
  antes de la buena: primero se fotografiaba el juego a 420px, y a ese ancho sus
  paneles recortan sus propias tablas —la captura ya venía cortada—; después se
  usó la de escritorio alta y deslizable de costado, que se leía pero se veía
  siempre por la mitad y con un alto distinto en cada etapa. Ahora van
  `object-contain` en un marco de proporción fija: **chicas, pero enteras y
  todas iguales**. Chica y completa le gana a grande y cortada.
- **La tabla de ligas se cortaba de costado.** Tenía `min-w-[36rem]` (576px) en
  un contenedor de 348px. Se sacó el mínimo y las columnas se escalonaron:

  | | Desde |
  |---|---|
  | # · Club · Once | siempre |
  | + Plantel | `sm` (640px) |
  | + Jugadores | `md` (768px) |
  | + Estadio | `lg` (1024px) |

  ⚠ Los cortes van **holgados** a propósito. Un primer intento usaba un
  breakpoint propio de 416px para "Plantel", y en los teléfonos grandes —un Pro
  Max mide 430px— la columna entraba justo y quedaba partida al medio.

- **Aparecían hipervínculos que nadie puso.** En la tabla, los nombres de club y
  las ciudades se veían como enlaces azules. No hay ni un `<a>` en ese
  componente: los inventa Safari en iOS, que autodetecta lo que parece una
  dirección y lo linkea a mapas. Lo apaga la meta `format-detection` en
  `Base.astro`.

⚠ **Y el bug de fondo, que no se veía como tal:** el `<ol>` de las etapas es un
item de grilla, y un item de grilla tiene `min-width: auto` — se niega a
encogerse por debajo del ancho de su contenido. Con la captura de escritorio
adentro pasaba a medir 976px en una pantalla de 390 y **el documento entero se
iba a 1.700px**, con todo el texto cortado a la derecha. No se notaba como
scroll horizontal porque `body` tiene `overflow-x: hidden`; se notaba como
texto comido. Lo arregla un `min-w-0`.

### El hero son cinco clips en secuencia

Cuentan un partido de punta a punta: **micro → partido → vestuario → partido →
copa**, y vuelve a empezar. Dos detalles que lo sostienen:

- **Dos capas de video que se turnan.** Mientras una se ve, la otra ya cargó el
  clip siguiente; cuando la primera está por terminar, se funden. Con un solo
  elemento cada cambio sería un parpadeo a negro.
- **Se cargan de a uno.** Los cinco juntos son casi tres megas; así el visitante
  baja 640 KB y el resto llega mientras mira.

⚠ **El `<link rel="preload">` del layout tiene que apuntar al mismo archivo que
el `<img>` del hero.** Cuando el fondo cambió y el preload quedó apuntando al
anterior, el navegador precargaba una imagen que no usaba y no precargaba la que
sí: el LCP móvil pasó de 3,0 a 3,8 s y la nota cayó de 93 a 88.

### ⚠ Lo que hay que pedirle a un modelo de video, y lo que no

El primer intento le pedía a `seedance1_5` que **moviera las figuritas** ("the
tiny player figures shift and rotate into new positions"). Salió mal: a los tres
segundos los jugadores quedaban grises y planos, y las flechas de tiza se
convertían en manchas oscuras pegadas a sus pies.

La corrección fue pedir lo contrario —*"the figurines stay completely still,
like static painted models"*— y dejar en movimiento sólo la cámara, la neblina y
la luz. Se probaron cuatro candidatos:

| Modelo | Duración | Resultado |
|---|---|---|
| `seedance1_5` | 4 s | Correcto pero corto |
| `seedance1_5` | 8 s | ✗ Se acerca demasiado e inventa una columna de humo |
| `cinematic_studio_3_0` | 8 s | ✗ Zoom excesivo, las figuras se ablandan |
| **`kling3_0_turbo`** | **10 s** | **✓ Elegido.** Se abre y muestra la pizarra entera, las figuras quedan nítidas |

También se generó una segunda opción de logo (`logo-a.svg`, pelota cruzada por
una flecha) que se descartó: se leía genérica y no funcionaba en chico.

**Dos detalles del procesado**, en `scripts/optimize-assets.mjs`:

1. Recraft devuelve el logo sobre un rectángulo negro y con los contornos de la
   G como formas negras encima, no como agujeros. Se recorta con una **máscara
   SVG** en vez de reescribir los `path`, que es donde se rompen los logos.
2. La imagen de compartir usa **Impact** y no Anton: el renderizador de SVG de
   sharp usa fuentes del sistema, no las del proyecto. Impact es el pariente más
   cercano y está en todas las máquinas.

Los videos salieron de 6,5 MB y se reencodean a ~500 KB con ffmpeg (H.264 + VP9
+ póster JPG). El comando está en el historial del proyecto; si hay que
rehacerlo:

```bash
ffmpeg -i assets-src/video-pizarra.mp4 -an -vf "scale=1280:-2" \
  -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart \
  public/assets/generated/video-pizarra-web.mp4
```

---

## Rendimiento

Lighthouse sobre el build de producción (`npm run build && npm run preview`,
después `node scripts/lighthouse.mjs http://localhost:4400`):

| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Escritorio | **99** | **100** | **100** | **100** |
| Teléfono | **91** | **100** | **100** | **100** |

Cuatro decisiones que sostienen esos números, y que conviene no deshacer sin medir:

- **Las capturas del juego van en WebP, no en PNG.** En PNG las dieciocho
  sumaban 2,3 MB y la nota móvil se caía a 78; en WebP son 880 KB y vuelve a 91.

- **En teléfono no se carga el video.** Ni las etiquetas `<source>` están en el
  HTML: las agrega el script del hero, y sólo en pantallas grandes, sin
  `prefers-reduced-motion` y sin ahorro de datos. El fondo es un WebP de 31 KB.
  Esto solo bajó el peso móvil de 1.137 KB a 537 KB.
- **El CSS va incrustado** (`inlineStylesheets: 'always'`). El LCP de la página
  es un bloque de texto, así que lo único que lo demora es el CSS que bloquea el
  render; un `<link>` cuesta un viaje entero de red en 4G.
- **El detalle de las 81 ligas no viaja en el HTML.** Sólo la primera viene
  precargada; las demás se piden a `/data/ligas/<slug>.json` cuando alguien las
  abre.

---

## Deploy

El sitio es estático. Sirve cualquier hosting; hay config para los dos más
comunes.

### Vercel

1. Importar el repositorio.
2. Framework: **Astro** (lo detecta solo). Build `npm run build`, salida `dist`.
3. Variables de entorno: `PUBLIC_URL_MANAGER` y `PUBLIC_FORM_ENDPOINT` cuando
   existan.
4. Dominio: agregar `gambetagame.com` y `www.gambetagame.com` en *Settings →
   Domains*, y apuntar el DNS a Vercel.

`vercel.json` ya trae el cacheo y las cabeceras de seguridad. Qué cachea cada
regla, que en el archivo no se puede explicar porque **JSON no admite
comentarios** —y Vercel rechaza el deploy si le agregás una clave `comment`,
con `Invalid request: headers[0] should NOT have additional property 'comment'`:

| Ruta | Cache-Control | Por qué |
|---|---|---|
| `/_astro/*` | 1 año, `immutable` | Llevan hash en el nombre: si cambia el contenido, cambia la URL |
| `/assets/*` | 1 año, revalidando | Imágenes, videos y capturas; se reemplazan de vez en cuando |
| `/data/*` | 1 hora, revalidando | El detalle de cada liga cambia sólo al regenerar el catálogo |
| `/*` | — | Sólo cabeceras de seguridad (`nosniff`, `Referrer-Policy`, `X-Frame-Options`) |

`netlify.toml` hace lo mismo, y ahí sí los comentarios están escritos en el
archivo porque TOML los acepta.

### Netlify

Igual, con `netlify.toml`. Build `npm run build`, publish `dist`.

### Después de publicar

- Verificar que `https://gambetagame.com/sitemap-index.xml` responde.
- Cargar el dominio en Google Search Console y mandar el sitemap.
- Probar cómo se ve el link compartido (la imagen es
  `/assets/generated/og.jpg`, 1200×630).

---

## Notas

- El sitio es oscuro siempre, a propósito: no hay modo claro.
- `prefers-reduced-motion` apaga los dos scrollytelling y el video. Los textos
  quedan uno abajo del otro y se lee igual.
- El explorador de ligas es la única parte que necesita JavaScript. Sin JS, la
  Prenier League igual se ve completa porque viene renderizada en el HTML.
