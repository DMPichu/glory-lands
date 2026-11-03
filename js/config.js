// Datos del juego: mapa, héroes, objetos y constantes.
// Todo lo que se quiera equilibrar (daño, vida, enfriamientos...) está aquí.

// Mapa de tres carriles. El equipo azul (Blood Hawks) está a la izquierda (x negativa)
// y el rojo (Legión de Lorik) a la derecha. z negativa es el norte (arriba en pantalla).
export const MAP = {
  minX: -150,
  maxX: 150,
  minZ: -88,
  maxZ: 88,
  laneHalf: 6, // medio ancho del camino pintado de cada carril
  roadSpeed: 0.12, // los héroes van un 12 % más rápido por el camino
};

// Recorrido de cada carril, de la base azul a la roja.
export const LANES = {
  // esquinas redondeadas: por el camino se llega casi igual de rápido que atajando
  top: [[-114, -6], [-109, -40], [-101, -58], [-86, -69], [-66, -73], [66, -73], [86, -69], [101, -58], [109, -40], [114, -6]],
  mid: [[-114, 0], [114, 0]],
  bot: [[-114, 6], [-109, 40], [-101, 58], [-86, 69], [-66, 73], [66, 73], [86, 69], [101, 58], [109, 40], [114, 6]],
};
export const LANE_NAMES = { top: 'norte', mid: 'central', bot: 'sur' };

// Distribución de estructuras (la base roja es el reflejo de la azul).
const BLUE_LAYOUT = {
  fountain: { x: -138, z: 0 },
  nexus: { x: -122, z: 0 },
  towers: [
    { lane: 'top', tier: 1, x: -50, z: -73 }, { lane: 'top', tier: 2, x: -100, z: -57 },
    { lane: 'mid', tier: 1, x: -45, z: 0 }, { lane: 'mid', tier: 2, x: -82, z: 0 },
    { lane: 'bot', tier: 1, x: -50, z: 73 }, { lane: 'bot', tier: 2, x: -100, z: 57 },
  ],
};
const mirror = (p) => ({ ...p, x: -p.x });
export const LAYOUT = {
  blue: BLUE_LAYOUT,
  red: { fountain: mirror(BLUE_LAYOUT.fountain), nexus: mirror(BLUE_LAYOUT.nexus), towers: BLUE_LAYOUT.towers.map(mirror) },
};

export const TEAMS = {
  blue: { name: 'Blood Hawks', color: '#4aa3ff', dir: 1 },
  red: { name: 'Legión de Lorik', color: '#ff4a5a', dir: -1 },
};

export const CONST = {
  startGold: 500,
  passiveGold: 3.2, // oro por segundo al empezar…
  passiveGoldMax: 6, // …y sube poco a poco hasta esto (a los 20 minutos)
  waveInterval: 30,
  firstWave: 5,
  fountainRadius: 10,
  shopRadius: 20,
  xpRange: 15,
  maxLevel: 18,
  heroKillGold: 300,
  assistGold: 150,
  towerGold: 175,
  maxItems: 8,
};

export function xpToNext(level) {
  return 160 + level * 85;
}

// ---------------------------------------------------------------------------
// HÉROES
// ---------------------------------------------------------------------------
// Cada habilidad: id (usado por abilities.js), tecla, nombre, coste de maná,
// enfriamiento por rango, alcance y datos numéricos. "ai" indica a los bots
// cómo usarla.

