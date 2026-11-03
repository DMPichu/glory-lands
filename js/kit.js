// Habilidades genéricas («kit»): cada habilidad de los héroes nuevos se describe con
// datos en js/roster.js (tipo + números) y aquí se ejecuta. Así 17 héroes comparten
// código probado. Tipos: skillshot, area, cone, dash, blink, buff, shield, heal, nova,
// stealth, execute, prison. Las pasivas también son genéricas (ver PASSIVE_KIT).
import * as THREE from 'three';
import { dist2 } from './game.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const R = (arr, rank) => (Array.isArray(arr) ? arr[Math.min(arr.length, rank) - 1] : arr ?? 0);

function dirTo(u, p) {
  const d = V(p.x - u.pos.x, p.z - u.pos.z);
  if (d.lengthSq() < 1e-4) d.set(Math.sin(u.facing), 0, Math.cos(u.facing));
  return d.normalize();
}
function clampRange(u, p, range) {
  const d = dist2(u.pos, p);
  if (d <= range) return p.clone();
  const dir = dirTo(u, p);
  return V(u.pos.x + dir.x * range, u.pos.z + dir.z * range);
}
// aliado más cercano al cursor dentro del alcance (o uno mismo)
function allyNear(g, u, p, range) {
  let best = u, bd = dist2(u.pos, p);
  for (const a of g.alliesInRadius(u.team, u.pos, range, ['hero'])) {
    const d = dist2(a.pos, p);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}
// enemigo más cercano al cursor (los héroes cuentan como más cerca)
function enemyNear(g, u, p, range, heroesOnly) {
  let best = null, bd = Infinity;
  for (const e of g.enemiesInRadius(u.team, u.pos, range, heroesOnly ? ['hero'] : ['hero', 'minion'])) {
    const d = dist2(e.pos, p) - (e.kind === 'hero' ? 2.5 : 0);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ------------------------------------------------------------------ daño y efectos
export function kitDamage(g, u, e, s, rank, mult = 1) {
  if (!e?.alive) return 0;
  let amt = R(s.dmg, rank) + (s.ratio?.ad || 0) * g.stat(u, 'ad') + (s.ratio?.ap || 0) * g.stat(u, 'ap') + (s.ratio?.hp || 0) * u.maxHp;
  if (s.missing) amt += s.missing * (e.maxHp - e.hp); // daño extra según la vida que le falta
  amt *= mult;
  const P = u.def?.passive?.kit;
  // potenciación pendiente (Vrizahl, Emmeline): la consume el primer impacto
  const amp = g.getBuff(u, 'kit_amp');
  if (amp) { amt *= 1 + amp.value; amp.used = true; }
  if (P?.minionMult && e.kind !== 'hero') amt *= P.minionMult;
  if (P?.heroMult && e.kind === 'hero') amt *= P.heroMult;
  if (P?.lowHpDamage) amt *= 1 + P.lowHpDamage * (1 - u.hp / u.maxHp);
  // combo de Zeflie y Zestari: cada una explota la marca de la otra
  if (s.bonusVsMark && g.getBuff(e, s.bonusVsMark.key)) {
    amt *= 1 + s.bonusVsMark.mult;
    g.removeBuff(e, s.bonusVsMark.key);
    g.fx.burst(e.pos, s.bonusVsMark.color ?? 0xffffff, 18, 4, 0.14, 0.5, 2);
    g.fx.ring(e.pos, 2, s.bonusVsMark.color ?? 0xffffff, 0.4, { grow: true });
  }
  return g.dealDamage(u, e, amt, s.dtype || 'magic');
}

function applyCC(g, u, e, s, rank) {
  if (!e?.alive) return;
  if (s.slow) g.addBuff(e, 'slow', s.slow.d ?? 1.5, s.slow.v ?? 0.3);
  if (s.stun) g.addBuff(e, 'stun', R(s.stun, rank), 0);
  if (s.root) g.addBuff(e, 'root', R(s.root, rank), 0);
  if (s.weak) g.addBuff(e, 'weak', s.weak.d ?? 2, s.weak.v ?? 0.25);
  if (s.mark) { g.addBuff(e, 'kitmark', s.mark.dur ?? 4, 0, { key: s.mark.key }); g.fx.ring(e.pos, 1.3, s.mark.color ?? 0xffffff, s.mark.dur ?? 4, { follow: e, steady: true, opacity: 0.6 }); }
  if (s.dot) g.addBuff(e, 'dot', s.dot.d ?? 3, R(s.dot.v, rank) + (s.dot.ap || 0) * g.stat(u, 'ap'), { key: 'kitdot_' + u.id, src: u });
  if (s.knock) { const d = dirTo(u, e.pos); g.knockback(e, d.x, d.z, s.knock, 0.25); }
  if (s.taunt) { g.addBuff(e, 'taunt', R(s.taunt, rank), 0, { src: u }); e.order = { type: 'attack', target: u, forced: true }; }
}

function hitFx(g, pos, color, big) {
  g.fx.burst(pos, color, big ? 20 : 10, big ? 5 : 3, 0.13, 0.45, 1.5);
  if (big) g.fx.ring(pos, 1.8, color, 0.4, { grow: true });
}

// ------------------------------------------------------------------ tipos de habilidad
export const KIT = {
  skillshot(g, u, rank, p, def, s) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    const col = s.color ?? 0xffffff;
    g.spawnSkillshot(u, dir, {
      color: col, size: s.size ?? 0.35, speed: s.speed ?? 28, range: def.range, width: s.width ?? 0.7, pierce: !!s.pierce, trail: true,
      onHit: (e) => {
        kitDamage(g, u, e, s, rank);
        applyCC(g, u, e, s, rank);
        hitFx(g, e.pos, col, !s.pierce);
        if (s.chain) { // rayo encadenado
          let from = e, done = new Set([e.id]);
          for (let i = 0; i < s.chain.n; i++) {
            const nx = g.nearest(g.enemiesInRadius(u.team, from.pos, s.chain.range ?? 6).filter((o) => !done.has(o.id)), from.pos);
            if (!nx) break;
            done.add(nx.id);
            g.fx.lightning(from.pos.clone().setY(1.2), nx.pos.clone().setY(1.2), col, 0.3);
            kitDamage(g, u, nx, s, rank, s.chain.mult ?? 0.6);
            from = nx;
          }
        }
      },
    });
    return true;
  },

  area(g, u, rank, p, def, s) {
    const c = clampRange(u, p, def.range);
    const r = s.radius ?? def.radius ?? 3;
    const col = s.color ?? 0xffffff;
    const delay = s.delay ?? 0.4;
    g.face(u, c);
    u.attackAnim = 0.001;
    g.fx.ring(c, r, col, delay + 0.05, { fill: true, opacity: 0.3, steady: true });
    g.fx.ring(c, r, col, delay + 0.05, { opacity: 0.9, steady: true });
    g.after(delay, () => {
      if (!u.alive && !s.persist) return;
      for (const e of g.enemiesInRadius(u.team, c, r, ['hero', 'minion'])) { kitDamage(g, u, e, s, rank); applyCC(g, u, e, s, rank); }
      g.fx.ring(c, r, col, 0.5, { grow: true });
      g.fx.burst(c, col, 30, 6, 0.15, 0.6, 2.5);
      g.shake?.(0.1, c);
      if (s.zone) zone(g, u, rank, c, r, s.zone, col);
    });
    return true;
  },

  cone(g, u, rank, p, def, s) {
    const dir = dirTo(u, p);
    const range = def.range, half = (s.angle ?? 60) * Math.PI / 360;
    g.face(u, p);
    u.attackAnim = 0.001;
    const col = s.color ?? 0xffffff;
    const hits = g.enemiesInRadius(u.team, u.pos, range, ['hero', 'minion']).filter((e) => V(e.pos.x - u.pos.x, e.pos.z - u.pos.z).normalize().dot(dir) > Math.cos(half));
    const times = s.hits ?? 1;
    for (let k = 0; k < times; k++) {
      g.after(k * 0.18, () => {
        for (const e of hits) { kitDamage(g, u, e, s, rank, 1 / Math.max(1, times * 0.7)); if (k === 0) applyCC(g, u, e, s, rank); hitFx(g, e.pos, col); }
      });
    }
    for (let i = 0; i < 18; i++) {
      const a = (Math.random() - 0.5) * half * 2, rr = Math.random() * range;
      const c = Math.cos(a), sn = Math.sin(a);
      g.fx.spark(V(u.pos.x + (dir.x * c - dir.z * sn) * rr, u.pos.z + (dir.x * sn + dir.z * c) * rr).setY(1), col, 0.13, 0.4, 0.4);
    }
    return true;
  },

  dash(g, u, rank, p, def, s) {
    const dir = dirTo(u, p);
    const dest = clampRange(u, p, def.range);
    const col = s.color ?? 0xffffff;
    const hit = new Set();
    let first = false;
    u.attackAnim = 0.001;
    g.dashTo(u, dest, s.speed ?? 24, {
      onStep: () => {
        if (Math.random() < 0.6) g.fx.spark(u.pos.clone().setY(0.5), col, 0.12, 0.35, 0.4);
        if (s.firstOnly && first) return;
        for (const e of g.enemiesInRadius(u.team, u.pos, 1.5, ['hero', 'minion'])) {
          if (hit.has(e.id)) continue;
          hit.add(e.id); first = true;
          kitDamage(g, u, e, s, rank);
          applyCC(g, u, e, s, rank);
          hitFx(g, e.pos, col, true);
          if (s.firstOnly) { u.dash = null; break; }
        }
      },
      onArrive: () => {
        if (s.landRadius) {
          for (const e of g.enemiesInRadius(u.team, u.pos, s.landRadius, ['hero', 'minion'])) if (!hit.has(e.id)) { kitDamage(g, u, e, s, rank); applyCC(g, u, e, s, rank); }
          g.fx.ring(u.pos, s.landRadius, col, 0.5, { grow: true });
          g.fx.burst(u.pos, col, 20, 5, 0.14, 0.5, 2);
        }
        if (s.empower) g.addBuff(u, 'kitemp', 4, R(s.empower, rank), { key: 'kit_emp' });
        if (s.dodgeAfter) g.addBuff(u, 'dodge', s.dodgeAfter, 1, { key: 'kit_dodge_after' });
      },
    });
    void dir;
    return true;
  },

  blink(g, u, rank, p, def, s) {
    const col = s.color ?? 0xffffff;
    let dest;
    let target = null;
    if (s.behindTarget) {
      target = enemyNear(g, u, p, def.range, s.heroesOnly);
      if (!target) { if (u.isPlayer) g.emit('message', { text: 'No hay enemigos al alcance', kind: 'warn' }); return false; }
      const d = dirTo(u, target.pos);
      dest = V(target.pos.x + d.x * (target.radius + 0.9), target.pos.z + d.z * (target.radius + 0.9));
    } else dest = clampRange(u, p, def.range);
    g.clampPos(dest);
    g.fx.burst(u.pos, col, 16, 3, 0.13, 0.5, 2);
    u.pos.set(dest.x, 0, dest.z);
    u.order = target ? { type: 'attack', target } : null;
    u.dash = null;
    if (s.cleanse) g.cleanse(u);
    g.fx.burst(u.pos, col, 16, 3, 0.13, 0.5, 2);
    g.fx.ring(u.pos, 1.6, col, 0.5, { grow: true });
    if (target && s.dmg) { kitDamage(g, u, target, s, rank); applyCC(g, u, target, s, rank); hitFx(g, target.pos, col, true); }
    if (s.empower) g.addBuff(u, 'kitemp', 4, R(s.empower, rank), { key: 'kit_emp' });
    return true;
  },

  buff(g, u, rank, p, def, s) {
    const d = R(s.dur, rank) || 4;
    const col = s.color ?? 0xffe08a;
    if (s.as) g.addBuff(u, 'as', d, R(s.as, rank), { key: 'kit_as_' + def.id });
    if (s.crit) g.addBuff(u, 'crit', d, R(s.crit, rank), { key: 'kit_crit_' + def.id });
    if (s.spd) g.addBuff(u, 'spd', d, R(s.spd, rank), { key: 'kit_spd_' + def.id });
    if (s.dr) g.addBuff(u, 'dr', d, R(s.dr, rank), { key: 'kit_dr_' + def.id });
    if (s.ad) g.addBuff(u, 'bonus_ad', d, R(s.ad, rank), { key: 'kit_ad_' + def.id });
    if (s.armor) { g.addBuff(u, 'bonus_armor', d, R(s.armor, rank), { key: 'kit_ar_' + def.id }); g.addBuff(u, 'bonus_mr', d, R(s.armor, rank), { key: 'kit_mr_' + def.id }); }
    if (s.lifesteal) g.addBuff(u, 'bonus_lifesteal', d, R(s.lifesteal, rank), { key: 'kit_ls_' + def.id });
    if (s.dodge) g.addBuff(u, 'dodge', d, R(s.dodge, rank), { key: 'kit_dodge_' + def.id });
    if (s.ranged) g.addBuff(u, 'kitranged', d, s.ranged.range, { key: 'kit_ranged' }); // ataques a distancia (Umi)
    if (s.onhit) g.addBuff(u, 'kitonhit', d, R(s.onhit, rank), { key: 'kit_onhit_' + def.id });
    if (s.heal) g.heal(u, R(s.heal, rank) + (s.healAp || 0) * g.stat(u, 'ap'), u);
    if (s.shield) g.addShield(u, R(s.shield, rank) + (s.shieldHp || 0) * u.maxHp, d, u);
    g.fx.ring(u.pos, 1.8, col, 0.6, { grow: true });
    g.fx.burst(u.pos.clone().setY(1), col, 16, 2.5, 0.12, 0.6, 2);
    u.attackCd = Math.min(u.attackCd, 0.1);
    return true;
  },

  shield(g, u, rank, p, def, s) {
    const t = s.target === 'ally' ? allyNear(g, u, p, def.range || 8) : u;
    const amt = R(s.amount, rank) + (s.ap || 0) * g.stat(u, 'ap') + (s.hp || 0) * u.maxHp;
    g.addShield(t, amt, s.dur ?? 3, u);
    if (s.heal) g.heal(t, R(s.heal, rank) + (s.ap || 0) * 0.5 * g.stat(u, 'ap'), u);
    if (s.dr) g.addBuff(t, 'dr', s.dur ?? 3, s.dr, { key: 'kit_sdr_' + def.id });
    if (s.cleanse) g.cleanse(t);
    const col = s.color ?? 0x9ad8ff;
    g.fx.ring(t.pos, 1.6, col, 0.8, { grow: true });
    g.fx.burst(t.pos.clone().setY(1), col, 18, 2, 0.12, 0.7, 2);
    if (t !== u) g.fx.beam(u.pos.clone().setY(1.4), t.pos.clone().setY(1.4), col, 0.3);
    return true;
  },

  heal(g, u, rank, p, def, s) {
    const col = s.color ?? 0x8dff9a;
    const amt = R(s.amount, rank) + (s.ap || 0) * g.stat(u, 'ap');
    const targets = s.radius ? g.alliesInRadius(u.team, u.pos, s.radius, ['hero']) : [allyNear(g, u, p, def.range || 8)];
    for (const t of targets) {
      g.heal(t, amt, u);
      if (s.cleanse) g.cleanse(t);
      if (s.shield) g.addShield(t, R(s.shield, rank), 4, u);
      g.fx.ring(t.pos, 1.5, col, 0.7, { grow: true });
      g.fx.burst(t.pos.clone().setY(1), col, 14, 2, 0.12, 0.8, 2.5);
    }
    if (s.radius) g.fx.ring(u.pos, s.radius, col, 0.8, { grow: true });
    if (s.selfHeal) g.heal(u, amt * s.selfHeal, u);
    return true;
  },

  nova(g, u, rank, p, def, s) {
    const r = s.radius ?? def.radius ?? 4;
    const col = s.color ?? 0xffffff;
    const ticks = s.ticks ?? 1, gap = s.interval ?? 0.5;
    u.attackAnim = 0.001;
    for (let k = 0; k < ticks; k++) {
      g.after(k * gap, () => {
        if (!u.alive) return;
        for (const e of g.enemiesInRadius(u.team, u.pos, r, ['hero', 'minion'])) {
          kitDamage(g, u, e, s, rank, 1 / ticks);
          if (k === 0) applyCC(g, u, e, s, rank);
        }
        g.fx.ring(u.pos, r, col, 0.45, { grow: true });
        g.fx.burst(u.pos, col, 22, 5, 0.14, 0.45, 1.5);
      });
    }
    if (s.shield) g.addShield(u, R(s.shield, rank), 3, u);
    if (s.dr) g.addBuff(u, 'dr', 3, s.dr, { key: 'kit_ndr_' + def.id });
    g.shake?.(0.12, u.pos);
    return true;
  },

  stealth(g, u, rank, p, def, s) {
    const d = R(s.dur, rank) || 2.5;
    g.addBuff(u, 'stealth', d, 1, { key: 'kit_stealth' });
    if (s.spd) g.addBuff(u, 'spd', d, R(s.spd, rank), { key: 'kit_sspd' });
    g.fx.burst(u.pos, s.color ?? 0xb0b0ff, 24, 3, 0.15, 0.6, 1.5);
    u.order = null;
    return true;
  },

  execute(g, u, rank, p, def, s) {
    const t = enemyNear(g, u, p, def.range, s.heroesOnly ?? true);
    if (!t) { if (u.isPlayer) g.emit('message', { text: 'No hay enemigos al alcance', kind: 'warn' }); return false; }
    const col = s.color ?? 0xffffff;
    const strike = () => {
      if (!t.alive) return;
      kitDamage(g, u, t, s, rank);
      if (t.alive && s.threshold && t.hp / t.maxHp < R(s.threshold, rank)) g.dealDamage(u, t, t.hp + 1, 'true');
      applyCC(g, u, t, s, rank);
      g.fx.burst(t.pos, col, 40, 7, 0.16, 0.6, 3);
      g.fx.ring(t.pos, 2.8, col, 0.5, { grow: true });
      g.fx.beam(t.pos.clone().setY(0.2), t.pos.clone().setY(9), col, 0.35);
      g.shake?.(0.25, t.pos);
    };
    if (s.leap) {
      const d = dirTo(u, t.pos);
      g.dashTo(u, V(t.pos.x - d.x * 1.2, t.pos.z - d.z * 1.2), 34, { onArrive: strike });
    } else { g.face(u, t.pos); u.attackAnim = 0.001; g.after(s.delay ?? 0.15, strike); }
    return true;
  },

  prison(g, u, rank, p, def, s) {
    const t = enemyNear(g, u, p, def.range, true);
    if (!t) { if (u.isPlayer) g.emit('message', { text: 'No hay enemigos al alcance', kind: 'warn' }); return false; }
    const d = R(s.dur, rank) || 3;
    g.addBuff(t, 'banish', d, 0, { key: 'kit_banish' });
    g.addBuff(t, 'stun', d, 0, { key: 'kit_banish_stun' });
    const col = s.color ?? 0x9ad8ff;
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 2.2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, depthWrite: false }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: col }));
    box.add(edges);
    g.scene.add(box);
    g.addZone({ pos: t.pos, radius: 1, dur: d, onUpdate: () => box.position.set(t.pos.x, 1.6, t.pos.z), onEnd: () => { g.scene.remove(box); box.geometry.dispose(); } });
    g.fx.lightning(u.pos.clone().setY(1.5), t.pos.clone().setY(1.5), col, 0.4);
    return true;
  },
};

