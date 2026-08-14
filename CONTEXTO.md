# CONTEXTO — Gambeta web

> Traspaso para una ventana nueva. Si venís de cero, **leé este archivo entero
> antes de tocar nada**. El README explica *cómo* funciona el proyecto; esto
> explica *por qué* está como está, y qué ya se probó y no funcionó.
>
> Última actualización: 14 de agosto de 2026.

---

## 1. Qué es esto en una línea

La landing y hub de **Gambeta** (gambetagame.com), la marca que agrupa los
juegos de fútbol de Juan. Vive en `C:\Users\Juan\gambeta-web`, es un sitio
estático de Astro, y ya está en GitHub (`colo17/gambetaweb`) y desplegándose en
Vercel.

El dueño del proyecto es **Juan** (usuario `colo17`). Habla en español
rioplatense y el sitio entero está escrito así.

---

## 2. ⛔ LA REGLA QUE NO SE ROMPE

**`C:\Users\Juan\cyberfoot-online` es SOLO LECTURA.**

Es el repo del juego (Gambeta Manager Game) y **hay otra ventana de Claude Code
trabajando ahí al mismo tiempo**. Cualquier escritura pisa el trabajo de esa
sesión.

- Se puede **leer** todo lo que haga falta.
- Se puede **ejecutar** para mirar cosas.
- **No** se crea, modifica, borra, renombra ni mueve nada.
- **No** se corre `git add/commit/checkout/pull/stash`, ni `npm install`, ni
  builds, ni linters adentro de esa carpeta.

Cómo se cumple hoy:

- `scripts/extract-catalog.mjs` la abre con `readFileSync` y nada más.
- `vite.harness.config.mjs` la lee por el alias `@` y manda la caché de Vite al
  temporal del sistema, así que **ni siquiera reescribe `node_modules/.vite`**.

⚠ Si ves cambios en `git status` de esa carpeta, **son de la otra sesión**. No
son tuyos y no hay que tocarlos.

---

## 3. Estado actual

Todo verde y desplegable:

| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Escritorio | 99 | 100 | 100 | 100 |
| Teléfono | 92 | 100 | 100 | 100 |

- `npm run probar` → 19 de 19 verificaciones funcionales.
- `npm run revisar` → sin desbordes, sin imágenes rotas, un solo `h1`.
- `npm run build` → sin errores.
- Último commit: `f84ab5f`, rama `main`, sincronizado con el remoto.

---

## 4. Lo que falta / lo que sigue

1. **Conectar el juego.** Cuando el Manager esté publicado, definir en Vercel:

   ```
   PUBLIC_URL_MANAGER=https://…
   ```

   Con eso todos los CTA del sitio pasan de "Quiero jugar" (que lleva al
   formulario) a "Jugar ahora" (que lleva al juego). **No hay que tocar código**:
   está centralizado en `URL_MANAGER` y `CTA_JUGAR`, en `src/config/games.ts`.

2. **Conectar el formulario de mails.** Hoy guarda en `localStorage`. Para que
   mande de verdad:

   ```
   PUBLIC_FORM_ENDPOINT=https://formspree.io/f/xxxxxxx
   ```

3. **El dominio.** En Vercel → *Settings → Domains*, agregar `gambetagame.com` y
   `www.gambetagame.com`, y apuntar el DNS.

4. **Regenerar datos cuando el juego cambie.** `npm run datos` relee el catálogo.
   Ojo: la otra sesión sumó la migración `0128_each_club_carries_its_strength`
   después de la última extracción, así que **las medias pueden haber cambiado**.

5. **Pantallas del juego que quedaron sin capturar**: el recap de fin de
   temporada (no existe como pantalla propia) y el Mundial jugándose (pide
   simular un torneo entero en el harness). Hoy las cubre arte, marcado como tal.

---

## 5. Cómo está armado

