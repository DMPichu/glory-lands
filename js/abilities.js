// Implementación de las habilidades (Q/W/E/R) y pasivas de cada héroe.
// Cada función recibe (game, unidad, rango, punto objetivo, definición) y
// devuelve false si no se pudo lanzar (no se gasta maná ni enfriamiento).
import * as THREE from 'three';
import { dist2 } from './game.js';
import { buildKnight } from './models.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);

function dirTo(u, p) {
  const d = V(p.x - u.pos.x, p.z - u.pos.z);
  if (d.lengthSq() < 0.0001) d.set(Math.sin(u.facing), 0, Math.cos(u.facing));
  return d.normalize();
}

// Lluvia de pétalos de cerezo (Ikaruus)
function petals(g, pos) {
  for (let i = 0; i < 14; i++) {
    const q = V(pos.x + (Math.random() - 0.5) * 1.6, pos.z + (Math.random() - 0.5) * 1.6).setY(0.6 + Math.random() * 1.6);
    g.fx.spark(q, i % 3 ? 0xffb0c8 : 0xffffff, 0.12, 0.7, -0.6);
  }
  g.fx.glow(pos, 0xff7a9a, 3, 0.35, 1.2);
}

// Escarcha de Catarina: con 3 cargas congela al objetivo (una vez cada 6 s)
function chill(g, u, e) {
  if (!e.alive || (e.kind !== 'hero' && e.kind !== 'minion')) return;
  e.state.chill = (e.state.chill || 0) + 1;
  if (e.state.chill >= 3 && (e.state.chillCd || 0) <= g.time) {
    e.state.chill = 0;
    e.state.chillCd = g.time + 6;
    g.addBuff(e, 'stun', 1, 0, { key: 'cat_p' });
    g.fx.pillar(e.pos, 0xcfeeff, 1, 0.9, 3);
    g.fx.burst(e.pos, 0xffffff, 16, 2, 0.12, 0.7, 1.5);
    if (u.isPlayer || e.isPlayer) g.floater(e, '❄️ ¡Congelado!', '#cfeeff', true);
  } else {
    g.fx.spark(e.pos.clone().setY(e.height), 0xcfeeff, 0.12, 0.5, 0.5);
  }
}

function clampRange(u, p, range) {
  const d = dist2(u.pos, p);
  if (d <= range) return p.clone();
  const dir = dirTo(u, p);
  return V(u.pos.x + dir.x * range, u.pos.z + dir.z * range);
}

