// Héroes nuevos (17) y el rework de Catarina. Cada habilidad se describe con datos y
// la ejecuta js/kit.js. Las estadísticas parten de plantillas por rol.
// El aspecto ('look') es provisional hasta que lleguen los tokens: lo dibuja
// buildFromLook en js/heroes.js.
import { HEROES, HERO_ORDER } from './config.js';
import { PASSIVE_IMPL } from './abilities.js';
import { makePassive } from './kit.js';

const ROLE = {
  luchador: { base: { hp: 640, mp: 280, ad: 64, ap: 0, armor: 33, mr: 32, as: 0.68, range: 2.6, speed: 7.0, hpRegen: 3.1, mpRegen: 6 }, growth: { hp: 100, mp: 35, ad: 3.9, ap: 0, armor: 3.8, mr: 1.4, as: 0.022 } },
  asesino: { base: { hp: 560, mp: 280, ad: 66, ap: 0, armor: 28, mr: 30, as: 0.7, range: 2.4, speed: 7.3, hpRegen: 2.8, mpRegen: 6 }, growth: { hp: 88, mp: 35, ad: 4.0, ap: 0, armor: 3.4, mr: 1.2, as: 0.025 } },
  mago: { base: { hp: 520, mp: 450, ad: 50, ap: 30, armor: 22, mr: 30, as: 0.63, range: 7.5, speed: 6.8, hpRegen: 2.4, mpRegen: 8.5 }, growth: { hp: 84, mp: 52, ad: 2.6, ap: 7, armor: 3.3, mr: 1.0, as: 0.015 } },
  tanque: { base: { hp: 700, mp: 300, ad: 56, ap: 0, armor: 40, mr: 34, as: 0.64, range: 2.6, speed: 6.9, hpRegen: 3.6, mpRegen: 6 }, growth: { hp: 110, mp: 40, ad: 3.2, ap: 0, armor: 4.6, mr: 1.8, as: 0.016 } },
  soporte: { base: { hp: 560, mp: 400, ad: 50, ap: 25, armor: 26, mr: 32, as: 0.64, range: 6.5, speed: 6.9, hpRegen: 2.6, mpRegen: 8.5 }, growth: { hp: 88, mp: 50, ad: 2.8, ap: 6, armor: 3.6, mr: 1.4, as: 0.015 } },
};
function stats(role, mod = {}) {
  const r = ROLE[role];
  return { base: { ...r.base, ...(mod.base || {}) }, growth: { ...r.growth, ...(mod.growth || {}) } };
}
// habilidad: [id, tecla, nombre, icono, coste, enfriamientos, alcance, kit, ai, descripción, extra]
function ab(id, key, name, icon, cost, cd, range, kit, ai, desc, extra = {}) {
  return { id, key, name, icon, cost: Array.isArray(cost) ? cost : (key === 'R' ? [cost, cost, cost] : [cost, cost, cost, cost, cost]), cd, range, kit, ai, desc, ...extra };
}
const N5 = (a, step) => [0, 1, 2, 3, 4].map((i) => Math.round(a + step * i));
const N3 = (a, step) => [0, 1, 2].map((i) => Math.round(a + step * i));
const CD5 = (a, b) => [0, 1, 2, 3, 4].map((i) => +(a + ((b - a) * i) / 4).toFixed(1));

