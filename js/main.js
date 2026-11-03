// Punto de entrada: menú de selección, controles y bucle de renderizado.
import * as THREE from 'three';
import { HEROES, HERO_ORDER } from './config.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { abilityIcon, portrait } from './art.js';
import { unlock, playMusic, setMuted, sfx, voice } from './audio.js';
import { runSelftest } from './selftest.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

let renderer = null;
let composer = null; // post-procesado: brillo (bloom) sobre lo emisivo y los efectos
let renderPass = null;
let bloomPass = null;
let game = null;
let ui = null;
let last = 0;
let selected = params.get('hero') && HEROES[params.get('hero')] ? params.get('hero') : 'josephine';
let mode = params.get('mode') === '1v1' ? '1v1' : '7v7';
let difficulty = ['facil', 'normal', 'dificil'].includes(params.get('diff')) ? params.get('diff') : 'normal';
const speed = Math.max(1, Math.min(20, Number(params.get('speed')) || 1));

const mouse = { x: 0, y: 0, world: new THREE.Vector3(), held: false, repeatT: 0 };
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// ------------------------------------------------------------------ menú
function buildMenu() {
  const cards = $('heroCards');
  cards.innerHTML = '';
  for (const id of HERO_ORDER) {
    const h = HEROES[id];
    const el = document.createElement('div');
    el.className = 'card' + (id === selected ? ' sel' : '');
    el.style.setProperty('--hc', h.color);
    el.innerHTML = `
      <div class="cport">${portrait(h)}</div>
      <div class="cname">${h.name}</div>
      <div class="ctitle">${h.title}</div>
      <div class="crole">${h.role}</div>
      <div class="cquote">${h.quote}</div>`;
    el.onclick = () => { selected = id; sfx('clic', 0.5); voice(`${id}_elegir`); buildMenu(); };
    cards.appendChild(el);
  }
  const h = HEROES[selected];
  $('heroDetail').innerHTML = `
    <h3 style="color:${h.color}">${h.name} <span>· ${h.role}</span></h3>
    <p class="lore">${h.lore}</p>
    <div class="ab"><span class="k">${abilityIcon(h.passive.id, h.passive.icon, h.color)}</span><div><b>${h.passive.name}</b> <i>(pasiva)</i><br>${h.passive.desc}</div></div>
    ${h.abilities.map((a) => `<div class="ab"><span class="k">${abilityIcon(a.id, a.icon, h.color)}</span><div><b>${a.key} · ${a.name}</b><br>${a.desc}</div></div>`).join('')}`;
  document.querySelectorAll('.modeBtn[data-mode]').forEach((b) => b.classList.toggle('sel', b.dataset.mode === mode));
  document.querySelectorAll('.diffBtn').forEach((b) => b.classList.toggle('sel', b.dataset.diff === difficulty));
}

document.querySelectorAll('.modeBtn[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; buildMenu(); }));
document.querySelectorAll('.diffBtn').forEach((b) => (b.onclick = () => { difficulty = b.dataset.diff; buildMenu(); }));
$('playBtn').onclick = () => start();
$('againBtn').onclick = () => backToMenu();
$('menuBtn').onclick = () => backToMenu();
$('resumeBtn').onclick = () => togglePause(false);

function backToMenu() {
  if (game) { game.paused = true; game = null; }
  playMusic('menu');
  $('end').style.display = 'none';
  $('pause').style.display = 'none';
  $('hud').style.display = 'none';
  $('menu').style.display = 'flex';
  buildMenu();
}

// ------------------------------------------------------------------ inicio de partida
function start() {
  $('menu').style.display = 'none';
  $('hud').style.display = 'block';
  $('end').style.display = 'none';
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.45, 0.88);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    resize();
    requestAnimationFrame(frame);
  }
  game = new Game({ heroId: selected, mode, difficulty, autoLevel: $('autoLevel').checked, auto: params.get('auto') === '1' });
  playMusic('batalla');
  game.on('coreExposed', ({ core }) => { if (core.kind === 'boss') playMusic('lorik'); });
  ui = new UI(game);
  ui.onAbilityClick = (i) => castAt(i);
  window.__game = game;
  ui.message(`¡Bienvenida a Glory Lands! Destruye las torres y derrota a Lorik.`, 'info');
  ui.message('Clic derecho para moverte y atacar · Q W E R para las habilidades', 'info');
}

