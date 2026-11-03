// Interfaz: HUD, barras de vida, textos flotantes, minimapa y tienda.
import * as THREE from 'three';
import { HEROES, ITEMS, SHOP_ORDER, LAYOUT, CONST, xpToNext } from './config.js';

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
      if (victim === p) this.message(`Has caído ante ${killer?.name || 'las fuerzas enemigas'}`, 'danger');
      else if (killer === p) this.message(`¡Has derrotado a ${victim.name}!`, 'good');
      else this.message(`${killer?.name || 'Una torre'} ha derrotado a ${victim.name}`, victim.team === p.team ? 'danger' : 'good');
    });
    game.on('towerDestroyed', ({ tower }) => {
      const ours = tower.team === this.g.player.team;
      this.message(ours ? `¡Han destruido nuestra ${tower.name}!` : `¡${tower.name} destruido!`, ours ? 'danger' : 'good');
      if (!ours && tower.tier === 2) this.message('¡Lorik ya es vulnerable! Ve a por él.', 'good');
    });
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const p = this.g.player;
    const def = p.def;
    $('portrait').textContent = def.name[0];
    $('portrait').style.background = `radial-gradient(circle at 35% 30%, ${def.color}, #1a1626 80%)`;
    $('heroName').textContent = def.name;
    const abil = $('abilities');
    abil.innerHTML = '';
    // pasiva
    const pas = document.createElement('div');
    pas.className = 'ability passive';
    pas.innerHTML = `<div class="icon">${def.passive.icon}</div>`;
    pas.dataset.tip = `<b>${def.passive.name}</b> <i>(pasiva)</i><br>${def.passive.desc}`;
    abil.appendChild(pas);
    this.abEls = def.abilities.map((a, i) => {
      const el = document.createElement('div');
      el.className = 'ability';
      el.innerHTML = `<div class="icon">${a.icon}</div><div class="cd"></div><div class="cdtext"></div><div class="key">${a.key}</div>
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
    // panel de equipos
    const tp = $('teams');
    tp.innerHTML = '';
    this.teamEls = this.g.heroes.map((h) => {
      const el = document.createElement('div');
      el.className = 'tmember ' + h.team + (h.isPlayer ? ' me' : '');
      el.innerHTML = `<div class="tport" style="background:radial-gradient(circle at 35% 30%, ${h.def.color}, #1a1626 80%)">${h.def.name[0]}<span class="tlvl"></span><span class="tdead"></span></div>
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

  buildShop() {
    const list = $('shopList');
    list.innerHTML = '';
    let cat = null;
    for (const id of SHOP_ORDER) {
      const it = ITEMS[id];
      if (it.cat && it.cat !== cat) {
        cat = it.cat;
        const h = document.createElement('div');
        h.className = 'shopCat';
        h.textContent = cat;
        list.appendChild(h);
      }
      const el = document.createElement('div');
      el.className = 'shopItem';
      el.innerHTML = `<div class="sicon">${it.icon}</div><div class="sinfo"><b>${it.name}</b><span>${it.desc}</span></div><div class="scost">${it.cost} 🪙</div>`;
      el.onclick = () => {
        const r = this.g.buy(this.g.player, id);
        if (r) this.message(r, 'warn');
        else this.message(`Comprado: ${it.name}`, 'good');
      };
      el.dataset.id = id;
      list.appendChild(el);
    }
    $('shopClose').onclick = () => this.toggleShop(false);
  }

  toggleShop(v) {
    this.shopOpen = v ?? !this.shopOpen;
    $('shop').style.display = this.shopOpen ? 'flex' : 'none';
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
    const sh = g.shieldTotal(p);
    $('hpShield').style.width = Math.min(1 - hpR, sh / p.maxHp) * 100 + '%';
    $('hpShield').style.left = hpR * 100 + '%';
    $('hpText').textContent = `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}${sh > 1 ? ` (+${Math.round(sh)})` : ''}`;
    $('mpFill').style.width = (p.mp / Math.max(1, p.maxMp)) * 100 + '%';
    $('mpText').textContent = `${Math.floor(p.mp)} / ${Math.round(p.maxMp)}`;
    const xpR = p.level >= CONST.maxLevel ? 1 : p.xp / xpToNext(p.level);
    $('xpFill').style.width = xpR * 100 + '%';
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
    $('stats').innerHTML = `⚔️ ${Math.round(g.stat(p, 'ad'))} · ✨ ${Math.round(g.stat(p, 'ap'))} · 🛡️ ${Math.round(g.stat(p, 'armor'))} · 🔮 ${Math.round(g.stat(p, 'mr'))} · ⚡ ${g.stat(p, 'as').toFixed(2)} · 👢 ${g.stat(p, 'speed').toFixed(1)}`;

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
        cdEl.style.height = (a.cd / (a.maxCd || 1)) * 100 + '%';
        cdText.textContent = a.cd >= 1 ? Math.ceil(a.cd) : a.cd.toFixed(1);
      } else { cdEl.style.height = '0%'; cdText.textContent = ''; }
      el.querySelector('.cost').textContent = cost;
      el.querySelectorAll('.pips i').forEach((pip, k) => pip.classList.toggle('on', k < a.rank));
      el.querySelector('.lvl').style.display = g.canLevel(p, i) ? 'block' : 'none';
    });
    $('skillPts').textContent = p.skillPoints > 0 && !g.opts.autoLevel ? `Puntos de habilidad: ${p.skillPoints}` : '';

    // objetos
    this.itemEls.forEach((el, i) => {
      const id = p.items[i];
      el.textContent = id ? ITEMS[id].icon : '';
      el.classList.toggle('empty', !id);
    });
    $('potionCount').textContent = p.potions;
    $('potionSlot').classList.toggle('empty', p.potions === 0);

    // tienda: resaltar lo que se puede comprar
    const inShop = g.inShop(p);
    $('shopWarn').style.display = inShop ? 'none' : 'block';
    $('shopBtn').classList.toggle('glow', inShop && p.gold >= 600);
    if (this.shopOpen) {
      document.querySelectorAll('.shopItem').forEach((el) => {
        el.classList.toggle('cant', p.gold < ITEMS[el.dataset.id].cost || !inShop);
      });
      $('shopGold').textContent = Math.floor(p.gold);
    }

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

  drawMinimap() {
    const g = this.g, c = this.mctx;
    const W = this.mini.width, H = this.mini.height;
    const sx = (x) => ((x + 104) / 208) * W;
    const sz = (z) => ((z + 26) / 52) * H;
    const grd = c.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#2e4a2a'); grd.addColorStop(0.55, '#4a4636'); grd.addColorStop(1, '#2a2230');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(190,160,110,0.55)';
    c.fillRect(0, sz(-11), W, sz(11) - sz(-11));
    // fuentes
    c.fillStyle = 'rgba(80,160,255,0.6)'; c.beginPath(); c.arc(sx(LAYOUT.blue.fountain), sz(0), 9, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,60,90,0.6)'; c.beginPath(); c.arc(sx(LAYOUT.red.fountain), sz(0), 9, 0, 7); c.fill();
    for (const u of g.units) {
      if (!u.alive && u.kind !== 'tower') continue;
      const col = u.team === 'blue' ? '#4aa3ff' : '#ff4a5a';
      if (u.kind === 'tower' || u.kind === 'nexus' || u.kind === 'boss') {
        c.fillStyle = u.alive ? col : '#555';
        const s = u.kind === 'tower' ? 8 : 12;
        c.fillRect(sx(u.pos.x) - s / 2, sz(u.pos.z) - s / 2, s, s);
        c.strokeStyle = '#000'; c.strokeRect(sx(u.pos.x) - s / 2, sz(u.pos.z) - s / 2, s, s);
      } else if (u.kind === 'minion') {
        c.fillStyle = col;
        c.fillRect(sx(u.pos.x) - 1.5, sz(u.pos.z) - 1.5, 3, 3);
      }
    }
    for (const h of g.heroes) {
      if (!h.alive) continue;
      c.fillStyle = h.isPlayer ? '#5dff7a' : h.team === 'blue' ? '#4aa3ff' : '#ff4a5a';
      c.beginPath(); c.arc(sx(h.pos.x), sz(h.pos.z), h.isPlayer ? 6 : 5, 0, 7); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
    }
    // vista de la cámara
    const p = g.camPos;
    if (p) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
      c.strokeRect(sx(p.x - 22 * g.camZoom), sz(p.z - 20 * g.camZoom - 14 * g.camZoom), sx(44 * g.camZoom) - sx(0), sz(28 * g.camZoom) - sz(0));
    }
  }
}
