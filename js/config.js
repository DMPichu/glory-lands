// Datos del juego: mapa, héroes, objetos y constantes.
// Todo lo que se quiera equilibrar (daño, vida, enfriamientos...) está aquí.

export const MAP = {
  minX: -100,
  maxX: 100,
  laneHalf: 11, // medio ancho del carril caminable (eje Z)
};

// Distribución de estructuras. El equipo azul (Blood Hawks) está a la izquierda (x negativa).
export const LAYOUT = {
  blue: { fountain: -96, nexus: -84, towers: [{ x: -30, tier: 1 }, { x: -57, tier: 2 }] },
  red: { fountain: 96, nexus: 84, towers: [{ x: 30, tier: 1 }, { x: 57, tier: 2 }] },
};

export const TEAMS = {
  blue: { name: 'Blood Hawks', color: '#4aa3ff', dir: 1 },
  red: { name: 'Legión de Lorik', color: '#ff4a5a', dir: -1 },
};

export const CONST = {
  startGold: 500,
  passiveGold: 2.2, // oro por segundo
  waveInterval: 28,
  firstWave: 4,
  fountainRadius: 9,
  shopRadius: 16,
  xpRange: 15,
  maxLevel: 18,
  heroKillGold: 300,
  assistGold: 150,
  towerGold: 175,
  maxItems: 6,
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
    // Modelo animado (.glb). Prueba con RobotExpressive (CC0, Tomás Laulhé) desde el
    // repositorio de three.js, teñido de hueso. Para usar otro, pon su ruta en 'url'
    // (p. ej. 'models/fotsor.glb') y los nombres de sus animaciones en 'anims'.
    glb: {
      url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
      height: 2.3,
      anims: { idle: 'Idle', walk: 'Running', attack: 'Punch', death: 'Death' },
      tint: {
        Main: { color: 0xece4cf, r: 0.8, m: 0 },
        Grey: { color: 0x7a1626, r: 0.6 },
        Black: { color: 0x2a1408, emissive: 0xff5a00, ei: 0.25 },
      },
      keep: [{ part: 'flames', bone: 'Head', pos: [0, 0.35, 0], scale: 1.4 }],
    },
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
};

export const DIFFICULTY = {
  facil: { name: 'Fácil', dmg: 0.72, think: 0.45, gold: 0.8 },
  normal: { name: 'Normal', dmg: 1.0, think: 0.22, gold: 1.0 },
  dificil: { name: 'Difícil', dmg: 1.15, think: 0.14, gold: 1.2 },
};

export const HERO_ORDER = ['josephine', 'fotsor', 'yeslie', 'astrid'];

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

export const SHOP_ORDER = ['potion', 'sword', 'fang', 'trigger', 'scope', 'ember', 'katana', 'tome', 'crystal', 'moon', 'staff',
  'shield', 'cloak', 'heart', 'thorns', 'aegis', 'boots', 'feather', 'tear'];

// ---------------------------------------------------------------------------
// SÚBDITOS Y ESTRUCTURAS
// ---------------------------------------------------------------------------
export const MINIONS = {
  melee: { hp: 460, ad: 14, armor: 4, mr: 0, as: 0.8, range: 2.0, speed: 5.2, gold: 21, xp: 62, radius: 0.55, growHp: 18, growAd: 1.2 },
  ranged: { hp: 300, ad: 24, armor: 0, mr: 0, as: 0.7, range: 6.5, speed: 5.2, gold: 16, xp: 32, radius: 0.5, growHp: 12, growAd: 1.6 },
};

export const STRUCTURES = {
  tower: { hp: 2000, ad: 155, armor: 45, mr: 45, as: 0.85, range: 10.5, radius: 1.6 },
  nexus: { hp: 3000, ad: 170, armor: 40, mr: 40, as: 0.9, range: 10.5, radius: 3.4 },
  boss: { hp: 3600, ad: 185, armor: 40, mr: 40, as: 0.9, range: 11.5, radius: 3.6 },
};
