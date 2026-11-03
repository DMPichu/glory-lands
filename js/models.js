// Modelos 3D construidos con formas básicas (sin recursos externos).
// Todos los diseños son originales y solo se inspiran en las descripciones del lore.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MAP, LANES, LAYOUT, MODEL_GLB } from './config.js';
import { distToLanes, laneLength, lanePoint } from './map.js';

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

function buildKouji() {
  const skin = mat(0xe8c4a0);
  const leather = mat(0x6a4a2e, { r: 0.85 });
  const cape = mat(0x7a5634, { side: THREE.DoubleSide, r: 0.9 });
  const capeIn = mat(0xe8d8b0, { side: THREE.DoubleSide });
  const sash = mat(0xe8b830);
  const hair = mat(0x5a3a22, { r: 0.7 });
  const arcane = mat(0x6ff6ff, { e: 0x20d0ff, ei: 1.8, r: 0.2 });
  const h = humanoid({ skin, legs: leather, torso: mat(0x3a4a3a), arms: leather, boots: mat(0x3a2414, { r: 0.9 }), scale: 1.02,
    eyeMat: mat(0x8a9098) });
  const p = h.parts;
  p.body.add(at(cyl(0.31, 0.31, 0.12, sash, 12), 0, 1.0, 0));
  // capa larga con cuello de piel y forro de hojas otoñales
  const c1 = mesh(geo('kouCape', () => new THREE.PlaneGeometry(0.85, 1.35)), cape);
  at(c1, 0, 1.0, -0.26, 0.1, 0, 0);
  const c2 = mesh(geo('kouCapeIn', () => new THREE.PlaneGeometry(0.8, 1.3)), capeIn);
  at(c2, 0, 1.0, -0.25, 0.1, Math.PI, 0);
  p.body.add(c1, c2);
  p.body.add(at(torus(0.3, 0.09, mat(0x8a6a4a, { r: 1 })), 0, 1.6, 0, Math.PI / 2));
  // moño y barba
  p.head.add(at(sph(0.23, hair, 12), 0, 0.07, -0.06));
  p.head.add(at(sph(0.1, hair, 8), 0, 0.27, -0.12));
  p.head.add(at(box(0.3, 0.14, 0.12, hair), 0, -0.15, 0.13));
  // carcaj con flechas de pluma de fuego
  const quiver = new THREE.Group();
  quiver.add(at(cyl(0.09, 0.08, 0.7, leather, 8), 0, 0, 0));
  const fire = mat(0xff7a1a, { e: 0xff5a00, ei: 1.6 });
  for (let i = 0; i < 4; i++) quiver.add(at(cone(0.04, 0.16, fire, 4), (i % 2 - 0.5) * 0.06, 0.42, (i > 1 ? 0.03 : -0.03)));
  at(quiver, 0.18, 1.35, -0.3, 0.3, 0, -0.35);
  p.body.add(quiver);
  // arco arcano que brilla en cian (mano izquierda)
  const bow = new THREE.Group();
  bow.add(at(torus(0.62, 0.035, arcane, Math.PI * 0.9), 0, 0, 0, 0, Math.PI / 2, Math.PI * 0.55));
  bow.add(at(cyl(0.006, 0.006, 1.2, mat(0xffffff, { e: 0xaaffff, ei: 1 }), 3), 0, 0, -0.15));
  at(bow, 0, -0.1, 0.2, Math.PI / 2, 0, 0);
  p.handL.add(bow);
  // broche morado y parche de la Orden
  p.body.add(at(sph(0.05, mat(0x8a3aff, { e: 0x5a1ad0, ei: 0.8 }), 8), -0.18, 1.5, 0.27));
  p.armL.add(at(box(0.14, 0.14, 0.03, mat(0xb02020)), -0.11, -0.2, 0));
  return { ...h, extra: { bow } };
}

function buildGrimdarkus() {
  const plate = mat(0x2a2c34, { m: 0.8, r: 0.35 });
  const grey = mat(0x6a6e7a, { m: 0.8, r: 0.3 });
  const capeM = mat(0xe8e2d4, { side: THREE.DoubleSide, r: 0.9 });
  const eye = mat(0x9fb0ff, { e: 0x5a7aff, ei: 2 });
  const h = humanoid({ skin: plate, legs: plate, torso: plate, arms: plate, boots: grey, limbR: 0.14, eyes: false, scale: 1.15 });
  const p = h.parts;
  p.body.add(at(cyl(0.38, 0.3, 0.7, plate, 10), 0, 1.25, 0));
  p.body.add(at(box(0.4, 0.3, 0.06, grey), 0, 1.35, 0.33));
  // hombreras grandes
  for (const s of [-1, 1]) {
    p.body.add(at(sph(0.22, grey, 10), s * 0.45, 1.6, 0));
    p.body.add(at(cone(0.06, 0.25, grey, 6), s * 0.55, 1.78, 0, 0, 0, -s * 0.5));
  }
  // yelmo cerrado con un cuerno curvo
  p.head.add(at(sph(0.26, plate, 12), 0, 0.02, 0));
  p.head.add(at(box(0.3, 0.05, 0.05, eye), 0, 0.03, 0.23));
  const horn = torus(0.22, 0.05, mat(0xd8d0c0, { r: 0.5 }), Math.PI * 0.9);
  at(horn, 0.16, 0.25, 0, 0, Math.PI / 2, 0.2);
  p.head.add(horn);
  // capa clara
  const c = mesh(geo('griCape', () => new THREE.PlaneGeometry(0.9, 1.45)), capeM);
  at(c, 0, 0.98, -0.3, 0.12, 0, 0);
  p.body.add(c);
  // maza oscura
  const mace = new THREE.Group();
  mace.add(at(cyl(0.04, 0.04, 0.9, grey, 6), 0, 0.3, 0));
  mace.add(at(oct(0.17, plate), 0, 0.8, 0));
  at(mace, 0, 0, 0.05, Math.PI / 2.3, 0, 0);
  p.handR.add(mace);
  // el cubo azul de Lucavi flotando junto a él
  const cube = box(0.26, 0.26, 0.26, mat(0x5aa8ff, { e: 0x2a6aff, ei: 2, r: 0.1, m: 0.3 }));
  cube.castShadow = false;
  at(cube, -0.7, 2.0, 0.2, 0.6, 0, 0.6);
  p.body.add(cube);
  return { ...h, extra: { spin: [cube] } };
}

