// Modelos 3D construidos con formas básicas (sin recursos externos).
// Todos los diseños son originales y solo se inspiran en las descripciones del lore.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// --- Cachés para no duplicar geometrías y materiales ---------------------------
const geoCache = new Map();
const matCache = new Map();

function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

export function mat(color, o = {}) {
  const key = `${color}|${o.r ?? 0.7}|${o.m ?? 0.1}|${o.e ?? 0}|${o.ei ?? 1}|${o.flat ? 1 : 0}|${o.side ?? 0}|${o.op ?? 1}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: o.r ?? 0.7, metalness: o.m ?? 0.1,
      emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
      flatShading: !!o.flat, side: o.side ?? THREE.FrontSide,
      transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1,
    }));
  }
  return matCache.get(key);
}

function mesh(g, m, shadow = true) {
  const x = new THREE.Mesh(g, m);
  x.castShadow = shadow;
  x.receiveShadow = false;
  return x;
}
const box = (w, h, d, m) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), m);
const cyl = (rt, rb, h, m, s = 12) => mesh(geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), m);
const sph = (r, m, s = 16) => mesh(geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s * 0.75 | 0))), m);
const cone = (r, h, m, s = 12) => mesh(geo(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)), m);
const torus = (r, t, m, arc = Math.PI * 2) => mesh(geo(`t${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc)), m);
const oct = (r, m) => mesh(geo(`o${r}`, () => new THREE.OctahedronGeometry(r)), m);

function at(obj, x, y, z, rx = 0, ry = 0, rz = 0) {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  return obj;
}

// --- Humanoide base ---------------------------------------------------------
// Devuelve { group, parts } con pivotes en caderas y hombros para animar.
function humanoid(o) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const s = o.scale ?? 1;
  body.scale.setScalar(s);

  const limbR = o.limbR ?? 0.11;
  const legM = o.legs, armM = o.arms ?? o.torso, skinM = o.skin;

  const legL = new THREE.Group(); at(legL, -0.17, 0.9, 0);
  const legR = new THREE.Group(); at(legR, 0.17, 0.9, 0);
  legL.add(at(cyl(limbR, limbR * 0.85, 0.88, legM, 8), 0, -0.44, 0));
  legR.add(at(cyl(limbR, limbR * 0.85, 0.88, legM, 8), 0, -0.44, 0));
  if (o.boots) {
    legL.add(at(box(0.22, 0.2, 0.32, o.boots), 0, -0.82, 0.05));
    legR.add(at(box(0.22, 0.2, 0.32, o.boots), 0, -0.82, 0.05));
  }
  body.add(legL, legR);

  const torso = o.torsoMesh ?? at(cyl(0.3, 0.24, 0.72, o.torso, 10), 0, 1.25, 0);
  body.add(torso);

  const head = new THREE.Group(); at(head, 0, 1.8, 0);
  head.add(sph(0.22, skinM, 14));
  body.add(head);
  if (o.eyes !== false) {
    const eyeM = o.eyeMat ?? mat(0x222233);
    head.add(at(sph(0.035, eyeM, 6), -0.08, 0.03, 0.19));
    head.add(at(sph(0.035, eyeM, 6), 0.08, 0.03, 0.19));
  }

  const armL = new THREE.Group(); at(armL, -0.38, 1.55, 0);
  const armR = new THREE.Group(); at(armR, 0.38, 1.55, 0);
  armL.add(at(cyl(limbR * 0.9, limbR * 0.75, 0.66, armM, 8), 0, -0.32, 0));
  armR.add(at(cyl(limbR * 0.9, limbR * 0.75, 0.66, armM, 8), 0, -0.32, 0));
  armL.add(at(sph(limbR * 0.95, skinM, 8), 0, -0.68, 0));
  armR.add(at(sph(limbR * 0.95, skinM, 8), 0, -0.68, 0));
  body.add(armL, armR);

  const handR = new THREE.Group(); at(handR, 0, -0.68, 0); armR.add(handR);
  const handL = new THREE.Group(); at(handL, 0, -0.68, 0); armL.add(handL);

  return { group, parts: { body, legL, legR, armL, armR, head, torso, handR, handL }, scale: s };
}

// --- HÉROES -------------------------------------------------------------------

