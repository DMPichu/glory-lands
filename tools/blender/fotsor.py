# Fotsor, «Oberon», el mago musculoso (según su token «Fotsor 2»): caballero
# esqueleto con yelmo de cuernos largos y nasal, cráneo con ojos de fuego, melena
# negra al viento, armadura oscura grabada en plata, capa negra hecha jirones y
# puños con magia del tiempo (morada).
# Uso: blender -b --factory-startup --python tools/blender/fotsor.py -- models/heroes/fotsor.glb
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import (GRIP, Vector, align, body, box, cape, cone, cyl, finish_and_export,  # noqa: E402
                  material, sphere, torus)

BONE = material('Hueso', 0xe8e0cc, rough=0.8)
SOCKET = material('Cuenca', 0x120808, rough=0.9)
FIRE = material('Fuego', 0xff8a20, emit=0xff5a00, strength=5)
DARK = material('Armadura', 0x3c3c48, metal=0.3, rough=0.35)
DARK2 = material('ArmaduraMedia', 0x5c5c6a, metal=0.3, rough=0.35)
SILVER = material('Plata', 0xb8bcc8, metal=0.5, rough=0.3)
HAIR = material('Pelo', 0x16161a, rough=0.8)
CAPE = material('Capa', 0x141418, rough=0.85)
HORN = material('Cuerno', 0x2a2620, rough=0.6)
TIME = material('Tiempo', 0xb07aff, emit=0x8a4aff, strength=3.5)

b = body(DARK, bulk=1.18, limbs=1.15)

# ------------------------------------------------------------------ cráneo
H = Vector((0, -0.02, 1.95))
sphere(H + Vector((0, 0.01, 0.02)), 0.19, (0.95, 1.0, 1.05), BONE)
for s in (1, -1):
    sphere(H + Vector((s * 0.075, -0.15, 0.0)), 0.055, (1.0, 0.6, 1.0), SOCKET)                 # cuencas
    sphere(H + Vector((s * 0.075, -0.18, 0.0)), 0.025, (1, 0.6, 1), FIRE)                        # ojos de fuego
    sphere(H + Vector((s * 0.1, -0.13, -0.08)), 0.05, (1.0, 0.8, 0.7), BONE)                     # pómulos
sphere(H + Vector((0, -0.19, -0.06)), 0.02, (1, 0.6, 1.4), SOCKET)                              # nariz
box(H + Vector((0, -0.12, -0.16)), (0.17, 0.12, 0.07), BONE, 'head')                             # mandíbula
for i in range(8):                                                                               # dientes
    box(H + Vector((-0.07 + i * 0.02, -0.185, -0.12)), (0.016, 0.012, 0.035), BONE, 'head')
    box(H + Vector((-0.07 + i * 0.02, -0.18, -0.145)), (0.016, 0.012, 0.03), BONE, 'head')
box(H + Vector((0, -0.19, -0.132)), (0.17, 0.008, 0.006), SOCKET, 'head')

# yelmo con nasal, ribete y cuernos largos que se curvan hacia fuera y arriba
sphere(H + Vector((0, 0.06, 0.1)), 0.22, (1.0, 0.95, 0.75), DARK2)
torus(H + Vector((0, 0.05, 0.07)), 0.2, 0.022, SILVER, 'head', scale=(1, 0.98, 1), rot=(-0.25, 0, 0))
box(H + Vector((0, -0.17, 0.06)), (0.035, 0.03, 0.16), DARK2, 'head')
box(H + Vector((0, 0.0, 0.2)), (0.03, 0.4, 0.04), SILVER, 'head', rot=(0.0, 0, 0))              # cresta
for s in (1, -1):
    pts = [H + Vector((s * (0.17 + 0.12 * t + 0.12 * t * t), 0.04, 0.12 + 0.04 * t + 0.34 * t ** 3)) for t in [i / 15 for i in range(16)]]
    for i, p in enumerate(pts):
        sphere(p, 0.07 * (1 - i / 19), (1, 1, 1), HORN, seg=12)
    cone(pts[-1] + Vector((0, 0, 0.05)), 0.025, 0, 0.12, HORN, 'head', (s * 0.2, 0, 1), verts=8)