function buildIkaruus() {
  const skin = mat(0xf2d6c2);
  const hair = mat(0xc8202a, { r: 0.55 });
  const kimono = mat(0xf2ece4);
  const red = mat(0xa81a28);
  const dark = mat(0x1a1420);
  const h = humanoid({ skin, legs: dark, torso: kimono, arms: kimono, boots: dark, scale: 1.0,
    eyeMat: mat(0xff3040, { e: 0xff1020, ei: 1.4 }) });
  const p = h.parts;
  // hakama y obi
  p.body.add(at(cyl(0.24, 0.42, 0.7, dark, 12), 0, 0.62, 0));
  p.body.add(at(cyl(0.31, 0.31, 0.14, red, 12), 0, 1.0, 0));
  p.body.add(at(box(0.08, 0.6, 0.04, red), 0.1, 1.3, 0.27, 0, 0, 0.5));
  // pelo rojo con coleta larga
  p.head.add(at(sph(0.235, hair, 12), 0, 0.07, -0.05));
  p.head.add(at(cyl(0.07, 0.03, 0.9, hair, 6), 0, -0.25, -0.26, 0.25));
  p.head.add(at(box(0.36, 0.1, 0.12, hair), 0, 0.17, 0.12, 0.3));
  // orejas de semielfo
  p.head.add(at(cone(0.04, 0.16, skin, 4), -0.23, 0.04, 0, 0, 0, 1.3));
  p.head.add(at(cone(0.04, 0.16, skin, 4), 0.23, 0.04, 0, 0, 0, -1.3));
  // katana de hoja pálida
  const katana = new THREE.Group();
  katana.add(at(box(0.04, 1.15, 0.012, mat(0xeef4ff, { m: 0.95, r: 0.1, e: 0x6a8aff, ei: 0.35 })), 0, 0.68, 0));
  katana.add(at(cyl(0.07, 0.07, 0.03, mat(0xd8b040, { m: 0.8 }), 10), 0, 0.1, 0));
  katana.add(at(cyl(0.03, 0.03, 0.24, red, 6), 0, -0.04, 0));
  at(katana, 0, -0.02, 0.05, Math.PI / 2, 0, 0);
  p.handR.add(katana);
  // vaina a la cintura
  p.body.add(at(cyl(0.035, 0.03, 1.0, dark, 6), -0.3, 0.95, -0.05, 0.3, 0, 1.2));
  return { ...h, extra: { katana } };
}

function buildCrixus() {
  const armor = mat(0x23302a, { m: 0.75, r: 0.4 });
  const trim = mat(0x4a5a50, { m: 0.8, r: 0.35 });
  const necro = mat(0x5fd38a, { e: 0x20c060, ei: 2 });
  const flame = mat(0xff7a30, { e: 0xff5a10, ei: 2 });
  const capeM = mat(0x161a18, { side: THREE.DoubleSide, r: 1 });
  const h = humanoid({ skin: armor, legs: armor, torso: armor, arms: armor, boots: trim, limbR: 0.13, eyes: false, scale: 1.1 });
  const p = h.parts;
  p.body.add(at(cyl(0.36, 0.28, 0.72, armor, 10), 0, 1.25, 0));
  // grietas de necrosis que brillan
  p.body.add(at(box(0.05, 0.5, 0.03, necro), 0.08, 1.25, 0.34, 0, 0, 0.3));
  p.body.add(at(box(0.04, 0.3, 0.03, necro), -0.12, 1.32, 0.33, 0, 0, -0.5));
  for (const s of [-1, 1]) {
    p.body.add(at(sph(0.2, trim, 8), s * 0.43, 1.6, 0));
    p.body.add(at(cone(0.05, 0.3, trim, 5), s * 0.5, 1.82, -0.05, -0.2, 0, -s * 0.3));
  }
  // yelmo con ojos verdes
  p.head.add(at(sph(0.25, armor, 10), 0, 0.02, 0));
  p.head.add(at(sph(0.04, necro, 6), -0.08, 0.04, 0.22));
  p.head.add(at(sph(0.04, necro, 6), 0.08, 0.04, 0.22));
  p.head.add(at(box(0.04, 0.28, 0.2, trim), 0, 0.25, -0.02));
  // capa hecha jirones
  const c = mesh(geo('criCape', () => new THREE.PlaneGeometry(0.85, 1.4, 1, 3)), capeM);
  at(c, 0, 0.98, -0.3, 0.12, 0, 0);
  p.body.add(c);
  // Lady Evangeline: espadón de fuego y necrosis
  const sword = new THREE.Group();
  sword.add(at(box(0.11, 1.3, 0.03, mat(0x2a2a2a, { m: 0.9, r: 0.3 })), 0, 0.78, 0));
  sword.add(at(box(0.03, 1.2, 0.035, necro), 0.035, 0.8, 0));
  sword.add(at(box(0.03, 1.2, 0.035, flame), -0.035, 0.8, 0));
  sword.add(at(box(0.36, 0.06, 0.07, trim), 0, 0.12, 0));
  at(sword, 0, -0.02, 0.05, Math.PI / 2, 0, 0);
  p.handR.add(sword);
  return { ...h, extra: { sword } };
}

function buildLegna() {
  const skin = mat(0xf0d2b8);
  const robe = mat(0xf6f4ee);
  const gold = mat(0xe0b33c, { m: 0.85, r: 0.3 });
  const stole = mat(0x3a6fe0);
  const hair = mat(0x8a5a30, { r: 0.6 });
  const light = mat(0xfff2a0, { e: 0xffd040, ei: 2 });
  const h = humanoid({ skin, legs: robe, torso: robe, arms: robe, boots: mat(0xc8b088), scale: 0.97 });
  const p = h.parts;
  p.body.add(at(cyl(0.24, 0.48, 1.0, robe, 12), 0, 0.62, 0));
  p.body.add(at(cyl(0.485, 0.49, 0.06, gold, 12), 0, 0.14, 0));
  // estola azul con bordes dorados
  p.body.add(at(box(0.09, 0.9, 0.03, stole), -0.1, 1.15, 0.27));
  p.body.add(at(box(0.09, 0.9, 0.03, stole), 0.1, 1.15, 0.27));
  p.head.add(at(sph(0.235, hair, 12), 0, 0.08, -0.06));
  // disco solar de Astora flotando a su espalda
  const sun = new THREE.Group();
  sun.add(torus(0.32, 0.03, gold));
  sun.add(at(cyl(0.16, 0.16, 0.03, light, 16), 0, 0, 0, Math.PI / 2));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    sun.add(at(box(0.04, 0.14, 0.02, gold), Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0, 0, 0, a + Math.PI / 2));
  }
  at(sun, 0, 1.95, -0.32);
  p.body.add(sun);
  // báculo con luz
  const staff = new THREE.Group();
  staff.add(at(cyl(0.03, 0.03, 1.6, gold, 6), 0, 0.5, 0));
  staff.add(at(torus(0.12, 0.025, gold), 0, 1.38, 0));
  staff.add(at(sph(0.08, light, 8), 0, 1.38, 0));
  at(staff, 0, 0, 0.05, Math.PI / 2.4, 0, 0);
  p.handR.add(staff);
  return { ...h, extra: { wheel: sun } };
}