const NEW = {
  // ------------------------------------------------------------ HERMES
  hermes: {
    name: 'Hermes', title: 'Paladín de la tormenta dorada', role: 'Luchador', melee: true, color: '#ffd27a',
    quote: '«Un golpe certero vale por cien».', lore: 'Paladín veloz que remata a sus enemigos con golpes críticos bendecidos.',
    ...stats('luchador', { base: { ad: 66 } }),
    passive: { id: 'her_p', name: 'Juicio veloz', icon: '⚡', desc: '+20 % de probabilidad de crítico. Sus golpes llevan luz sagrada.', kit: { stats: { crit: 0.2 }, color: 0xffe08a } },
    abilities: [
      ab('her_q', 'Q', 'Embestida sagrada', '🐎', 40, CD5(9, 6), 6, { type: 'dash', dmg: N5(60, 35), ratio: { ad: 0.9 }, dtype: 'physical', stun: 0.5, firstOnly: true, color: 0xffe08a }, 'gapclose',
        'Carga hacia el cursor; el primer enemigo recibe 60/95/130/165/200 (+90 % AD) de daño físico y queda aturdido 0,5 s.'),
      ab('her_w', 'W', 'Bendición de acero', '🗡️', 45, CD5(14, 10), 0, { type: 'buff', dur: 3, as: 0.4, crit: 1, color: 0xffe08a }, 'selfFight',
        'Durante 3 s gana un 40 % de velocidad de ataque y todos sus golpes son críticos.'),
      ab('her_e', 'E', 'Escudo de fe', '🛡️', 50, CD5(16, 12), 0, { type: 'shield', amount: N5(90, 45), hp: 0.08, dur: 3, color: 0xfff2a0 }, 'selfShield',
        'Se protege con un escudo de 90/135/180/225/270 (+8 % de su vida máxima) durante 3 s.'),
      ab('her_r', 'R', 'Veredicto', '⚖️', 100, [80, 65, 50], 7, { type: 'execute', dmg: N3(200, 125), ratio: { ad: 1.2 }, missing: 0.3, dtype: 'physical', leap: true, color: 0xffe08a }, 'execute',
        'Salta sobre el héroe enemigo más cercano al cursor y lo golpea: 200/325/450 (+120 % AD) y un 30 % de la vida que le falta.'),
    ],
    build: ['sword', 'scope', 'boots', 'katana', 'shield', 'fang'], prio: [0, 1, 2],
    look: { skin: 0xf2d4b8, hair: 0xf0d080, hairStyle: 'short', top: 0xf4f0e4, accent: 0xe0b33c, pants: 0x3a3a48, weapon: 'sword', eye: '#e8a030' },
  },
  // ------------------------------------------------------------ POLETT
  polett: {
    name: 'Polett', title: 'Danza de acero', role: 'Luchadora', melee: true, color: '#ff8aa8',
    quote: '«Un paso más rápido que tú».', lore: 'Duelista incansable: cuanto más dura la pelea, más rápido golpea.',
    ...stats('luchador', { base: { as: 0.72 } }),
    passive: { id: 'pol_p', name: 'Ritmo de combate', icon: '🥁', desc: 'Cada ataque le da un 6 % de velocidad de ataque durante 4 s (hasta 5 veces).', kit: { stackAS: 0.06, color: 0xff8aa8 } },
    abilities: [
      ab('pol_q', 'Q', 'Tajo doble', '✂️', 30, CD5(6, 4), 4.5, { type: 'cone', angle: 80, hits: 2, dmg: N5(50, 30), ratio: { ad: 0.9 }, dtype: 'physical', color: 0xff8aa8 }, 'cone',
        'Dos tajos rápidos en abanico: 50/80/110/140/170 (+90 % AD) de daño físico en total.'),
      ab('pol_w', 'W', 'Furia', '🔥', 40, CD5(16, 12), 0, { type: 'buff', dur: 5, as: N5(25, 5), lifesteal: 0.15, color: 0xff6a8a }, 'selfFight',
        'Durante 5 s gana un 25/30/35/40/45 % de velocidad de ataque y un 15 % de robo de vida.'),
      ab('pol_e', 'E', 'Salto', '🤸', 50, CD5(14, 10), 6, { type: 'dash', dmg: N5(50, 25), ratio: { ad: 0.5 }, dtype: 'physical', landRadius: 2.5, slow: { v: 0.3, d: 1.5 }, speed: 20, color: 0xff8aa8 }, 'gapclose',
        'Salta hacia el cursor y al aterrizar golpea alrededor: 50/75/100/125/150 (+50 % AD) y ralentiza un 30 %.'),
      ab('pol_r', 'R', 'Tormenta de acero', '🌪️', 100, [80, 70, 60], 0, { type: 'nova', radius: 4, ticks: 6, interval: 0.4, dmg: N3(240, 140), ratio: { ad: 1.4 }, dtype: 'physical', color: 0xff8aa8 }, 'nova',
        'Gira durante 2,4 s golpeando a todos a su alrededor: 240/380/520 (+140 % AD) de daño físico en total.', { radius: 4 }),
    ],
    build: ['trigger', 'fang', 'boots', 'ember', 'shield', 'heart'], prio: [0, 1, 2],
    look: { skin: 0xf8dccc, hair: 0xff8aa8, hairStyle: 'ponytail', top: 0x2a2a3a, accent: 0xff8aa8, pants: 0x1a1a24, weapon: 'twin', female: true, eye: '#ff6a9a' },
  },
  // ------------------------------------------------------------ BELIAN
  belian: {
    name: 'Belian', title: 'La mano que cura', role: 'Sanadora', melee: false, color: '#8dffb0',
    quote: '«Nadie cae mientras yo esté aquí».', lore: 'Sanadora devota: su sola presencia cierra heridas.',
    ...stats('soporte'),
    passive: { id: 'bel_p', name: 'Gracia', icon: '🌿', desc: 'Cada segundo cura a los aliados cercanos (7 m) un 1 % de su vida máxima.', kit: { healAura: 0.01, color: 0x8dffb0 } },
    abilities: [
      ab('bel_q', 'Q', 'Rayo de vida', '🌟', 40, CD5(6, 4), 11, { type: 'skillshot', dmg: N5(60, 35), ratio: { ap: 0.6 }, slow: { v: 0.3, d: 1.5 }, color: 0x8dffb0 }, 'skillshot',
        'Lanza un rayo que daña 60/95/130/165/200 (+60 % AP) y ralentiza un 30 % al primer enemigo.'),
      ab('bel_w', 'W', 'Imposición', '💚', 60, CD5(10, 7), 9, { type: 'heal', amount: N5(90, 40), ap: 0.5, color: 0x8dffb0 }, 'healAlly',
        'Cura al aliado más cercano al cursor (o a sí misma) 90/130/170/210/250 (+50 % AP).'),
      ab('bel_e', 'E', 'Égida', '🛡️', 60, CD5(14, 10), 9, { type: 'shield', target: 'ally', amount: N5(70, 35), ap: 0.5, dur: 3, cleanse: true, color: 0x8dffb0 }, 'shieldAlly',
        'Escudo de 70/105/140/175/210 (+50 % AP) a un aliado durante 3 s y le quita los efectos negativos.'),
      ab('bel_r', 'R', 'Renacer', '🌸', 100, [90, 75, 60], 0, { type: 'heal', radius: 12, amount: N3(200, 100), ap: 0.8, cleanse: true, shield: N3(80, 60), color: 0x8dffb0 }, 'ultHealAll',
        'Cura 200/300/400 (+80 % AP) a todos los aliados en 12 m, les quita los efectos negativos y les da un escudo.'),
    ],
    build: ['tear', 'crystal', 'boots', 'staff', 'cloak', 'aegis'], prio: [1, 2, 0],
    look: { skin: 0xf6e0d0, hair: 0xb8f0c8, hairStyle: 'long', top: 0xf4fff6, accent: 0x5ad888, pants: 0xe8f0ea, weapon: 'staff', female: true, eye: '#3ad880' },
  },
  // ------------------------------------------------------------ VALLENTINE
  vallentine: {
    name: 'Vallentine', title: 'El muro que avanza', role: 'Tanque (juggernaut)', melee: true, color: '#c87a5a',
    quote: '«Pasa por encima de mí. Inténtalo».', lore: 'Coloso blindado que arrolla las líneas enemigas.',
    ...stats('tanque', { base: { ad: 60, hp: 730 } }),
    passive: { id: 'val_p', name: 'Inamovible', icon: '⛰️', desc: '+15 de armadura y de resistencia mágica. Se recupera más rápido con poca vida.', kit: { stats: { armor: 15, mr: 15 }, regenLow: 0.006 } },
    abilities: [
      ab('val_q', 'Q', 'Mazazo', '🔨', 40, CD5(8, 6), 4.5, { type: 'area', radius: 2.6, delay: 0.35, dmg: N5(70, 40), ratio: { ad: 0.8 }, dtype: 'physical', slow: { v: 0.4, d: 1.5 }, color: 0xffb070 }, 'area',
        'Golpea el suelo: 70/110/150/190/230 (+80 % AD) de daño físico y ralentiza un 40 %.', { radius: 2.6 }),
      ab('val_w', 'W', 'Coraza', '🧱', 50, CD5(16, 12), 0, { type: 'buff', dur: 4, armor: N5(30, 10), dr: 0.15, color: 0xffb070 }, 'selfShield',
        'Durante 4 s gana +30/40/50/60/70 de armadura y de resistencia mágica y un 15 % de reducción de daño.'),
      ab('val_e', 'E', 'Arremetida', '🐂', 60, CD5(15, 11), 7, { type: 'dash', dmg: N5(60, 30), ratio: { ad: 0.6 }, dtype: 'physical', stun: 0.8, firstOnly: true, color: 0xffb070 }, 'gapclose',
        'Embiste hacia el cursor: el primer enemigo recibe 60/90/120/150/180 (+60 % AD) y queda aturdido 0,8 s.'),
      ab('val_r', 'R', 'Tierra rota', '🌋', 100, [90, 75, 60], 0, { type: 'nova', radius: 5.5, dmg: N3(180, 120), ratio: { ad: 0.8, hp: 0.05 }, dtype: 'physical', stun: 1.2, color: 0xffb070 }, 'nova',
        'Parte el suelo a su alrededor (5,5 m): 180/300/420 (+80 % AD, +5 % de su vida máxima) y aturde 1,2 s.', { radius: 5.5 }),
    ],
    build: ['heart', 'shield', 'boots', 'thorns', 'cloak', 'aegis'], prio: [0, 2, 1],
    look: { skin: 0xd8b090, hair: 0x5a3a28, hairStyle: 'short', top: 0x8a5a3a, accent: 0xc8a050, pants: 0x3a2a20, weapon: 'hammer', eye: '#a06030', bulky: true },
  },
  // ------------------------------------------------------------ EMMELINE
  emmeline: {
    name: 'Emmeline', title: 'Hechicera magenta', role: 'Maga', melee: false, color: '#ff4ad8',
    quote: '«El magenta es el color de la victoria».', lore: 'Hechicera de luz magenta: cada tercer hechizo es devastador.',
    ...stats('mago'),
    passive: { id: 'emm_p', name: 'Resonancia', icon: '🎶', desc: 'Cada tercer hechizo hace que el siguiente inflija un 50 % más de daño.', kit: { ampEvery: 3, amp: 0.5, color: 0xff4ad8 } },
    abilities: [
      ab('emm_q', 'Q', 'Orbe magenta', '🔮', 40, CD5(5, 3.5), 12, { type: 'skillshot', dmg: N5(75, 40), ratio: { ap: 0.7 }, color: 0xff4ad8, size: 0.45 }, 'skillshot',
        'Lanza un orbe que inflige 75/115/155/195/235 (+70 % AP) de daño mágico al primer enemigo.'),
      ab('emm_w', 'W', 'Prisma', '💠', 70, CD5(10, 8), 10, { type: 'area', radius: 3.2, delay: 0.5, dmg: N5(70, 35), ratio: { ap: 0.5 }, slow: { v: 0.4, d: 2 }, color: 0xff7ae8 }, 'area',
        'Un prisma estalla en la zona: 70/105/140/175/210 (+50 % AP) y ralentiza un 40 % durante 2 s.', { radius: 3.2 }),
      ab('emm_e', 'E', 'Destello', '✨', 60, CD5(16, 12), 6, { type: 'blink', cleanse: false, color: 0xff4ad8 }, 'escape',
        'Se teletransporta 6 m hacia el cursor.'),
      ab('emm_r', 'R', 'Supernova', '💥', 100, [90, 75, 60], 12, { type: 'area', radius: 5, delay: 0.9, dmg: N3(280, 160), ratio: { ap: 1.0 }, stun: 0.6, color: 0xff4ad8 }, 'ultArea',
        'Tras 0,9 s, una supernova magenta estalla en la zona: 280/440/600 (+100 % AP) y aturde 0,6 s.', { radius: 5 }),
    ],
    build: ['tome', 'crystal', 'boots', 'moon', 'staff', 'cloak'], prio: [0, 1, 2],
    look: { skin: 0xfae0e4, hair: 0xff4ad8, hairStyle: 'long', top: 0x3a1040, accent: 0xff4ad8, pants: 0x2a0a30, weapon: 'staff', female: true, eye: '#ff4ad8' },
  },
  // ------------------------------------------------------------ LUCILLE
  lucille: {
    name: 'Lucille', title: 'Reina del hielo', role: 'Tanque', melee: true, color: '#9ae8ff',
    quote: '«Hasta el invierno se arregla para mí».', lore: 'Tanque glamurosa que congela el campo de batalla.',
    ...stats('tanque'),
    passive: { id: 'luc_p', name: 'Brillo helado', icon: '❄️', desc: 'Sus ataques ralentizan un 20 % durante 1 s.', kit: { onHitSlow: 0.2, color: 0x9ae8ff } },
    abilities: [
      ab('luc_q', 'Q', 'Beso de escarcha', '💋', 50, CD5(10, 8), 10, { type: 'skillshot', dmg: N5(60, 35), ratio: { ap: 0.4, hp: 0.03 }, root: 1.0, color: 0x9ae8ff }, 'skillshot',
        'Lanza un beso helado: 60/95/130/165/200 (+3 % de su vida máxima) e inmoviliza 1 s al primer enemigo.'),
      ab('luc_w', 'W', 'Vestido de diamante', '💎', 60, CD5(16, 12), 0, { type: 'shield', amount: N5(120, 50), hp: 0.1, dur: 4, color: 0xc8f4ff }, 'selfShield',
        'Se cubre con un escudo de 120/170/220/270/320 (+10 % de su vida máxima) durante 4 s.'),
      ab('luc_e', 'E', 'Pasarela', '👠', 50, CD5(14, 10), 7, { type: 'dash', dmg: N5(40, 25), ratio: { hp: 0.02 }, slow: { v: 0.5, d: 1.5 }, color: 0x9ae8ff }, 'gapclose',
        'Se desliza hacia el cursor ralentizando un 50 % a todos los enemigos que atraviesa.'),
      ab('luc_r', 'R', 'Gala invernal', '🧊', 100, [100, 85, 70], 0, { type: 'nova', radius: 6, dmg: N3(150, 100), ratio: { hp: 0.05 }, stun: N3(1.25, 0.25), color: 0x9ae8ff }, 'nova',
        'Congela todo a su alrededor (6 m): 150/250/350 (+5 % de su vida máxima) y aturde 1,25/1,5/1,75 s.', { radius: 6 }),
    ],
    build: ['heart', 'cloak', 'boots', 'shield', 'aegis', 'tear'], prio: [0, 1, 2],
    look: { skin: 0xfdeef0, hair: 0xe8f8ff, hairStyle: 'long', top: 0x9ae8ff, accent: 0xffffff, pants: 0xc8f0ff, weapon: 'fan', female: true, eye: '#5ac8ff' },
  },
  // ------------------------------------------------------------ ESPERANZA
  esperanza: {
    name: 'Esperanza', title: 'Clériga de la penumbra', role: 'Luchadora / Soporte', melee: true, color: '#9a6aff',
    quote: '«Hasta en la oscuridad hay esperanza».', lore: 'Clériga espadachina que usa la oscuridad para proteger a los suyos.',
    ...stats('luchador', { base: { ap: 15 }, growth: { ap: 4 } }),
    passive: { id: 'esp_p', name: 'Fe en la penumbra', icon: '🌑', desc: 'Sus ataques añaden daño mágico de sombra y le dan un 10 % de robo de vida.', kit: { onHitMagic: 12, stats: { lifesteal: 0.1 }, color: 0x9a6aff } },
    abilities: [
      ab('esp_q', 'Q', 'Tajo umbrío', '🌘', 35, CD5(7, 5), 4.5, { type: 'cone', angle: 90, dmg: N5(60, 35), ratio: { ad: 0.7, ap: 0.4 }, weak: { v: 0.25, d: 2 }, color: 0x9a6aff }, 'cone',
        'Tajo de sombra en abanico: 60/95/130/165/200 (+70 % AD, +40 % AP) y debilita un 25 % durante 2 s.'),
      ab('esp_w', 'W', 'Velo oscuro', '🛡️', 60, CD5(14, 10), 8, { type: 'shield', target: 'ally', amount: N5(70, 35), ap: 0.5, heal: N5(30, 15), dur: 3, color: 0x9a6aff }, 'shieldAlly',
        'Escudo de 70/105/140/175/210 (+50 % AP) a un aliado (o a sí misma) y una pequeña curación.'),
      ab('esp_e', 'E', 'Paso sombrío', '👣', 50, CD5(14, 10), 5, { type: 'blink', empower: N5(40, 20), color: 0x9a6aff }, 'gapclose',
        'Se desvanece y reaparece 5 m más allá; su siguiente ataque hace 40/60/80/100/120 de daño mágico extra.'),
      ab('esp_r', 'R', 'Eclipse', '🌒', 100, [90, 75, 60], 10, { type: 'area', radius: 5, delay: 0.3, dmg: N3(100, 60), ratio: { ap: 0.5 }, color: 0x9a6aff, zone: { dur: 4, tick: 0.5, dmg: N3(40, 25), slow: 0.3, healAllies: N3(40, 20) } }, 'ultArea',
        'Un eclipse cubre la zona 4 s: daña y ralentiza a los enemigos y cura a los aliados que estén dentro.', { radius: 5 }),
    ],
    build: ['fang', 'tear', 'boots', 'ember', 'aegis', 'heart'], prio: [0, 1, 2],
    look: { skin: 0xf0d8c8, hair: 0x2a1a3a, hairStyle: 'long', top: 0x1e1428, accent: 0x9a6aff, pants: 0x140e1c, weapon: 'sword', female: true, eye: '#b08aff' },
  },
  // ------------------------------------------------------------ FUYUMI
  fuyumi: {
    name: 'Fuyumi', title: 'La luz que no se ve', role: 'Asesina', melee: true, color: '#fff2a0',
    quote: '«Cuando me veas, ya habré terminado».', lore: 'Asesina furtiva que ataca desde las sombras con golpes de luz divina.',
    ...stats('asesino'),
    passive: { id: 'fuy_p', name: 'Luz oculta', icon: '🌟', desc: 'Atacar desde el sigilo hace el doble de daño.', kit: { stealthCrit: 2, color: 0xfff2a0 } },
    abilities: [
      ab('fuy_q', 'Q', 'Lanza de luz', '🔱', 40, CD5(7, 5), 9, { type: 'skillshot', dmg: N5(70, 40), ratio: { ad: 0.9 }, dtype: 'physical', speed: 40, color: 0xfff2a0, size: 0.3 }, 'skillshot',
        'Lanza una lanza de luz muy rápida: 70/110/150/190/230 (+90 % AD) de daño físico.'),
      ab('fuy_w', 'W', 'Velo', '🌫️', 60, CD5(18, 14), 0, { type: 'stealth', dur: 3, spd: 0.25, color: 0xfff2a0 }, 'stealthIn',
        'Se vuelve invisible 3 s y gana un 25 % de velocidad. Atacar o lanzar una habilidad la revela.'),
      ab('fuy_e', 'E', 'Juicio', '⚔️', 50, CD5(12, 8), 7, { type: 'blink', behindTarget: true, dmg: N5(50, 30), ratio: { ad: 0.6 }, dtype: 'physical', color: 0xfff2a0 }, 'gapclose',
        'Aparece detrás del enemigo más cercano al cursor y le golpea: 50/80/110/140/170 (+60 % AD).'),
      ab('fuy_r', 'R', 'Castigo divino', '☀️', 100, [80, 65, 50], 7, { type: 'execute', dmg: N3(150, 100), ratio: { ad: 1.0 }, missing: 0.4, dtype: 'physical', color: 0xfff2a0 }, 'execute',
        'Una columna de luz cae sobre el héroe enemigo más cercano al cursor: 150/250/350 (+100 % AD) y un 40 % de la vida que le falta.'),
    ],
    build: ['sword', 'katana', 'boots', 'scope', 'fang', 'cloak'], prio: [0, 2, 1],
    look: { skin: 0xfae6da, hair: 0xfff4d0, hairStyle: 'ponytail', top: 0xf4f0ff, accent: 0xffd040, pants: 0x2a2a3a, weapon: 'daggers', female: true, eye: '#ffd040' },
  },
  // ------------------------------------------------------------ SLINXI
  slinxi: {
    name: 'Slinxi', title: 'El torbellino', role: 'Tanque (oleadas)', melee: true, color: '#7affd8',
    quote: '«¿Ya terminamos? ¡Qué rápido!»', lore: 'Muy resistente y rapidísima: barre oleadas enteras, aunque a los héroes apenas les hace daño.',
    ...stats('tanque', { base: { speed: 7.8, hp: 680 } }),
    passive: { id: 'sli_p', name: 'Torbellino', icon: '🌀', desc: '+15 % de velocidad. Hace el doble de daño a súbditos y monstruos y un 40 % menos a los héroes.', kit: { stats: { spd: 0.15 }, minionMult: 2, heroMult: 0.6, color: 0x7affd8 } },
    abilities: [
      ab('sli_q', 'Q', 'Remolino', '🌀', 30, CD5(5, 3.5), 0, { type: 'nova', radius: 4.5, dmg: N5(70, 35), ratio: { ad: 0.6, hp: 0.02 }, dtype: 'physical', color: 0x7affd8 }, 'waveclear',
        'Gira y golpea a todo lo que tenga alrededor (4,5 m): 70/105/140/175/210 (+60 % AD).', { radius: 4.5 }),
      ab('sli_w', 'W', 'Caparazón', '🐚', 50, CD5(16, 12), 0, { type: 'shield', amount: N5(130, 50), hp: 0.12, dr: 0.2, dur: 4, color: 0x7affd8 }, 'selfShield',
        'Escudo de 130/180/230/280/330 (+12 % de su vida máxima) y un 20 % de reducción de daño durante 4 s.'),
      ab('sli_e', 'E', 'Carrerilla', '💨', 40, CD5(14, 10), 0, { type: 'buff', dur: 3, spd: N5(50, 10), color: 0x7affd8 }, 'escape',
        'Gana un 50/60/70/80/90 % de velocidad durante 3 s.'),
      ab('sli_r', 'R', 'Estampida', '🐾', 100, [70, 60, 50], 12, { type: 'dash', speed: 30, dmg: N3(150, 100), ratio: { ad: 0.8 }, dtype: 'physical', knock: 3, color: 0x7affd8 }, 'lineUlt',
        'Arrolla todo lo que hay hasta el cursor (12 m): 150/250/350 (+80 % AD) y los aparta a un lado.'),
    ],
    build: ['heart', 'boots', 'shield', 'cloak', 'thorns', 'aegis'], prio: [0, 1, 2],
    look: { skin: 0xf8e4d4, hair: 0x7affd8, hairStyle: 'twin', top: 0x1e5a50, accent: 0x7affd8, pants: 0x143a34, weapon: 'fists', female: true, eye: '#3affc0' },
  },
  // ------------------------------------------------------------ UMI
  umi: {
    name: 'Umi', title: 'Monje del loto de jade', role: 'Luchadora (monje)', melee: true, color: '#4aff9a',
    quote: '«El agua no rompe: rodea».', lore: 'Monje esquiva y llena de escudos, pero frágil cuando se los rompen. Puede lanzar esferas de fuego verde.',
    ...stats('luchador', { base: { hp: 590, armor: 28 }, growth: { hp: 92 } }),
    passive: { id: 'umi_p', name: 'Serenidad', icon: '🍃', desc: '20 % de probabilidad de esquivar los ataques básicos.', kit: { stats: { dodge: 0.2 }, color: 0x4aff9a } },
    abilities: [
      ab('umi_q', 'Q', 'Esferas de fuego verde', '🟢', 40, CD5(14, 10), 0, { type: 'buff', dur: 6, ranged: { range: 6.5 }, onhit: N5(20, 10), color: 0x4aff9a }, 'selfFight',
        'Durante 6 s sus ataques son esferas de fuego verde a distancia (6,5 m) con 20/30/40/50/60 de daño mágico extra.'),
      ab('umi_w', 'W', 'Mantra', '🕉️', 50, CD5(12, 8), 0, { type: 'shield', amount: N5(100, 45), hp: 0.08, dur: 4, color: 0x4aff9a }, 'selfShield',
        'Escudo de 100/145/190/235/280 (+8 % de su vida máxima) durante 4 s.'),
      ab('umi_e', 'E', 'Paso del viento', '🌬️', 40, CD5(12, 8), 5, { type: 'dash', speed: 26, dmg: N5(40, 20), ratio: { ad: 0.4 }, dtype: 'physical', dodgeAfter: 1.5, color: 0x4aff9a }, 'escape',
        'Se desliza hacia el cursor y esquiva todos los ataques básicos durante 1,5 s.'),
      ab('umi_r', 'R', 'Loto de jade', '🪷', 100, [90, 75, 60], 0, { type: 'nova', radius: 6, dmg: N3(100, 60), ratio: { ap: 0.4, ad: 0.4 }, shield: N3(250, 150), color: 0x4aff9a }, 'ultDome',
        'Florece un loto de jade: daña a los enemigos cercanos y le da un escudo de 250/400/550 durante 3 s.', { radius: 6 }),
    ],
    build: ['tear', 'boots', 'ember', 'aegis', 'heart', 'trigger'], prio: [1, 0, 2],
    look: { skin: 0xf4dcc8, hair: 0x1a1a1a, hairStyle: 'bun', top: 0xf0e8d0, accent: 0x4aff9a, pants: 0x3a6a4a, weapon: 'fists', female: true, eye: '#2ad880' },
  },
  // ------------------------------------------------------------ ZEFLIE
  zeflie: {
    name: 'Zeflie', title: 'Llama del alba', role: 'Maga', melee: false, color: '#ffa040',
    quote: '«¡Zestari, ahora!»', lore: 'Maga del sol. Sus hechizos marcan a los enemigos y Zestari los hace estallar (y al revés).',
    ...stats('mago'),
    passive: { id: 'zef_p', name: 'Lazo de hermanas', icon: '☀️', desc: 'Cerca de Zestari gana daño y poder mágico. Sus hechizos dejan una marca solar que Zestari hace estallar.', kit: { duo: { partner: 'zestari', bonus: 0.1, color: 0xffd0a0 }, color: 0xffa040 } },
    abilities: [
      ab('zef_q', 'Q', 'Chispa solar', '☀️', 40, CD5(5, 3.5), 11, { type: 'skillshot', dmg: N5(70, 40), ratio: { ap: 0.65 }, mark: { key: 'mark_sol', dur: 5, color: 0xffa040 }, bonusVsMark: { key: 'mark_luna', mult: 0.5, color: 0x9ab8ff }, color: 0xffa040 }, 'skillshot',
        'Chispa de sol: 70/110/150/190/230 (+65 % AP) y deja una marca solar. Si el objetivo tenía la marca lunar de Zestari, hace un 50 % más.'),
      ab('zef_w', 'W', 'Llamarada', '🔥', 70, CD5(10, 8), 9, { type: 'area', radius: 3, delay: 0.45, dmg: N5(60, 35), ratio: { ap: 0.5 }, slow: { v: 0.35, d: 1.5 }, mark: { key: 'mark_sol', dur: 5, color: 0xffa040 }, bonusVsMark: { key: 'mark_luna', mult: 0.5, color: 0x9ab8ff }, color: 0xffa040 }, 'area',
        'Llamarada en la zona: 60/95/130/165/200 (+50 % AP), ralentiza y deja la marca solar.', { radius: 3 }),
      ab('zef_e', 'E', 'Paso del alba', '🌅', 60, CD5(16, 12), 6, { type: 'blink', color: 0xffa040 }, 'escape', 'Se teletransporta 6 m hacia el cursor.'),
      ab('zef_r', 'R', 'Rayo del mediodía', '🌞', 100, [80, 70, 60], 22, { type: 'skillshot', pierce: true, width: 1.4, speed: 45, size: 0.8, dmg: N3(220, 130), ratio: { ap: 0.9 }, mark: { key: 'mark_sol', dur: 5, color: 0xffa040 }, bonusVsMark: { key: 'mark_luna', mult: 0.5, color: 0x9ab8ff }, color: 0xffc040 }, 'lineUlt',
        'Un rayo de sol atraviesa todo en línea (22 m): 220/350/480 (+90 % AP).'),
    ],
    build: ['tome', 'crystal', 'boots', 'moon', 'staff', 'cloak'], prio: [0, 1, 2],
    look: { skin: 0xfae0cc, hair: 0xffa040, hairStyle: 'twin', top: 0xfff0d8, accent: 0xff7a20, pants: 0xffe0b0, weapon: 'staff', female: true, eye: '#ff8a20' },
  },
  // ------------------------------------------------------------ ZESTARI
  zestari: {
    name: 'Zestari', title: 'Filo del ocaso', role: 'Asesina', melee: true, color: '#9ab8ff',
    quote: '«Tú enciendes, yo apago».', lore: 'Espadachina de la luna. Hace estallar la marca solar de Zeflie y deja su propia marca lunar.',
    ...stats('asesino'),
    passive: { id: 'zes_p', name: 'Lazo de hermanas', icon: '🌙', desc: 'Cerca de Zeflie gana daño y poder mágico. Sus golpes dejan una marca lunar que Zeflie hace estallar.', kit: { duo: { partner: 'zeflie', bonus: 0.1, color: 0xd0d8ff }, color: 0x9ab8ff } },
    abilities: [
      ab('zes_q', 'Q', 'Corte lunar', '🌙', 35, CD5(7, 5), 6, { type: 'dash', dmg: N5(60, 35), ratio: { ad: 0.9 }, dtype: 'physical', mark: { key: 'mark_luna', dur: 5, color: 0x9ab8ff }, bonusVsMark: { key: 'mark_sol', mult: 0.5, color: 0xffa040 }, color: 0x9ab8ff }, 'gapclose',
        'Atraviesa a los enemigos hasta el cursor: 60/95/130/165/200 (+90 % AD) y deja la marca lunar. Si tenían la marca solar de Zeflie, un 50 % más.'),
      ab('zes_w', 'W', 'Danza de la luna', '💫', 40, CD5(14, 10), 0, { type: 'buff', dur: 4, as: N5(30, 8), spd: 0.15, color: 0x9ab8ff }, 'selfFight',
        'Durante 4 s gana un 30/38/46/54/62 % de velocidad de ataque y un 15 % de velocidad.'),
      ab('zes_e', 'E', 'Velo de plata', '🛡️', 50, CD5(16, 12), 0, { type: 'shield', amount: N5(80, 40), hp: 0.05, dur: 3, color: 0xd0d8ff }, 'selfShield',
        'Escudo de 80/120/160/200/240 (+5 % de su vida máxima) durante 3 s.'),
      ab('zes_r', 'R', 'Eclipse de filos', '🌑', 100, [80, 70, 60], 0, { type: 'nova', radius: 4.5, ticks: 3, interval: 0.3, dmg: N3(220, 140), ratio: { ad: 1.2 }, dtype: 'physical', mark: { key: 'mark_luna', dur: 5, color: 0x9ab8ff }, bonusVsMark: { key: 'mark_sol', mult: 0.5, color: 0xffa040 }, color: 0x9ab8ff }, 'nova',
        'Tres cortes en círculo (4,5 m): 220/360/500 (+120 % AD) en total; hacen estallar la marca solar.', { radius: 4.5 }),
    ],
    build: ['sword', 'katana', 'boots', 'fang', 'scope', 'shield'], prio: [0, 1, 2],
    look: { skin: 0xf6dcd4, hair: 0x6a7ad8, hairStyle: 'short', top: 0x1a1e3a, accent: 0x9ab8ff, pants: 0x101428, weapon: 'katana', female: true, eye: '#9ab8ff' },
  },
  // ------------------------------------------------------------ XELUNA
  xeluna: {
    name: 'Xeluna', title: 'La bestia herida', role: 'Luchadora (offtank)', melee: true, color: '#ff6a40',
    quote: '«Cuanto más me hieres, más fuerte golpeo».', lore: 'Aguanta como una tanque y, con poca vida, golpea como un camión.',
    ...stats('luchador', { base: { hp: 680, armor: 36 } }),
    passive: { id: 'xel_p', name: 'Rabia de luna', icon: '🩸', desc: 'Hace hasta un 90 % más de daño cuanto menos vida le queda.', kit: { lowHpDamage: 0.9, color: 0xff6a40 } },
    abilities: [
      ab('xel_q', 'Q', 'Golpe sísmico', '💢', 40, CD5(8, 6), 4, { type: 'area', radius: 2.5, delay: 0.3, dmg: N5(70, 40), ratio: { ad: 0.9 }, dtype: 'physical', slow: { v: 0.35, d: 1.5 }, color: 0xff6a40 }, 'area',
        'Golpe al suelo: 70/110/150/190/230 (+90 % AD) y ralentiza un 35 %.', { radius: 2.5 }),
      ab('xel_w', 'W', 'Piel de piedra', '🪨', 50, CD5(16, 12), 0, { type: 'shield', amount: N5(100, 45), hp: 0.1, dur: 4, color: 0xffa070 }, 'selfShield',
        'Escudo de 100/145/190/235/280 (+10 % de su vida máxima) durante 4 s.'),
      ab('xel_e', 'E', 'Embestida', '🦬', 50, CD5(14, 10), 6, { type: 'dash', dmg: N5(50, 30), ratio: { ad: 0.6 }, dtype: 'physical', stun: 0.6, firstOnly: true, color: 0xff6a40 }, 'gapclose',
        'Embiste: el primer enemigo recibe 50/80/110/140/170 (+60 % AD) y queda aturdido 0,6 s.'),
      ab('xel_r', 'R', 'Último aliento', '🔥', 100, [90, 75, 60], 0, { type: 'buff', dur: 6, as: 0.4, lifesteal: 0.3, dr: 0.2, color: 0xff6a40 }, 'ultLow',
        'Durante 6 s gana un 40 % de velocidad de ataque, un 30 % de robo de vida y un 20 % de reducción de daño.'),
    ],
    build: ['fang', 'heart', 'boots', 'thorns', 'katana', 'aegis'], prio: [0, 2, 1],
    look: { skin: 0xe8c8b0, hair: 0xd8d8e8, hairStyle: 'wild', top: 0x3a1a1a, accent: 0xff6a40, pants: 0x2a1414, weapon: 'axe', female: true, eye: '#ff6a40' },
  },
  // ------------------------------------------------------------ VRIZAHL
  vrizahl: {
    name: 'Vrizahl', title: 'Señor del trueno', role: 'Mago (ráfaga)', melee: false, color: '#6ac8ff',
    quote: '«Un relámpago no avisa».', lore: 'Hechicero de trueno con un daño de ráfaga ridículo y muy frágil. Su caja de fuerza aísla a un enemigo.',
    ...stats('mago', { base: { hp: 470, ap: 40 }, growth: { hp: 76, ap: 8 } }),
    passive: { id: 'vri_p', name: 'Sobrecarga', icon: '🔋', desc: 'Cada tercer hechizo hace que el siguiente inflija un 60 % más de daño.', kit: { ampEvery: 3, amp: 0.6, color: 0x6ac8ff } },
    abilities: [
      ab('vri_q', 'Q', 'Rayo', '⚡', 50, CD5(5, 3.5), 12, { type: 'skillshot', speed: 45, dmg: N5(90, 50), ratio: { ap: 0.8 }, color: 0x6ac8ff }, 'skillshot',
        'Rayo rapidísimo: 90/140/190/240/290 (+80 % AP) de daño mágico.'),
      ab('vri_w', 'W', 'Tormenta', '🌩️', 80, CD5(11, 8), 10, { type: 'area', radius: 3, delay: 0.7, dmg: N5(110, 55), ratio: { ap: 0.8 }, stun: 0.6, color: 0x9ad8ff }, 'area',
        'Tras 0,7 s cae una tormenta en la zona: 110/165/220/275/330 (+80 % AP) y aturde 0,6 s.', { radius: 3 }),
      ab('vri_e', 'E', 'Caja de fuerza', '📦', 80, CD5(22, 16), 9, { type: 'prison', dur: 3, color: 0x6ac8ff }, 'prison',
        'Encierra 3 s al héroe enemigo más cercano al cursor en una caja de fuerza: no puede hacer nada, pero tampoco recibe daño.'),
      ab('vri_r', 'R', 'Juicio del trueno', '🌪️', 100, [70, 60, 50], 18, { type: 'skillshot', pierce: true, width: 1.2, speed: 50, size: 0.7, dmg: N3(320, 180), ratio: { ap: 1.1 }, color: 0x6ac8ff, chain: { n: 3, range: 7, mult: 0.4 } }, 'lineUlt',
        'Una descarga atraviesa la línea (18 m): 320/500/680 (+110 % AP) y salta a enemigos cercanos.'),
    ],
    build: ['tome', 'moon', 'boots', 'staff', 'crystal', 'cloak'], prio: [0, 1, 2],
    look: { skin: 0xe8d4c4, hair: 0x2a3a5a, hairStyle: 'spiky', top: 0x1a2a4a, accent: 0x6ac8ff, pants: 0x101a30, weapon: 'staff', eye: '#6ac8ff' },
  },
  // ------------------------------------------------------------ CANDLE
  candle: {
    name: 'Candle', title: 'Chispa de tormenta', role: 'Maga (control)', melee: false, color: '#ffe060',
    quote: '«Un poco de chispa nunca sobra».', lore: 'Hechicera de trueno: escudos, control y muy buena limpiando oleadas.',
    ...stats('mago', { base: { hp: 545 } }),
    passive: { id: 'can_p', name: 'Chispa', icon: '🕯️', desc: 'Sus hechizos y ataques hacen un 60 % más de daño a súbditos y monstruos.', kit: { minionMult: 1.6, color: 0xffe060 } },
    abilities: [
      ab('can_q', 'Q', 'Cadena eléctrica', '⛓️', 45, CD5(6, 4), 10, { type: 'skillshot', dmg: N5(60, 30), ratio: { ap: 0.5 }, chain: { n: 3, range: 6, mult: 0.7 }, color: 0xffe060 }, 'skillshot',
        'Descarga que salta a 3 enemigos cercanos: 60/90/120/150/180 (+50 % AP).'),
      ab('can_w', 'W', 'Escudo estático', '🔰', 60, CD5(12, 9), 9, { type: 'shield', target: 'ally', amount: N5(80, 40), ap: 0.6, dur: 3, color: 0xffe060 }, 'shieldAlly',
        'Escudo de 80/120/160/200/240 (+60 % AP) a un aliado durante 3 s.'),
      ab('can_e', 'E', 'Campo eléctrico', '🟨', 70, CD5(12, 9), 9, { type: 'area', radius: 3.2, delay: 0.3, dmg: N5(40, 20), ratio: { ap: 0.3 }, color: 0xffe060, zone: { dur: 3, tick: 0.5, dmg: N5(30, 15), slow: 0.4 } }, 'area',
        'Electrifica la zona 3 s: daña y ralentiza un 40 % a quien esté dentro.', { radius: 3.2 }),
      ab('can_r', 'R', 'Tormenta eléctrica', '🌩️', 100, [90, 75, 60], 11, { type: 'area', radius: 5, delay: 0.5, dmg: N3(150, 90), ratio: { ap: 0.6 }, stun: 0.5, color: 0xffe060, zone: { dur: 4, tick: 0.5, dmg: N3(60, 30), stun: 0.4 } }, 'ultArea',
        'Una tormenta cubre la zona 4 s: daño continuo y aturdimientos al azar.', { radius: 5 }),
    ],
    build: ['tome', 'crystal', 'boots', 'staff', 'cloak', 'moon'], prio: [0, 2, 1],
    look: { skin: 0xfae6d6, hair: 0xffe060, hairStyle: 'bun', top: 0x2a2440, accent: 0xffe060, pants: 0x1e1a30, weapon: 'candle', female: true, eye: '#ffd040' },
  },
  // ------------------------------------------------------------ CABBO
  cabbo: {
    name: 'Cabbo', title: 'El gran corazón', role: 'Tanque / Sanador', melee: true, color: '#8ae070',
    quote: '«Tranquilos, yo aguanto».', lore: 'Tanque bonachón y resiliente que además cura a sus amigos.',
    ...stats('tanque', { base: { ap: 20 }, growth: { ap: 4 } }),
    passive: { id: 'cab_p', name: 'Resiliencia', icon: '💪', desc: 'Con menos de la mitad de vida se regenera un 1 % de su vida máxima por segundo.', kit: { regenLow: 0.01, color: 0x8ae070 } },
    abilities: [
      ab('cab_q', 'Q', 'Puñetazo', '👊', 40, CD5(9, 7), 6, { type: 'skillshot', speed: 26, dmg: N5(60, 30), ratio: { hp: 0.03 }, dtype: 'physical', stun: 0.75, color: 0x8ae070 }, 'skillshot',
        'Lanza un puñetazo a distancia: 60/90/120/150/180 (+3 % de su vida máxima) y aturde 0,75 s.'),
      ab('cab_w', 'W', 'Abrazo', '🤗', 60, CD5(12, 9), 8, { type: 'heal', amount: N5(80, 35), ap: 0.5, selfHeal: 0.5, color: 0x8ae070 }, 'healAlly',
        'Cura 80/115/150/185/220 (+50 % AP) a un aliado y la mitad a sí mismo.'),
      ab('cab_e', 'E', 'Pecho de acero', '🛡️', 50, CD5(14, 11), 0, { type: 'nova', radius: 4.5, dmg: N5(30, 20), taunt: 1.2, dr: 0.25, color: 0x8ae070 }, 'taunt',
        'Provoca a los enemigos cercanos (4,5 m) durante 1,2 s y gana un 25 % de reducción de daño.', { radius: 4.5 }),
      ab('cab_r', 'R', 'Corazón enorme', '💖', 100, [100, 85, 70], 0, { type: 'heal', radius: 10, amount: N3(150, 80), ap: 0.6, shield: N3(120, 80), color: 0x8ae070 }, 'ultHealAll',
        'Cura 150/230/310 (+60 % AP) y da un escudo a todos los aliados en 10 m.'),
    ],
    build: ['heart', 'tear', 'boots', 'shield', 'aegis', 'cloak'], prio: [1, 0, 2],
    look: { skin: 0xd8a880, hair: 0x6a8a3a, hairStyle: 'short', top: 0x5a7a3a, accent: 0xe8c860, pants: 0x3a4a2a, weapon: 'fists', eye: '#8ae070', bulky: true },
  },
  // ------------------------------------------------------------ KONTA
  konta: {
    name: 'Konta', title: 'El embaucador', role: 'Asesino', melee: true, color: '#ff9a40',
    quote: '«¿Me buscabas? Estaba detrás».', lore: 'Asesino tramposo: una embestida que aturde, sigilo y engaños.',
    ...stats('asesino'),
    passive: { id: 'kon_p', name: 'Truco', icon: '🃏', desc: 'Tras lanzar una habilidad, su siguiente ataque hace daño extra.', kit: { empowerAfterCast: 40, color: 0xff9a40 } },
    abilities: [
      ab('kon_q', 'Q', 'Cuchillas', '🔪', 30, CD5(6, 4), 5, { type: 'cone', angle: 70, dmg: N5(60, 35), ratio: { ad: 0.8 }, dtype: 'physical', color: 0xff9a40 }, 'cone',
        'Lanza cuchillas en abanico: 60/95/130/165/200 (+80 % AD) de daño físico.'),
      ab('kon_w', 'W', 'Señuelo', '🎭', 50, CD5(16, 12), 0, { type: 'stealth', dur: 1.5, spd: 0.4, color: 0xff9a40 }, 'stealthIn',
        'Desaparece 1,5 s y gana un 40 % de velocidad.'),
      ab('kon_e', 'E', 'Embestida aturdidora', '💫', 50, CD5(12, 9), 8, { type: 'dash', speed: 32, dmg: N5(70, 35), ratio: { ad: 0.7 }, dtype: 'physical', stun: 1.2, firstOnly: true, color: 0xff9a40 }, 'gapclose',
        'Una embestida potentísima: el primer enemigo recibe 70/105/140/175/210 (+70 % AD) y queda aturdido 1,2 s.'),
      ab('kon_r', 'R', 'Gran engaño', '🪄', 100, [80, 65, 50], 8, { type: 'blink', behindTarget: true, heroesOnly: true, dmg: N3(200, 120), ratio: { ad: 1.1 }, dtype: 'physical', stun: 1, color: 0xff9a40 }, 'execute',
        'Aparece detrás del héroe enemigo más cercano al cursor: 200/320/440 (+110 % AD) y lo aturde 1 s.'),
    ],
    build: ['sword', 'katana', 'boots', 'fang', 'scope', 'cloak'], prio: [2, 0, 1],
    look: { skin: 0xe8c8a8, hair: 0xff9a40, hairStyle: 'spiky', top: 0x2a1a10, accent: 0xff9a40, pants: 0x1a1008, weapon: 'daggers', eye: '#ffa040' },
  },
};