function resize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  const dpr = window.devicePixelRatio || 1;
  const ov = $('overlay');
  ov.width = Math.floor(w * dpr);
  ov.height = Math.floor(h * dpr);
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ controles
function updateMouseWorld() {
  if (!game) return;
  const ndc = new THREE.Vector2((mouse.x / window.innerWidth) * 2 - 1, -(mouse.y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, game.camera);
  raycaster.ray.intersectPlane(plane, mouse.world);
}

function enemyUnderMouse() {
  const p = game.player;
  return game.unitAt(mouse.world, (u) => u.team !== p.team && game.isTargetable(u));
}

function command() {
  const p = game.player;
  if (!p.alive || game.over) return;
  updateMouseWorld();
  const enemy = enemyUnderMouse();
  if (enemy) {
    game.orderAttack(p, enemy);
    game.fx.ring(enemy.pos, enemy.radius + 0.6, 0xff4a5a, 0.35);
  } else {
    game.orderMove(p, mouse.world);
    game.fx.ring(mouse.world, 0.7, 0x6dff8a, 0.4, { grow: true });
  }
}

function castAt(i) {
  if (!game || !game.player.alive || game.over) return;
  updateMouseWorld();
  const ok = game.castAbility(game.player, i, mouse.world.clone(), enemyUnderMouse());
  if (!ok) {
    const a = game.player.abilities[i];
    if (a.rank === 0) ui.message('Esa habilidad aún no está aprendida', 'warn');
  }
}

const view = $('view');
view.addEventListener('mousedown', (e) => {
  if (!game || game.paused) return;
  if (e.button === 2 || e.button === 0) {
    mouse.held = true;
    mouse.repeatT = 0.18;
    command();
  }
});
window.addEventListener('mouseup', () => { mouse.held = false; });
// clic en el minimapa: ir a ese punto del mapa
$('minimap').addEventListener('mousedown', (e) => {
  if (!game || game.paused || !game.player.alive) return;
  e.stopPropagation();
  const r = e.currentTarget.getBoundingClientRect();
  const w = ui.miniToWorld(((e.clientX - r.left) / r.width) * e.currentTarget.width, ((e.clientY - r.top) / r.height) * e.currentTarget.height);
  game.orderMove(game.player, new THREE.Vector3(w.x, 0, w.z));
  game.fx.ring(new THREE.Vector3(w.x, 0, w.z), 1.2, 0x6dff8a, 0.6, { grow: true });
});
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('contextmenu', (e) => e.preventDefault());
view.addEventListener('wheel', (e) => {
  if (!game) return;
  game.camZoom = Math.max(0.6, Math.min(1.5, game.camZoom + Math.sign(e.deltaY) * 0.08));
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (!game || $('menu').style.display !== 'none') return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    if (ui.shopOpen) ui.toggleShop(false);
    else togglePause();
    return;
  }
  if (game.paused) return;
  const idx = ['q', 'w', 'e', 'r'].indexOf(k);
  if (idx >= 0) {
    e.preventDefault();
    if (e.shiftKey || e.ctrlKey) game.levelAbility(game.player, idx);
    else castAt(idx);
    return;
  }
  if (k === 'p' || k === 'b') ui.toggleShop();
  else if (k === '1') game.usePotion(game.player);
  else if (k === 's') game.player.order = null;
});

function togglePause(v) {
  if (!game || game.over) return;
  game.paused = v ?? !game.paused;
  $('pause').style.display = game.paused ? 'flex' : 'none';
}

