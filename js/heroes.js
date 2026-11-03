// Modelos de los héroes (segunda versión): figuras de estilo anime hechas con formas
// básicas, fieles a los tokens de la campaña: cara pintada (ojos, cejas, boca),
// peinados propios, ropa con sus colores y armas. Son diseños originales: los tokens
// solo sirven de guía de colores y rasgos.
// Cada constructor devuelve { group, parts, extra } con los mismos pivotes que usa
// animateModel (piernas, brazos, cuerpo, cabeza y manos).
import * as THREE from 'three';
import { mat } from './models.js';

// ------------------------------------------------------------------ utilidades
const G = new Map();
const geo = (k, f) => { if (!G.has(k)) G.set(k, f()); return G.get(k); };
function m(g, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, shadow = true) {
  const o = new THREE.Mesh(g, material);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = shadow;
  return o;
}
const sph = (r, s = 16) => geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(8, (s * 0.75) | 0)));
const cyl = (a, b, h, s = 14) => geo(`c${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const cone = (r, h, s = 10) => geo(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const tor = (r, t, arc = Math.PI * 2, s = 10) => geo(`t${r},${t},${arc},${s}`, () => new THREE.TorusGeometry(r, t, s, 28, arc));
const oct = (r) => geo(`o${r}`, () => new THREE.OctahedronGeometry(r));
const capSph = (r, t0, t1, p0 = 0, p1 = Math.PI * 2) => geo(`cap${r},${t0},${t1},${p0},${p1}`, () => new THREE.SphereGeometry(r, 24, 14, p0, p1, t0, t1));
const DS = THREE.DoubleSide;
const sc = (o, x, y, z) => { o.scale.set(x, y, z); return o; };

// Capa curvada (se dobla hacia atrás) para capas, abrigos y cortinas de pelo
function capeGeo(w, h, bend = 0.3, flare = 0.3) {
  return geo(`cape${w},${h},${bend},${flare}`, () => {
    const g = new THREE.PlaneGeometry(w, h, 6, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const t = (h / 2 - y) / h; // 0 arriba, 1 abajo
      p.setX(i, x * (1 + flare * t));
      p.setZ(i, -bend * t * t - Math.abs(x) * 0.25 * (1 - t));
    }
    g.computeVertexNormals();
    return g;
  });
}

// ------------------------------------------------------------------ caras pintadas
const faceCache = new Map();
// Caras de estilo anime sobrio: ojos almendrados con el color de cada héroe, cejas,
// nariz insinuada y boca. o: { iris, lash, brow, female, beard, paint, scar, closed, glow, frown }
function faceTexture(o) {
  const key = JSON.stringify(o);
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const eyeY = 138, dx = 48;
  // ojos almendrados (no de muñeca): blanco visible, iris mediano, un solo brillo
  const ew = o.female ? 25 : 23, eh = o.female ? 16 : 13;
  x.lineCap = 'round';
  if (o.paint) { // pintura de guerra (Astrid): franja suave detrás de los ojos
    x.fillStyle = o.paint; x.globalAlpha = 0.5;
    x.beginPath(); x.ellipse(128, eyeY - 2, 100, 18, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
  }
  if (o.female) { // rubor muy suave
    for (const s of [-1, 1]) {
      const g = x.createRadialGradient(128 + s * 64, eyeY + 34, 2, 128 + s * 64, eyeY + 34, 16);
      g.addColorStop(0, 'rgba(255,130,150,0.22)'); g.addColorStop(1, 'rgba(255,130,150,0)');
      x.fillStyle = g; x.fillRect(128 + s * 64 - 18, eyeY + 16, 36, 36);
    }
  }
  const almond = (cx, s, grow = 0) => {
    x.beginPath();
    x.moveTo(cx - s * (ew + grow), eyeY + 2);
    x.quadraticCurveTo(cx - s * 4, eyeY - eh * 1.7 - grow, cx + s * (ew + grow), eyeY - eh * 0.35);
    x.quadraticCurveTo(cx + s * 4, eyeY + eh * 1.25 + grow, cx - s * (ew + grow), eyeY + 2);
    x.closePath();
  };
  for (const s of [-1, 1]) {
    const cx = 128 + s * dx;
    if (o.closed) { // ojos cerrados y serenos (Grimdarkus)
      x.strokeStyle = o.lash; x.lineWidth = 5;
      x.beginPath(); x.moveTo(cx - ew, eyeY); x.quadraticCurveTo(cx, eyeY + 8, cx + ew, eyeY - 2); x.stroke();
    } else {
      x.save();
      almond(cx, s); x.fillStyle = '#fbf8f4'; x.fill(); x.clip();
      const ir = x.createRadialGradient(cx, eyeY - 4, 1, cx, eyeY, eh * 1.15);
      ir.addColorStop(0, o.irisLight || '#ffffff'); ir.addColorStop(0.45, o.iris); ir.addColorStop(1, o.irisDark || '#140f22');
      x.fillStyle = ir;
      x.beginPath(); x.arc(cx + s * 2, eyeY, eh * 1.12, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(12,8,20,0.9)';
      x.beginPath(); x.arc(cx + s * 2, eyeY + 1, eh * 0.45, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.9)';
      x.beginPath(); x.arc(cx - 4, eyeY - eh * 0.45, eh * 0.28, 0, Math.PI * 2); x.fill();
      x.restore();
      // párpado superior marcado y línea inferior suave
      x.strokeStyle = o.lash; x.lineWidth = o.female ? 5 : 4.5;
      x.beginPath(); x.moveTo(cx - s * (ew + 1), eyeY + 2); x.quadraticCurveTo(cx - s * 4, eyeY - eh * 1.75, cx + s * (ew + 3), eyeY - eh * 0.45); x.stroke();
      if (o.female) { x.lineWidth = 3; x.beginPath(); x.moveTo(cx + s * (ew + 2), eyeY - eh * 0.45); x.lineTo(cx + s * (ew + 9), eyeY - eh * 0.95); x.stroke(); }
      x.strokeStyle = 'rgba(80,40,40,0.35)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(cx - s * ew * 0.6, eyeY + eh * 0.95); x.quadraticCurveTo(cx, eyeY + eh * 1.2, cx + s * ew * 0.8, eyeY + eh * 0.5); x.stroke();
    }
    // cejas
    x.strokeStyle = o.brow; x.lineWidth = o.female ? 3.5 : 5;
    const by = eyeY - eh * 2.2 - (o.female ? 4 : 0);
    x.beginPath(); x.moveTo(cx - s * 20, by + 5); x.quadraticCurveTo(cx, by - 4 + (o.frown ? 3 : 0), cx + s * 22, by + (o.frown ? 6 : 2)); x.stroke();
  }
  // brillo sutil en los ojos (Ikaruus, Crixus, Catarina)
  if (o.glow) {
    x.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const g = x.createRadialGradient(128 + s * dx, eyeY, 1, 128 + s * dx, eyeY, 22);
      g.addColorStop(0, o.glow.replace(/[\d.]+\)$/, '0.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(128 + s * dx - 22, eyeY - 22, 44, 44);
    }
    x.globalCompositeOperation = 'source-over';
  }
  // nariz insinuada
  x.strokeStyle = 'rgba(140,70,60,0.35)'; x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(126, eyeY + 36); x.lineTo(130, eyeY + 44); x.stroke();
  // boquita sonriente
  x.strokeStyle = o.mouth || '#a8505a'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(119, eyeY + 60); x.quadraticCurveTo(128, eyeY + (o.frown ? 61 : 65), 137, eyeY + 60); x.stroke();
  if (o.beard) { // perilla y bigote (Kouji)
    x.fillStyle = o.beard;
    x.beginPath(); x.ellipse(116, eyeY + 56, 13, 5, 0.25, 0, Math.PI * 2); x.ellipse(140, eyeY + 56, 13, 5, -0.25, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(118, eyeY + 74); x.quadraticCurveTo(128, eyeY + 104, 138, eyeY + 74); x.fill();
  }
  if (o.scar) {
    x.strokeStyle = o.scar; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(176, eyeY + 18); x.lineTo(186, eyeY + 42); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  faceCache.set(key, t);
  return t;
}

function faceMat(o) {
  const key = 'face' + JSON.stringify(o);
  if (!faceCache.has(key)) {
    const t = faceTexture(o);
    faceCache.set(key, new THREE.MeshStandardMaterial({
      map: t, transparent: true, alphaTest: 0.05, roughness: 0.8, depthWrite: false,
      emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15,
    }));
  }
  return faceCache.get(key);
}

// ------------------------------------------------------------------ figura base
// Proporciones de figura anime estilizada (unos 2,15 de alto con la cabeza).
function figure(o) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const skin = mat(o.skin, { r: 0.75, e: o.skin, ei: 0.16 });
  const top = mat(o.top, { r: o.topR ?? 0.6, m: o.topM ?? 0.05 });
  const pants = mat(o.pants ?? o.top, { r: 0.7 });
  const boots = mat(o.boots ?? 0x2a1e18, { r: 0.6 });
  const sleeves = mat(o.sleeves ?? o.top, { r: 0.6, m: o.topM ?? 0.05 });
  const hands = o.gloves ? mat(o.gloves, { r: 0.6 }) : skin;
  const slim = o.female ? 0.9 : 1;

  // piernas (pivote en la cadera)
  const leg = (sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.12 * slim, 1.0, 0);
    p.add(m(cyl(0.1 * slim, 0.075, 0.5), pants, 0, -0.25, 0));
    p.add(m(cyl(0.075, 0.06, 0.42), o.bareLegs ? skin : pants, 0, -0.7, 0));
    p.add(m(cyl(0.08, 0.09, 0.26), boots, 0, -0.86, 0));
    p.add(sc(m(sph(0.09, 10), boots, 0, -0.96, 0.06), 1, 0.55, 1.5));
    return p;
  };
  const legL = leg(-1), legR = leg(1);
  body.add(legL, legR);
  // cadera, torso y cuello
  body.add(m(cyl(0.19 * slim, 0.21 * slim, 0.18), pants, 0, 1.02, 0));
  const torso = m(cyl(0.24 * slim, 0.18 * slim, 0.5), top, 0, 1.33, 0);
  body.add(torso);
  if (o.female) body.add(sc(m(sph(0.13, 12), top, 0, 1.43, 0.08), 1.4, 0.75, 0.8));
  body.add(m(sph(0.11, 10), sleeves, -0.26 * slim, 1.55, 0));
  body.add(m(sph(0.11, 10), sleeves, 0.26 * slim, 1.55, 0));
  body.add(m(cyl(0.055, 0.06, 0.16), skin, 0, 1.66, 0));
  // brazos (pivote en el hombro)
  const arm = (sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.28 * slim, 1.56, 0);
    p.add(m(cyl(0.068, 0.058, 0.36), sleeves, 0, -0.18, 0));
    p.add(m(cyl(0.058, 0.048, 0.32), o.bareArms ? skin : sleeves, 0, -0.5, 0));
    p.add(m(sph(0.06, 10), hands, 0, -0.68, 0.01));
    const hand = new THREE.Group(); hand.position.set(0, -0.69, 0); p.add(hand);
    return [p, hand];
  };
  const [armL, handL] = arm(-1), [armR, handR] = arm(1);
  body.add(armL, armR);
  // cabeza: cráneo, mentón, orejas y cara pintada
  const head = new THREE.Group(); head.position.set(0, 1.9, 0);
  if (!o.noFace) {
    head.add(m(headGeo(), skin, 0, 0, 0));
    const earG = o.elf ? cone(0.05, 0.2, 6) : sph(0.05, 8);
    for (const s of [-1, 1]) {
      const e = m(earG, skin, s * 0.215, 0.0, -0.01, 0, 0, o.elf ? -s * 1.25 : 0);
      head.add(e);
    }
    // la cara se pinta sobre la propia cabeza (una capa finísima encima), sin láminas
    const face = m(faceGeo(), faceMat(o.face), 0, 0, 0, 0, 0, 0, false);
    face.scale.setScalar(1.008);
    head.add(face);
  }
  body.add(head);
  return { group, parts: { body, legL, legR, armL, armR, head, torso, handR, handL }, mats: { skin, top, pants, boots, sleeves } };
}

// Cabeza de estilo anime: esfera algo alargada con mentón fino
const HEAD_R = 0.235;
function headGeo() {
  return geo('animeHead', () => {
    const g = new THREE.SphereGeometry(HEAD_R, 40, 30);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i) * 1.06, z = p.getZ(i);
      if (y < 0) {
        const k = Math.min(1, -y / (HEAD_R * 1.06));
        x *= 1 - 0.34 * k * k;
        z = z * (1 - 0.18 * k * k) + (z > 0 ? 0.035 * k : 0);
      }
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  });
}
// Copia de la cabeza con coordenadas de textura proyectadas desde delante (para la cara)
function faceGeo() {
  return geo('animeFace', () => {
    const g = headGeo().clone();
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const front = p.getZ(i) > 0.03;
      uv.setXY(i, front ? p.getX(i) / 0.36 + 0.5 : 0, front ? p.getY(i) / 0.36 + 0.5 : 0);
    }
    uv.needsUpdate = true;
    return g;
  });
}

// ------------------------------------------------------------------ pelo
// Casquete: cubre la parte de arriba y la de atrás de la cabeza, dejando la cara libre.
function hairCap(head, hm, r = 0.25) {
  head.add(m(capSph(r, 0, 1.15), hm, 0, 0.035, -0.01));
  head.add(m(capSph(r, 0, 2.3, Math.PI, Math.PI), hm, 0, 0.03, -0.02));
}
// Flequillo: una capa de pelo sobre la frente que termina en mechones en punta.
// n = número de mechones; len = lo que bajan las puntas.
function bangs(head, hm, n = 9, len = 0.18) {
  len = Math.min(0.085, len * 0.42); // las puntas no deben tapar los ojos
  const key = `fringe${n},${len}`;
  const g = geo(key, () => {
    const W = n * 4, H = 10;
    const gg = new THREE.SphereGeometry(HEAD_R * 1.07, W, H, 0.12, Math.PI - 0.24, 0, 1.32);
    const p = gg.attributes.position;
    for (let iy = H - 2; iy <= H; iy++) {
      for (let ix = 0; ix <= W; ix++) {
        const i = iy * (W + 1) + ix;
        const ph = (ix / W) * n; // posición dentro de los mechones
        const tip = Math.pow(Math.abs(Math.cos(Math.PI * ph)), 3); // 1 en la punta, 0 entre mechones
        const k = (iy - (H - 2)) / 2;
        p.setY(i, p.getY(i) - len * tip * k - 0.02 * k);
        p.setZ(i, p.getZ(i) + 0.012 * k);
      }
    }
    gg.computeVertexNormals();
    return gg;
  });
  head.add(m(g, hm, 0, 0.03, 0));
}
// Melena larga por detrás (lisa) y mechones laterales
function longHair(head, hm, len = 0.8, width = 0.27) {
  const g = m(cyl(width * 0.9, width, len, 16), hm, 0, -len / 2 + 0.05, -0.1);
  g.scale.set(1, 1, 0.45);
  head.add(g);
  head.add(sc(m(cone(width * 0.9, 0.25, 16), hm, 0, -len + 0.06, -0.1, Math.PI), 1, 1, 0.45));
}
function sideLocks(head, hm, len = 0.45) {
  for (const s of [-1, 1]) head.add(m(cone(0.06, len, 6), hm, s * 0.2, -len / 2 + 0.06, 0.07, Math.PI, 0, s * 0.08));
}
function spikes(head, hm, n = 9, len = 0.22) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    head.add(m(cone(0.07, len, 6), hm, Math.cos(a) * 0.15, 0.18, Math.sin(a) * 0.15 - 0.03, Math.sin(a) * 0.9 - 0.2, 0, -Math.cos(a) * 0.9));
  }
}
// Cuernos curvos (de carnero) a los lados de la cabeza
function ramHorns(head, hm, tipM, size = 1) {
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.add(m(tor(0.12 * size, 0.045 * size, Math.PI * 1.5), hm, 0, 0, 0));
    if (tipM) h.add(m(cone(0.04 * size, 0.12 * size, 6), tipM, 0.12 * size, -0.02, 0, 0, 0, 0.3));
    h.position.set(s * 0.2, 0.12, -0.05);
    h.rotation.set(0, s > 0 ? -Math.PI / 2 : Math.PI / 2, s * 0.2);
    head.add(h);
  }
}

// ------------------------------------------------------------------ armas
function sword(bladeM, guardM, len = 1.0, w = 0.07) {
  const g = new THREE.Group();
  const blade = m(box(w, len, 0.025), bladeM, 0, len / 2 + 0.1, 0);
  g.add(blade);
  g.add(m(cone(w * 0.7, 0.14, 4), bladeM, 0, len + 0.17, 0, 0, Math.PI / 4));
  g.add(m(box(0.3, 0.05, 0.06), guardM, 0, 0.09, 0));
  g.add(m(cyl(0.025, 0.025, 0.18), mat(0x3a2a20), 0, -0.02, 0));
  g.add(m(sph(0.035, 8), guardM, 0, -0.12, 0));
  g.rotation.x = Math.PI / 2;
  g.position.set(0, -0.02, 0.05);
  return { g, blade };
}

// ------------------------------------------------------------------ HÉROES

function buildJosephine() {
  const f = figure({ female: true, skin: 0xf8dfcc, top: 0x2a4aa8, sleeves: 0xe8ecf4, pants: 0xf2f2fa, boots: 0xe8ecf4, topM: 0.1,
    face: { female: true, iris: '#2fbf6a', irisLight: '#c8ffd8', lash: '#6a3a10', brow: '#c07830', blush: true } });
  const p = f.parts;
  const hair = mat(0xf2a848, { r: 0.5 });
  const gold = mat(0xe8b83c, { m: 0.85, r: 0.3 });
  const silver = mat(0xe8ecf4, { m: 0.75, r: 0.3 });
  const blue = mat(0x2a4aa8, { r: 0.55 });
  hairCap(p.head, hair); bangs(p.head, hair, 7, 0.18); longHair(p.head, hair, 0.95, 0.28); sideLocks(p.head, hair, 0.5);
  // adorno dorado del pelo: media luna con un ala (lado izquierdo, como en su token)
  p.head.add(m(tor(0.08, 0.018, Math.PI * 1.3), gold, -0.2, 0.17, 0.05, 0, 0.6, 0.6));
  p.head.add(m(oct(0.035), mat(0x3a8aff, { e: 0x1a5aff, ei: 1 }), -0.2, 0.17, 0.08));
  p.head.add(m(box(0.03, 0.16, 0.08), gold, -0.24, 0.24, 0.0, 0.3, 0, 0.7));
  // lazo azul
  p.head.add(m(box(0.05, 0.08, 0.14), blue, 0.18, 0.12, -0.14, 0, 0, -0.3));
  // peto plateado con detalles dorados y gema
  p.body.add(sc(m(cyl(0.245, 0.2, 0.3, 14), silver, 0, 1.42, 0.005), 1, 1, 0.92));
  p.body.add(m(box(0.3, 0.035, 0.05), gold, 0, 1.53, 0.21));
  p.body.add(m(oct(0.045), mat(0x3a8aff, { e: 0x1a5aff, ei: 1.2 }), 0, 1.42, 0.24));
  // falda azul con borde dorado
  p.body.add(m(cyl(0.2, 0.38, 0.5, 16), blue, 0, 0.88, 0));
  p.body.add(m(tor(0.375, 0.02, Math.PI * 2, 6), gold, 0, 0.635, 0, Math.PI / 2));
  // hombreras doradas y plateadas
  for (const s of [-1, 1]) {
    p.body.add(sc(m(sph(0.13, 12), silver, s * 0.27, 1.58, 0), 1.1, 0.75, 1));
    p.body.add(m(tor(0.11, 0.015, Math.PI, 6), gold, s * 0.27, 1.6, 0, 0, Math.PI / 2, 0));
  }
  // alitas blancas a la espalda
  const wing = mat(0xffffff, { r: 0.5, side: DS });
  for (const s of [-1, 1]) {
    const w = m(geo('jwing', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.45, 0.25); sh.lineTo(0.38, 0.05); sh.lineTo(0.42, -0.05); sh.lineTo(0.3, -0.08); sh.lineTo(0.32, -0.18); sh.lineTo(0.1, -0.12); return new THREE.ShapeGeometry(sh); }), wing, s * 0.08, 1.48, -0.18, 0, s > 0 ? -0.5 : Math.PI + 0.5, 0);
    p.body.add(w);
  }
  // brazalete rojo
  p.armR.add(m(cyl(0.065, 0.065, 0.06), mat(0xc02030), 0, -0.44, 0));
  // espada angelical y escudo redondo
  const sw = sword(mat(0xf4f8ff, { m: 0.9, r: 0.15, e: 0x334466, ei: 0.3 }), gold, 0.95);
  p.handR.add(sw.g);
  const shield = new THREE.Group();
  shield.add(m(cyl(0.3, 0.3, 0.05, 24), mat(0xf6f4ee, { m: 0.5, r: 0.4 }), 0, 0, 0, Math.PI / 2));
  shield.add(m(tor(0.3, 0.035), gold, 0, 0, 0));
  shield.add(m(oct(0.09), mat(0x3a6fe0, { m: 0.4, e: 0x1a3a90, ei: 0.7 }), 0, 0, 0.04));
  shield.position.set(-0.08, -0.32, 0.12); shield.rotation.y = -0.3;
  p.armL.add(shield);
  return { ...f, extra: { sword: sw.g, glow: sw.blade } };
}

function buildFotsor() {
  const bone = mat(0xece4cf, { r: 0.8 });
  const steel = mat(0x2a2a30, { m: 0.75, r: 0.35 });
  const etch = mat(0x9a9aa8, { m: 0.8, r: 0.3 });
  const fireEye = mat(0xff7a1a, { e: 0xff5a00, ei: 2.5 });
  const f = figure({ skin: 0xece4cf, top: 0x2a2a30, sleeves: 0x2a2a30, pants: 0x232328, boots: 0x1a1a1e, topM: 0.75, topR: 0.35, noFace: true, gloves: 0x2a2a30 });
  const p = f.parts;
  // cráneo con cuencas de fuego, mandíbula y dientes
  p.head.add(sc(m(sph(0.21, 16), bone, 0, 0.03, 0), 0.95, 1.05, 1));
  p.head.add(m(box(0.2, 0.08, 0.16), bone, 0, -0.13, 0.06));
  for (let i = 0; i < 6; i++) p.head.add(m(box(0.022, 0.035, 0.02), bone, -0.06 + i * 0.024, -0.09, 0.15));
  for (const s of [-1, 1]) {
    p.head.add(sc(m(sph(0.055, 10), mat(0x140808), s * 0.075, 0.02, 0.165), 1, 1.1, 0.5));
    p.head.add(m(sph(0.028, 8), fireEye, s * 0.075, 0.02, 0.19));
  }
  // yelmo negro con cuernos (como en su token)
  p.head.add(m(capSph(0.235, 0, 1.25), steel, 0, 0.05, 0));
  p.head.add(m(box(0.035, 0.22, 0.05), steel, 0, 0.0, 0.215));
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.add(m(cyl(0.05, 0.065, 0.16, 8), steel, 0, 0, 0, 0, 0, Math.PI / 2));
    h.add(m(tor(0.2, 0.038, Math.PI * 0.6), steel, -0.0, 0.2, 0, 0, 0, -Math.PI * 0.55));
    h.add(m(cone(0.035, 0.16, 6), steel, 0.2, 0.36, 0, 0, 0, -0.5));
    h.position.set(s * 0.22, 0.1, 0); h.scale.set(s, 1, 1);
    p.head.add(h);
  }
  // pelo oscuro y largo saliendo del yelmo, al viento
  const hair = mat(0x1a1a20, { r: 0.7 });
  const mane = m(capeGeo(0.42, 0.9, 0.35, 0.6), mat(0x1a1a20, { r: 0.7, side: DS }), 0, -0.4, -0.2);
  p.head.add(mane);
  sideLocks(p.head, hair, 0.35);
  // coraza grabada
  p.body.add(sc(m(cyl(0.255, 0.2, 0.34, 14), steel, 0, 1.42, 0), 1, 1, 0.92));
  for (let i = 0; i < 3; i++) p.body.add(m(tor(0.06 + i * 0.03, 0.008, Math.PI * 2, 4), etch, 0, 1.42, 0.235));
  p.body.add(m(box(0.012, 0.28, 0.01), etch, 0, 1.42, 0.24));
  p.body.add(m(box(0.28, 0.012, 0.01), etch, 0, 1.42, 0.24));
  for (const s of [-1, 1]) p.body.add(sc(m(sph(0.14, 12), steel, s * 0.28, 1.58, 0), 1.15, 0.7, 1.05));
  // capa negra hecha jirones
  const cape = m(capeGeo(0.62, 1.2, 0.35, 0.45), mat(0x141418, { r: 0.8, side: DS }), 0, 1.0, -0.22);
  p.body.add(cape);
  // llamas (solo con la Ira ardiente)
  const flames = new THREE.Group();
  const fm1 = mat(0xff6a00, { e: 0xff4400, ei: 2.2, op: 0.9 });
  const fm2 = mat(0xffd040, { e: 0xffaa00, ei: 2.2, op: 0.9 });
  const flameList = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const fl = m(cone(0.08, 0.4, 6), i % 2 ? fm1 : fm2, Math.cos(a) * 0.1, 0.36, Math.sin(a) * 0.1, 0, 0, 0, false);
    flames.add(fl); flameList.push(fl);
  }
  p.head.add(flames);
  flames.visible = false;
  // magia del tiempo en los puños
  const timeM = mat(0xb07aff, { e: 0x7a3aff, ei: 1.4 });
  p.handR.add(m(sph(0.075, 10), timeM));
  p.handL.add(m(sph(0.075, 10), timeM));
  const anim = (t, u) => {
    flames.visible = !!u.buffs?.some((b) => b.key === 'fot_fury');
    cape.rotation.x = 0.08 + (u.moving ? 0.25 : 0.04) + Math.sin(t * 3) * 0.03;
    mane.rotation.x = 0.1 + (u.moving ? 0.3 : 0.05);
  };
  return { ...f, extra: { flames, flameList, cape, anim } };
}

function buildYeslie() {
  const f = figure({ female: true, skin: 0xfde6de, top: 0x1e2244, sleeves: 0x1e2244, pants: 0x1e2244, boots: 0x16182c,
    face: { female: true, iris: '#7a6aff', irisLight: '#c8f4ff', irisDark: '#2a1a6a', lash: '#3a3050', brow: '#c8c8d8', blush: true } });
  const p = f.parts;
  const hair = mat(0xf4f4fa, { r: 0.45 });
  const gold = mat(0xe0b33c, { m: 0.85, r: 0.3 });
  hairCap(p.head, hair); bangs(p.head, hair, 7, 0.17); longHair(p.head, hair, 1.0, 0.3);
  // ondas de pelo blanco a los lados
  for (const s of [-1, 1]) {
    p.head.add(m(cone(0.075, 0.7, 8), hair, s * 0.21, -0.3, 0.02, Math.PI, 0, s * 0.12));
    p.head.add(m(cone(0.06, 0.55, 8), hair, s * 0.25, -0.28, -0.08, Math.PI - 0.15, 0, s * 0.25));
  }
  // cuernos curvos morados con reflejos turquesa
  ramHorns(p.head, mat(0x4a2a7a, { r: 0.35, m: 0.2 }), mat(0x3ad8e8, { e: 0x18a8c0, ei: 0.6 }), 1.0);
  // camisa blanca y abrigo azul marino con bordados dorados
  p.body.add(m(box(0.16, 0.3, 0.05), mat(0xf8f8ff), 0, 1.42, 0.2));
  p.body.add(m(oct(0.04), mat(0x2ad8c8, { e: 0x10a898, ei: 1 }), 0, 1.53, 0.23));
  p.body.add(m(cyl(0.2, 0.4, 0.62, 16), mat(0x1e2244, { r: 0.6 }), 0, 0.82, -0.01));
  for (const y of [0.53, 1.12]) p.body.add(m(tor(y > 1 ? 0.21 : 0.395, 0.015, Math.PI * 2, 6), gold, 0, y, 0, Math.PI / 2));
  for (const s of [-1, 1]) p.body.add(m(box(0.015, 0.5, 0.01), gold, s * 0.09, 0.85, 0.32, -0.3, 0, 0));
  // libro flotante y pistola de cristal
  const book = new THREE.Group();
  book.add(m(box(0.28, 0.05, 0.22), mat(0x2a1a5a)));
  book.add(m(box(0.26, 0.055, 0.2), mat(0xfff8e0), 0.01, 0, 0));
  book.add(m(box(0.08, 0.06, 0.08), gold, 0, 0.005, 0));
  book.position.set(-0.55, 1.45, 0.12);
  p.body.add(book);
  const crystal = mat(0x7ff6ff, { e: 0x30d8ff, ei: 1.6, r: 0.1 });
  const gun = new THREE.Group();
  gun.add(m(box(0.08, 0.12, 0.09), mat(0xd9dde8, { m: 0.8, r: 0.3 })));
  gun.add(m(oct(0.08), crystal, 0, 0.04, 0.17));
  gun.add(m(cyl(0.03, 0.03, 0.26, 6), crystal, 0, 0.04, 0.2, Math.PI / 2));
  gun.position.set(0, -0.04, 0.07);
  p.handR.add(gun);
  return { ...f, extra: { book } };
}

function buildAstrid() {
  // sin token: según el lore (vikinga rubia con trenzas y pintura de guerra azul)
  const f = figure({ female: true, skin: 0xf2d2bb, top: 0x5a3e2b, sleeves: 0x4a3324, pants: 0x3a2a20, boots: 0x2a1c14,
    face: { female: true, iris: '#3a7ae8', irisLight: '#d0e8ff', lash: '#5a3a18', brow: '#c8a050', paint: '#1a2a7a', scar: '#b07060', frown: true } });
  const p = f.parts;
  const hair = mat(0xf1d27a, { r: 0.5 });
  const fur = mat(0x3b2b22, { r: 0.95 });
  hairCap(p.head, hair); bangs(p.head, hair, 5, 0.12); longHair(p.head, hair, 0.6, 0.24);
  // trenzas laterales
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) p.head.add(m(sph(0.045, 8), hair, s * 0.2, -0.05 - i * 0.075, 0.06));
  // manto de pieles y ribetes rojos y azules
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    p.body.add(m(sph(0.1, 8), fur, Math.cos(a) * 0.24, 1.58, Math.sin(a) * 0.2));
  }
  p.body.add(m(cyl(0.215, 0.215, 0.05), mat(0xb02a2a), 0, 1.08, 0));
  p.body.add(m(cyl(0.212, 0.212, 0.04), mat(0x2a4aa8), 0, 1.13, 0));
  p.body.add(m(cyl(0.08, 0.08, 0.03, 12), mat(0x8a8f99, { m: 0.85 }), 0.1, 1.38, 0.21, Math.PI / 2));
  p.body.add(m(cyl(0.21, 0.3, 0.32, 14), fur, 0, 0.86, 0));
  // pistolas a la cintura y rifle de Gravenfort
  const metal = mat(0x8a8f99, { m: 0.85, r: 0.3 });
  for (const s of [-1, 1]) p.body.add(m(box(0.06, 0.16, 0.1), metal, s * 0.24, 0.98, 0.05));
  const rifle = new THREE.Group();
  rifle.add(m(box(0.08, 0.1, 0.5), mat(0x4a2e1a), 0, 0, -0.08));
  rifle.add(m(cyl(0.03, 0.03, 0.95, 8), metal, 0, 0.03, 0.55, Math.PI / 2));
  rifle.add(m(cyl(0.045, 0.045, 0.22, 8), mat(0x6ad8ff, { e: 0x2a9aff, ei: 1.2 }), 0, 0.1, 0.2, Math.PI / 2));
  rifle.position.set(0, -0.02, 0.08);
  p.handR.add(rifle);
  return { ...f, extra: { rifle } };
}

function buildKouji() {
  const f = figure({ skin: 0xe8c09c, top: 0xf2efe8, sleeves: 0x2a2a34, pants: 0x4a3a2a, boots: 0x3a2618,
    face: { iris: '#3ab0b0', irisLight: '#c8ffff', lash: '#2a1810', brow: '#3a2010', beard: '#3a2214', mouth: '#7a3a2a' } });
  const p = f.parts;
  const hair = mat(0x4a2c1c, { r: 0.55 });
  const gold = mat(0xe0b33c, { m: 0.85, r: 0.3 });
  hairCap(p.head, hair);
  // raya al medio con mechones largos que caen a los lados
  for (const s of [-1, 1]) {
    p.head.add(m(cone(0.07, 0.5, 6), hair, s * 0.19, -0.12, 0.06, Math.PI, 0, s * 0.12));
    p.head.add(m(cone(0.05, 0.22, 6), hair, s * 0.09, 0.1, 0.2, Math.PI - 0.5, 0, s * 0.5));
  }
  longHair(p.head, hair, 0.55, 0.24);
  // moño con cinta dorada
  p.head.add(m(sph(0.1, 12), hair, 0, 0.27, -0.06));
  p.head.add(m(tor(0.07, 0.02, Math.PI * 2, 6), gold, 0, 0.22, -0.05, Math.PI / 2 - 0.3));
  // abrigo oscuro abierto sobre camisa blanca, bufanda roja
  const coat = mat(0x2a2a34, { r: 0.65 });
  for (const s of [-1, 1]) p.body.add(m(box(0.17, 0.5, 0.42), coat, s * 0.14, 1.33, -0.01));
  p.body.add(m(cyl(0.2, 0.36, 0.55, 14), coat, 0, 0.82, -0.02));
  const red = mat(0xc02a2a, { r: 0.6 });
  p.body.add(m(tor(0.1, 0.05, Math.PI * 2, 8), red, 0, 1.64, 0.02, Math.PI / 2));
  p.body.add(m(box(0.09, 0.4, 0.04), red, 0.06, 1.42, 0.2, 0.1, 0, 0.15));
  p.body.add(m(box(0.4, 0.06, 0.3), mat(0xd8a830), 0, 1.08, 0)); // faja amarilla
  // arco que brilla en cian y carcaj de flechas de fuego
  const glowM = mat(0x6ae8ff, { e: 0x2ab8ff, ei: 1.3 });
  const bow = new THREE.Group();
  bow.add(m(tor(0.55, 0.025, Math.PI * 0.9, 6), mat(0x6a4a2a, { r: 0.5 }), 0, 0, 0, 0, 0, Math.PI * 0.55));
  bow.add(m(tor(0.55, 0.012, Math.PI * 0.9, 4), glowM, 0, 0, 0.005, 0, 0, Math.PI * 0.55));
  bow.add(m(cyl(0.004, 0.004, 1.0, 3), mat(0xffffff), -0.04, 0, 0));
  bow.position.set(0, 0, 0.06); bow.rotation.set(0, Math.PI / 2, 0);
  p.handL.add(bow);
  const quiver = new THREE.Group();
  quiver.add(m(cyl(0.07, 0.06, 0.5), mat(0x5a3a22), 0, 0, 0));
  for (let i = 0; i < 4; i++) quiver.add(m(cone(0.025, 0.08, 4), mat(0xff7a2a, { e: 0xff4a00, ei: 1.4 }), -0.03 + i * 0.02, 0.29, 0));
  quiver.position.set(0.12, 1.4, -0.22); quiver.rotation.z = -0.4;
  p.body.add(quiver);
  return { ...f, extra: { bow } };
}

function buildGrimdarkus() {
  const f = figure({ skin: 0xf0d2b8, top: 0x7a5a30, sleeves: 0x6a4a28, pants: 0x3a2a1a, boots: 0x2a1c10, topM: 0.8, topR: 0.35, gloves: 0x5a4020,
    face: { iris: '#c87a30', lash: '#3a2410', brow: '#a08050', closed: true, frown: true } });
  const p = f.parts;
  const hair = mat(0xdcbc88, { r: 0.5 });
  const bronze = mat(0x9a7438, { m: 0.85, r: 0.35 });
  hairCap(p.head, hair); bangs(p.head, hair, 7, 0.2, 0.42);
  longHair(p.head, hair, 1.0, 0.32);
  // melena voluminosa con mechones de punta hacia atrás
  for (let i = 0; i < 7; i++) p.head.add(m(cone(0.08, 0.5, 6), hair, -0.18 + i * 0.06, -0.05, -0.2, 1.2 + (i % 2) * 0.2, 0, (i - 3) * 0.12));
  sideLocks(p.head, hair, 0.55);
  // grandes cuernos de carnero
  ramHorns(p.head, mat(0x5a3a28, { r: 0.6 }), mat(0x3a2418), 1.6);
  // armadura de bronce con hombreras grandes
  p.body.add(sc(m(cyl(0.26, 0.21, 0.38, 14), bronze, 0, 1.4, 0), 1, 1, 0.92));
  for (const s of [-1, 1]) {
    p.body.add(sc(m(sph(0.17, 12), bronze, s * 0.3, 1.6, 0), 1.2, 0.8, 1.1));
    p.body.add(m(cone(0.05, 0.16, 6), bronze, s * 0.38, 1.7, 0, 0, 0, -s * 0.7));
  }
  p.body.add(m(cyl(0.22, 0.34, 0.45, 14), mat(0x3a2a1a, { r: 0.7 }), 0, 0.85, 0));
  const cape = m(capeGeo(0.7, 1.3, 0.3, 0.4), mat(0x2a1a18, { r: 0.8, side: DS }), 0, 0.98, -0.24);
  p.body.add(cape);
  // el cubo azul de Lucavi flotando a su lado
  const cube = m(box(0.22, 0.22, 0.22), mat(0x4a9aff, { e: 0x2a6aff, ei: 1.6, r: 0.2, m: 0.3 }), 0.55, 1.95, 0.1);
  p.body.add(cube);
  const anim = (t, u) => { cape.rotation.x = 0.06 + (u.moving ? 0.22 : 0.03) + Math.sin(t * 2.5) * 0.03; };
  return { ...f, extra: { spin: [cube], cape, anim } };
}

// Katana: hoja curva (tubo a lo largo de una curva), tsuba redonda y empuñadura forrada
function katana(edgeGlow) {
  const g = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(0, 0.62, -0.02), new THREE.Vector3(0, 1.12, -0.11));
  const bladeG = geo('katanaBlade', () => {
    const tg = new THREE.TubeGeometry(curve, 16, 0.022, 6, false);
    tg.scale(1, 1, 1.6); // hoja más ancha que gruesa
    return tg;
  });
  g.add(m(bladeG, mat(0xeef0f6, { m: 0.95, r: 0.12 })));
  if (edgeGlow) g.add(m(geo('katanaEdge', () => new THREE.TubeGeometry(curve, 16, 0.009, 4, false)), mat(0xff6a2a, { e: 0xff3a00, ei: 1.6 }), 0, 0, 0.03));
  g.add(m(cone(0.022, 0.08, 4), mat(0xeef0f6, { m: 0.95, r: 0.12 }), 0, 1.15, -0.13, -0.25));
  g.add(m(cyl(0.065, 0.065, 0.02, 16), mat(0x2a2016, { m: 0.6, r: 0.4 }), 0, 0.1, 0)); // tsuba
  g.add(m(cyl(0.024, 0.024, 0.28, 8), mat(0x1a1214), 0, -0.06, 0)); // empuñadura
  for (let i = 0; i < 5; i++) g.add(m(box(0.05, 0.012, 0.05), mat(0xb01a2a), 0, -0.17 + i * 0.05, 0, 0, Math.PI / 4, 0));
  g.add(m(cyl(0.028, 0.028, 0.03, 8), mat(0xc8a040, { m: 0.8 }), 0, -0.21, 0));
  g.rotation.x = Math.PI / 2;
  g.position.set(0, -0.02, 0.05);
  return g;
}

function buildIkaruus() {
  const f = figure({ skin: 0xf6d6c0, top: 0x1e1a24, sleeves: 0x1e1a24, pants: 0x141218, boots: 0x141218, elf: true,
    face: { iris: '#ff3040', irisLight: '#ffd0d0', lash: '#2a0a10', brow: '#a01a28', glow: 'rgba(255,40,60,0.8)', frown: true } });
  const p = f.parts;
  const hair = mat(0xd02a3a, { r: 0.5 });
  const hairD = mat(0xa81828, { r: 0.55 });
  hairCap(p.head, hair); bangs(p.head, hair, 7, 0.2);
  // melena roja larga y abundante, con mechones al viento
  longHair(p.head, hair, 1.15, 0.32);
  sideLocks(p.head, hair, 0.6);
  for (let i = 0; i < 9; i++) {
    const t = i / 8 - 0.5;
    p.head.add(m(cone(0.08, 0.7, 6), i % 2 ? hair : hairD, t * 0.46, -0.25 - Math.abs(t) * 0.1, -0.2 - (1 - Math.abs(t)) * 0.05, 0.25 + Math.abs(t) * 0.3, 0, t * 0.5 + Math.PI));
  }
  // sombrero de paja (kasa), más pequeño
  const straw = mat(0xa8865a, { r: 0.9 });
  p.head.add(m(cone(0.36, 0.2, 20), straw, 0, 0.27, -0.01));
  p.head.add(m(cyl(0.2, 0.21, 0.04, 16), mat(0x3a1a1a), 0, 0.2, 0));
  // kimono oscuro con detalles rojos y hakama
  const red = mat(0xb01a2a, { r: 0.6 });
  p.body.add(m(box(0.05, 0.42, 0.02), red, -0.05, 1.38, 0.22, 0, 0, 0.35));
  p.body.add(m(cyl(0.2, 0.2, 0.08), red, 0, 1.1, 0));
  p.body.add(m(cyl(0.2, 0.4, 0.6, 14), mat(0x141218, { r: 0.7 }), 0, 0.78, 0));
  const k = katana(true);
  p.handR.add(k);
  // saya (vaina) a la cintura
  p.body.add(m(cyl(0.028, 0.024, 1.0, 8), mat(0x1a1214, { r: 0.4, m: 0.3 }), -0.22, 0.95, 0.05, 0.4, 0, 1.2));
  return { ...f, extra: { katana: k } };
}

function buildCrixus() {
  const f = figure({ skin: 0xf0d8c8, top: 0x26262c, sleeves: 0x26262c, pants: 0x1c1c22, boots: 0x141418, topM: 0.7, topR: 0.4, gloves: 0x1c1c22,
    face: { iris: '#40ff80', irisLight: '#e0ffe8', irisDark: '#0a3a18', lash: '#0a0a0e', brow: '#141418', glow: 'rgba(60,255,120,0.6)', frown: true } });
  const p = f.parts;
  const hair = mat(0x141418, { r: 0.6 });
  hairCap(p.head, hair); bangs(p.head, hair, 5, 0.22, 0.3);
  longHair(p.head, hair, 0.85, 0.27); sideLocks(p.head, hair, 0.55);
  // armadura pesada de Komódo con grietas verdes
  const plate = mat(0x2e2e34, { m: 0.8, r: 0.35 });
  const crack = mat(0x40ff80, { e: 0x20d060, ei: 1.5 });
  p.body.add(sc(m(cyl(0.26, 0.21, 0.38, 14), plate, 0, 1.4, 0), 1, 1, 0.92));
  for (const s of [-1, 1]) {
    p.body.add(sc(m(sph(0.16, 12), plate, s * 0.29, 1.6, 0), 1.15, 0.8, 1.05));
    p.body.add(m(box(0.012, 0.22, 0.01), crack, s * 0.08, 1.4, 0.235, 0, 0, s * 0.4));
  }
  p.body.add(m(cyl(0.22, 0.32, 0.45, 14), plate, 0, 0.85, 0));
  const cape = m(capeGeo(0.66, 1.25, 0.35, 0.5), mat(0x101014, { r: 0.85, side: DS }), 0, 0.98, -0.24);
  p.body.add(cape);
  // espadón «Lady Evangeline»: un filo de fuego y otro de necrosis
  const sw = new THREE.Group();
  sw.add(m(box(0.06, 1.2, 0.025), mat(0xff7a2a, { e: 0xff4a00, ei: 1.3 }), -0.03, 0.72, 0));
  sw.add(m(box(0.06, 1.2, 0.025), mat(0x40ff80, { e: 0x20c050, ei: 1.3 }), 0.03, 0.72, 0));
  sw.add(m(box(0.34, 0.06, 0.07), plate, 0, 0.1, 0));
  sw.add(m(cyl(0.03, 0.03, 0.24), mat(0x2a1a14), 0, -0.04, 0));
  sw.rotation.x = Math.PI / 2; sw.position.set(0, -0.02, 0.05);
  p.handR.add(sw);
  const anim = (t, u) => { cape.rotation.x = 0.06 + (u.moving ? 0.24 : 0.03) + Math.sin(t * 2.8) * 0.03; };
  return { ...f, extra: { sword: sw, cape, anim } };
}

function buildLegna() {
  const f = figure({ skin: 0x8a5a36, top: 0x141814, sleeves: 0x141814, pants: 0x101210, boots: 0x0c0e0c,
    face: { iris: '#e8c020', irisLight: '#fff4b0', irisDark: '#5a3a00', lash: '#0a0a0a', brow: '#141414', mouth: '#4a2418', frown: true } });
  const p = f.parts;
  const hair = mat(0x141414, { r: 0.55 });
  const green = mat(0x30c050, { r: 0.5 });
  hairCap(p.head, hair, 0.255);
  // pelo de punta con un mechón verde a la derecha (como en su token)
  for (let i = 0; i < 9; i++) {
    const t = i / 8 - 0.5;
    p.head.add(m(cone(0.07, 0.26, 6), i >= 7 ? green : hair, t * 0.4, 0.22, -0.02 - Math.abs(t) * 0.1, -0.35, 0, -t * 1.4));
  }
  bangs(p.head, hair, 5, 0.18, 0.3);
  p.head.add(m(cone(0.06, 0.24, 6), green, 0.15, 0.1, 0.14, Math.PI - 0.4, 0, -0.5));
  // ropa negra de cuello alto con verde y bordados dorados
  const gold = mat(0xd8b030, { m: 0.8, r: 0.35 });
  const dkGreen = mat(0x1e6a2a, { r: 0.55 });
  p.body.add(m(cyl(0.11, 0.13, 0.12, 12), mat(0x141814), 0, 1.68, 0));
  p.body.add(m(box(0.2, 0.36, 0.05), dkGreen, 0, 1.38, 0.2));
  for (let i = 0; i < 3; i++) p.body.add(m(box(0.16, 0.015, 0.01), gold, 0, 1.28 + i * 0.09, 0.23));
  p.body.add(m(cyl(0.2, 0.38, 0.6, 14), mat(0x141814, { r: 0.6 }), 0, 0.8, 0));
  p.body.add(m(tor(0.375, 0.015, Math.PI * 2, 6), gold, 0, 0.51, 0, Math.PI / 2));
  for (const s of [-1, 1]) p.body.add(m(tor(0.11, 0.015, Math.PI, 6), gold, s * 0.27, 1.6, 0, 0, Math.PI / 2, 0));
  // báculo con luz y disco solar a la espalda
  const staff = new THREE.Group();
  staff.add(m(cyl(0.025, 0.03, 1.5, 6), mat(0x3a2a1a), 0, 0.4, 0));
  staff.add(m(oct(0.09), mat(0xfff2a0, { e: 0xffd040, ei: 1.8 }), 0, 1.2, 0));
  staff.add(m(tor(0.1, 0.012, Math.PI * 2, 4), gold, 0, 1.2, 0));
  staff.rotation.x = Math.PI / 2.4; staff.position.set(0, 0, 0.05);
  p.handR.add(staff);
  const sun = new THREE.Group();
  sun.add(m(tor(0.32, 0.025, Math.PI * 2, 6), gold, 0, 0, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    sun.add(m(cone(0.035, 0.12, 4), mat(0xffe08a, { e: 0xffc040, ei: 1.2 }), Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0, 0, 0, a - Math.PI / 2));
  }
  sun.position.set(0, 1.75, -0.3);
  p.body.add(sun);
  return { ...f, extra: { wheel: sun } };
}

function buildCatarina() {
  const f = figure({ female: true, skin: 0xfbe4dc, top: 0xf2f2f6, sleeves: 0xf2f2f6, pants: 0xf2f2f6, boots: 0x16161c,
    face: { female: true, iris: '#ff2a3a', irisLight: '#ffd0d0', irisDark: '#5a0010', lash: '#2a2a3a', brow: '#d8d8e8', glow: 'rgba(255,40,60,0.55)' } });
  const p = f.parts;
  const hair = mat(0xf4f4ff, { r: 0.45 });
  const gold = mat(0xe0b33c, { m: 0.85, r: 0.3 });
  hairCap(p.head, hair); bangs(p.head, hair, 7, 0.2); longHair(p.head, hair, 1.0, 0.3); sideLocks(p.head, hair, 0.55);
  // gorra militar blanca con visera negra, banda dorada y emblema rojo
  const cap = new THREE.Group();
  cap.add(m(cyl(0.29, 0.24, 0.12, 20), mat(0xf6f6fa, { r: 0.5 }), 0, 0.08, 0));
  cap.add(m(cyl(0.245, 0.245, 0.06, 20), mat(0x1a1a22), 0, 0.0, 0));
  cap.add(m(tor(0.245, 0.012, Math.PI * 2, 6), gold, 0, 0.03, 0, Math.PI / 2));
  const visor = m(cyl(0.2, 0.2, 0.02, 20, 1), mat(0x101016, { m: 0.4, r: 0.3 }), 0, -0.02, 0.14);
  visor.scale.set(1, 1, 0.6); cap.add(visor);
  cap.add(m(box(0.12, 0.05, 0.02), mat(0xc01a2a, { e: 0x600010, ei: 0.5 }), 0, 0.09, 0.27));
  cap.position.set(0, 0.2, 0); cap.rotation.x = -0.12;
  p.head.add(cap);
  // uniforme blanco con botones y charreteras dorados
  for (let i = 0; i < 4; i++) p.body.add(m(sph(0.018, 6), gold, 0.05, 1.22 + i * 0.09, 0.22));
  p.body.add(m(box(0.18, 0.12, 0.04), mat(0xf6f6fa), 0, 1.6, 0.13)); // cuello alto
  for (const s of [-1, 1]) {
    p.body.add(m(box(0.16, 0.03, 0.12), gold, s * 0.27, 1.65, 0));
    for (let i = 0; i < 4; i++) p.body.add(m(cyl(0.008, 0.008, 0.08, 3), gold, s * (0.21 + i * 0.035), 1.6, 0.05));
  }
  p.body.add(m(cyl(0.2, 0.34, 0.5, 14), mat(0xf2f2f6, { r: 0.55 }), 0, 0.86, 0));
  p.body.add(m(cyl(0.205, 0.205, 0.05), mat(0x1a1a22), 0, 1.1, 0));
  // espada de hielo translúcida
  const sw = sword(mat(0xb8f4ff, { e: 0x40c0ff, ei: 0.9, op: 0.8, r: 0.1 }), gold, 1.05, 0.08);
  p.handR.add(sw.g);
  return { ...f, extra: { sword: sw.g } };
}

export const HERO_BUILDERS_V2 = {
  josephine: buildJosephine, fotsor: buildFotsor, yeslie: buildYeslie, astrid: buildAstrid, kouji: buildKouji,
  grimdarkus: buildGrimdarkus, ikaruus: buildIkaruus, crixus: buildCrixus, legna: buildLegna, catarina: buildCatarina,
};
