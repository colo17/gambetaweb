# CONTEXTO — Gambeta web

> Traspaso para una ventana nueva. Si venís de cero, **leé este archivo entero
> antes de tocar nada**. El README explica *cómo* funciona el proyecto; esto
> explica *por qué* está como está, y qué ya se probó y no funcionó.
>
> Última actualización: 20 de agosto de 2026.

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

**El sitio son SEIS páginas desde el 20 de agosto de 2026.** Antes era una sola
y el dueño la bajó por larga. Cada una tiene un trabajo:

| Ruta | Qué hay |
|---|---|
| `/` | El hero, el hub con los tres juegos, y una presentación corta por juego con su scrollytelling |
| `/gambeta` | El mundo: las 81 ligas, los planteles, las figuras, y el formulario de "sumá tu equipo" |
| `/manager` | Todo el Manager: modos, el recorrido completo (10+4 etapas) y el alma |
| `/player` · `/test` | Video de fondo y "muy pronto" |
| `/perfil` | Login contra la base del juego y la carrera del entrenador |

Todo verde y desplegable:

| Página | Teléfono | Escritorio |
|---|---|---|
| `/` | 98 | 100 |
| `/gambeta` | 98 | 100 |
| `/manager` | 98 | 100 |
| `/player` · `/test` | 99 | 99 |
| `/perfil` | 99 | 100 |

Accesibilidad, buenas prácticas y SEO: **100 en las seis**.

- `npm run probar` → 64 de 64 verificaciones funcionales, sobre las seis páginas.
- `npm run revisar` → sin desbordes, sin imágenes rotas, un solo `h1` por página,
  sin ids repetidos. Mira cada página a 1440, 390 y **430px**.
- `npm run build` → sin errores.
- Rama `main`.

---

## 4. Lo que falta / lo que sigue

1. **Conectar el juego.** Cuando el Manager esté publicado, definir en Vercel:

   ```
   PUBLIC_URL_MANAGER=https://…
   ```

   Con eso todos los CTA del sitio pasan de "Quiero jugar" (que lleva al
   formulario) a "Jugar ahora" (que lleva al juego). **No hay que tocar código**:
   está centralizado en `URL_MANAGER` y `CTA_JUGAR`, en `src/config/games.ts`.

2. **Conectar los formularios.** Son dos —"avisame cuando salga" y "sumá tu
   equipo"— y los dos guardan hoy en `localStorage`. Para que manden de verdad:

   ```
   PUBLIC_FORM_ENDPOINT=https://formspree.io/f/xxxxxxx
   ```

   Pegan al mismo endpoint y se distinguen por el campo `origen` del cuerpo.

2b. **Prender las cuentas (`/perfil`).** ⚠ **Esto es lo único que falta para que
   la página de perfil funcione**, y no hay código que tocar:

   ```
   PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJhbGci…
   ```

   Son los mismos dos valores que usa el juego. La clave *anon* es pública por
   diseño (viaja en el bundle del juego igual); **la de servicio no va acá ni en
   ningún lado de este repo.** Mientras falten, la página muestra un cartel que
   dice que las cuentas abren con el juego y el paquete de Supabase ni se baja.

3. **El dominio.** En Vercel → *Settings → Domains*, agregar `gambetagame.com` y
   `www.gambetagame.com`, y apuntar el DNS.

4. **Regenerar datos cuando el juego cambie.** `npm run datos` relee el catálogo.
   Al 20 de agosto está al día hasta la migración **0155** del juego (ver §6).

5. **Pantallas del juego que quedaron sin capturar**: el recap de fin de
   temporada (no existe como pantalla propia) y el Mundial jugándose (pide
   simular un torneo entero en el harness). Hoy las cubre arte, marcado como tal.

---

## 5. Cómo está armado