```
src/
  config/games.ts        ← EL CATÁLOGO DE JUEGOS. Se agrega un juego acá y nada más.
  data/*.json            ← generados por `npm run datos`. NO editar a mano.
  components/
    Header · Hero        ← el hero son 5 clips de video en secuencia
    Camino               ← scrollytelling: 10 etapas del club + 4 de la selección
    Recorrido.astro      ← el componente que dibuja UN recorrido (se usa 2 veces)
    Manager              ← la sección con los datos reales del catálogo
    LigasExplorer.tsx    ← la ÚNICA isla React
    Alma                 ← scrollytelling con la pizarra que cambia de formación
    Juegos · Avisame · Footer
  layouts/Base.astro     ← SEO, Open Graph, favicon, datos estructurados
  pages/index.astro      ← el orden de las secciones
scripts/                 ← extracción, assets, capturas y pruebas
harness/                 ← monta las pantallas del juego para fotografiarlas
assets-src/              ← originales de Higgsfield (se versionan, ~33 MB)
```

### Los comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (4321) |
| `npm run build` | Build a `dist/` |
| `npm run datos` | Regenera los JSON del catálogo desde el repo del juego |
| `npm run assets` | Reprocesa logo, fondos, íconos y la imagen de compartir |
| `npm run capturas` | Vuelve a fotografiar las 19 pantallas del juego |
| `npm run harness` | Levanta sólo el harness, para mirarlo a ojo |
| `npm run probar` | 19 verificaciones funcionales |
| `npm run revisar` | Revisión visual + chequeos de desborde y alt |
| `node scripts/lighthouse.mjs <url>` | Las cuatro notas |

⚠ `probar`, `revisar` y `lighthouse` piden un servidor levantado y aceptan la
URL como argumento. **Medí siempre contra `astro preview`, no contra `dev`**: en
desarrollo Vite no minifica y la nota de rendimiento no significa nada.

---

## 6. Los datos del juego

La sección Manager no tiene un solo dato inventado. Sale del catálogo real, y
`scripts/extract-catalog.mjs` **replica la cadena de migraciones en orden**,
porque el estado final de un jugador no está en un solo archivo:

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

El sitio dice *Prenier League*, *LaRiga*, *Arsenel*, *Erlinj Haaland*. **No son
erratas y no hay que "arreglarlas".** La cabecera del seed del juego lo dice:

> *"Nombres de club y de liga: reales con UNA letra cambiada. Nombres de
> jugador: generados a partir de nombres comunes de cada país. Ningún nombre
> real llega a esta base."*

Es una decisión de derechos del juego. Los crudos con nombres reales
(`scripts/raw/fifaindex`, que son de EA) **no se publican nunca**.

### Trampas del extractor, ya resueltas

- **La migración 0124 trae dos clases de bloque intercalados** (puestos y
  habilidades). Asignar a ciegas pisaba `position` con `undefined`.
- **`is_star` / `is_world_class` del seed quedaron desfasados** tras la
  recalibración. Se recalculan desde la fuerza final con el umbral del juego
  (≥84 estrella, ≥91 crack). Nadie llega a 91, así que "cracks" da 0 y por eso
  no se muestra.

---

## 7. Las capturas del juego

Son **19 pantallas reales**: sala, editor, reparto, escritorio, plantel, equipo,
mercado, buscador, partido, cancha-vivo, planilla, juveniles, técnicos, estadio,
tablas, agenda y las tres de selección.

**Por qué no son de una partida en curso:** sin sesión de Supabase la app corta
en el login (`App.jsx`: *"Sin sesión no se ve nada"*) y la migración 0081 borró
todas las salas. Crear una escribiría en la base de producción del juego.

Entonces `harness/` monta las pantallas reales con datos del catálogo y
`scripts/capturas.mjs` las fotografía con Playwright. Lo único inventado es el
estado de la partida; la interfaz es la del juego.

### ⚠ Cinco cosas que costaron y no hay que volver a romper

1. **El store se carga ANTES de montar**, con `useGameSession.setState()`.
2. **Se pisan algunas acciones del store** (`loadStandings`, `loadCompetitions`…).
   Los paneles no derivan nada de lo cargado: se lo piden a la base, y con el
   Supabase falso eso vuelve vacío.
3. **Se dibuja una pantalla por vez**, elegida con `?p=`. Montarlas todas juntas
   **crasheaba la pestaña** (la fecha en vivo sola dibuja diez canchas animadas).
4. **Cada pantalla puede pedir otro momento de la partida** (`estadoPara()` en
   `harness/datos.js`): el lobby necesita `status: 'lobby'`, la de elegir
   selección que todavía no tengas una.