export const ABILITY_IMPL = {
  // ======================================================= JOSEPHINE
  jos_q(g, u, rank, p, def) {
    g.addBuff(u, 'empower', 6, def.dmg[rank - 1], { key: 'jos_q', charges: 3 });
    const b = g.getBuff(u, 'jos_q');
    b.charges = 3;
    g.fx.ring(u.pos, 1.8, 0xfff2a0, 0.5, { grow: true });
    g.fx.burst(V(u.pos.x, u.pos.z).setY(1.2), 0xfff2a0, 12, 2, 0.1, 0.5, 2);
    g.fx.glow(u.pos, 0xfff2a0, 4, 0.5, 1.4);
    g.fx.flash(u.pos, 0xffe066, 21, 10, 0.5);
    u.attackCd = Math.min(u.attackCd, 0.1);
    return true;
  },

  jos_w(g, u, rank, p, def) {
    // aliado más cercano al cursor dentro del alcance (o ella misma)
    const allies = g.alliesInRadius(u.team, u.pos, def.range, ['hero']);
    let target = u;
    let best = dist2(u.pos, p);
    for (const a of allies) {
      const d = dist2(a.pos, p);
      if (d < best) { best = d; target = a; }
    }
    const amt = def.heal[rank - 1] + g.stat(u, 'ap') * 0.4;
    g.heal(target, amt, u);
    g.cleanse(target);
    g.fx.ring(target.pos, 1.6, 0xffe066, 0.7, { grow: true });
    g.fx.burst(target.pos, 0xffe066, 18, 2, 0.12, 0.8, 2.5);
    if (target !== u) g.fx.beam(u.pos.clone().setY(1.4), target.pos.clone().setY(1.4), 0xffe066, 0.3);
    g.fx.pillar(target.pos, 0xffe066, 0.8, 1.1, 10);
    g.fx.flash(target.pos, 0xffe066, 24, 10, 0.6);
    return true;
  },

  jos_e(g, u, rank, p, def) {
    let dest = clampRange(u, p, def.range);
    // si hay un aliado cerca del punto, salta a su lado
    const ally = g.nearest(g.alliesInRadius(u.team, dest, 2.5, ['hero']).filter((a) => a !== u), dest);
    if (ally && dist2(u.pos, ally.pos) <= def.range + 1.5) dest = ally.pos.clone();
    g.dashTo(u, dest, 22, {
      onArrive: () => {
        const sh = def.shield[rank - 1] + u.maxHp * 0.08;
        for (const a of g.alliesInRadius(u.team, u.pos, 3.5, ['hero'])) {
          g.addShield(a, sh, 3, u);
          g.fx.ring(a.pos, 1.3, 0xfff2a0, 0.6);
        }
        for (const e of g.enemiesInRadius(u.team, u.pos, 3.5, ['hero', 'minion'])) {
          g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ap') * 0.3, 'magic');
          g.addBuff(e, 'weak', 2.5, 0.3);
        }
        g.fx.shockwave(u.pos, 3.5, 0xfff2a0, 0.5);
        g.fx.burst(u.pos, 0xffffff, 16, 5, 0.12, 0.4, 1);
        g.fx.glow(u.pos, 0xfff2a0, 6, 0.4, 0.8);
        g.fx.flash(u.pos, 0xffe066, 30, 12, 0.4);
        g.shake(0.2, u.pos);
      },
    });
    return true;
  },

  jos_r(g, u, rank, p, def) {
    const center = u.pos.clone();
    const R = 6;
    const vis = g.fx.ring(center, R, 0xffe066, 5, { fill: true, opacity: 0.22, steady: true });
    g.fx.ring(center, R, 0xffe066, 5, { opacity: 0.9, steady: true });
    // escudo inicial y reducción de enfriamientos
    for (const a of g.alliesInRadius(u.team, center, R, ['hero'])) {
      g.addShield(a, def.shield[rank - 1], 5, u);
      for (const ab of a.abilities) ab.cd = Math.max(0, ab.cd - 2);
    }
    g.fx.burst(center, 0xfff2a0, 40, 6, 0.15, 1, 3);
    g.addZone({
      pos: center, radius: R, dur: 5, tick: 0.25,
      onTick: () => {
        for (const a of g.alliesInRadius(u.team, center, R, ['hero'])) g.heal(a, def.heal[rank - 1] * 0.25, u);
        for (const e of g.enemiesInRadius(u.team, center, R, ['hero', 'minion'])) g.addBuff(e, 'slow', 0.3, 0.25, { key: 'jos_r_slow' });
        if (Math.random() < 0.25) g.fx.glow(center, 0xffe066, R * 1.6, 0.5, 0.3);
        if (Math.random() < 0.8) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * R;
          g.fx.spark(V(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r).setY(0.2), 0xfff2a0, 0.1, 0.8, 2);
        }
      },
    });
    void vis;
    return true;
  },

  // ======================================================= FOTSOR
  fot_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const dest = V(u.pos.x + dir.x * 3, u.pos.z + dir.z * 3);
    let hitDone = false;
    const punch = (e) => {
      if (hitDone) return;
      hitDone = true;
      g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ad') * 0.8, 'physical');
      g.knockback(e, dir.x, dir.z, 2.5, 0.2);
      g.fx.impact(e.pos, 0xb07aff, 1.1);
      g.shake(0.18, e.pos);
      PASSIVE_IMPL.fotsor.addFury(g, u, 12);
    };
    u.attackAnim = 0.001;
    g.dashTo(u, dest, 18, {
      onStep: () => {
        if (hitDone) return;
        const e = g.nearest(g.enemiesInRadius(u.team, u.pos, 1.6, ['hero', 'minion']), u.pos);
        if (e) { punch(e); u.dash = null; }
      },
      onArrive: () => {
        if (hitDone) return;
        const e = g.nearest(g.enemiesInRadius(u.team, u.pos, 2.2, ['hero', 'minion', 'tower', 'nexus', 'boss']), u.pos);
        if (e) punch(e);
      },
    });
    return true;
  },

  fot_w(g, u, rank, p, def) {
    const old = u.history.find((h) => g.time - h.t >= 2.9) || u.history[0];
    if (!old) return false;
    g.fx.ring(u.pos, 1.5, 0xb07aff, 0.5);
    g.fx.burst(u.pos, 0xb07aff, 16, 3, 0.12, 0.5, 1);
    g.fx.pillar(u.pos, 0xb07aff, 0.5, 0.9, 5);
    g.fx.beam(u.pos.clone().setY(1.2), V(old.x, old.z).setY(1.2), 0xd0b0ff, 0.4);
    u.pos.set(old.x, 0, old.z);
    g.fx.pillar(u.pos, 0xd0b0ff, 0.7, 1.1, 6);
    g.fx.flash(u.pos, 0xb07aff, 24, 10, 0.5);
    u.dash = null; u.knock = null; u.order = null;
    u.hp = Math.min(u.maxHp, Math.max(u.hp, old.hp) + def.heal[rank - 1]);
    g.fx.ring(u.pos, 2, 0xb07aff, 0.7, { grow: true });
    g.fx.burst(u.pos, 0xd0b0ff, 20, 3, 0.14, 0.7, 2);
    if (u.isPlayer) g.floater(u, '⏳', '#d0b0ff');
    return true;
  },

  fot_e(g, u, rank, p, def) {
    const r = def.radius;
    for (const e of g.enemiesInRadius(u.team, u.pos, r, ['hero', 'minion'])) {
      g.addBuff(e, 'taunt', def.dur[rank - 1], 0, { src: u });
      e.order = { type: 'attack', target: u, forced: true };
      g.fx.burst(e.pos, 0xff8a3d, 6, 1, 0.1, 0.4, 2);
    }
    g.addBuff(u, 'dr', 3, 0.3, { key: 'fot_e' });
    g.fx.shockwave(u.pos, r, 0xff8a3d, 0.6);
    g.fx.ring(u.pos, r * 0.6, 0xffd040, 0.5, { grow: true });
    g.fx.flash(u.pos, 0xff8a3d, 27, 12, 0.5);
    g.shake(0.15, u.pos);
    g.floater(u, '¡OVACIÓN!', '#ffb060', true);
    return true;
  },

  fot_r(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    g.fx.ring(center, R, 0xb07aff, 1.5, { fill: true, opacity: 0.3, steady: true });
    g.fx.ring(center, R, 0xd0b0ff, 1.5, { opacity: 1, steady: true });
    g.fx.flash(center, 0x9ad8ff, 36, 14, 1.4);
    g.fx.glow(center, 0x9ad8ff, R * 2.2, 1.4, 0.5);
    const frozen = g.enemiesInRadius(u.team, center, R, ['hero', 'minion']);
    for (const e of frozen) {
      g.addBuff(e, 'stun', 1.5, 0, { key: 'fot_r_freeze' });
      g.fx.burst(e.pos, 0x9ad8ff, 10, 1, 0.1, 1.2, 0.3);
    }
    u.attackAnim = 0.001;
    g.after(1.5, () => {
      for (const e of frozen) {
        if (!e.alive) continue;
        g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ad') * 0.8, 'magic');
        g.fx.impact(e.pos, 0xff6a00, 1.3);
      }
      g.fx.burst(center, 0xffd040, 30, 7, 0.15, 0.7, 2);
      g.fx.shockwave(center, R * 1.2, 0xff6a00, 0.6);
      g.fx.pillar(center, 0xff6a00, 0.6, R * 0.4, 8);
      g.fx.flash(center, 0xff6a00, 54, 18, 0.6);
      g.shake(0.45, center);
    });
    return true;
  },

  // ======================================================= YESLIE
  yes_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ap') * 0.7;
    if (u.dragon) {
      // aliento helado en cono
      const range = 7.5;
      const hits = g.enemiesInRadius(u.team, u.pos, range, ['hero', 'minion', 'tower', 'nexus', 'boss']).filter((e) => {
        const d = V(e.pos.x - u.pos.x, e.pos.z - u.pos.z).normalize();
        return d.dot(dir) > Math.cos(0.55);
      });
      for (const e of hits) {
        g.dealDamage(u, e, dmg * 1.3, 'magic');
        g.addBuff(e, 'slow', 1.5, 0.35);
      }
      for (let i = 0; i < 40; i++) {
        const a = (Math.random() - 0.5) * 1.1;
        const r = Math.random() * range;
        const c = Math.cos(a), s = Math.sin(a);
        const dx = dir.x * c - dir.z * s, dz = dir.x * s + dir.z * c;
        g.fx.spark(V(u.pos.x + dx * r, u.pos.z + dz * r).setY(1 + Math.random()), Math.random() < 0.5 ? 0xbff6ff : 0xffffff, 0.15, 0.5, 0.5);
      }
      g.fx.flash(u.pos, 0xbff6ff, 30, 12, 0.4);
      g.face(u, p);
      return true;
    }
    g.face(u, p);
    u.attackAnim = 0.001;
    g.spawnSkillshot(u, dir, {
      color: 0x7ff6ff, size: 0.35, speed: 26, range: def.range, width: 0.6, trail: true,
      onHit: (e) => {
        g.dealDamage(u, e, dmg, 'magic');
        g.fx.impact(e.pos, 0x7ff6ff, 0.9);
        const mark = g.getBuff(e, 'yes_mark');
        if (mark) {
          g.removeBuff(e, 'yes_mark');
          for (const o of g.enemiesInRadius(u.team, e.pos, 3, ['hero', 'minion'])) g.dealDamage(u, o, dmg * 0.5, 'magic');
          g.fx.impact(e.pos, 0x9b5cff, 1.8);
          g.shake(0.2, e.pos);
        }
      },
    });
    return true;
  },

  yes_w(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    g.fx.ring(center, R, 0x9b5cff, 0.45, { fill: true, opacity: 0.35, steady: true });
    g.face(u, center);
    u.attackAnim = 0.001;
    g.after(0.4, () => {
      for (const e of g.enemiesInRadius(u.team, center, R, ['hero', 'minion'])) {
        g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ap') * 0.4, 'magic');
        g.addBuff(e, 'slow', 2, 0.4);
        g.addBuff(e, 'yesmark', 4, 0, { key: 'yes_mark' });
      }
      g.fx.ring(center, R, 0xd0a0ff, 0.5, { grow: true });
      g.fx.burst(center, 0x9b5cff, 26, 5, 0.13, 0.6, 2);
      g.fx.glow(center, 0x9b5cff, R * 2.4, 0.5, 0.4);
      g.fx.flash(center, 0x9b5cff, 33, 12, 0.45);
      g.shake(0.12, center);
    });
    return true;
  },

  yes_e(g, u, rank, p, def) {
    const dest = clampRange(u, p, def.range);
    g.clampPos(dest);
    g.cleanse(u);
    g.fx.burst(u.pos, 0xbff6ff, 18, 3, 0.12, 0.5, 2);
    g.fx.ring(u.pos, 1.4, 0xbff6ff, 0.4);
    g.fx.glow(u.pos, 0xbff6ff, 3, 0.4, 1);
    u.pos.set(dest.x, 0, dest.z);
    g.fx.glow(u.pos, 0xffffff, 3.5, 0.4, 1);
    g.fx.flash(u.pos, 0xbff6ff, 21, 10, 0.35);
    u.order = null;
    g.fx.burst(u.pos, 0xffffff, 18, 3, 0.12, 0.5, 2);
    g.fx.ring(u.pos, 1.6, 0xbff6ff, 0.5, { grow: true });
    return true;
  },

  yes_r(g, u, rank, p, def) {
    if (u.dragon) return false;
    g.fx.burst(u.pos, 0xdfe6f0, 40, 6, 0.18, 0.9, 3);
    g.fx.shockwave(u.pos, 4, 0xdfe6f0, 0.7);
    g.fx.pillar(u.pos, 0xdfe6f0, 1, 2, 14);
    g.startDragon(u, 8, def.hp[rank - 1]);
    g.heal(u, def.hp[rank - 1], u);
    return true;
  },

  // ======================================================= ASTRID
  ast_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    const range = def.range;
    const hits = g.enemiesInRadius(u.team, u.pos, range, ['hero', 'minion']).filter((e) => {
      const d = V(e.pos.x - u.pos.x, e.pos.z - u.pos.z).normalize();
      return d.dot(dir) > Math.cos(0.5);
    });
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ad') * 0.7;
    for (const e of hits) {
      g.dealDamage(u, e, dmg, 'physical');
      g.fx.burst(e.pos, 0xffd36a, 6, 2, 0.08, 0.3, 1);
    }
    if (hits.length) g.addBuff(u, 'as', 4, 0.08 * hits.length, { key: 'ast_q', stack: true, max: 0.4 });
    g.fx.flash(u.pos, 0xffd36a, 24, 10, 0.2);
    g.fx.glow(V(u.pos.x + dir.x, u.pos.z + dir.z), 0xffd36a, 2.5, 0.2, 1.2);
    for (let i = 0; i < 8; i++) {
      const a = (Math.random() - 0.5) * 1.0;
      const c = Math.cos(a), s = Math.sin(a);
      const dx = dir.x * c - dir.z * s, dz = dir.x * s + dir.z * c;
      g.fx.beam(u.pos.clone().setY(1.2), V(u.pos.x + dx * range, u.pos.z + dz * range).setY(1.1), 0xffd36a, 0.12);
    }
    return true;
  },

  ast_w(g, u, rank, p, def) {
    const cands = g.enemiesInRadius(u.team, u.pos, def.range, ['hero', 'minion', 'tower', 'nexus', 'boss']);
    if (!cands.length) {
      if (u.isPlayer) g.emit('message', { text: 'No hay enemigos al alcance', kind: 'warn' });
      return false;
    }
    // prioriza héroes cerca del cursor
    let best = null, bd = Infinity;
    for (const e of cands) {
      const d = dist2(e.pos, p) - (e.kind === 'hero' ? 2 : 0);
      if (d < bd) { bd = d; best = e; }
    }
    g.addBuff(best, 'mark', 4, def.amp[rank - 1] / 100, { key: 'ast_w' });
    g.fx.ring(best.pos, 1.6, 0xff5a5a, 4, { follow: best, steady: true, opacity: 0.8 });
    g.fx.beam(u.pos.clone().setY(1.3), best.pos.clone().setY(1.3), 0xff5a5a, 0.25);
    g.fx.glow(best.pos, 0xff5a5a, 3, 0.5, best.height ?? 1.5);
    return true;
  },

  ast_e(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const dest = V(u.pos.x + dir.x * def.range, u.pos.z + dir.z * def.range);
    let hit = false;
    g.dashTo(u, dest, 20, {
      onStep: () => {
        if (Math.random() < 0.5) g.fx.spark(u.pos.clone().setY(0.3), 0xc9a27a, 0.12, 0.4, 0.5);
        if (hit) return;
        const e = g.nearest(g.enemiesInRadius(u.team, u.pos, 1.4, ['hero', 'minion']), u.pos);
        if (e) {
          hit = true;
          g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ad') * 0.5, 'physical');
          g.knockback(e, dir.x, dir.z, 3.5, 0.25);
          g.fx.impact(e.pos, 0xc9a27a, 1.1);
          g.shake(0.18, e.pos);
        }
      },
    });
    return true;
  },

  ast_r(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const aim = V(u.pos.x + dir.x * 10, u.pos.z + dir.z * 10);
    u.order = null;
    // línea de apuntado
    g.fx.beam(u.pos.clone().setY(1.3), V(u.pos.x + dir.x * def.range, u.pos.z + dir.z * def.range).setY(1.3), 0x6ad8ff, 0.8);
    g.fx.glow(V(u.pos.x + dir.x * 0.8, u.pos.z + dir.z * 0.8), 0x6ad8ff, 2.5, 0.8, 1.3);
    u.channel = {
      t: 0.8, point: aim,
      onDone: () => {
        if (!u.alive) return;
        const dmg = def.dmg[rank - 1] + g.stat(u, 'ad') * 1.0;
        u.attackAnim = 0.001;
        g.knockback(u, -dir.x, -dir.z, 0.8, 0.15);
        g.fx.flash(u.pos, 0x6ad8ff, 42, 14, 0.3);
        g.shake(0.3, u.pos);
        g.spawnSkillshot(u, dir, {
          color: 0x6ad8ff, size: 0.4, speed: 70, range: def.range, width: 0.8, trail: true,
          filter: (e) => e.kind !== 'minion',
          onHit: (e) => {
            g.dealDamage(u, e, dmg, 'physical', { crit: true });
            g.fx.impact(e.pos, 0x9ad8ff, 1.8);
            g.shake(0.3, e.pos);
            // rayo en cadena
            const near = g.enemiesInRadius(u.team, e.pos, 7, ['hero', 'minion']).filter((o) => o !== e)
              .sort((a, b) => dist2(a.pos, e.pos) - dist2(b.pos, e.pos)).slice(0, 3);
            let from = e.pos.clone().setY(1.2);
            for (const o of near) {
              const to = o.pos.clone().setY(1.1);
              g.fx.lightning(from, to, 0x9ad8ff, 0.35);
              g.dealDamage(u, o, dmg * 0.4, 'magic');
              from = to;
            }
          },
        });
      },
    };
    return true;
  },

  // ======================================================= KOUJI
  kou_q(g, u, rank, p, def) {
    const cands = g.enemiesInRadius(u.team, u.pos, def.range, ['hero', 'minion']);
    if (!cands.length) {
      if (u.isPlayer) g.emit('message', { text: 'No hay enemigos al alcance', kind: 'warn' });
      return false;
    }
    let best = null, bd = Infinity;
    for (const e of cands) {
      const d = dist2(e.pos, p) - (e.kind === 'hero' ? 2.5 : 0);
      if (d < bd) { bd = d; best = e; }
    }
    g.face(u, best.pos);
    u.attackAnim = 0.001;
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ad') * 0.9;
    g.fx.glow(u.pos, 0x6ff6ff, 3, 0.3, 1.4);
    g.spawnHoming(u, best, u.pos.clone().setY(1.4), 0x6ff6ff, 0.32, 22, () => {
      if (!best.alive) return;
      g.dealDamage(u, best, dmg, 'physical');
      g.addBuff(best, 'slow', 1.5, 0.3, { key: 'kou_q' });
      g.fx.impact(best.pos, 0x6ff6ff, 1);
    });
    return true;
  },

  kou_w(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    g.fx.ring(center, R, 0x7dff8a, 4, { fill: true, opacity: 0.18, steady: true });
    g.fx.ring(center, R, 0x7dff8a, 4, { opacity: 0.8, steady: true });
    g.fx.pillar(center, 0x7dff8a, 0.8, R * 0.5, 7);
    g.fx.flash(center, 0x7dff8a, 24, 12, 0.6);
    const per = (def.heal[rank - 1] + g.stat(u, 'ap') * 0.1) * 0.25;
    g.addZone({
      pos: center, radius: R, dur: 4, tick: 0.25,
      onTick: () => {
        for (const a of g.alliesInRadius(u.team, center, R, ['hero'])) {
          g.heal(a, per, u);
          g.addBuff(a, 'spd', 0.4, 0.15, { key: 'kou_w' });
        }
        // hojas que giran alrededor del espíritu
        const a = g.time * 3, r = R * 0.7;
        g.fx.spark(V(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r).setY(0.5), 0x9dffa0, 0.14, 0.8, 1.2);
        g.fx.spark(V(center.x - Math.cos(a) * r, center.z - Math.sin(a) * r).setY(0.5), 0xd8ffb0, 0.12, 0.8, 1.2);
        if (Math.random() < 0.3) g.fx.glow(center, 0x7dff8a, R * 1.4, 0.5, 0.5);
      },
    });
    return true;
  },

  kou_e(g, u, rank, p, def) {
    const dest = clampRange(u, p, def.range);
    g.fx.burst(u.pos, 0x7dff8a, 18, 3, 0.12, 0.6, 2);
    g.fx.glow(u.pos, 0x7dff8a, 3, 0.4, 1);
    g.addBuff(u, 'crit', 5, 1, { key: 'kou_e' });
    g.dashTo(u, dest, 24, {
      onStep: () => { if (Math.random() < 0.6) g.fx.spark(u.pos.clone().setY(0.6), 0x9dffa0, 0.12, 0.5, 0.6); },
      onArrive: () => { g.fx.ring(u.pos, 1.4, 0x7dff8a, 0.4, { grow: true }); },
    });
    return true;
  },

  kou_r(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const aim = V(u.pos.x + dir.x * 10, u.pos.z + dir.z * 10);
    u.order = null;
    g.fx.beam(u.pos.clone().setY(1.3), V(u.pos.x + dir.x * def.range, u.pos.z + dir.z * def.range).setY(1.3), 0x9ad8ff, 0.5);
    g.fx.glow(u.pos, 0x9ad8ff, 3.5, 0.5, 1.4);
    u.channel = {
      t: 0.5, point: aim,
      onDone: () => {
        if (!u.alive) return;
        const dmg = def.dmg[rank - 1] + g.stat(u, 'ad') * 0.9;
        u.attackAnim = 0.001;
        g.fx.flash(u.pos, 0x9ad8ff, 40, 14, 0.3);
        g.shake(0.3, u.pos);
        g.spawnSkillshot(u, dir, {
          color: 0x9ad8ff, size: 0.55, speed: 40, range: def.range, width: 1.3, pierce: true, trail: true,
          onHit: (e) => {
            g.dealDamage(u, e, dmg, 'physical');
            g.fx.lightning(e.pos.clone().setY(6), e.pos.clone().setY(1), 0x9ad8ff, 0.3);
            g.fx.impact(e.pos, 0x9ad8ff, 1.1);
          },
          onEnd: (pr) => {
            const c = pr.pos.clone().setY(0);
            for (const e of g.enemiesInRadius(u.team, c, 4, ['hero', 'minion'])) {
              g.dealDamage(u, e, dmg * 0.5, 'magic');
              g.addBuff(e, 'stun', 1, 0, { key: 'kou_r' });
            }
            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
              const q = V(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r);
              g.fx.lightning(q.clone().setY(9), q.clone().setY(0.2), 0xbfe8ff, 0.4);
            }
            g.fx.shockwave(c, 4, 0x9ad8ff, 0.5);
            g.fx.pillar(c, 0x9ad8ff, 0.6, 2, 12);
            g.fx.flash(c, 0x9ad8ff, 50, 16, 0.5);
            g.shake(0.4, c);
          },
        });
      },
    };
    return true;
  },

  // ======================================================= GRIMDARKUS II
  gri_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const dest = V(u.pos.x + dir.x * def.range, u.pos.z + dir.z * def.range);
    let hit = false;
    u.attackAnim = 0.001;
    g.dashTo(u, dest, 19, {
      onStep: () => {
        if (Math.random() < 0.6) g.fx.spark(u.pos.clone().setY(0.3), 0x6a7090, 0.14, 0.4, 0.4);
        if (hit) return;
        const e = g.nearest(g.enemiesInRadius(u.team, u.pos, 1.5, ['hero', 'minion']), u.pos);
        if (!e) return;
        hit = true;
        g.dealDamage(u, e, def.dmg[rank - 1] + u.maxHp * 0.06, 'physical');
        g.addBuff(e, 'stun', 1, 0, { key: 'gri_q' });
        g.knockback(e, dir.x, dir.z, 1.5, 0.2);
        g.fx.impact(e.pos, 0x9fb0ff, 1.3);
        g.shake(0.25, e.pos);
        u.dash = null;
      },
    });
    return true;
  },

  gri_w(g, u, rank, p, def) {
    const R = def.radius;
    g.addBuff(u, 'dr', 4, def.dr[rank - 1] / 100, { key: 'gri_w' });
    const ring = g.fx.ring(u.pos, R, 0x4a3a80, 4, { fill: true, opacity: 0.25, steady: true, follow: u });
    g.fx.ring(u.pos, R, 0x8a7aff, 4, { opacity: 0.7, steady: true, follow: u });
    void ring;
    g.fx.shockwave(u.pos, R, 0x8a7aff, 0.5);
    const per = (def.dmg[rank - 1]) * 0.25;
    g.addZone({
      pos: u.pos, radius: R, dur: 4, tick: 0.25,
      onTick: () => {
        if (!u.alive) return;
        for (const e of g.enemiesInRadius(u.team, u.pos, R, ['hero', 'minion'])) g.dealDamage(u, e, per + e.maxHp * 0.02 * 0.25, 'magic');
        const a = Math.random() * Math.PI * 2;
        g.fx.spark(V(u.pos.x + Math.cos(a) * R * 0.8, u.pos.z + Math.sin(a) * R * 0.8).setY(0.3), 0x6a4aff, 0.16, 0.9, 1.6);
      },
    });
    return true;
  },

  gri_e(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const dir = dirTo(u, center);
    const side = V(-dir.z, dir.x);
    const knights = [];
    // fila de caballeros negros perpendicular a la dirección del lanzamiento
    for (let i = -2; i <= 2; i++) {
      const k = buildKnight();
      k.position.set(center.x + side.x * i * 1.6 - dir.x * 1.2, -2, center.z + side.z * i * 1.6 - dir.z * 1.2);
      k.rotation.y = Math.atan2(dir.x, dir.z);
      g.scene.add(k);
      knights.push(k);
    }
    g.fx.flash(center, 0x8a7aff, 30, 14, 0.6);
    g.addZone({
      pos: center, dur: 2.2, radius: 0,
      onUpdate: (dt, z) => {
        // salen del suelo, avanzan y se hunden
        const k = z.t;
        const y = k < 0.25 ? -2 + k * 8 : k > 1.8 ? -(k - 1.8) * 5 : 0;
        for (const m of knights) { m.position.y = y; if (k > 0.25 && k < 0.6) { m.position.x += dir.x * dt * 6; m.position.z += dir.z * dt * 6; } }
      },
      onEnd: () => knights.forEach((m) => g.scene.remove(m)),
    });
    g.after(0.3, () => {
      for (const e of g.enemiesInRadius(u.team, center, def.radius, ['hero', 'minion'])) {
        g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ap') * 0.4, 'magic');
        g.addBuff(e, 'slow', 2, 0.4, { key: 'gri_e' });
        g.knockback(e, dir.x, dir.z, 3, 0.3);
        g.fx.burst(e.pos, 0x8a7aff, 8, 3, 0.1, 0.4, 1.5);
      }
      g.fx.shockwave(center, def.radius, 0x8a7aff, 0.5);
      g.shake(0.25, center);
    });
    return true;
  },

  gri_r(g, u, rank, p, def) {
    const center = u.pos.clone();
    const R = def.radius;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2),
      new THREE.MeshBasicMaterial({ color: 0x9fd0ff, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false }));
    dome.position.copy(center); wire.position.copy(center);
    g.scene.add(dome, wire);
    for (const a of g.alliesInRadius(u.team, center, R, ['hero'])) {
      g.addShield(a, def.shield[rank - 1] + a.maxHp * 0.1, 4, u);
      g.fx.ring(a.pos, 1.3, 0x9fd0ff, 0.6);
    }
    g.fx.pillar(center, 0x5aa8ff, 1, 2, 16);
    g.fx.flash(center, 0x5aa8ff, 50, 20, 0.8);
    g.fx.shockwave(center, R, 0x9fd0ff, 0.7);
    g.addZone({
      pos: center, radius: R, dur: 4, tick: 0.1,
      onUpdate: (dt, z) => {
        wire.rotation.y += dt * 0.4;
        const fade = Math.min(1, (4 - z.t) * 2);
        dome.material.opacity = 0.18 * fade;
        wire.material.opacity = 0.35 * fade;
        // los enemigos dentro no pueden salir
        for (const e of z.trapped ?? []) {
          if (!e.alive) continue;
          const dx = e.pos.x - center.x, dz = e.pos.z - center.z;
          const d = Math.hypot(dx, dz);
          if (d > R - 0.6) { e.pos.x = center.x + (dx / d) * (R - 0.6); e.pos.z = center.z + (dz / d) * (R - 0.6); }
        }
      },
      onTick: (z) => {
        z.trapped ||= g.enemiesInRadius(u.team, center, R, ['hero', 'minion']);
        for (const e of z.trapped) if (e.alive) g.addBuff(e, 'slow', 0.2, 0.4, { key: 'gri_r' });
        if (Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2;
          g.fx.spark(V(center.x + Math.cos(a) * R, center.z + Math.sin(a) * R).setY(Math.random() * 3), 0x9fd0ff, 0.12, 0.6, 1);
        }
      },
      onEnd: () => { g.scene.remove(dome, wire); dome.geometry.dispose(); wire.geometry.dispose(); },
    });
    return true;
  },

  // ======================================================= IKARUUS
  ika_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    const dest = V(u.pos.x + dir.x * def.range, u.pos.z + dir.z * def.range);
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ad') * 0.9;
    const hitSet = new Set();
    u.attackAnim = 0.001;
    g.dashTo(u, dest, 30, {
      onStep: () => {
        g.fx.spark(u.pos.clone().setY(1), 0xffb0c8, 0.14, 0.4, 0.3);
        for (const e of g.enemiesInRadius(u.team, u.pos, 1.6, ['hero', 'minion'])) {
          if (hitSet.has(e.id)) continue;
          hitSet.add(e.id);
          g.dealDamage(u, e, dmg, 'physical');
          g.fx.impact(e.pos, 0xe8e8ff, 0.8);
          if (e.kind === 'hero' && !e.alive) {
            u.abilities[0].cd = 0.1;
            if (u.isPlayer) g.floater(u, '¡Reinicio!', '#ffb0c8', true);
          }
        }
      },
      onArrive: () => g.fx.ring(u.pos, 1.6, 0xe8e8ff, 0.4, { grow: true }),
    });
    // la luna creciente que deja el corte
    g.fx.beam(u.pos.clone().setY(1), dest.clone().setY(1), 0xe8e8ff, 0.4);
    return true;
  },

  ika_w(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    const hits = g.enemiesInRadius(u.team, u.pos, def.range, ['hero', 'minion']).filter((e) => {
      const d = V(e.pos.x - u.pos.x, e.pos.z - u.pos.z).normalize();
      return d.dot(dir) > Math.cos(0.7);
    });
    for (const e of hits) {
      g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ad') * 0.6, 'magic');
      g.addBuff(e, 'slow', 1.5, 0.5, { key: 'ika_w' });
      g.fx.burst(e.pos, 0xcfeeff, 6, 2, 0.1, 0.5, 1);
    }
    for (let i = 0; i < 30; i++) {
      const a = (Math.random() - 0.5) * 1.4;
      const r = Math.random() * def.range;
      const c = Math.cos(a), s = Math.sin(a);
      const dx = dir.x * c - dir.z * s, dz = dir.x * s + dir.z * c;
      g.fx.spark(V(u.pos.x + dx * r, u.pos.z + dz * r).setY(0.8 + Math.random()), Math.random() < 0.5 ? 0xcfeeff : 0xffffff, 0.13, 0.5, 0.4);
    }
    g.fx.flash(u.pos, 0xcfeeff, 24, 10, 0.3);
    return true;
  },

  ika_e(g, u, rank, p, def) {
    const cands = g.enemiesInRadius(u.team, u.pos, def.range, ['hero', 'minion']);
    if (!cands.length) return false;
    let best = null, bd = Infinity;
    for (const e of cands) {
      const d = dist2(e.pos, p) - (e.kind === 'hero' ? 2.5 : 0);
      if (d < bd) { bd = d; best = e; }
    }
    const dir = dirTo(u, best.pos);
    petals(g, u.pos);
    const dest = V(best.pos.x + dir.x * 1.6, best.pos.z + dir.z * 1.6);
    g.clampPos(dest);
    u.pos.set(dest.x, 0, dest.z);
    g.face(u, best.pos);
    u.order = { type: 'attack', target: best };
    u.attackCd = Math.min(u.attackCd, 0.05);
    g.addBuff(u, 'dr', 1.5, 0.25, { key: 'ika_e' });
    petals(g, u.pos);
    g.fx.flash(u.pos, 0xff7a9a, 24, 10, 0.3);
    return true;
  },

  ika_r(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ad') * 0.5;
    g.fx.ring(center, R, 0xff6a3a, 1.6, { fill: true, opacity: 0.22, steady: true });
    g.fx.ring(center, R, 0xffb06a, 1.6, { opacity: 0.9, steady: true });
    const beasts = [
      { name: '🐅 Tigre', col: 0xff8a3a, fx: (e) => g.knockback(e, e.pos.x - center.x, e.pos.z - center.z, 1.5, 0.2) },
      { name: '🐦‍🔥 Fénix', col: 0xff4a2a, fx: (e) => g.addBuff(e, 'dot', 3, 20 + rank * 10, { key: 'ika_burn', src: u }) },
      { name: '🐉 Dragón', col: 0x6ad8ff, fx: (e) => g.addBuff(e, 'stun', 0.75, 0, { key: 'ika_r' }) },
      { name: '🐢 Tortuga', col: 0x7dff8a, fx: null },
    ];
    beasts.forEach((b, i) => {
      g.after(0.3 + i * 0.35, () => {
        if (!u.alive) return;
        for (const e of g.enemiesInRadius(u.team, center, R, ['hero', 'minion'])) {
          g.dealDamage(u, e, dmg, 'magic');
          b.fx?.(e);
        }
        if (!b.fx) g.addShield(u, 80 + rank * 70, 3, u);
        g.fx.pillar(center, b.col, 0.6, R * 0.5, 10);
        g.fx.shockwave(center, R, b.col, 0.4);
        g.fx.burst(center, b.col, 24, 6, 0.15, 0.6, 2.5);
        g.fx.flash(center, b.col, 40, 16, 0.4);
        g.shake(0.25, center);
        g.floater({ pos: center, height: 3 }, b.name, '#' + b.col.toString(16).padStart(6, '0'), true);
      });
    });
    return true;
  },

  // ======================================================= CRIXUS
  cri_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    const hits = g.enemiesInRadius(u.team, u.pos, def.range, ['hero', 'minion']).filter((e) => {
      const d = V(e.pos.x - u.pos.x, e.pos.z - u.pos.z).normalize();
      return d.dot(dir) > Math.cos(0.9);
    });
    let healed = 0;
    for (const e of hits) {
      const done = g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ad'), 'physical');
      if (e.kind === 'hero') healed += done * 0.3;
      g.fx.burst(e.pos, 0x5fd38a, 8, 3, 0.1, 0.4, 1.2);
    }
    if (healed > 0) g.heal(u, healed, u);
    for (let i = 0; i < 18; i++) {
      const a = (Math.random() - 0.5) * 1.8;
      const c = Math.cos(a), s = Math.sin(a);
      const dx = dir.x * c - dir.z * s, dz = dir.x * s + dir.z * c;
      const r = def.range * (0.5 + Math.random() * 0.5);
      g.fx.spark(V(u.pos.x + dx * r, u.pos.z + dz * r).setY(1), i % 2 ? 0x5fd38a : 0xff7a30, 0.15, 0.4, 1);
    }
    g.fx.flash(u.pos, 0x5fd38a, 24, 10, 0.3);
    return true;
  },

  cri_w(g, u, rank, p, def) {
    g.addShield(u, def.shield[rank - 1] + u.maxHp * 0.1, 4, u);
    g.addBuff(u, 'as', 4, 0.3, { key: 'cri_w' });
    g.fx.pillar(u.pos, 0xff7a30, 0.6, 1.1, 6);
    g.fx.burst(u.pos, 0xff7a30, 20, 3, 0.12, 0.6, 2.5);
    g.fx.flash(u.pos, 0xff7a30, 24, 10, 0.4);
    return true;
  },

  cri_e(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    g.spawnSkillshot(u, dir, {
      color: 0xff7a30, size: 0.3, speed: 30, range: def.range, width: 0.7, trail: true,
      onHit: (e) => {
        g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ad') * 0.5, 'magic');
        g.addBuff(e, 'root', 0.8, 0, { key: 'cri_e' });
        g.fx.lightning(u.pos.clone().setY(1.2), e.pos.clone().setY(1.2), 0xff7a30, 0.5);
        g.fx.impact(e.pos, 0xff7a30, 1);
        const d = dirTo(u, e.pos);
        g.dashTo(u, V(e.pos.x - d.x * 1.4, e.pos.z - d.z * 1.4), 26, {
          onArrive: () => { if (e.alive) g.orderAttack(u, e); },
        });
      },
    });
    return true;
  },

  cri_r(g, u, rank, p, def) {
    u.state.ultDmg = 0;
    g.addBuff(u, 'bonus_ad', 5, def.ad[rank - 1], { key: 'cri_r_ad' });
    g.addBuff(u, 'undying', 5, 0, {
      key: 'cri_r',
      onEnd: () => {
        if (!u.alive) return;
        g.heal(u, (u.state.ultDmg || 0) * 0.4, u);
        g.fx.pillar(u.pos, 0x5fd38a, 0.8, 1.3, 10);
        g.fx.burst(u.pos, 0x5fd38a, 30, 4, 0.14, 0.8, 3);
      },
    });
    g.fx.pillar(u.pos, 0x2a8a50, 1, 1.6, 14);
    g.fx.shockwave(u.pos, 4, 0x5fd38a, 0.6);
    g.fx.flash(u.pos, 0x5fd38a, 45, 16, 0.6);
    g.addZone({
      pos: u.pos, dur: 5, tick: 0.1, radius: 0,
      onTick: () => { if (u.alive) g.fx.spark(V(u.pos.x + (Math.random() - 0.5), u.pos.z + (Math.random() - 0.5)).setY(1 + Math.random()), Math.random() < 0.5 ? 0x5fd38a : 0xff7a30, 0.13, 0.6, 2); },
    });
    return true;
  },

  // ======================================================= LEGNA
  leg_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ap') * 0.6;
    g.spawnSkillshot(u, dir, {
      color: 0xfff2a0, size: 0.38, speed: 28, range: def.range, width: 0.7, trail: true,
      onHit: (e) => {
        g.dealDamage(u, e, dmg, 'magic');
        g.fx.impact(e.pos, 0xfff2a0, 1);
        g.fx.pillar(e.pos, 0xfff2a0, 0.4, 0.8, 7);
      },
    });
    return true;
  },

  leg_w(g, u, rank, p, def) {
    const allies = g.alliesInRadius(u.team, u.pos, def.range, ['hero']);
    let target = u, best = dist2(u.pos, p);
    for (const a of allies) {
      const d = dist2(a.pos, p);
      if (d < best) { best = d; target = a; }
    }
    g.addShield(target, def.shield[rank - 1] + g.stat(u, 'ap') * 0.5, 3, u);
    g.addBuff(target, 'spd', 2, 0.2, { key: 'leg_w' });
    g.fx.ring(target.pos, 1.4, 0x9ff0c8, 3, { follow: target, steady: true, opacity: 0.8 });
    g.fx.glow(target.pos, 0x9ff0c8, 4, 0.5, 1.2);
    g.fx.burst(target.pos, 0xffffff, 14, 2, 0.1, 0.6, 2);
    if (target !== u) g.fx.beam(u.pos.clone().setY(1.4), target.pos.clone().setY(1.4), 0x9ff0c8, 0.3);
    return true;
  },

  leg_e(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    g.fx.ring(center, R, 0xfff2a0, 0.55, { fill: true, opacity: 0.3, steady: true });
    g.fx.ring(center, R, 0xffffff, 0.55, { opacity: 0.9, steady: true });
    g.after(0.5, () => {
      for (const e of g.enemiesInRadius(u.team, center, R, ['hero', 'minion'])) {
        g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ap') * 0.4, 'magic');
        g.addBuff(e, 'root', 1, 0, { key: 'leg_e' });
      }
      g.fx.pillar(center, 0xfff2a0, 0.8, R, 12);
      g.fx.flash(center, 0xfff2a0, 40, 14, 0.5);
      g.fx.burst(center, 0xfff2a0, 24, 4, 0.13, 0.7, 3);
      g.shake(0.15, center);
    });
    return true;
  },

  leg_r(g, u, rank, p, def) {
    const amt = def.heal[rank - 1] + g.stat(u, 'ap') * 0.5;
    for (const a of g.alliesInRadius(u.team, u.pos, def.radius, ['hero'])) {
      g.heal(a, amt, u);
      g.cleanse(a);
      g.addBuff(a, 'dr', 2, 0.25, { key: 'leg_r' });
      g.fx.pillar(a.pos, 0xfff2a0, 1.2, 1.2, 18);
      g.fx.burst(a.pos, 0xffffff, 16, 2, 0.12, 0.9, 3);
    }
    g.fx.shockwave(u.pos, def.radius, 0xfff2a0, 0.8);
    g.fx.flash(u.pos, 0xfff2a0, 60, 26, 0.9);
    g.fx.glow(u.pos, 0xfff2a0, 14, 0.8, 3);
    return true;
  },

  // ======================================================= CATARINA FERSEN
  cat_q(g, u, rank, p, def) {
    const dir = dirTo(u, p);
    g.face(u, p);
    u.attackAnim = 0.001;
    const dmg = def.dmg[rank - 1] + g.stat(u, 'ap') * 0.65;
    g.spawnSkillshot(u, dir, {
      color: 0xcfeeff, size: 0.42, speed: 26, range: def.range, width: 0.75, pierce: true, trail: true,
      onHit: (e) => {
        g.dealDamage(u, e, dmg, 'magic');
        g.addBuff(e, 'slow', 1.5, 0.3, { key: 'cat_q' });
        g.fx.impact(e.pos, 0xcfeeff, 0.8);
        chill(g, u, e);
      },
    });
    return true;
  },

  cat_w(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    g.fx.ring(center, R, 0xa8d8ff, 3, { fill: true, opacity: 0.22, steady: true });
    g.fx.ring(center, R, 0xffffff, 3, { opacity: 0.7, steady: true });
    const per = (def.dmg[rank - 1] + g.stat(u, 'ap') * 0.15) * 0.25;
    let ticks = 0;
    g.addZone({
      pos: center, radius: R, dur: 3, tick: 0.25,
      onTick: () => {
        ticks++;
        for (const e of g.enemiesInRadius(u.team, center, R, ['hero', 'minion'])) {
          g.dealDamage(u, e, per, 'magic');
          g.addBuff(e, 'slow', 0.4, 0.35, { key: 'cat_w' });
          if (ticks % 4 === 1) chill(g, u, e);
        }
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * R;
          g.fx.spark(V(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r).setY(3 + Math.random() * 2), 0xffffff, 0.1, 0.8, -4);
        }
        if (Math.random() < 0.3) g.fx.glow(center, 0xa8d8ff, R * 1.8, 0.5, 0.6);
      },
    });
    return true;
  },

  cat_e(g, u, rank, p, def) {
    const dest = clampRange(u, p, def.range);
    g.addShield(u, def.shield[rank - 1] + g.stat(u, 'ap') * 0.3, 2, u);
    g.fx.ring(u.pos, 1.3, 0xa8d8ff, 0.4);
    g.dashTo(u, dest, 22, {
      onStep: () => g.fx.spark(u.pos.clone().setY(0.15), 0xffffff, 0.16, 0.9, 0.05),
      onArrive: () => g.fx.burst(u.pos, 0xcfeeff, 14, 3, 0.1, 0.5, 1.5),
    });
    return true;
  },

  cat_r(g, u, rank, p, def) {
    const center = clampRange(u, p, def.range);
    const R = def.radius;
    g.fx.ring(center, R, 0xa8d8ff, 1.05, { fill: true, opacity: 0.25, steady: true });
    g.fx.ring(center, R, 0xffffff, 1.05, { opacity: 1, steady: true });
    g.fx.glow(center, 0xa8d8ff, R * 2, 1, 6);
    g.after(1, () => {
      if (!u.alive) return;
      for (const e of g.enemiesInRadius(u.team, center, R, ['hero', 'minion'])) {
        g.dealDamage(u, e, def.dmg[rank - 1] + g.stat(u, 'ap') * 0.8, 'magic');
        g.addBuff(e, 'stun', 1.5, 0, { key: 'cat_r' });
      }
      // picos de hielo que brotan del suelo
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * R;
        const q = V(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r);
        g.fx.pillar(q, 0xcfeeff, 0.9 + Math.random() * 0.5, 0.3 + Math.random() * 0.4, 3 + Math.random() * 4);
      }
      g.fx.shockwave(center, R, 0xffffff, 0.7);
      g.fx.burst(center, 0xcfeeff, 50, 8, 0.18, 1, 3);
      g.fx.flash(center, 0xa8d8ff, 70, 22, 0.8);
      g.shake(0.5, center);
    });
    return true;
  },
};

