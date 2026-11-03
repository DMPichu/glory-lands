# Requisitos para enriquecer Glory Lands

Lista de lo que hace falta conseguir o crear para que el juego luzca y suene mucho mejor. Todo es opcional: el juego ya funciona con modelos hechos por código, emojis como iconos y sin sonido. Cada cosa que llegue sustituye a lo actual sin romper nada.

**Cómo entregarlo:** sube los archivos a este repositorio, en las carpetas indicadas abajo, o déjalos en tu PC y dime la ruta. Yo los conecto al juego.

## Prioridades

| Prioridad | Qué | Por qué |
|---|---|---|
| 🔴 Alta | Modelos 3D animados de los 10 héroes | Es lo que más cambia el aspecto del juego. |
| 🔴 Alta | Música y efectos de sonido básicos | Ahora el juego no tiene sonido. |
| 🟠 Media | Retratos de los héroes e iconos de habilidades y objetos | Sustituyen a la letra inicial y a los emojis. |
| 🟠 Media | Modelos de súbditos, torres, Torre de Zugri y Lorik | Completan el aspecto del campo de batalla. |
| 🟢 Baja | Decorado (árboles, rocas, ruinas) | El mapa ya tiene decorado propio. |
| 🟢 Baja | Frases de voz y textos de lore extra | Dan personalidad. |

## Reglas generales (para todo)

- **Licencia:** solo material propio, CC0 o CC-BY. Nada copiado de juegos, películas ni artistas comerciales, ni calcado de los retratos usados en la mesa. Con CC-BY hay que apuntar el autor en `CREDITOS.md`.
- **Nombres de archivo:** en minúsculas, sin espacios ni tildes, con el identificador del héroe: `josephine`, `fotsor`, `yeslie`, `astrid`, `kouji`, `grimdarkus`, `ikaruus`, `crixus`, `legna`, `catarina`.
- **Peso:** el juego se descarga entero al abrir la página. Hay que mantener cada archivo ligero (límites abajo).
- **Equipo rojo:** no hace falta una versión aparte de cada héroe para la Legión. El juego oscurece automáticamente el mismo modelo.

---

## 1. Modelos 3D de héroes 🔴

**Carpeta:** `models/heroes/<id>.glb` (por ejemplo `models/heroes/kouji.glb`).

### Requisitos técnicos

| Requisito | Valor |
|---|---|
| Formato | `.glb` (glTF binario), con texturas dentro del archivo |
| Polígonos | 5.000 a 20.000 triángulos |
| Texturas | Una o dos, de 1024 × 1024 o 2048 × 2048 como máximo |
| Peso | Menos de 5 MB por archivo (ideal: menos de 3 MB) |
| Esqueleto | Humanoide, con un hueso de cabeza llamado `Head` o similar |
| Orientación | De pie, mirando hacia **+Z**, con los pies en el suelo (y = 0) |
| Escala | Cualquiera: el juego lo ajusta a su altura |
| Estilo | Low poly o estilizado, con colores claros y legibles desde arriba (la cámara es cenital) |

### Animaciones necesarias (dentro del mismo `.glb`)

| Animación | Obligatoria | Notas |
|---|---|---|
| Reposo (*idle*) | ✅ | En bucle. |
| Correr (*run*) | ✅ | En bucle. |
| Ataque básico (*attack*) | ✅ | Corta, de 0,4 a 0,8 s; el juego la acelera si hace falta. |
| Muerte (*death*) | ✅ | Termina tumbado en el suelo. |
| Lanzar hechizo (*cast*) | Recomendada | Para las habilidades Q, W y E. |
| Definitiva (*ultimate*) | Opcional | Pose espectacular para la R. |
| Victoria / burla | Opcional | Para la pantalla final. |

Los nombres de las animaciones dan igual: solo dime cuál es cuál. Si el modelo no trae animaciones, se pueden añadir gratis con **Mixamo**.

### Descripción de cada héroe

Son guías basadas en el lore; el diseño final tiene que ser original.

