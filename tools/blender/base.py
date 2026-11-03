# Base común para construir héroes en Blender con código (ver hermes.py, el primero).
# Cada héroe (candle.py, konta.py, fotsor.py, cabbo.py...) importa esto, crea su
# cuerpo con body(), añade cabeza, ropa y arma con las piezas de aquí, y llama a
# finish_and_export(). Ejes de Blender: Z arriba, el personaje mira hacia -Y.
# Uso: blender -b --factory-startup --python tools/blender/<héroe>.py -- models/heroes/<héroe>.glb
import math
import sys

import bpy
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'heroe.glb'
FWD, BACK, UP = (0, -1, 0), (0, 1, 0), (0, 0, 1)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 24
parts = []  # (objeto, hueso al que va pegado entero)


# ------------------------------------------------------------------ materiales
def srgb(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, hexcolor, metal=0.0, rough=0.6, emit=None, strength=2.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexcolor), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = strength
    m.use_backface_culling = False
    return m


# ------------------------------------------------------------------ piezas
def add(obj, mat, bone, smooth=True):
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    parts.append((obj, bone))
    return obj


def align(obj, direction):
    """Gira el objeto para que su eje Z local apunte en 'direction'."""
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized())
    return obj


def sphere(loc, r, scale=(1, 1, 1), mat=None, bone='head', seg=None, rot=None):
    seg = seg or (20 if r >= 0.15 else 14 if r >= 0.06 else 10)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=max(8, seg // 2))
    o = bpy.context.active_object
    o.scale = scale
    if rot:
        o.rotation_euler = rot
    return add(o, mat, bone)


def cone(loc, r1, r2, depth, mat, bone='head', direction=None, verts=16, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, vertices=verts)
    o = bpy.context.active_object
    o.scale = scale
    if direction:
        align(o, direction)
    return add(o, mat, bone)


def cyl(loc, r, depth, mat, bone, direction=None, verts=24, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=verts)
    o = bpy.context.active_object
    o.scale = scale
    if direction:
        align(o, direction)
    return add(o, mat, bone)


def box(loc, size, mat, bone='chest', direction=None, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.scale = size
    if direction:
        align(o, direction)
    elif rot:
        o.rotation_euler = rot
    return add(o, mat, bone, smooth=False)


def torus(loc, R, r, mat, bone, scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot,
                                     major_segments=28 if R > 0.1 else 16, minor_segments=8 if r > 0.02 else 6)
    o = bpy.context.active_object
    o.scale = scale
    return add(o, mat, bone)


def cape(mat, top=1.66, bottom=0.6, width=0.55, back=0.27, ragged=False):
    """Capa: lámina curvada a la espalda (pegada al pecho)."""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=8, y_subdivisions=12, size=1)
    o = bpy.context.active_object
    for v in o.data.vertices:
        x, t = v.co.x, v.co.y + 0.5
        z = bottom + t * (top - bottom)
        if ragged and t < 0.08:
            z += 0.07 * abs(math.sin(x * 37))
        v.co = Vector((x * (width + 0.25 * (1 - t)), back + 0.12 * (1 - t) ** 2 + 0.05 * abs(x), z))
    return add(o, mat, 'chest')


# Mano derecha (.R está en -X) y mano izquierda; dónde se cogen las armas
GRIP = {'R': Vector((-0.52, -0.03, 0.92)), 'L': Vector((0.52, -0.03, 0.92))}


def sword(side, blade, guard, grip_mat, length=0.9, width=0.075, direction=(0, -0.6, 0.8)):
    d = Vector(direction).normalized()
    g = GRIP[side]
    box(g + d * (0.1 + length / 2), (width, 0.02, length), blade, f'hand.{side}', direction=d)
    box(g + d * 0.08, (0.3 * width / 0.075, 0.06, 0.05), guard, f'hand.{side}', direction=d)
    box(g - d * 0.05, (0.04, 0.04, 0.18), grip_mat, f'hand.{side}', direction=d)


def staff(side, wood, top_mat, length=1.75, direction=(0, -0.12, 1)):
    d = Vector(direction).normalized()
    g = GRIP[side]
    cyl(g + d * (length / 2 - 0.55), 0.028, length, wood, f'hand.{side}', direction=d, verts=12)
    return g + d * (length - 0.55)   # punta del bastón (para poner algo encima)


# ------------------------------------------------------------------ cuerpo (Skin)
def body(fur, female=False, bulk=1.0, limbs=1.0, tail=None):
    """Cuerpo continuo. bulk ensancha el tronco; limbs adelgaza o engorda brazos y piernas;
    tail = material de la cola (None = sin cola)."""
    f = 0.88 if female else 1.0
    V = {
        'pelvis': ((0, 0, 1.0), 0.22 * bulk * (1.05 if female else 1), 0.18 * bulk),
        'spine': ((0, 0, 1.25), 0.21 * bulk * (0.82 if female else 1), 0.17 * bulk * (0.9 if female else 1)),
        'chest': ((0, 0, 1.5), 0.28 * bulk * f, 0.2 * bulk),
        'neck': ((0, 0, 1.72), 0.11 * f, 0.11 * f), 'neck2': ((0, 0, 1.82), 0.1 * f, 0.1 * f),
    }
    E = [('pelvis', 'spine'), ('spine', 'chest'), ('chest', 'neck'), ('neck', 'neck2')]
    if tail is not None:
        V |= {'tail1': ((0, 0.2, 1.0), 0.045, 0.045), 'tail2': ((0, 0.45, 0.82), 0.04, 0.04), 'tail3': ((0, 0.6, 0.52), 0.032, 0.032)}
        E += [('pelvis', 'tail1'), ('tail1', 'tail2'), ('tail2', 'tail3')]
    L = limbs
    for s, n in ((1, 'L'), (-1, 'R')):
        V |= {
            f'hip.{n}': ((s * 0.13, 0, 0.98), 0.13 * L * f, 0.13 * L * f), f'knee.{n}': ((s * 0.14, -0.02, 0.55), 0.1 * L * f, 0.1 * L * f),
            f'ankle.{n}': ((s * 0.14, 0.02, 0.13), 0.075 * L, 0.075 * L), f'toe.{n}': ((s * 0.14, -0.15, 0.06), 0.075, 0.06),
            f'shoulder.{n}': ((s * 0.3 * f * bulk, 0, 1.62), 0.11 * L * f, 0.11 * L * f), f'elbow.{n}': ((s * 0.42, 0, 1.3), 0.08 * L * f, 0.08 * L * f),
            f'wrist.{n}': ((s * 0.5, -0.02, 1.02), 0.065 * L, 0.065 * L), f'paw.{n}': ((s * 0.52, -0.03, 0.92), 0.075, 0.07),
        }
        E += [('pelvis', f'hip.{n}'), (f'hip.{n}', f'knee.{n}'), (f'knee.{n}', f'ankle.{n}'), (f'ankle.{n}', f'toe.{n}'),
              ('chest', f'shoulder.{n}'), (f'shoulder.{n}', f'elbow.{n}'), (f'elbow.{n}', f'wrist.{n}'), (f'wrist.{n}', f'paw.{n}')]
    names = list(V)
    me = bpy.data.meshes.new('Cuerpo')
    me.from_pydata([V[k][0] for k in names], [(names.index(a), names.index(b)) for a, b in E], [])
    obj = bpy.data.objects.new('Cuerpo', me)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    sk = obj.modifiers.new('Skin', 'SKIN')
    sk.branch_smoothing = 0.6
    for i, k in enumerate(names):
        obj.data.skin_vertices[0].data[i].radius = (V[k][1], V[k][2])
    obj.data.skin_vertices[0].data[names.index('pelvis')].use_root = True
    obj.modifiers.new('Sub', 'SUBSURF').levels = 2
    bpy.ops.object.modifier_apply(modifier='Skin')
    bpy.ops.object.modifier_apply(modifier='Sub')
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.materials.append(fur)
    if tail is not None and tail is not fur:
        pass
    return obj


# ------------------------------------------------------------------ esqueleto, pesos y animaciones
def _armature(tail):
    data = bpy.data.armatures.new('Esqueleto')
    rig = bpy.data.objects.new('Esqueleto', data)
    scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb, B = data.edit_bones, {}

    def bone(name, head, tail_, parent=None, connect=False):
        b = eb.new(name)
        b.head, b.tail = Vector(head), Vector(tail_)
        if parent:
            b.parent = B[parent]
            b.use_connect = connect
        B[name] = b

    bone('hips', (0, 0, 0.98), (0, 0, 1.2))
    bone('spine', (0, 0, 1.2), (0, 0, 1.45), 'hips', True)
    bone('chest', (0, 0, 1.45), (0, 0, 1.7), 'spine', True)
    bone('neck', (0, 0, 1.7), (0, 0, 1.84), 'chest', True)
    bone('head', (0, 0, 1.84), (0, 0, 2.2), 'neck', True)
    if tail:
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
    return rig


def nearest_weights(obj, rig):
    """Pesos por cercanía a cada hueso (para mallas generadas por IA, donde los pesos
    automáticos de Blender suelen fallar): los dos huesos más cercanos, con 1/d^4."""
    segs = [(bn.name, bn.head_local.copy(), bn.tail_local.copy()) for bn in rig.data.bones]
    groups = {n: obj.vertex_groups.new(name=n) for n, _, _ in segs}
    mw = obj.matrix_world
    for v in obj.data.vertices:
        p = mw @ v.co
        ds = []
        for n, h, t in segs:
            ab = t - h
            k = max(0.0, min(1.0, (p - h).dot(ab) / max(1e-9, ab.dot(ab))))
            ds.append(((p - (h + ab * k)).length, n))
        ds.sort()
        w = [(1 / (d ** 4 + 1e-6), n) for d, n in ds[:2]]
        tot = sum(x for x, _ in w)
        for x, n in w:
            groups[n].add([v.index], x / tot, 'REPLACE')
    obj.parent = rig
    obj.modifiers.new('Armature', 'ARMATURE').object = rig


def finish_and_export(body_obj, name, tail=False, attack='slash', weights='auto', image_format='AUTO'):
    """Esqueleto, pesos, une las piezas, anima y exporta. attack: 'slash' (golpe con el
    brazo derecho) o 'cast' (lanza un hechizo con los dos brazos hacia delante).
    weights: 'auto' (pesos automáticos de Blender) o 'nearest' (por cercanía)."""
    rig = _armature(tail)
    bpy.ops.object.select_all(action='DESELECT')
    body_obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    if weights == 'nearest':
        nearest_weights(body_obj, rig)
    else:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    if len(body_obj.vertex_groups) < 5:
        print('AVISO: pesos automáticos fallidos, se usan envolventes')
        bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
    for obj, bname in parts:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        g = obj.vertex_groups.new(name=bname)
        g.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for obj, _ in parts:
        obj.select_set(True)
    body_obj.select_set(True)
    bpy.context.view_layer.objects.active = body_obj
    if parts:
        bpy.ops.object.join()
    body_obj.name = body_obj.data.name = name
    for p in body_obj.data.polygons:
        p.use_smooth = True

    pose = rig.pose.bones
    for pb in pose:
        pb.rotation_mode = 'XYZ'

    def axis_sign(bname, axis, target):
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

    S = {
        'thighF': {n: axis_sign(f'thigh.{n}', 0, FWD) for n in 'LR'},
        'shinB': {n: axis_sign(f'shin.{n}', 0, BACK) for n in 'LR'},
        'armF': {n: axis_sign(f'upperarm.{n}', 0, FWD) for n in 'LR'},
        'foreF': {n: axis_sign(f'forearm.{n}', 0, FWD) for n in 'LR'},
        'spineF': axis_sign('spine', 0, FWD), 'chestF': axis_sign('chest', 0, FWD), 'hipsB': axis_sign('hips', 0, BACK),
    }

    def key(frame, rots, locs=None):
        for pb in pose:
            pb.rotation_euler = rots.get(pb.name, (0, 0, 0))
            pb.location = (locs or {}).get(pb.name, (0, 0, 0))
            pb.keyframe_insert('rotation_euler', frame=frame)
            pb.keyframe_insert('location', frame=frame)

    def relaxed(extra=None):
        r = {f'upperarm.{n}': (S['armF'][n] * 0.05, 0, 0) for n in 'LR'}
        r |= {f'forearm.{n}': (S['foreF'][n] * 0.25, 0, 0) for n in 'LR'}
        r |= extra or {}
        return r

    def idle():
        for f, k in ((1, 0), (24, 1), (48, 0)):
            key(f, relaxed({'chest': (S['chestF'] * -0.03 * k, 0, 0), 'head': (0.04 * k, 0, 0.03 * k),
                            'tail1': (0, 0, 0.25 * (1 - 2 * k)), 'tail2': (0, 0, 0.25 * (1 - 2 * k)),
                            'upperarm.R': (S['armF']['R'] * (0.05 + 0.04 * k), 0, 0)}))

    def run():
        for f, ph in ((1, 0), (5, 1), (9, 2), (13, 3), (17, 0)):
            w = (1, 0, -1, 0)[ph]
            L, R = w, -w
            key(f, {
                'spine': (S['spineF'] * 0.22, 0, 0),
                'thigh.L': (S['thighF']['L'] * 0.75 * L, 0, 0), 'thigh.R': (S['thighF']['R'] * 0.75 * R, 0, 0),
                'shin.L': (S['shinB']['L'] * (0.9 if L < 0 else 0.25), 0, 0), 'shin.R': (S['shinB']['R'] * (0.9 if R < 0 else 0.25), 0, 0),
                'upperarm.L': (S['armF']['L'] * 0.6 * R, 0, 0), 'upperarm.R': (S['armF']['R'] * 0.6 * L, 0, 0),
                'forearm.L': (S['foreF']['L'] * 0.7, 0, 0), 'forearm.R': (S['foreF']['R'] * 0.7, 0, 0),
                'tail1': (0, 0, 0.2 * w), 'head': (-0.1, 0, 0),
            }, {'hips': (0, 0.04 if ph in (1, 3) else -0.02, 0)})

    def attack_anim():
        a, fa = S['armF'], S['foreF']
        key(1, relaxed())
        if attack == 'cast':
            key(5, relaxed({n: v for n, v in (('upperarm.R', (a['R'] * 0.6, 0, 0)), ('upperarm.L', (a['L'] * 0.6, 0, 0)), ('chest', (S['chestF'] * -0.15, 0, 0)))}))
            key(8, relaxed({'upperarm.R': (a['R'] * 1.45, 0, 0), 'upperarm.L': (a['L'] * 1.45, 0, 0),
                            'forearm.R': (0, 0, 0), 'forearm.L': (0, 0, 0), 'chest': (S['chestF'] * 0.15, 0, 0)}))
        else:
            key(4, relaxed({'upperarm.R': (a['R'] * 2.6, 0, 0), 'forearm.R': (fa['R'] * 0.6, 0, 0), 'chest': (0, 0.35, 0), 'spine': (S['spineF'] * -0.1, 0, 0)}))
            key(8, relaxed({'upperarm.R': (a['R'] * 0.9, 0, 0), 'forearm.R': (fa['R'] * 0.05, 0, 0), 'chest': (0, -0.4, 0), 'spine': (S['spineF'] * 0.25, 0, 0)}))
        key(13, relaxed())

    def death():
        fallen = relaxed({'hips': (S['hipsB'] * 1.5, 0, 0), 'head': (0.2, 0, 0.3),
                          'upperarm.L': (S['armF']['L'] * 1.2, 0, 0.3), 'upperarm.R': (S['armF']['R'] * 1.0, 0, -0.3),
                          'thigh.L': (S['thighF']['L'] * 0.5, 0, 0), 'thigh.R': (S['thighF']['R'] * 0.2, 0, 0)})
        key(1, relaxed())
        key(8, relaxed({'hips': (S['hipsB'] * 0.5, 0, 0), 'spine': (S['spineF'] * -0.2, 0, 0), 'head': (0.3, 0, 0),
                        'shin.L': (S['shinB']['L'] * 0.8, 0, 0), 'shin.R': (S['shinB']['R'] * 0.8, 0, 0)}), {'hips': (0, -0.2, 0)})
        key(20, fallen, {'hips': (0, -0.75, 0)})
        key(24, fallen, {'hips': (0, -0.78, 0)})

    rig.animation_data_create()
    for aname, fn in (('Idle', idle), ('Run', run), ('Attack', attack_anim), ('Death', death)):
        act = bpy.data.actions.new(aname)
        act.use_fake_user = True
        rig.animation_data.action = act
        fn()
        track = rig.animation_data.nla_tracks.new()
        track.name = aname
        track.strips.new(aname, 1, act)
        rig.animation_data.action = None
    for pb in pose:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)

    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    body_obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True,
                              export_animation_mode='ACTIONS', export_anim_single_armature=True, export_yup=True,
                              export_image_format=image_format)
    tris = sum(len(p.vertices) - 2 for p in body_obj.data.polygons)
    print('EXPORTADO', OUT, 'triángulos:', tris)