```
src/
  config/
    games.ts             ← EL CATÁLOGO DE JUEGOS. Se agrega un juego acá.
    presentaciones.ts    ← el scrollytelling de portada de cada juego
    recorrido.ts         ← la forma de una etapa (vive suelta porque de un
                            .astro no se puede importar un tipo)
    puestos.ts           ← vocabulario de puestos, copiado de src/game del juego
  lib/cuenta.ts          ← cliente de Supabase + tipos del perfil
  data/*.json            ← generados por `npm run datos`. NO editar a mano.
  components/
    Cuenta.astro         ← el control de sesión del header (entrar / tu nombre)
    Simbolos.astro       ← iconitos de fútbol flotando en los márgenes
    Header · Hero        ← el hero son 5 clips de video en secuencia
    Escenario.astro      ← EL scrollytelling. Se usa 6 veces (3 en la portada,
                            3 en /manager) y trae su propio script.
    PresentacionJuego    ← un juego en la portada · MundoGambeta ← la banda
    Camino               ← las 10+4 etapas del Manager
    Alma                 ← los cuatro momentos, con UNA pizarra clavada
    Pizarra.astro        ← la cancha; las fichas viajan entre formaciones
    ManagerIntro · MundoLigas · MundoFiguras
    LigasExplorer.tsx    ← isla: las 81 ligas
    PlantelExplorer.tsx  ← isla: planteles y buscador de futbolistas
    Perfil.tsx           ← isla: login y carrera del entrenador
    ProntoHero           ← la portada de un juego que no salió
    Juegos · Avisame · SumaTuEquipo · Footer
  layouts/Base.astro     ← SEO, Open Graph, favicon, datos estructurados
  pages/                 ← index · gambeta · manager · player · test · perfil · 404
scripts/                 ← extracción, assets, capturas y pruebas
harness/                 ← monta las pantallas del juego para fotografiarlas
assets-src/              ← originales de Higgsfield (se versionan, ~60 MB)
public/data/planteles/   ← 81 archivos, el plantel de cada club por liga
```

### ⚑ EL CONTROL DE CUENTA DEL HEADER LEE LA SESIÓN A MANO

`Cuenta.astro` muestra "Entrar" o —si hay sesión— tu nombre con un menú abajo
que tiene "Mi perfil" y "Salir". Vive en el header, o sea **en las seis
páginas**.

⚠ **Y POR ESO NO USA EL CLIENTE DE SUPABASE PARA SABER SI HAY ALGUIEN.** Cargarlo
en todas las páginas para preguntar "¿hay sesión?" serían ~40 KB de JavaScript
en cada visita, incluida la de quien nunca se registró. En su lugar lee del
navegador la entrada que Supabase ya dejó guardada (`CLAVE_SESION`, exportada de
`lib/cuenta.ts` justo para eso): instantáneo, sin red y sin descargar nada.

**El paquete se baja sólo al apretar "Salir"**, que es lo único que necesita
hablar con el servidor de verdad — borrar la entrada a mano dejaría el token
vivo del otro lado.

⚠ Ese formato es interno de Supabase, así que se lee con `try`: si algún día
cambia, lo peor que pasa es que muestre "Entrar". Y se mira `expires_at`, porque
sin eso una sesión vieja seguía mostrando el nombre de alguien que ya estaba
afuera.

⚠ **En el teléfono no va en la barra.** Con el logo, el CTA y la hamburguesa, un
botón más a 390px empuja todo: ahí el control va al final del menú desplegable.

### ⚑ LOS SÍMBOLOS DE FONDO, Y EL INTENTO QUE NO FUE

`Simbolos.astro` apoya iconitos de fútbol dibujados a línea —pelota, botín,
pizarra, cono, banderín, cronómetro, trofeo, guante, camiseta— en los **márgenes** de
una sección, en verde y al 18% de opacidad, flotando apenas. La referencia la
dio el dueño: es lo que hace nexora-media.com con el `</>` y la paleta.

⚠ **NO TOCAN EL FONDO, Y ESA ES LA DIFERENCIA.** Antes de esto se probó pintar
el fondo entero —manchas de color derivando y una trama de cancha— y el dueño lo
bajó al verlo: *"no me gustó como quedaron los efectos, dejalo como antes"*. Es
el quinto intento de darle fondo a este sitio y el quinto que se saca. **El
carbón liso es la identidad, no una carencia**; lo que sí funciona es apoyarle
símbolos encima.

