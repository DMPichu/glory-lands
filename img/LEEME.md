# Imágenes

| Carpeta | Archivo | Tamaño | Uso |
|---|---|---|---|
| `retratos/` | `<héroe>.webp` | 512 × 512 | Retrato redondo del héroe (prioridad sobre el token) |
| `habilidades/` | `<id>.svg` | SVG | Iconos de habilidades y pasivas (game-icons.net, CC BY 3.0; ver `CREDITOS.md`) |
| `objetos/` | `<id_objeto>.webp` | 128 × 128 | Iconos de la tienda e inventario (si faltan, emoji) |
| `arte/` | `<héroe>.webp` | 768 de ancho | Ilustraciones para el menú (aún no se usan en el juego) |

Para convertir: `python tools/prep_imagenes.py <retrato|objeto|arte> "<archivo>" <id>`.
Los identificadores de habilidades y objetos están en `js/config.js`.