5. **El rótulo del harness queda FUERA de la captura** (`data-captura` va en el
   contenido, no en la sección). Cuando entraba, la captura parecía una lámina
   de presentación en vez de una pantalla del juego.

### Y tres trampas de datos que el propio juego documenta

- **Los convocados de la selección no cambian de club.** No salen de
  `room_team_id`: se cruzan `nationalSquad` (ids) contra `nationalPool`. Y hay
  que tapar `loadNationalDesk`, que al montar el escritorio los vuelve a pedir a
  la base y los borra.
- **`catalog` no es una lista de jugadores**, son las competiciones y los países
  (`{ competitions, countries, loaded }`). Pisarlo con otra forma revienta el
  mercado y el buscador.
- **`Pitch` espera un objeto plano** (`playersById[id]`) y **`MiniPitch` un Map**
  (`playerById.get(id)`). Pasarle un Map a `Pitch` deja los once casilleros
  vacíos **sin tirar ningún error**.

---

## 8. ⚠ Lo que YA SE PROBÓ Y NO FUNCIONÓ

Esta es la sección más útil del archivo. No repitas estos caminos.

### El fondo del scrollytelling — cuatro intentos fallidos

Hoy **no lleva fondo**: carbón liso, igual que Manager y Juegos. Antes:

1. **Una foto estirada al alto del bloque.** Con diez etapas el bloque mide más
   de 10.000px: salía deformada a lo largo.
2. **Un video con los fotogramas atados al scroll.** Dejó de deformarse, pero se
   veía tosco: una foto oscura y ruidosa atenuada da manchones, no atmósfera.
3. **Un fondo dibujado, por recorrido.** Dos costuras: vivía dentro de
   `.contenedor` (1.280px) y dejaba franjas oscuras a los costados, y cada
   bloque traía su degradé vertical pegado a la ventana, que al pasar de un
   recorrido al otro daba un corte horizontal duro.
4. **Una sola capa a sangre con líneas de cal en SVG.** Sin costuras, pero las
   líneas recortadas se leían como rayas sueltas, no como una cancha.

**Reglas que salen de ahí:** el fondo nunca va dentro de `.contenedor`, y nada
de degradés verticales pegados a la ventana.

### El video del hero

- **Primer intento:** se le pidió al modelo que **moviera las figuritas** de una
  pizarra en miniatura. A los tres segundos quedaban grises y planas, y las
  flechas de tiza se volvían manchas. La corrección fue pedir lo contrario:
  *"the figurines stay completely still"*.
- **Después el dueño lo bajó igual:** *"se ve muy raro, es como una cancha que
  gira y los jugadores ni se mueven"*. Ahora son cinco clips fotorrealistas.
- **Se probaron y descartaron:** `seedance1_5` a 8s (se acerca demasiado e
  inventa humo) y `cinematic_studio_3_0` a 8s (zoom excesivo, figuras blandas).
  El que sirvió para el diorama fue `kling3_0_turbo`.

### Las capturas en el teléfono

1. **Fotografiar el juego a 420px.** A ese ancho **los paneles del juego
   recortan sus propias tablas**: la captura ya venía cortada.
2. **La captura de escritorio, alta y deslizable de costado.** Se leía, pero se
   veía siempre por la mitad y con un alto distinto en cada etapa.
3. **La que quedó:** `object-contain` en un marco de proporción fija. Chicas,
   pero enteras y todas iguales. *Chica y completa le gana a grande y cortada.*

---

## 9. Bugs encontrados que valen la pena recordar

Todos reales, todos arreglados, y todos del tipo que vuelve si alguien toca sin
saber:

- **`_jsxDEV is not a function`** — la isla de ligas hidrataba, reventaba y
  React la desmontaba entera: parecía que la tabla "desaparecía". Causa: dos
  versiones de `@vitejs/plugin-react` (Astro trae la 5.2; se había instalado la
  6 para el harness). **Mantener alineada la versión.**
- **`min-width: auto` en un item de grilla** — el `<ol>` de las etapas se negaba
  a encogerse por debajo del ancho de la captura que tenía adentro: pasaba a
  medir 976px en una pantalla de 390 y **el documento se iba a 1.700px**. No se
  veía como scroll horizontal (por el `overflow-x: hidden` del body) sino como
  **texto comido a la derecha**. Lo arregla un `min-w-0`.