// Zona persistente (dentro de un área): daño periódico, ralentización y curación a aliados
function zone(g, u, rank, c, r, z, col) {
  g.fx.ring(c, r, col, z.dur, { fill: true, opacity: 0.18, steady: true });
  g.addZone({
    pos: c, radius: r, dur: z.dur, tick: z.tick ?? 0.5,
    onTick: () => {
      for (const e of g.enemiesInRadius(u.team, c, r, ['hero', 'minion'])) {
        if (z.dmg) kitDamage(g, u, e, { dmg: z.dmg, ratio: z.ratio, dtype: z.dtype }, rank, (z.tick ?? 0.5));
        if (z.slow) g.addBuff(e, 'slow', 0.6, z.slow, { key: 'kitzone_slow' });
        if (z.stun && Math.random() < 0.25) g.addBuff(e, 'stun', z.stun, 0);
      }
      if (z.healAllies) for (const a of g.alliesInRadius(u.team, c, r, ['hero'])) g.heal(a, R(z.healAllies, rank) * (z.tick ?? 0.5), u);
      if (Math.random() < 0.9) {
        const a = Math.random() * Math.PI * 2, rr = Math.random() * r;
        g.fx.spark(V(c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr).setY(0.2), col, 0.12, 0.7, 1.5);
      }
    },
  });
}