# melena negra larga que cae y vuela hacia atrás
for row in range(4):
    for i in range(6):
        x = (i - 2.5) * 0.08
        o = sphere(H + Vector((x, 0.18 + row * 0.08, -0.05 - row * 0.15)), 0.07, (0.65, 0.4, 2.4), HAIR)
        align(o, Vector((x, 0.8, -1)))

# ------------------------------------------------------------------ armadura grabada
cyl((0, 0, 1.45), 0.33, 0.44, DARK, 'chest', verts=40, scale=(1, 0.8, 1))
sphere((0, -0.15, 1.46), 0.3, (1.0, 0.42, 0.85), DARK, bone='chest')
for k in range(3):                                                                               # nudo grabado
    torus((0, -0.27 + k * 0.004, 1.45), 0.05 + k * 0.035, 0.008, SILVER, 'chest', rot=(math.pi / 2, 0, 0))
box((0, -0.29, 1.45), (0.012, 0.01, 0.34), SILVER, 'chest')
box((0, -0.29, 1.45), (0.3, 0.01, 0.012), SILVER, 'chest')
for s in (1, -1):
    torus((s * 0.16, -0.25, 1.32), 0.035, 0.007, SILVER, 'chest', rot=(math.pi / 2, 0, 0))
torus((0, 0, 1.66), 0.3, 0.025, SILVER, 'chest', scale=(1, 0.82, 1))
torus((0, 0, 1.12), 0.28, 0.04, DARK2, 'spine', scale=(1, 0.8, 0.8))
box((0, -0.24, 1.12), (0.1, 0.03, 0.08), SILVER, 'spine')
for k in range(3):                                                                               # faldar de placas
    cone((0, 0, 1.0 - k * 0.1), 0.3 + k * 0.03, 0.28 + k * 0.03, 0.12, DARK if k % 2 == 0 else DARK2, 'hips', scale=(1, 0.82, 1), verts=40)
for s, n in ((1, 'L'), (-1, 'R')):
    for k in range(3):                                                                           # hombreras grandes
        sphere((s * (0.33 + k * 0.035), 0, 1.72 - k * 0.08), 0.17 - k * 0.018, (1.1, 1.0, 0.55), DARK2 if k % 2 else DARK, bone=f'upperarm.{n}')
        torus((s * (0.33 + k * 0.035), 0, 1.68 - k * 0.08), 0.16 - k * 0.018, 0.012, SILVER, f'upperarm.{n}', scale=(1.1, 1, 1))
    cone((s * 0.36, 0, 1.86), 0.035, 0, 0.12, DARK2, f'upperarm.{n}', verts=8)                   # púa de la hombrera
    for k in range(3):                                                                           # guanteletes
        cyl((s * (0.45 + k * 0.025), -0.01, 1.2 - k * 0.08), 0.088 - k * 0.003, 0.09, DARK2 if k % 2 else DARK, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    sphere((s * 0.52, -0.03, 0.92), 0.09, (1, 1, 1.1), DARK, bone=f'hand.{n}')
    sphere((s * 0.53, -0.1, 0.92), 0.075, (1, 1, 1), TIME, bone=f'hand.{n}')                     # magia del tiempo
    torus((s * 0.53, -0.1, 0.92), 0.11, 0.008, TIME, f'hand.{n}', rot=(0.4, s * 0.6, 0))
    sphere((s * 0.14, -0.1, 0.56), 0.07, (1.1, 0.7, 1.0), DARK2, bone=f'shin.{n}')
    cyl((s * 0.14, 0.0, 0.25), 0.1, 0.3, DARK, f'shin.{n}')
    cyl((s * 0.135, -0.01, 0.78), 0.125, 0.36, DARK2, f'thigh.{n}', direction=(0, -0.05, -1))
cape(CAPE, top=1.72, bottom=0.25, width=0.62, back=0.31, ragged=True)

finish_and_export(b, 'Fotsor', attack='slash')