function buildJosephine() {
  const skin = mat(0xf3d6c0);
  const armor = mat(0xe8ecf2, { m: 0.75, r: 0.3 });
  const gold = mat(0xe0b33c, { m: 0.85, r: 0.3 });
  const blue = mat(0x2d4f9e, { r: 0.6 });
  const hair = mat(0xf0d070, { r: 0.6 });
  const h = humanoid({ skin, legs: armor, torso: armor, arms: armor, boots: gold, scale: 1.0 });
  const p = h.parts;
  // falda tipo kimono bajo la armadura
  p.body.add(at(cyl(0.26, 0.42, 0.55, blue, 12), 0, 0.85, 0));
  // peto con detalle dorado
  p.body.add(at(box(0.36, 0.06, 0.05, gold), 0, 1.42, 0.27));
  p.body.add(at(torus(0.3, 0.035, gold), 0, 0.9, 0, Math.PI / 2));
  // hombreras
  p.body.add(at(sph(0.15, armor, 10), -0.4, 1.58, 0));
  p.body.add(at(sph(0.15, armor, 10), 0.4, 1.58, 0));
  // pelo rubio largo
  p.head.add(at(sph(0.235, hair, 14), 0, 0.08, -0.08));
  p.head.add(at(box(0.42, 0.62, 0.14, hair), 0, -0.3, -0.16));
  // diadema dorada con alitas
  p.head.add(at(torus(0.235, 0.025, gold), 0, 0.1, 0, Math.PI / 2 - 0.25));
  p.head.add(at(box(0.04, 0.12, 0.22, gold), -0.25, 0.14, -0.02, 0.4, 0, 0.5));
  p.head.add(at(box(0.04, 0.12, 0.22, gold), 0.25, 0.14, -0.02, 0.4, 0, -0.5));
  // espada angelical (mano derecha)
  const sword = new THREE.Group();
  sword.add(at(box(0.07, 1.05, 0.03, mat(0xf4f8ff, { m: 0.9, r: 0.15, e: 0x334466, ei: 0.4 })), 0, 0.6, 0));
  sword.add(at(box(0.32, 0.05, 0.06, gold), 0, 0.08, 0));
  sword.add(at(cyl(0.03, 0.03, 0.18, blue), 0, -0.04, 0));
  at(sword, 0, -0.02, 0.05, Math.PI / 2, 0, 0);
  p.handR.add(sword);
  // brazalete rojo
  p.armR.add(at(cyl(0.11, 0.11, 0.07, mat(0xc02030)), 0, -0.55, 0));
  // escudo de la devoción (brazo izquierdo)
  const shield = new THREE.Group();
  shield.add(at(cyl(0.38, 0.38, 0.06, mat(0xf4f4f0, { m: 0.5, r: 0.4 }), 20), 0, 0, 0, Math.PI / 2));
  shield.add(at(torus(0.38, 0.04, gold), 0, 0, 0));
  shield.add(at(oct(0.12, mat(0x3a6fe0, { m: 0.4, e: 0x1a3a90, ei: 0.6 })), 0, 0, 0.05));
  at(shield, -0.12, -0.35, 0.18, 0, -0.3, 0);
  p.armL.add(shield);
  return { ...h, extra: { sword, glow: sword.children[0] } };
}

function buildFotsor() {
  const bone = mat(0xece4cf, { r: 0.8 });
  const dark = mat(0x1a0a05);
  const fireEye = mat(0xff7a1a, { e: 0xff5a00, ei: 2 });
  const cape = mat(0x7a1626, { side: THREE.DoubleSide });
  const h = humanoid({ skin: bone, legs: bone, torso: dark, arms: bone, limbR: 0.07, eyeMat: fireEye, scale: 1.02,
    torsoMesh: new THREE.Group() });
  const p = h.parts;
  // columna y costillas
  p.body.add(at(cyl(0.05, 0.05, 0.75, bone, 6), 0, 1.25, -0.05));
  for (let i = 0; i < 4; i++) {
    const r = 0.25 - i * 0.025;
    p.body.add(at(torus(r, 0.03, bone, Math.PI * 1.6), 0, 1.5 - i * 0.13, 0, Math.PI / 2, 0, Math.PI * 0.7));
  }
  p.body.add(at(cyl(0.22, 0.18, 0.12, bone, 10), 0, 0.92, 0)); // pelvis
  p.body.add(at(cyl(0.05, 0.05, 0.75, bone, 6), 0, 1.6, 0, 0, 0, Math.PI / 2)); // clavícula
  // cráneo: cuencas y mandíbula
  p.head.add(at(box(0.26, 0.09, 0.2, bone), 0, -0.17, 0.06));
  p.head.add(at(sph(0.05, fireEye, 6), -0.08, 0.03, 0.19));
  p.head.add(at(sph(0.05, fireEye, 6), 0.08, 0.03, 0.19));
  // llamas de la cabeza
  const flames = new THREE.Group();
  const fm1 = mat(0xff6a00, { e: 0xff4400, ei: 2.2, op: 0.9 });
  const fm2 = mat(0xffd040, { e: 0xffaa00, ei: 2.2, op: 0.9 });
  const flameList = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const f = cone(0.09, 0.45, i % 2 ? fm1 : fm2, 6);
    f.castShadow = false;
    at(f, Math.cos(a) * 0.12, 0.28, Math.sin(a) * 0.12 - 0.03);
    flames.add(f);
    flameList.push(f);
  }
  const core = cone(0.16, 0.6, fm1, 8); core.castShadow = false; at(core, 0, 0.32, -0.03);
  flames.add(core); flameList.push(core);
  p.head.add(flames);
  // capa granate
  const capeM = mesh(geo('capeF', () => new THREE.PlaneGeometry(0.75, 1.15)), cape);
  at(capeM, 0, 1.08, -0.22, 0.12, 0, 0);
  p.body.add(capeM);
  // manos con magia del tiempo
  const timeM = mat(0xb07aff, { e: 0x7a3aff, ei: 1.5 });
  p.handR.add(sph(0.11, timeM, 8));
  p.handL.add(sph(0.11, timeM, 8));
  return { ...h, extra: { flames, flameList, cape: capeM } };
}