| Héroe | Rol | Rasgos clave | Arma / objeto |
|---|---|---|---|
| **Josephine** | Soporte / tanque | Joven, rubia, ojos verdes. Armadura sagrada blanca y dorada sobre un kimono azul. Diadema dorada con alitas y brazalete rojo. | Espada angelical y escudo redondo con gema azul |
| **Fotsor** | Luchador | Esqueleto con ojos de fuego; las llamas le salen de la cabeza al enfadarse. Capa granate, aire teatral. | Puños con magia del tiempo (violeta) |
| **Yeslie Moonbloom** | Maga | Tiflin de pelo blanco largo, ojos celestes y cuernos curvos morados con reflejos turquesa. Vestido blanco y negro con lazos. | Pistola mágica de cristal y libro flotante |
| **Astrid** | Tiradora | Vikinga alta, rubia con trenzas, pintura de guerra azul y cicatrices. Pieles oscuras con ribetes rojos y azules. | Rifle de francotirador y dos pistolas |
| **Kouji Kitaeda** | Tirador | Unos 27 años, pelo castaño en moño, barba. Capa marrón con cuello de piel y forro de hojas otoñales, faja amarilla. | Arco que brilla en cian y carcaj de flechas de fuego |
| **Grimdarkus II** | Tanque | Emperador con armadura completa negra y gris, yelmo cerrado con un cuerno curvo y capa clara. | Maza y el cubo azul de Lucavi flotando a su lado |
| **Ikaruus Rukhu** | Asesino | Samurái semielfo de pelo y ojos rojos, coleta larga. Kimono blanco, obi rojo y hakama negra. | Katana de hoja pálida |
| **Crixus** | Luchador | Caballero de la muerte con armadura pesada de Komódo y grietas verdes brillantes; ojos verdes en el yelmo. Capa hecha jirones. | Espadón «Lady Evangeline»: un filo de fuego y otro de necrosis |
| **Legna** | Soporte | Joven clérigo de túnica blanca con estola azul y bordes dorados. Un disco solar dorado flota a su espalda. | Báculo con luz |
| **Catarina Fersen** | Maga | Guerrera noble de pelo plateado con trenza y corona de hielo. Armadura azul pálido y capa blanca. | Espada de hielo translúcida |

---

## 2. Otros modelos 3D 🟠

**Carpeta:** `models/` (mismos requisitos técnicos que los héroes, pero más ligeros: menos de 2 MB cada uno).

| Archivo | Qué es | Animaciones |
|---|---|---|
| `lorik.glb` | **Lorik**, el jefe final: armadura dorada muy ornamentada, gemas azules, alas de plumas metálicas y rayos alrededor. Flota sobre su santuario. | Reposo flotando, ataque, invocar, muerte |
| `santuario_lorik.glb` | Base de Lorik: plataforma de obsidiana con raíces corrompidas. | — |
| `torre_zugri.glb` | Base azul: torre blanca con tejado azul, detalles dorados y estandartes. | — |
| `torre_azul.glb` | Torre defensiva de los Blood Hawks (piedra blanca y oro, cristal azul arriba). | — |
| `obelisco_rojo.glb` | Torre defensiva de la Legión (obsidiana con púas y cristal rojo). | — |
| `subdito_azul_melee.glb` | Guardia de la Orden con lanza y escudo. | Reposo, andar, atacar, morir |
| `subdito_azul_distancia.glb` | Clérigo de la Orden con báculo. | Reposo, andar, atacar, morir |
| `subdito_rojo_melee.glb` | Cultista encapuchado con daga y ojos rojos. | Reposo, andar, atacar, morir |
| `subdito_rojo_distancia.glb` | Ángel corrompido con alas oscuras y halo rojo. | Reposo, volar, atacar, morir |
| `caballero_aurane.glb` | Caballero negro que invoca Grimdarkus. | Salir del suelo, empujar |
| `dragon_plata.glb` | Forma de dragón de plata de Yeslie. | Reposo, volar, aliento, morir |

---

## 3. Sonido 🔴

**Carpeta:** `audio/musica/` y `audio/efectos/`.

| Requisito | Música | Efectos |
|---|---|---|
| Formato | `.ogg` o `.mp3` | `.ogg` o `.mp3` |
| Calidad | 44,1 kHz, estéreo, 128 a 192 kbps | 44,1 kHz, mono, 96 a 128 kbps |
| Duración | 1 a 3 min, que se pueda repetir sin cortes | 0,2 a 2 s |
| Peso | Menos de 4 MB por pista | Menos de 100 KB por efecto |
| Volumen | Todas las pistas con el mismo volumen | Sin silencio al principio |

### Música

| Archivo | Momento | Ambiente |
|---|---|---|
| `menu.ogg` | Menú de selección | Épica y tranquila: fantasía heroica |
| `batalla.ogg` | Durante la partida | Con ritmo, sin cansar |
| `lorik.ogg` | Cuando Lorik queda expuesto | Más oscura e intensa |
| `victoria.ogg` | Victoria | Corta y triunfal |
| `derrota.ogg` | Derrota | Corta y triste |

### Efectos comunes

`golpe_espada`, `golpe_puno` (puñetazo; sin eñe en el nombre del archivo), `disparo_flecha`, `disparo_magia`, `disparo_arma_fuego`, `critico`, `torre_dispara`, `torre_destruida`, `heroe_muere`, `subir_nivel`, `oro`, `comprar`, `pocion`, `reaparecer`, `lorik_raices`, `lorik_invoca`, `aviso` (una definitiva enemiga), `clic` (interfaz).

