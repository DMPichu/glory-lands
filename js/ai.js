// Inteligencia artificial: héroes bot, súbditos y estructuras (torres y Lorik).
import * as THREE from 'three';
import { HEROES, ITEMS, LAYOUT, TEAMS, CONST } from './config.js';
import { dist2 } from './game.js';
import { laneProject, lanePoint, laneLength, nextWaypoint } from './map.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const STRUCT = ['tower', 'nexus', 'boss'];

// ------------------------------------------------------------------ HÉROES
export function heroAI(g, u, dt) {
  const ai = (u.ai ||= { think: Math.random() * 0.2, mode: 'lane', ox: (Math.random() - 0.5) * 5, oz: (Math.random() - 0.5) * 5, cast: 0 });
  if (u.channel || u.dash) return;
  ai.think -= dt;
  if (ai.think > 0) return;
  ai.think = (u.team === 'red' ? g.diff.think : 0.2) + Math.random() * 0.08;

  const enemyTeam = g.enemiesOf(u.team);
  const dir = TEAMS[u.team].dir;
  const fountain = LAYOUT[u.team].fountain;
  const hpR = u.hp / u.maxHp;
  const inFountain = g.nearFountain(u, u.team, CONST.fountainRadius - 1);
  const lane = u.lane || 'mid';
  // punto del carril a «s» metros de la base azul, con un pequeño desplazamiento propio
  const laneSpot = (sv) => { const q = lanePoint(lane, sv); return V(q.x + ai.ox, q.z + ai.oz); };

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
    if (u.recall) return;
    const far = dist2(u.pos, V(fountain.x, fountain.z)) > 45;
    const safe = !g.heroes.some((h) => h.alive && h.team === enemyTeam && dist2(h.pos, u.pos) < 16);
    if (far && safe && g.startRecall(u)) return;
    g.orderMove(u, V(fountain.x, fountain.z));
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
      g.orderMove(u, laneSpot(laneProject(lane, s.pos.x, s.pos.z).s - dir * (s.base.range + 4)));
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

  // --- jungla: monstruos épicos en grupo y campamentos cercanos
  if (jungleAI(g, u, hpR)) return;

  // --- posicionarse detrás de la oleada aliada de su carril
  const own = g.units.filter((m) => m.alive && m.kind === 'minion' && m.team === u.team && m.lane === lane);
  const progress = (o) => laneProject(lane, o.pos.x, o.pos.z).s;
  let sTarget;
  if (own.length) {
    const ss = own.map(progress);
    sTarget = (dir > 0 ? Math.max(...ss) : Math.min(...ss)) - dir * (u.def.melee ? 2 : 4);
  } else {
    // esperar junto a la torre aliada más avanzada del carril (o delante del núcleo)
    const towers = g.units.filter((s) => s.alive && s.team === u.team && s.kind === 'tower' && s.lane === lane);
    if (towers.length) {
      const ss = towers.map(progress);
      sTarget = (dir > 0 ? Math.max(...ss) : Math.min(...ss)) + dir * 3;
    } else sTarget = dir > 0 ? 8 : laneLength(lane) - 8;
  }
  // no meterse bajo una torre enemiga sin súbditos que la tanqueen
  for (let k = 0; k < 3; k++) {
    const target = laneSpot(sTarget);
    if (towerSafe(g, u, target)) break;
    for (const s of g.units) {
      if (!s.alive || s.team !== enemyTeam || !STRUCT.includes(s.kind)) continue;
      if (dist2(s.pos, target) < s.base.range + 2) sTarget = progress(s) - dir * (s.base.range + 2.5);
    }
  }
  const target = laneSpot(sTarget);
  if (dist2(target, u.pos) > 1.5) g.orderMove(u, target);
}

