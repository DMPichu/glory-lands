# Hermes, el león paladín (según su token «Hermes 4»): melena larga con dos trenzas
# sobre el pecho, manto de piel blanca al hombro, coraza plateada con filigrana
# dorada, tahalí de cuero con hebilla, tela azul, espada de empuñadura azul y lanza
# a la espalda.
# Uso: blender -b --factory-startup --python tools/blender/hermes.py -- models/heroes/hermes.glb
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base import (Vector, align, body, box, cape, cone, cyl, finish_and_export,  # noqa: E402
                  material, sphere, torus)

FUR = material('Pelaje', 0xd8a85c, rough=0.85)
MANE = material('Melena', 0xc08c46, rough=0.9)
MANE_L = material('MelenaClara', 0xd8a85e, rough=0.9)
CREAM = material('Hocico', 0xf0dcb4, rough=0.85)
MANTLE = material('Manto', 0xf2ead8, rough=0.95)
NOSE = material('Nariz', 0xc8787a, rough=0.5)
EYE = material('Ojos', 0xd8a040, emit=0xc89030, strength=1.2)
PUPIL = material('Pupila', 0x1a1008, rough=0.3)
DARK = material('Oscuro', 0x3a2414, rough=0.7)
STEEL = material('Acero', 0xc4cad6, metal=0.4, rough=0.35)
GOLD = material('Oro', 0xe8b840, metal=0.45, rough=0.35)
LEATHER = material('Cuero', 0x6a3a26, rough=0.65)
LEATHER_D = material('CueroOscuro', 0x3e2418, rough=0.7)
BLUE = material('TelaAzul', 0x2e4a8a, rough=0.8)
BLUE_D = material('AzulOscuro', 0x1e2e58, rough=0.8)
GEM = material('Gema', 0x3a7aff, metal=0.2, rough=0.1, emit=0x2050c0, strength=1.5)
BLADE = material('Hoja', 0xe8ecf4, metal=0.35, rough=0.2)
WOOD = material('Madera', 0x6a4a2a, rough=0.7)

b = body(FUR, bulk=1.12, limbs=1.1, tail=FUR)
sphere((0, 0.64, 0.46), 0.07, (1, 1, 1.4), MANE, bone='tail2')                 # borla de la cola

# ------------------------------------------------------------------ cabeza
H = Vector((0, -0.02, 1.96))
sphere(H, 0.2, (1.02, 1.05, 1.0), FUR)
sphere(H + Vector((0, -0.16, -0.07)), 0.105, (1.25, 1.0, 0.72), CREAM)          # hocico
sphere(H + Vector((0, -0.12, -0.17)), 0.065, (1.1, 1, 0.6), CREAM)              # barbilla
sphere(H + Vector((0, -0.265, -0.025)), 0.044, (1.4, 1.0, 0.75), NOSE)          # nariz
box(H + Vector((0, -0.24, 0.03)), (0.05, 0.08, 0.05), FUR, 'head', rot=(0.5, 0, 0))  # puente de la nariz
for s in (1, -1):
    sphere(H + Vector((s * 0.085, -0.165, 0.05)), 0.03, (1.25, 0.7, 0.8), EYE)
    sphere(H + Vector((s * 0.085, -0.188, 0.05)), 0.013, (1, 0.5, 1.3), PUPIL)
    box(H + Vector((s * 0.085, -0.175, 0.088)), (0.1, 0.035, 0.03), FUR, 'head', rot=(0, 0, -s * 0.3))  # ceño
    sphere(H + Vector((s * 0.12, -0.12, -0.08)), 0.07, (1.0, 0.8, 0.9), CREAM)  # mofletes
    for k in range(3):
        sphere(H + Vector((s * (0.07 + k * 0.02), -0.235, -0.06 + k * 0.012)), 0.006, (1, 1, 1), DARK)
    sphere(H + Vector((s * 0.15, 0.0, 0.17)), 0.06, (1, 0.55, 1), FUR)            # orejas
    sphere(H + Vector((s * 0.15, -0.02, 0.165)), 0.035, (1, 0.4, 1), DARK)

