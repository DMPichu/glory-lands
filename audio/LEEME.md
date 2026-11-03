# Sonido

Formato `.ogg` (o `.mp3`). Si un archivo no está, simplemente no suena.

**`musica/`**: `menu`, `batalla`, `lorik` (cuando Lorik queda expuesto), `victoria`, `derrota`.

**`efectos/`** comunes: `golpe_espada`, `golpe_puno`, `disparo_flecha`, `disparo_magia`, `disparo_arma_fuego`, `critico`, `torre_dispara`, `torre_destruida`, `heroe_muere`, `subir_nivel`, `oro`, `comprar`, `pocion`, `reaparecer`, `lorik_raices`, `lorik_invoca`, `aviso`, `clic`.

**`efectos/`** de habilidades: `<héroe>_<q|w|e|r>` (por ejemplo `kouji_r.ogg`). Tabla con el nombre de cada habilidad en `REQUISITOS.md`.

**`voz/`**: `<héroe>_elegir`, `<héroe>_definitiva`, `<héroe>_matar`, `<héroe>_morir`. Solo suenan las del héroe del jugador.

Volumen: los efectos se oyen menos cuanto más lejos ocurren. Para convertir: `ffmpeg -i entrada.wav -c:a libvorbis -q:a 4 salida.ogg`.