// ---------------------------------------------------------------- PASIVAS
export const PASSIVE_IMPL = {
  josephine: {
    onDamaged(g, u, amt, hpBefore) {
      if (u.passiveCd > 0 || !u.alive) return;
      if (hpBefore >= u.maxHp * 0.5 && u.hp < u.maxHp * 0.5) {
        g.addShield(u, u.maxHp * 0.2, 4, u);
        g.fx.pillar(u.pos, 0xfff2a0, 0.9, 1.3, 11);
        u.passiveCd = 40;
        g.fx.ring(u.pos, 2, 0xfff2a0, 0.8, { grow: true });
        g.fx.burst(u.pos, 0xffffff, 20, 3, 0.12, 0.8, 3);
        if (u.isPlayer) g.floater(u, 'Intervención divina', '#fff2a0', true);
      }
    },
  },

  fotsor: {
    addFury(g, u, n) {
      if (g.getBuff(u, 'fot_fury')) return;
      u.fury = Math.min(100, (u.fury || 0) + n);
      if (u.fury >= 100) {
        u.fury = 0;
        g.addBuff(u, 'as', 6, 0.25, { key: 'fot_fury' });
        g.fx.burst(u.pos, 0xff6a00, 30, 4, 0.15, 0.7, 3);
        if (u.isPlayer) g.floater(u, '¡IRA ARDIENTE!', '#ff8a3d', true);
      }
    },
    onDealt(g, u, t, amt) {
      if (t.kind === 'hero' || t.kind === 'minion') this.addFury(g, u, t.kind === 'hero' ? 5 : 2);
    },
    onDamaged(g, u, amt) {
      this.addFury(g, u, (amt / u.maxHp) * 60);
    },
    onAttack(g, u) {
      this.addFury(g, u, 3);
      if (g.getBuff(u, 'fot_fury')) return { magic: g.stat(u, 'ad') * 0.35, color: 0xff6a00 };
      return null;
    },
    update(g, u) {
      // historial de posiciones para Desplazamiento temporal
      const h = u.history;
      if (!h.length || g.time - h[h.length - 1].t > 0.1) h.push({ t: g.time, x: u.pos.x, z: u.pos.z, hp: u.hp });
      while (h.length && g.time - h[0].t > 3.2) h.shift();
    },
  },

  yeslie: {
    onCast(g, u) {
      u.casts = (u.casts || 0) + 1;
      if (u.casts % 3 === 0) {
        g.addBuff(u, 'page', 10, 0, { key: 'yes_page' });
        g.fx.burst(u.pos, 0xfff8e0, 10, 2, 0.1, 0.6, 2);
      }
    },
  },

  astrid: {
    onAttack(g, u, t, d) {
      return { mult: 1 + 0.25 * Math.min(1, d / 8.5) };
    },
  },

  kouji: {
    onAttack(g, u, t, d) {
      u.state.shots = (u.state.shots || 0) + 1;
      if (u.state.shots % 3 !== 0) return null;
      g.after(d / 28, () => { if (t.alive) g.addBuff(t, 'slow', 1.5, 0.3, { key: 'kou_p' }); });
      return { magic: g.stat(u, 'ad') * 0.5, color: 0x9dffa0 };
    },
  },

  grimdarkus: {
    update(g, u) {
      const n = Math.min(4, g.heroes.filter((h) => h.alive && h.team !== u.team && dist2(h.pos, u.pos) < 8).length);
      for (const k of ['armor', 'mr']) {
        const b = g.getBuff(u, 'gri_p_' + k) || g.addBuff(u, 'bonus_' + k, 1, 0, { key: 'gri_p_' + k });
        if (!b) continue;
        b.value = n * 6;
        b.t = 1;
      }
    },
  },

  ikaruus: {
    onCast(g, u) {
      g.addBuff(u, 'edge', 5, 0, { key: 'ika_edge' });
    },
    onAttack(g, u, t) {
      if (!g.getBuff(u, 'ika_edge')) return null;
      g.removeBuff(u, 'ika_edge');
      petals(g, t.pos);
      return { magic: g.stat(u, 'ad') * 0.6, color: 0xffb0c8 };
    },
  },

  crixus: {
    onAttack(g, u) {
      const missing = 1 - u.hp / u.maxHp;
      g.heal(u, g.stat(u, 'ad') * 0.3 * missing, u);
      if (missing > 0.5 && Math.random() < 0.5) g.fx.spark(u.pos.clone().setY(1.4), 0x5fd38a, 0.12, 0.5, 1.5);
      return { mult: 1 + 0.3 * missing };
    },
  },

  legna: {
    update(g, u, dt) {
      if (!u.alive) return;
      const rate = 2 + u.level * 0.4;
      for (const a of g.alliesInRadius(u.team, u.pos, 7, ['hero'])) if (a.hp < a.maxHp) g.heal(a, rate * dt);
      if (Math.random() < dt * 3) {
        const ang = Math.random() * Math.PI * 2;
        g.fx.spark(V(u.pos.x + Math.cos(ang) * 6.5, u.pos.z + Math.sin(ang) * 6.5).setY(0.2), 0xfff2a0, 0.08, 0.8, 0.8);
      }
    },
  },
};
