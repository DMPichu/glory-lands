# Candle Shadowplume: gata negra hechicera del trueno con armadura de placas (según
# su token y su ilustración): hocico y pecho blancos, ojos amarillos, boca abierta
# con colmillos, melena negra, sombrero de bruja enorme con correa, coraza,
# guanteletes con garras, faldar de placas, falda con volantes, tela marrón, cola
# negra con la punta blanca y un bastón con una vela encendida.
# Uso: blender -b --factory-startup --python tools/blender/candle.py -- models/heroes/candle.glb
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import (GRIP, Vector, align, body, box, cat_head, cone, cyl, finish_and_export,  # noqa: E402
                  material, sphere, staff, torus, witch_hat)

FUR = material('Pelaje', 0x1c1c24, rough=0.85)
WHITE = material('Blanco', 0xf2efe8, rough=0.85)
HAIR = material('Melena', 0x121216, rough=0.8)
MOUTH = material('Boca', 0x8a2a3a, rough=0.6)
FANG = material('Colmillo', 0xfffaf0, rough=0.4)
HAT = material('Sombrero', 0x3e3a78, rough=0.7)
BROWN = material('Cuero', 0x6a3e26, rough=0.65)
STEEL = material('Acero', 0xb8bec8, metal=0.4, rough=0.35)
STEEL_D = material('AceroOscuro', 0x6a707c, metal=0.4, rough=0.4)
CLAW = material('Garras', 0x16161c, metal=0.3, rough=0.4)
RUFFLE = material('Volantes', 0x9a96b0, rough=0.8)
SKIRT = material('Falda', 0x24223a, rough=0.8)
WOOD = material('Madera', 0x4a3220, rough=0.7)
WAX = material('Cera', 0xf6ecd8, rough=0.6)
FLAME = material('Llama', 0xffd060, emit=0xffa020, strength=4)
SPARK = material('Rayo', 0xb8e0ff, emit=0x6ac8ff, strength=3)

b = body(FUR, female=True, limbs=0.95, tail=FUR)
sphere((0, 0.64, 0.46), 0.06, (1, 1, 1.5), WHITE, bone='tail2')                 # punta blanca

# ------------------------------------------------------------------ cabeza
H = Vector((0, -0.02, 1.95))
cat_head(H, FUR, WHITE, 0xd8d040, big_ears=1.1)
sphere(H + Vector((0, -0.11, -0.1)), 0.11, (1.15, 0.8, 0.85), WHITE)           # cara blanca de abajo
sphere(H + Vector((0, -0.18, -0.11)), 0.05, (1.2, 0.6, 0.8), MOUTH)             # boca abierta
for s in (1, -1):
    cone(H + Vector((s * 0.03, -0.205, -0.085)), 0.012, 0, 0.04, FANG, 'head', (0, 0, -1), verts=6)
# melena negra larga y alborotada por detrás
for row in range(5):
    for i in range(6):
        x = (i - 2.5) * 0.09
        o = sphere(H + Vector((x, 0.13 + row * 0.03, 0.05 - row * 0.15)), 0.085, (0.7, 0.45, 2.2), HAIR)
        align(o, Vector((x * 1.2, 0.3, -1)))
for s in (1, -1):
    for k in range(3):
        o = sphere(H + Vector((s * 0.17, -0.05 + k * 0.05, -0.08 - k * 0.04)), 0.06, (0.6, 0.45, 2.0), HAIR)
        align(o, Vector((s * 0.3, 0.1, -1)))
# sombrero de bruja enorme y torcido, con correa y hebilla en la barbilla
witch_hat(H + Vector((0, 0.02, 0.06)), HAT, BROWN, tilt=0.45, size=1.3)
for sx in (1, -1):                                       # las orejas asoman por encima del ala
    cone(H + Vector((sx * 0.15, -0.02, 0.33)), 0.07, 0, 0.18, FUR, 'head', (sx * 0.35, 0.05, 1), verts=4)
    cone(H + Vector((sx * 0.145, -0.05, 0.32)), 0.04, 0, 0.12, WHITE, 'head', (sx * 0.35, 0.05, 1), verts=4)
for s in (1, -1):
    box(H + Vector((s * 0.19, -0.05, -0.02)), (0.025, 0.02, 0.24), BROWN, 'head', rot=(0, s * 0.15, 0))