# ------------------------------------------------------------------ cabezas y sombreros
def cat_head(H, fur, muzzle, eye_hex, inner=0xe8a0a8, big_ears=1.0):
    """Cabeza felina: hocico, nariz rosada, ojos grandes que brillan, orejas puntiagudas y bigotes."""
    pink = material('NarizGato', 0xd87a8a, rough=0.5)
    eye = material('OjosGato', eye_hex, emit=eye_hex, strength=1.6)
    pupil = material('PupilaGato', 0x0a0a0a, rough=0.3)
    sphere(H, 0.19, (1.05, 1.0, 0.98), fur)
    sphere(H + Vector((0, -0.14, -0.07)), 0.09, (1.25, 0.9, 0.7), muzzle)
    sphere(H + Vector((0, -0.22, -0.03)), 0.028, (1.3, 0.8, 0.8), pink)
    for s in (1, -1):
        sphere(H + Vector((s * 0.08, -0.15, 0.03)), 0.042, (1.0, 0.6, 1.1), eye)
        sphere(H + Vector((s * 0.08, -0.175, 0.03)), 0.016, (0.6, 0.5, 1.7), pupil)
        o = cone(H + Vector((s * 0.12, 0.0, 0.2 * big_ears)), 0.085 * big_ears, 0, 0.22 * big_ears, fur, 'head', (s * 0.35, 0.05, 1), verts=4)
        cone(H + Vector((s * 0.115, -0.03, 0.19 * big_ears)), 0.05 * big_ears, 0, 0.14 * big_ears, material('OrejaInt', inner, rough=0.7), 'head', (s * 0.35, 0.05, 1), verts=4)
        for k in (-1, 1):
            box(H + Vector((s * 0.16, -0.19, -0.06 + k * 0.02)), (0.16, 0.004, 0.004), material('Bigote', 0xf4f0ea), 'head', rot=(0, k * s * 0.15, 0))


