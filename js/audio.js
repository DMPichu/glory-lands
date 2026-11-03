// Sonido: música y efectos que se cargan solos si existen los archivos.
// Convención de nombres (ver audio/LEEME.md):
//   audio/musica/<nombre>.ogg|.mp3    menu, batalla, lorik, victoria, derrota
//   audio/efectos/<nombre>.ogg|.mp3   comunes (golpe_espada, critico...) y de
//                                     habilidades: <héroe>_<q|w|e|r> (kouji_r)
//   audio/voz/<héroe>_<momento>.ogg   elegir, definitiva, matar, morir
// Si un archivo no existe, simplemente no suena (no hay errores).

const EXT = ['ogg', 'mp3'];
let ctx = null, master = null, musicGain = null, sfxGain = null;
const buffers = new Map(); // ruta base -> Promise<AudioBuffer|null>
let music = null, musicName = null, muted = false;
const lastPlay = new Map();

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
  return ctx;
}

// Los navegadores solo dejan sonar audio tras un clic o una tecla
export function unlock() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(v) {
  muted = !!v;
  if (master) master.gain.value = muted ? 0 : 1;
}

function load(base) {
  if (!buffers.has(base)) {
    buffers.set(base, (async () => {
      for (const ext of EXT) {
        try {
          const r = await fetch(`${base}.${ext}`);
          if (!r.ok) continue;
          return await ctx.decodeAudioData(await r.arrayBuffer());
        } catch { /* probar la otra extensión */ }
      }
      return null;
    })());
  }
  return buffers.get(base);
}

// Efecto puntual. vol de 0 a 1; los repetidos muy seguidos se ignoran.
// 'name' puede ser una lista: suena el primero que exista (p. ej. el ataque
// propio del héroe y, si no hay, el genérico).
export async function sfx(name, vol = 1, folder = 'efectos') {
  if (muted || !ensure()) return;
  const names = [].concat(name);
  const key = folder + '/' + names[0];
  const now = performance.now();
  if (now - (lastPlay.get(key) || 0) < 60) return;
  lastPlay.set(key, now);
  let buf = null;
  for (const n of names) if ((buf = await load(`audio/${folder}/${n}`))) break;
  if (!buf || vol <= 0.01) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.96 + Math.random() * 0.08;
  const g = ctx.createGain(); g.gain.value = Math.min(1, vol);
  src.connect(g).connect(sfxGain);
  src.start();
}

export const voice = (name, vol = 1) => sfx(name, vol, 'voz');

// Música en bucle con fundido entre pistas
export async function playMusic(name, loop = true) {
  if (!ensure() || musicName === name) return;
  musicName = name;
  const buf = await load(`audio/musica/${name}`);
  if (musicName !== name) return; // otra pista pidió paso mientras cargaba
  const old = music;
  if (old) {
    old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => { try { old.src.stop(); } catch { /* ya parada */ } }, 2000);
    music = null;
  }
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = loop;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(g).connect(musicGain);
  src.start();
  g.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
  music = { src, g };
}

// Comprueba qué archivos de audio existen (para la autoprueba)
export async function probe(names, folder) {
  const found = [];
  for (const n of names) {
    for (const ext of EXT) {
      try { const r = await fetch(`audio/${folder}/${n}.${ext}`, { method: 'HEAD' }); if (r.ok) { found.push(`${n}.${ext}`); break; } } catch { /* nada */ }
    }
  }
  return found;
}
