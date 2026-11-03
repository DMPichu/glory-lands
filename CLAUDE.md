# Glory Lands: guía para Claude

MOBA 3D en el navegador ambientado en la campaña de rol **Glory Lands** (Blood Hawks contra la Legión de Lorik). 7 contra 7, tres carriles, 27 héroes. JavaScript puro con módulos ES y **three.js 0.160** desde CDN: **no hay compilación** ni dependencias de ejecución.

- Juego publicado: https://dmpichu.github.io/glory-lands/ (GitHub Pages desde `main`, raíz).
- Qué falta conseguir para enriquecerlo: `REQUISITOS.md`.
- Tokens, ilustraciones y sonidos ya preparados para los 17 héroes nuevos: `HEROES_NUEVOS.md`.
- Para jugadores: `README.md`.

**Idioma:** todo en español (interfaz, comentarios, commits). La dueña del proyecto escribe en español.

## Cómo probar

```bash
python -m http.server 8770          # y abrir http://localhost:8770
```

- `?hero=<id>` empieza directamente con ese héroe; `&auto=1` lo maneja un bot; `&speed=4` acelera; `&bloom=0` quita el brillo; `&mute=1` silencia; `&mode=1v1` modo práctica.
- **Autoprueba:** `http://localhost:8770/?selftest=1&minutes=4`. En unos segundos el título pasa a `SELFTEST OK` o `SELFTEST FAIL` y la página muestra un informe JSON: qué archivos opcionales encontró (retratos, tokens, iconos, audio, .glb), si las 4 habilidades de cada héroe funcionan y una partida 7 contra 7 simulada. **Ejecútala después de cada cambio.**
- Sin navegador: `npm install && npx playwright install chromium && npm test` (abre la autoprueba en Chromium sin pantalla y sale con código 1 si falla). No se ha probado todavía en la nube; si falla la instalación, usa el navegador.
- Comprobar sintaxis: `npm run check` (o `node --check js/<archivo>.js`).

## Mapa del código

| Archivo | Qué hace |
|---|---|
| `js/config.js` | **Todos los datos**: mapa y carriles, héroes (estadísticas, habilidades, `glb`), objetos, súbditos, torres, `MODEL_GLB`. Equilibrar = tocar aquí. |
| `js/game.js` | Motor: unidades, combate, daño, oleadas por carril, estructuras, muerte, sonido por eventos, cámara. |
| `js/abilities.js` | Implementación de cada habilidad (`ABILITY_IMPL[id]`) y pasiva (`PASSIVE_IMPL[héroe]`). |
| `js/ai.js` | Bots (carril asignado, farmeo, peleas, retirada), súbditos (siguen su carril) y torres/Lorik. |
| `js/map.js` | Geometría de los carriles: avance `s` de una unidad, punto del carril, siguiente punto. |
| `js/models.js` | Modelos hechos con formas básicas, cargador de `.glb`, y el mundo (suelo pintado, río, bosque instanciado, faroles, partículas). |
| `js/heroes.js` | Modelos de los héroes (estilo anime, fieles a los tokens): figura base, caras pintadas sobre la cabeza, peinados, ropa y armas. Los héroes sin modelo propio usan `buildFromLook` con su `look` de `roster.js`. |
| `js/roster.js` | Los 17 héroes nuevos y el rework de Catarina, descritos con datos: estadísticas por rol, habilidades (tipo de `kit.js` + números), pasiva, compra y aspecto provisional (`look`). |
| `js/kit.js` | Habilidades genéricas que ejecutan los datos de `roster.js` (skillshot, area, cone, dash, blink, buff, shield, heal, nova, stealth, execute, prison) y pasivas genéricas. |
| `js/jungle.js` | Jungla: campamentos neutrales, monstruos épicos del río, su IA y sus bendiciones. |
| `js/effects.js` | Partículas, anillos, pilares de luz, destellos, rayos. |
| `js/ui.js`, `js/main.js` | Interfaz (HUD, paneles, minimapa, tienda) y arranque, controles, bucle, música. |
| `js/art.js` | Retratos, tokens e iconos opcionales (con respaldo si faltan). |
| `js/audio.js` | Música, efectos y voces opcionales (Web Audio). |
| `js/selftest.js` | La autoprueba. |

