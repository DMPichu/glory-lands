// Interfaz: HUD, barras de vida, textos flotantes, minimapa y tienda.
import * as THREE from 'three';
import { HEROES, ITEMS, SHOP_ORDER, LAYOUT, CONST, MAP, LANES, xpToNext } from './config.js';
import { riverX } from './models.js';
import { abilityIcon, itemIcon, portrait, tokenImage, drawToken } from './art.js';
import { activeBlessings } from './jungle.js';

const $ = (id) => document.getElementById(id);
const V = new THREE.Vector3();

export class UI {
  constructor(game) {
    this.g = game;
    this.overlay = $('overlay');
    this.ctx = this.overlay.getContext('2d');
    this.mini = $('minimap');
    this.mctx = this.mini.getContext('2d');
    this.msgEl = $('messages');
    this.shopOpen = false;
    this.buildHud();
    this.buildShop();

    game.on('message', (m) => this.message(m.text, m.kind));
    game.on('levelUp', () => {
      if (this.g.player.skillPoints > 0 && !this.g.opts.autoLevel) this.message('¡Subes de nivel! Mejora una habilidad (botón + o Mayús + tecla)', 'info');
      else this.message('¡Subes de nivel!', 'info');
    });
    game.on('heroKilled', ({ victim, killer }) => {
      const p = this.g.player;
      const L = (u) => this.g.label(u);
      if (victim === p) this.message(`Has caído ante ${L(killer) || 'las fuerzas enemigas'}`, 'danger');
      else if (killer === p) this.message(`¡Has derrotado a ${L(victim)}!`, 'good');
      else this.message(`${L(killer) || 'Una torre'} ha derrotado a ${L(victim)}`, victim.team === p.team ? 'danger' : 'good');
    });
    game.on('heroKilled', (e) => this.announceKill(e));
    game.on('heroKilled', ({ victim }) => (this.deathMarks ||= []).push({ x: victim.pos.x, z: victim.pos.z, t: this.g.time, ally: victim.team === this.g.player.team }));
    game.on('epicKilled', ({ monster, team }) => this.banner(`¡${monster.name} derrotado!`, team === this.g.player.team ? 'good' : 'danger', team === this.g.player.team ? 'Bendición para todo el equipo' : 'La Legión recibe su bendición'));
    game.on('towerDestroyed', ({ tower }) => {
      const ours = tower.team === this.g.player.team;
      this.message(ours ? `¡Han destruido nuestra ${tower.name}!` : `¡${tower.name} destruido!`, ours ? 'danger' : 'good');
    });
    game.on('coreExposed', ({ core }) => {
      if (core.team === this.g.player.team) this.message('¡El Santuario ha quedado expuesto! ¡Defiéndelo!', 'danger');
      else this.message('¡El Altar ya es vulnerable! Ve a por él.', 'good');
    });
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const p = this.g.player;
    const def = p.def;
    $('portrait').innerHTML = portrait(def);
    $('portrait').style.background = `radial-gradient(circle at 35% 30%, ${def.color}, #1a1626 80%)`;
    $('heroName').textContent = def.name;
    const abil = $('abilities');
    abil.innerHTML = '';
    // pasiva
    const pas = document.createElement('div');
    pas.className = 'ability passive';
    pas.innerHTML = `<div class="icon">${abilityIcon(def.passive.id, def.passive.icon, def.color)}</div>`;
    pas.dataset.tip = `<b>${def.passive.name}</b> <i>(pasiva)</i><br>${def.passive.desc}`;
    abil.appendChild(pas);
    this.abEls = def.abilities.map((a, i) => {
      const el = document.createElement('div');
      el.className = 'ability';
      el.innerHTML = `<div class="icon">${abilityIcon(a.id, a.icon, def.color)}</div><div class="cd"></div><div class="cdtext"></div><div class="key">${a.key}</div>
        <div class="pips">${'<i></i>'.repeat(i === 3 ? 3 : 5)}</div><button class="lvl" title="Mejorar">+</button><div class="cost"></div>`;
      el.dataset.tip = `<b>${a.name}</b> [${a.key}]<br>${a.desc}<br><span class="dim">Maná: ${a.cost.join('/')} · Recarga: ${a.cd.join('/')} s</span>`;
      el.querySelector('.lvl').addEventListener('mousedown', (ev) => {
        ev.stopPropagation();
        this.g.levelAbility(this.g.player, i);
      });
      el.addEventListener('mousedown', (ev) => {
        if (ev.button !== 0 || ev.target.classList.contains('lvl')) return;
        ev.stopPropagation();
        this.onAbilityClick?.(i);
      });
      el.addEventListener('mouseenter', () => this.onAbilityHover?.(i));
      el.addEventListener('mouseleave', () => this.onAbilityHover?.(-1));
      abil.appendChild(el);
      return el;
    });
    // tooltips
    const tip = $('tooltip');
    document.querySelectorAll('[data-tip]').forEach((el) => this.bindTip(el, tip));
    $('shopBtn').onclick = () => this.toggleShop();
    $('potionSlot').onclick = () => this.g.usePotion(this.g.player);
    this.itemEls = [...document.querySelectorAll('#items .item')];
    this.itemEls.forEach((el, i) => {
      el.addEventListener('contextmenu', (ev) => { ev.preventDefault(); const r = this.g.sell(this.g.player, i); if (r) this.message(r, 'warn'); });
      el.addEventListener('mouseenter', (ev) => {
        const id = this.g.player.items[i];
        if (!id) return;
        tip.innerHTML = `<b>${ITEMS[id].name}</b><br>${ITEMS[id].desc}<br><span class="dim">Clic derecho en la base: vender por ${Math.floor(ITEMS[id].cost * 0.6)} de oro</span>`;
        tip.style.display = 'block';
        this.placeTip(tip, ev);
      });
      el.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });
    // paneles de equipos: aliados a la izquierda, enemigos a la derecha
    $('teams').innerHTML = '';
    $('teamsRed').innerHTML = '';
    this.teamEls = this.g.heroes.map((h) => {
      const tp = $(h.team === 'blue' ? 'teams' : 'teamsRed');
      const el = document.createElement('div');
      el.className = 'tmember ' + h.team + (h.isPlayer ? ' me' : '');
      el.innerHTML = `<div class="tport" style="background:radial-gradient(circle at 35% 30%, ${h.def.color}, #1a1626 80%)">${portrait(h.def)}<span class="tlvl"></span><span class="tdead"></span></div>
        <div class="tinfo"><div class="tname">${h.name}</div><div class="tbar"><i></i></div><div class="tkda"></div></div>`;
      tp.appendChild(el);
      return el;
    });
  }

