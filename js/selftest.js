// Autoprueba: abre el juego con ?selftest=1 (por ejemplo
// http://localhost:8770/?selftest=1&hero=kouji) y en unos segundos la página muestra
// un informe JSON en <pre id="selftest">, y el título pasa a "SELFTEST OK" o
// "SELFTEST FAIL". Comprueba:
//   1. qué archivos opcionales existen (retratos, tokens, iconos, sonidos, .glb);
//   2. que las 4 habilidades de cada héroe se lanzan sin errores y hacen efecto;
//   3. una partida 7 contra 7 simulada de varios minutos, solo con bots.
// Pensada para Claude (en la nube o en local) y para cualquiera que toque el código.
import { HEROES, HERO_ORDER, ITEMS, MODEL_GLB } from './config.js';
import { loadedGLB, failedGLB } from './models.js';
import { probe } from './audio.js';

const exists = async (url) => { try { return (await fetch(url, { method: 'HEAD' })).ok; } catch { return false; } };

export async function runSelftest(makeGame, minutes = 4) {
  const report = { ok: true, errors: [], assets: {}, abilities: {}, sim: {} };
  const fail = (msg) => { report.ok = false; report.errors.push(msg); };
  const onErr = (e) => fail('error de página: ' + (e.error?.stack || e.message || e.reason || e).toString().split('\n').slice(0, 3).join(' | '));
  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onErr);

  // 1. archivos opcionales
  const A = report.assets;
  A.retratos = []; A.tokens = []; A.iconosHabilidad = 0; A.iconosObjeto = [];
  for (const id of [...HERO_ORDER, 'lorik']) {
    if (await exists(`img/retratos/${id}.webp`)) A.retratos.push(id);
    if (await exists(`tokens/${id}.webp`)) A.tokens.push(id);
  }
  for (const id of HERO_ORDER) {
    const def = HEROES[id];
    for (const a of [def.passive, ...def.abilities]) if (await exists(`img/habilidades/${a.id}.svg`)) A.iconosHabilidad++;
  }
  for (const id of Object.keys(ITEMS)) if (await exists(`img/objetos/${id}.webp`)) A.iconosObjeto.push(id);
  A.musica = await probe(['menu', 'batalla', 'lorik', 'victoria', 'derrota'], 'musica');
  const common = ['golpe_espada', 'golpe_puno', 'disparo_flecha', 'disparo_magia', 'disparo_arma_fuego', 'critico', 'torre_dispara', 'torre_destruida',
    'heroe_muere', 'subir_nivel', 'oro', 'comprar', 'pocion', 'reaparecer', 'lorik_raices', 'lorik_invoca', 'aviso', 'clic'];
  A.efectosComunes = await probe(common, 'efectos');
  A.efectosHabilidad = await probe(HERO_ORDER.flatMap((id) => ['q', 'w', 'e', 'r'].map((k) => `${id}_${k}`)), 'efectos');

  // 2. habilidades de cada héroe (en una partida 1 contra 1 aparte)
  const g = makeGame({ mode: '1v1' });
  const V = g.player.pos.constructor;
  for (const id of HERO_ORDER) {
    const u = g.makeHero(id, 'blue', false, 0, 'mid');
    const e = g.makeHero('grimdarkus', 'red', false, 1, 'mid');
    for (const x of [u, e]) { x.isBot = false; x.level = 16; g.recalc(x, true); }
    u.pos.set(-20, 0, 0); e.pos.set(-15, 0, 1);
    u.abilities.forEach((a, i) => { a.rank = i === 3 ? 3 : 5; });
    const res = [];
    try {
      for (let i = 0; i < 4; i++) {
        u.mp = u.maxMp; u.abilities[i].cd = 0; u.dash = null; u.channel = null;
        if (!e.alive) { e.alive = true; e.hp = e.maxHp; }
        const before = e.hp;
        const ok = g.castAbility(u, i, e.pos.clone(), e);
        for (let k = 0; k < 60; k++) { g.update(1 / 30); g.syncVisuals(1 / 30); }
        res.push(ok ? (e.hp < before || !e.alive ? 'daño' : 'ok') : 'NO');
        if (!ok) fail(`${id}: la habilidad ${'QWER'[i]} no se pudo lanzar`);
      }
    } catch (err) { fail(`${id}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); }
    report.abilities[id] = res.join(' ');
    for (const x of [u, e]) { x.alive = false; g.scene.remove(x.model.group); g.scene.remove(x.ringMesh); g.heroes.splice(g.heroes.indexOf(x), 1); g.units.splice(g.units.indexOf(x), 1); }
  }
  void V;

  // 3. partida simulada 7 contra 7 con bots
  const s = makeGame({ mode: '7v7', auto: true });
  const S = report.sim;
  const towers = [];
  s.on('towerDestroyed', ({ tower }) => towers.push(`${Math.round(s.time)}s ${tower.name}`));
  const t0 = performance.now();
  let maxUnits = 0;
  try {
    for (let i = 0; i < minutes * 60 * 20 && !s.over; i++) {
      s.update(1 / 20);
      if (i % 10 === 0) s.syncVisuals(0.5);
      maxUnits = Math.max(maxUnits, s.units.length);
    }
  } catch (err) { fail('simulación: ' + err.stack.split('\n').slice(0, 3).join(' | ')); }
  S.minutos = Math.round(s.time / 6) / 10;
  S.msPorPaso = Math.round(((performance.now() - t0) / Math.max(1, s.time * 20)) * 100) / 100;
  S.unidadesMax = maxUnits;
  S.muertes = { azul: s.heroes.filter((h) => h.team === 'blue').reduce((a, h) => a + h.kills, 0), rojo: s.heroes.filter((h) => h.team === 'red').reduce((a, h) => a + h.kills, 0) };
  S.torresCaidas = towers;
  S.final = s.over || 'en curso';
  const idle = s.heroes.filter((h) => h.alive && h.pos.distanceTo(h.model.group.position) > 50);
  if (idle.length) fail('hay modelos de héroe desincronizados de su posición');
  if (maxUnits < 30) fail('salieron muy pocos súbditos en la simulación');

  // 4. modelos .glb configurados (se espera un poco a que terminen de cargar)
  const specs = [...HERO_ORDER.map((id) => HEROES[id].glb), ...Object.values(MODEL_GLB)].filter(Boolean);
  const urls = [...new Set(specs.map((x) => x.url))];
  for (let k = 0; k < 40 && urls.some((u) => !loadedGLB.has(u) && !failedGLB.has(u)); k++) await new Promise((r) => setTimeout(r, 250));
  A.glbCargados = urls.filter((u) => loadedGLB.has(u));
  A.glbFallidos = Object.fromEntries(urls.filter((u) => failedGLB.has(u)).map((u) => [u, failedGLB.get(u)]));
  for (const u of Object.keys(A.glbFallidos)) fail('no carga el modelo ' + u);

  window.removeEventListener('error', onErr);
  window.removeEventListener('unhandledrejection', onErr);
  return report;
}