function buildCatarina() {
  const skin = mat(0xf6e6e0);
  const armor = mat(0xcfe0f2, { m: 0.7, r: 0.25 });
  const dark = mat(0x2a4a7a, { m: 0.4, r: 0.4 });
  const hair = mat(0xe8f0ff, { r: 0.45 });
  const ice = mat(0xbfeaff, { e: 0x5ac0ff, ei: 1.2, r: 0.05, m: 0.1, op: 0.85 });
  const h = humanoid({ skin, legs: dark, torso: armor, arms: armor, boots: armor, scale: 1.0,
    eyeMat: mat(0x6ac8ff, { e: 0x3aa8ff, ei: 1 }) });
  const p = h.parts;
  // falda armada y capa
  p.body.add(at(cyl(0.24, 0.5, 0.75, dark, 12), 0, 0.72, 0));
  p.body.add(at(cyl(0.505, 0.51, 0.06, armor, 12), 0, 0.35, 0));
  const c = mesh(geo('catCape', () => new THREE.PlaneGeometry(0.85, 1.4)), mat(0xf4f8ff, { side: THREE.DoubleSide }));
  at(c, 0, 0.98, -0.28, 0.1, 0, 0);
  p.body.add(c);
  p.body.add(at(sph(0.16, armor, 10), -0.4, 1.58, 0));
  p.body.add(at(sph(0.16, armor, 10), 0.4, 1.58, 0));
  // pelo plateado con trenza y corona de hielo
  p.head.add(at(sph(0.24, hair, 12), 0, 0.08, -0.07));
  p.head.add(at(cyl(0.06, 0.03, 0.75, hair, 6), 0, -0.3, -0.24, 0.2));
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    p.head.add(at(cone(0.04, 0.2 + (i === 2 ? 0.1 : 0), ice, 4), Math.sin(a) * 0.2, 0.25, Math.cos(a) * 0.12));
  }
  // espada de hielo translúcida
  const sword = new THREE.Group();
  sword.add(at(box(0.08, 1.05, 0.02, ice), 0, 0.62, 0));
  sword.add(at(cone(0.04, 0.2, ice, 4), 0, 1.24, 0));
  sword.add(at(box(0.28, 0.05, 0.06, armor), 0, 0.08, 0));
  at(sword, 0, -0.02, 0.05, Math.PI / 2, 0, 0);
  p.handR.add(sword);
  return { ...h, extra: { sword } };
}

// Caballero negro de la Legión de Aurane (invocado por Grimdarkus)
export function buildKnight() {
  const plate = mat(0x1e2028, { m: 0.8, r: 0.35 });
  const eye = mat(0x9fb0ff, { e: 0x5a7aff, ei: 2 });
  const h = humanoid({ skin: plate, legs: plate, torso: plate, arms: plate, boots: plate, eyes: false, scale: 1.0 });
  const p = h.parts;
  p.head.add(at(box(0.22, 0.04, 0.04, eye), 0, 0.03, 0.22));
  p.armL.add(at(box(0.5, 0.75, 0.07, mat(0x2a2c3a, { m: 0.7, r: 0.4 })), -0.05, -0.4, 0.18));
  const spear = new THREE.Group();
  spear.add(at(cyl(0.03, 0.03, 1.8, plate, 6), 0, 0.5, 0));
  spear.add(at(cone(0.08, 0.3, mat(0x8a90a0, { m: 0.9 }), 6), 0, 1.5, 0));
  at(spear, 0, 0, 0.05, Math.PI / 2.4, 0, 0);
  p.handR.add(spear);
  p.armR.rotation.x = -0.6;
  h.group.scale.setScalar(1.3);
  return h.group;
}

// --- API PÚBLICA -------------------------------------------------------------------

const HERO_BUILDERS = {
  josephine: buildJosephine, fotsor: buildFotsor, yeslie: buildYeslie, astrid: buildAstrid,
  kouji: buildKouji, grimdarkus: buildGrimdarkus, ikaruus: buildIkaruus, crixus: buildCrixus, legna: buildLegna, catarina: buildCatarina,
};

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
// modelos que han cargado bien (para la autoprueba)
export const loadedGLB = new Set();
export const failedGLB = new Map();

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
    // se esconde el modelo básico (los héroes y súbditos tienen 'body'; las
    // estructuras no, así que se esconden todas sus piezas)
    if (m.parts?.body) m.parts.body.visible = false;
    else for (const c of m.group.children) if (!spec.keep?.some((a) => m.extra?.[a.part] === c)) c.visible = false;
    if (m.extra) m.extra.crystal = null;
    m.group.add(root);
    m.glb = { root, mixer, actions, current: null, lastT: null, prevAttack: 0, spec };
    play(m.glb, 'idle', 0);
    loadedGLB.add(spec.url);
  }).catch((e) => { failedGLB.set(spec.url, String(e?.message || e)); console.warn('No se pudo cargar el modelo', spec.url, e); });
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
  const m = team === 'blue' ? (type === 'melee' ? buildBlueMelee() : buildBlueRanged()) : (type === 'melee' ? buildRedMelee() : buildRedRanged());
  const spec = MODEL_GLB[`minion_${team}_${type}`];
  if (spec) upgradeToGLB(m, spec, false);
  return m;
}