  bindTip(el, tip) {
    el.addEventListener('mouseenter', (ev) => { tip.innerHTML = el.dataset.tip; tip.style.display = 'block'; this.placeTip(tip, ev); });
    el.addEventListener('mousemove', (ev) => this.placeTip(tip, ev));
    el.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }

  placeTip(tip, ev) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, ev.clientX - w / 2)) + 'px';
    tip.style.top = Math.max(8, ev.clientY - h - 18) + 'px';
  }

  // ---------------------------------------------------------------- tienda
  buildShop() {
    const def = this.g.player.def;
    // recomendados: la compra habitual del héroe, en orden, más las pociones
    this.shopRec = [...new Set(['potion', ...(def.build || [])])];
    this.shopTab = 'rec';
    this.shopSel = this.shopRec.find((id) => id !== 'potion') || SHOP_ORDER[0];
    this.shopSellIdx = -1;
    const cats = ['rec', 'all', ...new Set(SHOP_ORDER.map((id) => ITEMS[id].cat).filter(Boolean))];
    const names = { rec: '⭐ Recomendados', all: 'Todos' };
    const icons = { Ataque: '⚔️', Magia: '✨', Defensa: '🛡️', Utilidad: '👢', Consumibles: '🧪' };
    const tabs = $('shopTabs');
    tabs.innerHTML = '';
    for (const c of cats) {
      const b = document.createElement('button');
      b.className = 'stab';
      b.dataset.tab = c;
      b.textContent = names[c] || `${icons[c] || ''} ${c}`.trim();
      b.onclick = () => { this.shopTab = c; this.renderShopGrid(); };
      tabs.appendChild(b);
    }
    $('shopClose').onclick = () => this.toggleShop(false);
    this.renderShopGrid();
    this.renderShopDetail();
  }

  shopBuy(id) {
    const it = ITEMS[id];
    const r = this.g.buy(this.g.player, id);
    if (r) this.message(r, 'warn');
    else { this.message(`Comprado: ${it.name}`, 'good'); this.g.sound?.('comprar', null, 0.6); }
    this.shopKey = null;
  }

  renderShopGrid() {
    const ids = this.shopTab === 'rec' ? this.shopRec : this.shopTab === 'all' ? SHOP_ORDER : SHOP_ORDER.filter((id) => ITEMS[id].cat === this.shopTab);
    document.querySelectorAll('.stab').forEach((b) => b.classList.toggle('sel', b.dataset.tab === this.shopTab));
    const grid = $('shopGrid');
    grid.innerHTML = '';
    for (const id of ids) {
      const it = ITEMS[id];
      const el = document.createElement('div');
      el.className = 'scard';
      el.dataset.id = id;
      el.innerHTML = `${this.shopRec.includes(id) && this.shopTab !== 'rec' ? '<span class="srec" title="Recomendado">⭐</span>' : ''}<span class="sown"></span>
        <div class="sic">${itemIcon(id, it.icon)}</div><div class="sn">${it.name}</div><div class="sc">${it.cost} 🪙</div>`;
      el.onclick = () => { this.shopSel = id; this.shopSellIdx = -1; this.renderShopDetail(); };
      el.ondblclick = () => this.shopBuy(id);
      el.oncontextmenu = (e) => { e.preventDefault(); this.shopSel = id; this.shopSellIdx = -1; this.shopBuy(id); this.renderShopDetail(); };
      grid.appendChild(el);
    }
    this.shopKey = null;
  }

  statLines(stats = {}) {
    const L = { ad: 'Daño de ataque', ap: 'Poder mágico', hp: 'Vida', mp: 'Maná', armor: 'Armadura', mr: 'Resistencia mágica', as: 'Velocidad de ataque',
      speed: 'Velocidad de movimiento', cdr: 'Reducción de enfriamiento', crit: 'Probabilidad de crítico', lifesteal: 'Robo de vida', onhit: 'Daño mágico al golpear',
      arpen: 'Penetración de armadura', mpen: 'Penetración mágica', thorns: 'Devuelve daño (espinas)', healpow: 'Curaciones y escudos', hpRegen: 'Regeneración de vida' };
    const pct = new Set(['as', 'cdr', 'crit', 'lifesteal', 'arpen', 'mpen', 'thorns', 'healpow']);
    return Object.entries(stats).map(([k, v]) => `<div class="sdStat"><span>${L[k] || k}</span><b>+${pct.has(k) ? Math.round(v * 100) + ' %' : v}</b></div>`).join('');
  }

  renderShopDetail() {
    const g = this.g, p = g.player, el = $('shopDetail');
    const selling = this.shopSellIdx >= 0 && p.items[this.shopSellIdx];
    const id = selling ? p.items[this.shopSellIdx] : this.shopSel;
    const it = ITEMS[id];
    if (!it) { el.innerHTML = '<div class="sdEmpty">Elige un objeto para ver sus detalles</div>'; return; }
    const inShop = g.inShop(p);
    const owned = it.consumable ? p.potions : p.items.filter((x) => x === id).length;
    let action;
    if (selling) {
      action = `<button class="sdSell" id="sdSell">Vender por ${Math.floor(it.cost * 0.6)} 🪙</button>`;
    } else {
      const full = !it.consumable && p.items.length >= CONST.maxItems;
      const why = !inShop ? 'Solo en tu base' : full ? 'Inventario lleno' : p.gold < it.cost ? `Te faltan ${Math.ceil(it.cost - p.gold)} 🪙` : '';
      action = `<button class="sdBuy" id="sdBuy" ${why ? 'disabled' : ''}>${why || `Comprar · ${it.cost} 🪙`}</button>`;
    }
    el.innerHTML = `<div class="sdTop"><div class="sdIcon">${itemIcon(id, it.icon)}</div>
        <div><div class="sdName">${it.name}</div><div class="sdCat">${it.cat || ''}${owned ? ` · tienes ${owned}` : ''}</div></div></div>
      <div class="sdStats">${this.statLines(it.stats)}</div>
      <div class="sdDesc">${it.desc}</div>${action}`;
    $('sdBuy')?.addEventListener('click', () => { this.shopBuy(id); this.renderShopDetail(); });
    $('sdSell')?.addEventListener('click', () => {
      const r = g.sell(p, this.shopSellIdx);
      if (r) this.message(r, 'warn'); else this.message(`Vendido: ${it.name}`, 'info');
      this.shopSellIdx = -1; this.shopKey = null; this.renderShopDetail();
    });
    this.detailKey = `${id}|${selling}|${inShop}|${Math.floor(p.gold)}|${p.items.length}|${p.potions}`;
  }

  updateShop() {
    const g = this.g, p = g.player;
    const inShop = g.inShop(p);
    $('shopGold').textContent = Math.floor(p.gold);
    $('shopWarn').style.display = inShop ? 'none' : 'block';
    const key = `${Math.floor(p.gold / 10)}|${p.items.join(',')}|${p.potions}|${inShop}|${this.shopSel}|${this.shopSellIdx}`;
    if (key === this.shopKey) return;
    this.shopKey = key;
    // siguiente objeto recomendado que aún no tiene (se resalta en verde si le llega el oro)
    const next = this.shopRec.find((id) => id !== 'potion' && !p.items.includes(id));
    document.querySelectorAll('.scard').forEach((el) => {
      const id = el.dataset.id, it = ITEMS[id];
      const owned = it.consumable ? p.potions : p.items.filter((x) => x === id).length;
      el.classList.toggle('cant', p.gold < it.cost || !inShop);
      el.classList.toggle('sel', id === this.shopSel && this.shopSellIdx < 0);
      el.classList.toggle('next', id === next && p.gold >= it.cost && inShop);
      const o = el.querySelector('.sown');
      o.textContent = owned ? '×' + owned : '';
      o.style.display = owned ? 'block' : 'none';
    });
    const inv = $('shopInv');
    inv.innerHTML = '';
    for (let i = 0; i < CONST.maxItems; i++) {
      const id = p.items[i];
      const d = document.createElement('div');
      d.className = 'sinv' + (id ? ' full' : '') + (i === this.shopSellIdx ? ' sel' : '');
      d.innerHTML = id ? itemIcon(id, ITEMS[id].icon) : '';
      d.title = id ? `${ITEMS[id].name} (clic para vender)` : 'Hueco libre';
      if (id) d.onclick = () => { this.shopSellIdx = i; this.shopKey = null; this.renderShopDetail(); };
      inv.appendChild(d);
    }
    const pot = document.createElement('div');
    pot.className = 'sinv' + (p.potions ? ' full' : '');
    pot.innerHTML = `${itemIcon('potion', ITEMS.potion.icon)}<span>${p.potions}</span>`;
    pot.title = 'Pociones (tecla 1)';
    pot.onclick = () => { this.shopSel = 'potion'; this.shopSellIdx = -1; this.shopKey = null; this.renderShopDetail(); };
    inv.appendChild(pot);
    $('shopInvCount').textContent = `${p.items.length} / ${CONST.maxItems}`;
    const dk = `${this.shopSellIdx >= 0 ? p.items[this.shopSellIdx] : this.shopSel}|${this.shopSellIdx >= 0 && !!p.items[this.shopSellIdx]}|${inShop}|${Math.floor(p.gold)}|${p.items.length}|${p.potions}`;
    if (dk !== this.detailKey) this.renderShopDetail();
  }

  toggleShop(v) {
    this.shopOpen = v ?? !this.shopOpen;
    $('shop').style.display = this.shopOpen ? 'flex' : 'none';
    if (this.shopOpen) { this.shopKey = null; this.shopSellIdx = -1; this.updateShop(); this.renderShopDetail(); }
  }

  message(text, kind = 'info') {
    const el = document.createElement('div');
    el.className = 'msg ' + kind;
    el.textContent = text;
    this.msgEl.appendChild(el);
    while (this.msgEl.children.length > 4) this.msgEl.firstChild.remove();
    setTimeout(() => el.classList.add('fade'), 2800);
    setTimeout(() => el.remove(), 3500);
  }

  // ---------------------------------------------------------------- actualización por fotograma
  update() {
    const g = this.g, p = g.player;
    // barras del jugador
    const hpR = p.hp / p.maxHp;
    $('hpFill').style.width = hpR * 100 + '%';
    this.drawBlessings(p);
    if (this.scoreOpen && (this.scoreT = (this.scoreT || 0) + 1) % 15 === 0) this.drawScoreboard();
    const sh = g.shieldTotal(p);
    $('hpShield').style.width = Math.min(1 - hpR, sh / p.maxHp) * 100 + '%';
    $('hpShield').style.left = hpR * 100 + '%';
    $('hpText').textContent = `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}${sh > 1 ? ` (+${Math.round(sh)})` : ''}`;
    $('mpFill').style.width = (p.mp / Math.max(1, p.maxMp)) * 100 + '%';
    $('mpText').textContent = `${Math.floor(p.mp)} / ${Math.round(p.maxMp)}`;
    const xpR = p.level >= CONST.maxLevel ? 1 : p.xp / xpToNext(p.level);
    $('xpFill').style.width = xpR * 100 + '%';
    $('portraitWrap').style.setProperty('--xp', (xpR * 100).toFixed(1));
    $('level').textContent = p.level;
    $('gold').textContent = Math.floor(p.gold);
    $('kda').textContent = `${p.kills} / ${p.deaths} / ${p.assists} · ${p.cs} súbditos`;
    const fury = p.heroId === 'fotsor';
    $('furyBar').style.display = fury ? 'block' : 'none';
    if (fury) {
      const on = g.getBuff(p, 'fot_fury');
      $('furyFill').style.width = (on ? 100 : p.fury) + '%';
      $('furyFill').classList.toggle('on', !!on);
    }
    // estadísticas
    $('stats').innerHTML = `<div title="Daño de ataque">⚔️ ${Math.round(g.stat(p, 'ad'))}</div><div title="Poder mágico">✨ ${Math.round(g.stat(p, 'ap'))}</div><div title="Velocidad de ataque">⚡ ${g.stat(p, 'as').toFixed(2)}</div>`
      + `<div title="Armadura">🛡️ ${Math.round(g.stat(p, 'armor'))}</div><div title="Resistencia mágica">🔮 ${Math.round(g.stat(p, 'mr'))}</div><div title="Velocidad de movimiento">👢 ${g.stat(p, 'speed').toFixed(1)}</div>`;

    // habilidades
    p.abilities.forEach((a, i) => {
      const el = this.abEls[i];
      const cdEl = el.querySelector('.cd');
      const cdText = el.querySelector('.cdtext');
      const cost = a.rank ? a.def.cost[a.rank - 1] : a.def.cost[0];
      const noMana = a.rank && p.mp < cost && !g.getBuff(p, 'yes_page');
      el.classList.toggle('locked', a.rank === 0);
      el.classList.toggle('nomana', !!noMana);
      el.classList.toggle('ready', a.rank > 0 && a.cd <= 0 && !noMana);
      if (a.cd > 0) {
        cdEl.style.setProperty('--p', ((a.cd / (a.maxCd || 1)) * 100).toFixed(1));
        cdText.textContent = a.cd >= 1 ? Math.ceil(a.cd) : a.cd.toFixed(1);
      } else { cdEl.style.setProperty('--p', 0); cdText.textContent = ''; }
      el.querySelector('.cost').textContent = cost;
      el.querySelectorAll('.pips i').forEach((pip, k) => pip.classList.toggle('on', k < a.rank));
      el.querySelector('.lvl').style.display = g.canLevel(p, i) ? 'block' : 'none';
    });
    $('skillPts').textContent = p.skillPoints > 0 && !g.opts.autoLevel ? `Puntos de habilidad: ${p.skillPoints}` : '';

    // objetos
    this.itemEls.forEach((el, i) => {
      const id = p.items[i];
      if (el.dataset.id !== (id || '')) { el.innerHTML = id ? itemIcon(id, ITEMS[id].icon) : ''; el.dataset.id = id || ''; }
      el.classList.toggle('empty', !id);
    });
    $('potionCount').textContent = p.potions;
    $('potionSlot').classList.toggle('empty', p.potions === 0);

    // tienda: resaltar lo que se puede comprar
    const inShop = g.inShop(p);
    $('shopBtn').classList.toggle('glow', inShop && p.gold >= 600);
    if (this.shopOpen) this.updateShop();

    // tiempo y marcador
    const t = Math.floor(g.time);
    $('timer').textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const kills = (team) => g.heroes.filter((h) => h.team === team).reduce((s, h) => s + h.kills, 0);
    $('scoreBlue').textContent = kills('blue');
    $('scoreRed').textContent = kills('red');

    // panel de equipos
    g.heroes.forEach((h, i) => {
      const el = this.teamEls[i];
      el.querySelector('.tbar i').style.width = (h.hp / h.maxHp) * 100 + '%';
      el.querySelector('.tlvl').textContent = h.level;
      el.querySelector('.tdead').textContent = h.alive ? '' : Math.ceil(h.deadTimer);
      el.classList.toggle('dead', !h.alive);
      el.querySelector('.tkda').textContent = `${h.kills}/${h.deaths}/${h.assists}`;
    });

    // muerte
    const dead = $('deadScreen');
    if (!p.alive && !g.over) {
      dead.style.display = 'flex';
      $('deadTimer').textContent = Math.ceil(p.deadTimer);
    } else dead.style.display = 'none';

    this.drawOverlay();
    this.drawMinimap();
  }

  // ---------------------------------------------------------------- barras y textos sobre el mundo
  drawOverlay() {
    const g = this.g, c = this.ctx;
    const W = this.overlay.width, H = this.overlay.height;
    const dpr = window.devicePixelRatio || 1;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = W / dpr, h = H / dpr;
    const project = (x, y, z) => {
      V.set(x, y, z).project(g.camera);
      if (V.z > 1) return null;
      return { x: (V.x * 0.5 + 0.5) * w, y: (-V.y * 0.5 + 0.5) * h };
    };
    for (const u of g.units) {
      if (!u.alive) continue;
      if (g.hasBuff(u, 'stealth') && u.team !== g.player.team) continue; // enemigo en sigilo
      const s = project(u.pos.x, u.height + (u.dragon ? 1.2 : 0.35), u.pos.z);
      if (!s || s.x < -60 || s.x > w + 60 || s.y < -40 || s.y > h + 40) continue;
      const ally = u.team === g.player.team;
      const col = u.isPlayer ? '#5dff7a' : ally ? '#4aa3ff' : '#ff4a5a';
      if (u.kind === 'hero') {
        const bw = 92, bh = 9;
        const x = s.x - bw / 2, y = s.y - 16;
        c.fillStyle = 'rgba(10,10,18,0.85)';
        c.fillRect(x - 18, y - 2, bw + 20, bh + 8);
        c.fillStyle = '#2a2a38';
        c.fillRect(x, y, bw, bh);
        c.fillStyle = col;
        c.fillRect(x, y, bw * (u.hp / u.maxHp), bh);
        const sh = g.shieldTotal(u);
        if (sh > 0) {
          c.fillStyle = 'rgba(255,255,255,0.85)';
          const sx = x + bw * (u.hp / u.maxHp);
          c.fillRect(sx, y, Math.min(bw - (sx - x), bw * (sh / u.maxHp)), bh);
        }
        // marcas cada 100 de vida
        c.fillStyle = 'rgba(0,0,0,0.45)';
        for (let k = 100; k < u.maxHp; k += 100) c.fillRect(x + bw * (k / u.maxHp), y, 1, bh * (k % 500 === 0 ? 1 : 0.5));
        c.fillStyle = '#3a8cff';
        c.fillRect(x, y + bh + 1, bw * (u.mp / Math.max(1, u.maxMp)), 3);
        c.fillStyle = '#fff';
        c.font = 'bold 11px system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText(u.level, x - 9, y + 9);
        c.font = '600 12px system-ui, sans-serif';
        c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 3;
        c.strokeText(u.name, s.x, y - 6);
        c.fillStyle = ally ? '#d8ecff' : '#ffd8dc';
        c.fillText(u.name, s.x, y - 6);
        const tok = tokenImage(u.heroId);
        if (tok) drawToken(c, tok, x - 30, y + 5, 13, col);
        // estados
        const st = [];
        if (g.hasBuff(u, 'stun')) st.push('❄️');
        if (g.hasBuff(u, 'root')) st.push('🌿');
        if (g.hasBuff(u, 'taunt')) st.push('🎭');
        if (g.hasBuff(u, 'slow')) st.push('🐌');
        if (g.hasBuff(u, 'mark')) st.push('🎯');
        if (g.getBuff(u, 'yes_mark')) st.push('📜');
        if (g.hasBuff(u, 'weak')) st.push('💔');
        if (u.channel) st.push('🎯…');
        if (st.length) { c.font = '13px system-ui'; c.fillText(st.join(' '), s.x, y + 28); }
        if (u.recall) {
          // barra de regreso a la base
          const k = 1 - u.recall.t / u.recall.max;
          c.fillStyle = 'rgba(10,10,18,0.85)'; c.fillRect(x - 1, y + 33, bw + 2, 7);
          c.fillStyle = '#8fd0ff'; c.fillRect(x, y + 34, bw * k, 5);
          c.font = '600 10px system-ui, sans-serif'; c.fillStyle = '#d8ecff';
          c.fillText('Volviendo a Zugri', s.x, y + 50);
        }
      } else if (u.kind === 'monster') {
        // monstruos neutrales: barra ámbar; los grandes y los épicos, con nombre
        const big = u.epic || u.base.buff;
        const bw = u.epic ? 130 : big ? 70 : 44, bh = u.epic ? 8 : 5;
        c.fillStyle = 'rgba(10,10,18,0.85)';
        c.fillRect(s.x - bw / 2 - 1, s.y - 1, bw + 2, bh + 2);
        c.fillStyle = u.epic ? '#c8ff40' : '#ffb84a';
        c.fillRect(s.x - bw / 2, s.y, bw * (u.hp / u.maxHp), bh);
        if (big) {
          c.font = `600 ${u.epic ? 13 : 11}px system-ui, sans-serif`;
          c.textAlign = 'center';
          c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 3;
          c.strokeText(u.name, s.x, s.y - 5);
          c.fillStyle = u.epic ? '#e8ffb0' : '#ffe0b0';
          c.fillText(u.name, s.x, s.y - 5);
        }
      } else if (u.kind === 'minion') {
        const bw = 34, bh = 4;
        c.fillStyle = 'rgba(10,10,18,0.8)';
        c.fillRect(s.x - bw / 2 - 1, s.y - 1, bw + 2, bh + 2);
        c.fillStyle = ally ? '#6aa8ff' : '#ff6a6a';
        c.fillRect(s.x - bw / 2, s.y, bw * (u.hp / u.maxHp), bh);
      } else {
        const bw = 120, bh = 8;
        const sy = project(u.pos.x, u.height + 1, u.pos.z);
        if (!sy) continue;
        c.fillStyle = 'rgba(10,10,18,0.85)';
        c.fillRect(sy.x - bw / 2 - 2, sy.y - 2, bw + 4, bh + 4);
        c.fillStyle = u.protected ? '#777' : ally ? '#4aa3ff' : '#ff4a5a';
        c.fillRect(sy.x - bw / 2, sy.y, bw * (u.hp / u.maxHp), bh);
        c.font = '600 12px system-ui, sans-serif';
        c.textAlign = 'center';
        c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 3;
        const label = u.name + (u.protected ? ' 🔒' : '');
        c.strokeText(label, sy.x, sy.y - 6);
        c.fillStyle = '#fff';
        c.fillText(label, sy.x, sy.y - 6);
      }
    }
    // textos flotantes
    for (const f of g.floaters) {
      const s = project(f.x, f.y + f.t * 1.6, f.z);
      if (!s) continue;
      c.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      c.font = `bold ${f.big ? 18 : 14}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 3;
      c.strokeText(f.text, s.x, s.y);
      c.fillStyle = f.color;
      c.fillText(f.text, s.x, s.y);
    }
    c.globalAlpha = 1;
    // enemigo bajo el cursor
    if (this.hover) {
      const s = project(this.hover.pos.x, 0, this.hover.pos.z);
      if (s) {
        c.strokeStyle = '#ff4a5a'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(s.x, s.y, 26, 12, 0, 0, Math.PI * 2); c.stroke();
      }
    }
  }

  // Coordenadas del minimapa <-> mundo (también las usa el clic sobre el minimapa)
  miniToWorld(px, py) {
    const W = this.mini.width, H = this.mini.height;
    return { x: MAP.minX + (px / W) * (MAP.maxX - MAP.minX), z: MAP.minZ + (py / H) * (MAP.maxZ - MAP.minZ) };
  }

  // El fondo (hierba, río, carriles) solo se pinta una vez
  miniBackground() {
    const W = this.mini.width, H = this.mini.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const sx = (x) => ((x - MAP.minX) / (MAP.maxX - MAP.minX)) * W;
    const sz = (z) => ((z - MAP.minZ) / (MAP.maxZ - MAP.minZ)) * H;
    const grd = c.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#2e5a2a'); grd.addColorStop(0.5, '#4a5a3a'); grd.addColorStop(0.62, '#3a3240'); grd.addColorStop(1, '#2a2230');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    for (const o of this.g.obstacles) { c.fillStyle = o.x < 20 ? 'rgba(20,50,20,0.8)' : 'rgba(30,18,34,0.8)'; c.beginPath(); c.arc(sx(o.x), sz(o.z), Math.max(2, (o.r / (MAP.maxX - MAP.minX)) * W), 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(70,150,210,0.9)'; c.lineWidth = 4 * W / 300; c.beginPath();
    for (let z = MAP.minZ; z <= MAP.maxZ; z += 4) (z === MAP.minZ ? c.moveTo : c.lineTo).call(c, sx(riverX(z)), sz(z));
    c.stroke();
    c.strokeStyle = 'rgba(200,175,125,0.75)'; c.lineWidth = 6 * W / 300; c.lineJoin = 'round';
    for (const pts of Object.values(LANES)) { c.beginPath(); pts.forEach(([x, z], i) => (i ? c.lineTo(sx(x), sz(z)) : c.moveTo(sx(x), sz(z)))); c.stroke(); }
    for (const [team, col] of [['blue', 'rgba(80,160,255,0.55)'], ['red', 'rgba(255,60,90,0.55)']]) {
      const f = LAYOUT[team].fountain;
      c.fillStyle = col; c.beginPath(); c.arc(sx(f.x), sz(f.z), 9 * W / 300, 0, 7); c.fill();
    }
    return cv;
  }

  // Anuncios grandes: primera sangre, rachas y asesinatos múltiples
  announceKill({ victim, killer }) {
    const g = this.g;
    const st = (g.killStats ||= { first: false });
    if (victim) { victim.streak = 0; }
    if (!killer || killer.kind !== 'hero') return;
    killer.streak = (killer.streak || 0) + 1;
    killer.multi = g.time - (killer.lastKillT ?? -99) < 10 ? (killer.multi || 1) + 1 : 1;
    killer.lastKillT = g.time;
    const mine = killer.team === g.player.team;
    const who = killer.isPlayer ? '¡Tú!' : g.label(killer);
    const kind = mine ? 'good' : 'danger';
    const MULTI = { 2: '¡Doble derrota!', 3: '¡Triple derrota!', 4: '¡Cuádruple derrota!', 5: '¡MASACRE EN GLORY LANDS!' };
    const STREAK = { 3: 'está imparable', 5: 'es una leyenda de Zugri', 7: 'es divino' };
    if (!st.first) { st.first = true; this.banner('¡Primera sangre!', kind, who); return; }
    if (killer.multi >= 2) { this.banner(MULTI[Math.min(5, killer.multi)], kind, who); return; }
    if (STREAK[killer.streak]) this.banner(`${who} ${STREAK[killer.streak]}`, kind, `${killer.streak} derrotas seguidas`);
  }

  banner(text, kind = 'good', sub = '') {
    const el = $('banner');
    if (!el) return;
    el.className = 'show ' + kind;
    el.innerHTML = `<div class="bt">${text}</div>${sub ? `<div class="bs">${sub}</div>` : ''}`;
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => { el.className = kind; }, 2600);
    this.g.sound('aviso', null, 0.5);
  }

  // Marcador (tecla Tab): los 14 héroes con nivel, K/M/A, súbditos y objetos
  showScoreboard(v) {
    this.scoreOpen = v;
    $('scoreboard').style.display = v ? 'flex' : 'none';
    if (v) this.drawScoreboard();
  }

  drawScoreboard() {
    const g = this.g;
    const row = (h) => `<tr class="${h.isPlayer ? 'me' : ''}${h.alive ? '' : ' dead'}">
      <td class="sbHero"><span class="sbPort" style="background:radial-gradient(circle at 35% 30%, ${h.def.color}, #1a1626 80%)">${portrait(h.def)}</span>${g.label ? g.label(h) : h.name}</td>
      <td>${h.level}</td><td>${h.kills} / ${h.deaths} / ${h.assists}</td><td>${h.cs}</td>
      <td class="sbItems">${h.items.map((id) => `<span>${itemIcon(id, ITEMS[id].icon)}</span>`).join('')}</td>
      <td>${h.alive ? '' : '💀 ' + Math.ceil(h.deadTimer)}</td></tr>`;
    const team = (t, name) => {
      const hs = g.heroes.filter((h) => h.team === t);
      const k = hs.reduce((a, h) => a + h.kills, 0);
      const towers = g.units.filter((u) => u.kind === 'tower' && u.team !== t && !u.alive).length;
      return `<div class="sbTeam ${t}"><div class="sbHead"><b>${name}</b><span>⚔️ ${k} · 🏰 ${towers} torres</span></div>
        <table><tr><th>Héroe</th><th>Nv</th><th>K / M / A</th><th>Súbd.</th><th>Objetos</th><th></th></tr>${hs.map(row).join('')}</table></div>`;
    };
    $('scoreboard').innerHTML = team('blue', 'Blood Hawks') + team('red', 'Legión de Lorik');
  }

  // Bendiciones de la jungla activas del jugador
  drawBlessings(p) {
    const el = $('blessings');
    if (!el) return;
    const list = activeBlessings(this.g, p);
    const key = list.map((b) => b.id).join(',');
    if (key !== this.blessKey) {
      this.blessKey = key;
      el.innerHTML = list.map((b) => `<div class="bless" title="${b.name}: ${b.desc}">${b.icon}<span></span></div>`).join('');
    }
    [...el.children].forEach((d, i) => { d.querySelector('span').textContent = Math.ceil(list[i].t); });
  }

  drawMinimap() {
    const g = this.g, c = this.mctx;
    const W = this.mini.width, H = this.mini.height;
    const k = W / 300; // escala de los iconos respecto al minimapa original
    const sx = (x) => ((x - MAP.minX) / (MAP.maxX - MAP.minX)) * W;
    const sz = (z) => ((z - MAP.minZ) / (MAP.maxZ - MAP.minZ)) * H;
    this.miniBg ||= this.miniBackground();
    c.drawImage(this.miniBg, 0, 0);
    // súbditos
    for (const u of g.units) {
      if (!u.alive || u.kind !== 'minion') continue;
      c.fillStyle = u.team === 'blue' ? '#7ab8ff' : '#ff7a8a';
      c.beginPath(); c.arc(sx(u.pos.x), sz(u.pos.z), (u.superMinion ? 2.6 : 1.8) * k, 0, 7); c.fill();
    }
    // estructuras: torres como escudos, bases como estrellas
    for (const u of g.units) {
      if (!['tower', 'nexus', 'boss'].includes(u.kind)) continue;
      const x = sx(u.pos.x), y = sz(u.pos.z), r = (u.kind === 'tower' ? 5 : 8) * k;
      const col = !u.alive ? '#4a4a52' : u.team === 'blue' ? '#4aa3ff' : '#ff4a5a';
      c.save(); c.translate(x, y);
      c.beginPath();
      if (u.kind === 'tower') { c.moveTo(0, -r); c.lineTo(r, -r * 0.4); c.lineTo(r * 0.7, r * 0.6); c.lineTo(0, r); c.lineTo(-r * 0.7, r * 0.6); c.lineTo(-r, -r * 0.4); }
      else for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath();
      c.fillStyle = col; c.fill();
      c.lineWidth = 1.5 * k; c.strokeStyle = u.protected && u.alive ? '#cfcfcf' : '#0a0810'; c.stroke();
      c.restore();
    }
    // campamentos de la jungla: icono si están vivos, segundos que faltan si no
    for (const camp of g.camps || []) {
      const x = sx(camp.pos.x), y = sz(camp.pos.z);
      const epic = camp.side === 'epic';
      if (camp.alive) {
        c.fillStyle = epic ? '#c8ff40' : '#ffb84a';
        c.beginPath(); c.arc(x, y, (epic ? 5 : 3.2) * k, 0, 7); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = k; c.stroke();
      } else if (epic || camp.next - g.time < 30) {
        c.font = `bold ${9 * k}px system-ui, sans-serif`;
        c.textAlign = 'center';
        c.fillStyle = epic ? '#e8ffb0' : '#ffe0b0';
        c.fillText(Math.max(0, Math.ceil(camp.next - g.time)), x, y + 3 * k);
      }
    }
    // marcas de héroes caídos (se desvanecen en 5 s)
    this.deathMarks = (this.deathMarks || []).filter((d) => g.time - d.t < 5);
    for (const d of this.deathMarks) {
      const a = 1 - (g.time - d.t) / 5, x = sx(d.x), y = sz(d.z), r = 4 * k;
      c.strokeStyle = `rgba(${d.ally ? '255,90,90' : '255,215,0'},${a})`; c.lineWidth = 2 * k;
      c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke();
    }
    for (const h of g.heroes) {
      if (!h.alive) continue;
      if (g.hasBuff(h, 'stealth') && h.team !== g.player.team) continue;
      const col = h.isPlayer ? '#5dff7a' : h.team === 'blue' ? '#4aa3ff' : '#ff4a5a';
      const tok = tokenImage(h.heroId);
      if (tok) { drawToken(c, tok, sx(h.pos.x), sz(h.pos.z), (h.isPlayer ? 9 : 7.5) * k, col); continue; }
      c.fillStyle = col;
      c.beginPath(); c.arc(sx(h.pos.x), sz(h.pos.z), (h.isPlayer ? 6 : 5) * k, 0, 7); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 1.5 * k; c.stroke();
    }
    // vista de la cámara
    const p = g.camPos;
    if (p) {
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5 * k;
      const z = g.camZoom;
      c.strokeRect(sx(p.x - 22 * z), sz(p.z - 34 * z), sx(44 * z) - sx(0), sz(28 * z) - sz(0));
    }
  }
}
