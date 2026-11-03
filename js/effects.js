// Efectos visuales: partículas, anillos, rayos y proyectiles.
import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.rings = [];
    this.lines = [];
    this.sphereGeo = new THREE.SphereGeometry(1, 6, 4);
    this.ringGeo = new THREE.RingGeometry(0.92, 1, 48);
    this.discGeo = new THREE.CircleGeometry(1, 48);
    this.pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
    this.basicMats = new Map();
    this.glowMats = new Map();
    this.sprites = [];
    this.pillars = [];
    this.glowTex = glowTexture();
    this.fadeTex = fadeTexture();
    // Luces de destello reutilizables: se crean una sola vez para que three.js
    // no tenga que recompilar los materiales cada vez que aparece una.
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2);
      l.position.set(0, -50, 0);
      scene.add(l);
      this.lights.push({ l, life: 0, max: 1, peak: 0 });
    }
  }

  // Los colores claros se suman a la escena (brillan); los oscuros se pintan normal.
  basic(color) {
    if (!this.basicMats.has(color)) {
      const c = new THREE.Color(color);
      const bright = c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.3;
      this.basicMats.set(color, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9, depthWrite: false,
        blending: bright ? THREE.AdditiveBlending : THREE.NormalBlending,
      }));
    }
    return this.basicMats.get(color);
  }

  glowMat(color) {
    if (!this.glowMats.has(color)) {
      this.glowMats.set(color, new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    }
    return this.glowMats.get(color);
  }

  // Esfera brillante para proyectiles, con halo
  orb(color, size = 0.25) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.sphereGeo, this.basic(0xffffff));
    core.scale.setScalar(size * 0.55);
    const glow = new THREE.Mesh(this.sphereGeo, this.basic(color));
    glow.scale.setScalar(size);
    const halo = new THREE.Sprite(this.glowMat(color));
    halo.scale.setScalar(size * 6);
    g.add(core, glow, halo);
    this.scene.add(g);
    return g;
  }

  // Halo suave (sprite) que crece y se desvanece
  glow(pos, color, size = 3, life = 0.4, y = 1) {
    if (this.sprites.length > 60) return;
    const m = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(m);
    s.position.set(pos.x, y, pos.z);
    s.scale.setScalar(size * 0.5);
    this.scene.add(s);
    this.sprites.push({ s, life, max: life, size });
  }

  // Destello de luz real: ilumina el suelo y los modelos cercanos
  flash(pos, color, intensity = 40, distance = 12, life = 0.35) {
    let slot = this.lights.find((x) => x.life <= 0);
    if (!slot) slot = this.lights.reduce((a, b) => (a.life < b.life ? a : b));
    slot.l.color.set(color);
    slot.l.distance = distance;
    slot.l.position.set(pos.x, 2, pos.z);
    slot.peak = intensity;
    slot.life = slot.max = life;
    slot.l.intensity = intensity;
  }

  // Columna de luz vertical (curaciones, definitivas, transformaciones)
  pillar(pos, color, life = 0.7, radius = 1.2, height = 9) {
    const m = new THREE.MeshBasicMaterial({ color, map: this.fadeTex, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const c = new THREE.Mesh(this.pillarGeo, m);
    c.position.set(pos.x, height / 2, pos.z);
    c.scale.set(radius, height, radius);
    this.scene.add(c);
    this.pillars.push({ c, life, max: life, radius, height });
  }

  // Onda expansiva: anillo grueso + disco tenue
  shockwave(pos, radius, color, life = 0.45) {
    this.ring(pos, radius, color, life, { grow: true, opacity: 1 });
    this.ring(pos, radius * 0.92, color, life * 0.8, { grow: true, fill: true, opacity: 0.25 });
  }

  // Impacto completo: halo + luz + chispas + onda
  impact(pos, color, scale = 1) {
    this.glow(pos, color, 4 * scale, 0.35, 1);
    this.flash(pos, color, 18 * scale, 7 + 3 * scale, 0.3);
    this.burst(pos, color, Math.round(12 * scale), 4 * scale, 0.13, 0.5, 1.5);
    this.shockwave(pos, 1.6 * scale, color, 0.4);
  }

  remove(obj) {
    this.scene.remove(obj);
  }

  burst(pos, color, n = 10, speed = 4, size = 0.14, life = 0.5, up = 1.5) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 500) break;
      const m = new THREE.Mesh(this.sphereGeo, this.basic(color));
      m.scale.setScalar(size);
      m.position.set(pos.x, (pos.y ?? 0) + 0.3, pos.z);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ m, vx: Math.cos(a) * s, vy: up * (0.5 + Math.random()) * 2, vz: Math.sin(a) * s, life, max: life, size });
      this.scene.add(m);
    }
  }

  // Partícula suelta que sube (fuego, chispas)
  spark(pos, color, size = 0.1, life = 0.6, vy = 2) {
    if (this.parts.length > 500) return;
    const m = new THREE.Mesh(this.sphereGeo, this.basic(color));
    m.scale.setScalar(size);
    m.position.copy(pos);
    this.parts.push({ m, vx: (Math.random() - 0.5) * 0.6, vy, vz: (Math.random() - 0.5) * 0.6, life, max: life, size, noGrav: true });
    this.scene.add(m);
  }

  // Anillo en el suelo. fill = disco relleno. telegraph: aparece y se queda.
  ring(pos, radius, color, life = 0.5, o = {}) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 0.8, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(o.fill ? this.discGeo : this.ringGeo, material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, (o.y ?? 0.06) + this.rings.length * 0.0005, pos.z);
    m.scale.setScalar(o.grow ? radius * 0.3 : radius);
    this.scene.add(m);
    const r = { m, life, max: life, radius, grow: !!o.grow, base: o.opacity ?? 0.8, follow: o.follow, steady: !!o.steady };
    this.rings.push(r);
    return r;
  }

  // Línea quebrada tipo rayo
  lightning(a, b, color = 0x9ad8ff, life = 0.25) {
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      if (i > 0 && i < n) { p.x += (Math.random() - 0.5) * 0.8; p.y += (Math.random() - 0.5) * 0.8; p.z += (Math.random() - 0.5) * 0.8; }
      pts.push(p);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
    const l = new THREE.Line(g, m);
    this.scene.add(l);
    this.lines.push({ l, life, max: life });
  }

  beam(a, b, color = 0xffffff, life = 0.15) {
    const g = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
    const l = new THREE.Line(g, m);
    this.scene.add(l);
    this.lines.push({ l, life, max: life });
  }

  update(dt) {
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const p = this.sprites[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.s); p.s.material.dispose(); this.sprites.splice(i, 1); continue; }
      const k = 1 - p.life / p.max;
      p.s.scale.setScalar(p.size * (0.5 + 0.5 * Math.min(1, k * 3)));
      p.s.material.opacity = 1 - k * k;
    }
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const p = this.pillars[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.c); p.c.material.dispose(); this.pillars.splice(i, 1); continue; }
      const k = 1 - p.life / p.max;
      const r = p.radius * (1 - k * 0.7);
      p.c.scale.set(r, p.height, r);
      p.c.material.opacity = 0.45 * (1 - k);
    }
    for (const x of this.lights) {
      if (x.life <= 0) continue;
      x.life -= dt;
      x.l.intensity = x.life > 0 ? x.peak * (x.life / x.max) : 0;
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.m); this.parts.splice(i, 1); continue; }
      if (!p.noGrav) p.vy -= 9 * dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt);
      p.m.position.z += p.vz * dt;
      p.m.scale.setScalar(p.size * (p.life / p.max));
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.scene.remove(r.m); r.m.material.dispose(); this.rings.splice(i, 1); continue; }
      const k = 1 - r.life / r.max;
      if (r.grow) r.m.scale.setScalar(r.radius * (0.3 + 0.7 * Math.min(1, k * 2.5)));
      if (r.follow) { r.m.position.x = r.follow.pos.x; r.m.position.z = r.follow.pos.z; }
      r.m.material.opacity = r.steady ? r.base * Math.min(1, r.life * 4) : r.base * (1 - k * k);
    }
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      l.life -= dt;
      if (l.life <= 0) { this.scene.remove(l.l); l.l.geometry.dispose(); l.l.material.dispose(); this.lines.splice(i, 1); continue; }
      l.l.material.opacity = l.life / l.max;
    }
  }
}

// Textura de halo: degradado radial blanco que se tiñe con el color del sprite
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Degradado vertical para las columnas de luz: intenso abajo, invisible arriba
function fadeTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