function buildYeslie() {
  const skin = mat(0xfaf0f0);
  const hair = mat(0xf7f7ff, { r: 0.5 });
  const dressW = mat(0xf2f2f6);
  const dressB = mat(0x16151d);
  const horn = mat(0x7a3fb0, { m: 0.3, r: 0.35, e: 0x1a8f9a, ei: 0.25 });
  const crystal = mat(0x7ff6ff, { e: 0x30d8ff, ei: 1.6, r: 0.1, m: 0.2 });
  const h = humanoid({ skin, legs: dressB, torso: dressB, arms: dressW, boots: dressB, scale: 0.96,
    eyeMat: mat(0x7fd8ff, { e: 0x3aa8ff, ei: 0.8 }) });
  const p = h.parts;
  // vestido blanco y negro
  p.body.add(at(cyl(0.22, 0.55, 0.9, dressB, 14), 0, 0.78, 0));
  p.body.add(at(cyl(0.555, 0.57, 0.1, dressW, 14), 0, 0.35, 0));
  p.body.add(at(box(0.3, 0.5, 0.05, dressW), 0, 1.3, 0.25));
  // lazos
  p.body.add(at(box(0.24, 0.1, 0.06, mat(0x9b5cff)), 0, 1.52, 0.27));
  // pelo blanco largo
  p.head.add(at(sph(0.24, hair, 14), 0, 0.08, -0.08));
  p.head.add(at(box(0.46, 0.85, 0.16, hair), 0, -0.4, -0.15));
  // cuernos curvos
  const hl = torus(0.14, 0.04, horn, Math.PI * 1.1); at(hl, -0.17, 0.2, -0.02, 0, Math.PI / 2, 0.6);
  const hr = torus(0.14, 0.04, horn, Math.PI * 1.1); at(hr, 0.17, 0.2, -0.02, 0, -Math.PI / 2, -0.6 + Math.PI);
  p.head.add(hl, hr);
  // pistola mágica de cristal
  const gun = new THREE.Group();
  gun.add(at(box(0.09, 0.14, 0.1, mat(0xd9dde8, { m: 0.8, r: 0.3 })), 0, 0, 0));
  gun.add(at(oct(0.1, crystal), 0, 0.04, 0.2));
  gun.add(at(cyl(0.035, 0.035, 0.3, crystal, 6), 0, 0.04, 0.22, Math.PI / 2));
  at(gun, 0, -0.05, 0.08);
  p.handR.add(gun);
  // libro flotante
  const book = new THREE.Group();
  book.add(box(0.3, 0.06, 0.24, mat(0x5a2a8a)));
  book.add(at(box(0.28, 0.065, 0.22, mat(0xfff8e0)), 0.01, 0, 0));
  at(book, -0.62, 1.45, 0.1);
  p.body.add(book);
  return { ...h, extra: { crystal: gun, book } };
}

function buildAstrid() {
  const skin = mat(0xf2d2bb);
  const fur = mat(0x3b2b22, { r: 0.95 });
  const leather = mat(0x5a3e2b, { r: 0.8 });
  const hair = mat(0xf1d27a, { r: 0.55 });
  const red = mat(0xb02a2a);
  const blue = mat(0x2a4aa8);
  const metal = mat(0x8a8f99, { m: 0.85, r: 0.3 });
  const h = humanoid({ skin, legs: leather, torso: leather, arms: leather, boots: fur, scale: 1.08 });
  const p = h.parts;
  // pieles y ribetes
  p.body.add(at(cyl(0.38, 0.32, 0.28, fur, 10), 0, 1.52, 0));
  p.body.add(at(cyl(0.31, 0.31, 0.06, red), 0, 1.0, 0));
  p.body.add(at(cyl(0.305, 0.305, 0.06, blue), 0, 1.06, 0));
  p.body.add(at(cyl(0.12, 0.12, 0.03, metal, 12), 0.12, 1.35, 0.28, Math.PI / 2));
  // pelo rubio con trenzas laterales
  p.head.add(at(sph(0.23, hair, 14), 0, 0.08, -0.08));
  p.head.add(at(box(0.4, 0.55, 0.12, hair), 0, -0.25, -0.17));
  p.head.add(at(cyl(0.045, 0.03, 0.5, hair, 6), -0.2, -0.25, 0.05));
  p.head.add(at(cyl(0.045, 0.03, 0.5, hair, 6), 0.2, -0.25, 0.05));
  // pintura de guerra azul
  p.head.add(at(box(0.3, 0.06, 0.04, mat(0x1a2a6a)), 0, 0.04, 0.2));
  // rifle de Gravenfort (en las manos)
  const rifle = new THREE.Group();
  rifle.add(at(box(0.1, 0.12, 0.6, mat(0x4a2e1a)), 0, 0, -0.1));
  rifle.add(at(cyl(0.035, 0.035, 1.1, metal, 8), 0, 0.04, 0.6, Math.PI / 2));
  rifle.add(at(cyl(0.05, 0.05, 0.25, mat(0x6ad8ff, { e: 0x2a9aff, ei: 1.2 }), 8), 0, 0.12, 0.25, Math.PI / 2));
  at(rifle, 0, -0.02, 0.1);
  p.handR.add(rifle);
  // pistolas a la cintura
  p.body.add(at(box(0.08, 0.2, 0.12, metal), -0.33, 0.95, 0.05));
  p.body.add(at(box(0.08, 0.2, 0.12, metal), 0.33, 0.95, 0.05));
  return { ...h, extra: { rifle } };
}

export function buildDragon() {
  const silver = mat(0xdfe6f0, { m: 0.75, r: 0.25 });
  const wing = mat(0xbfd0e8, { m: 0.5, r: 0.4, side: THREE.DoubleSide, op: 0.92 });
  const eye = mat(0x7ff6ff, { e: 0x30d8ff, ei: 2 });
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const torsoD = at(sph(0.7, silver, 16), 0, 1.4, 0);
  torsoD.scale.set(1, 0.8, 1.5);
  body.add(torsoD);
  body.add(at(cyl(0.22, 0.35, 0.9, silver, 10), 0, 1.95, 0.75, -0.9));
  const head = new THREE.Group(); at(head, 0, 2.3, 1.2);
  head.add(at(box(0.4, 0.32, 0.65, silver), 0, 0, 0.15));
  head.add(at(sph(0.06, eye, 6), -0.15, 0.08, 0.35));
  head.add(at(sph(0.06, eye, 6), 0.15, 0.08, 0.35));
  head.add(at(cone(0.06, 0.45, silver, 6), -0.12, 0.28, -0.1, -0.6));
  head.add(at(cone(0.06, 0.45, silver, 6), 0.12, 0.28, -0.1, -0.6));
  body.add(head);
  const tail = at(cone(0.3, 1.8, silver, 8), 0, 1.15, -1.6, -Math.PI / 2 - 0.2);
  body.add(tail);
  const legs = [];
  for (const [x, z] of [[-0.4, 0.5], [0.4, 0.5], [-0.4, -0.5], [0.4, -0.5]]) {
    const l = new THREE.Group(); at(l, x, 1.0, z);
    l.add(at(cyl(0.12, 0.09, 0.9, silver, 8), 0, -0.45, 0));
    body.add(l); legs.push(l);
  }
  const wingGeo = geo('dragonWing', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(2.2, 0.6); s.lineTo(2.0, -0.2); s.lineTo(1.4, -0.4); s.lineTo(0.8, -0.6); s.lineTo(0, -0.5);
    return new THREE.ShapeGeometry(s);
  });
  const wl = new THREE.Group(); at(wl, -0.4, 1.8, 0.1);
  const wr = new THREE.Group(); at(wr, 0.4, 1.8, 0.1);
  const wlm = mesh(wingGeo, wing); wlm.rotation.set(-Math.PI / 2, 0, Math.PI); wl.add(wlm);
  const wrm = mesh(wingGeo, wing); wrm.rotation.set(-Math.PI / 2, 0, 0); wr.add(wrm);
  body.add(wl, wr);
  return { group, parts: { body, legL: legs[0], legR: legs[1], armL: legs[2], armR: legs[3], head, wingL: wl, wingR: wr }, scale: 1, extra: {} };
}

