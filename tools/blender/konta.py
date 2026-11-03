# Konta: asesino felino tramposo (según su ilustración): pelaje pardo de lince con
# orejas de pincel, sombrero de ala ancha turquesa con plumas, capa turquesa hecha
# jirones, correajes de cuero, faldón de pelo, brazales, dos dagas y una esfera de
# magia turquesa que brilla en la mano izquierda.
# Uso: blender -b --factory-startup --python tools/blender/konta.py -- models/heroes/konta.glb
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import (GRIP, Vector, align, body, box, cape, cat_head, cone, cyl, finish_and_export,  # noqa: E402
                  material, sphere, sword, torus, wide_hat)

FUR = material('Pelaje', 0x9a7a52, rough=0.85)
FUR_D = material('PelajeOscuro', 0x5e4630, rough=0.85)
CREAM = material('Crema', 0xe2d2b0, rough=0.85)
TEAL = material('Turquesa', 0x2a9aa8, rough=0.7)
TEAL_D = material('TurquesaOscuro', 0x1a5e6a, rough=0.75)
LEATHER = material('Cuero', 0x5a3a24, rough=0.65)
STEEL = material('Acero', 0xc0c6d0, metal=0.4, rough=0.3)
MAGIC = material('Magia', 0x6af0e0, emit=0x30e0d0, strength=4)
FEATHER = material('Pluma', 0xece2c8, rough=0.8)

b = body(FUR, limbs=0.95, tail=FUR)
for k in range(3):                                                               # cola peluda y rayada
    sphere((0, 0.32 + k * 0.12, 0.95 - k * 0.17), 0.065, (1, 1, 1.4), FUR_D if k % 2 else FUR, bone='tail1' if k < 2 else 'tail2')
sphere((0, 0.63, 0.47), 0.07, (1, 1, 1.5), FUR_D, bone='tail2')

# ------------------------------------------------------------------ cabeza
H = Vector((0, -0.02, 1.95))
cat_head(H, FUR, CREAM, 0x40e0d0, big_ears=1.2)
for s in (1, -1):
    cone(H + Vector((s * 0.15, 0.0, 0.42)), 0.02, 0, 0.12, FUR_D, 'head', (s * 0.4, 0, 1), verts=6)   # pinceles
    for k in range(3):                                                                               # patillas
        o = sphere(H + Vector((s * 0.19, -0.06 + k * 0.03, -0.1 - k * 0.03)), 0.05, (0.5, 0.4, 1.4), CREAM)
        align(o, Vector((s * 1, 0, -0.6)))
    for k in range(2):                                                                               # rayas en la frente
        box(H + Vector((s * 0.04, -0.17, 0.12 + k * 0.03)), (0.015, 0.01, 0.05), FUR_D, 'head', rot=(0, s * 0.3, 0))
wide_hat(H + Vector((0, 0, 0.0)), TEAL, LEATHER, FEATHER)

# ------------------------------------------------------------------ ropa
cyl((0, 0, 1.45), 0.28, 0.4, LEATHER, 'chest', verts=32, scale=(1, 0.78, 1))          # chaleco
for s in (1, -1):                                                                    # correajes cruzados
    a, c = Vector((s * 0.2, -0.23, 1.64)), Vector((-s * 0.18, -0.24, 1.15))
    box((a + c) / 2, (0.045, 0.02, (c - a).length), FUR_D, 'chest', direction=c - a)
sphere((0, -0.26, 1.42), 0.03, (1, 0.6, 1), STEEL, bone='chest')
torus((0, 0, 1.12), 0.24, 0.035, LEATHER, 'spine', scale=(1, 0.8, 0.8))
for i in range(16):                                                                  # faldón de pelo en mechones
    a = i / 16 * 6.283
    cx, cy = __import__('math').cos(a), __import__('math').sin(a)
    o = sphere((0.25 * cx, 0.2 * cy, 0.84), 0.05, (0.6, 0.35, 3.2), FUR_D if i % 2 else CREAM, bone='hips')
    align(o, Vector((cx * 0.25, cy * 0.25, -1)))
for s, n in ((1, 'L'), (-1, 'R')):
    sphere((s * 0.29, 0, 1.64), 0.12, (1.1, 1.0, 0.6), TEAL_D, bone=f'upperarm.{n}')
    cyl((s * 0.48, -0.015, 1.12), 0.08, 0.2, LEATHER, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    torus((s * 0.47, -0.015, 1.12), 0.083, 0.012, STEEL, f'forearm.{n}', rot=(0, s * 0.27, 0))
    sphere((s * 0.52, -0.03, 0.92), 0.075, (1, 1, 1.1), FUR, bone=f'hand.{n}')
    cyl((s * 0.14, 0.0, 0.25), 0.088, 0.24, LEATHER, f'shin.{n}')
    torus((s * 0.14, 0.0, 0.37), 0.088, 0.02, TEAL_D, f'shin.{n}')
cape(TEAL, top=1.7, bottom=0.55, width=0.6, back=0.29, ragged=True)
for k in range(5):                                                                   # cuello de la capa
    sphere((-0.2 + k * 0.1, -0.02, 1.72), 0.08, (1, 1, 0.7), TEAL_D, bone='chest')

# ------------------------------------------------------------------ armas y magia
sword('R', STEEL, LEATHER, LEATHER, length=0.45, width=0.06)
sphere(GRIP['L'] + Vector((0, -0.12, 0.05)), 0.09, (1, 1, 1), MAGIC, bone='hand.L')
for k in range(4):
    sphere(GRIP['L'] + Vector((0.1 * (k % 2 - 0.5), -0.15, 0.15 + 0.05 * k)), 0.025, (1, 1, 1), MAGIC, bone='hand.L')
box(GRIP['L'] + Vector((0, 0.05, -0.1)), (0.04, 0.02, 0.3), STEEL, 'hand.L', direction=(0, 0.3, -1))   # daga invertida

finish_and_export(b, 'Konta', tail=True, attack='slash')
