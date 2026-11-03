# Glory Lands: La Batalla de Zugri

Prototipo de juego 3D estilo MOBA ambientado en **Glory Lands**. Los **Blood Hawks** se enfrentan a la **Legión de Lorik** en un mapa de **tres carriles**, **7 contra 7**. Funciona en el navegador y no hace falta instalar nada.

## Cómo se juega

1. Elige a uno de los **10 héroes**: Josephine, Fotsor, Yeslie Moonbloom, Astrid, Kouji Kitaeda, Grimdarkus II, Ikaruus Rukhu, Crixus, Legna o Catarina Fersen.
2. Elige el modo (**7 contra 7**, o **1 contra 1** para practicar) y la dificultad. Los otros 13 héroes son bots.
3. Hay tres carriles (norte, central y sur) con dos obeliscos cada uno. Derriba los dos de **cualquier** carril para dejar expuesto el **Altar** de la Legión y destrúyelo.
4. Si cae el **Santuario** (tu base), pierdes.

Un mismo héroe puede estar en los dos equipos; el de la Legión lleva colores oscuros (y, en los mensajes, la etiqueta «(Legión)»).

### Controles

| Acción | Tecla |
|---|---|
| Moverse / atacar | **Clic derecho** (mantenerlo pulsado sigue al cursor) |
| Habilidades | **Q W E R** elige la habilidad y muestra su alcance; **clic izquierdo** donde quieras que golpee. Las que se lanzan sobre uno mismo salen al momento. **Clic derecho**, **Esc** o la misma tecla cancelan |
| Marcador | **Tab** (mantener) |
| Volver a la base | **B** (6 s sin moverse ni recibir daño) |
| Mejorar habilidad | **Mayús + Q/W/E/R** o el botón **+** |
| Tienda (en tu base o muerto) | **P** |
| Beber poción | **1** |
| Detenerse | **S** |
| Zoom | Rueda del ratón |
| Ir a un punto del mapa | Clic en el minimapa |
| Pausa | **Esc** |

### Reglas básicas

- Cada 30 s salen oleadas de súbditos por los tres carriles: guardias de la Orden contra cultistas y ángeles corrompidos.
- El mapa tiene un río con tres puentes, bosques (las arboledas no se pueden atravesar) y cuatro lugares especiales: las ruinas de Eaglere, el Árbol de Astora, el altar de la Legión y la aguja de cristal corrompido.
- Cerca de tu base corres un 60 % más rápido, para que volver al carril no se haga largo.
- Rematar súbditos da oro. Con el oro compras objetos en la tienda.
- La tienda tiene 19 objetos en cinco categorías. Algunos dan efectos especiales: robo de vida, golpes críticos, penetración de armadura o de resistencia mágica, daño extra al golpear, espinas y curaciones más fuertes.
- Si el juego va lento, desactiva **Efectos de brillo** en el menú (o abre la página con `?bloom=0`).
- Las torres atacan a quien entre en su alcance. Si atacas a un héroe bajo su torre, la torre te atacará a ti.
- La torre interior de un carril no se puede dañar mientras la exterior siga en pie. La base queda expuesta en cuanto un carril se queda sin torres.
- En un carril sin torres enemigas salen **súbditos de asedio** (más grandes y fuertes).
- El Altar se defiende: enraíza a los héroes cercanos y, sin torres que lo protejan, invoca ángeles corrompidos.

## Cómo abrirlo

El juego usa módulos de JavaScript, así que **no funciona abriendo `index.html` con doble clic**: necesita un servidor web.

- **En línea:** https://dmpichu.github.io/glory-lands/
- **En tu PC:** desde la carpeta del juego, ejecuta `python -m http.server 8765` y abre `http://localhost:8765` (cualquier puerto libre sirve).

## Estructura del código

| Archivo | Contenido |
|---|---|
| `index.html`, `style.css` | Página, menú e interfaz. |
| `js/config.js` | **Todos los números del juego**: vida, daño, enfriamientos, objetos, súbditos y torres. Es el archivo que hay que tocar para equilibrar. |
| `js/abilities.js` | Qué hace cada habilidad (Q/W/E/R) y cada pasiva. |
| `js/ai.js` | Inteligencia de los bots, los súbditos, las torres, el Santuario y el Altar. |
| `js/game.js` | Motor: combate, movimiento, oleadas, muerte y recompensas. |
| `js/map.js` | Geometría de los carriles (avance de cada unidad por su carril). |
| `js/models.js` | Modelos 3D hechos con formas básicas y el mapa (vegetación, río, puentes, faroles, partículas). |
| `js/effects.js` | Partículas, anillos, rayos y proyectiles. |
| `js/ui.js`, `js/main.js` | Interfaz, controles y bucle principal. |

Usa [three.js](https://threejs.org/) 0.160, que se carga desde un CDN.

## Modelos animados (.glb)

Cada héroe puede usar un modelo 3D animado en vez del hecho con formas básicas. Se configura con el campo `glb` del héroe en `js/config.js` (Fotsor trae uno de ejemplo):

| Campo | Para qué sirve |
|---|---|
| `url` | Ruta del `.glb`. Puede ser un archivo propio, p. ej. `models/fotsor.glb`. |
| `height` | Altura en el juego; el modelo se escala solo. |
| `anims` | Nombre de la animación del archivo para `idle`, `walk`, `attack` y `death`. |
| `hide` | Piezas del modelo que se esconden (armas o accesorios que no usa ese héroe). |
| `tint` | Recolorea por nombre de pieza o de material (`color`, `solid` para color liso sin textura, `emissive`, `r`, `m`). |
| `slim` | Proporciones esbeltas (alarga cuerpo y piernas y achica la cabeza). |
| `keep` | Piezas del modelo básico que se pegan a un hueso, como las llamas de Fotsor. |

Mientras carga (o si falla la carga), el héroe usa su modelo básico. Ahora todos los héroes y súbditos usan personajes de **KayKit** (CC0, de Kay Lousberg) recoloreados, en `models/kaykit/`; están en `HERO_MODELS` y `MODEL_GLB` de `js/config.js`. Para dar a un héroe su propio modelo, basta con cambiar su entrada. Si generas un modelo propio con IA (Meshy, Tripo…), puedes animarlo con **Mixamo**.

## Personalizar el juego

El juego carga solo lo que encuentre en estas carpetas; si falta algo, usa lo de siempre:

- `tokens/` y `img/retratos/`: retratos de los héroes (menú, interfaz, minimapa).
- `img/habilidades/` (ya incluye 50 iconos de game-icons.net) e `img/objetos/`.
- `audio/musica/`, `audio/efectos/`, `audio/voz/`: música, efectos y voces.
- `models/`: modelos 3D animados (`.glb`), que se conectan en `js/config.js`.
- `_entrada/`: para subir material sin ordenar y que Claude lo coloque.

Cada carpeta tiene un `LEEME.md` con los requisitos. Lo que falta conseguir está en `REQUISITOS.md`; las instrucciones para Claude, en `CLAUDE.md`; los autores, en `CREDITOS.md`.

Para comprobar que todo funciona, abre el juego con `?selftest=1`: en unos segundos muestra un informe con lo que encontró y si las habilidades y una partida simulada van bien.

## Notas

- Todos los modelos y diseños son originales: solo se inspiran en las descripciones de `GloryLands_MOBA/`.
- Los kits de habilidades siguen las propuestas de `GloryLands_MOBA/personajes.md`, simplificadas para el prototipo.