// --- SÚBDITOS -------------------------------------------------------------------

function buildBlueMelee() {
  const steel = mat(0xd8dde6, { m: 0.6, r: 0.4 });
  const blue = mat(0x2f5fbf);
  const h = humanoid({ skin: mat(0xe8c4a8), legs: blue, torso: steel, arms: blue, boots: mat(0x3a3a44), scale: 0.72 });
  const p = h.parts;
  p.head.add(at(sph(0.24, steel, 10), 0, 0.06, 0)); // yelmo
  p.head.add(at(box(0.06, 0.2, 0.3, mat(0xe0b33c, { m: 0.8 })), 0, 0.28, 0));
  const spear = new THREE.Group();
  spear.add(at(cyl(0.03, 0.03, 1.6, mat(0x6a4a2a), 6), 0, 0.4, 0));
  spear.add(at(cone(0.07, 0.25, steel, 6), 0, 1.3, 0));
  at(spear, 0, 0, 0.05, Math.PI / 2.4, 0, 0);
  p.handR.add(spear);
  p.armL.add(at(box(0.36, 0.5, 0.06, mat(0xf2f2f2)), -0.08, -0.4, 0.15));
  return h;
}

function buildBlueRanged() {
  const robe = mat(0xf0f0f6);
  const gold = mat(0xe0b33c, { m: 0.8, r: 0.3 });
  const h = humanoid({ skin: mat(0xe2b896), legs: robe, torso: robe, arms: robe, scale: 0.7 });
  const p = h.parts;
  p.body.add(at(cyl(0.22, 0.5, 0.95, robe, 10), 0, 0.5, 0));
  p.body.add(at(cyl(0.505, 0.505, 0.08, mat(0x2f5fbf), 10), 0, 0.1, 0));
  p.head.add(at(cone(0.26, 0.4, mat(0x2f5fbf), 10), 0, 0.22, 0));
  const staff = new THREE.Group();
  staff.add(at(cyl(0.03, 0.03, 1.5, gold, 6), 0, 0.5, 0));
  staff.add(at(sph(0.12, mat(0xfff2a0, { e: 0xffd040, ei: 1.5 }), 8), 0, 1.3, 0));
  at(staff, 0, 0, 0.05, Math.PI / 2.4, 0, 0);
  p.handR.add(staff);
  return h;
}

function buildRedMelee() {
  const robe = mat(0x1d1420, { r: 0.9 });
  const trim = mat(0x8a1020);
  const eye = mat(0xff2a2a, { e: 0xff0000, ei: 2 });
  const h = humanoid({ skin: mat(0x2a1f2a), legs: robe, torso: robe, arms: robe, eyeMat: eye, scale: 0.74 });
  const p = h.parts;
  p.body.add(at(cyl(0.22, 0.48, 1.0, robe, 10), 0, 0.55, 0));
  p.body.add(at(cyl(0.485, 0.485, 0.06, trim, 10), 0, 0.1, 0));
  // capucha
  p.head.add(at(cone(0.3, 0.6, robe, 10), 0, 0.12, -0.06));
  p.head.add(at(sph(0.04, eye, 6), -0.08, 0.02, 0.21));
  p.head.add(at(sph(0.04, eye, 6), 0.08, 0.02, 0.21));
  const dagger = at(cone(0.05, 0.5, mat(0x9a1a2a, { m: 0.7, e: 0x500010, ei: 1 }), 4), 0, 0, 0.2, Math.PI / 2, 0, 0);
  p.handR.add(dagger);
  return h;
}

function buildRedRanged() {
  const dark = mat(0x2a2030, { m: 0.4, r: 0.5 });
  const wing = mat(0x3a1040, { side: THREE.DoubleSide, r: 0.6 });
  const halo = mat(0xff2a4a, { e: 0xff0030, ei: 2 });
  const h = humanoid({ skin: mat(0x9a8aa0), legs: dark, torso: dark, arms: dark, eyeMat: halo, scale: 0.72 });
  const p = h.parts;
  p.body.add(at(cyl(0.2, 0.4, 0.8, dark, 10), 0, 0.75, 0));
  p.head.add(at(torus(0.2, 0.025, halo), 0, 0.33, 0, Math.PI / 2));
  const wingGeo = geo('angelWing', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(1.0, 0.5); s.lineTo(1.1, -0.1); s.lineTo(0.7, -0.6); s.lineTo(0.3, -0.7);
    return new THREE.ShapeGeometry(s);
  });
  const wl = mesh(wingGeo, wing); at(wl, -0.15, 1.5, -0.2, 0, Math.PI + 0.5, 0);
  const wr = mesh(wingGeo, wing); at(wr, 0.15, 1.5, -0.2, 0, -0.5, 0);
  p.body.add(wl, wr);
  p.handR.add(sph(0.12, halo, 8));
  return { ...h, extra: { wingL: wl, wingR: wr } };
}