// ------------------------------------------------------------ CATARINA (rework)
// Peleadora de críticos con una sola habilidad de hielo y una definitiva de un solo corte que ejecuta.
const CATARINA = {
  role: 'Luchadora (críticos)', melee: true,
  ...stats('luchador', { base: { ad: 66, range: 2.8 } }),
  passive: { id: 'cat_p', name: 'Filo de Linerian', icon: '❄️', desc: '+25 % de probabilidad de crítico.', kit: { stats: { crit: 0.25 }, color: 0x9af0ff } },
  abilities: [
    ab('cat_q', 'Q', 'Paso del duelista', '🤺', 30, CD5(8, 5), 5, { type: 'dash', speed: 28, dmg: N5(40, 25), ratio: { ad: 0.6 }, dtype: 'physical', empower: N5(30, 20), color: 0xd0f4ff }, 'gapclose',
      'Se lanza hacia el cursor golpeando al pasar (40/65/90/115/140 +60 % AD); su siguiente ataque hace 30/50/70/90/110 de daño extra.'),
    ab('cat_w', 'W', 'Escarcha de Linerian', '🧊', 50, CD5(12, 9), 5, { type: 'cone', angle: 80, dmg: N5(60, 35), ratio: { ad: 0.8 }, dtype: 'physical', slow: { v: 0.5, d: 2 }, color: 0x9af0ff }, 'cone',
      'Su única habilidad de hielo: un tajo helado en abanico (60/95/130/165/200 +80 % AD) que ralentiza un 50 % durante 2 s.'),
    ab('cat_e', 'E', 'Danza de esgrima', '⚔️', 40, CD5(14, 10), 0, { type: 'buff', dur: 3, crit: 1, as: 0.3, color: 0xd0f4ff }, 'selfFight',
      'Durante 3 s todos sus ataques son críticos y gana un 30 % de velocidad de ataque.'),
    ab('cat_r', 'R', 'Corte final', '🗡️', 100, [80, 65, 50], 6, { type: 'execute', leap: true, dmg: N3(150, 100), ratio: { ad: 1.0 }, dtype: 'physical', threshold: [0.25, 0.3, 0.35], color: 0xd0f4ff }, 'execute',
      'Un solo corte sobre el héroe enemigo más cercano al cursor: 150/250/350 (+100 % AD). Si después le queda menos del 25/30/35 % de vida, lo ejecuta.'),
  ],
  build: ['sword', 'scope', 'boots', 'katana', 'fang', 'shield'], prio: [0, 1, 2],
};

// ------------------------------------------------------------ registro
for (const [id, def] of Object.entries(NEW)) {
  HEROES[id] = { id, ...def };
  if (!HERO_ORDER.includes(id)) HERO_ORDER.push(id);
}
Object.assign(HEROES.catarina, CATARINA);
for (const [id, def] of Object.entries(HEROES)) {
  if (def.passive?.kit) PASSIVE_IMPL[id] = makePassive(def.passive.kit);
}