// ------------------------------------------------------------------ bucle
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (!game) return;

  for (let i = 0; i < speed; i++) game.update(dt);

  if (mouse.held && game.player.alive && !game.paused) {
    mouse.repeatT -= dt;
    if (mouse.repeatT <= 0) {
      mouse.repeatT = 0.15;
      updateMouseWorld();
      if (!enemyUnderMouse() && game.player.order?.type !== 'attack') game.orderMove(game.player, mouse.world);
    }
  }
  updateMouseWorld();
  ui.hover = game.player.alive ? enemyUnderMouse() : null;
  view.style.cursor = ui.hover ? 'crosshair' : 'default';

  if (!game.paused) game.syncVisuals(dt);
  game.updateCamera(dt, window.innerWidth / window.innerHeight);
  if ($('bloomOpt').checked && params.get('bloom') !== '0') {
    renderPass.scene = game.scene;
    renderPass.camera = game.camera;
    composer.render(dt);
  } else {
    renderer.render(game.scene, game.camera);
  }
  ui.update();

  if (game.over && (game.overT || 0) > 2.5 && $('end').style.display !== 'flex') showEnd();
}

function showEnd() {
  const win = game.over === 'victory';
  playMusic(win ? 'victoria' : 'derrota', false);
  $('end').style.display = 'flex';
  $('endTitle').textContent = win ? '¡VICTORIA!' : 'DERROTA';
  $('endTitle').className = win ? 'win' : 'lose';
  $('endText').textContent = win
    ? 'Lorik ha caído. Los Blood Hawks protegen Glory Lands un día más.'
    : 'La Torre de Zugri ha caído ante la Legión de Lorik...';
  const p = game.player;
  const t = Math.floor(game.time);
  $('endStats').innerHTML = `
    <div><b>${p.name}</b> · nivel ${p.level}</div>
    <div>Asesinatos / muertes / asistencias: <b>${p.kills} / ${p.deaths} / ${p.assists}</b></div>
    <div>Súbditos eliminados: <b>${p.cs}</b></div>
    <div>Duración: <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></div>`;
}

// ------------------------------------------------------------------ sonido
// el audio solo puede empezar tras la primera interacción
const firstTouch = () => {
  unlock();
  if ($('menu').style.display !== 'none') playMusic('menu');
  window.removeEventListener('pointerdown', firstTouch);
  window.removeEventListener('keydown', firstTouch);
};
window.addEventListener('pointerdown', firstTouch);
window.addEventListener('keydown', firstTouch);
const soundOpt = $('soundOpt');
setMuted(params.get('mute') === '1' || !soundOpt.checked);
soundOpt.onchange = () => setMuted(!soundOpt.checked);

// ------------------------------------------------------------------ autoprueba (?selftest=1)
if (params.get('selftest') === '1') {
  $('menu').style.display = 'none';
  const out = document.createElement('pre');
  out.id = 'selftest';
  out.style.cssText = 'position:fixed;inset:0;margin:0;padding:16px;overflow:auto;background:#12101a;color:#e8e2f4;font:13px/1.45 monospace;z-index:99;white-space:pre-wrap';
  out.textContent = 'Autoprueba en marcha…';
  document.body.appendChild(out);
  document.title = 'SELFTEST RUNNING';
  const minutes = Math.max(1, Math.min(20, Number(params.get('minutes')) || 4));
  runSelftest((o) => new Game({ heroId: selected, difficulty: 'normal', silent: true, autoLevel: true, ...o }), minutes)
    .then((r) => { out.textContent = JSON.stringify(r, null, 2); document.title = r.ok ? 'SELFTEST OK' : 'SELFTEST FAIL'; window.__selftest = r; })
    .catch((e) => { out.textContent = 'SELFTEST FAIL: ' + e.stack; document.title = 'SELFTEST FAIL'; });
} else {
  buildMenu();
  if (params.get('hero')) start();
}