export const HEROES = {
  josephine: {
    id: 'josephine',
    glb: { url: 'models/heroes/josephine.glb', height: 2.3, anims: { idle: 'Idle', walk: 'Run', attack: 'Attack', death: 'Death' }, attackTime: 0.45 }, // Hunyuan3D-2 + tools/blender/ia_heroe.py
    name: 'Josephine',
    title: 'Paladina de la Luz · Fundadora de los Blood Hawks',
    role: 'Soporte / Tanque',
    melee: true,
    color: '#f2d27a',
    quote: '«No estás solo».',
    lore: 'Fundadora y líder de los Blood Hawks. Protege a los suyos con su escudo y la luz de Astora.',
    base: { hp: 660, mp: 300, ad: 58, ap: 10, armor: 36, mr: 32, as: 0.66, range: 2.6, speed: 7.0, hpRegen: 3.0, mpRegen: 6 },
    growth: { hp: 98, mp: 40, ad: 3.4, ap: 4, armor: 4.2, mr: 1.6, as: 0.018 },
    passive: {
      id: 'jos_p', name: 'Intervención divina', icon: '🕊️',
      desc: 'Al bajar del 50 % de vida, la luz de Astora la envuelve con un escudo del 20 % de su vida máxima durante 4 s. Recarga: 40 s.',
    },
    abilities: [
      { id: 'jos_q', key: 'Q', name: 'Resplandor de la luz', icon: '✨', cost: [35, 40, 45, 50, 55], cd: [9, 8, 7, 6, 5], range: 0,
        dmg: [30, 50, 70, 90, 110], ai: 'selfFight',
        desc: 'Su espada se carga de luz: sus 3 siguientes ataques alcanzan a distancia media (6 m) e infligen 30/50/70/90/110 (+40 % AD) de daño mágico adicional.' },
      { id: 'jos_w', key: 'W', name: 'Imposición de manos', icon: '💛', cost: [60, 65, 70, 75, 80], cd: [14, 13, 12, 11, 10], range: 8,
        heal: [80, 120, 160, 200, 240], ai: 'healAlly',
        desc: 'Cura al aliado más cercano al cursor (o a sí misma) 80/120/160/200/240 (+40 % AP) y le quita ralentizaciones, aturdimientos e inmovilizaciones.' },
      { id: 'jos_e', key: 'E', name: 'Escudo protector', icon: '🛡️', cost: [50, 55, 60, 65, 70], cd: [16, 15, 14, 13, 12], range: 7,
        shield: [60, 95, 130, 165, 200], dmg: [40, 65, 90, 115, 140], ai: 'engage',
        desc: 'Salta hacia la posición (o un aliado). Al aterrizar da un escudo de 60/95/130/165/200 (+8 % de su vida máx.) a los aliados cercanos, daña a los enemigos y los debilita (−30 % de daño, 2,5 s).' },
      { id: 'jos_r', key: 'R', name: 'Juramento de los Blood Hawks', icon: '⚜️', cost: [100, 100, 100], cd: [90, 75, 60], range: 0,
        heal: [30, 50, 70], shield: [150, 250, 350], ai: 'ultFight',
        desc: 'Clava la espada y crea un área sagrada durante 5 s: los aliados dentro reciben un escudo de 150/250/350, se curan 30/50/70 por segundo y recuperan 2 s de enfriamiento. Los enemigos dentro son ralentizados un 25 %.' },
    ],
    build: ['shield', 'tear', 'boots', 'aegis', 'crystal', 'heart'],
    prio: [1, 0, 2],
  },

  fotsor: {
    id: 'fotsor',
    name: 'Fotsor',
    title: '«Oberon» · El mago musculoso',
    role: 'Luchador',
    melee: true,
    color: '#ff8a3d',
    quote: '«¡Que empiece la función!»',
    lore: 'Esqueleto de ojos en llamas, héroe de Zugri. Combina puños, magia del tiempo y mucho espectáculo.',
    base: { hp: 640, mp: 260, ad: 66, ap: 0, armor: 32, mr: 32, as: 0.70, range: 2.6, speed: 7.1, hpRegen: 3.2, mpRegen: 5.5 },
    growth: { hp: 102, mp: 35, ad: 4.0, ap: 0, armor: 3.8, mr: 1.4, as: 0.022 },
    passive: {
      id: 'fot_p', name: 'Ira ardiente', icon: '🔥',
      desc: 'Acumula furia al golpear y al recibir daño. Con 100 de furia, el fuego le sale de la cabeza durante 6 s: sus ataques hacen un 35 % más de daño como daño mágico y ganan velocidad de ataque.',
    },
    abilities: [
      { id: 'fot_q', key: 'Q', name: 'Puño arcano', icon: '👊', cost: [30, 30, 30, 30, 30], cd: [7, 6.5, 6, 5.5, 5], range: 4,
        dmg: [60, 95, 130, 165, 200], ai: 'gapclose',
        desc: 'Avanza un poco y golpea al primer enemigo: 60/95/130/165/200 (+80 % AD) de daño físico y lo empuja.' },
      { id: 'fot_w', key: 'W', name: 'Desplazamiento temporal', icon: '⏳', cost: [60, 60, 60, 60, 60], cd: [22, 20, 18, 16, 14], range: 0,
        ai: 'rewind',
        desc: 'Rebobina su propio tiempo: vuelve a donde estaba hace 3 s y recupera la vida que tenía entonces (+40/60/80/100/120).', heal: [40, 60, 80, 100, 120] },
      { id: 'fot_e', key: 'E', name: 'Ovación de Oberon', icon: '🎭', cost: [50, 50, 50, 50, 50], cd: [16, 15, 14, 13, 12], range: 0, radius: 5,
        dur: [1.0, 1.1, 1.2, 1.3, 1.4], ai: 'taunt',
        desc: 'Un grito escénico provoca a los enemigos cercanos (5 m), que tienen que atacarle durante 1/1,1/1,2/1,3/1,4 s. Gana un 30 % de reducción de daño durante 3 s.' },
      { id: 'fot_r', key: 'R', name: 'Gran función', icon: '🕰️', cost: [100, 100, 100], cd: [80, 70, 60], range: 10, radius: 4.5,
        dmg: [200, 325, 450], ai: 'ultArea',
        desc: 'Detiene el tiempo en un área: los enemigos quedan congelados 1,5 s y, al reanudarse, Fotsor descarga 200/325/450 (+80 % AD) de daño mágico de fuego sobre cada uno.' },
    ],
    build: ['fang', 'boots', 'ember', 'heart', 'thorns', 'katana'],
    prio: [0, 2, 1],
  },

  yeslie: {
    id: 'yeslie',
    name: 'Yeslie Moonbloom',
    title: 'Hechicera de Isserin',
    role: 'Maga',
    melee: false,
    color: '#b78cff',
    quote: '«¡Ni una mancha, por favor!»',
    lore: 'Hechicera tiflin y prodigio del estudio. Dispara con su pistola de cristal y puede transformarse en dragón de plata.',
    base: { hp: 530, mp: 440, ad: 50, ap: 25, armor: 22, mr: 30, as: 0.64, range: 7.5, speed: 6.8, hpRegen: 2.4, mpRegen: 8 },
    growth: { hp: 86, mp: 52, ad: 2.6, ap: 7, armor: 3.4, mr: 1.0, as: 0.015 },
    passive: {
      id: 'yes_p', name: 'Prodigio del estudio', icon: '📖',
      desc: 'Cada tercer hechizo es una «página leída»: el siguiente hechizo no cuesta maná y se recarga un 40 % más rápido.',
    },
    abilities: [
      { id: 'yes_q', key: 'Q', name: 'Disparo de cristal', icon: '💎', cost: [40, 45, 50, 55, 60], cd: [5.5, 5, 4.5, 4, 3.5], range: 12,
        dmg: [65, 100, 135, 170, 205], ai: 'skillshot',
        desc: 'Dispara un proyectil de fuerza que golpea al primer enemigo: 65/100/135/170/205 (+70 % AP) de daño mágico. Si el objetivo está marcado por la Página arcana, explota en área con un 50 % de daño extra.' },
      { id: 'yes_w', key: 'W', name: 'Página arcana', icon: '📜', cost: [70, 75, 80, 85, 90], cd: [11, 10.5, 10, 9.5, 9], range: 10, radius: 3.2,
        dmg: [60, 95, 130, 165, 200], ai: 'area',
        desc: 'Lanza un hechizo de área: 60/95/130/165/200 (+40 % AP) de daño mágico, ralentiza un 40 % durante 2 s y marca a los enemigos durante 4 s.' },
      { id: 'yes_e', key: 'E', name: 'Pulcritud mágica', icon: '🫧', cost: [60, 60, 60, 60, 60], cd: [18, 16.5, 15, 13.5, 12], range: 6,
        ai: 'escape',
        desc: 'Un destello mágico la limpia: elimina todos los efectos negativos y la teletransporta 6 m hacia el cursor.' },
      { id: 'yes_r', key: 'R', name: 'Forma de dragón de plata', icon: '🐉', cost: [100, 100, 100], cd: [100, 85, 70], range: 0,
        hp: [300, 450, 600], ai: 'ultSelf',
        desc: 'Se transforma en dragón de plata durante 8 s: gana 300/450/600 de vida, velocidad, y su Q se convierte en un aliento helado en cono que hace un 30 % más de daño y ralentiza.' },
    ],
    build: ['tome', 'crystal', 'boots', 'moon', 'staff', 'cloak'],
  },

  astrid: {
    id: 'astrid',
    name: 'Astrid',
    title: 'Francotiradora de Berk',
    role: 'Tiradora',
    melee: false,
    color: '#5ec8ff',
    quote: '«Un disparo. Una leyenda».',
    lore: 'Guerrera vikinga exiliada de Berk convertida en francotiradora, con un rifle de Gravenfort que dispara balas de electrum.',
    base: { hp: 550, mp: 320, ad: 62, ap: 0, armor: 24, mr: 30, as: 0.72, range: 8.5, speed: 6.8, hpRegen: 2.6, mpRegen: 6 },
    growth: { hp: 90, mp: 38, ad: 3.8, ap: 0, armor: 3.6, mr: 1.0, as: 0.025 },
    passive: {
      id: 'ast_p', name: 'Ojo de Gravenfort', icon: '🎯',
      desc: 'Sus ataques básicos hacen hasta un 25 % más de daño cuanto más lejos está el objetivo.',
    },
    abilities: [
      { id: 'ast_q', key: 'Q', name: 'Doble pistola', icon: '🔫', cost: [30, 35, 40, 45, 50], cd: [7, 6.5, 6, 5.5, 5], range: 5.5,
        dmg: [45, 70, 95, 120, 145], ai: 'cone',
        desc: 'Dispara con ambas pistolas en un cono corto: 45/70/95/120/145 (+70 % AD) de daño físico. Cada enemigo alcanzado le da un 8 % de velocidad de ataque durante 4 s (máx. 5).' },
      { id: 'ast_w', key: 'W', name: 'Tácticas de la vikinga', icon: '🪓', cost: [50, 50, 50, 50, 50], cd: [14, 13, 12, 11, 10], range: 11,
        amp: [12, 14, 16, 18, 20], ai: 'mark',
        desc: 'Marca al enemigo más cercano al cursor durante 4 s: recibe un 12/14/16/18/20 % más de daño de todas las fuentes.' },
      { id: 'ast_e', key: 'E', name: 'Carga de Berk', icon: '🐗', cost: [60, 60, 60, 60, 60], cd: [16, 15, 14, 13, 12], range: 7,
        dmg: [50, 80, 110, 140, 170], ai: 'escape',
        desc: 'Embiste hacia el cursor. El primer enemigo alcanzado recibe 50/80/110/140/170 (+50 % AD) de daño y sale despedido.' },
      { id: 'ast_r', key: 'R', name: 'Bala de electrum', icon: '⚡', cost: [100, 100, 100], cd: [70, 60, 50], range: 40,
        dmg: [250, 400, 550], ai: 'snipe',
        desc: 'Se apoya, apunta 0,8 s y dispara una bala de electrum que atraviesa súbditos y alcanza al primer héroe o estructura: 250/400/550 (+100 % AD) de daño físico y un rayo en cadena a 3 enemigos cercanos.' },
    ],
    build: ['scope', 'trigger', 'feather', 'fang', 'katana', 'scope'],
  },

  kouji: {
    id: 'kouji',
    glb: { url: 'models/heroes/kouji.glb', height: 2.3, anims: { idle: 'Idle', walk: 'Run', attack: 'Attack', death: 'Death' }, attackTime: 0.45 }, // Hunyuan3D-2 + tools/blender/ia_heroe.py
    name: 'Kouji Kitaeda',
    title: 'Cazador arcano del clan Kitaeda',
    role: 'Tirador',
    melee: false,
    color: '#3fd8d0',
    attackColor: 0x6ff6ff,
    quote: '«Una buena flecha vale más que cien promesas».',
    lore: 'Artesano de Ner y capitán de los Blood Hawks. Forja e imbuye sus propias flechas y nunca deja de estudiar algo nuevo.',
    base: { hp: 545, mp: 330, ad: 60, ap: 0, armor: 24, mr: 30, as: 0.7, range: 8, speed: 6.9, hpRegen: 2.6, mpRegen: 6 },
    growth: { hp: 88, mp: 38, ad: 3.6, ap: 0, armor: 3.5, mr: 1.0, as: 0.024 },
    passive: {
      id: 'kou_p', name: 'Puntas Kitaeda', icon: '🏹',
      desc: 'Cada tercer ataque básico dispara una flecha especial del clan: hace un 50 % de su daño de ataque como daño mágico extra y ralentiza un 30 % durante 1,5 s.',
    },
    abilities: [
      { id: 'kou_q', key: 'Q', name: 'Disparo curvo', icon: '🎯', cost: [35, 40, 45, 50, 55], cd: [7, 6.5, 6, 5.5, 5], range: 11,
        dmg: [60, 95, 130, 165, 200], ai: 'mark',
        desc: 'Una flecha arcana rodea a los súbditos y persigue al enemigo más cercano al cursor: 60/95/130/165/200 (+90 % AD) de daño físico y lo ralentiza un 30 % durante 1,5 s.' },
      { id: 'kou_w', key: 'W', name: 'Espíritu sanador', icon: '🍃', cost: [70, 75, 80, 85, 90], cd: [16, 15, 14, 13, 12], range: 9, radius: 3.5,
        heal: [15, 25, 35, 45, 55], ai: 'healZone',
        desc: 'Invoca un espíritu de la naturaleza durante 4 s: los aliados en su área se curan 15/25/35/45/55 (+10 % AP) por segundo y ganan un 15 % de velocidad.' },
      { id: 'kou_e', key: 'E', name: 'Velo de la naturaleza', icon: '🌫️', cost: [50, 50, 50, 50, 50], cd: [16, 15, 14, 13, 12], range: 6,
        ai: 'escape',
        desc: 'Se envuelve en hojas y salta hacia el cursor. Su siguiente ataque básico es un golpe crítico garantizado.' },
      { id: 'kou_r', key: 'R', name: 'Flecha de trueno', icon: '🌩️', cost: [100, 100, 100], cd: [80, 70, 60], range: 24,
        dmg: [200, 320, 440], ai: 'lineUlt',
        desc: 'Tensa el arco 0,5 s y suelta una gran flecha de trueno que atraviesa a todos los enemigos en línea: 200/320/440 (+90 % AD) de daño físico. Al final del recorrido estalla en una tormenta que aturde 1 s.' },
    ],
    build: ['scope', 'trigger', 'boots', 'katana', 'feather', 'fang'],
    prio: [0, 2, 1],
  },

  grimdarkus: {
    id: 'grimdarkus',
    glb: { url: 'models/heroes/grimdarkus.glb', height: 2.3, anims: { idle: 'Idle', walk: 'Run', attack: 'Attack', death: 'Death' }, attackTime: 0.45 }, // Hunyuan3D-2 + tools/blender/ia_heroe.py
    name: 'Grimdarkus II',
    title: 'Emperador de Aurane · El Prodigio de Terra Mortis',
    role: 'Tanque',
    melee: true,
    color: '#8f9bc8',
    attackColor: 0x9fb0ff,
    quote: '«Aurane no se arrodilla».',
    lore: 'Clérigo oscuro y emperador de Aurane. Fue enemigo de los Blood Hawks y hoy lucha a su lado con el cubo azul de Lucavi.',
    base: { hp: 720, mp: 290, ad: 60, ap: 10, armor: 40, mr: 34, as: 0.62, range: 2.7, speed: 6.8, hpRegen: 3.4, mpRegen: 5.5 },
    growth: { hp: 110, mp: 36, ad: 3.2, ap: 3, armor: 4.6, mr: 1.8, as: 0.014 },
    passive: {
      id: 'gri_p', name: 'Señor de Terra Mortis', icon: '🦬',
      desc: 'Gana 6 de armadura y de resistencia mágica por cada héroe enemigo a menos de 8 m (máximo 4).',
    },
    abilities: [
      { id: 'gri_q', key: 'Q', name: 'Golpe del cuerno', icon: '🐂', cost: [45, 50, 55, 60, 65], cd: [11, 10.5, 10, 9.5, 9], range: 6,
        dmg: [60, 100, 140, 180, 220], ai: 'gapclose',
        desc: 'Embiste con el cuerno del yelmo: el primer enemigo alcanzado recibe 60/100/140/180/220 (+6 % de su vida máx.) de daño físico y queda aturdido 1 s.' },
      { id: 'gri_w', key: 'W', name: 'Plegaria oscura', icon: '🌑', cost: [50, 55, 60, 65, 70], cd: [14, 13, 12, 11, 10], range: 0, radius: 3.5,
        dmg: [20, 30, 40, 50, 60], dr: [20, 22, 24, 26, 28], ai: 'selfFight',
        desc: 'Se rodea de sombras durante 4 s: recibe un 20/22/24/26/28 % menos de daño y los enemigos cercanos sufren 20/30/40/50/60 (+2 % de su vida máx.) de daño mágico por segundo.' },
      { id: 'gri_e', key: 'E', name: 'Legión de Aurane', icon: '🛡️', cost: [70, 70, 70, 70, 70], cd: [18, 17, 16, 15, 14], range: 8, radius: 4,
        dmg: [50, 80, 110, 140, 170], ai: 'area',
        desc: 'Invoca una fila de caballeros negros que empujan a los enemigos, les infligen 50/80/110/140/170 (+40 % AP) de daño mágico y los ralentizan un 40 % durante 2 s.' },
      { id: 'gri_r', key: 'R', name: 'Cubo azul de Lucavi', icon: '🧊', cost: [100, 100, 100], cd: [100, 85, 70], range: 0, radius: 7,
        shield: [150, 250, 350], ai: 'ultDome',
        desc: 'Activa el cubo y levanta una cúpula de cristal azul durante 4 s: los aliados dentro reciben un escudo de 150/250/350 (+10 % de su vida máx.) y los enemigos dentro quedan ralentizados un 40 % y no pueden salir.' },
    ],
    build: ['shield', 'boots', 'heart', 'aegis', 'thorns', 'cloak'],
    prio: [0, 1, 2],
  },

  ikaruus: {
    id: 'ikaruus',
    glb: { url: 'models/heroes/ikaruus.glb', height: 2.3, anims: { idle: 'Idle', walk: 'Run', attack: 'Attack', death: 'Death' }, attackTime: 0.45 }, // Hunyuan3D-2 + tools/blender/ia_heroe.py
    name: 'Ikaruus Rukhu',
    title: 'Samurái de Kugane',
    role: 'Asesino',
    melee: true,
    color: '#ff7a9a',
    attackColor: 0xffb0c8,
    quote: '«El cerezo florece una vez; la hoja, cuantas haga falta».',
    lore: 'Samurái semielfo de Kugane, de pelo y ojos rojos. Combina el filo de la flor de cerezo, la luna y el hielo con el fuego de cuatro bestias, y busca redimirse de su pasado.',
    base: { hp: 580, mp: 280, ad: 68, ap: 0, armor: 28, mr: 30, as: 0.72, range: 2.6, speed: 7.3, hpRegen: 2.8, mpRegen: 6 },
    growth: { hp: 92, mp: 32, ad: 4.2, ap: 0, armor: 3.4, mr: 1.2, as: 0.022 },
    passive: {
      id: 'ika_p', name: 'Filo del cerezo', icon: '🌸',
      desc: 'Tras lanzar una habilidad, su siguiente ataque básico desata una lluvia de pétalos: hace un 60 % de su daño de ataque como daño mágico extra.',
    },
    abilities: [
      { id: 'ika_q', key: 'Q', name: 'Corte de luna creciente', icon: '🌙', cost: [30, 30, 30, 30, 30], cd: [8, 7.5, 7, 6.5, 6], range: 6,
        dmg: [70, 105, 140, 175, 210], ai: 'gapclose',
        desc: 'Atraviesa a los enemigos en línea recta con un corte: 70/105/140/175/210 (+90 % AD) de daño físico a todos los que toca. Si mata a un héroe, la habilidad se recarga al instante.' },
      { id: 'ika_w', key: 'W', name: 'Aliento de escarcha', icon: '❄️', cost: [50, 55, 60, 65, 70], cd: [10, 9.5, 9, 8.5, 8], range: 5,
        dmg: [50, 80, 110, 140, 170], ai: 'cone',
        desc: 'Un tajo helado en abanico: 50/80/110/140/170 (+60 % AD) de daño mágico y ralentiza un 50 % durante 1,5 s.' },
      { id: 'ika_e', key: 'E', name: 'Danza de pétalos', icon: '🍃', cost: [60, 60, 60, 60, 60], cd: [16, 15, 14, 13, 12], range: 7,
        ai: 'engage',
        desc: 'Se deshace en pétalos y reaparece a la espalda del enemigo más cercano al cursor. Recibe un 25 % menos de daño durante 1,5 s.' },
      { id: 'ika_r', key: 'R', name: 'Las cuatro bestias', icon: '🐉', cost: [100, 100, 100], cd: [90, 75, 60], range: 8, radius: 3.8,
        dmg: [70, 110, 150], ai: 'ultArea',
        desc: 'Desata cuatro ráfagas de fuego sobre un área: el tigre golpea, el fénix quema, el dragón aturde 0,75 s y la tortuga le da un escudo. Cada bestia hace 70/110/150 (+50 % AD) de daño mágico.' },
    ],
    build: ['katana', 'boots', 'fang', 'scope', 'heart', 'thorns'],
    prio: [0, 1, 2],
  },

  crixus: {
    id: 'crixus',
    name: 'Crixus',
    title: 'Caballero de la muerte de Komódo',
    role: 'Luchador',
    melee: true,
    color: '#5fd38a',
    attackColor: 0x8affb0,
    quote: '«Lady Evangeline tiene hambre».',
    lore: 'Caballero de la muerte con armadura completa de Komódo. Su espada, Lady Evangeline, arde con fuego y necrosis, roba vida y pega más fuerte cuanto más herido está.',
    base: { hp: 650, mp: 260, ad: 64, ap: 0, armor: 34, mr: 32, as: 0.66, range: 2.7, speed: 7.0, hpRegen: 3.0, mpRegen: 5 },
    growth: { hp: 104, mp: 32, ad: 3.9, ap: 0, armor: 4.0, mr: 1.5, as: 0.018 },
    passive: {
      id: 'cri_p', name: 'Lady Evangeline', icon: '🗡️',
      desc: 'Sus ataques básicos hacen hasta un 30 % más de daño y le curan hasta un 30 % de su daño de ataque cuanto menos vida le queda.',
    },
    abilities: [
      { id: 'cri_q', key: 'Q', name: 'Tajo necrótico', icon: '☠️', cost: [35, 35, 35, 35, 35], cd: [7, 6.5, 6, 5.5, 5], range: 3.8,
        dmg: [60, 95, 130, 165, 200], ai: 'cone',
        desc: 'Un barrido de fuego y necrosis: 60/95/130/165/200 (+100 % AD) de daño físico en abanico. Se cura un 30 % del daño hecho a héroes.' },
      { id: 'cri_w', key: 'W', name: 'Armadura de Komódo', icon: '🛡️', cost: [50, 55, 60, 65, 70], cd: [15, 14, 13, 12, 11], range: 0,
        shield: [80, 120, 160, 200, 240], ai: 'selfFight',
        desc: 'Su armadura arde: gana un escudo de 80/120/160/200/240 (+10 % de su vida máx.) y un 30 % de velocidad de ataque durante 4 s.' },
      { id: 'cri_e', key: 'E', name: 'Cadenas de fuego', icon: '⛓️', cost: [60, 60, 60, 60, 60], cd: [15, 14, 13, 12, 11], range: 9,
        dmg: [50, 80, 110, 140, 170], ai: 'skillshot',
        desc: 'Lanza una cadena ardiente. Si atrapa a un enemigo le hace 50/80/110/140/170 (+50 % AD) de daño mágico, lo inmoviliza 0,8 s y Crixus se lanza hacia él.' },
      { id: 'cri_r', key: 'R', name: 'Último aliento', icon: '💀', cost: [100, 100, 100], cd: [100, 85, 70], range: 0,
        ad: [30, 50, 70], ai: 'ultLow',
        desc: 'Durante 5 s no puede bajar de 1 de vida y gana 30/50/70 de daño de ataque. Al terminar se cura un 40 % del daño que hizo mientras tanto.' },
    ],
    build: ['fang', 'boots', 'heart', 'katana', 'thorns', 'aegis'],
    prio: [0, 2, 1],
  },

  legna: {
    id: 'legna',
    name: 'Legna',
    title: 'Clérigo de la protección · Elegido de Astora',
    role: 'Soporte',
    melee: false,
    color: '#9ff0c8',
    attackColor: 0xd8fff0,
    quote: '«Astora me eligió para que nadie caiga solo».',
    lore: 'Joven clérigo humano del dominio de la protección, elegido por la diosa Astora para sanar a la Orden.',
    base: { hp: 540, mp: 420, ad: 48, ap: 20, armor: 24, mr: 32, as: 0.62, range: 6.5, speed: 6.9, hpRegen: 2.6, mpRegen: 8 },
    growth: { hp: 86, mp: 50, ad: 2.4, ap: 6, armor: 3.4, mr: 1.2, as: 0.012 },
    passive: {
      id: 'leg_p', name: 'Luz de Astora', icon: '☀️',
      desc: 'Los héroes aliados a menos de 7 m recuperan 2 (+0,4 por nivel) de vida por segundo.',
    },
    abilities: [
      { id: 'leg_q', key: 'Q', name: 'Rayo sagrado', icon: '🔆', cost: [40, 45, 50, 55, 60], cd: [6, 5.5, 5, 4.5, 4], range: 11,
        dmg: [55, 90, 125, 160, 195], ai: 'skillshot',
        desc: 'Dispara un rayo de luz que golpea al primer enemigo: 55/90/125/160/195 (+60 % AP) de daño mágico.' },
      { id: 'leg_w', key: 'W', name: 'Égida de Bhia', icon: '🔰', cost: [60, 65, 70, 75, 80], cd: [12, 11, 10, 9, 8], range: 9,
        shield: [70, 110, 150, 190, 230], ai: 'shieldAlly',
        desc: 'Protege al aliado más cercano al cursor (o a sí mismo) con un escudo de 70/110/150/190/230 (+50 % AP) durante 3 s y un 20 % de velocidad.' },
      { id: 'leg_e', key: 'E', name: 'Santuario', icon: '⛪', cost: [70, 70, 70, 70, 70], cd: [16, 15, 14, 13, 12], range: 9, radius: 3,
        dmg: [50, 80, 110, 140, 170], ai: 'area',
        desc: 'Marca un círculo sagrado que, tras 0,5 s, inmoviliza 1 s a los enemigos dentro y les hace 50/80/110/140/170 (+40 % AP) de daño mágico.' },
      { id: 'leg_r', key: 'R', name: 'Bendición de Astora', icon: '🕊️', cost: [100, 100, 100], cd: [110, 95, 80], range: 0, radius: 14,
        heal: [150, 250, 350], ai: 'ultHealAll',
        desc: 'Astora responde: cura 150/250/350 (+50 % AP) a todos los héroes aliados a menos de 14 m, les quita los efectos negativos y reciben un 25 % menos de daño durante 2 s.' },
    ],
    build: ['tome', 'tear', 'boots', 'crystal', 'aegis', 'staff'],
    prio: [1, 0, 2],
  },

  catarina: {
    id: 'catarina',
    name: 'Catarina Fersen',
    title: 'Emperatriz de Kugane · Guerrera de hielo',
    role: 'Maga',
    melee: false,
    color: '#a8d8ff',
    attackColor: 0xcfeeff,
    quote: '«El hielo no perdona, pero tampoco olvida».',
    lore: 'Guerrera de hielo de la familia Fersen de Linerian y hoy Emperatriz de Kugane.',
    base: { hp: 525, mp: 430, ad: 50, ap: 25, armor: 22, mr: 30, as: 0.64, range: 7.2, speed: 6.8, hpRegen: 2.4, mpRegen: 8 },
    growth: { hp: 86, mp: 52, ad: 2.6, ap: 7, armor: 3.4, mr: 1.0, as: 0.015 },
    passive: {
      id: 'cat_p', name: 'Corazón de escarcha', icon: '💠',
      desc: 'Sus habilidades acumulan escarcha en los enemigos. Con 3 cargas, el objetivo queda congelado 1 s (una vez cada 6 s por objetivo).',
    },
    abilities: [
      { id: 'cat_q', key: 'Q', name: 'Lanza de hielo', icon: '🧊', cost: [40, 45, 50, 55, 60], cd: [6, 5.5, 5, 4.5, 4], range: 12,
        dmg: [60, 95, 130, 165, 200], ai: 'skillshot',
        desc: 'Lanza una lanza de hielo que atraviesa a todos los enemigos en línea: 60/95/130/165/200 (+65 % AP) de daño mágico y un 30 % de ralentización durante 1,5 s.' },
      { id: 'cat_w', key: 'W', name: 'Tormenta helada', icon: '🌨️', cost: [70, 75, 80, 85, 90], cd: [13, 12, 11, 10, 9], range: 10, radius: 3.5,
        dmg: [25, 40, 55, 70, 85], ai: 'area',
        desc: 'Una ventisca cubre un área durante 3 s: los enemigos dentro sufren 25/40/55/70/85 (+15 % AP) de daño mágico por segundo y quedan ralentizados un 35 %.' },
      { id: 'cat_e', key: 'E', name: 'Paso glacial', icon: '⛸️', cost: [55, 55, 55, 55, 55], cd: [16, 15, 14, 13, 12], range: 6,
        shield: [50, 80, 110, 140, 170], ai: 'escape',
        desc: 'Se desliza sobre el hielo hacia el cursor y gana un escudo de 50/80/110/140/170 (+30 % AP) durante 2 s.' },
      { id: 'cat_r', key: 'R', name: 'Invierno de Linerian', icon: '🏔️', cost: [100, 100, 100], cd: [90, 75, 60], range: 12, radius: 6,
        dmg: [220, 340, 460], ai: 'ultArea',
        desc: 'Invoca el invierno: tras 1 s, un glaciar cae sobre un área enorme y hace 220/340/460 (+80 % AP) de daño mágico y aturde 1,5 s a los enemigos.' },
    ],
    build: ['tome', 'crystal', 'boots', 'moon', 'staff', 'cloak'],
    prio: [0, 1, 2],
  },
};

