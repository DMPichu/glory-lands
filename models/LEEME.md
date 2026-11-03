# Modelos 3D (.glb)

- `heroes/<héroe>.glb`: uno por héroe, con animaciones de reposo, correr, ataque y muerte. Se conecta en el campo `glb` del héroe en `js/config.js`.
- `<nombre>.glb`: súbditos, torres, Torre de Zugri, Lorik. Se conectan en `MODEL_GLB` de `js/config.js`.

Requisitos: glTF binario con texturas dentro, 5.000 a 20.000 triángulos, menos de 5 MB, mirando hacia +Z y con los pies en y = 0 (la escala da igual). El equipo rojo usa el mismo modelo oscurecido: no hace falta otra versión.

Los pasos para conectarlos están en `CLAUDE.md` («Conectar un modelo .glb»). Lista completa de modelos deseados en `REQUISITOS.md`.