Cómo se usa: la sección tiene que ser `relative` y el componente va como primer
hijo, con una `semilla` distinta para que dos secciones seguidas no muestren los
mismos dibujos en los mismos huecos.

⚠ **VIVEN EN LOS MÁRGENES, NUNCA ATRÁS DEL TEXTO.** Al 18% igual ensucian si
caen sobre un párrafo. Y en el teléfono no hay margen lateral: de los ocho
quedan dos, reubicados a los bordes por CSS.

⚠ **`hidden lg:block` NO SIRVE ACÁ.** Astro acota el `<style>` del componente
con un atributo propio, y eso lo vuelve más específico que una clase suelta de
Tailwind: `.simbolo[data-astro-cid-…]` le gana a `.hidden` y los ocho aparecían
igual en el teléfono. La visibilidad se resuelve dentro del propio componente.

### ⚑ HAY UN SOLO SCROLLYTELLING: `Escenario`

Se usa **cinco veces**: tres en la portada (una por juego) y dos en `/manager`
(el club y la selección). Funciona así:

- **Scrollean las imágenes**, en la columna derecha.
- **Queda fijo un panel de texto** a la izquierda, que se reescribe con la
  etapa: número, título y párrafo.
- **Atrás, una ilustración a sangre** que hace crossfade con cada etapa.
- **Sin GSAP**: la cuenta —el paso activo es el que cruza la mitad de la
  pantalla— entra en veinte líneas.

Está calcado del de `terrasol-web` (`site/assets/js/app.js`, buscar
`data-scrolly`), que es lo que pidió el dueño el 20 de agosto: *"quiero que sean
diferentes… como el que hicimos para terrasol-web"*.

⚠ **HUBO UN SEGUNDO COMPONENTE Y SE BORRÓ.** `Recorrido.astro` hacía lo inverso
—scrolleaba el texto y clavaba la imagen— y era el de `/manager`. Se dejaron los
dos conviviendo un rato y el dueño, al verlos uno al lado del otro, pidió
unificar: *"cambiá los del manager para que sean como estos, que la verdad
quedaron mucho mejor"*. **No lo resucites**: si aparece la necesidad de un
scrollytelling distinto, que sea una variante de `Escenario`.

⚠ **YA NO SE USA GSAP EN NINGUNA PÁGINA.** `Alma` era el último que lo cargaba y
pasó a `Escenario` el 20 de agosto. Sacarlo de la portada le subió la nota móvil
de 98 a 99. Si algo pide una animación de scroll, fijate primero si `Escenario`
no lo resuelve.

### ⚑ EL MODO "ALGO CLAVADO" DEL ESCENARIO

`Escenario` tiene un slot `fijo`. Con el slot puesto, la columna derecha deja de
hacer pasar imágenes y muestra **una sola cosa, clavada**, mientras los pasos se
vuelven altura —lo único que le da recorrido al scroll—. Lo usa el bloque del
alma con la pizarra.

Quien va en el slot se entera de la etapa por el atributo
`data-escenario-activo` que el escenario escribe en el bloque. **Una sola cuenta
de "qué etapa manda", en un solo lugar**: la pieza clavada no mira el scroll.

⚠ **En el teléfono el envoltorio del slot desaparece** (`display: contents`), y
hace falta: un `sticky` se agarra de su padre, y dentro de un envoltorio que
mide lo mismo que él no se pega a nada y se va de pantalla al primer scroll.

⚠ **Y ahí va opaco y a todo el ancho.** Queda clavado arriba con los textos
pasándole por debajo: con fondo traslúcido se leían las dos cosas superpuestas,
y angosto el texto asomaba por los costados.

### ⚠ POR QUÉ SE MURIÓ LA PIZARRA DEL ALMA, Y QUÉ SE APRENDIÓ