// --- ESTRUCTURAS ------------------------------------------------------------------

function buildBlueTower() {
  const g = new THREE.Group();
  const stone = mat(0xe9e6dc, { r: 0.85 });
  const gold = mat(0xe0b33c, { m: 0.8, r: 0.3 });
  g.add(at(cyl(1.7, 2.0, 0.6, stone, 12), 0, 0.3, 0));
  g.add(at(cyl(1.1, 1.45, 4.6, stone, 12), 0, 2.9, 0));
  g.add(at(cyl(1.45, 1.2, 0.5, gold, 12), 0, 5.4, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(at(box(0.4, 0.6, 0.4, stone), Math.cos(a) * 1.25, 5.9, Math.sin(a) * 1.25));
  }
  const crystal = oct(0.6, mat(0x8fd0ff, { e: 0x3a8aff, ei: 1.5, r: 0.1 }));
  at(crystal, 0, 7.0, 0);
  g.add(crystal);
  g.add(at(torus(0.85, 0.06, gold), 0, 7.0, 0, Math.PI / 2));
  return { group: g, parts: {}, extra: { crystal, gemY: 7.0 } };
}

function buildRedTower() {
  const g = new THREE.Group();
  const obs = mat(0x3a2c48, { r: 0.35, m: 0.3, flat: true, e: 0x200010, ei: 1 });
  const red = mat(0xff2a3a, { e: 0xff0020, ei: 1.8 });
  g.add(at(cyl(1.8, 2.1, 0.6, obs, 7), 0, 0.3, 0));
  g.add(at(cyl(0.9, 1.5, 4.8, obs, 7), 0, 3.0, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(at(cone(0.3, 2.2, obs, 5), Math.cos(a) * 1.0, 5.6, Math.sin(a) * 1.0, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4));
  }
  const crystal = oct(0.6, red);
  at(crystal, 0, 6.6, 0);
  g.add(crystal);
  // venas brillantes
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    g.add(at(box(0.08, 4.0, 0.08, red), Math.cos(a) * 1.18, 2.8, Math.sin(a) * 1.18, 0, 0, -Math.cos(a) * 0.12));
  }
  return { group: g, parts: {}, extra: { crystal, gemY: 6.6 } };
}

function zugriBannerTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 192);
  x.strokeStyle = '#d9a92c'; x.lineWidth = 10; x.strokeRect(5, 5, 118, 182);
  // flor de lis estilizada dorada perfilada en violeta
  x.save();
  x.translate(64, 96);
  x.fillStyle = '#e8b830'; x.strokeStyle = '#6a3aa0'; x.lineWidth = 4;
  const petal = (sx) => {
    x.beginPath();
    x.moveTo(0, 10);
    x.bezierCurveTo(sx * 10, -10, sx * 40, -10, sx * 36, -40);
    x.bezierCurveTo(sx * 26, -26, sx * 12, -20, sx * 6, 4);
    x.closePath(); x.fill(); x.stroke();
  };
  petal(1); petal(-1);
  x.beginPath();
  x.moveTo(0, -62); x.bezierCurveTo(16, -40, 14, -10, 0, 12); x.bezierCurveTo(-14, -10, -16, -40, 0, -62);
  x.fill(); x.stroke();
  x.fillRect(-26, 10, 52, 10); x.strokeRect(-26, 10, 52, 10);
  x.beginPath(); x.moveTo(-8, 20); x.lineTo(0, 46); x.lineTo(8, 20); x.closePath(); x.fill(); x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildBlueNexus() {
  const g = new THREE.Group();
  const stone = mat(0xf1eee4, { r: 0.85 });
  const gold = mat(0xe0b33c, { m: 0.8, r: 0.3 });
  const roof = mat(0x3a5fbf, { r: 0.5 });
  g.add(at(cyl(3.2, 3.6, 0.8, stone, 16), 0, 0.4, 0));
  g.add(at(cyl(1.8, 2.2, 8, stone, 16), 0, 4.8, 0));
  g.add(at(cyl(2.3, 2.3, 0.5, gold, 16), 0, 8.9, 0));
  g.add(at(cone(2.3, 3.5, roof, 16), 0, 10.9, 0));
  g.add(at(sph(0.3, gold, 10), 0, 12.8, 0));
  // ventanas
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(at(box(0.5, 1.0, 0.2, mat(0x4a6ad0, { e: 0x2040a0, ei: 0.8 })), Math.cos(a) * 1.95, 6.2, Math.sin(a) * 1.95, 0, -a + Math.PI / 2, 0));
  }
  // estandartes de Zugri
  const bannerMat = new THREE.MeshStandardMaterial({ map: zugriBannerTexture(), side: THREE.DoubleSide, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const pole = at(cyl(0.07, 0.07, 6, gold, 6), 2.6 * s, 3, 2.6);
    const flag = new THREE.Mesh(geo('flagPlane', () => new THREE.PlaneGeometry(1.4, 2.1)), bannerMat);
    at(flag, 2.6 * s, 4.6, 2.62);
    g.add(pole, flag);
  }
  const crystal = oct(0.9, mat(0x8fd0ff, { e: 0x3a8aff, ei: 1.8 }));
  at(crystal, 0, 14.2, 0);
  g.add(crystal);
  return { group: g, parts: {}, extra: { crystal, gemY: 14.2 } };
}