export function buildStructureModel(team, kind) {
  const m = kind === 'tower' ? (team === 'blue' ? buildBlueTower() : buildRedTower()) : kind === 'nexus' ? buildBlueNexus() : buildLorik();
  const spec = MODEL_GLB[kind === 'tower' ? `tower_${team}` : kind];
  if (spec) upgradeToGLB(m, spec, false);
  return m;
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
// Mapa de 300 x 176 con tres carriles, un río de norte a sur con tres puentes,
// bosques, ruinas, faroles, luciérnagas en el lado de Zugri y brasas en el de Lorik.
// La vegetación usa InstancedMesh: miles de objetos en muy pocas llamadas de dibujo.

const W_MAP = MAP.maxX - MAP.minX, H_MAP = MAP.maxZ - MAP.minZ;
export const riverX = (z) => 10 * Math.sin(z / 24);

// 0 en la base azul, 1 en la roja (con una transición suave en el centro)
const redness = (x) => Math.min(1, Math.max(0, (x + 25) / 70));

function groundTextures() {
  const W = 2400, H = Math.round(W * H_MAP / W_MAP);
  const sx = (x) => ((x - MAP.minX) / W_MAP) * W;
  const sz = (z) => ((z - MAP.minZ) / H_MAP) * H;
  const k = W / W_MAP; // píxeles por metro
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const e = document.createElement('canvas'); e.width = W; e.height = H;
  const x = c.getContext('2d');
  const ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const rnd = mulberry32(11);

  // pradera de Zugri -> tierras de ceniza de Lorik
  const gr = x.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, '#4c7a36'); gr.addColorStop(0.38, '#5a8a3c'); gr.addColorStop(0.5, '#62774a');
  gr.addColorStop(0.62, '#4a4248'); gr.addColorStop(1, '#2c2433');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  // manchas de bosque más oscuras y claros
  for (let i = 0; i < 260; i++) {
    const px = rnd() * W, py = rnd() * H, r = (20 + rnd() * 90);
    const red = px / W > 0.58;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const col = red ? (rnd() < 0.5 ? '30,20,36' : '70,50,60') : (rnd() < 0.6 ? '30,60,25' : '110,150,60');
    g.addColorStop(0, `rgba(${col},0.35)`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  // ruido fino
  for (let i = 0; i < 60000; i++) {
    const px = rnd() * W, py = rnd() * H;
    const red = px / W > 0.58 + (rnd() - 0.5) * 0.08;
    x.fillStyle = red ? `rgba(${40 + rnd() * 50},${30 + rnd() * 30},${45 + rnd() * 40},0.35)`
      : `rgba(${40 + rnd() * 50},${80 + rnd() * 70},${25 + rnd() * 30},0.35)`;
    x.fillRect(px, py, 1 + rnd() * 3, 1 + rnd() * 3);
  }

  // río: lecho oscuro y orillas de arena (el agua es una malla aparte)
  const riverPath = (w) => {
    x.beginPath();
    for (let z = MAP.minZ - 5; z <= MAP.maxZ + 5; z += 2) {
      const px = sx(riverX(z)), py = sz(z);
      if (z === MAP.minZ - 5) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.lineWidth = w * k; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke();
  };
  x.strokeStyle = '#a89870'; riverPath(17);
  x.strokeStyle = '#1e4a5a'; riverPath(12);

  // plazas de las bases
  for (const [team, col, ring] of [['blue', '#c9c2b0', '#e8e0cc'], ['red', '#2a2230', '#4a2a40']]) {
    const L = LAYOUT[team];
    const cx = sx((L.nexus.x + L.fountain.x) / 2), cy = sz(0);
    x.fillStyle = col; x.beginPath(); x.arc(cx, cy, 30 * k, 0, Math.PI * 2); x.fill();
    x.strokeStyle = ring; x.lineWidth = 1.2 * k;
    for (const r of [12, 20, 28]) { x.beginPath(); x.arc(cx, cy, r * k, 0, Math.PI * 2); x.stroke(); }
    // baldosas
    for (let i = 0; i < 2600; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 29 * k;
      x.fillStyle = team === 'blue' ? `rgba(${150 + rnd() * 60},${140 + rnd() * 60},${120 + rnd() * 50},0.4)` : `rgba(${30 + rnd() * 40},${20 + rnd() * 25},${35 + rnd() * 40},0.5)`;
      x.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.9 * k, 0.9 * k);
    }
  }

  // carriles: camino de tierra con borde, que se oscurece hacia el lado de Lorik
  const lanePath = () => {
    x.beginPath();
    for (const pts of Object.values(LANES)) {
      pts.forEach(([px, pz], i) => (i ? x.lineTo(sx(px), sz(pz)) : x.moveTo(sx(px), sz(pz))));
    }
  };
  x.lineCap = 'round'; x.lineJoin = 'round';
  const edge = x.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(70,55,35,0.9)'); edge.addColorStop(1, 'rgba(25,15,25,0.9)');
  x.strokeStyle = edge; x.lineWidth = (MAP.laneHalf * 2 + 2) * k; lanePath(); x.stroke();
  const dirt = x.createLinearGradient(0, 0, W, 0);
  dirt.addColorStop(0, '#b8a074'); dirt.addColorStop(0.45, '#a89068'); dirt.addColorStop(0.62, '#6a5a5a'); dirt.addColorStop(1, '#4a3a48');
  x.strokeStyle = dirt; x.lineWidth = MAP.laneHalf * 2 * k; lanePath(); x.stroke();
  // piedras y huellas sobre el camino
  for (const pts of Object.values(LANES)) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      for (let n = 0; n < len * 14; n++) {
        const t = rnd(), off = (rnd() - 0.5) * MAP.laneHalf * 1.9;
        const px = ax + (bx - ax) * t + (-(bz - az) / len) * off, pz = az + (bz - az) * t + ((bx - ax) / len) * off;
        const red = redness(px);
        x.fillStyle = red > 0.5 ? `rgba(${30 + rnd() * 40},${25 + rnd() * 25},${35 + rnd() * 30},0.5)` : `rgba(${120 + rnd() * 60},${100 + rnd() * 50},${70 + rnd() * 40},0.5)`;
        const s = (0.2 + rnd() * 0.5) * k;
        x.fillRect(sx(px), sz(pz), s, s);
      }
    }
  }

  // brillos: grietas de lava y runas en el lado de Lorik, setas luminosas en el de Zugri
  ex.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    let px = MAP.minX + W_MAP * (0.6 + rnd() * 0.4), pz = MAP.minZ + rnd() * H_MAP;
    if (distToLanes(px, pz) < MAP.laneHalf + 1) continue;
    const width = (0.15 + rnd() * 0.35) * k;
    for (const [ctx, col, w] of [[x, 'rgba(30,8,8,0.9)', width * 2.2], [ex, `rgba(255,${80 + rnd() * 60},20,0.95)`, width]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); let qx = px, qz = pz; ctx.moveTo(sx(qx), sz(qz));
      const r2 = mulberry32(i * 7 + 3);
      for (let s = 0; s < 7; s++) { qx += (r2() - 0.5) * 7; qz += (r2() - 0.5) * 7; ctx.lineTo(sx(qx), sz(qz)); }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 500; i++) {
    const px = MAP.minX + rnd() * W_MAP * 0.5, pz = MAP.minZ + rnd() * H_MAP;
    if (distToLanes(px, pz) < MAP.laneHalf + 2) continue;
    const g = ex.createRadialGradient(sx(px), sz(pz), 0, sx(px), sz(pz), 0.5 * k);
    g.addColorStop(0, 'rgba(120,255,220,0.8)'); g.addColorStop(1, 'rgba(120,255,220,0)');
    ex.fillStyle = g; ex.fillRect(sx(px) - k, sz(pz) - k, 2 * k, 2 * k);
  }
  // círculo de runas bajo el santuario de Lorik
  const rc = { x: sx(LAYOUT.red.nexus.x), y: sz(0) };
  ex.strokeStyle = 'rgba(170,80,255,0.9)'; ex.lineWidth = 0.35 * k;
  for (const r of [9, 11]) { ex.beginPath(); ex.arc(rc.x, rc.y, r * k, 0, Math.PI * 2); ex.stroke(); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ex.beginPath(); ex.moveTo(rc.x + Math.cos(a) * 9 * k, rc.y + Math.sin(a) * 9 * k);
    ex.lineTo(rc.x + Math.cos(a + 0.4) * 11 * k, rc.y + Math.sin(a + 0.4) * 11 * k); ex.stroke();
  }
  // y un círculo dorado bajo la Torre de Zugri
  const bc = { x: sx(LAYOUT.blue.nexus.x), y: sz(0) };
  ex.strokeStyle = 'rgba(255,210,110,0.6)';
  for (const r of [8, 9.5]) { ex.beginPath(); ex.arc(bc.x, bc.y, r * k, 0, Math.PI * 2); ex.stroke(); }

  const make = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: make(c), emissive: make(e) };
}

// Textura de ondas para el agua
function waterTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#4aa0c8'; x.fillRect(0, 0, 256, 256);
  const rnd = mulberry32(5);
  for (let i = 0; i < 140; i++) {
    x.strokeStyle = `rgba(${200 + rnd() * 55},${235 + rnd() * 20},255,${0.15 + rnd() * 0.35})`;
    x.lineWidth = 1 + rnd() * 2;
    const px = rnd() * 256, py = rnd() * 256, w = 10 + rnd() * 30;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + w / 2, py - 4, px + w, py); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kit instanciado: cada pieza (geometría + material + posición local) se dibuja de una