// ---------------------------------------------------------------------------
// MODELOS 3D DE LOS HÉROES
// ---------------------------------------------------------------------------
// Personajes de los packs gratuitos de KayKit (Kay Lousberg, CC0), recortados y
// comprimidos en models/kaykit/. Cada archivo trae todas las armas y accesorios:
// cada héroe enseña solo los suyos ('show') y se le cambian los colores ('tint',
// por nombre de pieza; el color multiplica la textura). Si un héroe tiene su propio
// modelo en models/heroes/<id>.glb, basta con cambiar aquí su entrada.
const KAYKIT_PARTS = {
  knight: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet', 'Knight_Cape'],
  mage: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
  rogue: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
  rogue_hooded: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
  barbarian: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat', 'Barbarian_Cape'],
  skeleton_warrior: ['Skeleton_Warrior_Helmet', 'Skeleton_Warrior_Cloak'],
  skeleton_minion: ['Skeleton_Minion_Cloak'],
  skeleton_mage: ['Skeleton_Mage_Hat'],
};
function kaykit(base, show, attack, o = {}) {
  return {
    url: `models/kaykit/${base}.glb`,
    height: o.height ?? 2.3,
    hide: KAYKIT_PARTS[base].filter((p) => !show.includes(p)),
    anims: { idle: 'Idle', walk: 'Running_A', attack, death: 'Death_A' },
    attackTime: o.attackTime ?? 0.45,
    tint: o.tint,
    keep: o.keep,
    slim: o.slim ?? true, // proporciones esbeltas (ver SLIM en models.js)
  };
}
const glow = (color, ei = 0.8) => ({ color, emissive: color, ei });
const solid = (color) => ({ color, solid: true });