`Alma` tenía **una** pizarra clavada y una línea de tiempo de GSAP con `scrub`
que reacomodaba las once fichas entre formaciones. El disparador era
`start: 'top top'` / `end: 'bottom bottom'` sobre la sección: **depende de que
la sección mida cierto alto**. Al reacomodar el layout esa ventana se achicó y
el recorrido quedó en nada — las fichas se congelaron, sin error, sin aviso. Lo
reportó el dueño mirando el sitio.

Ahora hay **UNA sola pizarra** (`Pizarra.astro`), clavada, y lo que se mueve son
las fichas: el escenario dice qué etapa manda y la pizarra acomoda a los once
con una transición de CSS. No queda nada que sincronizar con el alto de nada.

⚠ **HUBO UN ARREGLO INTERMEDIO QUE TAMBIÉN SE BAJÓ**: cuatro pizarras que
scrolleaban como si fueran fotos, una por etapa. *"No quiero las 4 fotos de la
pizarra, quiero que solo aparezca 1 y las fichas se vayan moviendo"*. El punto
de esa sección es ver a los once moverse.

⚠ **La posición de cada ficha va en la propiedad CSS `transform`, no en el
atributo del SVG**: las transiciones de CSS no animan atributos, así que con
`transform="translate(…)"` las fichas saltaban de una formación a la otra en vez
de viajar.

⚑ La lección no es "arreglar el trigger": **una animación atada al alto de una
sección se rompe callada cada vez que alguien toca el layout.** Y `probar.mjs`
ahora verifica que las fichas se muevan, para que la próxima vez lo agarre una
prueba y no el dueño.

⚑ Las fichas igual se mueven siempre: cabecean dos píxeles, en CSS, con un
desfasaje distinto cada una. Se animan con `translate` y **no** con `transform`,
porque el `<g>` ya usa `transform` para su posición en la cancha y animarlo lo
pisaría: las once saltarían al centro.

⚠ **Las capturas del juego NO van de fondo a sangre.** El fondo de Terrasol es
una foto y aguanta el velo; una captura de interfaz estirada y oscurecida no se
lee, y `object-cover` le come columnas enteras (§8, los cuatro intentos). Una
etapa `tipo: 'juego'` manda su captura al fondo **difuminada**, como ambiente, y
la muestra nítida y entera en su marco. El arte de Player y Test sí va nítido.

⚠ **Y el marco de la captura NO tiene proporción fija en escritorio.** Las
capturas van de 1,10 a 1,96 de proporción —la fecha en vivo es casi cuadrada, el
mercado es una banda—, así que cualquier marco fijo le deja aire muerto a la
mitad. En el teléfono sí lleva marco fijo, porque apiladas y de altos distintos
quedaban como un collage.

⚑ **Dónde va cada cosa.** La regla que ordenó la partición: lo que es del
**mundo** (ligas, clubes, planteles, figuras) va en `/gambeta`, porque lo
comparten los tres juegos; lo que es de **un juego** va en su página. La sección
Manager de la portada vieja se partió justo por ahí.

⚑ **El detalle se cuenta UNA sola vez.** Las tres etapas del Player están en la
portada y no se repiten en `/player`. El mismo texto en dos URLs se pelea
consigo mismo en Google.

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
| `0142` | River de Montevideo a nivel 16 y Nacionel a 17; +4 al plantel de River |
| `0149` | ningún club con menos de 21 jugadores, y ninguno sin arquero |

Resultado: **81 ligas · 1.339 clubes · 37.329 futbolistas**, media mundial 64,6.

### ⚠ Qué se miró de la 0127 a la 0155 y se dejó AFUERA

Que algo no esté en la cadena no significa que se haya olvidado:

- **`0133`** cambia el país de quince jugadores (dobles nacionalidades del
  Mundial). No mueve un solo número del sitio.
- **`0138` y `0154`** marcan quién está en venta o se puede pedir a préstamo.
  Eso es estado de mercado de una partida, no catálogo.
