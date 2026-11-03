# Modelo de Hermes (leÃ³n paladÃ­n) para Glory Lands, hecho con cÃ³digo en Blender.
# Uso (sin abrir la ventana de Blender):
#   blender -b --factory-startup --python tools/blender/hermes.py -- models/heroes/hermes.glb
# Crea un cuerpo orgÃ¡nico (modificador Skin + subdivisiÃ³n), cabeza de leÃ³n con
# melena, armadura, capa y espada; un esqueleto con pesos automÃ¡ticos; las
# animaciones Idle, Run, Attack y Death; y lo exporta a .glb.
# Ejes de Blender: Z arriba, el personaje mira hacia -Y (en el .glb, hacia +Z).
import math
import sys

import bpy
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'hermes.glb'

# ------------------------------------------------------------------ escena vacÃ­a
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 24


def material(name, color, metal=0.0, rough=0.6, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 2.0
    m.use_backface_culling = False
    return m


def srgb(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


FUR = material('Pelaje', srgb(0xc8903c), rough=0.85)
MANE = material('Melena', srgb(0x7a4a1e), rough=0.9)
CREAM = material('Hocico', srgb(0xead2a4), rough=0.85)
NOSE = material('Nariz', srgb(0x2a1a14), rough=0.5)
EYE = material('Ojos', srgb(0xffb030), emit=srgb(0xffa020))
PUPIL = material('Pupila', srgb(0x0a0a0a), rough=0.3)
STEEL = material('Acero', srgb(0xc8ccd8), metal=0.8, rough=0.3)
GOLD = material('Oro', srgb(0xe0b33c), metal=0.9, rough=0.3)
LEATHER = material('Cuero', srgb(0x6a4428), rough=0.7)
CAPE = material('Capa', srgb(0x2a3a6a), rough=0.8)
BLADE = material('Hoja', srgb(0xeef0f6), metal=0.9, rough=0.15, emit=srgb(0x403520))

parts = []  # (objeto, hueso al que va pegado entero)


def finish(obj, mat, bone, smooth=True):
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    parts.append((obj, bone))
    return obj


def sphere(loc, r, scale=(1, 1, 1), mat=FUR, bone='head', seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, mat, bone)


def cone(loc, r1, r2, depth, rot=(0, 0, 0), mat=MANE, bone='head', verts=12):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    return finish(bpy.context.active_object, mat, bone)


def box(loc, size, rot=(0, 0, 0), mat=STEEL, bone='chest'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return finish(o, mat, bone, smooth=False)


# ------------------------------------------------------------------ cuerpo (Skin)
# vÃ©rtice: (posiciÃ³n, radio x, radio y)
V = {
    'pelvis': ((0, 0, 1.0), 0.22, 0.18), 'spine': ((0, 0, 1.25), 0.21, 0.17), 'chest': ((0, 0, 1.5), 0.28, 0.2),
    'neck': ((0, 0, 1.72), 0.12, 0.12), 'neck2': ((0, 0, 1.82), 0.11, 0.11),
    'tail1': ((0, 0.2, 1.0), 0.045, 0.045), 'tail2': ((0, 0.45, 0.82), 0.04, 0.04), 'tail3': ((0, 0.6, 0.52), 0.032, 0.032),
}
for s, n in ((1, 'L'), (-1, 'R')):
    V |= {
        f'hip.{n}': ((s * 0.13, 0, 0.98), 0.13, 0.13), f'knee.{n}': ((s * 0.14, -0.02, 0.55), 0.1, 0.1),
        f'ankle.{n}': ((s * 0.14, 0.02, 0.13), 0.08, 0.08), f'toe.{n}': ((s * 0.14, -0.15, 0.06), 0.075, 0.06),
        f'shoulder.{n}': ((s * 0.3, 0, 1.62), 0.11, 0.11), f'elbow.{n}': ((s * 0.42, 0, 1.3), 0.085, 0.085),
        f'wrist.{n}': ((s * 0.5, -0.02, 1.02), 0.07, 0.07), f'paw.{n}': ((s * 0.52, -0.03, 0.92), 0.075, 0.07),
    }
E = [('pelvis', 'spine'), ('spine', 'chest'), ('chest', 'neck'), ('neck', 'neck2'),
     ('pelvis', 'tail1'), ('tail1', 'tail2'), ('tail2', 'tail3')]
for n in 'LR':
    E += [('pelvis', f'hip.{n}'), (f'hip.{n}', f'knee.{n}'), (f'knee.{n}', f'ankle.{n}'), (f'ankle.{n}', f'toe.{n}'),
          ('chest', f'shoulder.{n}'), (f'shoulder.{n}', f'elbow.{n}'), (f'elbow.{n}', f'wrist.{n}'), (f'wrist.{n}', f'paw.{n}')]
names = list(V)
me = bpy.data.meshes.new('Cuerpo')
me.from_pydata([V[k][0] for k in names], [(names.index(a), names.index(b)) for a, b in E], [])
body = bpy.data.objects.new('Cuerpo', me)
scene.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
sk = body.modifiers.new('Skin', 'SKIN')
sk.branch_smoothing = 0.6
for i, k in enumerate(names):
    body.data.skin_vertices[0].data[i].radius = (V[k][1], V[k][2])
body.data.skin_vertices[0].data[names.index('pelvis')].use_root = True
sub = body.modifiers.new('Sub', 'SUBSURF')
sub.levels = 2
bpy.ops.object.modifier_apply(modifier='Skin')
bpy.ops.object.modifier_apply(modifier='Sub')
for p in body.data.polygons:
    p.use_smooth = True
body.data.materials.append(FUR)

# ------------------------------------------------------------------ cabeza de leÃ³n
H = Vector((0, -0.02, 1.95))
sphere(H, 0.2, (1, 1.05, 1.0), FUR)
sphere(H + Vector((0, -0.16, -0.07)), 0.105, (1.25, 1.0, 0.75), CREAM)            # hocico
sphere(H + Vector((0, -0.26, -0.03)), 0.042, (1.35, 1.0, 0.75), NOSE)             # nariz
sphere(H + Vector((0, -0.13, -0.16)), 0.06, (1.1, 1, 0.6), CREAM)                 # barbilla
for s in (1, -1):
    sphere(H + Vector((s * 0.085, -0.16, 0.05)), 0.032, (1.2, 0.7, 0.85), EYE)    # ojos
    sphere(H + Vector((s * 0.085, -0.185, 0.05)), 0.014, (1, 0.6, 1.4), PUPIL)
    box(H + Vector((s * 0.08, -0.17, 0.095)), (0.09, 0.03, 0.025), (0, 0, -s * 0.25), mat=MANE, bone='head')  # ceÃ±o
    sphere(H + Vector((s * 0.15, 0.01, 0.17)), 0.06, (1, 0.55, 1), FUR)           # orejas
# melena: volumen detrÃ¡s de la cabeza, mechones en corona y sobre el pecho
sphere(H + Vector((0, 0.07, -0.02)), 0.29, (1.15, 0.85, 1.15), MANE)
for ring, (rad, r, y) in enumerate(((0.25, 0.1, 0.0), (0.29, 0.11, 0.09))):
    n = 14
    for i in range(n):
        a = (i + ring * 0.5) / n * math.tau
        d = Vector((math.cos(a), 0, math.sin(a)))
        o = sphere(H + Vector((d.x * rad, y, d.z * rad - 0.02)), r, (0.85, 0.65, 1.5), MANE, seg=16)
        o.rotation_euler = (0, math.pi / 2 - a, 0)   # mechón redondeado que apunta hacia fuera
sphere(Vector((0, -0.1, 1.66)), 0.17, (1.3, 0.75, 1.0), MANE, bone='chest')

# ------------------------------------------------------------------ armadura y ropa
bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.42, location=(0, 0, 1.45), vertices=32)
o = bpy.context.active_object
o.scale = (1, 0.8, 1)
finish(o, STEEL, 'chest')
box((0, -0.245, 1.45), (0.04, 0.02, 0.3), mat=GOLD)                                # cruz dorada
box((0, -0.25, 1.5), (0.2, 0.02, 0.04), mat=GOLD)
bpy.ops.mesh.primitive_torus_add(major_radius=0.25, minor_radius=0.035, location=(0, 0, 1.12))
o = bpy.context.active_object
o.scale = (1, 0.8, 1)
finish(o, LEATHER, 'spine')
bpy.ops.mesh.primitive_cone_add(radius1=0.32, radius2=0.25, depth=0.32, location=(0, 0, 0.92), vertices=32)
o = bpy.context.active_object
o.scale = (1, 0.8, 1)
finish(o, LEATHER, 'pelvis_')
for s, n in ((1, 'L'), (-1, 'R')):
    sphere((s * 0.31, 0, 1.68), 0.14, (1.1, 1.0, 0.7), STEEL, bone=f'upperarm.{n}')  # hombreras
    sphere((s * 0.31, 0, 1.6), 0.13, (1.0, 0.95, 0.55), GOLD, bone=f'upperarm.{n}')
    bpy.ops.mesh.primitive_cylinder_add(radius=0.085, depth=0.2, location=(s * 0.48, -0.015, 1.12), vertices=16)
    o = bpy.context.active_object
    o.rotation_euler = (0, -s * 0.26, 0)
    finish(o, STEEL, f'forearm.{n}')                                                 # brazales
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.22, location=(s * 0.14, 0.0, 0.25), vertices=16)
    finish(bpy.context.active_object, LEATHER, f'shin.{n}')                         # botas

# capa: lÃ¡mina curvada a la espalda
bpy.ops.mesh.primitive_grid_add(x_subdivisions=8, y_subdivisions=12, size=1, location=(0, 0, 0))
cape = bpy.context.active_object
for v in cape.data.vertices:
    x, t = v.co.x, v.co.y + 0.5                     # t: 0 abajo, 1 arriba
    v.co = Vector((x * (0.55 + 0.25 * (1 - t)), 0.27 + 0.12 * (1 - t) ** 2 + 0.05 * abs(x), 0.62 + t * 1.05))
finish(cape, CAPE, 'chest')

# espada en la mano derecha, apuntando hacia delante y arriba
grip = Vector((-0.52, -0.03, 0.92))
d = Vector((0, -0.6, 0.8)).normalized()
th = math.atan2(0.6, 0.8)
box(grip + d * 0.55, (0.075, 0.02, 0.9), (th, 0, 0), mat=BLADE, bone='hand.R')
box(grip + d * 0.08, (0.3, 0.06, 0.05), (th, 0, 0), mat=GOLD, bone='hand.R')
box(grip - d * 0.05, (0.04, 0.04, 0.18), (th, 0, 0), mat=LEATHER, bone='hand.R')

# ------------------------------------------------------------------ esqueleto
arm_data = bpy.data.armatures.new('Esqueleto')
rig = bpy.data.objects.new('Esqueleto', arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones
B = {}


def bone(name, head, tail, parent=None, connect=False):
    b = eb.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    if parent:
        b.parent = B[parent]
        b.use_connect = connect
    B[name] = b


bone('hips', (0, 0, 0.98), (0, 0, 1.2))
bone('spine', (0, 0, 1.2), (0, 0, 1.45), 'hips', True)
bone('chest', (0, 0, 1.45), (0, 0, 1.7), 'spine', True)
bone('neck', (0, 0, 1.7), (0, 0, 1.84), 'chest', True)
bone('head', (0, 0, 1.84), (0, 0, 2.2), 'neck', True)
bone('tail1', (0, 0.15, 1.0), (0, 0.45, 0.82), 'hips')
bone('tail2', (0, 0.45, 0.82), (0, 0.62, 0.5), 'tail1', True)
for s, n in ((1, 'L'), (-1, 'R')):
    bone(f'thigh.{n}', (s * 0.13, 0, 0.98), (s * 0.14, -0.02, 0.55), 'hips')
    bone(f'shin.{n}', (s * 0.14, -0.02, 0.55), (s * 0.14, 0.02, 0.13), f'thigh.{n}', True)
    bone(f'foot.{n}', (s * 0.14, 0.02, 0.13), (s * 0.14, -0.16, 0.06), f'shin.{n}', True)
    bone(f'upperarm.{n}', (s * 0.28, 0, 1.62), (s * 0.42, 0, 1.3), 'chest')
    bone(f'forearm.{n}', (s * 0.42, 0, 1.3), (s * 0.5, -0.02, 1.02), f'upperarm.{n}', True)
    bone(f'hand.{n}', (s * 0.5, -0.02, 1.02), (s * 0.53, -0.03, 0.86), f'forearm.{n}', True)
bpy.ops.object.mode_set(mode='OBJECT')

# pesos automÃ¡ticos para el cuerpo
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
if not any(len(g.name) for g in body.vertex_groups) or len(body.vertex_groups) < 5:
    print('AVISO: pesos automÃ¡ticos fallidos, se usan envolventes')
    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')

# las piezas rÃ­gidas van enteras a su hueso y se unen al cuerpo (una sola malla)
for obj, bname in parts:
    bname = 'hips' if bname == 'pelvis_' else bname
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    g = obj.vertex_groups.new(name=bname)
    g.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
for obj, _ in parts:
    obj.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = body.data.name = 'Hermes'
for p in body.data.polygons:
    p.use_smooth = True

# ------------------------------------------------------------------ animaciones
pose = rig.pose.bones
for pb in pose:
    pb.rotation_mode = 'XYZ'


def axis_sign(bname, axis, target):
    """Signo del giro que lleva la punta del hueso (o de su Ãºltimo hijo) hacia 'target'."""
    pb = pose[bname]
    tip = pb
    while tip.children:
        tip = tip.children[0]
    bpy.context.view_layer.update()
    before = tip.tail.copy()
    pb.rotation_euler[axis] = 0.4
    bpy.context.view_layer.update()
    moved = tip.tail - before
    pb.rotation_euler[axis] = 0
    bpy.context.view_layer.update()
    return 1 if moved.dot(Vector(target)) > 0 else -1


FWD, BACK, UP = (0, -1, 0), (0, 1, 0), (0, 0, 1)
S = {
    'thighF': {n: axis_sign(f'thigh.{n}', 0, FWD) for n in 'LR'},
    'shinB': {n: axis_sign(f'shin.{n}', 0, BACK) for n in 'LR'},
    'armF': {n: axis_sign(f'upperarm.{n}', 0, FWD) for n in 'LR'},
    'foreF': {n: axis_sign(f'forearm.{n}', 0, FWD) for n in 'LR'},
    'spineF': axis_sign('spine', 0, FWD),
    'chestF': axis_sign('chest', 0, FWD),
    'hipsB': axis_sign('hips', 0, BACK),
}
print('signos', S)


def clear():
    for pb in pose:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)


def key(frame, rots, locs=None):
    """rots: {hueso: (x, y, z)}; los huesos no nombrados vuelven a 0."""
    for pb in pose:
        pb.rotation_euler = rots.get(pb.name, (0, 0, 0))
        pb.location = (locs or {}).get(pb.name, (0, 0, 0))
        pb.keyframe_insert('rotation_euler', frame=frame)
        pb.keyframe_insert('location', frame=frame)


actions = []


def action(name, frames):
    rig.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data.action = act
    clear()
    frames()
    for fc in (act.fcurves if hasattr(act, 'fcurves') else []):
        pass
    actions.append(act)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, act)
    rig.animation_data.action = None