export const HERO_MODELS = {
  josephine: kaykit('knight', ['1H_Sword', 'Round_Shield', 'Knight_Cape'], '1H_Melee_Attack_Slice_Diagonal', {
    tint: { Knight_Cape: solid(0x3a5ad0), Knight_Body: { color: 0xfff1d8 }, Round_Shield: { color: 0xffe9a8 }, '1H_Sword': glow(0xfff2c0, 0.25) } }),
  fotsor: kaykit('skeleton_warrior', ['Skeleton_Warrior_Cloak'], 'Unarmed_Melee_Attack_Punch_A', {
    tint: { Skeleton_Warrior_Cloak: solid(0x7a1626), Skeleton_Warrior_Eyes: glow(0xff6a00, 2) },
    keep: [{ part: 'flames', bone: 'head', pos: [0, 0.45, 0], scale: 2.0 }] }),
  yeslie: kaykit('mage', ['1H_Wand', 'Spellbook_open', 'Mage_Hat', 'Mage_Cape'], 'Spellcast_Shoot', {
    tint: { Mage_Body: solid(0xf2f0f8), Mage_ArmLeft: solid(0xf2f0f8), Mage_ArmRight: solid(0xf2f0f8), Mage_Cape: solid(0x1e1b26), Mage_Hat: solid(0x7a3fb0), '1H_Wand': glow(0x7ff6ff, 1.2) } }),
  astrid: kaykit('rogue', ['2H_Crossbow', 'Rogue_Cape'], '2H_Ranged_Shoot', {
    tint: { Rogue_Body: solid(0x4a3428), Rogue_ArmLeft: solid(0x5a3e2b), Rogue_ArmRight: solid(0x5a3e2b), Rogue_LegLeft: solid(0x3a2a20), Rogue_LegRight: solid(0x3a2a20), Rogue_Cape: solid(0x2a4aa8), '2H_Crossbow': { color: 0x9aa0b0 } } }),
  kouji: kaykit('rogue_hooded', ['1H_Crossbow', 'Rogue_Cape'], '1H_Ranged_Shoot', {
    tint: { Rogue_Body: solid(0x7a5030), Rogue_ArmLeft: solid(0x6a4428), Rogue_ArmRight: solid(0x6a4428), Rogue_Cape: solid(0xc07a30), '1H_Crossbow': glow(0x6ae8ff, 0.4) } }),
  grimdarkus: kaykit('knight', ['1H_Sword', 'Spike_Shield', 'Knight_Helmet', 'Knight_Cape'], '1H_Melee_Attack_Slice_Diagonal', {
    height: 2.5,
    tint: { '*': { color: 0x5a5662 }, Knight_Cape: solid(0xe8e2d0), Spike_Shield: { color: 0x3a3a44 } } }),
  ikaruus: kaykit('rogue', ['Knife', 'Knife_Offhand'], 'Dualwield_Melee_Attack_Slice', {
    tint: { Rogue_Body: solid(0xf4f0ea), Rogue_ArmLeft: solid(0xf4f0ea), Rogue_ArmRight: solid(0xf4f0ea), Rogue_LegLeft: solid(0x22222a), Rogue_LegRight: solid(0x22222a), Knife: glow(0xffd0e0, 0.4), Knife_Offhand: glow(0xffd0e0, 0.4) } }),
  crixus: kaykit('barbarian', ['2H_Axe', 'Barbarian_Cape'], '2H_Melee_Attack_Chop', {
    tint: { '*': { color: 0x5a6a62 }, Barbarian_Cape: solid(0x2a2a2e), '2H_Axe': glow(0x60ff90, 0.6) } }),
  legna: kaykit('mage', ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], 'Spellcast_Shoot', {
    tint: { Mage_Body: solid(0xfffaf0), Mage_ArmLeft: solid(0xfffaf0), Mage_ArmRight: solid(0xfffaf0), Mage_Cape: solid(0x3a6ad0), Mage_Hat: solid(0xe0b33c), '2H_Staff': glow(0xffe08a, 0.6) } }),
  catarina: kaykit('knight', ['2H_Sword', 'Knight_Cape'], '2H_Melee_Attack_Slice', {
    tint: { Knight_Body: solid(0xcfe6ff), Knight_ArmLeft: solid(0xcfe6ff), Knight_ArmRight: solid(0xcfe6ff), Knight_Cape: solid(0xffffff), '2H_Sword': glow(0x9af0ff, 1.0) } }),
};

