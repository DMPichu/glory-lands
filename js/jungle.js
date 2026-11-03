// Jungla: campamentos de monstruos neutrales y monstruos épicos del río.
// Los monstruos son unidades de tipo 'monster' del equipo 'neutral': esperan en su
// campamento, persiguen a quien les ataca (sin alejarse demasiado) y, si los dejan,
// vuelven a casa y se curan. Al morir dan oro, experiencia y a veces una bendición.
import * as THREE from 'three';
import { MONSTERS, CAMPS, EPIC_CAMPS, JUNGLE_BUFFS } from './config.js';
import { mat, buildDragon } from './models.js';
import { dist2 } from './game.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);

// ------------------------------------------------------------------ modelos
const G = {};
const geom = (k, f) => (G[k] ||= f());
function m(g, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(g, material);
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  return o;
}
const sphere = (r, s = 12) => geom(`s${r}${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s * 0.75 | 0)));
const boxG = (w, h, d) => geom(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const coneG = (r, h, s = 8) => geom(`c${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const cylG = (a, b, h, s = 8) => geom(`y${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const dodeG = (r) => geom(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0));
const octG = (r) => geom(`o${r}`, () => new THREE.OctahedronGeometry(r));

function leg(x, y, z, len, r, material) {
  const p = new THREE.Group(); p.position.set(x, y, z);
  p.add(m(cylG(r, r * 0.8, len), material, 0, -len / 2, 0));
  return p;
}

// Fantasma de las tumbas de Yixl: flota y se balancea
function buildGhost() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const pale = mat(0xbff0ff, { e: 0x60c8e0, ei: 0.9, op: 0.72, r: 0.3 });
  const dark = mat(0x0a1420, { e: 0x40ffd0, ei: 1.5 });
  body.add(m(coneG(0.55, 1.5, 10), pale, 0, 0.95, 0, Math.PI));
  body.add(m(sphere(0.42), pale, 0, 1.75, 0));
  body.add(m(sphere(0.07, 6), dark, -0.14, 1.8, 0.36));
  body.add(m(sphere(0.07, 6), dark, 0.14, 1.8, 0.36));
  body.add(m(boxG(0.16, 0.05, 0.05), dark, 0, 1.6, 0.39));
  const armL = m(coneG(0.12, 0.7, 6), pale, -0.5, 1.3, 0.1, 0, 0, -2.4);
  const armR = m(coneG(0.12, 0.7, 6), pale, 0.5, 1.3, 0.1, 0, 0, 2.4);
  body.add(armL, armR);
  return { group, parts: {}, extra: { anim: (t, u) => { body.position.y = 0.35 + Math.sin(t * 2.4 + u.id) * 0.18; body.rotation.z = Math.sin(t * 1.7 + u.id) * 0.08; armR.rotation.x = u.attackAnim > 0 ? -1.4 * Math.sin(u.attackAnim * Math.PI) : 0; } } };
}

// Ciervo luminoso de Flavenia
function buildFauna() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const fur = mat(0xd9b48a, { r: 0.85 });
  const light = mat(0xfff0f8, { r: 0.8 });
  const glow = mat(0xff9ad8, { e: 0xff5ab0, ei: 1.4 });
  body.add(m(boxG(0.55, 0.55, 1.3), fur, 0, 1.15, 0));
  body.add(m(boxG(0.5, 0.2, 1.1), light, 0, 0.9, 0));
  body.add(m(cylG(0.13, 0.18, 0.7), fur, 0, 1.55, 0.6, -0.6));
  const head = new THREE.Group(); head.position.set(0, 1.9, 0.85);
  head.add(m(boxG(0.3, 0.3, 0.5), fur, 0, 0, 0.1));
  head.add(m(sphere(0.05, 6), mat(0x101010), -0.12, 0.06, 0.3));
  head.add(m(sphere(0.05, 6), mat(0x101010), 0.12, 0.06, 0.3));
  for (const s of [-1, 1]) {
    head.add(m(cylG(0.03, 0.04, 0.6, 5), glow, s * 0.15, 0.4, -0.05, 0, 0, -s * 0.4));
    head.add(m(cylG(0.025, 0.03, 0.3, 5), glow, s * 0.32, 0.6, -0.05, 0, 0, -s * 1.1));
    head.add(m(sphere(0.06, 6), glow, s * 0.42, 0.68, -0.05));
  }
  body.add(head);
  body.add(m(sphere(0.12, 6), light, 0, 1.3, -0.68));
  const legs = [[-0.2, 0.45], [0.2, 0.45], [-0.2, -0.45], [0.2, -0.45]].map(([x, z]) => leg(x, 0.95, z, 0.95, 0.07, fur));
  body.add(...legs);
  return { group, parts: { body, head, legL: legs[0], legR: legs[1], armL: legs[2], armR: legs[3] }, extra: {} };
}

// Golem de Zircón: roca y cristales azul verdoso
function buildGolem() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const rock = mat(0x6a6e78, { flat: true, r: 0.9 });
  const zircon = mat(0x5af0d8, { e: 0x18b8a0, ei: 1.4, flat: true, r: 0.2 });
  body.add(m(dodeG(0.75), rock, 0, 1.6, 0));
  body.add(m(dodeG(0.4), rock, 0, 2.45, 0.1));
  body.add(m(octG(0.1), zircon, -0.13, 2.5, 0.42));
  body.add(m(octG(0.1), zircon, 0.13, 2.5, 0.42));
  for (let i = 0; i < 4; i++) {
    const c = m(octG(0.28), zircon, (i - 1.5) * 0.35, 2.2 + (i % 2) * 0.2, -0.55, -0.4, 0, (i - 1.5) * 0.3);
    c.scale.set(1, 2.2, 1);
    body.add(c);
  }
  const arm = (s) => {
    const p = new THREE.Group(); p.position.set(s * 0.95, 2.0, 0);
    p.add(m(dodeG(0.32), rock, 0, -0.3, 0));
    p.add(m(dodeG(0.38), rock, 0, -0.95, 0.05));
    p.add(m(octG(0.16), zircon, 0, -1.3, 0.1));
    return p;
  };
  const armL = arm(-1), armR = arm(1);
  const legL = leg(-0.35, 0.95, 0, 0.9, 0.22, rock), legR = leg(0.35, 0.95, 0, 0.9, 0.22, rock);
  body.add(armL, armR, legL, legR);
  return { group, parts: { body, armL, armR, legL, legR }, extra: {} };
}

// Gusano de Raíz: sale de un montículo de tierra
function buildWorm() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const skin = mat(0x7a5a3a, { r: 0.8 });
  const belly = mat(0xb08a5a, { r: 0.8 });
  const root = mat(0x4a3420, { r: 0.95 });
  const maw = mat(0x3a0a10, { e: 0xa0ff40, ei: 0.6 });
  group.add(m(cylG(1.5, 2, 0.6, 10), root, 0, 0.2, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    group.add(m(cylG(0.08, 0.18, 1.6, 5), root, Math.cos(a) * 1.6, 0.4, Math.sin(a) * 1.6, Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1));
  }
  const segs = [];
  for (let i = 0; i < 6; i++) {
    const s = m(sphere(0.55 - i * 0.04, 10), i % 2 ? skin : belly, 0, 0.6 + i * 0.5, 0);
    body.add(s); segs.push(s);
  }
  const head = new THREE.Group(); head.position.set(0, 3.4, 0.2);
  head.add(m(sphere(0.55, 12), skin));
  head.add(m(cylG(0.38, 0.38, 0.2, 12), maw, 0, 0, 0.45, Math.PI / 2));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    head.add(m(coneG(0.06, 0.25, 4), mat(0xf0e8d0), Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.55, Math.PI / 2));
  }
  body.add(head);
  return { group, parts: {}, extra: { anim: (t, u) => {
    const k = u.attackAnim > 0 ? Math.sin(u.attackAnim * Math.PI) : 0;
    segs.forEach((s, i) => { s.position.z = Math.sin(t * 2 + i * 0.6) * 0.12 * i + k * i * 0.15; });
    head.position.z = 0.2 + Math.sin(t * 2 + 3.6) * 0.5 + k * 1.4;
    head.position.y = 3.4 - k * 0.8;
  } } };
}

// Dragón ácido de Cadalíz: el dragón de Yeslie, recoloreado en verde ácido
function buildAcidDragon() {
  const d = buildDragon();
  const swap = new Map();
  d.group.traverse((o) => {
    if (!o.isMesh) return;
    if (!swap.has(o.material)) {
      const c = o.material.clone();
      const emissive = o.material.emissive.getHex() !== 0;
      c.color = new THREE.Color(emissive ? 0xd0ff40 : o.material.side === THREE.DoubleSide ? 0x6a8a2a : 0x4a7a30);
      if (emissive) c.emissive = new THREE.Color(0xa0ff00);
      c.metalness = 0.3;
      swap.set(o.material, c);
    }
    o.material = swap.get(o.material);
  });
  return d;
}

// Tigre corrompido de Kugane: pelaje oscuro con rayas violetas brillantes
function buildTiger() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const fur = mat(0x2a1f30, { r: 0.85 });
  const stripe = mat(0xd040ff, { e: 0xa020ff, ei: 1.6 });
  const eye = mat(0xff2040, { e: 0xff0020, ei: 2.5 });
  body.add(m(boxG(0.8, 0.7, 1.9), fur, 0, 1.15, 0));
  for (let i = 0; i < 5; i++) body.add(m(boxG(0.84, 0.08, 0.1), stripe, 0, 1.35, -0.7 + i * 0.35));
  const head = new THREE.Group(); head.position.set(0, 1.45, 1.15);
  head.add(m(boxG(0.65, 0.55, 0.6), fur));
  head.add(m(boxG(0.4, 0.25, 0.3), fur, 0, -0.12, 0.38));
  head.add(m(sphere(0.06, 6), eye, -0.18, 0.1, 0.3));
  head.add(m(sphere(0.06, 6), eye, 0.18, 0.1, 0.3));
  head.add(m(coneG(0.12, 0.25, 4), fur, -0.22, 0.35, -0.05));
  head.add(m(coneG(0.12, 0.25, 4), fur, 0.22, 0.35, -0.05));
  head.add(m(coneG(0.04, 0.22, 4), mat(0xf8f0e0), -0.1, -0.3, 0.45, Math.PI));
  head.add(m(coneG(0.04, 0.22, 4), mat(0xf8f0e0), 0.1, -0.3, 0.45, Math.PI));
  body.add(head);
  const tail = m(cylG(0.05, 0.1, 1.4, 6), fur, 0, 1.5, -1.4, -0.9);
  body.add(tail);
  body.add(m(sphere(0.12, 6), stripe, 0, 2.0, -1.95));
  const legs = [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]].map(([x, z]) => leg(x, 0.85, z, 0.85, 0.12, fur));
  body.add(...legs);
  return { group, parts: { body, head, legL: legs[0], legR: legs[1], armL: legs[2], armR: legs[3] }, extra: { anim: (t) => { tail.rotation.z = Math.sin(t * 3) * 0.4; } } };
}

const BUILDERS = { ghost: buildGhost, fauna: buildFauna, golem: buildGolem, worm: buildWorm, dragon: buildAcidDragon, tiger: buildTiger };

// ------------------------------------------------------------------ campamentos
export function setupJungle(g) {
  g.camps = [];
  const add = (c, side) => {
    const x = side === 'red' ? -c.x : c.x;
    g.camps.push({ ...c, key: `${c.id}_${side}`, side, pos: V(x, c.z), next: c.first, units: [], types: c.units, alive: false, warned: false });
  };
  for (const c of CAMPS) { add(c, 'blue'); add(c, 'red'); }
  for (const c of EPIC_CAMPS) add(c, 'epic');
}

function spawnCamp(g, camp) {
  camp.units = camp.types.map((type, i) => {
    const M = MONSTERS[type];
    const n = camp.types.length;
    const a = (i / n) * Math.PI * 2 + 0.5;
    const off = n > 1 ? 2.2 : 0;
    // se hacen más fuertes con el tiempo
    const k = 1 + Math.min(1.5, g.time / 600);
    const base = { ...M, hp: M.hp * k, ad: M.ad * k, mp: 0 };
    const u = g.makeUnit({ team: 'neutral', kind: 'monster', type, x: camp.pos.x + Math.cos(a) * off, z: camp.pos.z + Math.sin(a) * off,
      radius: M.radius, base, model: BUILDERS[type](), height: M.height, scale: M.scale });
    u.name = M.name;
    u.camp = camp;
    u.epic = !!M.epic;
    u.home = u.pos.clone();
    u.facing = Math.atan2(-camp.pos.x, -camp.pos.z) || 0;
    u.state.skillCd = 5;
    return u;
  });
  camp.alive = true;
  if (camp.side === 'epic') {
    g.emit('message', { text: `¡${MONSTERS[camp.types[0]].name} ha aparecido en ${camp.where}!`, kind: 'warn' });
    g.sound('monstruo_epico', null, 0.8);
  }
  for (const u of camp.units) g.fx.burst(u.pos, camp.side === 'epic' ? 0xd0ff40 : 0xbff0ff, 14, 3, 0.14, 0.7, 2);
}

export function updateJungle(g, dt) {
  for (const camp of g.camps) {
    if (camp.alive) continue;
    if (camp.side === 'epic' && !camp.warned && g.time >= camp.next - 30 && g.time < camp.next) {
      camp.warned = true;
      g.emit('message', { text: `${MONSTERS[camp.types[0]].name} aparecerá en 30 s (${camp.where})`, kind: 'info' });
    }
    if (g.time >= camp.next) spawnCamp(g, camp);
  }
}

// Al recibir daño, todo el campamento se gira contra el atacante
export function monsterHit(g, u, src) {
  if (!src || !src.alive || src.kind === 'monster' || src.team === 'neutral') return;
  for (const o of u.camp.units) {
    if (!o.alive) continue;
    if (!o.state.aggro || !o.state.aggro.alive) o.state.aggro = src;
    o.state.returning = false;
    o.state.lastHit = g.time;
  }
}

// ------------------------------------------------------------------ IA
export function monsterAI(g, u, dt) {
  const home = u.home;
  const dHome = dist2(u.pos, home);
  const leash = u.epic ? 20 : 14;
  if (u.state.returning) {
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.25 * dt);
    if (dHome < 0.8) { u.state.returning = false; u.order = null; u.hp = u.maxHp; u.facing = Math.atan2(-u.camp.pos.x, -u.camp.pos.z) || 0; }
    else u.order = { type: 'move', point: home };
    return;
  }
  let t = u.state.aggro;
  if (t && (!t.alive || dist2(t.pos, home) > leash + 4 || dHome > leash)) {
    // busca a otro atacante cercano antes de rendirse
    const near = g.heroes.filter((h) => h.alive && dist2(h.pos, home) < leash && (u.damagedBy.get(h.id) ?? -99) > g.time - 6);
    t = u.state.aggro = g.nearest(near, u.pos);
  }
  if (!t) {
    if (dHome > 0.8 || u.hp < u.maxHp) { u.state.returning = true; u.damagedBy.clear(); }
    return;
  }
  u.order = { type: 'attack', target: t };
  if (u.epic) epicSkills(g, u, t, dt);
}

function epicSkills(g, u, t, dt) {
  u.state.skillCd -= dt;
  if (u.state.skillCd > 0 || g.hasBuff(u, 'stun')) return;
  if (u.type === 'dragon') {
    // aliento ácido: área a los pies del objetivo, daño y ralentización
    u.state.skillCd = 6;
    const c = t.pos.clone();
    g.fx.ring(c, 4, 0xa0ff00, 0.8, { fill: true, opacity: 0.35, steady: true });
    g.face(u, c);
    u.attackAnim = 0.001;
    g.after(0.8, () => {
      if (!u.alive) return;
      for (const e of g.unitsInRadius(c, 4, (x) => x.kind === 'hero')) {
        g.dealDamage(u, e, 120 + g.time * 0.12, 'magic');
        g.addBuff(e, 'slow', 2, 0.35);
      }
      g.fx.burst(c, 0xa0ff00, 36, 5, 0.18, 0.8, 2);
      g.sound('disparo_magia', c, 0.8);
    });
  } else {
    // zarpazo: salta sobre el héroe más lejano cercano y lo aturde
    u.state.skillCd = 7;
    const far = g.heroes.filter((h) => h.alive && dist2(h.pos, u.home) < 18).sort((a, b) => dist2(b.pos, u.pos) - dist2(a.pos, u.pos))[0] || t;
    g.fx.ring(far.pos, 2.5, 0xd040ff, 0.5, { grow: true });
    g.dashTo(u, far.pos.clone(), 26, {
      onArrive: () => {
        for (const e of g.unitsInRadius(u.pos, 3, (x) => x.kind === 'hero')) {
          g.dealDamage(u, e, 100 + g.time * 0.1, 'physical');
          g.addBuff(e, 'stun', 0.8, 0);
        }
        g.fx.burst(u.pos, 0xd040ff, 30, 6, 0.16, 0.6, 2);
        g.shake?.(0.15, u.pos);
      },
    });
  }
}

// ------------------------------------------------------------------ recompensas
export function monsterKilled(g, u, killer) {
  const M = MONSTERS[u.type];
  let credit = killer && killer.kind === 'hero' ? killer : null;
  if (!credit) {
    let best = -1;
    for (const h of g.heroes) {
      const t = u.damagedBy.get(h.id);
      if (t !== undefined && g.time - t < 10 && t > best) { best = t; credit = h; }
    }
  }
  u.deathAnim = 0.001;
  g.fx.burst(u.pos, u.epic ? 0xd0ff40 : 0xffd060, u.epic ? 50 : 14, u.epic ? 8 : 4, 0.16, 0.8, 2);
  const camp = u.camp;
  if (camp.units.every((o) => !o.alive)) {
    camp.alive = false;
    camp.warned = false;
    camp.next = g.time + camp.respawn;
  }
  if (!credit) return;
  g.giveGold(credit, M.gold + Math.floor(g.time / 60) * 2);
  credit.cs++;
  g.addXp(credit, M.xp);
  for (const h of g.heroes) if (h !== credit && h.alive && h.team === credit.team && dist2(h.pos, u.pos) < 15) g.addXp(h, M.xp * 0.5);
  if (M.buff) giveBuff(g, credit, M.buff);
  if (M.teamBuff) {
    for (const h of g.heroes) if (h.team === credit.team && h.alive) giveBuff(g, h, M.teamBuff);
    for (const h of g.heroes) if (h.team === credit.team) g.giveGold(h, 60);
    const team = credit.team === 'blue' ? 'Los Blood Hawks han' : 'La Legión de Lorik ha';
    const B = JUNGLE_BUFFS[M.teamBuff];
    g.emit('message', { text: `¡${team} derrotado al ${M.name}! ${B.icon} ${B.name}: ${B.desc}`, kind: credit.team === g.player?.team ? 'good' : 'danger' });
    g.emit('epicKilled', { monster: u, team: credit.team });
    g.sound('torre_destruida', u.pos, 0.8);
    g.shake?.(0.25, u.pos);
  }
}

export function giveBuff(g, h, id) {
  const B = JUNGLE_BUFFS[id];
  const o = { key: 'jg_' + id };
  if (id === 'zircon') {
    g.addBuff(h, 'cdr', B.dur, 0.2, o);
    g.addBuff(h, 'mpregen', B.dur, 1.0, { key: 'jg_zircon_mp' });
  } else if (id === 'root') {
    g.addBuff(h, 'jgroot', B.dur, 1, o);
  } else if (id === 'cadaliz') {
    g.addBuff(h, 'dmgup', B.dur, 0.15, o);
  } else if (id === 'kugane') {
    g.addBuff(h, 'bonus_armor', B.dur, 25, o);
    g.addBuff(h, 'bonus_mr', B.dur, 25, { key: 'jg_kugane_mr' });
    g.addBuff(h, 'spd', B.dur, 0.08, { key: 'jg_kugane_spd' });
  }
  if (h.isPlayer) { g.floater(h, `${B.icon} ${B.name}`, '#ffe08a', true); g.sound('bendicion', null, 0.7); }
  g.fx.ring(h.pos, 2.4, 0xffe08a, 0.8, { grow: true });
}

// Bendiciones activas de una unidad, para la interfaz
export function activeBlessings(g, u) {
  const out = [];
  for (const id of Object.keys(JUNGLE_BUFFS)) {
    const b = g.getBuff(u, 'jg_' + id);
    if (b) out.push({ ...JUNGLE_BUFFS[id], id, t: b.t });
  }
  return out;
}