### Efectos de habilidades (40)

Nombre del archivo: `<id>_<tecla>.ogg`, por ejemplo `kouji_r.ogg`.

| Héroe | Q | W | E | R |
|---|---|---|---|---|
| Josephine | Resplandor de la luz | Imposición de manos | Escudo protector | Juramento de los Blood Hawks |
| Fotsor | Puño arcano | Desplazamiento temporal | Ovación de Oberon | Gran función |
| Yeslie | Disparo de cristal | Página arcana | Pulcritud mágica | Forma de dragón de plata |
| Astrid | Doble pistola | Tácticas de la vikinga | Carga de Berk | Bala de electrum |
| Kouji | Disparo curvo | Espíritu sanador | Velo de la naturaleza | Flecha de trueno |
| Grimdarkus | Golpe del cuerno | Plegaria oscura | Legión de Aurane | Cubo azul de Lucavi |
| Ikaruus | Corte de luna creciente | Aliento de escarcha | Danza de pétalos | Las cuatro bestias |
| Crixus | Tajo necrótico | Armadura de Komódo | Cadenas de fuego | Último aliento |
| Legna | Rayo sagrado | Égida de Bhia | Santuario | Bendición de Astora |
| Catarina | Lanza de hielo | Tormenta helada | Paso glacial | Invierno de Linerian |

---

## 4. Arte 2D 🟠

**Carpeta:** `img/`. Formato `.png` o `.webp` con fondo transparente (salvo las ilustraciones).

| Qué | Tamaño | Cantidad | Nombre |
|---|---|---|---|
| Retrato de héroe (busto) | 512 × 512 | 10 | `img/retratos/<id>.webp` |
| Ilustración de héroe para el menú (cuerpo entero) | 768 × 1024 | 10 | `img/arte/<id>.webp` |
| Icono de habilidad | 128 × 128 | 50 (4 habilidades + pasiva por héroe) | `img/habilidades/<id>_<q/w/e/r/p>.webp` |
| Icono de objeto | 128 × 128 | 19 | `img/objetos/<id_objeto>.webp` |
| Logo del juego | 1024 × 512 | 1 | `img/logo.webp` |
| Fondo del menú | 1920 × 1080 | 1 | `img/fondo_menu.webp` |
| Escudos de las facciones | 256 × 256 | 2 | `img/blood_hawks.webp`, `img/legion.webp` |

Identificadores de los objetos: `potion`, `sword`, `fang`, `trigger`, `scope`, `ember`, `katana`, `tome`, `crystal`, `moon`, `staff`, `shield`, `cloak`, `heart`, `thorns`, `aegis`, `boots`, `feather`, `tear`.

Los iconos se ven pequeños: tienen que entenderse a 48 píxeles, con una silueta clara y el color del héroe.

---

## 5. Decorado (opcional) 🟢

**Carpeta:** `models/decorado/`. Menos de 300 KB por pieza; sin animaciones.

- Árboles de Zugri (2 o 3 variantes) y árboles muertos del lado de Lorik.
- Rocas, arbustos, cristales corrompidos.
- Puente de madera y puente de piedra.
- Ruinas de Eaglere, Árbol de Astora, altar de la Legión.
- Farol, brasero, estandarte.

---

## 6. Textos y voz (opcional) 🟢

- **Frase de cada héroe** para el menú. Kouji, Grimdarkus, Ikaruus, Crixus, Legna y Catarina tienen frases inventadas para el juego; conviene cambiarlas por frases canónicas.
- **Frases de voz** por héroe (archivo `audio/voz/<id>_<momento>.ogg`): al elegirlo, al usar la R, al matar, al morir. De 1 a 3 s cada una.
- **Lore corto** (2 o 3 frases) de los lugares del mapa: ruinas de Eaglere, Árbol de Astora, altar de la Legión y aguja de cristal.

---

## 7. Decisiones de diseño pendientes

Más allá del material, el juego crecería con estas decisiones tuyas:

1. **Monstruos de la jungla:** ¿qué criaturas de Glory Lands viven entre los carriles y qué dan al matarlas? (oro, mejoras temporales…).
2. **Objetivo épico:** ¿un monstruo grande en el río (por ejemplo, una bestia sagrada de Kugane) que dé una gran ventaja al equipo que lo derrote?
3. **Más héroes:** candidatos con buen material son Bitten, El Mago Larg o una versión jugable de Zodiark (con otro nombre).
4. **Aspectos alternativos:** por ejemplo, la forma humana de Fotsor.
5. **Modo multijugador** entre personas: es un cambio grande que necesitaría un servidor.