export const DIFFICULTY = {
  facil: { name: 'Fácil', dmg: 0.72, think: 0.45, gold: 0.8 },
  normal: { name: 'Normal', dmg: 1.0, think: 0.22, gold: 1.0 },
  dificil: { name: 'Difícil', dmg: 1.15, think: 0.14, gold: 1.2 },
};

// Modelos .glb opcionales para todo lo que no es un héroe (los de los héroes van en
// el campo 'glb' de cada uno). Mismo formato que el 'glb' de Fotsor; null = modelo
// hecho con formas básicas. Ver models/LEEME.md.
export const MODEL_GLB = {
  minion_blue_melee: kaykit('knight', ['1H_Sword', 'Badge_Shield', 'Knight_Helmet'], '1H_Melee_Attack_Chop', { height: 1.6, tint: { '*': { color: 0xd8e2ff } } }),
  minion_blue_ranged: kaykit('mage', ['2H_Staff', 'Mage_Hat'], 'Spellcast_Shoot', { height: 1.6, tint: { Mage_Hat: solid(0x3a6ad0), '2H_Staff': glow(0xffe08a, 0.6) } }),
  minion_red_melee: kaykit('skeleton_minion', ['Skeleton_Minion_Cloak'], '1H_Melee_Attack_Chop', { height: 1.6, tint: { Skeleton_Minion_Cloak: solid(0x5a1020), Skeleton_Minion_Eyes: glow(0xff2030, 2) } }),
  minion_red_ranged: kaykit('skeleton_mage', ['Skeleton_Mage_Hat'], 'Spellcast_Shoot', { height: 1.6, tint: { Skeleton_Mage_Hat: solid(0x5a1a80), Skeleton_Mage_Eyes: glow(0xd040ff, 2) } }),
  tower_blue: null,          // torre de los Blood Hawks (sin animaciones)
  tower_red: null,           // obelisco de la Legión
  nexus: null,               // Santuario (base de los Blood Hawks)
  boss: null,                // Altar (base de la Legión)
};