# melena: volumen detrás, corona de mechones alrededor de la cara y capas que caen
# hacia atrás, con mechones claros por encima
sphere(H + Vector((0, 0.1, -0.05)), 0.3, (1.2, 0.95, 1.2), MANE)
for ring, (rad, r, y, m) in enumerate(((0.24, 0.1, -0.02, MANE_L), (0.28, 0.11, 0.06, MANE), (0.3, 0.12, 0.14, MANE_L))):
    n = 16
    for i in range(n):
        a = (i + ring * 0.33) / n * math.tau
        if math.sin(a) < -0.85 and ring == 0:
            continue                                          # deja libre la barbilla
        d = Vector((math.cos(a), 0, math.sin(a)))
        o = sphere(H + Vector((d.x * (rad + 0.04), y + 0.05, d.z * (rad + 0.04) - 0.03)), r * 0.85, (0.7, 0.5, 2.2), m)
        align(o, Vector((d.x, 0.5, d.z - 0.25)))
for row in range(4):                                         # caída hacia la espalda
    for i in range(7):
        x = (i - 3) * 0.085
        o = sphere(H + Vector((x, 0.22 + row * 0.07, 0.12 - row * 0.16)), 0.09, (0.7, 0.5, 2.4), MANE if (i + row) % 2 else MANE_L)
        align(o, Vector((x * 0.6, 0.45, -1)))
# dos trenzas sobre el pecho, con cuentas doradas al final
for s in (1, -1):
    for k in range(7):
        z = 1.8 - k * 0.075
        sphere((s * (0.12 + 0.012 * (k % 2)), -0.2 - k * 0.008, z), 0.05 - k * 0.002, (1.0, 0.8, 1.15), MANE_L if k % 2 else MANE, bone='chest')
    cyl((s * 0.125, -0.26, 1.24), 0.04, 0.05, GOLD, 'chest', verts=16)
    sphere((s * 0.125, -0.265, 1.17), 0.045, (0.9, 0.9, 1.4), MANE_L, bone='chest')

# ------------------------------------------------------------------ coraza
cyl((0, 0, 1.45), 0.32, 0.44, STEEL, 'chest', verts=40, scale=(1, 0.8, 1))
sphere((0, -0.15, 1.46), 0.29, (1.0, 0.42, 0.85), STEEL, bone='chest')           # pecho abombado
torus((0, 0, 1.66), 0.3, 0.025, GOLD, 'chest', scale=(1, 0.82, 1))
torus((0, 0, 1.24), 0.31, 0.022, GOLD, 'chest', scale=(1, 0.82, 1))
for s in (1, -1):                                                                 # filigrana dorada
    for k in range(3):
        torus((s * (0.09 + k * 0.05), -0.265 + k * 0.01, 1.42 - k * 0.04), 0.045 - k * 0.008, 0.007, GOLD, 'chest',
              rot=(math.pi / 2, 0, s * 0.5))
box((0, -0.29, 1.47), (0.11, 0.03, 0.13), GOLD, 'chest', rot=(0, 0, math.pi / 4))  # emblema
sphere((0, -0.31, 1.47), 0.035, (1, 0.6, 1), GEM, bone='chest')

# tahalí cruzado (hombro derecho a cadera izquierda) con hebilla
a, c = Vector((-0.24, -0.25, 1.66)), Vector((0.22, -0.26, 1.08))
box((a + c) / 2, (0.075, 0.02, (c - a).length), LEATHER, 'chest', direction=c - a)
box((a + c) / 2 + Vector((0, -0.02, 0)), (0.12, 0.02, 0.1), STEEL, 'chest', direction=c - a)
box((a + c) / 2 + Vector((0, -0.03, 0)), (0.07, 0.02, 0.05), LEATHER_D, 'chest', direction=c - a)
# cinturón ancho con hebilla grande
torus((0, 0, 1.1), 0.27, 0.045, LEATHER, 'spine', scale=(1, 0.8, 0.8))
box((0, -0.25, 1.1), (0.16, 0.03, 0.12), STEEL, 'spine')
box((0, -0.265, 1.1), (0.1, 0.02, 0.07), LEATHER_D, 'spine')