box(H + Vector((0.19, -0.07, -0.08)), (0.04, 0.02, 0.04), STEEL, 'head')

# ------------------------------------------------------------------ armadura
cyl((0, 0, 1.45), 0.27, 0.42, STEEL, 'chest', verts=40, scale=(1, 0.8, 1))
sphere((0, -0.13, 1.45), 0.25, (1.0, 0.45, 0.85), STEEL, bone='chest')
torus((0, 0, 1.66), 0.25, 0.02, STEEL_D, 'chest', scale=(1, 0.8, 1))
sphere((0, -0.09, 1.66), 0.12, (1.3, 0.6, 0.6), WHITE, bone='chest')              # pecho blanco asomando
for s, n in ((1, 'L'), (-1, 'R')):
    for k in range(3):
        sphere((s * (0.28 + k * 0.03), 0, 1.66 - k * 0.07), 0.13 - k * 0.013, (1.1, 1.0, 0.55), STEEL if k % 2 == 0 else STEEL_D, bone=f'upperarm.{n}')
    cyl((s * 0.4, 0, 1.4), 0.075, 0.22, STEEL, f'upperarm.{n}', direction=(s * 0.4, 0, -1))      # brazal superior
    for k in range(3):                                                                            # guantelete por placas
        cyl((s * (0.45 + k * 0.025), -0.01, 1.2 - k * 0.08), 0.078 - k * 0.003, 0.09, STEEL, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    sphere((s * 0.52, -0.03, 0.92), 0.07, (1, 1, 1.1), CLAW, bone=f'hand.{n}')
    for k in (-1, 0, 1):                                                                          # garras
        cone((s * 0.52 + k * 0.025, -0.08, 0.86), 0.012, 0, 0.09, CLAW, f'hand.{n}', (0, -0.6, -1), verts=6)
    sphere((s * 0.14, -0.09, 0.56), 0.05, (1.1, 0.6, 1.0), STEEL, bone=f'shin.{n}')               # rodilleras
    cyl((s * 0.14, 0.0, 0.23), 0.085, 0.26, STEEL_D, f'shin.{n}')                                 # grebas
# cinturón y correa cruzada marrones
torus((0, 0, 1.13), 0.22, 0.035, BROWN, 'spine', scale=(1, 0.8, 0.8))
box((0.05, -0.2, 1.13), (0.06, 0.02, 0.06), STEEL, 'spine')
a, c = Vector((-0.2, -0.24, 1.62)), Vector((0.2, -0.23, 1.2))
box((a + c) / 2, (0.05, 0.02, (c - a).length), BROWN, 'chest', direction=c - a)
# faldar de placas, volantes y falda larga
for k in range(3):
    cone((0, 0, 1.0 - k * 0.1), 0.27 + k * 0.03, 0.25 + k * 0.03, 0.12, STEEL if k % 2 == 0 else STEEL_D, 'hips', scale=(1, 0.82, 1), verts=40)
for k in range(2):
    torus((0, 0, 0.7 - k * 0.07), 0.34 + k * 0.03, 0.045, RUFFLE, 'hips', scale=(1, 0.85, 0.7))
cone((0, 0, 0.45), 0.42, 0.3, 0.42, SKIRT, 'hips', scale=(1, 0.85, 1), verts=40)
box((0.12, -0.27, 0.65), (0.12, 0.015, 0.8), BROWN, 'hips')                        # tela marrón

# ------------------------------------------------------------------ bastón con vela
tip = staff('R', WOOD, None, length=1.7)
cyl(tip + Vector((0, 0, 0.05)), 0.05, 0.03, WOOD, 'hand.R', verts=16)                # platillo
cyl(tip + Vector((0, 0, 0.13)), 0.035, 0.14, WAX, 'hand.R', verts=16)                # vela
cone(tip + Vector((0, 0, 0.25)), 0.03, 0, 0.1, FLAME, 'hand.R', verts=10)            # llama
for k in range(3):                                                                    # chispas de trueno
    ang = k * 2.1
    box(tip + Vector((0.08 * math.cos(ang), 0.08 * math.sin(ang), 0.12 + 0.04 * k)), (0.015, 0.015, 0.09), SPARK, 'hand.R',
        rot=(0.6 * math.sin(ang), 0.6 * math.cos(ang), 0))

finish_and_export(b, 'Candle', tail=True, attack='cast')