// Los héroes usan sus modelos propios de estilo anime (js/heroes.js). Para volver a
// los de KayKit, descomenta la línea de abajo.
// for (const [id, spec] of Object.entries(HERO_MODELS)) HEROES[id].glb = spec;

export const HERO_ORDER = ['josephine', 'fotsor', 'yeslie', 'astrid', 'kouji', 'grimdarkus', 'ikaruus', 'crixus', 'legna', 'catarina'];

// ---------------------------------------------------------------------------
// OBJETOS (tienda)
// ---------------------------------------------------------------------------
// 'cat' agrupa los objetos en la tienda. Estadísticas especiales:
//   lifesteal  robo de vida en ataques básicos (0,12 = 12 %)
//   crit       probabilidad de crítico (los críticos hacen 175 %)
//   arpen/mpen ignora ese porcentaje de armadura / resistencia mágica (máx. 60 %)
//   onhit      daño mágico extra en cada ataque básico
//   thorns     devuelve ese porcentaje del daño de ataques básicos recibido
//   healpow    potencia las curaciones y los escudos que das
export const ITEMS = {
  potion: { id: 'potion', cat: 'Consumibles', name: 'Poción de Astora', icon: '🧪', cost: 50, consumable: true,
    desc: 'Recupera 160 de vida en 10 s. Se usa con la tecla 1.' },

  sword: { id: 'sword', cat: 'Ataque', name: 'Espada de Eaglere', icon: '🗡️', cost: 875, stats: { ad: 24 },
    desc: '+24 de daño de ataque.' },
  fang: { id: 'fang', cat: 'Ataque', name: 'Colmillo de Cadalíz', icon: '🦷', cost: 900, stats: { ad: 18, lifesteal: 0.12 },
    desc: '+18 de daño de ataque. Tus ataques básicos te curan un 12 % del daño que hacen.' },
  trigger: { id: 'trigger', cat: 'Ataque', name: 'Gatillo de Gravenfort', icon: '⚙️', cost: 950, stats: { as: 0.28 },
    desc: '+28 % de velocidad de ataque.' },
  scope: { id: 'scope', cat: 'Ataque', name: 'Mira de Gravenfort', icon: '🔭', cost: 1000, stats: { crit: 0.25, as: 0.12 },
    desc: '+25 % de probabilidad de crítico (175 % de daño) y +12 % de velocidad de ataque.' },
  ember: { id: 'ember', cat: 'Ataque', name: 'Brasa de Terra Mortis', icon: '🌋', cost: 1000, stats: { onhit: 22, as: 0.15 },
    desc: 'Tus ataques básicos queman: +22 de daño mágico por golpe y +15 % de velocidad de ataque.' },
  katana: { id: 'katana', cat: 'Ataque', name: 'Katana de Kugane', icon: '⚔️', cost: 1300, stats: { ad: 32, arpen: 0.25 },
    desc: '+32 de daño de ataque. Tu daño físico ignora el 25 % de la armadura.' },

  tome: { id: 'tome', cat: 'Magia', name: 'Tomo de Linerian', icon: '📕', cost: 850, stats: { ap: 45 },
    desc: '+45 de poder mágico.' },
  crystal: { id: 'crystal', cat: 'Magia', name: 'Cristal de Astora', icon: '🔷', cost: 800, stats: { mp: 250, cdr: 0.12 },
    desc: '+250 de maná y 12 % de reducción de enfriamiento.' },
  moon: { id: 'moon', cat: 'Magia', name: 'Orbe de Izliad', icon: '🌙', cost: 1300, stats: { ap: 55, mpen: 0.25 },
    desc: '+55 de poder mágico. Tu daño mágico ignora el 25 % de la resistencia mágica.' },
  staff: { id: 'staff', cat: 'Magia', name: 'Báculo de Felnelath', icon: '🔮', cost: 1400, stats: { ap: 70, mp: 200, cdr: 0.10 },
    desc: '+70 de poder mágico, +200 de maná y 10 % de reducción de enfriamiento.' },

  shield: { id: 'shield', cat: 'Defensa', name: 'Escudo de Zugri', icon: '🛡️', cost: 900, stats: { armor: 40, hp: 200 },
    desc: '+40 de armadura y +200 de vida.' },
  cloak: { id: 'cloak', cat: 'Defensa', name: 'Capa de Flavenia', icon: '🧣', cost: 850, stats: { mr: 40, hp: 200 },
    desc: '+40 de resistencia mágica y +200 de vida.' },
  heart: { id: 'heart', cat: 'Defensa', name: 'Corazón de Komódo', icon: '❤️‍🔥', cost: 1100, stats: { hp: 450, hpRegen: 4 },
    desc: '+450 de vida y +4 de regeneración de vida.' },
  thorns: { id: 'thorns', cat: 'Defensa', name: 'Cota de espinas de Ner', icon: '🌵', cost: 1150, stats: { armor: 50, thorns: 0.25 },
    desc: '+50 de armadura. Quien te golpee con ataques básicos recibe el 25 % de ese daño como daño mágico.' },
  aegis: { id: 'aegis', cat: 'Defensa', name: 'Égida de San Edimo', icon: '🔰', cost: 1600, stats: { armor: 45, mr: 35, hp: 250 },
    desc: '+45 de armadura, +35 de resistencia mágica y +250 de vida.' },

  boots: { id: 'boots', cat: 'Utilidad', name: 'Botas de Isserin', icon: '👢', cost: 600, stats: { speed: 1.0 },
    desc: '+1 de velocidad de movimiento.' },
  feather: { id: 'feather', cat: 'Utilidad', name: 'Pluma de Blood Hawk', icon: '🦅', cost: 1000, stats: { speed: 1.4, as: 0.10 },
    desc: '+1,4 de velocidad de movimiento y +10 % de velocidad de ataque.' },
  tear: { id: 'tear', cat: 'Utilidad', name: 'Lágrima de Astora', icon: '💧', cost: 1100, stats: { hp: 250, hpRegen: 3, healpow: 0.25 },
    desc: '+250 de vida y +3 de regeneración. Tus curaciones y escudos son un 25 % más fuertes.' },
};

