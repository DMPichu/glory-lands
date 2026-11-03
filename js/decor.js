// Decorado extra del mapa: bordillos de piedra a lo largo de los carriles, estandartes
// de cada bando y círculos de piedras rúnicas con hoguera en los campamentos de la
// jungla. Todo es visual (no bloquea el paso) e instanciado para que pese poco.
import * as THREE from 'three';
import { LANES, MAP, CAMPS, EPIC_CAMPS } from './config.js';

export function buildDecor(scene) {
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  // --- bordillos de piedra a los dos lados de cada carril
  const stones = [];
  for (const pts of Object.values(LANES)) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      const nx = -(bz - az) / len, nz = (bx - ax) / len;
      for (let d = 0; d < len; d += 2.4) {
        const t = d / len, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        // no poner piedras sobre el río ni dentro de las bases
        if (Math.abs(x) < 16 || Math.abs(x) > 112) continue;
        for (const side of [-1, 1]) stones.push({ x: x + nx * (MAP.laneHalf + 0.35) * side, z: z + nz * (MAP.laneHalf + 0.35) * side, ry: Math.atan2(bx - ax, bz - az), red: x > 0 });
      }
    }
  }
  const stoneM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.32, 1.9), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), stones.length);
  stones.forEach((s, i) => {
    dummy.position.set(s.x, 0.12, s.z);
    dummy.rotation.set(0, s.ry + (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.08);
    dummy.scale.set(1, 0.8 + Math.random() * 0.4, 0.9 + Math.random() * 0.2);
    dummy.updateMatrix();
    stoneM.setMatrixAt(i, dummy.matrix);
    stoneM.setColorAt(i, col.set(s.red ? 0x3a3242 : 0xb8b0a0).multiplyScalar(0.85 + Math.random() * 0.3));
  });
  stoneM.receiveShadow = true;
  scene.add(stoneM);

  // --- estandartes: azul y oro en la mitad de los Blood Hawks, carmesí en la de la Legión
  const banners = [];
  for (const pts of Object.values(LANES)) {
    let acc = 0, side = 1;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      const nx = -(bz - az) / len, nz = (bx - ax) / len;
      for (let d = 0; d < len; d += 1) {
        acc += 1;
        if (acc < 26) continue;
        acc = 0; side = -side;
        const t = d / len, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (Math.abs(x) < 18 || Math.abs(x) > 110) continue;
        banners.push({ x: x + nx * (MAP.laneHalf + 1.6) * side, z: z + nz * (MAP.laneHalf + 1.6) * side, ry: Math.atan2(bx - ax, bz - az), red: x > 0 });
      }
    }
  }
  const poleG = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6);
  const clothG = new THREE.PlaneGeometry(0.9, 1.7, 1, 4);
  const pos = clothG.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.8) pos.setX(i, pos.getX(i) * 0.5); // punta en forma de pico
  const poleM = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.6, metalness: 0.4 });
  const blueM = new THREE.MeshStandardMaterial({ color: 0x2a4aa8, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x0a1430 });
  const redM = new THREE.MeshStandardMaterial({ color: 0x8a1626, roughness: 0.8, side: THREE.DoubleSide, emissive: 0x200408 });
  const trimM = new THREE.MeshStandardMaterial({ color: 0xe0b33c, metalness: 0.8, roughness: 0.3 });
  const cloths = [];
  for (const b of banners) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(poleG, poleM); pole.position.y = 2.1; pole.castShadow = true;
    const cloth = new THREE.Mesh(clothG, b.red ? redM : blueM); cloth.position.set(0.48, 3.1, 0); cloth.castShadow = true;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), trimM); bar.position.set(0.45, 3.95, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), trimM); knob.position.y = 4.3;
    g.add(pole, cloth, bar, knob);
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.ry + Math.PI / 2;
    scene.add(g);
    cloths.push({ cloth, ph: Math.random() * 6 });
  }

  // --- campamentos: círculo de piedras rúnicas y hoguera
  const spots = [...CAMPS.flatMap((c) => [{ ...c }, { ...c, x: -c.x }]), ...EPIC_CAMPS.map((c) => ({ ...c, epic: true }))];
  const runeTex = runeTexture();
  const fires = [];
  for (const c of spots) {
    const r = c.epic ? 8.5 : 5.2;
    const g = new THREE.Group();
    const runeCol = c.epic ? (c.id === 'cadaliz' ? 0x9aff40 : 0xd040ff) : c.x < 0 ? 0x5ac8ff : 0xff5a7a;
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.3, r * 2.3), new THREE.MeshBasicMaterial({ map: runeTex, color: runeCol, transparent: true, opacity: c.epic ? 0.55 : 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.07;
    g.add(disc);
    const n = c.epic ? 10 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const h = 1 + Math.random() * (c.epic ? 2.2 : 1.2);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.45), new THREE.MeshStandardMaterial({ color: 0x6a6670, flatShading: true, roughness: 0.95 }));
      st.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      st.rotation.set((Math.random() - 0.5) * 0.15, -a, (Math.random() - 0.5) * 0.15);
      st.castShadow = true;
      g.add(st);
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({ color: runeCol, transparent: true, opacity: 0.9 }));
      rune.position.set(Math.cos(a) * (r - 0.24), h * 0.6, Math.sin(a) * (r - 0.24));
      rune.lookAt(0, h * 0.6, 0);
      g.add(rune);
    }
    if (!c.epic) {
      // hoguera junto al campamento
      const fx = r * 0.55, fz = -r * 0.55;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 5), poleM);
        log.position.set(fx + Math.cos(a) * 0.15, 0.15, fz + Math.sin(a) * 0.15);
        log.rotation.set(Math.PI / 2 - 0.5, a, 0);
        g.add(log);
      }
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
      flame.position.set(fx, 0.5, fz);
      g.add(flame);
      fires.push(flame);
    }
    g.position.set(c.x, 0, c.z);
    scene.add(g);
  }

  return {
    update(t) {
      for (const c of cloths) c.cloth.rotation.y = Math.sin(t * 1.6 + c.ph) * 0.25;
      for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        f.scale.set(1 + Math.sin(t * 13 + i) * 0.12, 0.85 + Math.sin(t * 9 + i * 2) * 0.25, 1);
      }
    },
  };
}

// Círculo de runas (blanco: se tiñe con el color del material)
function runeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.strokeStyle = '#ffffff';
  x.lineWidth = 5; x.beginPath(); x.arc(128, 128, 118, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(128, 128, 100, 0, Math.PI * 2); x.stroke();
  x.font = 'bold 18px serif'; x.fillStyle = '#ffffff'; x.textAlign = 'center';
  const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒ';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    x.save(); x.translate(128 + Math.cos(a) * 109, 128 + Math.sin(a) * 109); x.rotate(a + Math.PI / 2);
    x.fillText(glyphs[i], 0, 6); x.restore();
  }
  x.lineWidth = 2;
  x.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; (i ? x.lineTo : x.moveTo).call(x, 128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60); }
  x.closePath(); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