function buildLorik() {
  // Santuario corrompido + Lorik flotando encima
  const g = new THREE.Group();
  const obs = mat(0x1a1420, { r: 0.4, m: 0.3, flat: true });
  const violet = mat(0x8a2aff, { e: 0x5a10c0, ei: 1.6 });
  g.add(at(cyl(3.4, 3.9, 1.0, obs, 8), 0, 0.5, 0));
  g.add(at(cyl(2.6, 3.0, 0.6, obs, 8), 0, 1.3, 0));
  // raíces corrompidas
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = cyl(0.18, 0.35, 3.2, mat(0x2a1a2a, { r: 0.9 }), 6);
    at(r, Math.cos(a) * 3.3, 0.6, Math.sin(a) * 3.3, Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    g.add(r);
  }
  g.add(at(torus(3.0, 0.08, violet), 0, 1.65, 0, Math.PI / 2));

  const lorik = new THREE.Group();
  const goldA = mat(0xd9a520, { m: 0.9, r: 0.25 });
  const darkGold = mat(0x7a5a10, { m: 0.9, r: 0.3 });
  const gem = mat(0x3a7aff, { e: 0x1a4aff, ei: 2 });
  const h = humanoid({ skin: mat(0x3a2a3a), legs: darkGold, torso: goldA, arms: goldA, boots: darkGold, scale: 1.9,
    eyeMat: mat(0x9a5aff, { e: 0x7a2aff, ei: 2.5 }) });
  const p = h.parts;
  p.body.add(at(cyl(0.3, 0.55, 0.9, darkGold, 12), 0, 0.75, 0));
  p.body.add(at(oct(0.12, gem), 0, 1.35, 0.3));
  p.body.add(at(sph(0.18, goldA, 10), -0.42, 1.6, 0));
  p.body.add(at(sph(0.18, goldA, 10), 0.42, 1.6, 0));
  p.head.add(at(cone(0.24, 0.5, goldA, 8), 0, 0.3, 0));
  p.head.add(at(oct(0.06, gem), 0, 0.12, 0.2));
  // alas metálicas
  const wingM = mat(0xc9a03a, { m: 0.9, r: 0.3, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const f = box(0.12, 1.3 - i * 0.18, 0.04, wingM);
      at(f, s * (0.35 + i * 0.25), 1.75 + i * 0.12, -0.3, 0, 0, -s * (0.6 + i * 0.25));
      p.body.add(f);
    }
  }
  // báculo druídico corrompido
  const staff = new THREE.Group();
  staff.add(at(cyl(0.04, 0.05, 1.8, mat(0x2a1a2a), 6), 0, 0.5, 0));
  staff.add(at(oct(0.16, violet), 0, 1.45, 0));
  at(staff, 0, 0, 0.05, Math.PI / 2.6, 0, 0);
  p.handR.add(staff);
  lorik.add(h.group);
  at(lorik, 0, 1.6, 0);
  lorik.rotation.y = -Math.PI / 2; // mira hacia el equipo azul
  g.add(lorik);
  // rayos a su alrededor
  const bolts = new THREE.Group();
  const boltMat = new THREE.LineBasicMaterial({ color: 0x9ab8ff });
  for (let i = 0; i < 4; i++) {
    const pts = [];
    for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3((Math.random() - 0.5) * 0.6, k * 0.7, (Math.random() - 0.5) * 0.6));
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), boltMat);
    const a = (i / 4) * Math.PI * 2;
    at(l, Math.cos(a) * 2.2, 2.2, Math.sin(a) * 2.2);
    bolts.add(l);
  }
  g.add(bolts);
  return { group: g, parts: h.parts, extra: { lorik, bolts, gemY: 6.5, crystal: null } };
}

// --- API PÚBLICA -------------------------------------------------------------------

const HERO_BUILDERS = { josephine: buildJosephine, fotsor: buildFotsor, yeslie: buildYeslie, astrid: buildAstrid };

export function buildHeroModel(id, corrupted, glb) {
  const m = HERO_BUILDERS[id]();
  if (corrupted) corrupt(m.group);
  if (glb) upgradeToGLB(m, glb, corrupted);
  return m;
}

// --- Modelos GLB animados -----------------------------------------------------
// El héroe aparece con su modelo de formas básicas y, cuando termina de cargar el
// .glb, este lo sustituye dentro del mismo grupo (así la posición, el giro, la
// muerte y la forma de dragón siguen funcionando igual). Si falla la carga, se
// queda el modelo básico.
const loader = new GLTFLoader();
const glbCache = new Map();

function loadGLB(spec) {
  if (!glbCache.has(spec.url)) {
    glbCache.set(spec.url, loader.loadAsync(spec.url).then((gltf) => {
      // tintes por nombre de material (se aplican una sola vez al original)
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        const t = spec.tint?.[o.material.name];
        if (t) {
          o.material = o.material.clone();
          o.material.color.set(t.color ?? o.material.color);
          if (t.emissive !== undefined) { o.material.emissive.set(t.emissive); o.material.emissiveIntensity = t.ei ?? 1; }
          if (t.r !== undefined) o.material.roughness = t.r;
          if (t.m !== undefined) o.material.metalness = t.m;
        }
      });
      // escala para que mida lo mismo que los modelos básicos
      // (medida precisa: aplica la piel sobre el esqueleto, si no los modelos con
      // huesos escalados salen de un tamaño absurdo)
      gltf.scene.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(gltf.scene, true).getSize(new THREE.Vector3());
      gltf.fit = (spec.height ?? 2.2) / size.y;
      return gltf;
    }));
  }
  return glbCache.get(spec.url);
}