// ---------------------------------------------------------------------------
// COMBINACIONES: componentes básicos -> objetos -> legendarios
// ---------------------------------------------------------------------------
// tier 1: componentes baratos; tier 2: los objetos de siempre (se construyen con
// componentes); tier 3: legendarios (combinan dos objetos). Al comprar, los
// componentes que ya tienes se gastan y rebajan el precio.
Object.assign(ITEMS, {
  longsword: { id: 'longsword', cat: 'Ataque', name: 'Hoja de Zugri', icon: '🔪', cost: 350, stats: { ad: 12 }, desc: '+12 de daño de ataque.' },
  dagger: { id: 'dagger', cat: 'Ataque', name: 'Daga de Isserin', icon: '🗡️', cost: 300, stats: { as: 0.12 }, desc: '+12 % de velocidad de ataque.' },
  gloves: { id: 'gloves', cat: 'Ataque', name: 'Guantes de ladrón', icon: '🧤', cost: 400, stats: { crit: 0.12 }, desc: '+12 % de probabilidad de crítico.' },
  amp: { id: 'amp', cat: 'Magia', name: 'Grimorio de aprendiz', icon: '📘', cost: 435, stats: { ap: 20 }, desc: '+20 de poder mágico.' },
  charm: { id: 'charm', cat: 'Magia', name: 'Amuleto de hada', icon: '🧿', cost: 300, stats: { cdr: 0.05 }, desc: '5 % de reducción de enfriamiento.' },
  sapphire: { id: 'sapphire', cat: 'Magia', name: 'Zafiro de maná', icon: '💠', cost: 350, stats: { mp: 250 }, desc: '+250 de maná.' },
  ruby: { id: 'ruby', cat: 'Defensa', name: 'Rubí de Komódo', icon: '🔴', cost: 400, stats: { hp: 150 }, desc: '+150 de vida.' },
  cloth: { id: 'cloth', cat: 'Defensa', name: 'Cota ligera', icon: '🦺', cost: 300, stats: { armor: 15 }, desc: '+15 de armadura.' },
  nullmantle: { id: 'nullmantle', cat: 'Defensa', name: 'Manto antimagia', icon: '🧥', cost: 450, stats: { mr: 25 }, desc: '+25 de resistencia mágica.' },

  bladeDivine: { id: 'bladeDivine', cat: 'Ataque', name: 'Espada sagrada de Eaglere', icon: '⚜️', cost: 2900, stats: { ad: 45, crit: 0.25, as: 0.2 }, desc: '+45 de daño de ataque, +25 % de crítico y +20 % de velocidad de ataque.' },
  stormbow: { id: 'stormbow', cat: 'Ataque', name: 'Arco tormenta de Gravenfort', icon: '🏹', cost: 2800, stats: { as: 0.55, onhit: 40 }, desc: '+55 % de velocidad de ataque y +40 de daño mágico por golpe.' },
  acidfang: { id: 'acidfang', cat: 'Ataque', name: 'Colmillo del dragón ácido', icon: '🐲', cost: 3200, stats: { ad: 55, lifesteal: 0.18, arpen: 0.3 }, desc: '+55 de daño de ataque, 18 % de robo de vida y 30 % de penetración de armadura.' },
  tigerclaw: { id: 'tigerclaw', cat: 'Ataque', name: 'Garra del tigre de Kugane', icon: '🐯', cost: 3300, stats: { ad: 60, crit: 0.3, arpen: 0.2 }, desc: '+60 de daño de ataque, +30 % de crítico y 20 % de penetración de armadura.' },
  archstaff: { id: 'archstaff', cat: 'Magia', name: 'Báculo del Mago Larg', icon: '🪄', cost: 3500, stats: { ap: 140, mpen: 0.35, cdr: 0.15 }, desc: '+140 de poder mágico, 35 % de penetración mágica y 15 % de reducción de enfriamiento.' },
  astoracrown: { id: 'astoracrown', cat: 'Magia', name: 'Corona de Astora', icon: '👑', cost: 2800, stats: { ap: 60, mp: 400, hp: 250, cdr: 0.2, healpow: 0.35 }, desc: '+60 de poder mágico, +400 de maná, +250 de vida, 20 % de reducción de enfriamiento y curaciones un 35 % más fuertes.' },
  sunorb: { id: 'sunorb', cat: 'Magia', name: 'Orbe del mediodía', icon: '🌞', cost: 3200, stats: { ap: 90, onhit: 35, as: 0.2 }, desc: '+90 de poder mágico, +35 de daño mágico por golpe y +20 % de velocidad de ataque.' },
  pandemonium: { id: 'pandemonium', cat: 'Magia', name: 'Velo del Pandemonio', icon: '🌀', cost: 2600, stats: { ap: 70, mr: 50, hp: 300 }, desc: '+70 de poder mágico, +50 de resistencia mágica y +300 de vida.' },
  sanctuary: { id: 'sanctuary', cat: 'Defensa', name: 'Égida del Santuario', icon: '🏛️', cost: 3500, stats: { armor: 70, mr: 55, hp: 700 }, desc: '+70 de armadura, +55 de resistencia mágica y +700 de vida.' },
  turtle: { id: 'turtle', cat: 'Defensa', name: 'Caparazón de la tortuga sagrada', icon: '🐢', cost: 2900, stats: { armor: 100, hp: 300, thorns: 0.4 }, desc: '+100 de armadura y +300 de vida. Devuelve el 40 % del daño de los ataques básicos.' },
  frosttear: { id: 'frosttear', cat: 'Defensa', name: 'Lágrima de la reina helada', icon: '❄️', cost: 3000, stats: { hp: 800, mp: 300, hpRegen: 8, healpow: 0.3 }, desc: '+800 de vida, +300 de maná, +8 de regeneración y curaciones un 30 % más fuertes.' },
  lotus: { id: 'lotus', cat: 'Defensa', name: 'Loto de jade', icon: '🪷', cost: 2600, stats: { mr: 60, hp: 300, cdr: 0.2 }, desc: '+60 de resistencia mágica, +300 de vida y 20 % de reducción de enfriamiento.' },
  hawkwings: { id: 'hawkwings', cat: 'Utilidad', name: 'Alas de Blood Hawk', icon: '🪽', cost: 2600, stats: { speed: 2.2, as: 0.45 }, desc: '+2,2 de velocidad de movimiento y +45 % de velocidad de ataque.' },
});
ITEMS.cloak.cost = 950;
const RECIPES = {
  sword: ['longsword', 'longsword'], fang: ['longsword', 'ruby'], trigger: ['dagger', 'dagger'], scope: ['gloves', 'dagger'],
  ember: ['dagger', 'amp'], katana: ['longsword', 'gloves'], tome: ['amp', 'charm'], crystal: ['sapphire', 'charm'],
  moon: ['amp', 'amp'], staff: ['amp', 'sapphire', 'charm'], shield: ['cloth', 'ruby'], cloak: ['nullmantle', 'ruby'],
  heart: ['ruby', 'ruby'], thorns: ['cloth', 'cloth'], aegis: ['shield', 'nullmantle'], feather: ['boots', 'dagger'], tear: ['ruby', 'sapphire'],
  bladeDivine: ['sword', 'scope'], stormbow: ['trigger', 'ember'], acidfang: ['fang', 'katana'], tigerclaw: ['katana', 'scope'],
  archstaff: ['staff', 'moon'], astoracrown: ['crystal', 'tear'], sunorb: ['moon', 'ember'], pandemonium: ['cloak', 'tome'],
  sanctuary: ['aegis', 'heart'], turtle: ['thorns', 'shield'], frosttear: ['tear', 'heart'], lotus: ['cloak', 'crystal'], hawkwings: ['feather', 'trigger'],
};
for (const [id, from] of Object.entries(RECIPES)) ITEMS[id].from = from;
for (const it of Object.values(ITEMS)) it.tier = it.consumable ? 0 : !it.from ? (it.id === 'boots' ? 2 : 1) : it.from.every((c) => ITEMS[c].from || c === 'boots') ? 3 : 2;
// en qué se convierte cada objeto
for (const it of Object.values(ITEMS)) it.into = Object.values(ITEMS).filter((o) => o.from?.includes(it.id)).map((o) => o.id);

