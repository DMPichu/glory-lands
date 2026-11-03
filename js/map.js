// Geometría de los carriles: medir el avance de una unidad por su carril,
// convertir ese avance en una posición y elegir el siguiente punto del camino.
// «s» es la distancia recorrida desde la base azul (0) hasta la roja (largo del carril).
import { LANES } from './config.js';

const INFO = {};
for (const [lane, pts] of Object.entries(LANES)) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  INFO[lane] = { pts, cum, len: cum[cum.length - 1] };
}

export function laneLength(lane) {
  return INFO[lane].len;
}

export function lanePoint(lane, s) {
  const { pts, cum, len } = INFO[lane];
  s = Math.max(0, Math.min(len, s));
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, z: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k };
}

// Proyección de un punto sobre el carril: avance «s» y distancia «d» al camino
export function laneProject(lane, x, z) {
  const { pts, cum } = INFO[lane];
  let best = { s: 0, d: Infinity };
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], az = pts[i - 1][1];
    const dx = pts[i][0] - ax, dz = pts[i][1] - az;
    const l2 = dx * dx + dz * dz;
    const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const px = ax + dx * k, pz = az + dz * k;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { s: cum[i - 1] + Math.sqrt(l2) * k, d };
  }
  return best;
}

export function nearestLane(x, z) {
  let best = null;
  for (const lane of Object.keys(LANES)) {
    const p = laneProject(lane, x, z);
    if (!best || p.d < best.d) best = { lane, ...p };
  }
  return best;
}

// Siguiente punto del camino en el sentido de avance (dir = 1 azul, -1 rojo)
export function nextWaypoint(lane, s, dir) {
  const { pts, cum } = INFO[lane];
  if (dir > 0) {
    for (let i = 0; i < pts.length; i++) if (cum[i] > s + 2) return { x: pts[i][0], z: pts[i][1] };
    return null;
  }
  for (let i = pts.length - 1; i >= 0; i--) if (cum[i] < s - 2) return { x: pts[i][0], z: pts[i][1] };
  return null;
}

// Distancia de un punto al carril más cercano (para la decoración)
export function distToLanes(x, z) {
  return nearestLane(x, z).d;
}