function upgradeToGLB(m, spec, corrupted) {
  loadGLB(spec).then((gltf) => {
    const root = SkeletonUtils.clone(gltf.scene);
    root.scale.setScalar(gltf.fit);
    root.rotation.y = spec.rotY ?? 0;
    if (corrupted) corrupt(root);
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const [state, clipName] of Object.entries(spec.anims)) {
      const clip = THREE.AnimationClip.findByName(gltf.animations, clipName);
      if (clip) actions[state] = mixer.clipAction(clip);
    }
    for (const k of ['attack', 'death']) {
      if (!actions[k]) continue;
      actions[k].setLoop(THREE.LoopOnce, 1);
      actions[k].clampWhenFinished = true;
    }
    // piezas del modelo básico que se conservan (p. ej. las llamas de Fotsor)
    // ('pos' y 'scale' van en unidades del juego; se compensa la escala del hueso)
    root.updateMatrixWorld(true);
    const bs = new THREE.Vector3();
    for (const a of spec.keep ?? []) {
      const part = m.extra?.[a.part];
      const bone = root.getObjectByName(a.bone);
      if (!part || !bone) continue;
      bone.getWorldScale(bs);
      bone.add(part);
      part.position.fromArray(a.pos ?? [0, 0, 0]).divideScalar(bs.x);
      part.scale.setScalar((a.scale ?? 1) / bs.x);
    }
    m.parts.body.visible = false;
    m.group.add(root);
    m.glb = { root, mixer, actions, current: null, lastT: null, prevAttack: 0, spec };
    play(m.glb, 'idle', 0);
  }).catch((e) => console.warn('No se pudo cargar el modelo', spec.url, e));
}

function play(g, state, fade = 0.2) {
  const next = g.actions[state] ?? g.actions.idle;
  if (!next || g.current === next) return;
  next.reset().setEffectiveWeight(1).fadeIn(fade).play();
  if (g.current) g.current.fadeOut(fade);
  g.current = next;
}

function animateGLB(m, t, moving, attackT, dead) {
  const g = m.glb;
  const dt = g.lastT === null ? 0 : Math.max(0, Math.min(0.1, t - g.lastT));
  g.lastT = t;
  if (dead) {
    play(g, 'death', 0.1);
  } else if (attackT > 0) {
    // cada ataque nuevo reinicia el golpe, acelerado para que dure lo que el ataque
    if (!(g.prevAttack > 0) && g.actions.attack) {
      const a = g.actions.attack;
      a.timeScale = a.getClip().duration / (g.spec.attackTime ?? 0.45);
      if (g.current === a) a.reset();
      else play(g, 'attack', 0.06);
    }
  } else if (g.current !== g.actions.attack || !g.current.isRunning()) {
    play(g, moving ? 'walk' : 'idle');
  }
  g.prevAttack = attackT;
  g.mixer.update(dt);
}

export function buildMinionModel(team, type) {
  if (team === 'blue') return type === 'melee' ? buildBlueMelee() : buildBlueRanged();
  return type === 'melee' ? buildRedMelee() : buildRedRanged();
}

export function buildStructureModel(team, kind) {
  if (kind === 'tower') return team === 'blue' ? buildBlueTower() : buildRedTower();
  if (kind === 'nexus') return buildBlueNexus();
  return buildLorik();
}

// Versión "corrompida" de un héroe: tonos oscuros y violáceos con brillo rojo.
const corruptCache = new Map();
const VOID = new THREE.Color(0x3a1050);
export function corrupt(group) {
  group.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
    const src = o.material;
    if (!corruptCache.has(src)) {
      const m = src.clone();
      m.color = src.color.clone().lerp(VOID, 0.55).multiplyScalar(0.8);
      if (src.emissive.getHex() !== 0) {
        m.emissive = new THREE.Color(0xff2040);
      } else {
        m.emissive = new THREE.Color(0x2a0010);
        m.emissiveIntensity = 0.6;
      }
      corruptCache.set(src, m);
    }
    o.material = corruptCache.get(src);
  });
}

// Animación genérica de caminar / atacar
export function animateModel(m, t, moving, attackT, speed = 1, dead = false) {
  if (m.glb) return animateGLB(m, t, moving, attackT, dead);
  const p = m.parts;
  if (!p || !p.legL) return;
  const w = moving ? Math.sin(t * 11 * speed) : 0;
  p.legL.rotation.x = w * 0.6;
  p.legR.rotation.x = -w * 0.6;
  p.armL.rotation.x = -w * 0.45;
  if (attackT > 0) {
    const k = Math.sin(Math.min(1, attackT) * Math.PI);
    p.armR.rotation.x = -1.7 * k;
  } else {
    p.armR.rotation.x = w * 0.45;
  }
  p.body.position.y = moving ? Math.abs(Math.sin(t * 11 * speed)) * 0.06 : Math.sin(t * 2) * 0.015;
  if (p.wingL) {
    p.wingL.rotation.z = Math.sin(t * 6) * 0.35;
    p.wingR.rotation.z = -Math.sin(t * 6) * 0.35;
  }
}

// --- MUNDO -----------------------------------------------------------------------

