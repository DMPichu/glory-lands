# Cabbo: tanque sanador (según su ilustración): yelmo cerrado dorado y plateado con
# cruces, turbante morado con franjas de colores, túnica morada con mangas
# abullonadas de vidriera, estola de rombos azules y rojos, vidriera del santo en
# el pecho, guanteletes dorados, zapatos dorados, escudo de cometa rojo y maza.
# Uso: blender -b --factory-startup --python tools/blender/cabbo.py -- models/heroes/cabbo.glb
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import (GRIP, Vector, align, body, box, cone, cyl, finish_and_export,  # noqa: E402
                  material, sphere, torus)

PURPLE = material('Morado', 0x6a2a8e, rough=0.75)
PURPLE_D = material('MoradoOscuro', 0x40185a, rough=0.8)
MAGENTA = material('Magenta', 0xc040c0, rough=0.7)
CYAN = material('Cian', 0x40c8e0, rough=0.7)
RED = material('Rojo', 0xc8302a, rough=0.7)
BLUE = material('Azul', 0x2a3a9a, rough=0.7)
STEEL = material('Acero', 0xc4cad6, metal=0.4, rough=0.3)
GOLD = material('Oro', 0xd8a840, metal=0.45, rough=0.35)
DARK = material('Oscuro', 0x1a1418, rough=0.6)
BROWN = material('Cuero', 0x6a3a24, rough=0.65)
SHIELD = material('Escudo', 0x8a2e22, rough=0.6)
GLASS_G = material('VidrioVerde', 0x3ab08a, emit=0x1a6040, strength=0.6)
GLASS_W = material('VidrioBlanco', 0xe8e8f0, emit=0x606070, strength=0.4)
GLASS_Y = material('VidrioAmarillo', 0xf0c040, emit=0x806010, strength=0.6)
SKIN = material('Piel', 0x2a2228, rough=0.8)

b = body(SKIN, bulk=1.12, limbs=1.1)

# ------------------------------------------------------------------ yelmo y turbante
H = Vector((0, -0.02, 1.95))
cyl(H + Vector((0, 0, -0.02)), 0.21, 0.4, STEEL, 'head', verts=32)
box(H + Vector((0, -0.17, -0.02)), (0.3, 0.1, 0.36), GOLD, 'head')                  # careta dorada
box(H + Vector((0, -0.225, 0.04)), (0.3, 0.02, 0.025), DARK, 'head')                # ranura de visión
for s in (1, -1):                                                                     # cruces y respiraderos
    box(H + Vector((s * 0.07, -0.226, 0.11)), (0.05, 0.015, 0.012), DARK, 'head')
    box(H + Vector((s * 0.07, -0.226, 0.11)), (0.012, 0.015, 0.05), DARK, 'head')
    for k in range(3):
        sphere(H + Vector((s * 0.06, -0.225, -0.06 - k * 0.035)), 0.009, (1, 0.5, 1), DARK)
box(H + Vector((0, -0.226, -0.02)), (0.02, 0.015, 0.25), STEEL, 'head')
cone(H + Vector((0, 0, 0.21)), 0.21, 0.08, 0.06, STEEL, 'head', verts=32)
cyl(H + Vector((0, 0.01, -0.24)), 0.16, 0.08, STEEL, 'neck', verts=24)              # gorjal
for k, m in enumerate((PURPLE, MAGENTA, PURPLE, CYAN, PURPLE)):                      # turbante
    torus(H + Vector((0, 0.02, 0.17 + k * 0.035)), 0.22 - k * 0.012, 0.045, m, 'head', rot=(0.15 * (k % 2), 0.1, 0))
sphere(H + Vector((0, 0.03, 0.32)), 0.15, (1, 1, 0.6), PURPLE)
for k, m in enumerate((PURPLE, MAGENTA, PURPLE_D, CYAN)):                            # paño que cae por un lado
    o = sphere(H + Vector((-0.18 - k * 0.015, 0.06 + k * 0.03, 0.05 - k * 0.1)), 0.075, (0.5, 0.6, 1.8), m)
    align(o, Vector((-0.2, 0.2, -1)))

# ------------------------------------------------------------------ túnica
cyl((0, 0, 1.45), 0.31, 0.44, PURPLE, 'chest', verts=36, scale=(1, 0.8, 1))
cone((0, 0, 0.62), 0.42, 0.29, 1.0, PURPLE, 'hips', scale=(1, 0.85, 1), verts=36)    # faldones largos
cone((0, 0.02, 0.62), 0.43, 0.3, 0.98, PURPLE_D, 'hips', scale=(1, 0.85, 1), verts=36)
# estola de rombos que baja por delante
box((0, -0.36, 0.62), (0.2, 0.02, 1.0), BLUE, 'hips')
for k in range(9):
    box(((-0.05 if k % 2 else 0.05), -0.372, 1.05 - k * 0.1), (0.05, 0.01, 0.05), RED, 'hips', rot=(0, math.pi / 4, 0))