// sola vez para todas las copias. 'items' = [{ x, y, z, s, sy, ry, color }]
const DUMMY = new THREE.Object3D();
function kit(scene, parts, items, o = {}) {
  if (!items.length) return;
  const inst = items.map((it) => {
    DUMMY.position.set(it.x, it.y ?? 0, it.z);
    DUMMY.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    DUMMY.scale.set(it.s ?? 1, (it.s ?? 1) * (it.sy ?? 1), it.s ?? 1);
    DUMMY.updateMatrix();
    return DUMMY.matrix.clone();
  });
  const m4 = new THREE.Matrix4();
  for (const part of parts) {
    const im = new THREE.InstancedMesh(part.geo, part.mat, items.length);
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...(part.pos ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(part.scale ?? [1, 1, 1])));
    const col = new THREE.Color();
    items.forEach((it, i) => {
      im.setMatrixAt(i, m4.multiplyMatrices(inst[i], local));
      if (part.tint) im.setColorAt(i, col.set(part.tint(it, i)));
    });
    im.castShadow = o.shadow !== false && part.shadow !== false;
    im.receiveShadow = !!o.receive;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
  }
}

export function buildWorld(scene) {
  const rnd = mulberry32(7);
  const tex = groundTextures();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W_MAP, H_MAP),
    new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), new THREE.MeshStandardMaterial({ color: 0x24321f, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05;
  scene.add(outer);

  const fountains = Object.values(LAYOUT).map((L) => L.fountain);
  const nexi = Object.values(LAYOUT).map((L) => L.nexus);
  const towers = Object.values(LAYOUT).flatMap((L) => L.towers);
  const inRiver = (px, pz, m = 0) => Math.abs(px - riverX(pz)) < 8 + m;
  const inBase = (px, pz, m = 0) => nexi.some((n) => Math.hypot(px - (n.x + Math.sign(n.x) * 8), pz) < 32 + m);
  const nearTower = (px, pz, m) => towers.some((t) => Math.hypot(px - t.x, pz - t.z) < m);
  const free = (px, pz, laneM = 3) => px > MAP.minX + 2 && px < MAP.maxX - 2 && pz > MAP.minZ + 2 && pz < MAP.maxZ - 2
    && distToLanes(px, pz) > MAP.laneHalf + laneM && !inRiver(px, pz) && !inBase(px, pz) && !nearTower(px, pz, 6);

  // ---------------------------------------------------------------- materiales
  const trunk = mat(0x5a3a22, { r: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
  const deadM = mat(0x2a2028, { r: 0.9 });
  const crystalM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6010c0, emissiveIntensity: 1.3, flatShading: true, roughness: 0.3 });
  const rockM = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.95 });
  const grassM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide });
  const flowerM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x222222 });

  const G = {
    trunk: new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6),
    cone1: new THREE.ConeGeometry(1.4, 2.6, 7), cone2: new THREE.ConeGeometry(1.05, 2.1, 7), cone3: new THREE.ConeGeometry(0.7, 1.6, 7),
    ball: new THREE.IcosahedronGeometry(1.3, 0), ball2: new THREE.IcosahedronGeometry(0.95, 0),
    dead: new THREE.CylinderGeometry(0.12, 0.25, 2.6, 5), branch: new THREE.CylinderGeometry(0.06, 0.1, 1.2, 4),
    crystal: new THREE.OctahedronGeometry(0.5), rock: new THREE.DodecahedronGeometry(1, 0),
    grass: new THREE.ConeGeometry(0.07, 0.6, 3), flower: new THREE.IcosahedronGeometry(0.12, 0),
    bush: new THREE.IcosahedronGeometry(0.8, 0), mountain: new THREE.ConeGeometry(1, 1, 6),
  };
  const PINE = [
    { geo: G.trunk, mat: trunk, pos: [0, 0.8, 0] },
    { geo: G.cone1, mat: leafM, pos: [0, 2.4, 0], tint: (it) => it.c1 },
    { geo: G.cone2, mat: leafM, pos: [0, 3.5, 0], tint: (it) => it.c2 },
    { geo: G.cone3, mat: leafM, pos: [0, 4.4, 0], tint: (it) => it.c2 },
  ];
  const ROUND = [
    { geo: G.trunk, mat: trunk, pos: [0, 0.8, 0] },
    { geo: G.ball, mat: leafM, pos: [0, 2.6, 0], tint: (it) => it.c1 },
    { geo: G.ball2, mat: leafM, pos: [0.6, 3.2, 0.3], tint: (it) => it.c2 },
  ];
  const DEAD = [
    { geo: G.dead, mat: deadM, pos: [0, 1.3, 0] },
    { geo: G.branch, mat: deadM, pos: [0.35, 2.2, 0], rot: [0, 0, -0.9] },
    { geo: G.branch, mat: deadM, pos: [-0.3, 1.8, 0], rot: [0, 0, 0.8] },
  ];
  const CRYSTAL = [
    { geo: G.crystal, mat: crystalM, pos: [0, 0.6, 0], scale: [1, 1.8, 1], tint: (it) => it.c1 },
    { geo: G.crystal, mat: crystalM, pos: [0.45, 0.35, 0.2], rot: [0.4, 0, 0.6], scale: [0.6, 1.2, 0.6], tint: (it) => it.c1 },
    { geo: G.crystal, mat: crystalM, pos: [-0.35, 0.3, -0.25], rot: [-0.3, 0, -0.5], scale: [0.5, 1, 0.5], tint: (it) => it.c1 },
  ];
  const ROCK = [{ geo: G.rock, mat: rockM, tint: (it) => it.c1 }];
  const greens = ['#2f6b2a', '#3d7d33', '#4a8a3a', '#2a5a30', '#5a9a40'];
  const pick = (a) => a[(rnd() * a.length) | 0];

  const pines = [], rounds = [], deads = [], crystals = [], rocks = [], bushes = [], grass = [], flowers = [], obstacles = [];
  const addTree = (px, pz, s) => {
    const red = redness(px) > 0.5 + (rnd() - 0.5) * 0.3;
    const ry = rnd() * Math.PI * 2;
    if (!red) (rnd() < 0.55 ? pines : rounds).push({ x: px, z: pz, s, ry, c1: pick(greens), c2: pick(greens) });
    else if (rnd() < 0.65) deads.push({ x: px, z: pz, s, ry, rz: (rnd() - 0.5) * 0.2 });
    else crystals.push({ x: px, z: pz, s: s * 1.1, ry, c1: pick(['#c08aff', '#ff6a9a', '#8a6aff']) });
  };

  // arboledas: grupos densos que bloquean el paso (y se pueden rodear)
  for (let tries = 0, made = 0; tries < 2000 && made < 70; tries++) {
    const px = MAP.minX + 8 + rnd() * (W_MAP - 16), pz = MAP.minZ + 6 + rnd() * (H_MAP - 12);
    const r = 3 + rnd() * 3.5;
    if (distToLanes(px, pz) < MAP.laneHalf + r + 4 || inRiver(px, pz, r + 3) || inBase(px, pz, r + 2) || nearTower(px, pz, r + 8)) continue;
    if (obstacles.some((o) => Math.hypot(o.x - px, o.z - pz) < o.r + r + 7)) continue;
    obstacles.push({ x: px, z: pz, r: r * 0.85 });
    made++;
    const n = Math.round(r * 1.8);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
      addTree(px + Math.cos(a) * d, pz + Math.sin(a) * d, 0.9 + rnd() * 0.7);
    }
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2;
      rocks.push({ x: px + Math.cos(a) * r, z: pz + Math.sin(a) * r, y: 0.2, s: 0.5 + rnd() * 0.6, ry: rnd() * 6, rx: rnd(), c1: redness(px) > 0.5 ? '#3a3440' : '#7a7a80' });
    }
  }
  // árboles sueltos cerca de los caminos (sin colisión: son finos)
  for (let i = 0; i < 360; i++) {
    const px = MAP.minX + rnd() * W_MAP, pz = MAP.minZ + rnd() * H_MAP;
    if (!free(px, pz, 4)) continue;
    if (obstacles.some((o) => Math.hypot(o.x - px, o.z - pz) < o.r + 2)) continue;
    addTree(px, pz, 0.6 + rnd() * 0.5);
  }
  // bosque espeso y montañas que enmarcan el mapa
  const border = [];
  for (let i = 0; i < 900; i++) {
    const side = (rnd() * 4) | 0;
    let px, pz;
    if (side < 2) { px = MAP.minX - 30 + rnd() * (W_MAP + 60); pz = side ? MAP.maxZ + 1 + rnd() * 16 : MAP.minZ - 1 - rnd() * 16; }
    else { pz = MAP.minZ - 16 + rnd() * (H_MAP + 32); px = side === 2 ? MAP.maxX + 1 + rnd() * 18 : MAP.minX - 1 - rnd() * 18; }
    border.push([px, pz]);
  }
  border.forEach(([px, pz]) => addTree(px, pz, 1.1 + rnd() * 0.9));
  const mountains = [];
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const rx = (W_MAP / 2 + 34 + rnd() * 14), rz = (H_MAP / 2 + 30 + rnd() * 14);
    const px = Math.cos(a) * rx, pz = Math.sin(a) * rz;
    const red = redness(px) > 0.5;
    mountains.push({ x: px, z: pz, y: 0, s: 18 + rnd() * 16, sy: 1.2 + rnd() * 0.9, ry: rnd() * 6, c1: red ? pick(['#2a2230', '#3a2a3a', '#221a28']) : pick(['#4a5a6a', '#5a6a7a', '#3a4a5a']) });
  }
  // matorrales, rocas, hierba y flores
  for (let i = 0; i < 700; i++) {
    const px = MAP.minX + rnd() * W_MAP, pz = MAP.minZ + rnd() * H_MAP;
    if (!free(px, pz, 1.5)) continue;
    const red = redness(px) > 0.5 + (rnd() - 0.5) * 0.3;
    if (rnd() < 0.55) bushes.push({ x: px, z: pz, y: 0.25, s: 0.5 + rnd() * 0.7, sy: 0.6, ry: rnd() * 6, c1: red ? pick(['#3a2a40', '#4a3048']) : pick(greens) });
    else rocks.push({ x: px, z: pz, y: 0.15, s: 0.3 + rnd() * 0.8, sy: 0.6 + rnd() * 0.5, ry: rnd() * 6, rx: rnd(), c1: red ? pick(['#2e2a32', '#3a3440']) : pick(['#7a7a80', '#8a8678', '#6a6e70']) });
  }
  for (let i = 0; i < 9000; i++) {
    const px = MAP.minX + rnd() * W_MAP, pz = MAP.minZ + rnd() * H_MAP;
    if (!free(px, pz, 0.5)) continue;
    const red = redness(px) > 0.5 + (rnd() - 0.5) * 0.4;
    grass.push({ x: px, z: pz, y: 0.25, s: 0.7 + rnd() * 0.8, ry: rnd() * 6, rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5,
      c1: red ? pick(['#4a3a4a', '#3a2e3a', '#5a4050']) : pick(['#5a9a3a', '#6aaa40', '#4a8a30', '#7ab048']) });
    if (!red && rnd() < 0.18) flowers.push({ x: px + 0.3, z: pz + 0.2, y: 0.4, s: 0.8 + rnd() * 0.6, c1: pick(['#ffffff', '#ffe066', '#ff8ac8', '#8ac8ff', '#c89aff']) });
  }

  kit(scene, PINE, pines);
  kit(scene, ROUND, rounds);
  kit(scene, DEAD, deads);
  kit(scene, CRYSTAL, crystals);
  kit(scene, ROCK, rocks, { receive: true });
  kit(scene, [{ geo: G.bush, mat: leafM, tint: (it) => it.c1 }], bushes);
  kit(scene, [{ geo: G.grass, mat: grassM, tint: (it) => it.c1 }], grass, { shadow: false });
  kit(scene, [{ geo: G.flower, mat: flowerM, tint: (it) => it.c1 }], flowers, { shadow: false });
  kit(scene, [{ geo: G.mountain, mat: rockM, pos: [0, 0.5, 0], tint: (it) => it.c1 }], mountains, { shadow: false });
  // nieve en las cumbres de las montañas de Zugri
  kit(scene, [{ geo: G.mountain, mat: mat(0xf4f8ff, { r: 0.6 }), pos: [0, 0.86, 0], scale: [0.3, 0.29, 0.3] }],
    mountains.filter((m) => m.x < 30), { shadow: false });

  // ---------------------------------------------------------------- río y puentes
  const water = waterTexture();
  water.repeat.set(1.5, 18);
  const rg = new THREE.BufferGeometry();
  const verts = [], uvs = [], idx = [];
  const zs = [];
  for (let z = MAP.minZ - 30; z <= MAP.maxZ + 30; z += 2) zs.push(z);
  zs.forEach((z, i) => {
    const cx = riverX(z);
    verts.push(cx - 6.5, 0.06, z, cx + 6.5, 0.06, z);
    uvs.push(0, i / (zs.length - 1), 1, i / (zs.length - 1));
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  rg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  rg.setIndex(idx);
  rg.computeVertexNormals();
  const waterMesh = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: water, transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.25,
    emissive: 0x0a3a50, emissiveIntensity: 0.6 }));
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);
  // piedras de la orilla y nenúfares
  const bank = [], lilies = [];
  for (let z = MAP.minZ; z < MAP.maxZ; z += 1.6) {
    if ([-72, 0, 72].some((lz) => Math.abs(z - lz) < 8)) continue;
    for (const s of [-1, 1]) if (rnd() < 0.55) bank.push({ x: riverX(z) + s * (6.6 + rnd() * 1.5), z: z + rnd(), y: 0.1, s: 0.3 + rnd() * 0.5, sy: 0.6, ry: rnd() * 6, c1: pick(['#8a8678', '#9a9688', '#6a6e70']) });
    if (rnd() < 0.25) lilies.push({ x: riverX(z) + (rnd() - 0.5) * 9, z, y: 0.09, s: 0.5 + rnd() * 0.5, ry: rnd() * 6, c1: pick(['#3a8a3a', '#4a9a40']) });
  }
  kit(scene, ROCK, bank, { receive: true });
  kit(scene, [{ geo: new THREE.CylinderGeometry(0.6, 0.6, 0.03, 10), mat: leafM, tint: (it) => it.c1, shadow: false },
    { geo: G.flower, mat: flowerM, pos: [0.2, 0.05, 0], scale: [1, 0.6, 1], tint: () => '#ffd0e8', shadow: false }], lilies, { shadow: false });
  // puentes donde los carriles cruzan el río
  const wood = mat(0x7a5434, { r: 0.85 });
  const stone = mat(0xbab4a4, { r: 0.9 });
  for (const lz of [-72, 0, 72]) {
    const cx = riverX(lz);
    const mid = lz === 0;
    const deckM = mid ? stone : wood;
    const b = new THREE.Group();
    b.add(at(box(18, 0.35, 12, deckM), 0, 0.12, 0));
    for (let i = -8; i <= 8; i += 2) {
      for (const s of [-1, 1]) b.add(at(box(0.3, 1.1, 0.3, deckM), i, 0.6, s * 5.9));
    }
    for (const s of [-1, 1]) b.add(at(box(17, 0.18, 0.25, deckM), 0, 1.1, s * 5.9));
    if (!mid) for (let i = -8; i <= 8; i += 1) b.add(at(box(0.08, 0.36, 12, mat(0x5a3a22)), i, 0.14, 0));
    b.position.set(cx, 0, lz);
    b.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(b);
  }

  // ---------------------------------------------------------------- faroles de los carriles
  const lampItems = [], glows = [];
  for (const lane of Object.keys(LANES)) {
    const len = laneLength(lane);
    let side = 1;
    for (let s = 16; s < len - 16; s += 21) {
      const a = lanePoint(lane, s - 1), b = lanePoint(lane, s + 1);
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l;
      const q = lanePoint(lane, s);
      const px = q.x + nx * (MAP.laneHalf + 1.6) * side, pz = q.z + nz * (MAP.laneHalf + 1.6) * side;
      side = -side;
      if (inRiver(px, pz, 1) || nearTower(px, pz, 4)) continue;
      const red = redness(px) > 0.5;
      lampItems.push({ x: px, z: pz, red, c1: red ? '#ff4a6a' : '#ffd27a' });
      glows.push({ x: px, z: pz, col: red ? 0xff3a6a : 0xffc860 });
    }
  }
  kit(scene, [
    { geo: new THREE.CylinderGeometry(0.1, 0.14, 3, 6), mat: mat(0x2a2420, { m: 0.6, r: 0.4 }), pos: [0, 1.5, 0] },
    { geo: new THREE.BoxGeometry(0.5, 0.6, 0.5), mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), pos: [0, 3.2, 0], tint: (it) => it.c1, shadow: false },
    { geo: new THREE.ConeGeometry(0.2, 0.3, 4), mat: mat(0x2a2420, { m: 0.6 }), pos: [0, 3.65, 0], rot: [0, Math.PI / 4, 0] },
  ], lampItems);
  const dot = softDot();
  for (const gl of glows) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: gl.col, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(gl.x, 3.2, gl.z);
    sp.scale.setScalar(4.5);
    scene.add(sp);
  }

  // ---------------------------------------------------------------- ruinas y lugares especiales
  const ruinStone = mat(0xd8d2c0, { r: 0.85 });
  const landmarks = [
    { x: -40, z: -36, kind: 'ruins' }, { x: -40, z: 36, kind: 'tree' },
    { x: 42, z: -36, kind: 'altar' }, { x: 42, z: 36, kind: 'spire' },
  ];
  const lmGlows = [];
  for (const L of landmarks) {
    const g = new THREE.Group();
    if (L.kind === 'ruins') {
      // ruinas de un templo de Eaglere
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const h = i % 3 === 0 ? 1.5 + rnd() : 4 + rnd() * 1.5;
        g.add(at(cyl(0.45, 0.55, h, ruinStone, 10), Math.cos(a) * 5, h / 2, Math.sin(a) * 5));
        if (h > 3) g.add(at(box(1.3, 0.35, 1.3, ruinStone), Math.cos(a) * 5, h + 0.17, Math.sin(a) * 5));
      }
      g.add(at(cyl(2, 2.3, 0.4, ruinStone, 16), 0, 0.2, 0));
      g.add(at(oct(0.8, mat(0xfff2a0, { e: 0xffc040, ei: 1.6 })), 0, 2, 0));
      lmGlows.push({ x: L.x, z: L.z, y: 2, col: 0xffd060, s: 7 });
      obstacles.push({ x: L.x, z: L.z, r: 2.3 });
    } else if (L.kind === 'tree') {
      // el Árbol de Astora: un árbol enorme de hojas luminosas
      g.add(at(cyl(0.9, 1.6, 7, trunk, 10), 0, 3.5, 0));
      const glowLeaf = mat(0x8affb0, { e: 0x30c070, ei: 0.8, flat: true });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.add(at(sph(2.6, glowLeaf, 7), Math.cos(a) * 2.6, 8 + rnd() * 1.5, Math.sin(a) * 2.6));
      }
      g.add(at(sph(3.2, glowLeaf, 7), 0, 10, 0));
      lmGlows.push({ x: L.x, z: L.z, y: 8, col: 0x8affb0, s: 16 });
      obstacles.push({ x: L.x, z: L.z, r: 2.2 });
    } else if (L.kind === 'altar') {
      // altar de sacrificios de la Legión
      const obs = mat(0x1e1622, { r: 0.4, flat: true });
      g.add(at(cyl(3, 3.4, 0.6, obs, 8), 0, 0.3, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(at(cone(0.5, 4 + rnd() * 2, obs, 5), Math.cos(a) * 3.2, 2.3, Math.sin(a) * 3.2, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2));
      }
      g.add(at(oct(0.9, mat(0xff2a4a, { e: 0xff0030, ei: 2 })), 0, 2.2, 0));
      lmGlows.push({ x: L.x, z: L.z, y: 2.2, col: 0xff2a4a, s: 9 });
      obstacles.push({ x: L.x, z: L.z, r: 3.4 });
    } else {
      // aguja de cristal corrompido
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const c = oct(1, mat(0xb06aff, { e: 0x7020e0, ei: 1.5, flat: true }));
        c.scale.set(1, 3 + rnd() * 3, 1);
        at(c, Math.cos(a) * 1.6, 2.5, Math.sin(a) * 1.6, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
        g.add(c);
      }
      const big = oct(1.4, mat(0xd08aff, { e: 0x9030ff, ei: 1.8, flat: true }));
      big.scale.set(1, 5, 1); at(big, 0, 6, 0);
      g.add(big);
      lmGlows.push({ x: L.x, z: L.z, y: 5, col: 0xb06aff, s: 14 });
      obstacles.push({ x: L.x, z: L.z, r: 2.6 });
    }
    g.position.set(L.x, 0, L.z);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
  }
  for (const gl of lmGlows) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: gl.col, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(gl.x, gl.y, gl.z);
    sp.scale.setScalar(gl.s);
    scene.add(sp);
  }

  // ---------------------------------------------------------------- bases
  // Zugri: fuente de agua clara rodeada de columnas con braseros dorados
  const bf = LAYOUT.blue.fountain, rf = LAYOUT.red.fountain;
  const blueFount = new THREE.Group();
  blueFount.add(at(cyl(9.5, 10, 0.4, mat(0xe9e6dc, { r: 0.9 }), 40), 0, 0.2, 0));
  blueFount.add(at(cyl(7, 7, 0.45, mat(0x5ab0ff, { e: 0x2060c0, ei: 0.7, r: 0.05, m: 0.3 }), 40), 0, 0.22, 0));
  blueFount.add(at(cyl(1.2, 1.6, 2.4, mat(0xe9e6dc), 16), 0, 1.2, 0));
  blueFount.add(at(cyl(2.4, 1.4, 0.4, mat(0xe0b33c, { m: 0.8, r: 0.3 }), 16), 0, 2.5, 0));
  blueFount.add(at(sph(0.7, mat(0xbfe8ff, { e: 0x4ab0ff, ei: 1.8 }), 12), 0, 3.3, 0));
  const flameGold = mat(0xffd060, { e: 0xffa020, ei: 2.2 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    blueFount.add(at(cyl(0.35, 0.45, 4, mat(0xf1eee4, { r: 0.85 }), 10), Math.cos(a) * 11, 2, Math.sin(a) * 11));
    blueFount.add(at(cyl(0.6, 0.35, 0.4, mat(0xe0b33c, { m: 0.8 }), 10), Math.cos(a) * 11, 4.2, Math.sin(a) * 11));
    blueFount.add(at(cone(0.35, 0.8, flameGold, 6), Math.cos(a) * 11, 4.8, Math.sin(a) * 11));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffb040, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(bf.x + Math.cos(a) * 11, 4.9, bf.z + Math.sin(a) * 11); sp.scale.setScalar(3.5);
    scene.add(sp);
  }
  blueFount.position.set(bf.x, 0, bf.z);
  // Lorik: estanque de lava rodeado de púas de obsidiana con cristales
  const redFount = new THREE.Group();
  const obsM = mat(0x1e1622, { r: 0.4, flat: true });
  redFount.add(at(cyl(9.5, 10, 0.4, obsM, 9), 0, 0.2, 0));
  redFount.add(at(cyl(7, 7, 0.45, mat(0xff4a2a, { e: 0xff3010, ei: 1.4 }), 9), 0, 0.22, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    redFount.add(at(cone(0.7, 5 + (i % 2) * 2, obsM, 5), Math.cos(a) * 11, 2.8, Math.sin(a) * 11, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25));
    redFount.add(at(oct(0.35, mat(0xff2a4a, { e: 0xff0030, ei: 2 })), Math.cos(a) * 11, 6 + (i % 2) * 2, Math.sin(a) * 11));
  }
  redFount.position.set(rf.x, 0, rf.z);
  for (const g of [blueFount, redFount]) {
    g.traverse((c) => { if (c.isMesh) { c.receiveShadow = true; c.castShadow = true; } });
    scene.add(g);
  }
  // estandartes de Zugri y de la Legión en la entrada de cada base
  const bannerB = new THREE.MeshStandardMaterial({ map: zugriBannerTexture(), side: THREE.DoubleSide, roughness: 0.8 });
  const bannerR = mat(0x5a0a1a, { side: THREE.DoubleSide, e: 0x200008, ei: 1 });
  for (const team of ['blue', 'red']) {
    const n = LAYOUT[team].nexus;
    const dirx = team === 'blue' ? 1 : -1;
    for (const lane of Object.keys(LANES)) {
      const q = lanePoint(lane, team === 'blue' ? 22 : laneLength(lane) - 22);
      const a = lanePoint(lane, team === 'blue' ? 21 : laneLength(lane) - 21), b = lanePoint(lane, team === 'blue' ? 23 : laneLength(lane) - 23);
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l;
      for (const s of [-1, 1]) {
        const px = q.x + nx * (MAP.laneHalf + 1) * s, pz = q.z + nz * (MAP.laneHalf + 1) * s;
        const pole = at(cyl(0.08, 0.08, 6, mat(0xe0b33c, { m: 0.8 }), 6), px, 3, pz);
        const flag = new THREE.Mesh(geo('flagPlane', () => new THREE.PlaneGeometry(1.4, 2.1)), team === 'blue' ? bannerB : bannerR);
        at(flag, px + dirx * 0.75, 4.6, pz, 0, Math.atan2(nx, nz) + Math.PI / 2, 0);
        pole.castShadow = flag.castShadow = true;
        scene.add(pole, flag);
      }
    }
    void n;
  }

  // ---------------------------------------------------------------- partículas ambientales
  const makeSwarm = (n, area, color, size) => {
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      let px, pz;
      do { px = area.x0 + rnd() * (area.x1 - area.x0); pz = MAP.minZ + rnd() * H_MAP; } while (inBase(px, pz, -10));
      seed.set([px, pz, rnd() * 100, 0.5 + rnd()], i * 4);
      pos.set([px, 1, pz], i * 3);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geom, new THREE.PointsMaterial({ map: dot, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, pos, seed, n };
  };
  const fireflies = makeSwarm(700, { x0: MAP.minX, x1: 15 }, 0xd8ff7a, 0.55);
  const embers = makeSwarm(600, { x0: 10, x1: MAP.maxX }, 0xff7a2a, 0.45);

  return {
    obstacles,
    update(t, dt) {
      water.offset.y -= dt * 0.04;
      water.offset.x = Math.sin(t * 0.3) * 0.02;
      // luciérnagas: vuelan en círculos lentos y parpadean
      const f = fireflies;
      for (let i = 0; i < f.n; i++) {
        const [bx, bz, ph, sp] = [f.seed[i * 4], f.seed[i * 4 + 1], f.seed[i * 4 + 2], f.seed[i * 4 + 3]];
        f.pos[i * 3] = bx + Math.sin(t * 0.4 * sp + ph) * 2.5;
        f.pos[i * 3 + 1] = 0.8 + Math.sin(t * 0.9 * sp + ph * 2) * 0.6 + (Math.sin(t * 3 + ph) > 0.7 ? -10 : 0);
        f.pos[i * 3 + 2] = bz + Math.cos(t * 0.33 * sp + ph) * 2.5;
      }
      f.pts.geometry.attributes.position.needsUpdate = true;
      // brasas: suben desde el suelo y vuelven a empezar
      const e = embers;
      for (let i = 0; i < e.n; i++) {
        const [bx, bz, ph, sp] = [e.seed[i * 4], e.seed[i * 4 + 1], e.seed[i * 4 + 2], e.seed[i * 4 + 3]];
        const k = ((t * 0.18 * sp + ph) % 1);
        e.pos[i * 3] = bx + Math.sin(t * 1.3 + ph) * 0.6;
        e.pos[i * 3 + 1] = k * 7;
        e.pos[i * 3 + 2] = bz + Math.cos(t * 1.1 + ph) * 0.6;
      }
      e.pts.geometry.attributes.position.needsUpdate = true;
    },
  };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