function groundTexture() {
  const W = 2048, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  // gradiente: bosque de Zugri (verde) -> tierra de ceniza (gris violáceo)
  const gr = x.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, '#3f6b34');
  gr.addColorStop(0.42, '#557a3a');
  gr.addColorStop(0.55, '#5f5a46');
  gr.addColorStop(0.68, '#3c3540');
  gr.addColorStop(1, '#2a2230');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  // ruido
  for (let i = 0; i < 9000; i++) {
    const px = Math.random() * W, py = Math.random() * H;
    const t = px / W;
    x.fillStyle = t < 0.5 ? `rgba(${30 + Math.random() * 40},${70 + Math.random() * 60},${20 + Math.random() * 30},0.35)`
      : `rgba(${50 + Math.random() * 40},${40 + Math.random() * 30},${50 + Math.random() * 40},0.35)`;
    x.globalAlpha = 0.5;
    x.fillRect(px, py, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
    x.globalAlpha = 1;
  }
  // camino del carril (z en [-11,11] de un total de [-40,40] -> H)
  const laneH = H * (22 / 80);
  const lg = x.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(176,150,110,0.85)');
  lg.addColorStop(0.5, 'rgba(150,128,96,0.85)');
  lg.addColorStop(1, 'rgba(90,70,80,0.85)');
  x.fillStyle = lg;
  x.fillRect(0, H / 2 - laneH / 2, W, laneH);
  for (let i = 0; i < 4000; i++) {
    const px = Math.random() * W, py = H / 2 - laneH / 2 + Math.random() * laneH;
    x.fillStyle = `rgba(${90 + Math.random() * 60},${80 + Math.random() * 50},${60 + Math.random() * 40},0.4)`;
    x.globalAlpha = 0.5; x.fillRect(px, py, 2, 2); x.globalAlpha = 1;
  }
  // bordes del camino
  x.strokeStyle = 'rgba(60,45,30,0.5)'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(0, H / 2 - laneH / 2); x.lineTo(W, H / 2 - laneH / 2); x.stroke();
  x.beginPath(); x.moveTo(0, H / 2 + laneH / 2); x.lineTo(W, H / 2 + laneH / 2); x.stroke();
  // grietas de lava en el lado rojo
  x.strokeStyle = 'rgba(255,80,40,0.35)'; x.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    let px = W * (0.62 + Math.random() * 0.38), py = Math.random() * H;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 6; k++) { px += (Math.random() - 0.3) * 40; py += (Math.random() - 0.5) * 40; x.lineTo(px, py); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildWorld(scene) {
  // Suelo: 240 x 80 (x de -120 a 120, z de -40 a 40)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 80), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Suelo exterior
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), new THREE.MeshStandardMaterial({ color: 0x23301f, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05;
  scene.add(outer);

  const rnd = mulberry32(7);
  const trunk = mat(0x5a3a22, { r: 0.9 });
  const leaves = [mat(0x2f6b2a, { flat: true }), mat(0x3d7d33, { flat: true }), mat(0x4a8a3a, { flat: true })];
  const deadM = mat(0x2a2028, { r: 0.9 });
  const crystalM = mat(0x9a3aff, { e: 0x6010c0, ei: 1.2, flat: true });
  const rockM = mat(0x6a6a70, { flat: true, r: 0.95 });
  const ashRock = mat(0x2e2a32, { flat: true, r: 0.9 });

  const deco = new THREE.Group();
  for (let i = 0; i < 260; i++) {
    const x = -118 + rnd() * 236;
    const side = rnd() < 0.5 ? -1 : 1;
    const z = side * (13.5 + rnd() * 25);
    if (Math.abs(x) > 110 && Math.abs(z) < 20) continue;
    const t = (x + 118) / 236;
    const redSide = t > 0.6 + (rnd() - 0.5) * 0.1;
    const o = new THREE.Group();
    if (!redSide) {
      if (rnd() < 0.8) {
        const s = 0.8 + rnd() * 0.9;
        o.add(at(cyl(0.18 * s, 0.28 * s, 1.6 * s, trunk, 6), 0, 0.8 * s, 0));
        const lm = leaves[(rnd() * 3) | 0];
        if (rnd() < 0.5) {
          o.add(at(cone(1.3 * s, 2.4 * s, lm, 7), 0, 2.4 * s, 0));
          o.add(at(cone(1.0 * s, 2.0 * s, lm, 7), 0, 3.4 * s, 0));
        } else {
          o.add(at(sph(1.3 * s, lm, 7), 0, 2.5 * s, 0));
        }
      } else {
        o.add(at(oct(0.6 + rnd() * 0.8, rockM), 0, 0.3, 0));
      }
    } else {
      const r = rnd();
      if (r < 0.45) {
        const s = 0.8 + rnd() * 0.8;
        o.add(at(cyl(0.12 * s, 0.25 * s, 2.6 * s, deadM, 5), 0, 1.3 * s, 0, 0, 0, (rnd() - 0.5) * 0.3));
        o.add(at(cyl(0.06 * s, 0.1 * s, 1.2 * s, deadM, 4), 0.35 * s, 2.2 * s, 0, 0, 0, -0.9));
        o.add(at(cyl(0.06 * s, 0.1 * s, 1.0 * s, deadM, 4), -0.3 * s, 1.8 * s, 0, 0, 0, 0.8));
      } else if (r < 0.75) {
        const s = 0.6 + rnd() * 1.0;
        o.add(at(oct(0.5 * s, crystalM), 0, 0.6 * s, 0, 0, 0, 0.2));
        o.add(at(oct(0.3 * s, crystalM), 0.5 * s, 0.35 * s, 0.2, 0.4, 0, 0.6));
      } else {
        o.add(at(oct(0.7 + rnd() * 0.9, ashRock), 0, 0.3, 0));
      }
    }
    o.position.set(x, 0, z);
    o.rotation.y = rnd() * Math.PI * 2;
    o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    deco.add(o);
  }
  scene.add(deco);

  // Fuentes (bases)
  const blueFount = new THREE.Group();
  blueFount.add(at(cyl(7.5, 7.8, 0.3, mat(0xe9e6dc, { r: 0.9 }), 32), 0, 0.15, 0));
  blueFount.add(at(cyl(5.5, 5.5, 0.32, mat(0x5ab0ff, { e: 0x2060c0, ei: 0.6, r: 0.1, m: 0.3 }), 32), 0, 0.17, 0));
  blueFount.position.set(-96, 0, 0);
  const redFount = new THREE.Group();
  redFount.add(at(cyl(7.5, 7.8, 0.3, mat(0x1e1622, { r: 0.5, flat: true }), 9), 0, 0.15, 0));
  redFount.add(at(cyl(5.5, 5.5, 0.32, mat(0xff3a5a, { e: 0xa01030, ei: 0.8 }), 9), 0, 0.17, 0));
  redFount.position.set(96, 0, 0);
  scene.add(blueFount, redFount);
  for (const g of [blueFount, redFount]) g.traverse((c) => { if (c.isMesh) c.receiveShadow = true; });
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