- **El `<link rel="preload">` desalineado** — cuando cambió el fondo del hero y
  el preload quedó apuntando al archivo anterior, el navegador precargaba una
  imagen que no usaba y no precargaba la que sí: **el LCP móvil pasó de 3,0 a
  3,8 s**. Tiene que apuntar siempre al mismo archivo que el `<img>` del hero.
- **Dos elementos con `id="manager"`** — la sección y la card del hub. El enlace
  del menú caía en la card.
- **Claves `comment` en `vercel.json`** — JSON no admite comentarios y Vercel
  valida contra un esquema estricto: rechazaba el deploy entero.
- **Los "hipervínculos" de la tabla no son del sitio** — no hay ni un `<a>` en
  el explorador. Los agrega **Safari en iOS**, que autodetecta lo que parece una
  dirección (las ciudades: Londres, Manchester) y la linkea a mapas. Lo apaga la
  meta `format-detection` en `Base.astro`.
- **Las capturas en PNG** costaban 2,3 MB y tiraban la nota móvil de 91 a 78.
  En WebP son 660 KB. **No volver a PNG.**

---

## 10. Decisiones de rendimiento que no hay que deshacer sin medir

- **El video del hero se carga de a un clip.** Los cinco juntos son casi 3 MB.
- **Hay dos juegos de clips**: los de teléfono son los mismos a 720px y más
  compresión (1,1 MB los cinco contra 3,0).
- **El velo del hero es distinto en cada tamaño.** En escritorio va de izquierda
  a derecha (el texto vive a la izquierda); en teléfono ese mismo velo
  oscurecía la pantalla entera y el video casi no se veía.
- **El CSS va incrustado** (`inlineStylesheets: 'always'`). El LCP de la página
  es un bloque de texto, así que lo único que lo demora es el CSS que bloquea el
  render.
- **El detalle de las 81 ligas no viaja en el HTML.** Sólo la primera viene
  precargada; las demás se piden a `/data/ligas/<slug>.json`.
- **A la isla se le pasan sólo 4 campos por liga.** Las props de un componente
  con `client:*` viajan **dos veces** (HTML + JSON de hidratación).

---

## 11. La tabla de ligas en el teléfono

Las columnas se escalonan, y **los cortes van holgados a propósito**:

| | Desde |
|---|---|
| # · Club · Once | siempre |
| + Plantel | `sm` (640px) |
| + Jugadores | `md` (768px) |
| + Estadio | `lg` (1024px) |

Un primer intento usaba un breakpoint propio de 416px para "Plantel", y en los
teléfonos grandes —un Pro Max mide 430px— la columna entraba justo y quedaba
partida al medio.

⚠ **Cada columna numérica lleva su propio `pr`**, no sólo la última: cuál es la
última cambia con el ancho, y sin padding el número toca el borde y se ve
cortado.

---

## 12. Cómo trabaja el dueño

Cosas que aprendí de Juan en esta sesión y que conviene respetar:

- **Mira el sitio en su teléfono** y ahí encuentra la mitad de los problemas.
  Cuando dice "SOLO MOBILE", es literal: no toques el escritorio.
- **Prefiere que le propongas** antes que preguntarle. Cuando pidió "¿qué
  podemos hacer?" con el fondo, lo que sirvió fue una recomendación con
  fundamento, no una lista de opciones.
- **Le importa el gasto en Higgsfield.** Pedir siempre las opciones baratas
  (`seedance1_5` a 4s/720p = 4,8 créditos; `kling3_0_turbo` a 8s/720p = 12) y
  avisar cuánto se gastó. Van ~120 créditos usados de 1.050.
- **Si algo se ve raro tres veces, hay que cambiar de enfoque**, no seguir
  ajustando. Con el fondo del scrollytelling la respuesta correcta terminó
  siendo sacarlo.

---

## 13. Antes de dar algo por terminado

```bash
npm run build
npx astro preview --port 4400
node scripts/probar.mjs   http://localhost:4400   # 19 funcionales
node scripts/revisar.mjs  http://localhost:4400   # visual + desbordes
node scripts/lighthouse.mjs http://localhost:4400 # las cuatro notas
```

Y si tocaste algo que se ve en el teléfono, **miralo a 390 y a 430px**. La
mayoría de los problemas de esta sesión aparecieron sólo ahí.
