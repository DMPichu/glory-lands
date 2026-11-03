// Implementación de las habilidades (Q/W/E/R) y pasivas de cada héroe.
// Cada función recibe (game, unidad, rango, punto objetivo, definición) y
// devuelve false si no se pudo lanzar (no se gasta maná ni enfriamiento).
import * as THREE from 'three';
import { dist2 } from './game.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);

function dirTo(u, p) {
  const d = V(p.x - u.pos.x, p.z - u.pos.z);
  if (d.lengthSq() < 0.0001) d.set(Math.sin(u.facing), 0, Math.cos(u.facing));
  return d.normalize();
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
};
