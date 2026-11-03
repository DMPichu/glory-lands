# Convierte una malla generada por IA (p. ej. Hunyuan3D-2 a partir de la ilustración)
# en un héroe del juego: limpia la peana, reduce caras, la coloca de pie con 2,3 de
# alto, le pinta la ilustración proyectada desde delante, le pone el esqueleto común
# con pesos por cercanía, las animaciones Idle, Run, Attack y Death, y la exporta.
# Uso:
#   blender -b --factory-startup --python tools/blender/ia_heroe.py -- <malla.glb> <ilustración> <salida.glb> <Nombre> [caras] [izq,der,arriba,abajo] [centro_cabeza_x] [ensanche]
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from base import Vector, finish_and_export  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
SRC, IMG, OUT, NAME = args[:4]
FACES = int(args[4]) if len(args) > 4 else 30000
# recuadro del personaje en la ilustración (izq, der, arriba, abajo; de 0 a 1 desde arriba a la izquierda)
BOX = [float(x) for x in args[5].split(',')] if len(args) > 5 else None
HEAD_U = float(args[6]) if len(args) > 6 else None   # centro de la cabeza en la ilustración (0 izq, 1 der)
WIDEN = float(args[7]) if len(args) > 7 else 1.0     # cuánto más ancha es la malla que el dibujo
import base  # noqa: E402
base.OUT = OUT

# ------------------------------------------------------------------ importar y unir
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
obj = bpy.context.active_object
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o != obj:
        bpy.data.objects.remove(o)

# ------------------------------------------------------------------ quitar la peana y reducir
zs = [v.co.z for v in obj.data.vertices]
z0, z1 = min(zs), max(zs)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
cut = z0 + (z1 - z0) * 0.012
for v in obj.data.vertices:
    v.select = v.co.z < cut
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.delete(type='VERT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.delete_loose()
bpy.ops.object.mode_set(mode='OBJECT')
n = len(obj.data.polygons)
if n > FACES:
    d = obj.modifiers.new('Reducir', 'DECIMATE')
    d.ratio = FACES / n
    bpy.ops.object.modifier_apply(modifier='Reducir')

# ------------------------------------------------------------------ de pie, centrado, 2,3 de alto
vs = [v.co for v in obj.data.vertices]
mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
k = 2.3 / (mx.z - mn.z)
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
for v in obj.data.vertices:
    v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, (v.co.z - mn.z) * k))
x0, x1 = (mn.x - cx) * k, (mx.x - cx) * k

# ------------------------------------------------------------------ pintar la ilustración desde delante
# Se recorta la ilustración a la silueta del personaje (lo que difiere del color de
# fondo de las esquinas) y se proyecta en frontal: x -> u, z -> v. Los lados y la
# espalda reciben el mismo dibujo estirado; desde la cámara del juego apenas se nota.
import numpy as np  # noqa: E402

img = bpy.data.images.load(os.path.abspath(IMG))
W, H = img.size
px = np.empty(W * H * 4, dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(H, W, 4)[:, :, :3]                      # fila 0 = abajo
corners = np.array([px[2, 2], px[2, -3], px[-3, 2], px[-3, -3]]).mean(axis=0)
mask = np.abs(px - corners).sum(axis=2) > 0.18
rows, cols = np.where(mask)
r0, r1 = np.percentile(rows, 0.5), np.percentile(rows, 99.5)
c0, c1 = np.percentile(cols, 0.5), np.percentile(cols, 99.5)
print('silueta en la imagen', int(c0), int(c1), int(r0), int(r1), 'de', W, H)
u0, u1, v0, v1 = c0 / W, c1 / W, r0 / H, r1 / H
if BOX:
    u0, u1, v0, v1 = BOX[0], BOX[1], 1 - BOX[3], 1 - BOX[2]

# Encaje uniforme: la escala vertical es la del recuadro; la horizontal, la misma
# corregida por WIDEN (las mallas de la IA suelen salir más anchas que el dibujo), y
# se alinea el centro de la cabeza de la malla con el de la ilustración (HEAD_U).
ku = (v1 - v0) * (H / W) / 2.3 / WIDEN
top = [v.co.x for v in obj.data.vertices if v.co.z > 2.0]
xh = sum(top) / max(1, len(top))
uh = HEAD_U if HEAD_U is not None else (u0 + u1) / 2
uv = obj.data.uv_layers.new(name='Frente')
obj.data.uv_layers.active = uv
for poly in obj.data.polygons:
    for li in poly.loop_indices:
        co = obj.data.vertices[obj.data.loops[li].vertex_index].co
        uv.data[li].uv = (uh + (co.x - xh) * ku, v0 + co.z / 2.3 * (v1 - v0))
mat = bpy.data.materials.new('Ilustracion')
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes['Principled BSDF']
bsdf.inputs['Roughness'].default_value = 0.75
tex = nodes.new('ShaderNodeTexImage')
tex.image = img
tex.extension = 'EXTEND'
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
obj.data.materials.clear()
obj.data.materials.append(mat)
for poly in obj.data.polygons:
    poly.use_smooth = True

finish_and_export(obj, NAME, weights='nearest', image_format='JPEG')
