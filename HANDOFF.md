# HANDOFF — Gambeta web

> Bitácora del proyecto. La sesión del **13–14 de agosto de 2026** construyó el
> sitio de cero hasta dejarlo desplegable (§1 a §9); la del **20 de agosto** lo
> partió en seis páginas y le sumó el perfil (§10).
>
> Para trabajar en el proyecto **leé `CONTEXTO.md` primero** — es más corto y
> tiene lo que hay que saber. Este archivo es la crónica: qué se hizo, en qué
> orden, y qué se aprendió en cada tanda. Sirve para entender *por qué* una
> decisión es como es cuando el `CONTEXTO` no alcanza.

---

## Índice

1. [El pedido original](#1-el-pedido-original)
2. [Descubrimiento](#2-descubrimiento)
3. [La extracción de datos](#3-la-extracción-de-datos)
4. [El sitio](#4-el-sitio)
5. [El harness de capturas](#5-el-harness-de-capturas)
6. [Los assets con IA](#6-los-assets-con-ia)
7. [Las tandas de correcciones](#7-las-tandas-de-correcciones)
8. [Publicación](#8-publicación)
9. [Cuentas finales](#9-cuentas-finales)
10. [La partición en seis páginas](#10-la-partición-en-seis-páginas-20-de-agosto-de-2026)

---

## 1. El pedido original

Juan pidió la landing/hub de **Gambeta**, la marca que agrupa sus juegos de
fútbol, para **gambetagame.com**. En español rioplatense, identidad futbolera
premium, con dos scrollytelling y una sección alimentada con datos reales del
juego.

Y una regla en mayúsculas: **la carpeta del juego (`cyberfoot-online`) es solo
lectura**, porque hay otra ventana de Claude Code trabajando ahí al mismo tiempo.

Tres juegos a mostrar: **Manager** (jugable), **Player Game** y **Test**
(próximamente).

---

## 2. Descubrimiento

Antes de escribir una línea se exploró el repo del juego. Dos hallazgos
cambiaron el plan:

**No hay un solo archivo de imagen en el repo del juego.** Ni un `.png`. Las
banderas son SVG generados por código. Todo el arte había que crearlo.

**Los datos buenos están en las migraciones SQL, no en `scripts/raw/`.** Los
crudos tienen nombres reales (Wikipedia, EA, Transfermarkt); el catálogo del
juego los muta a propósito. La cabecera de la migración 0081 lo dice:

> *"Nombres de club y de liga: reales con UNA letra cambiada. Nombres de
> jugador: generados a partir de nombres comunes de cada país. Ningún nombre
> real llega a esta base."*
>
> **104 países, 81 ligas, 1.338 equipos, 37.141 jugadores.**

O sea que la web tenía que mostrar *Prenier League* y *Arsenel*. Es lo correcto
legalmente y además es lo que ve el jugador.

También quedó claro que **el juego no se puede fotografiar jugando**: sin sesión
de Supabase corta en el login, y la 0081 borró todas las salas. Crear una
escribiría en la base de producción.

---

## 3. La extracción de datos

`scripts/extract-catalog.mjs` parsea el SQL y **replica la cadena de
migraciones**, porque el estado final de un jugador no está en un solo archivo:
0081 siembra, 0110 excluye femeniles, 0112 repone la Liga MX, 0119–0122 fijan la
fuerza, 0124 los doce puestos, 0126 el techo.

Dos bugs que costaron y quedaron anotados en el código:

- **La 0124 trae dos clases de bloque intercalados** (75 de puestos y 75 de
  habilidades). Asignar a ciegas pisaba `position` con `undefined` y todos los
  jugadores salían sin puesto.
- **Los flags `is_star` / `is_world_class` del seed quedaron desfasados** tras la
  recalibración de las 0119–0122. Se recalculan desde la fuerza final con el
  umbral del juego (≥84 / ≥91). Nadie llega a 91: por eso "cracks" da 0 y no se
  muestra.

Resultado: **81 ligas · 1.339 clubes · 37.160 futbolistas**, media 64,6.

---

## 4. El sitio

Astro 7 + React 19 + Tailwind 4 + GSAP. Estático, oscuro, mobile-first.

El orden de las secciones cambió a pedido del dueño: primero **qué se hace**
(el recorrido), después **los datos**, y al final **el porqué emocional**. "El
que llega quiere ver el juego, no que le cuenten un sentimiento."

La única isla React es el explorador de ligas. Todo lo demás es HTML.

**Decisión de arquitectura que se mantuvo todo el proyecto:** `src/config/games.ts`
es el único lugar donde se agrega un juego. La grilla del hub, el menú, el footer
y los datos estructurados de SEO se arman solos desde ahí. Y el link al juego es
una variable de entorno, no código.

---

## 5. El harness de capturas

La parte más difícil, y la que más valor dio.

`harness/` monta las **pantallas reales del juego** (no maquetas) con clubes y
jugadores del catálogo, y `scripts/capturas.mjs` las fotografía con Playwright.
Empezó con 4 pantallas y terminó en **19**.

El camino, con sus tropiezos:

1. **El store del juego importa Supabase, que revienta al importarse** sin
   variables de entorno. Se resolvió con un stub enganchado por alias — sin
   tocar el archivo original del juego.
2. **Tailwind no generaba ninguna utilidad**: busca las clases desde la raíz de
   Vite, que era `harness/`, donde no hay componentes del juego. La cancha salía
   como una tira de 60px porque `aspect-[7/10]` no existía. Lo arregla un
   `@source`.
3. **Montar las 19 pantallas juntas crasheaba la pestaña** (la fecha en vivo
   sola dibuja diez canchas animadas). Ahora se dibuja una por vez, con `?p=`.
4. **Varios paneles no derivan nada de lo cargado**: le piden los datos a la
   base. Hubo que pisar acciones del store (`loadStandings`, `loadCompetitions`,
   `loadNationalDesk`…).
5. **Trampas de forma** que el propio juego documenta: `Pitch` espera un objeto
   plano y `MiniPitch` un Map; los convocados de la selección no cambian de
   club; `catalog` son competiciones y países, no jugadores.

Lo único inventado es el estado de la partida. La interfaz es la del juego.

---

## 6. Los assets con IA

Todo con el MCP de **Higgsfield**, siempre por la opción más barata que sirviera.

- **El logo** salió en SVG de `recraft_v4_1` (modo vector). Venía sobre un
  rectángulo negro y con los contornos de la G como formas encima, no como
  agujeros: se limpió con una **máscara SVG** en vez de reescribir los `path`,
  que es donde se rompen los logos.
- **Los fondos** con `z_image` a 0,15 créditos cada uno.
- **El hero** terminó siendo **cinco clips en secuencia**: micro llegando →
  partido → vestuario → partido desde el césped → la copa. Con dos capas de
  video que se turnan y se funden, y carga de a uno.

La lección más útil sobre modelos de video: **pedirle que mueva figuras chicas
las destruye**. El primer intento pedía que los jugadores en miniatura se
movieran y a los tres segundos quedaban grises y planos. Pedir lo contrario
—*"the figurines stay completely still"*— y dejar sólo cámara, neblina y luz fue
lo que funcionó.

---

## 7. Las tandas de correcciones

El sitio se armó en una pasada, pero **la mitad del trabajo fue lo que vino
después**, casi todo encontrado por el dueño mirando el sitio de verdad.

### El fondo del scrollytelling (cuatro intentos)

Foto estirada → video con scroll → fondo dibujado por bloque → una capa a
sangre con líneas de cal. Las cuatro se veían raras. **La quinta fue no poner
nada**, y ahí cerró. Está detallado en `CONTEXTO.md` §8.

La lección: si algo se ve raro tres veces, cambiá de enfoque en vez de seguir
ajustando.

### El explorador de ligas que "desaparecía"

Juan reportó que la tabla ya no cargaba. No era que estuviera escondida: la isla
hidrataba, tiraba **`_jsxDEV is not a function`** y React la desmontaba entera.
Causa: dos versiones de `@vitejs/plugin-react` conviviendo, porque se había
instalado la 6 para el harness y Astro trae la 5.2.

### Los tres problemas del teléfono

- **El hero no tenía video**: estaba desactivado por debajo de 1024px "por
  rendimiento". Ahora carga un juego de clips aparte a 720px.
- **Las capturas salían recortadas**: se fotografiaba el juego a 420px y a ese
  ancho **sus paneles recortan sus propias tablas**.
- **La tabla se cortaba de costado**: tenía un ancho mínimo de 576px en un
  contenedor de 348.

Y debajo de todo eso, el bug que los amplificaba: **`min-width: auto` en un item
de grilla** hacía que el documento midiera 1.700px en una pantalla de 390. No se
veía como scroll horizontal sino como texto comido.

### Y las dos últimas vueltas

- El velo del hero, que en escritorio va de izquierda a derecha, **mataba el
  video en el teléfono** porque ahí el texto ocupa todo el ancho.
- La columna "Plantel" aparecía desde 416px y en un Pro Max (430px) **entraba
  justo y quedaba partida al medio**.
- Los "hipervínculos" en los nombres de club **no eran del sitio**: los agrega
  Safari en iOS, que autodetecta direcciones. Lo apaga una meta.

---

## 8. Publicación

Repo: **`colo17/gambetaweb`**, rama `main`. Antes de subir se verificó que no
hubiera `.env` ni claves, y que el `.gitignore` cubriera `node_modules`, `dist`,
`.astro` y `.revision`.

`assets-src/` **sí se versiona** (~33 MB): son los originales de Higgsfield y sin
ellos `npm run assets` no puede regenerar nada.

El primer deploy en Vercel falló con
`Invalid request: headers[0] should NOT have additional property 'comment'`:
`vercel.json` tenía claves `comment` para explicar cada regla de cacheo. JSON no
admite comentarios y Vercel valida contra un esquema estricto. La explicación se
movió al README.

---

## 9. Cuentas finales

**Lo que se generó**

| | |
|---|---|
| Componentes | 9 Astro + 1 isla React |
| Scripts propios | 6 (datos, assets, capturas, probar, revisar, lighthouse) |
| Pantallas del juego capturadas | 19 |
| Assets de IA | 1 logo, 5 fondos, 8 videos (5 en uso) |
| Datos | 81 ligas · 1.339 clubes · 37.160 futbolistas |

**Créditos de Higgsfield:** ~120 de 1.050. El grueso se fue en probar modelos de
video hasta encontrar el que no deformaba las figuras.

**Verificación**

| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Escritorio | 99 | 100 | 100 | 100 |
| Teléfono | 92 | 100 | 100 | 100 |

19 de 19 pruebas funcionales. Sin desbordes, sin imágenes rotas.

**Y lo más importante:** el repo del juego quedó intacto. Se verificó con
`git status` al final de cada tanda. Los cambios que aparecen ahí son de la otra
sesión.

---

## 10. La partición en seis páginas (20 de agosto de 2026)

### El pedido

Textual: *"quiero cambiar toda la web porque quedó muy larga y con demasiada
información, quiero hacerla en varias páginas en lugar de una sola"*. Seis:
**Home, Gambeta, Manager, Player, Test y Perfil**.

Y tres cosas nuevas: un scrollytelling por juego en la portada, un buscador de
jugadores por equipo, y un perfil con las estadísticas de la cuenta.

### Dos hallazgos que cambiaron el plan antes de escribir una línea

**El perfil se podía hacer de verdad.** Leyendo el repo del juego apareció la
migración `0144_coach_identity_and_profile`: ID de entrenador permanente
`GM-XXXXX`, y dos funciones `security definer` que devuelven la carrera sumada de
todas las salas. O sea que `/perfil` no tenía que simular nada — entra contra la
base del juego con la misma cuenta.

Lo único que el dueño pidió y **no existe** es el *tiempo jugado*: el juego no
registra minutos de sesión en ningún lado. Se avisó y se reemplazó por
**temporadas dirigidas**, que es lo que sí lleva.

**Los datos estaban más viejos de lo que decía el traspaso.** El `CONTEXTO`
avisaba de la migración 0128; el juego ya iba en la **0155**. Dos cambian el
catálogo de verdad: la `0142` (River de Montevideo sube de nivel y le suben el
plantel) y la `0149` (le agrega jugadores a 64 clubes cortos y arqueros a 3 que
no tenían). El extractor tenía la cadena hardcodeada hasta la 0126.

Al extenderla apareció una trampa nueva: **la 0149 escribe el `insert` con las
columnas en tres renglones**, y el lector va línea por línea. Sin juntar esa
cabecera, la migración se leía como cero filas — sin error, sin aviso, nada. De
37.160 futbolistas se pasó a **37.329**.

### Cómo se repartió el contenido

La regla que ordenó todo: **lo que es del mundo va a `/gambeta`, lo que es de un
juego va a su página.** La vieja sección "Manager" de la portada se partió justo
por ahí: los modos y el recorrido quedaron en `/manager`, y el explorador de
ligas, las figuras y las promesas se fueron a `/gambeta`, porque los tres juegos
comparten ese catálogo.

El scrollytelling no hubo que escribirlo: `Recorrido.astro` ya hacía exactamente
lo pedido —texto que baja a la izquierda, imagen clavada a la derecha. Lo único
que se movió fue su script de GSAP, que vivía en `Camino.astro` y pasó al propio
componente: Astro lo empaqueta una vez por página y agarra todos los bloques que
haya, así que ahora cualquier página que meta un recorrido lo tiene andando sin
acordarse de copiar nada.

### El buscador de jugadores

La pregunta era de dónde sacar los planteles. Un buscador global sobre los 37.329
necesita el padrón entero en el navegador: **4,9 MB** para que la mayoría mire
dos clubes. Se resolvió con la unidad que ya funcionaba en el explorador de
ligas: **un archivo por liga** (81 de ~60 KB), que se pide al abrirla, y adentro
la búsqueda es instantánea.

Y una decisión de forma que parece un detalle: el explorador de ligas elige con
una tira de pestañas y este con un `select`. Allá la liga *es* el contenido; acá
81 pestañas encima de la tira de clubes dejaban la tabla abajo del pliegue en el
teléfono.

### Lo que salió mal, que fue lo más útil

**Las imágenes adelantadas.** Al pasar de uno a cinco recorridos, los dos `eager`
de cada columna fija se volvieron diez descargas tempranas. Y en el teléfono esa
columna ni se muestra —vive en un `hidden lg:block`—, pero `display:none` no
evita que el navegador baje una imagen `eager`. La portada cayó de 92 a **87** y
el LCP se fue a 3,9 s. Con todas perezosas quedó en **98 y 2,3 s**: mejor que
antes de partir el sitio.

**Los ids repetidos, otra vez.** La presentación de cada juego usaba
`id="juego-<id>"`, el mismo de su card del hub — exactamente el bug que ya había
pasado con `id="manager"`. Esta vez, además de arreglarlo, se le agregó a
`revisar.mjs` un chequeo de ids duplicados por página, así la tercera vez la
agarra sola.

**El corte antes de los hooks.** En las dos islas nuevas el `if (!datos) return`
salía naturalmente arriba, y ahí deja los `useMemo` de abajo sin ejecutar en el
primer render y ejecutados en el segundo. React cuenta los hooks por orden: la
isla revienta entera justo cuando llegan los datos.

**Los saltos de layout.** `/perfil` usa `client:only`, así que el servidor no
dibuja nada y la página crecía de golpe al hidratar: CLS móvil **0,169**, en
rojo. La solución fue aburrida y funcionó en los dos casos: reservar el alto que
la isla va a ocupar, **medido**, no estimado.

**El arte.** De las seis primeras imágenes, dos salieron con guiños al fútbol
americano —una pelota ovalada, una camiseta con hombreras— y una tercera con las
tres tiras y el logo de Adidas. En un sitio que le cambia una letra a los nombres
justamente por derechos, eso no podía quedar: tres regeneraciones pidiendo
explícitamente *"association football, no american football, no brand logos"*.

### Cuentas de esta tanda

| | |
|---|---|
| Páginas | 1 → **6** (más un 404) |
| Islas React | 1 → **3** |
| Verificaciones funcionales | 19 → **49** |
| Futbolistas en el catálogo | 37.160 → **37.329** |
| Créditos de Higgsfield | **1,35** (9 imágenes con `z_image`) |
| Rendimiento móvil de la portada | 92 → **98** |

Y el repo del juego, otra vez, intacto: sólo se leyó.