for s in (1, -1):
    box((s * 0.105, -0.37, 0.62), (0.015, 0.015, 1.0), CYAN, 'hips')
# vidriera del santo sobre el pecho
box((0, -0.255, 1.45), (0.2, 0.02, 0.3), GOLD, 'chest')
box((0, -0.265, 1.44), (0.16, 0.02, 0.26), BLUE, 'chest')
cone((0, -0.27, 1.6), 0.08, 0.0, 0.08, GOLD, 'chest', direction=(0, 0, 1), verts=4)
box((0, -0.275, 1.4), (0.06, 0.01, 0.12), GLASS_W, 'chest')
box((0.03, -0.278, 1.42), (0.03, 0.01, 0.12), GLASS_G, 'chest')
sphere((0, -0.275, 1.51), 0.025, (1, 0.4, 1), SKIN, bone='chest')
torus((0, -0.274, 1.51), 0.035, 0.008, GLASS_Y, 'chest', rot=(math.pi / 2, 0, 0))
torus((0, 0, 1.12), 0.3, 0.04, BROWN, 'spine', scale=(1, 0.82, 0.8))                  # cinturón
box((0, -0.27, 1.12), (0.08, 0.03, 0.08), GOLD, 'spine')
# mangas abullonadas con dibujos de vidriera y guanteletes dorados
for s, n in ((1, 'L'), (-1, 'R')):
    sphere((s * 0.36, 0, 1.5), 0.17, (1.0, 0.95, 1.25), PURPLE, bone=f'upperarm.{n}')
    for k, m in enumerate((RED, CYAN, BLUE, MAGENTA)):
        torus((s * 0.37, 0, 1.62 - k * 0.07), 0.15 - abs(k - 1.5) * 0.015, 0.012, m, f'upperarm.{n}', scale=(1, 0.95, 1))
    sphere((s * 0.45, -0.01, 1.28), 0.11, (1, 1, 0.8), PURPLE_D, bone=f'forearm.{n}')
    cyl((s * 0.48, -0.015, 1.1), 0.08, 0.24, GOLD, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    sphere((s * 0.52, -0.03, 0.92), 0.085, (1, 1, 1.1), GOLD, bone=f'hand.{n}')
    cone((s * 0.14, -0.1, 0.06), 0.08, 0.0, 0.25, GOLD, f'foot.{n}', direction=(0, -1, 0.1), verts=16)   # zapatos

# ------------------------------------------------------------------ escudo de cometa y maza
g = GRIP['L'] + Vector((0.12, -0.08, -0.05))
box(g + Vector((0, 0, 0.0)), (0.05, 0.42, 0.42), SHIELD, 'hand.L')
cone(g + Vector((0, 0, -0.36)), 0.21, 0.0, 0.3, SHIELD, 'hand.L', direction=(0, 0, -1), verts=4, scale=(0.25, 1, 1))
box(g + Vector((0.03, 0, 0.13)), (0.02, 0.4, 0.1), material('Pergamino', 0xd8c8a0, rough=0.8), 'hand.L')   # cartela «Basilica Benedictus»
for k in range(4):
    box(g + Vector((0.042, -0.15 + k * 0.1, 0.13)), (0.005, 0.06, 0.02), DARK, 'hand.L')
sphere(g + Vector((0.035, 0.0, -0.08)), 0.08, (0.3, 1, 1.2), GOLD, bone='hand.L')                  # león heráldico
sphere(g + Vector((0.04, 0.03, 0.0)), 0.04, (0.3, 1, 1), GOLD, bone='hand.L')
d = Vector((0, -0.55, 0.85)).normalized()
gr = GRIP['R']
cyl(gr + d * 0.3, 0.025, 0.8, BROWN, 'hand.R', direction=d, verts=12)
sphere(gr + d * 0.72, 0.08, (1, 1, 1), STEEL, bone='hand.R')
for k in range(6):
    a = k / 6 * math.tau
    cone(gr + d * 0.72 + Vector((0.08 * math.cos(a), 0.0, 0.08 * math.sin(a))), 0.025, 0, 0.08, STEEL, 'hand.R',
         direction=(math.cos(a), 0, math.sin(a)), verts=6)

finish_and_export(b, 'Cabbo', attack='slash')