export const SHOP_ORDER = ['potion',
  'longsword', 'dagger', 'gloves', 'amp', 'charm', 'sapphire', 'ruby', 'cloth', 'nullmantle',
  'sword', 'fang', 'trigger', 'scope', 'ember', 'katana', 'tome', 'crystal', 'moon', 'staff',
  'shield', 'cloak', 'heart', 'thorns', 'aegis', 'boots', 'feather', 'tear',
  'bladeDivine', 'stormbow', 'acidfang', 'tigerclaw', 'archstaff', 'astoracrown', 'sunorb', 'pandemonium',
  'sanctuary', 'turtle', 'frosttear', 'lotus', 'hawkwings'];

// ---------------------------------------------------------------------------
// SÚBDITOS Y ESTRUCTURAS
// ---------------------------------------------------------------------------
export const MINIONS = {
  melee: { hp: 460, ad: 14, armor: 4, mr: 0, as: 0.8, range: 2.0, speed: 5.2, gold: 21, xp: 62, radius: 0.55, growHp: 18, growAd: 1.2 },
  ranged: { hp: 300, ad: 24, armor: 0, mr: 0, as: 0.7, range: 6.5, speed: 5.2, gold: 16, xp: 32, radius: 0.5, growHp: 12, growAd: 1.6 },
};

export const STRUCTURES = {
  tower: { hp: 4000, ad: 155, armor: 45, mr: 45, as: 0.85, range: 10.5, radius: 1.6 },
  nexus: { hp: 5500, ad: 170, armor: 40, mr: 40, as: 0.9, range: 10.5, radius: 3.4 },
  boss: { hp: 6000, ad: 185, armor: 40, mr: 40, as: 0.9, range: 11.5, radius: 3.6 },
};

// ---------------------------------------------------------------------------
// JUNGLA: monstruos neutrales entre los carriles y monstruos épicos del río
// ---------------------------------------------------------------------------
// Los campamentos se definen para el lado azul; el lado rojo es su reflejo.
export const MONSTERS = {
  ghost: { name: 'Fantasma de Yixl', hp: 560, ad: 28, armor: 10, mr: 25, as: 0.8, range: 2.4, speed: 6.2, radius: 0.7, gold: 32, xp: 75, height: 2.6, scale: 1.15 },
  fauna: { name: 'Ciervo de Flavenia', hp: 760, ad: 32, armor: 18, mr: 12, as: 0.75, range: 2.6, speed: 6.6, radius: 0.9, gold: 40, xp: 85, height: 2.8, scale: 1.3 },
  golem: { name: 'Golem de Zircón', hp: 1600, ad: 58, armor: 32, mr: 22, as: 0.6, range: 3.2, speed: 5.2, radius: 1.4, gold: 85, xp: 170, height: 4.6, scale: 1.6, buff: 'zircon' },
  worm: { name: 'Gusano de Raíz', hp: 1500, ad: 64, armor: 22, mr: 32, as: 0.7, range: 3.6, speed: 5.2, radius: 1.4, gold: 85, xp: 170, height: 4.4, scale: 1.5, buff: 'root' },
  dragon: { name: 'Dragón ácido de Cadalíz', hp: 4600, ad: 125, armor: 45, mr: 45, as: 0.6, range: 5.5, speed: 5, radius: 2.6, gold: 220, xp: 420, height: 7.5, scale: 2.7, teamBuff: 'cadaliz', epic: true },
  tiger: { name: 'Tigre corrompido de Kugane', hp: 4200, ad: 140, armor: 50, mr: 38, as: 0.7, range: 4.2, speed: 6, radius: 2.4, gold: 220, xp: 420, height: 6.5, scale: 2.4, teamBuff: 'kugane', epic: true },
};

export const CAMPS = [
  { id: 'yixl', x: -40, z: -23, units: ['ghost', 'ghost', 'ghost'], first: 55, respawn: 75 },
  { id: 'zircon', x: -74, z: -34, units: ['golem'], first: 70, respawn: 120 },
  { id: 'fauna', x: -40, z: 23, units: ['fauna', 'fauna'], first: 55, respawn: 75 },
  { id: 'raiz', x: -74, z: 34, units: ['worm'], first: 70, respawn: 120 },
];

// En el río (x = 10 · sen(z / 24)), a medio camino entre los carriles
export const EPIC_CAMPS = [
  { id: 'cadaliz', x: 10, z: 40, units: ['dragon'], first: 210, respawn: 240, where: 'el río sur' },
  { id: 'kugane', x: -10, z: -40, units: ['tiger'], first: 270, respawn: 240, where: 'el río norte' },
];

// Bendiciones que dan los monstruos (las de los épicos son para todo el equipo)
export const JUNGLE_BUFFS = {
  zircon: { name: 'Voluntad de Zircón', icon: '💠', dur: 90, desc: '+20 % de reducción de enfriamiento y el doble de regeneración de maná.' },
  root: { name: 'Furia de la Raíz', icon: '🌿', dur: 90, desc: 'Tus ataques básicos queman y ralentizan.' },
  cadaliz: { name: 'Aliento de Cadalíz', icon: '🐲', dur: 150, desc: 'Todo el equipo hace un 15 % más de daño.' },
  kugane: { name: 'Rugido de Kugane', icon: '🐯', dur: 150, desc: 'Todo el equipo gana +25 de armadura y de resistencia mágica y un 8 % de velocidad.' },
};