- **`0143`** recalcula el **valor y el sueldo** del plantel de River con
  `player_market_value()`, que es una función de Postgres. Replicarla acá sería
  una tercera copia de una fórmula que el propio juego vigila con una prueba
  para que no se separe de la segunda. **De ahí sale una regla del sitio: no se
  publica el valor de mercado de un futbolista.** Lo único que sí se tomó de la
  0143 es la reputación de River, que es un literal.
- **`0148` y de la `0150` a la `0155`** son funciones y reglas de sala.

### ⚠ Dos trampas más del extractor, nuevas

- **La `0142` no se parsea, se copia a mano.** No es un bloque de filas: son
  tres `update ... where id = '…'` sueltos. Y el techo usa la fuerza **vieja**
  (`strength + 8`), porque dentro de un mismo UPDATE Postgres lee la fila como
  estaba; con la nueva quedaría un margen de 8 en vez de los 4 que buscaba.
- **La `0149` escribe el `insert` con las columnas en varias líneas**, y el
  lector va renglón por renglón. Sin juntar esa cabecera antes de partir, la
  migración entera se leía como **cero filas**: silencioso, y peor que un error.
  Lo arregla un `replace` al principio de `readBlocks`.

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

### Las imágenes adelantadas del scrollytelling (agosto 2026)

Al partir el sitio, la portada pasó de tener **un** recorrido a tener **tres**, y
`/manager` dos. Cada recorrido cargaba sus dos primeras imágenes con
`loading="eager"` — algo que con un solo bloque no molestaba y que de golpe se
volvieron **diez descargas tempranas**.

Lo peor: en el teléfono esa columna **ni se muestra**, vive dentro de un
`hidden lg:block`. Pero **`display:none` NO evita que el navegador baje una
imagen `eager`.**

Medido en la portada: **92 → 87** de rendimiento móvil, LCP de 3,0 a **3,9 s**.
Con todas perezosas: **98 y 2,3 s** — mejor que antes de partir el sitio.

⚠ **Regla:** ningún recorrido está nunca en la primera pantalla (arriba siempre
hay un hero o una cabecera de alto completo), así que **no hay nada que
adelantar**. Si alguien vuelve a poner un `eager` ahí, que mida primero.

### Los huecos de las islas, y el CLS (agosto 2026)

Dos saltos de layout, los dos por lo mismo: **una isla que ocupa un lugar
distinto antes y después de cargar**.

- `/perfil` usa `client:only`, o sea que el servidor **no dibuja nada**: la
  página nacía corta y crecía de golpe. CLS móvil **0,169**, en rojo.
- El buscador de futbolistas mostraba un "cargando" de 24rem y después una tabla
  de 1.047px.

La solución en los dos casos es la misma y es aburrida: **reservar el alto que
va a ocupar, medido**, no estimado. `min-h-[34rem]` en el perfil (0,169 → 0,001)
y `min-h-[65rem] lg:min-h-[55rem]` en el buscador.

### Las capturas en el teléfono

1. **Fotografiar el juego a 420px.** A ese ancho **los paneles del juego
   recortan sus propias tablas**: la captura ya venía cortada.
2. **La captura de escritorio, alta y deslizable de costado.** Se leía, pero se
   veía siempre por la mitad y con un alto distinto en cada etapa.
3. **La que quedó:** `object-contain` en un marco de proporción fija. Chicas,
   pero enteras y todas iguales. *Chica y completa le gana a grande y cortada.*

---

## 8b. La página de perfil, y lo que la base sí y no tiene

`/perfil` **no inventa un padrón propio**: entra contra el Supabase del juego, y
le pide la carrera a dos funciones que ya existen (migración `0144` del juego):

| Función | Qué devuelve |
|---|---|
| `coach_profile(uuid)` | nombre, ID de entrenador `GM-XXXXX`, fecha de alta, partidos, G/E/P, puntos, títulos, clubes, salas y temporadas |
| `coach_spells(uuid)` | una fila por **etapa** al frente de un club (dirigir dos veces al mismo club son dos renglones) |

Las dos son `security definer` **a propósito**: la RLS del juego sólo deja leer
las salas donde uno es miembro, y un perfil de carrera es justo lo contrario —la
suma de todas.