def relaxed(extra=None):
    r = {f'upperarm.{n}': (S['armF'][n] * 0.05, 0, 0) for n in 'LR'}
    r |= {f'forearm.{n}': (S['foreF'][n] * 0.25, 0, 0) for n in 'LR'}
    r |= extra or {}
    return r


def idle():
    for f, k in ((1, 0), (24, 1), (48, 0)):
        key(f, relaxed({
            'chest': (S['chestF'] * -0.03 * k, 0, 0), 'head': (0.04 * k, 0, 0.03 * k),
            'tail1': (0, 0, 0.25 * (1 - 2 * k)), 'tail2': (0, 0, 0.25 * (1 - 2 * k)),
            'upperarm.L': (S['armF']['L'] * 0.05, 0, 0), 'upperarm.R': (S['armF']['R'] * (0.05 + 0.04 * k), 0, 0),
        }))


def run():
    for f, ph in ((1, 0), (5, 1), (9, 2), (13, 3), (17, 0)):
        w = (1, 0, -1, 0, 1)[ph] if ph < 5 else 0
        up = ph in (1, 3)
        L, R = w, -w
        rots = {
            'spine': (S['spineF'] * 0.22, 0, 0),
            'thigh.L': (S['thighF']['L'] * 0.75 * L, 0, 0), 'thigh.R': (S['thighF']['R'] * 0.75 * R, 0, 0),
            'shin.L': (S['shinB']['L'] * (0.9 if L < 0 else 0.25), 0, 0), 'shin.R': (S['shinB']['R'] * (0.9 if R < 0 else 0.25), 0, 0),
            'upperarm.L': (S['armF']['L'] * 0.6 * R, 0, 0), 'upperarm.R': (S['armF']['R'] * 0.6 * L, 0, 0),
            'forearm.L': (S['foreF']['L'] * 0.7, 0, 0), 'forearm.R': (S['foreF']['R'] * 0.7, 0, 0),
            'tail1': (0, 0, 0.2 * w), 'head': (-0.1, 0, 0),
        }
        key(f, rots, {'hips': (0, 0.04 if up else -0.02, 0)})


