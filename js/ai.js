// Inteligencia artificial: héroes bot, súbditos y estructuras (torres y Lorik).
import * as THREE from 'three';
import { HEROES, ITEMS, LAYOUT, TEAMS, CONST } from './config.js';
import { dist2 } from './game.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const STRUCT = ['tower', 'nexus', 'boss'];

// ------------------------------------------------------------------ HÉROES
export function heroAI(g, u, dt) {
  const ai = (u.ai ||= { think: Math.random() * 0.2, mode: 'lane', zOff: (Math.random() - 0.5) * 6, cast: 0 });
  if (u.channel || u.dash) return;
  ai.think -= dt;
  if (ai.think > 0) return;
  ai.think = (u.team === 'red' ? g.diff.think : 0.2) + Math.random() * 0.08;

  const enemyTeam = g.enemiesOf(u.team);
  const dir = TEAMS[u.team].dir;
  const fountainX = LAYOUT[u.team].fountain;
  const hpR = u.hp / u.maxHp;
  const inFountain = Math.abs(u.pos.x - fountainX) < CONST.fountainRadius - 1;

  // compras
  if (g.inShop(u)) botShop(g, u);

  // pociones
  if (hpR < 0.5 && u.potions > 0 && !g.getBuff(u, 'potion')) g.usePotion(u);

  const enemyHeroes = g.heroes.filter((h) => h.team === enemyTeam && h.alive && dist2(h.pos, u.pos) < 14);
  const nearEnemy = g.nearest(enemyHeroes, u.pos);

  // --- volver a la base
  const wantsShop = u.gold >= 1500 && hpR < 0.75 && !nearEnemy;
  if (ai.mode !== 'retreat' && (hpR < 0.27 || (hpR < 0.4 && nearEnemy && nearEnemy.hp / nearEnemy.maxHp > hpR + 0.25) || wantsShop)) ai.mode = 'retreat';
  if (ai.mode === 'retreat') {
    if (inFountain) {
      u.order = null;
      if (hpR > 0.95 && u.mp / Math.max(1, u.maxMp) > 0.8) ai.mode = 'lane';
      return;
    }
    // escapar con habilidades
    if (nearEnemy && dist2(nearEnemy.pos, u.pos) < 6) {
      useAbilities(g, u, { retreat: true, enemy: nearEnemy });
    }
    g.orderMove(u, V(fountainX, 0));
    return;
  }

  // --- pelea contra héroes
  let fightTarget = null;
  if (nearEnemy) {
    const eR = nearEnemy.hp / nearEnemy.maxHp;
    const d = dist2(nearEnemy.pos, u.pos);
    const safe = towerSafe(g, u, nearEnemy.pos);
    const allies = g.heroes.filter((h) => h.team === u.team && h.alive && dist2(h.pos, u.pos) < 12).length;
    const foes = enemyHeroes.filter((h) => dist2(h.pos, u.pos) < 12).length;
    let score = (hpR - eR) * 2 + (u.level - nearEnemy.level) * 0.25 + (allies - foes) * 0.5;
    if (eR < 0.3) score += 0.8;
    const aggressive = score > -0.15;
    const dive = eR < 0.18 && hpR > 0.5;
    if (aggressive && (safe || dive) && d < 11) fightTarget = nearEnemy;
  }

  if (fightTarget) {
    useAbilities(g, u, { fight: true, enemy: fightTarget });
    if (!u.channel && !u.dash) g.orderAttack(u, fightTarget);
    return;
  }

  // Si nos está golpeando una torre, salir de su alcance
  for (const s of g.units) {
    if (!s.alive || s.team !== enemyTeam || !STRUCT.includes(s.kind)) continue;
    if (s.order?.target === u && dist2(s.pos, u.pos) < s.base.range + 2) {
      g.orderMove(u, V(s.pos.x - dir * (s.base.range + 4), u.pos.z));
      return;
    }
  }

  useAbilities(g, u, { farm: true, enemy: nearEnemy });

  // --- farmear súbditos
  const range = g.attackRange(u);
  const minions = g.enemiesInRadius(u.team, u.pos, range + 6, ['minion']).filter((m) => towerSafe(g, u, m.pos));
  if (minions.length) {
    // prioriza el que se pueda rematar
    const ad = g.stat(u, 'ad');
    let target = minions.find((m) => m.hp < ad * 0.9);
    if (!target) target = minions.reduce((a, b) => (a.hp < b.hp ? a : b));
    g.orderAttack(u, target);
    return;
  }

  // --- empujar estructuras si nuestros súbditos están debajo
  const structs = g.units.filter((s) => s.alive && s.team === enemyTeam && STRUCT.includes(s.kind) && g.isTargetable(s) && dist2(s.pos, u.pos) < 20);
  for (const s of structs) {
    const tanks = g.units.filter((m) => m.alive && m.kind === 'minion' && m.team === u.team && dist2(m.pos, s.pos) < s.base.range);
    const towerOnMe = s.order?.target === u;
    if (tanks.length >= 1 && !towerOnMe) { g.orderAttack(u, s); return; }
  }

  // --- posicionarse detrás de la oleada aliada
  const own = g.units.filter((m) => m.alive && m.kind === 'minion' && m.team === u.team);
  let frontX;
  if (own.length) {
    frontX = dir > 0 ? Math.max(...own.map((m) => m.pos.x)) : Math.min(...own.map((m) => m.pos.x));
    frontX -= dir * (u.def.melee ? 2 : 4);
  } else {
    // esperar junto a la torre aliada más avanzada
    const towers = g.units.filter((s) => s.alive && s.team === u.team && STRUCT.includes(s.kind));
    if (!towers.length) return;
    const t = towers.reduce((a, b) => (dir > 0 ? (a.pos.x > b.pos.x ? a : b) : (a.pos.x < b.pos.x ? a : b)));
    frontX = t.pos.x + dir * 3;
  }
  const target = V(frontX, ai.zOff);
  // no meterse bajo torre enemiga
  if (!towerSafe(g, u, target)) {
    for (const s of g.units) {
      if (!s.alive || s.team !== enemyTeam || !STRUCT.includes(s.kind)) continue;
      if (dist2(s.pos, target) < s.base.range + 2) target.x = s.pos.x - dir * (s.base.range + 2.5);
    }
  }
  if (dist2(target, u.pos) > 1.2) g.orderMove(u, target);
}

