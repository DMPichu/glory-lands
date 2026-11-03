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
BOX = [float(x) for x in args[5].split(',')] if len(args) > 5 and args[5] != 'auto' else None
HEAD_U = float(args[6]) if len(args) > 6 and args[6] != 'auto' else None   # centro de la cabeza en la ilustración (0 izq, 1 der)
WIDEN = float(args[7]) if len(args) > 7 else None    # cuánto más ancha es la malla que el dibujo (None = se calcula)
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
edge = max(4, W // 30)
bgL, bgR = px[:, :edge].mean(axis=1), px[:, -edge:].mean(axis=1)
tt = np.linspace(0, 1, W)[None, :, None]
bgimg = bgL[:, None, :] * (1 - tt) + bgR[:, None, :] * tt
sat = px.max(axis=2) - px.min(axis=2)
mask = (np.abs(px - bgimg).sum(axis=2) > 0.2) | ((sat > 0.2) & (np.abs(px - bgimg).sum(axis=2) > 0.08))
rows, cols = np.where(mask)
r0, r1 = np.percentile(rows, 0.15), np.percentile(rows, 99.85)
c0, c1 = np.percentile(cols, 0.5), np.percentile(cols, 99.5)
print('silueta en la imagen', int(c0), int(c1), int(r0), int(r1), 'de', W, H)
u0, u1, v0, v1 = c0 / W, c1 / W, r0 / H, r1 / H
if BOX:
    u0, u1, v0, v1 = BOX[0], BOX[1], 1 - BOX[3], 1 - BOX[2]

# Encaje uniforme: la escala vertical es la del recuadro; la horizontal, la misma
# corregida por WIDEN (las mallas de la IA suelen salir más anchas que el dibujo), y
# se alinea el centro de la cabeza de la malla con el de la ilustración (HEAD_U).
# Encaje horizontal por siluetas: se proyectan los vértices de la malla (x, z) sobre
# la imagen con u = a + b·x y se buscan a y b que maximizan la coincidencia (IoU)
# entre la silueta de la malla y la del personaje en el dibujo. La vertical sale del
# recuadro (de los pies a lo más alto en los dos).
hs = 160
ws = max(16, int(W * hs / H))
ry = (np.arange(hs) * H / hs).astype(int)
rx = (np.arange(ws) * W / ws).astype(int)
small = mask[ry][:, rx]
rng = np.random.default_rng(0)
allv = np.array([(v.co.x, v.co.z) for v in obj.data.vertices])
pts = allv[rng.choice(len(allv), min(4000, len(allv)), replace=False)]
pv = ((v0 + pts[:, 1] / 2.3 * (v1 - v0)) * hs).astype(int).clip(0, hs - 1)
b0 = (v1 - v0) * (H / W) / 2.3
best = (-1, 0.5, b0)
for b in b0 * np.linspace(0.55, 1.5, 39):
    for a in np.linspace(0.0, 1.0, 101):
        pu = ((a + pts[:, 0] * b) * ws).astype(int)
        ok = (pu >= 0) & (pu < ws)
        grid = np.zeros((hs, ws), bool)
        grid[pv[ok], pu[ok]] = True
        grid = grid | np.roll(grid, 1, 0) | np.roll(grid, -1, 0) | np.roll(grid, 1, 1) | np.roll(grid, -1, 1)
        inter = (grid & small).sum()
        iou = inter / max(1, (grid | small).sum()) - 0.5 * (~ok).mean()
        if iou > best[0]:
            best = (iou, a, b)
iou, uh, ku = best
xh = 0.0
print('encaje: recuadro', round(u0, 3), round(u1, 3), round(v0, 3), round(v1, 3), 'IoU', round(float(iou), 3), 'a', round(float(uh), 3), 'b/b0', round(float(ku / b0), 2))
uv = obj.data.uv_layers.new(name='Frente')
obj.data.uv_layers.active = uv
for poly in obj.data.polygons:
    for li in poly.loop_indices:
        co = obj.data.vertices[obj.data.loops[li].vertex_index].co
        uv.data[li].uv = (uh + co.x * ku, v0 + co.z / 2.3 * (v1 - v0))
# Relleno de bordes: cada píxel de fondo toma el color del píxel del personaje más
# cercano en su fila (y, en filas sin personaje, el de la fila más cercana). Así las
# partes de la malla que se salen de la silueta del dibujo no se pintan de fondo.
cols = np.arange(W)[None, :]
left = np.maximum.accumulate(np.where(mask, cols, -1), axis=1)
right = np.flip(np.minimum.accumulate(np.flip(np.where(mask, cols, W * 9), axis=1), axis=1), axis=1)
has_l, has_r = left >= 0, right < W
pick = np.where(has_l & (~has_r | (cols - left <= right - cols)), left, right)
rowok = mask.any(axis=1)
pick = np.clip(pick, 0, W - 1)
filled = np.take_along_axis(px, pick[:, :, None].repeat(3, axis=2), axis=1)
filled[mask] = px[mask]
rid = np.where(rowok)[0]
near = rid[np.clip(np.searchsorted(rid, np.arange(H)), 0, len(rid) - 1)]
filled = filled[np.where(rowok, np.arange(H), near)]
# se difumina lo rellenado (no el dibujo) para que no queden rayas
def blur(a, k):
    c = np.cumsum(np.pad(a, ((k + 1, k), (k + 1, k), (0, 0)), mode='edge'), axis=0)
    a = (c[2 * k + 1:] - c[:-2 * k - 1]) / (2 * k + 1)
    c = np.cumsum(a, axis=1)
    return (c[:, 2 * k + 1:] - c[:, :-2 * k - 1]) / (2 * k + 1)
soft = blur(filled, max(3, W // 60))
filled = np.where(mask[:, :, None], px, soft[:H, :W])
padded = bpy.data.images.new(NAME + '_textura', W, H)
rgba = np.concatenate([filled, np.ones((H, W, 1), dtype=np.float32)], axis=2)
padded.pixels.foreach_set(rgba.astype(np.float32).ravel())
padded.file_format = 'JPEG'
padded.pack()
img = padded

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
