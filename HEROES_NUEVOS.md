# Héroes nuevos: material listo para el parche

Lo que necesita el chat que añade los 17 héroes nuevos y el rediseño de Catarina. Todo está ya en el repositorio; solo hay que conectarlo.

## Identificadores y tokens

Usa estos `id` (en minúsculas, sin tildes). Cada uno ya tiene su token en `tokens/<id>.webp` (256 × 256), que sirve de guía para el modelo (colores, pelo, ropa) y aparece solo en la interfaz en cuanto el héroe exista en `HERO_ORDER`.

| id | Héroe | Rol que pidió la dueña | Token (origen) |
|---|---|---|---|
| `hermes` | Hermes | Luchador de ráfaga y críticos con habilidades de paladín | token Hermes 4 (león) |
| `polett` | Polett | Luchadora de daño sostenido | token Polett |
| `belian` | Belian | Sanadora | token Belian 2 |
| `vallentine` | Vallentine | Juggernaut tanque | token Vallentine Pelo |
| `emmeline` | Emmeline | Hechicera magenta | imagen que pasó la dueña (pelo blanco, ojos rojos, marco gótico) |
| `lucille` | Lucille | Tanque de hielo y glamurosa | token Lucille Ashbridge |
| `esperanza` | Esperanza | Clériga espadachina de oscuridad | token Esperanza Pendragon |
| `fuyumi` | Fuyumi | Asesina furtiva de ataques divinos | token Fuyumi2 (3) |
| `slinxi` | Slinxi | Muy buena limpiando oleadas y grupos, muy tanque, poco daño a héroes, muy rápida | token Slinxi 3 (goblin) |
| `umi` | Umi | Luchadora monje: muchísimos escudos, muy frágil cuando se los rompen, mucha evasión, daño moderado, ataque a distancia activable (esferas de fuego verde) | token Umi2 |
| `zeflie` | Zeflie | Pareja con Zestari: funcionan bien en combo pero se pueden jugar por separado | imagen que pasó la dueña (borde verde: elfa de coletas rubio claro) |
| `zestari` | Zestari | Pareja con Zeflie (ver arriba) | imagen que pasó la dueña (borde morado: elfa de pelo lila con sombrero de bruja) |
| `xeluna` | Xeluna | Luchadora *offtank*: con poca vida golpea muy fuerte | token Xeluna Party |
| `vrizahl` | Vrizahl | Hechicero del trueno, ráfaga enorme, muy frágil; una habilidad es una caja de fuerza que encierra a alguien 3 s (no se le puede dañar dentro) | token Vrizahl 3 |
| `candle` | Candle | Hechicera del trueno: escudos defensivos, control, daño moderado, buena limpiando oleadas | token Candle |
| `cabbo` | Cabbo | Tanque y sanador, resistente | token Cabbo |
| `konta` | Konta | Asesino *trickster* con un *dash* potente que aturde | recorte de `ALIADOS/Konta` (felino con sombrero y armadura) |

**Rediseño de Catarina** (`catarina`, ya existe): luchadora de críticos con **una sola** habilidad de hielo y una definitiva de un único corte que ejecuta a un enemigo. Su token sigue en `tokens/catarina.webp`.

Los tokens los eligió la dueña en el selector (y pasó aparte los de Emmeline, Zeflie y Zestari). **Los modelos de `js/heroes.js` deben parecerse a ellos**: especie (Hermes es un león, Slinxi una goblin, Umi, Candle y Konta son felinos), pelo, colores y ropa. Para cambiar un token basta con sustituir `tokens/<id>.webp`.

## Ilustraciones de cuerpo entero

En `img/arte/` (768 px de ancho), para los héroes cuyo token no muestra bien el cuerpo:
- `zeflie_zestari.webp`: las dos juntas (Zestari a la izquierda, Zeflie a la derecha).
- `zestari.webp`: Zestari de medio cuerpo con su libro.
- `konta.webp`: Konta de cuerpo entero.

## Sonidos

Ya conectados (el juego los usa solos en cuanto exista el héroe):
- `audio/efectos/fuyumi_ataque.ogg` (daga lanzada) y `audio/efectos/fuyumi_critico.ogg`.

Banco de sonidos sin asignar, en `audio/banco/` (cópialos o renómbralos a `audio/efectos/<héroe>_<q|w|e|r>.ogg` según encaje con cada habilidad que diseñes):

| Archivo | Qué parece | Sugerencia |
|---|---|---|
| `fuyumi/misty_step.ogg` | Paso brumoso (teletransporte corto) | Fuyumi, desplazamiento |
| `fuyumi/minor_runic_dagger.ogg`, `fuyumi/major_runic_dagger.ogg` | Dagas rúnicas | Fuyumi, Q o golpe divino |
| `fuyumi/cold_vengance_dagger.ogg` | Daga de venganza fría | Fuyumi, definitiva |
| `fuyumi/fuyumi_bleeding.ogg` | Sangrado | Fuyumi, efecto de sangrado |
| `fuyumi/hankyu.ogg` | Arco corto | Libre |
| `fuyumi/light_drive.ogg` | Impulso de luz (ya es `legna_q`) | Esperanza o Hermes |
| `eris/cura_baculo.ogg` | Curación con bastón | Belian o Cabbo |
| `eris/garras_1.ogg` a `garras_3.ogg` | Zarpazos | Konta (ataque básico) |
| `vallentine/vallentine0.ogg` a `vallentine9.ogg` | Frases o golpes de Vallentine (1 a 3 s; sin escuchar) | Vallentine: ataque, habilidades o `audio/voz/vallentine_<momento>.ogg` |
| `vallentine/bulletproof`, `goodday`, `ohno`, `crysomemore`, `wresler` | Frases cortas de Vallentine (en inglés) | Voces: `vallentine_elegir`, `_definitiva`, `_matar`, `_morir` |

Los demás héroes nuevos no tienen sonidos propios en la carpeta de la campaña: usarán los genéricos (`golpe_espada`, `disparo_magia`...). Si se reasigna algo, anótalo en la sección «Sonido» de `CREDITOS.md`.

## Lista para añadir cada héroe

Igual que en `CLAUDE.md`: entrada en `HEROES` y `HERO_ORDER` (`js/config.js`), habilidades y pasiva en `js/abilities.js`, modelo en `js/heroes.js` (siguiendo el token), casos de IA si alguna habilidad lo necesita (`js/ai.js`), iconos en `img/habilidades/<id_habilidad>.svg` (blancos, de game-icons.net, CC BY 3.0, anotados en `CREDITOS.md`), y la autoprueba (`?selftest=1`) en verde. Con 27 héroes, el menú de selección probablemente necesite otra distribución.