// ¿Es seguro estar en esta posición respecto a las estructuras enemigas?
export function towerSafe(g, u, pos) {
  for (const s of g.units) {
    if (!s.alive || s.team === u.team || !STRUCT.includes(s.kind)) continue;
    if (dist2(s.pos, pos) > s.base.range + 1.5) continue;
    if (s.order?.target === u) return false;
    const tanks = g.units.filter((m) => m.alive && m.kind === 'minion' && m.team === u.team && dist2(m.pos, s.pos) < s.base.range);
    if (tanks.length < 2) return false;
  }
  return true;
}

function botShop(g, u) {
  if (u.potions < 2 && u.gold >= 50 && u.items.length < 2) { g.buy(u, 'potion'); }
  const build = HEROES[u.heroId].build;
  const next = build[u.items.length];
  if (next && u.gold >= ITEMS[next].cost) g.buy(u, next);
}

function canUse(g, u, i) {
  const a = u.abilities[i];
  if (!a || a.rank === 0 || a.cd > 0) return false;
  const cost = g.getBuff(u, 'yes_page') ? 0 : a.def.cost[a.rank - 1];
  return u.mp >= cost;
}

function useAbilities(g, u, ctx) {
  const e = ctx.enemy;
  const dE = e ? dist2(e.pos, u.pos) : Infinity;
  const eR = e ? e.hp / e.maxHp : 1;
  const hpR = u.hp / u.maxHp;
  const mpR = u.mp / Math.max(1, u.maxMp);
  const fight = !!ctx.fight;
  const fountain = V(LAYOUT[u.team].fountain, 0);
  const lead = e ? predict(e, dE / 26) : null;

  for (let i = 0; i < 4; i++) {
    if (!canUse(g, u, i)) continue;
    if (u.channel || u.dash) return;
    const def = u.abilities[i].def;
    const cast = (p, t) => g.castAbility(u, i, p, t);
    switch (def.ai) {
      case 'selfFight':
        if (fight && dE < 6.5) cast(u.pos);
        break;
      case 'healAlly': {
        const allies = g.alliesInRadius(u.team, u.pos, def.range, ['hero']);
        const low = allies.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b), u);
        if (low.hp / low.maxHp < 0.55) cast(low.pos);
        break;
      }
      case 'engage':
        if (fight && dE < def.range && dE > 2.5) cast(e.pos);
        else {
          const ally = g.heroes.find((h) => h.team === u.team && h !== u && h.alive && h.hp / h.maxHp < 0.4 && dist2(h.pos, u.pos) < def.range);
          if (ally && e) cast(ally.pos);
        }
        break;
      case 'ultFight': {
        const lowAlly = g.alliesInRadius(u.team, u.pos, 6, ['hero']).some((h) => h.hp / h.maxHp < 0.55);
        if (fight && dE < 6 && lowAlly) cast(u.pos);
        break;
      }
      case 'gapclose':
        if (fight && dE < 4.8) cast(e.pos);
        else if (ctx.farm && mpR > 0.7 && Math.random() < 0.15) {
          const m = g.nearest(g.enemiesInRadius(u.team, u.pos, 4, ['minion']), u.pos);
          if (m) cast(m.pos);
        }
        break;
      case 'rewind': {
        const old = u.history[0];
        if (hpR < 0.35 && old && old.hp / u.maxHp > hpR + 0.15) cast(u.pos);
        break;
      }
      case 'taunt':
        if (fight && dE < 4.5) cast(u.pos);
        break;
      case 'ultArea':
        if (fight && dE < def.range - 0.5 && (eR < 0.7 || hpR < 0.5)) cast(e.pos);
        break;
      case 'skillshot':
        if (e && !ctx.retreat && dE < def.range - 0.5 && (fight || mpR > 0.4)) cast(lead);
        else if (ctx.farm && mpR > 0.55 && Math.random() < 0.25) {
          const m = g.nearest(g.enemiesInRadius(u.team, u.pos, def.range - 1, ['minion']), u.pos);
          if (m) cast(m.pos);
        }
        break;
      case 'area':
        if (e && !ctx.retreat && dE < def.range && (fight || mpR > 0.5)) cast(lead);
        else if (ctx.farm && mpR > 0.6) {
          const ms = g.enemiesInRadius(u.team, u.pos, def.range, ['minion']);
          if (ms.length >= 3) cast(centroid(ms));
        }
        break;
      case 'escape':
        if (ctx.retreat && dE < 6) cast(fountain);
        else if (u.heroId === 'astrid' && fight && dE < 2.5 && hpR < 0.5) cast(V(u.pos.x - (e.pos.x - u.pos.x), u.pos.z - (e.pos.z - u.pos.z)));
        else if (u.heroId === 'yeslie' && (g.hasBuff(u, 'stun') || g.hasBuff(u, 'root')) && e) cast(fountain);
        break;
      case 'ultSelf':
        if (fight && dE < 8) cast(u.pos);
        break;
      case 'cone':
        if (fight && dE < def.range) cast(e.pos);
        else if (ctx.farm && mpR > 0.5) {
          const ms = g.enemiesInRadius(u.team, u.pos, def.range, ['minion']);
          if (ms.length >= 2) cast(centroid(ms));
        }
        break;
      case 'mark':
        if (fight && dE < def.range) cast(e.pos);
        break;
      case 'snipe':
        if (e && dE < 30 && (eR < 0.4 || (fight && eR < 0.65))) cast(lead);
        else {
          const far = g.heroes.find((h) => h.team !== u.team && h.alive && h.hp / h.maxHp < 0.25 && dist2(h.pos, u.pos) < 35);
          if (far) cast(far.pos);
        }
        break;
      default:
        break;
    }
  }
}

