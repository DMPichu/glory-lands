// Imágenes opcionales. Si falta un archivo se usa lo de siempre (emoji o inicial).
//   img/retratos/<héroe>.webp   retrato ilustrado (tiene prioridad sobre el token)
//   tokens/<héroe>.webp         token de la campaña (también 'lorik')
//   img/habilidades/<id>.svg    icono de habilidad o pasiva (game-icons.net, CC BY 3.0)
//   img/objetos/<id>.webp       icono de objeto de la tienda
// Ver img/LEEME.md y tokens/LEEME.md.

const portraitUrls = (id) => [`img/retratos/${id}.webp`, `tokens/${id}.webp`];

// Icono de habilidad o pasiva con un halo del color del héroe
export function abilityIcon(id, emoji, color) {
  return `<img class="aicon" src="img/habilidades/${id}.svg" alt="" style="--hc:${color}" onerror="this.outerHTML='${emoji}'">`;
}

// Icono de objeto: la imagen si existe, si no el emoji
export function itemIcon(id, emoji) {
  return `<img class="iicon" src="img/objetos/${id}.webp" alt="" onerror="this.outerHTML='${emoji}'">`;
}

// Retrato redondo: retrato ilustrado, si no el token, si no la inicial
export function portrait(def) {
  const [a, b] = portraitUrls(def.id);
  return `${def.name[0]}<img class="tok" src="${a}" alt="" onerror="if(this.dataset.f)this.remove();else{this.dataset.f=1;this.src='${b}'}">`;
}

// Retratos ya cargados para dibujarlos en el lienzo (minimapa y barras de vida)
const cache = new Map();
export function tokenImage(id) {
  if (!cache.has(id)) {
    const urls = portraitUrls(id);
    const img = new Image();
    img.ok = false;
    img.onload = () => { img.ok = true; };
    let tries = 0;
    img.onerror = () => { if (++tries < urls.length) img.src = urls[tries]; };
    img.src = urls[0];
    cache.set(id, img);
  }
  const img = cache.get(id);
  return img.ok ? img : null;
}

// Dibuja un retrato recortado en círculo con borde
export function drawToken(c, img, x, y, r, border) {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath();
  c.clip();
  c.drawImage(img, x - r, y - r, r * 2, r * 2);
  c.restore();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  c.lineWidth = Math.max(1.5, r * 0.18); c.strokeStyle = border; c.stroke();
}