def attack():
    a, fa = S['armF']['R'], S['foreF']['R']
    key(1, relaxed())
    key(4, relaxed({'upperarm.R': (a * 2.6, 0, 0), 'forearm.R': (fa * 0.6, 0, 0), 'chest': (0, 0.35, 0), 'spine': (S['spineF'] * -0.1, 0, 0)}))
    key(8, relaxed({'upperarm.R': (a * 0.9, 0, 0), 'forearm.R': (fa * 0.05, 0, 0), 'chest': (0, -0.4, 0), 'spine': (S['spineF'] * 0.25, 0, 0)}))
    key(13, relaxed())


def death():
    key(1, relaxed())
    key(8, relaxed({'hips': (S['hipsB'] * 0.5, 0, 0), 'spine': (S['spineF'] * -0.2, 0, 0), 'head': (0.3, 0, 0),
                    'shin.L': (S['shinB']['L'] * 0.8, 0, 0), 'shin.R': (S['shinB']['R'] * 0.8, 0, 0)}),
        {'hips': (0, -0.2, 0)})
    key(20, relaxed({'hips': (S['hipsB'] * 1.45, 0, 0), 'head': (0.2, 0, 0.3),
                     'upperarm.L': (S['armF']['L'] * 1.2, 0, 0.3), 'upperarm.R': (S['armF']['R'] * 1.0, 0, -0.3),
                     'thigh.L': (S['thighF']['L'] * 0.5, 0, 0), 'thigh.R': (S['thighF']['R'] * 0.2, 0, 0)}),
        {'hips': (0, -0.75, 0)})
    key(24, relaxed({'hips': (S['hipsB'] * 1.5, 0, 0), 'head': (0.2, 0, 0.3),
                     'upperarm.L': (S['armF']['L'] * 1.2, 0, 0.3), 'upperarm.R': (S['armF']['R'] * 1.0, 0, -0.3),
                     'thigh.L': (S['thighF']['L'] * 0.5, 0, 0), 'thigh.R': (S['thighF']['R'] * 0.2, 0, 0)}),
        {'hips': (0, -0.78, 0)})


action('Idle', idle)
action('Run', run)
action('Attack', attack)
action('Death', death)
clear()

# ------------------------------------------------------------------ exportar
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
body.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', use_selection=True,
    export_animation_mode='ACTIONS', export_anim_single_armature=True,
    export_yup=True, export_apply=False,
)
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
print('EXPORTADO', OUT, 'triÃ¡ngulos:', tris, 'animaciones:', [a.name for a in actions])