def witch_hat(H, mat, band, tilt=0.25, size=1.0):
    k = size
    cyl(H + Vector((0, 0, 0.16)), 0.44 * k, 0.02, mat, 'head', verts=48)
    cone(H + Vector((0, 0, 0.16)), 0.46 * k, 0.4 * k, 0.03, mat, 'head', verts=48)        # borde caído del ala
    cyl(H + Vector((0, 0, 0.22)), 0.21 * k, 0.12, mat, 'head', verts=32)
    torus(H + Vector((0, 0, 0.2)), 0.21 * k, 0.03, band, 'head')
    cone(H + Vector((0.05 * k, 0.05 * k, 0.22 + 0.3 * k)), 0.21 * k, 0.07 * k, 0.5 * k, mat, 'head', (tilt, 0.25, 1), verts=32)
    cone(H + Vector((0.22 * k, 0.16 * k, 0.5 + 0.3 * k)), 0.075 * k, 0.0, 0.32 * k, mat, 'head', (1, 0.5, -0.3), verts=16)


def wide_hat(H, mat, band, feather=None):
    cyl(H + Vector((0, 0, 0.16)), 0.38, 0.02, mat, 'head', verts=40)
    cyl(H + Vector((0, 0, 0.26)), 0.17, 0.2, mat, 'head', verts=32, scale=(1, 1, 1))
    torus(H + Vector((0, 0, 0.19)), 0.175, 0.02, band, 'head')
    if feather is not None:
        for i in range(3):
            sphere(H + Vector((0.16 + i * 0.03, 0.08 + i * 0.03, 0.3 + i * 0.03)), 0.05, (0.5, 0.3, 1.8), feather, rot=(0.4, -0.5 - i * 0.2, 0))