⚠ **NO HAY "TIEMPO JUGADO".** El dueño lo pidió y no existe: el juego no registra
minutos de sesión en ningún lado. En su lugar se muestran las **temporadas
dirigidas**, que es lo que sí lleva. Si algún día se quiere de verdad, hay que
agregarlo del lado del juego primero.

⚠ **No se usan `career_points` / `career_titles` / `career_matches`** de la tabla
`profiles`. Existen desde la migración 0003 y **nadie las escribió nunca**: están
en cero para todo el mundo. Los números salen de `manager_spells`.

⚑ Existen además `search_coaches()` y `my_friends()` (migración `0145`), que hoy
el sitio no usa. Ahí está la puerta si alguna vez se quiere ver el perfil de un
amigo.

### ⚠ LA WEB NUNCA DEPENDE DE LA *SITE URL* DE SUPABASE

Es la regla más fácil de romper de todo el perfil, porque no falla en el
navegador: falla en la casilla de mail de otra persona, días después.

La **Site URL** del proyecto es **un solo valor compartido con el juego**. Al 20
de agosto vale `http://localhost:3000`, que es donde la otra ventana corre el
juego. Y Supabase la usa como destino por defecto **cada vez que quien pide algo
no dice a dónde volver**.

Con eso, dos mails nuestros llevaban a esa máquina de desarrollo ajena:

| Llamada | Qué se le pasa |
|---|---|
| `resetPasswordForEmail` | `redirectTo: ${origin}/perfil` |
| `signUp` | `options.emailRedirectTo: ${origin}/perfil` |

**Si alguna vez se agrega algo que mande otro mail** —cambio de mail, magic
link, invitaciones— hay que pasarle su destino explícito igual. No alcanza con
que la URL esté en la lista blanca: la lista blanca dice qué destinos se
*permiten*, no cuál se *usa*.

⛔ **Y NO se arregla cambiando la Site URL.** Es de la otra sesión: apuntarla a
la web le rompe los mails al juego, y el día que el juego se publique la va a
querer apuntando a él. Que valga lo que el juego necesite; a la web tiene que
darle igual.

Lo que sí hay del lado de Supabase, ya hecho: `https://gambetaweb.vercel.app/**`
está en **Authentication → URL Configuration → Redirect URLs**. Sin eso, Supabase
ignora el `redirectTo` y cae de nuevo en la Site URL.

⚠ **`gambetagame.com` NO está en esa lista, a propósito**: el dominio todavía no
es del dueño. Poner en la lista blanca un dominio que no controlás es dejar que,
si otro lo registra, los tokens de tus usuarios terminen ahí. Se agrega el día
que lo compre.

⚠ **El corte de "todavía no cargó" va DESPUÉS de todos los hooks** en
`Perfil.tsx` y en `PlantelExplorer.tsx`. Escribirlo arriba —que es donde sale
naturalmente— deja los `useMemo` de abajo sin ejecutar en el primer render y
ejecutados en el segundo: React cuenta los hooks por orden y la isla revienta
entera justo cuando llegan los datos.

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
  del menú caía en la card. **Volvió a pasar** al armar la portada nueva: la
  presentación de cada juego usaba `id="juego-<id>"`, el mismo de su card. Ahora
  la presentación es `presentacion-<id>` y **`revisar.mjs` chequea ids repetidos
  en cada página**, así que la tercera vez la agarra sola.
- **Dos `<nav>` con el mismo nombre accesible** — el menú de escritorio y el de
  teléfono se llamaban los dos "Secciones". Además de ser confuso para un lector
  de pantalla, hacía que cualquier selector contara doce enlaces donde hay seis.
- **Claves `comment` en `vercel.json`** — JSON no admite comentarios y Vercel
  valida contra un esquema estricto: rechazaba el deploy entero.