Detalles útiles:
- Equipo azul a la izquierda (x negativa), rojo a la derecha; z negativa es el norte. Carriles `top`, `mid`, `bot` definidos en `LANES` (de la base azul a la roja).
- El equipo rojo usa los mismos héroes con colores oscuros (`corrupt()` en `models.js`). **No** se les añade «corrompido» al nombre; si el mismo héroe está en los dos bandos, los mensajes dicen «(Legión)» (`game.label()`).
- Cada habilidad devuelve `false` si no se pudo lanzar (no gasta maná). Los efectos visuales usan `g.fx.*`; los sonidos, `g.sound(nombre, posición)`.
- Para añadir un héroe, lo más rápido es una entrada en `NEW` de `js/roster.js`: estadísticas por rol, 4 habilidades con su `kit` (tipo + números), pasiva con su `kit`, `build`, `prio` y `look`. Para habilidades especiales se puede programar una a mano en `abilities.js` (sin `kit`). Cuando llegue su token, se le hace un constructor propio en `HERO_BUILDERS_V2` (`js/heroes.js`). Comprueba siempre con la autoprueba.
- Sonidos: `<héroe>_<q|w|e|r>.ogg` si existe; si no, el genérico del tipo (`kit_skillshot`, `kit_heal`...). Los efectos propios se generan con `python tools/sintetizar_sonidos.py`.

## Assets: dónde va cada cosa

Todo es opcional: si un archivo no existe, el juego usa lo de siempre y no da error. Cada carpeta tiene un `LEEME.md` con los requisitos.

| Qué | Dónde | Formato y nombre | Cómo se activa |
|---|---|---|---|
| Material sin ordenar | `_entrada/` | Lo que suba la dueña, tal cual | Ordénalo en las carpetas de abajo (ver «Procesar `_entrada/`») |
| Retrato de héroe | `img/retratos/<héroe>.webp` | 512 × 512 | Automático (tiene prioridad sobre el token) |
| Token de la campaña | `tokens/<héroe>.webp` (también `lorik`) | 256 × 256 | Automático |
| Icono de habilidad | `img/habilidades/<id_habilidad>.svg` | SVG blanco | Automático (ya hay 50, de game-icons.net) |
| Icono de objeto | `img/objetos/<id_objeto>.webp` (o `.svg`) | 128 × 128 | Automático (ya hay 19 `.svg` de game-icons; un `.webp` los sustituye) |
| Música | `audio/musica/<menu/batalla/lorik/victoria/derrota>.ogg` (o `.mp3`) | | Automático |
| Sonidos sin asignar | `audio/banco/<personaje>/` | `.ogg` | No se usan solos: copiarlos a `audio/efectos/` con el nombre de la habilidad |
| Efectos | `audio/efectos/<nombre>.ogg`, `<héroe>_<q/w/e/r>.ogg`, `<héroe>_ataque.ogg`, `<héroe>_critico.ogg` | | Automático (lista en `audio/LEEME.md`; ya hay 32 sonidos) |
| Voces | `audio/voz/<héroe>_<elegir/definitiva/matar/morir>.ogg` | | Automático |
| Modelo de héroe | `models/heroes/<héroe>.glb` | glTF binario con animaciones | Rellenar `glb` del héroe en `config.js` |
| Otros modelos | `models/<nombre>.glb` | | Rellenar la entrada de `MODEL_GLB` en `config.js` |

Identificadores de héroe: `josephine`, `fotsor`, `yeslie`, `astrid`, `kouji`, `grimdarkus`, `ikaruus`, `crixus`, `legna`, `catarina` (y `lorik` para el jefe). Los de habilidades (`jos_q`, `kou_r`...) y objetos (`potion`, `sword`...) están en `config.js`.