function predict(e, t) {
  const p = e.pos.clone();
  if (e.order?.type === 'move' && e.moving) {
    const d = V(e.order.point.x - e.pos.x, e.order.point.z - e.pos.z);
    const len = d.length();
    if (len > 0.1) p.addScaledVector(d.normalize(), Math.min(len, 6.8 * t));
  }
  return p;
}

function centroid(list) {
  const c = V(0, 0);
  for (const m of list) { c.x += m.pos.x; c.z += m.pos.z; }
  c.x /= list.length; c.z /= list.length;
  return c;
}

// ------------------------------------------------------------------ SÚBDITOS
export function minionAI(g, u, dt) {
  u.think = (u.think ?? Math.random() * 0.25) - dt;
  if (u.think > 0) return;
  u.think = 0.25;
  if (g.hasBuff(u, 'taunt')) return;

  const enemyTeam = g.enemiesOf(u.team);
  const sight = 9;
  const cur = u.order?.type === 'attack' ? u.order.target : null;

  // ayuda a un héroe aliado atacado
  if (u.callForHelp && g.time - u.callForHelp.t < 2 && u.callForHelp.unit.alive && dist2(u.callForHelp.unit.pos, u.pos) < sight) {
    u.order = { type: 'attack', target: u.callForHelp.unit };
    return;
  }
  if (cur && cur.alive && g.isTargetable(cur) && dist2(cur.pos, u.pos) < sight + 2) return;

  const enemies = g.enemiesInRadius(u.team, u.pos, sight);
  let target = g.nearest(enemies.filter((e) => e.kind === 'minion'), u.pos);
  if (!target) target = g.nearest(enemies.filter((e) => STRUCT.includes(e.kind)), u.pos);
  if (!target) target = g.nearest(enemies.filter((e) => e.kind === 'hero' && dist2(e.pos, u.pos) < 6.5), u.pos);
  if (target) {
    u.order = { type: 'attack', target };
    return;
  }
  const goalX = LAYOUT[enemyTeam].nexus;
  u.order = { type: 'move', point: V(goalX, u.pos.z * 0.9) };
}

