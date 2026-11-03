# Glory Lands: La Batalla de Zugri

Prototipo de juego 3D estilo MOBA ambientado en **Glory Lands**. Los **Blood Hawks** se enfrentan a la **Legión de Lorik** en un mapa de una sola línea. Funciona en el navegador y no hace falta instalar nada.

## Cómo se juega

1. Elige a un héroe: **Josephine**, **Fotsor**, **Yeslie Moonbloom** o **Astrid**.
2. Elige el modo (**1 contra 1**, o **2 contra 2** con un aliado bot) y la dificultad.
3. Destruye los dos **obeliscos** de la Legión y derrota a **Lorik** en su santuario.
4. Si cae la **Torre de Zugri** (tu base), pierdes.

### Controles

| Acción | Tecla |
|---|---|
| Moverse / atacar | Clic derecho (o izquierdo) |
| Habilidades | **Q W E R** (se lanzan hacia el cursor) |
| Mejorar habilidad | **Mayús + Q/W/E/R** o el botón **+** |
| Tienda (en tu base o muerto) | **P** |
| Beber poción | **1** |
| Detenerse | **S** |
| Zoom | Rueda del ratón |
| Pausa | **Esc** |

### Reglas básicas

- Cada 28 s salen oleadas de súbditos de cada base: guardias de la Orden contra cultistas y ángeles corrompidos.
- Rematar súbditos da oro. Con el oro compras objetos en la tienda.
- La tienda tiene 19 objetos en cinco categorías. Algunos dan efectos especiales: robo de vida, golpes críticos, penetración de armadura o de resistencia mágica, daño extra al golpear, espinas y curaciones más fuertes.
- Si el juego va lento, desactiva **Efectos de brillo** en el menú (o abre la página con `?bloom=0`).
- Las torres atacan a quien entre en su alcance. Si atacas a un héroe bajo su torre, la torre te atacará a ti.
- La torre interior no se puede dañar mientras la exterior siga en pie, y la base, mientras quede alguna torre.
- Cuando un equipo pierde sus dos torres, el rival recibe **súbditos de asedio** (más grandes y fuertes).
- Lorik se defiende: enraíza a los héroes cercanos y, sin torres que lo protejan, invoca ángeles corrompidos.

## Cómo abrirlo

El juego usa módulos de JavaScript, así que **no funciona abriendo `index.html` con doble clic**: necesita un servidor web.

- **Con GitHub Pages:** activa Pages en el repositorio y abre `https://<usuario>.github.io/<repo>/game/`.
- **En tu PC:** desde la carpeta `game`, ejecuta `python -m http.server 8765` y abre `http://localhost:8765` (cualquier puerto libre sirve).

## Estructura del código

| Archivo | Contenido |
|---|---|
| `index.html`, `style.css` | Página, menú e interfaz. |
| `js/config.js` | **Todos los números del juego**: vida, daño, enfriamientos, objetos, súbditos y torres. Es el archivo que hay que tocar para equilibrar. |
| `js/abilities.js` | Qué hace cada habilidad (Q/W/E/R) y cada pasiva. |
| `js/ai.js` | Inteligencia de los bots, los súbditos, las torres y Lorik. |
| `js/game.js` | Motor: combate, movimiento, oleadas, muerte y recompensas. |
| `js/models.js` | Modelos 3D hechos con formas básicas y el mapa. |
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
| `tint` | Recolorea materiales por nombre (`color`, `emissive`, `r`, `m`). |
| `keep` | Piezas del modelo básico que se pegan a un hueso, como las llamas de Fotsor. |

Mientras carga (o si falla la carga), el héroe usa su modelo básico. El de ejemplo es **RobotExpressive** (CC0, de Tomás Laulhé), que se carga desde el repositorio de three.js. Para un esqueleto de verdad, sirven los paquetes gratuitos (CC0) de **KayKit** o de **Quaternius**. Si generas un modelo propio con IA (Meshy, Tripo…), puedes animarlo con **Mixamo**.

## Notas

- Todos los modelos y diseños son originales: solo se inspiran en las descripciones de `GloryLands_MOBA/`.
- Los kits de habilidades siguen las propuestas de `GloryLands_MOBA/personajes.md`, simplificadas para el prototipo.
