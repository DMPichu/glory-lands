// Núcleo del juego: unidades, combate, oleadas, estructuras y bucle principal.
import * as THREE from 'three';
import { HEROES, ITEMS, LAYOUT, MAP, CONST, MINIONS, STRUCTURES, TEAMS, HERO_ORDER, DIFFICULTY, LANES, LANE_NAMES, xpToNext } from './config.js';
import { laneLength, lanePoint } from './map.js';
import { buildHeroModel, buildMinionModel, buildStructureModel, buildWorld, buildDragon, animateModel, corrupt } from './models.js';
import { Effects } from './effects.js';
import { ABILITY_IMPL, PASSIVE_IMPL } from './abilities.js';
import { heroAI, minionAI, structureAI } from './ai.js';
import { sfx, voice } from './audio.js';
import { setupJungle, updateJungle, monsterAI, monsterHit, monsterKilled } from './jungle.js';

const TMP = new THREE.Vector3();
let NEXT_ID = 1;

export function dist2(a, b) {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export class Game {
  constructor(opts) {
    this.opts = opts;
    this.diff = DIFFICULTY[opts.difficulty] || DIFFICULTY.normal;
    this.time = 0;
    this.units = [];
    this.projectiles = [];
    this.zones = [];
    this.timers = [];
    this.floaters = [];
    this.events = [];
    this.waveCount = 0;
    this.nextWave = CONST.firstWave;
    this.over = null;
    this.paused = false;
    this.listeners = {};

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x24304a);
    this.scene.fog = new THREE.Fog(0x24304a, 70, 170);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
    this.camZoom = 1;

    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0006;
    this.sun = sun;
    this.scene.add(sun, sun.target);
    // luz rojiza en la base enemiga
    const redLight = new THREE.PointLight(0xff3050, 60, 40, 1.6);
    redLight.position.set(LAYOUT.red.nexus.x, 8, 0);
    this.scene.add(redLight);

    this.world = buildWorld(this.scene);
    this.obstacles = this.world.obstacles;
    this.fx = new Effects(this.scene);

    this.setupStructures();
    this.setupHeroes();
    setupJungle(this);
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }

  // Efecto de sonido que se oye menos cuanto más lejos está del jugador
  sound(name, pos, vol = 1) {
    if (this.opts.silent) return;
    const p = this.player;
    if (pos && p) vol *= Math.max(0, 1 - dist2(p.pos, pos) / 40);
    if (vol > 0.02) sfx(name, vol);
  }
  voice(u, moment) {
    if (!this.opts.silent && u?.isPlayer) voice(`${u.heroId}_${moment}`);
  }
  emit(ev, data) { (this.listeners[ev] || []).forEach((f) => f(data)); }

  // ------------------------------------------------------------------ creación
  makeUnit(o) {
    const u = {
      id: NEXT_ID++, team: o.team, kind: o.kind, type: o.type || null,
      pos: new THREE.Vector3(o.x, 0, o.z || 0), facing: o.team === 'blue' ? Math.PI / 2 : -Math.PI / 2,
      radius: o.radius ?? 0.8, alive: true, base: o.base, growth: o.growth || null,
      level: 1, xp: 0, gold: 0, items: [], potions: 0,
      hp: o.base.hp, maxHp: o.base.hp, mp: o.base.mp || 0, maxMp: o.base.mp || 0,
      shields: [], buffs: [], attackCd: 0, attackAnim: 0, order: null,
      model: o.model, isPlayer: !!o.isPlayer, isBot: !!o.isBot,
      abilities: [], skillPoints: 0, deadTimer: 0, deathAnim: 0,
      kills: 0, deaths: 0, assists: 0, cs: 0,
      damagedBy: new Map(), aggro: null, moving: false, dash: null, knock: null, channel: null,
      state: {}, height: o.height ?? 2.2,
    };
    if (u.model) {
      if (o.scale) u.model.group.scale.setScalar(o.scale);
      this.scene.add(u.model.group);
      u.model.group.position.copy(u.pos);
      u.model.group.rotation.y = u.facing;
    }
    this.units.push(u);
    return u;
  }

  setupStructures() {
    for (const team of ['blue', 'red']) {
      const L = LAYOUT[team];
      for (const t of L.towers) {
        const S = STRUCTURES.tower;
        const u = this.makeUnit({ team, kind: 'tower', x: t.x, z: t.z, radius: S.radius, base: { ...S, mp: 0 },
          model: buildStructureModel(team, 'tower'), height: 8 });
        u.tier = t.tier;
        u.lane = t.lane;
        const where = LANE_NAMES[t.lane];
        u.name = team === 'blue' ? `Torre ${t.tier === 1 ? 'exterior' : 'interior'} ${where}` : `Obelisco ${t.tier === 1 ? 'exterior' : 'interior'} ${where}`;
      }
      const kind = team === 'blue' ? 'nexus' : 'boss';
      const S = STRUCTURES[kind];
      const u = this.makeUnit({ team, kind, x: L.nexus.x, z: L.nexus.z, radius: S.radius, base: { ...S, mp: 0 },
        model: buildStructureModel(team, kind), height: team === 'blue' ? 15 : 9 });
      u.name = team === 'blue' ? 'Torre de Zugri' : 'Lorik';
      u.state.rootCd = 6; u.state.summonCd = 12;
      if (team === 'blue') this.blueNexus = u; else this.boss = u;
    }
  }

  setupHeroes() {
    // 7 contra 7: ningún equipo repite héroe, pero el mismo héroe puede estar en los
    // dos bandos (el de la Legión, con sus colores oscuros)
    const pid = this.opts.heroId;
    const solo = this.opts.mode === '1v1';
    const blueHeroes = [pid, ...shuffle(HERO_ORDER.filter((h) => h !== pid)).slice(0, solo ? 0 : 6)];
    const redHeroes = solo ? [shuffle(HERO_ORDER.filter((h) => h !== pid))[0]] : shuffle([...HERO_ORDER]).slice(0, 7);
    // carriles: el primero va al centro y el resto se reparte de dos en dos
    const LANE_SLOTS = ['mid', 'top', 'bot', 'top', 'bot', 'mid', 'mid'];
    this.heroes = [];
    blueHeroes.forEach((id, i) => {
      const h = this.makeHero(id, 'blue', i === 0 && !this.opts.auto, i, LANE_SLOTS[i]);
      if (i === 0) this.player = h;
    });
    redHeroes.forEach((id, i) => this.makeHero(id, 'red', false, i, LANE_SLOTS[i]));
  }

  makeHero(id, team, isPlayer, idx, lane = 'mid') {
    const def = HEROES[id];
    const corrupted = team === 'red';
    const model = buildHeroModel(id, corrupted, def.glb);
    const sp = this.spawnPoint(team, idx);
    const u = this.makeUnit({ team, kind: 'hero', x: sp.x, z: sp.z, radius: 0.75,
      base: def.base, growth: def.growth, model, isPlayer, isBot: !isPlayer, height: 3.1, scale: 1.35 });
    u.heroId = id;
    u.def = def;
    u.name = def.name;
    u.corrupted = corrupted;
    u.lane = lane;
    u.slot = idx;
    u.gold = CONST.startGold;
    u.abilities = def.abilities.map((a) => ({ def: a, rank: 0, cd: 0 }));
    u.skillPoints = 1;
    u.fury = 0;
    u.casts = 0;
    u.history = [];
    u.passiveCd = 0;
    u.normalModel = model;
    u.ringMesh = this.makeTeamRing(team, isPlayer);
    this.scene.add(u.ringMesh);
    this.recalc(u, true);
    this.heroes.push(u);
    if (!isPlayer || this.opts.autoLevel) this.autoLevel(u);
    return u;
  }

  // Puestos en círculo alrededor de la fuente
  spawnPoint(team, idx) {
    const f = LAYOUT[team].fountain;
    const a = (idx / 7) * Math.PI * 2;
    return { x: f.x + TEAMS[team].dir * 2 + Math.cos(a) * 3.5, z: f.z + Math.sin(a) * 3.5 };
  }

  nearFountain(u, team, r) {
    const f = LAYOUT[team].fountain;
    return Math.hypot(u.pos.x - f.x, u.pos.z - f.z) < r;
  }

  // Nombre para los mensajes: si el mismo héroe está en los dos equipos, el de la
  // Legión lleva la etiqueta para distinguirlos
  label(u) {
    if (!u) return '';
    const dup = u.heroId && this.heroes.some((h) => h !== u && h.heroId === u.heroId);
    return dup && u.team === 'red' ? `${u.name} (Legión)` : u.name;
  }

  makeTeamRing(team, isPlayer) {
    const color = isPlayer ? 0x6dff8a : team === 'blue' ? 0x4aa3ff : 0xff4a5a;
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.05;
    return m;
  }

  // ------------------------------------------------------------------ estadísticas
  itemStat(u, k) {
    let s = 0;
    for (const id of u.items) s += ITEMS[id].stats?.[k] || 0;
    return s;
  }

  buffSum(u, type) {
    let s = 0;
    for (const b of u.buffs) if (b.type === type) s += b.value;
    return s;
  }
  buffMax(u, type) {
    let s = 0;
    for (const b of u.buffs) if (b.type === type && b.value > s) s = b.value;
    return s;
  }
  hasBuff(u, type) { return u.buffs.some((b) => b.type === type); }
  getBuff(u, key) { return u.buffs.find((b) => b.key === key); }

  stat(u, k) {
    if (u.kind !== 'hero') {
      if (k === 'speed') return u.base.speed * (1 - Math.min(0.7, this.buffMax(u, 'slow')));
      if (k === 'as') return u.base.as;
      return u.base[k] || 0;
    }
    const L = u.level - 1;
    const g = u.growth;
    switch (k) {
      case 'as': return Math.min(2.5, u.base.as * (1 + g.as * L + this.itemStat(u, 'as') + this.buffSum(u, 'as')));
      case 'speed': {
        const spd = (u.base.speed + this.itemStat(u, 'speed')) * (1 + this.buffSum(u, 'spd'));
        return spd * (1 - Math.min(0.7, this.buffMax(u, 'slow')));
      }
      case 'cdr': return Math.min(0.5, this.itemStat(u, 'cdr') + this.buffSum(u, 'cdr'));
      case 'crit': return Math.min(1, this.itemStat(u, 'crit') + this.buffSum(u, 'crit'));
      case 'arpen': case 'mpen': return Math.min(0.6, this.itemStat(u, k));
      case 'range': return u.base.range;
      case 'hpRegen': return u.base.hpRegen + this.itemStat(u, 'hpRegen');
      case 'mpRegen': return (u.base.mpRegen + (g.mp ? 0.4 * L : 0)) * (1 + this.buffSum(u, 'mpregen'));
      default:
        return (u.base[k] || 0) + (g[k] || 0) * L + this.itemStat(u, k) + this.buffSum(u, 'bonus_' + k);
    }
  }

  recalc(u, fill) {
    const oldMax = u.maxHp, oldMp = u.maxMp;
    u.maxHp = this.stat(u, 'hp');
    u.maxMp = this.stat(u, 'mp');
    if (fill) { u.hp = u.maxHp; u.mp = u.maxMp; return; }
    if (u.maxHp > oldMax) u.hp += u.maxHp - oldMax;
    if (u.maxMp > oldMp) u.mp += u.maxMp - oldMp;
    u.hp = Math.min(u.hp, u.maxHp);
    u.mp = Math.min(u.mp, u.maxMp);
  }

  attackRange(u) {
    if (u.kind === 'hero') {
      if (this.getBuff(u, 'jos_q')) return 6;
      return u.base.range;
    }
    return u.base.range;
  }

  canAct(u) {
    return u.alive && !this.hasBuff(u, 'stun') && !u.dash && !u.knock && !u.channel;
  }
  canMove(u) {
    return this.canAct(u) && !this.hasBuff(u, 'root');
  }

  isTargetable(u) {
    return u.alive && !u.protected;
  }

  // ------------------------------------------------------------------ consultas
  enemiesOf(team) { return team === 'blue' ? 'red' : 'blue'; }

  unitsInRadius(pos, r, filter) {
    const out = [];
    for (const u of this.units) {
      if (!u.alive) continue;
      if (filter && !filter(u)) continue;
      if (dist2(u.pos, pos) <= r + u.radius) out.push(u);
    }
    return out;
  }

  enemiesInRadius(team, pos, r, kinds) {
    return this.unitsInRadius(pos, r, (u) => u.team !== team && this.isTargetable(u)
      && (!kinds || kinds.includes(u.kind) || (u.kind === 'monster' && kinds.includes('minion'))));
  }

  alliesInRadius(team, pos, r, kinds) {
    return this.unitsInRadius(pos, r, (u) => u.team === team && (!kinds || kinds.includes(u.kind)));
  }

  nearest(list, pos) {
    let best = null, bd = Infinity;
    for (const u of list) {
      const d = dist2(u.pos, pos);
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }

  // Unidad bajo el cursor (en el suelo)
  unitAt(point, filter) {
    let best = null, bd = Infinity;
    for (const u of this.units) {
      if (!u.alive || (filter && !filter(u))) continue;
      const d = dist2(u.pos, point);
      const r = u.radius + (u.kind === 'hero' || u.kind === 'minion' ? 0.9 : 0.5);
      if (d < r && d < bd) { bd = d; best = u; }
    }
    return best;
  }

  // ------------------------------------------------------------------ efectos de estado
  addBuff(u, type, dur, value = 0, o = {}) {
    if (!u.alive) return null;
    const key = o.key || type;
    let b = u.buffs.find((x) => x.key === key);
    if (b) {
      b.t = Math.max(b.t, dur);
      b.value = o.stack ? Math.min(o.max ?? Infinity, b.value + value) : Math.max(b.value, value);
      if (o.src) b.src = o.src;
    } else {
      b = { type, key, t: dur, value, src: o.src || null, onEnd: o.onEnd || null, charges: o.charges };
      u.buffs.push(b);
    }
    if (type === 'stun' || type === 'root') u.order = u.order && u.order.type === 'attack' ? u.order : null;
    return b;
  }

  removeBuff(u, key) {
    const i = u.buffs.findIndex((b) => b.key === key);
    if (i >= 0) {
      const b = u.buffs[i];
      u.buffs.splice(i, 1);
      if (b.onEnd) b.onEnd();
    }
  }

  cleanse(u) {
    const bad = ['slow', 'stun', 'root', 'taunt', 'weak', 'mark'];
    for (const b of [...u.buffs]) if (bad.includes(b.type)) this.removeBuff(u, b.key);
  }

  addShield(u, amt, dur, src) {
    if (!u.alive) return;
    if (src?.kind === 'hero') amt *= 1 + this.stat(src, 'healpow');
    u.shields.push({ amt, t: dur });
  }

  shieldTotal(u) {
    let s = 0;
    for (const x of u.shields) s += x.amt;
    return s;
  }

  heal(u, amt, src) {
    if (!u.alive) return;
    if (src?.kind === 'hero') amt *= 1 + this.stat(src, 'healpow');
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + amt);
    const done = u.hp - before;
    if (done > 2 && (u.isPlayer || src?.isPlayer)) this.floater(u, '+' + Math.round(done), '#7dff8a');
  }

  // ------------------------------------------------------------------ daño
  dealDamage(src, tgt, amount, type = 'physical', o = {}) {
    if (!tgt.alive || tgt.protected) return 0;
    let a = amount;
    if (src && src.kind === 'hero' && src.isBot && src.team === 'red') a *= this.diff.dmg;
    if (src && src.kind === 'minion' && ['tower', 'nexus', 'boss'].includes(tgt.kind)) a *= 1.5;
    if (src?.buffs) a *= 1 + this.buffSum(src, 'dmgup');
    if (tgt.kind === 'monster') monsterHit(this, tgt, src);
    if (src && src.alive !== undefined) {
      const weak = this.buffMax(src, 'weak');
      if (weak) a *= 1 - weak;
    }
    a *= 1 + this.buffSum(tgt, 'mark');
    const dr = this.buffMax(tgt, 'dr');
    if (dr) a *= 1 - dr;
    if (type !== 'true') {
      let res = Math.max(0, this.stat(tgt, type === 'magic' ? 'mr' : 'armor'));
      if (src?.kind === 'hero') res *= 1 - this.stat(src, type === 'magic' ? 'mpen' : 'arpen');
      a *= 100 / (100 + res);
    }
    // súbditos y estructuras reciben menos daño de los súbditos
    a = Math.max(1, a);
    // escudos
    let left = a;
    for (const s of tgt.shields) {
      const take = Math.min(s.amt, left);
      s.amt -= take; left -= take;
      if (left <= 0) break;
    }
    tgt.shields = tgt.shields.filter((s) => s.amt > 0.5);
    const hpBefore = tgt.hp;
    tgt.hp -= left;
    if (tgt.recall && src && left > 0) this.cancelRecall(tgt);
    if (tgt.hp <= 0 && this.getBuff(tgt, 'cri_r')) tgt.hp = 1; // Último aliento de Crixus
    if (src?.heroId === 'crixus' && this.getBuff(src, 'cri_r')) src.state.ultDmg = (src.state.ultDmg || 0) + left;

    // registro de autoría
    if (src && src.kind === 'hero') {
      tgt.damagedBy.set(src.id, this.time);
      if (tgt.kind === 'hero') {
        // las torres defienden a sus héroes
        for (const s of this.units) {
          if (!s.alive || s.team !== tgt.team || !['tower', 'nexus', 'boss'].includes(s.kind)) continue;
          if (dist2(s.pos, src.pos) <= s.base.range + 1) s.aggro = { unit: src, t: this.time };
        }
        // los súbditos también
        for (const m of this.units) {
          if (m.alive && m.kind === 'minion' && m.team === tgt.team && dist2(m.pos, src.pos) < 8) m.callForHelp = { unit: src, t: this.time };
        }
      }
    }
    // pasivas que reaccionan al daño
    if (tgt.heroId) PASSIVE_IMPL[tgt.heroId]?.onDamaged?.(this, tgt, a, hpBefore);
    if (src?.heroId && src !== tgt) PASSIVE_IMPL[src.heroId]?.onDealt?.(this, src, tgt, a);
    // espinas: devuelven parte del daño de los ataques básicos
    if (o.basic && tgt.kind === 'hero' && src?.alive && src !== tgt) {
      const th = this.stat(tgt, 'thorns');
      if (th > 0) {
        this.dealDamage(tgt, src, a * th, 'magic');
        if (Math.random() < 0.4) this.fx.burst(src.pos, 0x9fe870, 4, 2, 0.08, 0.3, 1);
      }
    }

    if (src?.isPlayer || tgt.isPlayer) {
      if (a >= 1) {
        const col = tgt.isPlayer ? '#ff6a6a' : type === 'magic' ? '#c99bff' : type === 'true' ? '#ffffff' : '#ffd36a';
        this.floater(tgt, Math.round(a), col, o.crit);
      }
    }
    if (tgt.hp <= 0) this.kill(tgt, src);
    return a;
  }

  floater(u, text, color, big) {
    this.floaters.push({ x: u.pos.x + (Math.random() - 0.5) * 0.6, y: u.height + 0.4, z: u.pos.z, text: String(text), color, t: 0, big: !!big });
  }

  // ------------------------------------------------------------------ muerte y recompensas
  kill(u, killer) {
    if (!u.alive) return;
    u.alive = false;
    u.hp = 0;
    u.buffs = [];
    u.shields = [];
    u.dash = null; u.knock = null; u.channel = null;
    this.cancelRecall(u);
    u.order = null;
    if (u.kind === 'monster') { monsterKilled(this, u, killer); u.damagedBy.clear(); return; }
    const enemyTeam = this.enemiesOf(u.team);

    // ¿quién se lleva el crédito? (último héroe enemigo que dañó en 10 s)
    let credit = killer && killer.kind === 'hero' ? killer : null;
    if (!credit) {
      let bestT = -1;
      for (const h of this.heroes) {
        if (h.team !== enemyTeam) continue;
        const t = u.damagedBy.get(h.id);
        if (t !== undefined && this.time - t < 10 && t > bestT) { bestT = t; credit = h; }
      }
    }

    if (u.kind === 'minion') {
      if (credit && killer === credit) {
        this.giveGold(credit, (u.superMinion ? 45 : MINIONS[u.type].gold) + Math.floor(this.time / 90));
        credit.cs++;
      }
      const xpHeroes = this.heroes.filter((h) => h.alive && h.team === enemyTeam && dist2(h.pos, u.pos) < CONST.xpRange);
      for (const h of xpHeroes) this.addXp(h, MINIONS[u.type].xp / Math.max(1, xpHeroes.length * 0.75));
      u.deathAnim = 0.001;
    } else if (u.kind === 'hero') {
      u.deaths++;
      u.deadTimer = 5 + u.level * 1.6;
      u.deathAnim = 0.001;
      const assists = [];
      for (const h of this.heroes) {
        if (h.team !== enemyTeam || h === credit) continue;
        const t = u.damagedBy.get(h.id);
        if (t !== undefined && this.time - t < 12) assists.push(h);
      }
      if (credit) {
        credit.kills++;
        this.giveGold(credit, CONST.heroKillGold);
        this.addXp(credit, 160 + u.level * 35);
      }
      for (const h of assists) { h.assists++; this.giveGold(h, CONST.assistGold); this.addXp(h, 80 + u.level * 15); }
      u.damagedBy.clear();
      this.emit('heroKilled', { victim: u, killer: credit || killer });
      this.sound('heroe_muere', u.pos);
      this.voice(u, 'morir');
      this.voice(credit, 'matar');
      if (u.dragon) this.endDragon(u);
    } else if (u.kind === 'tower') {
      for (const h of this.heroes) if (h.team === enemyTeam) this.giveGold(h, CONST.towerGold);
      u.deathAnim = 0.001;
      this.fx.burst(u.pos, u.team === 'blue' ? 0xe8e4d8 : 0x3a2a40, 40, 8, 0.35, 1.2, 3);
      this.emit('towerDestroyed', { tower: u });
      this.sound('torre_destruida', u.pos);
    } else {
      u.deathAnim = 0.001;
      this.fx.burst(u.pos, u.team === 'blue' ? 0x8fd0ff : 0xb06aff, 80, 12, 0.4, 1.6, 4);
      this.over = u.team === 'blue' ? 'defeat' : 'victory';
      this.emit('gameOver', { result: this.over });
    }
    u.damagedBy.clear();
  }

  giveGold(h, g) {
    if (h.isBot && h.team === 'red') g *= this.diff.gold;
    h.gold += g;
    if (h.isPlayer && g >= 10) { this.floater(h, '+' + Math.round(g) + ' 🪙', '#ffd700'); this.sound('oro', null, 0.4); }
  }

  addXp(u, amt) {
    if (u.level >= CONST.maxLevel) return;
    u.xp += amt;
    while (u.level < CONST.maxLevel && u.xp >= xpToNext(u.level)) {
      u.xp -= xpToNext(u.level);
      u.level++;
      u.skillPoints++;
      this.recalc(u);
      this.fx.ring(u.pos, 2.2, 0xffe08a, 0.8, { grow: true });
      this.fx.burst(u.pos, 0xffe08a, 14, 3, 0.12, 0.8, 2);
      if (u.isPlayer) { this.emit('levelUp', { unit: u }); this.sound('subir_nivel', null, 0.7); }
      if (u.isBot || this.opts.autoLevel) this.autoLevel(u);
    }
  }

  canLevel(u, i) {
    const a = u.abilities[i];
    if (u.skillPoints <= 0) return false;
    if (i === 3) return a.rank < 3 && u.level >= [6, 11, 16][a.rank];
    return a.rank < 5 && a.rank < Math.ceil(u.level / 2);
  }

  levelAbility(u, i) {
    if (!this.canLevel(u, i)) return false;
    u.abilities[i].rank++;
    u.skillPoints--;
    return true;
  }

  autoLevel(u) {
    const prio = u.def.prio ?? [0, 1, 2];
    let guard = 10;
    while (u.skillPoints > 0 && guard-- > 0) {
      if (this.levelAbility(u, 3)) continue;
      const missing = prio.find((i) => u.abilities[i].rank === 0 && this.canLevel(u, i));
      if (missing !== undefined) { this.levelAbility(u, missing); continue; }
      const next = prio.find((i) => this.canLevel(u, i));
      if (next === undefined) break;
      this.levelAbility(u, next);
    }
  }

  // ------------------------------------------------------------------ tienda
  inShop(u) {
    return !u.alive || this.nearFountain(u, u.team, CONST.shopRadius);
  }

  buy(u, id) {
    const it = ITEMS[id];
    if (!it || !this.inShop(u)) return 'Solo puedes comprar en tu base.';
    if (u.gold < it.cost) return 'No tienes oro suficiente.';
    if (it.consumable) {
      if (u.potions >= 5) return 'Máximo 5 pociones.';
      u.potions++;
    } else {
      if (u.items.length >= CONST.maxItems) return 'Inventario lleno (6 objetos).';
      u.items.push(id);
    }
    u.gold -= it.cost;
    this.recalc(u);
    if (u.isPlayer) this.sound('comprar', null, 0.7);
    return null;
  }

  sell(u, idx) {
    if (!this.inShop(u)) return 'Solo puedes vender en tu base.';
    const id = u.items[idx];
    if (!id) return null;
    u.items.splice(idx, 1);
    u.gold += Math.floor(ITEMS[id].cost * 0.6);
    this.recalc(u);
    return null;
  }

  usePotion(u) {
    if (!u.alive || u.potions <= 0) return;
    if (this.getBuff(u, 'potion')) return;
    u.potions--;
    this.addBuff(u, 'hot', 10, 16, { key: 'potion' });
    if (u.isPlayer) this.sound('pocion', null, 0.7);
    this.fx.burst(u.pos, 0xff5a7a, 8, 1.5, 0.1, 0.6, 1.5);
  }

  // ------------------------------------------------------------------ habilidades
  castAbility(u, i, point, targetUnit) {
    const a = u.abilities[i];
    if (!a || !u.alive || a.rank === 0 || a.cd > 0 || !this.canAct(u)) return false;
    if (this.hasBuff(u, 'taunt')) return false;
    this.cancelRecall(u);
    const page = this.getBuff(u, 'yes_page');
    const cost = page ? 0 : a.def.cost[a.rank - 1];
    if (u.mp < cost) {
      if (u.isPlayer) this.emit('message', { text: 'No tienes maná suficiente', kind: 'warn' });
      return false;
    }
    const impl = ABILITY_IMPL[a.def.id];
    if (!impl) return false;
    const p = point ? point.clone() : u.pos.clone();
    p.y = 0;
    const ok = impl(this, u, a.rank, p, a.def, targetUnit);
    if (ok === false) return false;
    u.mp -= cost;
    let cd = a.def.cd[a.rank - 1] * (1 - this.stat(u, 'cdr'));
    if (page) { cd *= 0.6; this.removeBuff(u, 'yes_page'); }
    a.cd = cd;
    a.maxCd = cd;
    PASSIVE_IMPL[u.heroId]?.onCast?.(this, u, i);
    this.castFlourish(u, i, a.def);
    this.sound(`${u.heroId}_${a.def.key.toLowerCase()}`, u.pos);
    if (i === 3) {
      this.voice(u, 'definitiva');
      if (this.player && u.team !== this.player.team) this.sound('aviso', null, 0.6);
    }
    return true;
  }

  // Señal visual común a todo lanzamiento: un aro del color del héroe a sus pies.
  // Las definitivas (R) además anuncian su nombre, iluminan y sacuden la cámara.
  castFlourish(u, i, def) {
    const hex = HEROES[u.heroId]?.color ?? '#ffffff';
    const col = new THREE.Color(hex).getHex();
    this.fx.ring(u.pos, 1.4, col, 0.4, { grow: true, opacity: 1 });
    this.fx.glow(u.pos, col, 2.5, 0.3, 0.6);
    if (i !== 3) return;
    this.floater(u, `${def.icon} ${def.name}`, hex, true);
    this.fx.pillar(u.pos, col, 0.8, 1.0, 12);
    this.fx.flash(u.pos, col, 36, 16, 0.6);
    this.shake(0.35, u.pos);
    if (this.player && u.team !== this.player.team) this.emit('message', { text: `¡${this.label(u)} usa ${def.name}!`, kind: 'warn' });
  }

  // Temblor de cámara; se atenúa con la distancia al jugador
  shake(amount, pos) {
    const p = this.player;
    if (pos && p) amount *= Math.max(0, 1 - dist2(p.pos, pos) / 35);
    this.shakeAmt = Math.min(0.8, Math.max(this.shakeAmt || 0, amount));
  }

  // ------------------------------------------------------------------ órdenes
  orderMove(u, point) {
    if (!u.alive) return;
    if (this.hasBuff(u, 'taunt')) return;
    this.cancelRecall(u);
    u.order = { type: 'move', point: point.clone() };
  }
  orderAttack(u, target) {
    if (!u.alive || !target) return;
    if (this.hasBuff(u, 'taunt')) return;
    this.cancelRecall(u);
    u.order = { type: 'attack', target };
  }

  // Volver a la base: 6 s quieto; se cancela al moverse, atacar, lanzar o recibir daño
  startRecall(u) {
    if (!u.alive || u.recall || !this.canAct(u) || this.nearFountain(u, u.team, CONST.fountainRadius)) return false;
    u.order = null;
    u.recall = { t: 6, max: 6, ring: this.fx.ring(u.pos, 1.6, 0x8fd0ff, 6, { follow: u, steady: true, opacity: 0.8 }) };
    if (u.isPlayer) this.emit('message', { text: 'Volviendo a Zugri… (no te muevas)', kind: 'info' });
    return true;
  }

  cancelRecall(u) {
    if (!u.recall) return;
    if (u.recall.ring) u.recall.ring.life = 0.01;
    u.recall = null;
    if (u.isPlayer) this.emit('message', { text: 'Regreso a la base cancelado', kind: 'warn' });
  }

  updateRecall(u, dt) {
    const r = u.recall;
    r.t -= dt;
    if (Math.random() < 0.6) this.fx.spark(new THREE.Vector3(u.pos.x + (Math.random() - 0.5) * 2, 0.2, u.pos.z + (Math.random() - 0.5) * 2), 0x8fd0ff, 0.12, 0.9, 3);
    if (r.t > 0) return;
    u.recall = null;
    this.fx.burst(u.pos, 0x8fd0ff, 24, 3, 0.15, 0.7, 3);
    const sp = this.spawnPoint(u.team, u.slot ?? 0);
    u.pos.set(sp.x, 0, sp.z);
    u.order = null;
    this.fx.ring(u.pos, 2.5, 0x8fd0ff, 0.8, { grow: true });
    if (u.isPlayer) this.sound('reaparecer', null, 0.7);
  }

  // ------------------------------------------------------------------ ataques básicos
  performAttack(u, t) {
    u.attackCd = 1 / this.stat(u, 'as');
    u.attackAnim = 0.001;
    const d = dist2(u.pos, t.pos);
    let dmg = this.stat(u, 'ad');
    let type = 'physical';
    let bonusMagic = 0;
    let color = 0xffe08a;
    let size = 0.18;
    let crit = false;

    if (u.kind === 'hero') {
      const hook = PASSIVE_IMPL[u.heroId]?.onAttack?.(this, u, t, d);
      if (hook) { dmg *= hook.mult ?? 1; bonusMagic += hook.magic ?? 0; if (hook.color) color = hook.color; }
      const cc = this.stat(u, 'crit');
      if (cc > 0 && Math.random() < cc) { dmg *= 1.75; crit = true; }
      if (this.getBuff(u, 'kou_e')) this.removeBuff(u, 'kou_e');
      const onhit = this.stat(u, 'onhit');
      if (onhit > 0) { bonusMagic += onhit; if (!hook?.color) color = 0xff7a30; }
      const jq = this.getBuff(u, 'jos_q');
      if (jq) {
        bonusMagic += jq.value + this.stat(u, 'ad') * 0.4;
        jq.charges--;
        color = 0xfff2a0; size = 0.3;
        if (jq.charges <= 0) this.removeBuff(u, 'jos_q');
      }
      if (u.heroId === 'yeslie') { color = 0x7ff6ff; }
      if (u.heroId === 'astrid') { color = 0x9ad8ff; size = 0.12; }
      if (u.def.attackColor && !hook?.color && !jq && !onhit) color = u.def.attackColor;
    }
    if (u.kind === 'minion') {
      color = u.team === 'blue' ? 0xffe08a : 0xff3a5a;
      size = 0.14;
    }

    const apply = () => {
      if (!t.alive) return;
      let done = this.dealDamage(u, t, dmg, type, { basic: true, crit });
      if (bonusMagic > 0 && t.alive) done += this.dealDamage(u, t, bonusMagic, 'magic');
      if (u.kind !== 'hero') return;
      if (t.alive && this.getBuff(u, 'jg_root')) {
        this.addBuff(t, 'dot', 3, 8 + u.level * 2, { key: 'jg_burn', src: u });
        this.addBuff(t, 'slow', 1.5, 0.2, { key: 'jg_slow' });
        if (Math.random() < 0.5) this.fx.burst(t.pos, 0x9fe870, 4, 1.5, 0.08, 0.4, 1);
      }
      const ls = this.stat(u, 'lifesteal');
      if (ls > 0 && done > 0) {
        this.heal(u, done * ls);
        if (Math.random() < 0.5) this.fx.spark(u.pos.clone().setY(1.2), 0xff4a6a, 0.1, 0.5, 1.5);
      }
      if (crit) {
        this.sound([`${u.heroId}_critico`, 'critico'], t.pos, 0.8);
        this.fx.impact(t.pos, 0xffe070, 0.8);
        if (u.isPlayer) this.shake(0.12);
      }
    };

    const isStructure = ['tower', 'nexus', 'boss'].includes(u.kind);
    const ranged = u.base.range > 4 || this.getBuff(u, 'jos_q') || (bonusMagic > 0 && d > 3);
    if (u.kind === 'hero') {
      const ranged0 = u.base.range > 4;
      const snd = !ranged0 ? (u.heroId === 'fotsor' ? 'golpe_puno' : 'golpe_espada')
        : u.heroId === 'astrid' ? 'disparo_arma_fuego' : u.heroId === 'kouji' ? 'disparo_flecha' : 'disparo_magia';
      this.sound([`${u.heroId}_ataque`, snd], u.pos, 0.45);
    }
    if (isStructure) {
      this.sound('torre_dispara', u.pos, 0.6);
      const from = u.pos.clone(); from.y = u.model.extra?.gemY ?? 6;
      const col = u.team === 'blue' ? 0x8fd0ff : u.kind === 'boss' ? 0xb06aff : 0xff3a5a;
      this.spawnHoming(u, t, from, col, 0.45, 24, () => {
        // las torres hacen más daño a los héroes con impactos consecutivos
        let mult = 1;
        if (t.kind === 'hero') {
          u.state.heat = (u.state.lastTarget === t ? (u.state.heat || 0) + 1 : 0);
          mult = 1 + Math.min(1.2, u.state.heat * 0.4);
        } else if (t.kind === 'minion') {
          mult = t.type === 'melee' ? 1.0 : 1.6;
        }
        u.state.lastTarget = t;
        if (t.alive) this.dealDamage(u, t, dmg * mult, u.kind === 'boss' ? 'magic' : 'physical');
      });
    } else if (ranged) {
      const from = u.pos.clone(); from.y = 1.4;
      this.spawnHoming(u, t, from, color, size, 28, apply);
    } else {
      apply();
      if (u.kind === 'hero') this.fx.burst(t.pos, color, 4, 2, 0.08, 0.25, 1);
    }
  }

  spawnHoming(src, target, from, color, size, speed, onHit) {
    const mesh = this.fx.orb(color, size);
    mesh.position.copy(from);
    this.projectiles.push({ homing: true, src, target, pos: from.clone(), speed, onHit, mesh, color });
  }

  // Proyectil en línea recta que impacta al primer enemigo (o atraviesa con pierce)
  spawnSkillshot(src, dir, o) {
    const from = src.pos.clone(); from.y = 1.3;
    const mesh = this.fx.orb(o.color ?? 0xffffff, o.size ?? 0.3);
    mesh.position.copy(from);
    const p = {
      homing: false, src, team: src.team, pos: from, dir: dir.clone().setY(0).normalize(), speed: o.speed ?? 25,
      range: o.range ?? 10, travelled: 0, width: o.width ?? 0.7, pierce: !!o.pierce, hit: new Set(),
      onHit: o.onHit, onEnd: o.onEnd, filter: o.filter, mesh, color: o.color ?? 0xffffff, trail: o.trail,
    };
    this.projectiles.push(p);
    return p;
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      let done = false;
      if (p.homing) {
        const t = p.target;
        TMP.set(t.pos.x, t.kind === 'hero' || t.kind === 'minion' ? 1.1 : 2, t.pos.z);
        const d = p.pos.distanceTo(TMP);
        const step = p.speed * dt;
        if (!t.alive && t.kind !== 'tower') { done = true; }
        else if (d <= step + 0.2) { p.onHit(); done = true; }
        else p.pos.addScaledVector(TMP.sub(p.pos).normalize(), step);
      } else {
        const step = p.speed * dt;
        p.pos.addScaledVector(p.dir, step);
        p.travelled += step;
        if (p.trail && Math.random() < 0.7) this.fx.spark(p.pos.clone(), p.color, 0.12, 0.3, 0.3);
        for (const u of this.units) {
          if (!u.alive || u.team === p.team || p.hit.has(u.id) || !this.isTargetable(u)) continue;
          if (p.filter && !p.filter(u)) continue;
          if (dist2(u.pos, p.pos) <= u.radius + p.width) {
            p.hit.add(u.id);
            p.onHit?.(u, p);
            if (!p.pierce) { done = true; break; }
          }
        }
        if (!done && p.travelled >= p.range) { p.onEnd?.(p); done = true; }
      }
      p.mesh.position.copy(p.pos);
      if (done) {
        this.fx.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ zonas y temporizadores
  addZone(z) {
    z.t = 0;
    z.tickT = 0;
    this.zones.push(z);
    return z;
  }
  after(t, fn) { this.timers.push({ t, fn }); }

  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt;
      if (z.onUpdate) z.onUpdate(dt, z);
      if (z.tick) {
        z.tickT += dt;
        while (z.tickT >= z.tick) { z.tickT -= z.tick; z.onTick?.(z); }
      }
      if (z.t >= z.dur) { z.onEnd?.(z); this.zones.splice(i, 1); }
    }
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
  }

  // ------------------------------------------------------------------ movimiento
  dashTo(u, to, speed, o = {}) {
    const target = to.clone(); target.y = 0;
    this.clampPos(target);
    u.dash = { to: target, speed, onArrive: o.onArrive, onStep: o.onStep, hit: new Set(), t: 0, max: dist2(u.pos, target) / speed + 0.2 };
    u.order = null;
  }

  knockback(u, dirX, dirZ, dist, dur = 0.25) {
    if (!u.alive || u.kind !== 'hero' && u.kind !== 'minion') return;
    const len = Math.hypot(dirX, dirZ) || 1;
    u.knock = { vx: (dirX / len) * (dist / dur), vz: (dirZ / len) * (dist / dur), t: dur };
    u.channel = null;
  }

  clampPos(p) {
    p.x = Math.max(MAP.minX, Math.min(MAP.maxX, p.x));
    p.z = Math.max(MAP.minZ, Math.min(MAP.maxZ, p.z));
  }

  moveToward(u, point, dt, stopDist = 0.1) {
    if (!this.canMove(u)) return false;
    let dx = point.x - u.pos.x, dz = point.z - u.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= stopDist) return true;
    dx /= d; dz /= d;
    // rodear las rocas y arboledas que haya delante, por el lado más corto
    for (const o of this.obstacles) {
      const ox = o.x - u.pos.x, oz = o.z - u.pos.z;
      const od = Math.hypot(ox, oz);
      const clear = o.r + u.radius + 1.2;
      if (od > clear + 2 || od - o.r > d) continue;
      const ahead = (ox * dx + oz * dz) / od;
      if (ahead < 0.15) continue;
      let tx = -oz / od, tz = ox / od;
      if (tx * dx + tz * dz < 0) { tx = -tx; tz = -tz; }
      const w = Math.min(1, (clear + 2 - od) / 2) * ahead;
      dx += tx * w * 1.8 - (ox / od) * w * 0.5;
      dz += tz * w * 1.8 - (oz / od) * w * 0.5;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
    }
    const step = Math.min(d, this.stat(u, 'speed') * dt);
    u.pos.x += dx * step;
    u.pos.z += dz * step;
    u.facing = Math.atan2(dx, dz);
    u.moving = true;
    return d - step <= stopDist;
  }

  face(u, p) {
    u.facing = Math.atan2(p.x - u.pos.x, p.z - u.pos.z);
  }

  // ------------------------------------------------------------------ actualización de unidades
  updateUnit(u, dt) {
    u.moving = false;
    if (u.recall) this.updateRecall(u, dt);
    if (u.attackCd > 0) u.attackCd -= dt;
    if (u.attackAnim > 0) { u.attackAnim += dt * 4; if (u.attackAnim > 1) u.attackAnim = 0; }

    // buffs
    for (let i = u.buffs.length - 1; i >= 0; i--) {
      const b = u.buffs[i];
      b.t -= dt;
      if (b.type === 'hot') this.heal(u, b.value * dt);
      if (b.type === 'dot' && b.src) this.dealDamage(b.src, u, b.value * dt, 'magic');
      if (!u.alive) return;
      if (b.t <= 0) { u.buffs.splice(i, 1); b.onEnd?.(); }
    }
    for (const s of u.shields) s.t -= dt;
    u.shields = u.shields.filter((s) => s.t > 0 && s.amt > 0.5);

    if (u.kind === 'hero') {
      for (const a of u.abilities) if (a.cd > 0) a.cd = Math.max(0, a.cd - dt);
      if (u.passiveCd > 0) u.passiveCd -= dt;
      u.hp = Math.min(u.maxHp, u.hp + this.stat(u, 'hpRegen') * dt);
      u.mp = Math.min(u.maxMp, u.mp + this.stat(u, 'mpRegen') * dt);
      PASSIVE_IMPL[u.heroId]?.update?.(this, u, dt);
      // viento de la base: los caminos desde casa son largos, así que se corre más cerca de ella
      if (this.nearFountain(u, u.team, 45)) {
        this.addBuff(u, 'spd', 0.5, 0.6, { key: 'home_wind' });
        if (Math.random() < dt * 6) this.fx.spark(u.pos.clone().setY(0.3), u.team === 'blue' ? 0xbfe8ff : 0xff8ab0, 0.1, 0.4, 0.5);
      }
      // fuente
      if (this.nearFountain(u, u.team, CONST.fountainRadius)) {
        u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.12 * dt);
        u.mp = Math.min(u.maxMp, u.mp + u.maxMp * 0.12 * dt);
      }
      const efx = LAYOUT[this.enemiesOf(u.team)].fountain;
      if (this.nearFountain(u, this.enemiesOf(u.team), CONST.fountainRadius + 1)) {
        this.dealDamage(null, u, 600 * dt, 'true');
        if (Math.random() < 0.3) this.fx.beam(new THREE.Vector3(efx.x, 6, efx.z), u.pos.clone().setY(1), 0xffffff, 0.1);
        if (!u.alive) return;
      }
    }

    // canalización (p. ej. Bala de electrum)
    if (u.channel) {
      u.channel.t -= dt;
      if (u.channel.point) this.face(u, u.channel.point);
      if (u.channel.t <= 0) { const c = u.channel; u.channel = null; c.onDone(); }
      return;
    }
    // desplazamientos forzados
    if (u.knock) {
      u.pos.x += u.knock.vx * dt; u.pos.z += u.knock.vz * dt;
      this.clampPos(u.pos);
      u.knock.t -= dt;
      if (u.knock.t <= 0) u.knock = null;
      return;
    }
    if (u.dash) {
      const d = u.dash;
      d.t += dt;
      const arrived = this.moveDash(u, d.to, d.speed * dt);
      d.onStep?.(d);
      if (arrived || d.t > d.max) { u.dash = null; d.onArrive?.(); }
      return;
    }

    // provocación: obligado a atacar
    const taunt = u.buffs.find((b) => b.type === 'taunt');
    if (taunt && taunt.src?.alive) u.order = { type: 'attack', target: taunt.src, forced: true };

    if (!this.canAct(u)) return;

    const o = u.order;
    if (!o) return;
    if (o.type === 'move') {
      if (this.moveToward(u, o.point, dt, 0.15)) u.order = null;
    } else if (o.type === 'attack') {
      const t = o.target;
      if (!t || !t.alive || (!this.isTargetable(t))) { u.order = null; return; }
      const d = dist2(u.pos, t.pos);
      const range = this.attackRange(u) + t.radius + u.radius * 0.5;
      if (d <= range) {
        this.face(u, t.pos);
        if (u.attackCd <= 0) this.performAttack(u, t);
      } else if (u.kind === 'hero' || u.kind === 'minion') {
        this.moveToward(u, t.pos, dt, range * 0.9);
      } else {
        u.order = null;
      }
    }
  }

  moveDash(u, to, step) {
    const dx = to.x - u.pos.x, dz = to.z - u.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= step) { u.pos.x = to.x; u.pos.z = to.z; return true; }
    u.pos.x += (dx / d) * step; u.pos.z += (dz / d) * step;
    u.facing = Math.atan2(dx, dz);
    u.moving = true;
    return false;
  }

  separate() {
    const list = this.units.filter((u) => u.alive);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const aStatic = !mobile(a);
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const bStatic = !mobile(b);
        if (aStatic && bStatic) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const min = (a.radius + b.radius) * (aStatic || bStatic ? 1 : 0.8);
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d);
        const nx = dx / d, nz = dz / d;
        if (aStatic) { b.pos.x += nx * push; b.pos.z += nz * push; }
        else if (bStatic) { a.pos.x -= nx * push; a.pos.z -= nz * push; }
        else {
          // los héroes empujan más a los súbditos que al revés
          const wa = a.kind === 'hero' && b.kind === 'minion' ? 0.2 : 0.5;
          const wb = 1 - wa;
          a.pos.x -= nx * push * wa * 0.5; a.pos.z -= nz * push * wa * 0.5;
          b.pos.x += nx * push * wb * 0.5; b.pos.z += nz * push * wb * 0.5;
        }
      }
    }
    for (const u of list) {
      if (!mobile(u) && !u.epic) continue;
      // las rocas y arboledas no se pueden atravesar
      for (const o of this.obstacles) {
        const dx = u.pos.x - o.x, dz = u.pos.z - o.z;
        const min = o.r + u.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        u.pos.x = o.x + (dx / d) * min;
        u.pos.z = o.z + (dz / d) * min;
      }
      this.clampPos(u.pos);
    }
  }

  // ------------------------------------------------------------------ oleadas
  spawnWave() {
    this.waveCount++;
    const types = ['melee', 'melee', 'melee', 'ranged', 'ranged'];
    if (this.waveCount % 3 === 0) types.push('melee');
    for (const team of ['blue', 'red']) {
      const dir = TEAMS[team].dir;
      for (const lane of Object.keys(LANES)) {
        // si el enemigo ya no tiene torres en este carril, salen súbditos de asedio
        const enemyTowersAlive = this.units.some((u) => u.kind === 'tower' && u.team !== team && u.lane === lane && u.alive);
        const list = enemyTowersAlive ? types : ['super', 'super', ...types];
        const start = lanePoint(lane, dir > 0 ? 2 : laneLength(lane) - 2);
        list.forEach((type, i) => {
          this.after(i * 0.7, () => {
            if (this.over) return;
            const sup = type === 'super';
            const M = MINIONS[sup ? 'melee' : type];
            const k = sup ? 2.4 : 1;
            const base = { ...M, hp: (M.hp + M.growHp * this.waveCount) * k, ad: (M.ad + M.growAd * this.waveCount) * k, armor: M.armor + (sup ? 30 : 0), mp: 0 };
            const u = this.makeUnit({ team, kind: 'minion', type: sup ? 'melee' : type, x: start.x + (Math.random() - 0.5) * 2, z: start.z + (Math.random() - 0.5) * 2,
              radius: M.radius * (sup ? 1.4 : 1), base,
              model: buildMinionModel(team, sup ? 'melee' : type), height: sup ? 2.8 : 2.0, scale: sup ? 1.8 : 1.25 });
            u.superMinion = sup;
            u.lane = lane;
            u.attackCd = Math.random() * 0.5;
          });
        });
      }
    }
  }

  // Lorik invoca ángeles corrompidos
  summonAngels(boss, n) {
    for (let i = 0; i < n; i++) {
      const M = MINIONS.ranged;
      const base = { ...M, hp: M.hp + M.growHp * this.waveCount, ad: M.ad + M.growAd * this.waveCount, mp: 0 };
      const u = this.makeUnit({ team: 'red', kind: 'minion', type: 'ranged', x: boss.pos.x - 5, z: boss.pos.z + (i - (n - 1) / 2) * 3, radius: M.radius, base,
        model: buildMinionModel('red', 'ranged'), height: 2.0, scale: 1.25 });
      u.lane = 'mid';
      this.fx.burst(u.pos, 0xb06aff, 16, 4, 0.15, 0.6, 2);
    }
  }

  // ------------------------------------------------------------------ dragón (Yeslie)
  startDragon(u, dur, bonusHp) {
    if (u.dragon) return;
    const dragon = buildDragon();
    if (u.corrupted) corrupt(dragon.group);
    dragon.group.scale.setScalar(1.35);
    this.scene.remove(u.model.group);
    u.model = dragon;
    this.scene.add(dragon.group);
    u.dragon = true;
    u.radius = 1.1;
    this.addBuff(u, 'bonus_hp', dur, bonusHp, { key: 'dragon', onEnd: () => this.endDragon(u) });
    this.addBuff(u, 'spd', dur, 0.12, { key: 'dragon_spd' });
    this.recalc(u);
  }

  endDragon(u) {
    if (!u.dragon) return;
    u.dragon = false;
    u.radius = 0.75;
    this.scene.remove(u.model.group);
    u.model = u.normalModel;
    this.scene.add(u.model.group);
    u.buffs = u.buffs.filter((b) => b.key !== 'dragon' && b.key !== 'dragon_spd');
    this.recalc(u);
    this.fx.burst(u.pos, 0xdfe6f0, 20, 4, 0.15, 0.6, 2);
  }

  // ------------------------------------------------------------------ bucle principal
  update(dt) {
    if (this.paused || this.over && this.overT > 4) return;
    if (this.over) this.overT = (this.overT || 0) + dt;
    this.time += dt;

    if (!this.over && this.time >= this.nextWave) {
      this.spawnWave();
      this.nextWave += CONST.waveInterval;
    }

    // protección de estructuras
    // (la torre interior de un carril no se puede atacar mientras viva la exterior,
    // y el núcleo queda expuesto en cuanto un carril se queda sin torres)
    for (const team of ['blue', 'red']) {
      const towers = this.units.filter((u) => u.team === team && u.kind === 'tower');
      for (const lane of Object.keys(LANES)) {
        const t1 = towers.find((t) => t.lane === lane && t.tier === 1);
        const t2 = towers.find((t) => t.lane === lane && t.tier === 2);
        if (t2) t2.protected = !!(t1 && t1.alive);
      }
      const core = team === 'blue' ? this.blueNexus : this.boss;
      const was = core.protected;
      core.protected = Object.keys(LANES).every((lane) => towers.some((t) => t.lane === lane && t.alive));
      if (was && !core.protected) this.emit('coreExposed', { core });
    }

    // oro pasivo
    if (this.time > CONST.firstWave) for (const h of this.heroes) h.gold += CONST.passiveGold * dt;

    // IA
    for (const u of this.units) {
      if (!u.alive || this.over) continue;
      if (u.kind === 'hero') { if (u.isBot) heroAI(this, u, dt); }
      else if (u.kind === 'minion') minionAI(this, u, dt);
      else if (u.kind === 'monster') monsterAI(this, u, dt);
      else structureAI(this, u, dt);
    }
    if (!this.over) updateJungle(this, dt);

    for (const u of this.units) if (u.alive) this.updateUnit(u, dt);
    this.separate();
    this.updateProjectiles(dt);
    this.updateZones(dt);

    // reaparición
    for (const h of this.heroes) {
      if (h.alive) continue;
      h.deadTimer -= dt;
      if (h.deadTimer <= 0 && !this.over) this.respawn(h);
    }

    // textos flotantes
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 1.1);
  }

  respawn(h) {
    h.alive = true;
    const sp = this.spawnPoint(h.team, h.slot ?? 0);
    h.pos.set(sp.x, 0, sp.z);
    h.deathAnim = 0;
    h.recallT = 0;
    this.recalc(h, true);
    h.model.group.visible = true;
    h.model.group.rotation.set(0, h.facing, 0);
    h.model.group.position.copy(h.pos);
    h.history = [];
    h.order = null;
    for (const a of h.abilities) a.cd = Math.min(a.cd, 3);
    this.fx.ring(h.pos, 2.5, 0x8fd0ff, 0.8, { grow: true });
    if (h.isPlayer) { this.emit('message', { text: '¡Has reaparecido!', kind: 'info' }); this.sound('reaparecer', null, 0.7); }
  }

  // ------------------------------------------------------------------ render
  syncVisuals(dt) {
    const t = this.time;
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const g = u.model?.group;
      if (!g) continue;
      if (!u.alive) {
        if (u.deathAnim > 0) {
          u.deathAnim += dt;
          if (u.model.glb) {
            // los modelos animados tienen su propia animación de muerte
            animateModel(u.model, t + u.id, false, 0, 1, true);
            if (u.deathAnim > 2.2) {
              if (u.kind === 'minion' || u.kind === 'monster') { this.scene.remove(g); this.units.splice(i, 1); }
              else { g.visible = false; u.deathAnim = 0; }
            }
          } else if (u.kind === 'hero' || u.kind === 'minion' || u.kind === 'monster') {
            g.rotation.x = Math.min(Math.PI / 2, u.deathAnim * 4) * -1;
            g.position.y = -Math.max(0, u.deathAnim - 0.6) * 2;
            if (u.deathAnim > 1.2) {
              if (u.kind === 'minion' || u.kind === 'monster') { this.scene.remove(g); this.units.splice(i, 1); }
              else { g.visible = false; u.deathAnim = 0; }
            }
          } else {
            // estructuras: se hunden y quedan escombros
            g.position.y = -Math.min(1, u.deathAnim * 0.6) * (u.height * 0.7);
            g.rotation.z = Math.min(0.25, u.deathAnim * 0.1);
            if (u.deathAnim > 2) u.deathAnim = 0;
          }
        }
        if (u.ringMesh) u.ringMesh.visible = false;
        continue;
      }
      g.position.x = u.pos.x;
      g.position.z = u.pos.z;
      if (u.kind === 'hero' || u.kind === 'minion' || u.kind === 'monster') {
        // girar suavemente
        let dr = u.facing - g.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        g.rotation.y += dr * Math.min(1, dt * 14);
        const frozen = this.hasBuff(u, 'stun');
        if (!frozen) animateModel(u.model, t + u.id, u.moving, u.attackAnim, u.kind === 'hero' ? 1 : 0.8);
        if (!frozen && u.model.extra?.anim) u.model.extra.anim(t, u);
        if (u.kind === 'minion' && u.type === 'ranged' && u.team === 'red') g.position.y = 0.35 + Math.sin(t * 3 + u.id) * 0.12;
        if (u.dragon) g.position.y = 0.4 + Math.sin(t * 3) * 0.15;
      }
      else if (u.model.glb) animateModel(u.model, t + u.id, false, u.attackAnim); // estructuras animadas
      if (u.ringMesh) {
        u.ringMesh.visible = true;
        u.ringMesh.position.set(u.pos.x, 0.05, u.pos.z);
        u.ringMesh.scale.setScalar(u.radius * 1.15);
      }
      // detalles animados
      const ex = u.model.extra;
      if (ex?.crystal) {
        ex.crystal.rotation.y += dt * 1.5;
        ex.crystal.position.y = (ex.gemY ?? 6) + Math.sin(t * 2 + u.id) * 0.2;
      }
      if (ex?.flameList) {
        const big = this.getBuff(u, 'fot_fury') ? 1.8 : 1;
        ex.flameList.forEach((f, k) => {
          const s = (0.8 + Math.sin(t * 18 + k * 1.7) * 0.25) * big;
          f.scale.set(1, s, 1);
        });
        if (big > 1 && Math.random() < 0.5) this.fx.spark(new THREE.Vector3(u.pos.x, 2.4, u.pos.z), Math.random() < 0.5 ? 0xff6a00 : 0xffd040, 0.1, 0.5, 2.5);
      }
      if (ex?.glow) {
        const on = !!this.getBuff(u, 'jos_q');
        ex.glow.material = on ? GLOW_MAT : ex.glowBase || (ex.glowBase = ex.glow.material);
      }
      if (ex?.book) ex.book.position.y = 1.45 + Math.sin(t * 2.5) * 0.08;
      if (ex?.spin) for (const o of ex.spin) { o.rotation.y += dt * 1.6; o.rotation.x += dt * 0.7; }
      if (ex?.wheel) ex.wheel.rotation.z += dt * 0.8;
      if (ex?.lorik) {
        ex.lorik.position.y = 1.8 + Math.sin(t * 1.4) * 0.3;
        ex.bolts.rotation.y += dt * 0.8;
        ex.bolts.visible = Math.random() < 0.6;
      }
      // efectos de estado visibles
      if (this.hasBuff(u, 'stun') && Math.random() < 0.2) this.fx.spark(new THREE.Vector3(u.pos.x, u.height, u.pos.z), 0x9ad8ff, 0.08, 0.4, 0.5);
      if (this.hasBuff(u, 'root') && Math.random() < 0.2) this.fx.spark(new THREE.Vector3(u.pos.x, 0.2, u.pos.z), 0x8a2aff, 0.1, 0.5, 0.8);
      if (this.hasBuff(u, 'mark') && Math.random() < 0.12) this.fx.spark(new THREE.Vector3(u.pos.x, u.height + 0.3, u.pos.z), 0xff5a5a, 0.1, 0.4, 0.3);
      if (u.shields.length && Math.random() < 0.15) this.fx.spark(new THREE.Vector3(u.pos.x + (Math.random() - 0.5), 1 + Math.random(), u.pos.z + (Math.random() - 0.5)), 0xfff2a0, 0.07, 0.5, 0.6);
    }
    this.world.update?.(t, dt);
    this.fx.update(dt);
  }

  updateCamera(dt, aspect) {
    const p = this.player || this.heroes[0];
    const target = p.pos;
    const z = this.camZoom;
    const desired = new THREE.Vector3(target.x, 25 * z, target.z + 16 * z);
    if (!this.camPos) this.camPos = desired.clone();
    this.camPos.lerp(desired, Math.min(1, dt * 8));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camPos.x, 0, this.camPos.z - 16 * z);
    if (this.shakeAmt > 0.005) {
      const k = this.shakeAmt;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
      this.shakeAmt *= Math.max(0, 1 - dt * 7);
    }
    if (this.debugCam) { this.camera.position.copy(this.debugCam.pos); this.camera.lookAt(this.debugCam.look); }
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.sun.position.set(this.camPos.x + 20, 50, this.camPos.z - 10);
    this.sun.target.position.set(this.camPos.x, 0, this.camPos.z - 16 * z);
  }
}

const GLOW_MAT = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffd040, emissiveIntensity: 2.2 });

// unidades que se empujan entre sí (los épicos no se dejan empujar)
const mobile = (u) => u.kind === 'hero' || u.kind === 'minion' || (u.kind === 'monster' && !u.epic);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