// Jungla: devuelve true si el bot se ha puesto a por un monstruo
function jungleAI(g, u, hpR) {
  if (!g.camps || hpR < 0.55) return false;
  // monstruos épicos: van los 3 bots sanos más cercanos de su equipo, a partir del nivel 6
  for (const camp of g.camps) {
    if (camp.side !== 'epic' || !camp.alive || u.level < 6) continue;
    const foesNear = g.heroes.some((h) => h.alive && h.team !== u.team && dist2(h.pos, camp.pos) < 22);
    const team = g.heroes.filter((h) => h.alive && h.team === u.team && h.isBot && h.hp / h.maxHp > 0.6 && h.level >= 6)
      .sort((a, b) => dist2(a.pos, camp.pos) - dist2(b.pos, camp.pos)).slice(0, 3);
    if (team.length < 3 || !team.includes(u) || foesNear) continue;
    const mon = g.nearest(camp.units.filter((m) => m.alive), u.pos);
    if (mon) { g.orderAttack(u, mon); return true; }
  }
  // campamentos menores cercanos cuando el carril está tranquilo
  let best = null, bd = 32;
  for (const camp of g.camps) {
    if (camp.side === 'epic' || !camp.alive) continue;
    const d = dist2(camp.pos, u.pos);
    if (d < bd) { bd = d; best = camp; }
  }
  if (!best) return false;
  if (g.heroes.some((h) => h.alive && h.team !== u.team && dist2(h.pos, best.pos) < 16)) return false;
  // no quitarle el campamento a un aliado que ya está en él
  if (g.heroes.some((h) => h !== u && h.alive && h.team === u.team && dist2(h.pos, best.pos) < 8)) return false;
  const mon = g.nearest(best.units.filter((m) => m.alive), u.pos);
  if (!mon) return false;
  g.orderAttack(u, mon);
  return true;
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
  const fountain = V(LAYOUT[u.team].fountain.x, LAYOUT[u.team].fountain.z);
  const lead = e ? predict(e, dE / 26) : null;
  const allyHeroes = g.alliesInRadius(u.team, u.pos, 14, ['hero']);
  const away = e ? V(u.pos.x - (e.pos.x - u.pos.x), u.pos.z - (e.pos.z - u.pos.z)) : fountain;

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
        else if (fight && dE < 3 && hpR < 0.5 && !u.def.melee) cast(away);
        else if (u.heroId === 'yeslie' && (g.hasBuff(u, 'stun') || g.hasBuff(u, 'root')) && e) cast(fountain);
        break;
      case 'healZone': {
        const hurt = allyHeroes.filter((h) => h.hp / h.maxHp < 0.6);
        if (hurt.length && (fight || hurt.length >= 2)) cast(centroid(hurt));
        break;
      }
      case 'shieldAlly': {
        const near = g.alliesInRadius(u.team, u.pos, def.range, ['hero']);
        const low = near.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b), u);
        if (low.hp / low.maxHp < 0.6 || (fight && low.hp / low.maxHp < 0.85)) cast(low.pos);
        break;
      }
      case 'ultHealAll': {
        const low = allyHeroes.filter((h) => h.hp / h.maxHp < 0.4).length;
        if (e && (low >= 2 || (low >= 1 && fight))) cast(u.pos);
        break;
      }
      case 'ultDome': {
        const foes = g.enemiesInRadius(u.team, u.pos, def.radius - 1, ['hero']).length;
        if (fight && foes >= 1 && (foes >= 2 || eR < 0.5)) cast(u.pos);
        break;
      }
      case 'ultLow':
        if (fight && hpR < 0.35 && dE < 5) cast(u.pos);
        break;
      case 'lineUlt':
        if (e && !ctx.retreat && dE < def.range * 0.8 && (eR < 0.55 || fight)) cast(lead);
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
  // seguir el camino de su carril hacia la base enemiga
  const dir = TEAMS[u.team].dir;
  const lane = u.lane || 'mid';
  const wp = nextWaypoint(lane, laneProject(lane, u.pos.x, u.pos.z).s, dir);
  const goal = wp ?? LAYOUT[enemyTeam].nexus;
  u.order = { type: 'move', point: V(goal.x, goal.z) };
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
      g.sound('lorik_raices', c);
    });
  }
  if (!s.protected && st.summonCd <= 0 && heroes.length) {
    st.summonCd = 18;
    g.summonAngels(s, 2);
    g.sound('lorik_invoca', s.pos);
    g.emit('message', { text: 'Lorik invoca ángeles corrompidos', kind: 'danger' });
  }
}