### Conectar un modelo .glb

1. Inspecciona el archivo: nombres de las animaciones y de los materiales. Con Node: `npx -y @gltf-transform/cli inspect models/heroes/kouji.glb`.
2. Si pesa más de 5 MB, optimízalo: `npx -y @gltf-transform/cli optimize entrada.glb salida.glb --texture-compress webp`.
3. En `config.js`, en el héroe:
   ```js
   glb: {
     url: 'models/heroes/kouji.glb',
     height: 2.3,                                   // altura en el juego (se escala solo)
     anims: { idle: 'Idle', walk: 'Run', attack: 'Attack', death: 'Death' },  // nombres del archivo
     attackTime: 0.45,                              // opcional: duración del golpe
     rotY: 0,                                       // opcional: si mira hacia otro lado (radianes)
     tint: { NombreMaterial: { color: 0xffffff } }, // opcional: recolorear
     keep: [],                                      // opcional: piezas del modelo básico a conservar (p. ej. las llamas de Fotsor)
   },
   ```
4. Para súbditos y estructuras, lo mismo en `MODEL_GLB` (`minion_blue_melee`, `tower_red`, `boss`...).
5. Ejecuta la autoprueba: `assets.glbCargados` debe incluir la ruta y `glbFallidos` debe estar vacío. Mira el modelo en el juego (azul y rojo): si sale de lado o hundido, ajusta `rotY` o `height`.

### Procesar `_entrada/`

Cuando la dueña sube una carpeta nueva (normalmente a `_entrada/`):
1. Haz inventario de lo que hay y clasifícalo según la tabla de arriba. Si algo no encaja o no sabes a qué héroe corresponde, pregúntale en vez de adivinar.
2. Convierte las imágenes con `python tools/prep_imagenes.py <retrato|token|objeto|arte> <origen> <id> ...` (necesita Pillow). El audio, a `.ogg` u `.mp3` con `ffmpeg` si hace falta.
3. Conecta los `.glb` en `config.js`.
4. Apunta en `CREDITOS.md` el autor y la licencia de todo lo de terceros.
5. Ejecuta la autoprueba y revisa el juego.
6. Borra de `_entrada/` lo que ya esté colocado (el repositorio es público y Pages publica todo lo que contiene).
7. Actualiza `REQUISITOS.md` (marca lo conseguido) y el `README.md` si cambia algo para los jugadores.

## Reglas

- **Licencias:** solo material propio, CC0 o CC-BY (anotado en `CREDITOS.md`). Los tokens y retratos de la campaña pueden venir de juegos o artistas comerciales; el repositorio es **público**, así que antes de subir imágenes de terceros confirma con la dueña que quiere publicarlas.
- **Peso:** el juego se descarga entero al abrir la página. Modelos de menos de 5 MB, efectos de menos de 100 KB, música de menos de 4 MB, imágenes en `.webp`.
- **Sin compilación ni frameworks:** mantén los módulos ES y las versiones fijas del CDN (three 0.160.0). No añadas dependencias de ejecución.
- **Estilo del código:** como el que ya hay. Comentarios breves en español, nombres en inglés para el código, datos en `config.js`.
- **Commits:** en español. Publicar = `git push` a `main` (Pages se actualiza en 1 o 2 minutos). Hay una copia del juego en el repo privado `DMPichu/World` (rama `juego-moba`, carpeta `game/`); si tienes acceso, mantenla al día.
- **Selector de tokens:** la dueña elige qué token usa cada héroe en un artefacto privado de claude.ai (https://claude.ai/artifact/6Bvku6aH26WsvWsWBJ1F7T; colección `elecciones`, un documento por héroe con `label`, el nombre del token original). Los archivos originales están en su PC (`Glory Lands/- IMAGES/1 -Tokens/`), no en el repositorio: para usarlos tiene que subir los elegidos.