// ------------------------------------------------------------------ pasivas genéricas
// def.passive.kit: { stats: {crit, dodge, spd, lifesteal, ...}, stackAS, onHitSlow, onHitMagic,
// lowHpDamage, minionMult, heroMult, ampEvery, empowerAfterCast, stealthCrit, regenLow,
// healAura, duo: { partner, bonus } }
export function makePassive(P) {
  return {
    update(g, u, dt) {
      // estadísticas permanentes (se renuevan para que sobrevivan a la muerte)
      if (P.stats) for (const [k, v] of Object.entries(P.stats)) {
        const type = k === 'crit' ? 'crit' : k === 'dodge' ? 'dodge' : k === 'spd' ? 'spd' : 'bonus_' + k;
        g.addBuff(u, type, 1, v, { key: 'kitp_' + k });
      }
      if (P.regenLow && u.hp < u.maxHp * 0.5) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * P.regenLow * dt);
      if (P.healAura) {
        u.state.auraT = (u.state.auraT || 0) - dt;
        if (u.state.auraT <= 0) {
          u.state.auraT = 1;
          for (const a of g.alliesInRadius(u.team, u.pos, 7, ['hero'])) if (a !== u) g.heal(a, a.maxHp * P.healAura, u);
        }
      }
      if (P.duo) {
        const mate = g.heroes.find((h) => h.heroId === P.duo.partner && h.team === u.team && h.alive && dist2(h.pos, u.pos) < 10);
        if (mate) {
          g.addBuff(u, 'bonus_ad', 1, 8 + u.level, { key: 'kitp_duo_ad' });
          g.addBuff(u, 'bonus_ap', 1, 10 + u.level * 2, { key: 'kitp_duo_ap' });
          if (Math.random() < 0.05) g.fx.beam(u.pos.clone().setY(1.6), mate.pos.clone().setY(1.6), P.duo.color ?? 0xffd0ff, 0.2);
        }
      }
    },
    onAttack(g, u, t) {
      const out = { mult: 1, magic: 0 };
      if (P.stackAS) g.addBuff(u, 'as', 4, P.stackAS, { key: 'kitp_stack', stack: true, max: P.stackAS * 5 });
      if (P.onHitSlow && t.alive) g.addBuff(t, 'slow', 1, P.onHitSlow, { key: 'kitp_slow' });
      if (P.onHitMagic) out.magic += P.onHitMagic + u.level * 2;
      if (P.lowHpDamage) out.mult *= 1 + P.lowHpDamage * (1 - u.hp / u.maxHp);
      if (P.minionMult && t.kind !== 'hero') out.mult *= P.minionMult;
      if (P.heroMult && t.kind === 'hero') out.mult *= P.heroMult;
      const emp = g.getBuff(u, 'kit_emp');
      if (emp) { out.magic += emp.value + g.stat(u, 'ad') * 0.3; g.removeBuff(u, 'kit_emp'); g.fx.burst(t.pos, P.color ?? 0xffe08a, 12, 3, 0.12, 0.4, 1.5); }
      const onhit = g.buffSum(u, 'kitonhit');
      if (onhit) out.magic += onhit;
      if (P.stealthCrit && g.getBuff(u, 'kit_stealth')) { out.mult *= P.stealthCrit; g.fx.burst(t.pos, 0xfff2a0, 24, 5, 0.15, 0.5, 2); }
      if (P.color) out.color = P.color;
      return out;
    },
    onCast(g, u) {
      u.casts = (u.casts || 0) + 1;
      if (P.ampEvery && u.casts % P.ampEvery === 0) { g.addBuff(u, 'kitamp', 8, P.amp ?? 0.5, { key: 'kit_amp' }); g.fx.burst(u.pos, P.color ?? 0xffffff, 12, 2, 0.12, 0.6, 2); }
      if (P.empowerAfterCast) g.addBuff(u, 'kitemp', 4, P.empowerAfterCast + u.level * 3, { key: 'kit_emp' });
    },
  };
}

// La potenciación de Vrizahl/Emmeline se gasta tras el primer golpe de la habilidad
export function consumeAmp(g, u) {
  const amp = g.getBuff(u, 'kit_amp');
  if (amp?.used) g.removeBuff(u, 'kit_amp');
}