- **Los "hipervínculos" de la tabla no son del sitio** — no hay ni un `<a>` en
  el explorador. Los agrega **Safari en iOS**, que autodetecta lo que parece una
  dirección (las ciudades: Londres, Manchester) y la linkea a mapas. Lo apaga la
  meta `format-detection` en `Base.astro`.
- **Las capturas en PNG** costaban 2,3 MB y tiraban la nota móvil de 91 a 78.
  En WebP son 660 KB. **No volver a PNG.**
- **Apagar una clase de Tailwind con `classList.remove` y una variante de
  breakpoint** — la imagen del hero lleva `opacity-60 md:opacity-45`. Un intento
  hacía `remove('opacity-60', 'opacity-45')` + `add('opacity-0')`, y en
  **escritorio** no apagaba nada: la clase que existe es `md:opacity-45`, no
  `opacity-45`, así que sobrevivía y le ganaba a `opacity-0` por ser variante
  de breakpoint. La imagen quedaba al 45% abajo de los cinco videos para
  siempre, y se veía como **un fotograma gris trabado encima de todo**. En
  teléfono funcionaba, porque ahí `md:` no aplica. **Para prender y apagar algo
  desde JS, estilo en línea — gana en cualquier ancho.**

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
  render. ⚠ Con seis páginas esto ahora repite ~12 KB comprimidos por página en
  vez de cachear un archivo; se volvió a medir y se dejó igual (98–100 en todas).
  Si el CSS crece mucho, vale reevaluarlo — **midiendo**.
- **El preload del hero es una prop del layout** (`precargarHero`), no algo que
  se hereda: va sólo en la portada, que es la única donde esa imagen existe.
- **El paquete de Supabase se importa en forma dinámica**, así que las cinco
  páginas que no son `/perfil` no lo bajan nunca — y `/perfil` tampoco, si las
  cuentas no están configuradas.
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

**La tabla de planteles sigue exactamente el mismo criterio:**

| | Desde |
|---|---|
| N° · Futbolista · Fuerza | siempre |
| + Techo | `sm` (640px) |
| + Edad | `md` (768px) |
| + Pierna | `lg` (1024px) |

Y una diferencia deliberada entre las dos islas: el explorador de ligas elige
liga con una **tira de pestañas**, y el de planteles con un **`select`**. Allá la
liga *es* el contenido; acá el contenido es el plantel, y 81 pestañas encima de
la tira de clubes dejaban la tabla abajo del pliegue en el teléfono.

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
  avisar cuánto se gastó. Van **~124 créditos usados de 1.050** (las 25
  imágenes del 20 de agosto costaron 3,75 con `z_image`, a 0,15 cada una).

- ⚠ **Ojo con lo que dibujan los modelos de imagen.** De las seis primeras del
  arte de Player y Test, **dos salieron con guiños al fútbol americano** —una
  pelota ovalada con costuras y una camiseta con hombreras— y una tercera con
  **las tres tiras y el logo de Adidas**. En un sitio que le cambia una letra a
  los nombres justamente por derechos, una marca real no puede quedar. Hay que
  **mirar cada imagen** y, en el prompt, pedir explícitamente
  *"association football, no american football, no brand logos"*.
- **Si algo se ve raro tres veces, hay que cambiar de enfoque**, no seguir
  ajustando. Con el fondo del scrollytelling la respuesta correcta terminó
  siendo sacarlo.

---

## 13. Antes de dar algo por terminado

```bash
npm run build
npx astro preview --port 4400
node scripts/probar.mjs   http://localhost:4400   # 53 funcionales, 6 páginas
node scripts/revisar.mjs  http://localhost:4400   # visual + desbordes + ids
node scripts/lighthouse.mjs http://localhost:4400 # las cuatro notas
```

⚠ **Lighthouse mide UNA URL.** Después de un cambio grande hay que pasarle las
seis, una por una: `node scripts/lighthouse.mjs http://localhost:4400/gambeta`,
etc. `probar` y `revisar` sí recorren todas solas.

Y si tocaste algo que se ve en el teléfono, **miralo a 390 y a 430px**. La
mayoría de los problemas de esta sesión aparecieron sólo ahí.
