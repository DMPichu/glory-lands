# Construye un héroe humanoide a partir de su ficha (fichas.py) y lo exporta.
# Uso: blender -b --factory-startup --python tools/blender/heroe.py -- <id> <salida.glb>
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base  # noqa: E402
from base import Vector, body, finish_and_export, material, sphere  # noqa: E402
from fichas import FICHAS  # noqa: E402
from partes import hair, headgear, human_head, outfit, weapon  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
HID, OUT = args[0], args[1]
base.OUT = OUT
sp = FICHAS[HID]
F = sp.get('female', False)

b = body(material('Cuerpo', sp['top'], rough=0.7), female=F, bulk=sp.get('bulk', 1.0), limbs=sp.get('limbs', 1.0))
H = Vector((0, -0.02, 1.95))
skin = human_head(H, sp['skin'], dict(sp.get('face', {}), female=F), ears=sp.get('ears'))
if sp.get('neck_skin', True):
    sphere((0, 0, 1.76), 0.07, (1, 1, 1.3), skin, bone='neck')
hm = material('Pelo', sp['hair'], rough=0.75)
hm2 = material('Pelo2', sp.get('hair2', sp['hair']), rough=0.75)
hair(H, hm, sp.get('style', ['short']), hm2)
for item in sp.get('gear', []):
    kind, col = item[0], item[1] if len(item) > 1 else sp['hair']
    col2 = item[2] if len(item) > 2 else sp.get('accent', 0xe0b33c)
    headgear(H, kind, material('G_' + kind, col, rough=0.65, metal=0.2 if kind in ('helm', 'tiara', 'crown') else 0.0),
             material('G2_' + kind, col2, rough=0.5, metal=0.3), extra=material('Pluma', item[3], rough=0.8) if len(item) > 3 else None)
acc = outfit(sp, skin)
for w in sp.get('weapons', []):
    weapon(w, sp, acc)
finish_and_export(b, sp.get('name', HID.title()), attack=sp.get('attack', 'slash'), image_format='JPEG')