# hombreras de placas superpuestas con ribete dorado y remaches
for s, n in ((1, 'L'), (-1, 'R')):
    for k in range(3):
        sphere((s * (0.31 + k * 0.03), 0, 1.7 - k * 0.07), 0.15 - k * 0.015, (1.1, 1.0, 0.55), STEEL, bone=f'upperarm.{n}')
        torus((s * (0.31 + k * 0.03), 0, 1.66 - k * 0.07), 0.14 - k * 0.015, 0.012, GOLD, f'upperarm.{n}', scale=(1.1, 1.0, 1))
    for k in range(4):
        sphere((s * (0.25 + k * 0.04), -0.1, 1.72 - k * 0.01), 0.012, (1, 1, 1), GOLD, bone=f'upperarm.{n}')
    # brazales con correas y guantes
    cyl((s * 0.48, -0.015, 1.12), 0.085, 0.22, STEEL, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    for z in (1.06, 1.18):
        torus((s * 0.47, -0.015, z), 0.088, 0.014, LEATHER_D, f'forearm.{n}', rot=(0, s * 0.27, 0))
    sphere((s * 0.52, -0.03, 0.92), 0.08, (1, 1, 1.1), LEATHER, bone=f'hand.{n}')
    # rodilleras, botas con borde de piel
    sphere((s * 0.14, -0.09, 0.56), 0.055, (1.1, 0.6, 1.0), STEEL, bone=f'shin.{n}')
    cyl((s * 0.14, 0.0, 0.24), 0.095, 0.28, LEATHER, f'shin.{n}')
    torus((s * 0.14, 0.0, 0.38), 0.095, 0.035, MANTLE, f'shin.{n}')
    # pantalón de cuero
    cyl((s * 0.135, -0.01, 0.78), 0.12, 0.38, LEATHER_D, f'thigh.{n}', direction=(0, -0.05, -1))

# manto de piel blanca sobre el hombro izquierdo (como en el token)
for i in range(12):
    t = i / 11
    sphere((0.12 + 0.25 * math.sin(t * 2.6), -0.08 + 0.2 * t, 1.74 - 0.28 * t), 0.13 - 0.03 * t, (1.1, 1.0, 0.8),
           MANTLE, bone='chest' if t < 0.5 else 'upperarm.L')

# faldón de cuero y tela azul delante y detrás
cone((0, 0, 0.92), 0.32, 0.26, 0.3, LEATHER, 'hips', scale=(1, 0.8, 1), verts=40)
for y, s in ((-0.25, 1), (0.25, -1)):
    box((0, y, 0.72), (0.24, 0.02, 0.5), BLUE, 'hips')
    box((0, y - s * 0.005, 0.48), (0.25, 0.022, 0.035), STEEL, 'hips')
cape(BLUE_D, top=1.7, bottom=0.5, width=0.58, back=0.3)

# ------------------------------------------------------------------ armas
# espada larga: hoja con acanaladura, guarda con bolas, empuñadura azul con anillas y pomo con gema
g = Vector((-0.52, -0.03, 0.92))
d = Vector((0, -0.6, 0.8)).normalized()
box(g + d * 0.6, (0.08, 0.022, 0.95), BLADE, 'hand.R', direction=d)
box(g + d * 0.6, (0.02, 0.026, 0.85), STEEL, 'hand.R', direction=d)
box(g + d * 0.1, (0.34, 0.06, 0.05), STEEL, 'hand.R', direction=d)
for s in (1, -1):
    sphere(g + d * 0.1 + Vector((s * 0.18, 0, 0)), 0.03, (1, 1, 1), STEEL, bone='hand.R')
cyl(g - d * 0.04, 0.025, 0.18, BLUE, 'hand.R', direction=d, verts=12)
for k in range(3):
    torus(g - d * (0.1 - k * 0.06), 0.027, 0.006, STEEL, 'hand.R')
sphere(g - d * 0.16, 0.04, (1, 1, 1), STEEL, bone='hand.R')
sphere(g - d * 0.16 + Vector((0, -0.03, 0)), 0.018, (1, 1, 1), GEM, bone='hand.R')

# lanza cruzada a la espalda, con cintas azules
a, c = Vector((0.32, 0.36, 0.35)), Vector((-0.3, 0.36, 2.25))
cyl((a + c) / 2, 0.022, (c - a).length, WOOD, 'chest', direction=c - a, verts=12)
cone(c + (c - a).normalized() * 0.1, 0.05, 0.0, 0.22, STEEL, 'chest', direction=c - a, verts=4)
for k in range(3):
    torus(a + (c - a) * (0.55 + k * 0.04), 0.026, 0.008, BLUE, 'chest')

finish_and_export(b, 'Hermes', tail=True)