// ------------------------------------------------------------------ ESTRUCTURAS
export function structureAI(g, s, dt) {
  const range = s.base.range;
  if (s.kind === 'boss') bossAbilities(g, s, dt);

  const cur = s.order?.type === 'attack' ? s.order.target : null;
  // prioridad: héroe que ataca a un héroe aliado bajo la torre
  if (s.aggro && g.time - s.aggro.t < 2.5 && s.aggro.unit.alive && dist2(s.aggro.unit.pos, s.pos) <= range + s.aggro.unit.radius) {
    s.order = { type: 'attack', target: s.aggro.unit };
    return;
  }
  if (cur && cur.alive && dist2(cur.pos, s.pos) <= range + cur.radius) return;
  const enemies = g.enemiesInRadius(s.team, s.pos, range);
  let target = g.nearest(enemies.filter((e) => e.kind === 'minion'), s.pos);
  if (!target) target = g.nearest(enemies.filter((e) => e.kind === 'hero'), s.pos);
  s.order = target ? { type: 'attack', target } : null;
}

function bossAbilities(g, s, dt) {
  const st = s.state;
  st.rootCd -= dt;
  st.summonCd -= dt;
  const heroes = g.heroes.filter((h) => h.team !== s.team && h.alive && dist2(h.pos, s.pos) < 13);
  if (st.rootCd <= 0 && heroes.length) {
    st.rootCd = 7;
    const h = heroes[Math.floor(Math.random() * heroes.length)];
    const c = h.pos.clone();
    g.fx.ring(c, 2.4, 0x8a2aff, 0.9, { fill: true, opacity: 0.35, steady: true });
    g.fx.ring(c, 2.4, 0xb06aff, 0.9, { opacity: 0.9, steady: true });
    g.after(0.9, () => {
      if (!s.alive) return;
      for (const e of g.enemiesInRadius(s.team, c, 2.4, ['hero', 'minion'])) {
        g.addBuff(e, 'root', 1.2, 0, { key: 'lorik_root' });
        g.dealDamage(s, e, 140 + g.time * 0.15, 'magic');
      }
      g.fx.burst(c, 0x8a2aff, 30, 3, 0.15, 0.8, 3);
    });
  }
  if (!s.protected && st.summonCd <= 0 && heroes.length) {
    st.summonCd = 18;
    g.summonAngels(s, 2);
    g.emit('message', { text: 'Lorik invoca ángeles corrompidos', kind: 'danger' });
  }
}
