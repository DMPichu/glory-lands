# Piezas para construir héroes humanoides a partir de una ficha (ver fichas.py y
# heroe.py): cara pintada de estilo anime, peinados, orejas, tocados, ropa y armas.
# Se apoya en base.py (cuerpo, esqueleto, animaciones, exportación).
import math

import bpy
import numpy as np
from mathutils import Vector

from base import (GRIP, add, align, box, cape, cone, cyl, material, sphere, srgb, torus,  # noqa: F401
                  witch_hat, wide_hat)

HEAD_R = 0.2


# ------------------------------------------------------------------ cara pintada
def _hex(h):
    # la imagen es sRGB de 8 bits: los valores van tal cual (sin pasar a lineal)
    return np.array([((h >> k) & 255) / 255 for k in (16, 8, 0)], dtype=np.float32)


def _ellipse(yy, xx, cx, cy, rx, ry):
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1


def _stroke(yy, xx, pts, width):
    """Trazo grueso a lo largo de una polilínea (lista de (x, y))."""
    m = np.zeros(yy.shape, bool)
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        n = max(2, int(math.hypot(x1 - x0, y1 - y0) / (width * 0.5)))
        for t in np.linspace(0, 1, n):
            m |= _ellipse(yy, xx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width, width)
    return m


def _bezier(p0, p1, p2, n=14):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, n)]


def face_image(name, skin_hex, o):
    """Textura de la cara (512 px): piel + ojos grandes de anime, cejas, boca, rubor.
    o: female, iris, lash, brow, closed, frown, beard, paint, glow, mouth_open"""
    S = 1024
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S  # coordenadas 0..1, y hacia abajo
    img = np.ones((S, S, 3), np.float32) * _hex(skin_hex)
    F = o.get('female', False)
    skin = _hex(skin_hex)

    def paint(mask, col, alpha=1.0):
        img[mask] = img[mask] * (1 - alpha) + np.array(col, np.float32) * alpha

    if o.get('paint'):  # pintura de guerra (Astrid)
        paint(_ellipse(yy, xx, 0.5, 0.49, 0.36, 0.07), _hex(o['paint']), 0.55)
    # rubor
    for s in (-1, 1):
        paint(_ellipse(yy, xx, 0.5 + s * 0.26, 0.64, 0.08, 0.05), (0.95, 0.45, 0.5), 0.3 if F else 0.12)
    eye_y, dx = 0.5, 0.17 if F else 0.165
    ew, eh = (0.105, 0.085) if F else (0.095, 0.065)
    iris = _hex(o.get('iris', 0x6a8aff))
    lash = _hex(o.get('lash', 0x2a2030))
    for s in (-1, 1):
        cx = 0.5 + s * dx
        if o.get('closed'):
            paint(_stroke(yy, xx, _bezier((cx - ew, eye_y), (cx, eye_y + 0.04), (cx + ew, eye_y - 0.005)), 0.009), lash)
        else:
            white = _ellipse(yy, xx, cx, eye_y + 0.01, ew, eh)
            paint(white, (0.99, 0.98, 0.97))
            # sombra del párpado
            paint(white & (yy < eye_y - eh * 0.45), (0.55, 0.5, 0.65), 0.35)
            icx, icy, irx, iry = cx + s * 0.01, eye_y + 0.015, ew * 0.58, eh * 0.95
            iris_m = _ellipse(yy, xx, icx, icy, irx, iry) & white
            grad = np.clip((yy - (icy - iry)) / (2 * iry), 0, 1)[:, :, None]
            dark = iris * 0.25
            light = np.clip(iris * 1.6 + 0.25, 0, 1)
            col = dark * (1 - grad) + light * grad
            img[iris_m] = col[iris_m]
            paint(_ellipse(yy, xx, icx, icy, irx * 1.02, iry * 1.02) & ~_ellipse(yy, xx, icx, icy, irx * 0.88, iry * 0.9) & white, iris * 0.2)
            paint(_ellipse(yy, xx, icx, icy - 0.003, irx * 0.42, iry * 0.45), (0.04, 0.03, 0.06))
            paint(_ellipse(yy, xx, icx - s * irx * 0.35, icy - iry * 0.42, irx * 0.33, iry * 0.25), (1, 1, 1))
            paint(_ellipse(yy, xx, icx + s * irx * 0.4, icy + iry * 0.4, irx * 0.14, iry * 0.12), (1, 1, 1))
            # pestañas
            top = _bezier((cx - s * (ew + 0.005), eye_y + 0.005), (cx + s * 0.01, eye_y - eh - 0.02), (cx + s * (ew + 0.01), eye_y - eh * 0.35))
            paint(_stroke(yy, xx, top, 0.012 if F else 0.009), lash)
            if F:
                paint(_stroke(yy, xx, [(cx + s * (ew - 0.005), eye_y - eh * 0.4), (cx + s * (ew + 0.035), eye_y - eh * 0.9)], 0.007), lash)
            paint(_stroke(yy, xx, [(cx + s * ew * 0.3, eye_y + eh + 0.012), (cx + s * ew * 0.95, eye_y + eh * 0.45)], 0.004), (0.4, 0.22, 0.3), 0.6)
        brow = _hex(o.get('brow', 0x3a2a30))
        by = eye_y - eh - (0.075 if F else 0.06)
        fr = 0.012 if o.get('frown') else 0
        paint(_stroke(yy, xx, _bezier((cx - s * 0.06, by + 0.015 - fr), (cx + s * 0.01, by - 0.012 + fr), (cx + s * 0.085, by + 0.01 + fr)), 0.006 if F else 0.009), brow)
    if o.get('glow'):
        for s in (-1, 1):
            paint(_ellipse(yy, xx, 0.5 + s * dx, eye_y, 0.14, 0.11), _hex(o['glow']), 0.18)
    # nariz y boca
    paint(_ellipse(yy, xx, 0.503, 0.665, 0.009, 0.006), (0.65, 0.35, 0.3), 0.5)
    mouth = _hex(o.get('mouth', 0x9a3a48))
    if o.get('mouth_open'):
        paint(_ellipse(yy, xx, 0.5, 0.765, 0.04, 0.03), (0.45, 0.12, 0.16))
        paint(_ellipse(yy, xx, 0.5, 0.775, 0.028, 0.012), (0.9, 0.45, 0.5))
    else:
        m = _bezier((0.47, 0.76 + (0.012 if o.get('frown') else 0)), (0.5, 0.79 - (0.03 if o.get('frown') else 0)), (0.53, 0.76 + (0.012 if o.get('frown') else 0)))
        paint(_stroke(yy, xx, m, 0.006), mouth)
    if o.get('beard'):
        b = _hex(o['beard'])
        paint(_ellipse(yy, xx, 0.455, 0.74, 0.05, 0.016), b)
        paint(_ellipse(yy, xx, 0.545, 0.74, 0.05, 0.016), b)
        paint(_ellipse(yy, xx, 0.5, 0.86, 0.045, 0.07), b)
    if o.get('scar'):
        paint(_stroke(yy, xx, [(0.69, 0.56), (0.73, 0.66)], 0.005), (0.6, 0.3, 0.3))
    # reducción 2x (antialias)
    small = img.reshape(S // 2, 2, S // 2, 2, 3).mean(axis=(1, 3))
    small = small[::-1]  # fila 0 abajo (convención de Blender)
    im = bpy.data.images.new(name, S // 2, S // 2)
    rgba = np.concatenate([small, np.ones((S // 2, S // 2, 1), np.float32)], axis=2)
    im.pixels.foreach_set(rgba.ravel())
    im.file_format = 'JPEG'
    im.pack()
    return im


def face_material(name, skin_hex, o):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    b = nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.75
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = face_image(name + '_img', skin_hex, o)
    tex.extension = 'EXTEND'
    m.node_tree.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    return m


def human_head(H, skin_hex, face, ears=None):
    """Cabeza: esfera algo alargada con la cara pintada proyectada desde delante.
    ears: None, 'elf', 'goblin'"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=HEAD_R, location=H, segments=40, ring_count=28)
    o = bpy.context.active_object
    o.scale = (0.93, 0.98, 1.06)
    me = o.data
    # mentón más fino
    for v in me.vertices:
        if v.co.z < 0:
            k = min(1.0, -v.co.z / HEAD_R)
            v.co.x *= 1 - 0.3 * k * k
            v.co.y *= 1 - 0.12 * k * k
    while me.uv_layers:                      # fuera el mapa esférico de serie: solo vale el frontal
        me.uv_layers.remove(me.uv_layers[0])
    uv = me.uv_layers.new(name='Cara')
    me.uv_layers.active = uv
    uv.active_render = True
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if co.y < -0.02:
                uv.data[li].uv = (0.5 + co.x / (2 * HEAD_R * 0.86), 0.5 + (co.z - 0.01) / (2 * HEAD_R * 0.86))
            else:
                uv.data[li].uv = (0.02, 0.02)
    add(o, face_material('Cara', skin_hex, face), 'head')
    skin = material('Piel', skin_hex, rough=0.75)
    if ears == 'elf':
        for s in (1, -1):
            cone(H + Vector((s * 0.2, 0.0, 0.0)), 0.035, 0, 0.2, skin, 'head', (s * 1, 0, 0.35), verts=8)
    elif ears == 'goblin':
        for s in (1, -1):
            cone(H + Vector((s * 0.25, 0.0, 0.0)), 0.05, 0, 0.32, skin, 'head', (s * 1, 0, 0.25), verts=8)
    else:
        for s in (1, -1):
            sphere(H + Vector((s * 0.19, 0.0, -0.01)), 0.035, (0.6, 1, 1.2), skin)
    return skin


# ------------------------------------------------------------------ pelo
def lock(pos, direction, r, length, mat, bone='head', flat=1.0):
    """Mechón: esfera estirada. flat > 1 lo hace más ancho y plano (mechones que se solapan)."""
    o = sphere(pos, r, (0.75 * flat, 0.5, length / r * 0.5), mat, bone)
    align(o, direction)
    return o


def hair(H, mat, style, mat2=None):
    """style: lista de palabras: cap, bangs, long, waves, ponytail, twin, bun, short, bob,
    spiky, wild, braids, curly, slick, side (mechón largo a un lado), tails (dos coletas bajas)"""
    st = set(style)
    m2 = mat2 or mat
    if 'cap' in st or len(st) == 0 or not st & {'slick'}:
        sphere(H + Vector((0, 0.045, 0.03)), HEAD_R * 1.07, (1.0, 0.98, 1.04), mat)
    if 'slick' in st:
        sphere(H + Vector((0, 0.03, 0.035)), HEAD_R * 1.05, (0.98, 1.0, 1.0), mat)
    if 'bangs' in st or st & {'long', 'waves', 'ponytail', 'twin', 'bun', 'short', 'bob', 'wild', 'braids', 'curly', 'tails', 'side'}:
        # flequillo: mechones solapados pegados a la frente, que acaban sobre los ojos
        n = 9
        for i in range(n):
            x = (i - (n - 1) / 2) * 0.042
            ln = 0.15 + 0.02 * (i % 2)
            lock(H + Vector((x * 1.05, -0.165 + abs(x) * 0.5, 0.215 - ln / 2)), (x * 0.25, -0.12, -1), 0.05, ln, mat if i % 2 else m2, flat=1.7)
    if 'long' in st or 'waves' in st or 'wild' in st:
        # melena: cortina de mechones solapados desde la nuca hasta la espalda
        for row, (y, z, ln) in enumerate(((0.16, 0.05, 0.75), (0.1, 0.1, 0.7), (0.02, 0.14, 0.6))):
            n = 9 - row * 2
            for i in range(n):
                x = (i - (n - 1) / 2) * 0.062
                wav = 0.12 * (i % 2) if 'waves' in st else 0
                lock(H + Vector((x * (1.15 + row * 0.1), y, z - ln / 2)), (x * 0.25 + wav * (1 if i % 2 else -1) * 0.3, 0.15 + wav, -1), 0.07, ln, mat if (i + row) % 2 else m2, flat=1.4)
        for s in (1, -1):
            lock(H + Vector((s * 0.21, -0.04, -0.18)), (s * 0.12, -0.05, -1), 0.06, 0.55, mat, flat=1.3)
            if 'waves' in st:
                lock(H + Vector((s * 0.25, 0.04, -0.28)), (s * 0.35, 0.1, -1), 0.05, 0.45, m2)
    if 'wild' in st or 'spiky' in st:
        for i in range(9):
            a = i / 9 * math.tau
            d = Vector((math.cos(a), math.sin(a) * 0.6 + 0.3, 0.9))
            lock(H + Vector((math.cos(a) * 0.14, math.sin(a) * 0.1 + 0.03, 0.2)), d, 0.04, 0.26, mat if i % 2 else m2)
    if 'short' in st:
        for s in (1, -1):
            lock(H + Vector((s * 0.2, -0.03, 0.02)), (s * 0.1, 0, -1), 0.045, 0.22, mat)
            lock(H + Vector((s * 0.17, 0.15, -0.02)), (s * 0.1, 0.4, -1), 0.045, 0.22, m2)
    if 'bob' in st:
        for i in range(12):
            a = (i + 0.5) / 12 * math.pi + math.pi * 0.5
            x, y = math.cos(a) * 0.2, -math.sin(a) * 0.2 + 0.02
            if y < -0.09:
                continue
            lock(H + Vector((x * 1.1, y * 1.1 + 0.05, -0.1)), (x * 0.2, y * 0.2, -1), 0.05, 0.34, mat if i % 2 else m2)
    if 'ponytail' in st:
        sphere(H + Vector((0, 0.2, 0.12)), 0.07, (1, 1, 1), m2)
        for k in range(4):
            lock(H + Vector((0.0, 0.25 + k * 0.04, 0.02 - k * 0.17)), (0.05 * (k % 2), 0.3, -1), 0.06 - k * 0.006, 0.26, mat if k % 2 else m2)
    if 'twin' in st or 'tails' in st:
        hi = 0.1 if 'twin' in st else -0.06
        for s in (1, -1):
            sphere(H + Vector((s * 0.2, 0.05, hi)), 0.06, (1, 1, 1), m2)
            for k in range(3):
                lock(H + Vector((s * (0.24 + k * 0.02), 0.06 + k * 0.02, hi - 0.17 - k * 0.2)), (s * 0.12, 0.1, -1), 0.06 - k * 0.008, 0.28, mat if k % 2 else m2)
    if 'bun' in st:
        sphere(H + Vector((0, 0.12, 0.22)), 0.09, (1.1, 1.0, 0.8), mat)
    if 'braids' in st:
        for s in (1, -1):
            for k in range(7):
                sphere(H + Vector((s * (0.19 + 0.012 * (k % 2)), -0.05 - k * 0.005, 0.0 - k * 0.075)), 0.04, (1, 0.85, 1.1), mat if k % 2 else m2)
    if 'curly' in st:
        for i in range(14):
            a = i / 14 * math.tau
            sphere(H + Vector((math.cos(a) * 0.2, math.sin(a) * 0.17 + 0.03, 0.05 + 0.05 * math.sin(i * 2.1))), 0.065, (1, 1, 1), mat if i % 2 else m2)
        for i in range(10):
            a = i / 10 * math.tau
            sphere(H + Vector((math.cos(a) * 0.22, math.sin(a) * 0.18 + 0.03, -0.12)), 0.06, (1, 1, 1), m2 if i % 2 else mat)
    if 'side' in st:
        lock(H + Vector((0.17, -0.1, -0.2)), (0.2, -0.1, -1), 0.045, 0.5, m2)


# ------------------------------------------------------------------ tocados y extras
def headgear(H, kind, mat, mat2=None, extra=None):
    m2 = mat2 or mat
    if kind == 'glasses':
        gm = material('Gafas', 0x1a1a1e, metal=0.6, rough=0.3)
        for s in (1, -1):
            torus(H + Vector((s * 0.07, -0.19, 0.0)), 0.045, 0.006, gm, 'head', rot=(math.pi / 2, 0, 0))
        box(H + Vector((0, -0.19, 0.0)), (0.05, 0.006, 0.006), gm, 'head')
    elif kind == 'horns':          # cuernos de carnero (Yeslie, Grimdarkus)
        for s in (1, -1):
            torus(H + Vector((s * 0.2, 0.0, 0.1)), 0.11, 0.035, mat, 'head', rot=(0, math.pi / 2, 0))
            cone(H + Vector((s * 0.3, -0.05, 0.02)), 0.03, 0, 0.1, m2, 'head', (s * 0.3, -0.8, -0.3), verts=8)
    elif kind == 'horns_up':       # cuernos rectos hacia arriba (Xeluna)
        for s in (1, -1):
            cone(H + Vector((s * 0.12, 0.02, 0.32)), 0.04, 0, 0.3, mat, 'head', (s * 0.35, 0, 1), verts=10)
    elif kind == 'headband':
        torus(H + Vector((0, 0.02, 0.1)), 0.21, 0.018, mat, 'head', rot=(-0.3, 0, 0))
        for s in (1, -1):
            cyl(H + Vector((s * 0.05, 0.1, 0.25)), 0.01, 0.4, material('Palillo', 0x1a1a1e), 'head', direction=(1, 0.1 * s, 0.15), verts=6)
    elif kind == 'tiara':
        gold = material('OroTiara', 0xe0b33c, metal=0.5, rough=0.3)
        torus(H + Vector((0, 0.03, 0.12)), 0.2, 0.012, gold, 'head', rot=(-0.4, 0, 0))
        for i in range(-2, 3):
            cone(H + Vector((i * 0.05, -0.14 + abs(i) * 0.02, 0.22 - abs(i) * 0.01)), 0.018, 0, 0.07 - abs(i) * 0.012, gold, 'head', (0, -0.2, 1), verts=4)
    elif kind == 'crown':
        gold = material('OroCorona', 0xe0b33c, metal=0.5, rough=0.3)
        cyl(H + Vector((0, 0.02, 0.2)), 0.15, 0.08, gold, 'head', verts=20)
        for i in range(8):
            a = i / 8 * math.tau
            cone(H + Vector((math.cos(a) * 0.15, math.sin(a) * 0.15 + 0.02, 0.27)), 0.025, 0, 0.07, gold, 'head', verts=4)
    elif kind == 'bow':
        for s in (1, -1):
            sphere(H + Vector((s * 0.09, 0.02, 0.24)), 0.07, (1.2, 0.5, 0.8), mat)
        sphere(H + Vector((0, 0.02, 0.24)), 0.035, (1, 1, 1), m2)
    elif kind == 'beret':
        sphere(H + Vector((0.03, 0.02, 0.19)), 0.25, (1.1, 1.05, 0.42), mat)
    elif kind == 'cap_military':   # gorra de plato (Catarina)
        cyl(H + Vector((0, 0.0, 0.2)), 0.23, 0.1, mat, 'head', verts=32)
        cyl(H + Vector((0, 0.02, 0.26)), 0.26, 0.03, mat, 'head', verts=32)
        torus(H + Vector((0, 0, 0.17)), 0.23, 0.012, material('OroGorra', 0xe0b33c, metal=0.5, rough=0.3), 'head')
        cyl(H + Vector((0, -0.22, 0.15)), 0.16, 0.015, material('Visera', 0x101016, rough=0.3), 'head', verts=24, scale=(1, 0.55, 1))
        box(H + Vector((0, -0.23, 0.24)), (0.09, 0.02, 0.05), m2, 'head')
    elif kind == 'kasa':           # sombrero de paja
        cone(H + Vector((0, 0, 0.3)), 0.42, 0.0, 0.2, mat, 'head', verts=32)
    elif kind == 'hood':
        hm = material('Capucha', mat.name and 0x0, rough=0.7) if False else mat
        sphere(H + Vector((0, 0.09, 0.05)), 0.29, (1.0, 0.95, 1.05), hm)
        for s in (1, -1):
            lock(H + Vector((s * 0.24, -0.08, -0.08)), (s * 0.05, -0.1, -1), 0.03, 0.4, m2)
    elif kind == 'catHood':
        sphere(H + Vector((0, 0.09, 0.05)), 0.29, (1.0, 0.95, 1.05), mat)
        for s in (1, -1):
            cone(H + Vector((s * 0.16, 0.05, 0.32)), 0.09, 0, 0.22, mat, 'head', (s * 0.35, 0.05, 1), verts=4)
            lock(H + Vector((s * 0.24, -0.08, -0.08)), (s * 0.05, -0.1, -1), 0.03, 0.4, m2)
    elif kind == 'halo':
        torus(H + Vector((0, 0.02, 0.36)), 0.17, 0.014, mat, 'head', rot=(0.15, 0, 0))
    elif kind == 'helm':
        cyl(H + Vector((0, 0, 0.0)), 0.215, 0.42, mat, 'head', verts=32)
        box(H + Vector((0, -0.2, 0.03)), (0.3, 0.02, 0.025), material('Ranura', 0x0a0a0c), 'head')
        box(H + Vector((0, -0.21, -0.03)), (0.03, 0.02, 0.22), m2, 'head')
        cone(H + Vector((0, 0, 0.22)), 0.215, 0.05, 0.08, mat, 'head', verts=32)
    elif kind == 'witch':
        witch_hat(H + Vector((0, 0, 0.04)), mat, m2, tilt=0.35, size=1.15)
    elif kind == 'wide':
        wide_hat(H, mat, m2, extra)
    elif kind == 'mask':           # pañuelo sobre la boca
        sphere(H + Vector((0, -0.12, -0.08)), 0.15, (1.1, 0.7, 0.6), mat)


# ------------------------------------------------------------------ ropa
def outfit(sp, skin):
    top = material('Ropa', sp['top'], rough=0.7)
    pants = material('Pantalon', sp.get('pants', sp['top']), rough=0.7)
    boots = material('Botas', sp.get('boots', 0x2a1e18), rough=0.6)
    acc = material('Acento', sp.get('accent', 0xe0b33c), metal=0.4, rough=0.4)
    F = sp.get('female', False)
    hands = material('Guantes', sp['gloves'], rough=0.6) if sp.get('gloves') is not None else skin
    for s, n in ((1, 'L'), (-1, 'R')):
        if not sp.get('bare_legs'):
            cyl((s * 0.135, -0.01, 0.78), 0.115 * (0.92 if F else 1), 0.4, pants, f'thigh.{n}', direction=(0, -0.05, -1))
            cyl((s * 0.14, 0.0, 0.36), 0.085, 0.36, pants, f'shin.{n}')
        cyl((s * 0.14, 0.0, 0.2), 0.09, 0.26, boots, f'shin.{n}')
        sphere((s * 0.14, -0.1, 0.07), 0.08, (1, 1.5, 0.75), boots, bone=f'foot.{n}')
        sphere((s * 0.52, -0.03, 0.92), 0.075, (1, 1, 1.1), hands, bone=f'hand.{n}')
        if sp.get('bare_arms'):
            cyl((s * 0.46, -0.01, 1.16), 0.062, 0.32, skin, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    kinds = set(sp.get('wear', []))
    if 'skirt' in kinds:
        cone((0, 0, 0.84), 0.36, 0.22, 0.42, material('Falda', sp.get('skirt', sp['top']), rough=0.7), 'hips', scale=(1, 0.85, 1), verts=36)
    if 'dress' in kinds:
        cone((0, 0, 0.58), 0.42, 0.24, 0.95, material('Vestido', sp.get('skirt', sp['top']), rough=0.7), 'hips', scale=(1, 0.85, 1), verts=36)
    if 'coat' in kinds:
        cone((0, 0, 0.7), 0.36, 0.3, 0.7, material('Abrigo', sp.get('coat', sp['top']), rough=0.7), 'hips', scale=(1, 0.85, 1), verts=36)
        for s in (1, -1):
            box((s * 0.1, -0.24, 1.5), (0.08, 0.03, 0.3), material('Solapa', sp.get('coat', sp['top']), rough=0.7), 'chest', rot=(0, 0, s * 0.3))
    if 'armor' in kinds:
        steel = material('Coraza', sp.get('armor', 0xc4cad6), metal=0.4, rough=0.35)
        cyl((0, 0, 1.45), 0.29, 0.42, steel, 'chest', verts=36, scale=(1, 0.8, 1))
        sphere((0, -0.13, 1.46), 0.26, (1.0, 0.42, 0.85), steel, bone='chest')
        torus((0, 0, 1.65), 0.27, 0.02, acc, 'chest', scale=(1, 0.82, 1))
    if 'pauldrons' in kinds or 'armor' in kinds:
        pm = material('Hombreras', sp.get('armor', sp.get('accent', 0xc4cad6)), metal=0.4, rough=0.35)
        for s, n in ((1, 'L'), (-1, 'R')):
            sphere((s * 0.3, 0, 1.66), 0.14, (1.1, 1.0, 0.6), pm, bone=f'upperarm.{n}')
            torus((s * 0.3, 0, 1.63), 0.13, 0.012, acc, f'upperarm.{n}', scale=(1.1, 1, 1))
    if 'bracers' in kinds:
        bm = material('Brazales', sp.get('armor', 0xc4cad6), metal=0.4, rough=0.35)
        for s, n in ((1, 'L'), (-1, 'R')):
            cyl((s * 0.48, -0.015, 1.12), 0.08, 0.2, bm, f'forearm.{n}', direction=(s * 0.27, -0.06, -1))
    if 'belt' in kinds:
        torus((0, 0, 1.11), 0.23, 0.03, material('Cinturon', sp.get('belt', 0x4a3220), rough=0.6), 'spine', scale=(1, 0.8, 0.8))
        box((0, -0.22, 1.11), (0.08, 0.025, 0.06), acc, 'spine')
    if 'sash' in kinds:
        torus((0, 0, 1.12), 0.24, 0.05, material('Faja', sp.get('sash', sp.get('accent')), rough=0.8), 'spine', scale=(1, 0.8, 0.7))
    if 'scarf' in kinds:
        torus((0, -0.02, 1.7), 0.14, 0.05, material('Bufanda', sp.get('scarf', 0xc0182a), rough=0.85), 'neck', scale=(1, 0.9, 0.8))
        lock((0.06, -0.14, 1.5), (0.1, -0.15, -1), 0.04, 0.35, material('Bufanda2', sp.get('scarf', 0xc0182a), rough=0.85), 'chest')
    if 'collar' in kinds:
        torus((0, 0, 1.68), 0.12, 0.025, acc, 'neck', scale=(1, 0.9, 1))
    if 'emblem' in kinds:
        sphere((0, -0.25, 1.48), 0.035, (1, 0.5, 1), material('Emblema', sp.get('emblem', sp.get('accent', 0xe0b33c)), emit=sp.get('emblem', 0xe0b33c), strength=1.2), bone='chest')
    if 'cape' in kinds:
        cape(material('Capa', sp.get('cape', 0x2a3a6a), rough=0.8), ragged=sp.get('ragged', False))
    if 'chest_plate' in kinds:
        box((0, -0.22, 1.42), (0.22, 0.03, 0.28), material('Peto', sp.get('armor', 0xc4cad6), metal=0.4, rough=0.35), 'chest')
    if 'shirt' in kinds:
        box((0, -0.215, 1.4), (0.14, 0.03, 0.34), material('Camisa', sp.get('shirt', 0xf4f4f8), rough=0.7), 'chest')
    if 'wings' in kinds:
        wm = material('Alas', sp.get('wings', 0xf8f8ff), rough=0.9)
        for s in (1, -1):
            for k in range(3):
                lock((s * (0.2 + k * 0.1), 0.22, 1.5 + k * 0.03), (s * 1, 0.2, 0.3 - k * 0.25), 0.05, 0.3, wm, 'chest')
    if 'tail_cat' in kinds:
        tm = material('Cola', sp.get('tail', 0x1c1c24), rough=0.85)
        for k in range(4):
            sphere((0.05 * k, 0.25 + k * 0.1, 0.95 - k * 0.1), 0.04, (1, 1, 1.6), tm, bone='hips')
    return acc


# ------------------------------------------------------------------ armas
def weapon(kind, sp, acc):
    steel = material('Hoja', sp.get('blade', 0xe8ecf4), metal=0.35, rough=0.2, emit=sp.get('blade_glow'), strength=1.2)
    wood = material('Madera', 0x5a3a22, rough=0.7)
    glow = material('Brillo', sp.get('glow', sp.get('accent', 0xe0b33c)), emit=sp.get('glow', sp.get('accent', 0xe0b33c)), strength=3)
    g, gl = GRIP['R'], GRIP['L']
    d = Vector((0, -0.6, 0.8)).normalized()
    if kind in ('sword', 'twin', 'rapier', 'greatsword'):
        ln, w = {'sword': (0.85, 0.075), 'twin': (0.7, 0.06), 'rapier': (0.9, 0.035), 'greatsword': (1.15, 0.12)}[kind]
        box(g + d * (0.1 + ln / 2), (w, 0.02, ln), steel, 'hand.R', direction=d)
        box(g + d * 0.08, (0.3, 0.05, 0.05), acc, 'hand.R', direction=d)
        cyl(g - d * 0.06, 0.022, 0.16, wood, 'hand.R', direction=d, verts=10)
        if kind == 'twin':
            box(gl + d * (0.1 + ln / 2), (w, 0.02, ln), steel, 'hand.L', direction=d)
            box(gl + d * 0.08, (0.3, 0.05, 0.05), acc, 'hand.L', direction=d)
    elif kind == 'katana':
        box(g + d * 0.6, (0.045, 0.015, 1.0), steel, 'hand.R', direction=d)
        box(g + d * 0.08, (0.09, 0.09, 0.02), acc, 'hand.R', direction=d)
        cyl(g - d * 0.1, 0.02, 0.26, material('Mango', 0x1a1a22), 'hand.R', direction=d, verts=10)
    elif kind == 'daggers':
        for hd, gg in (('hand.R', g), ('hand.L', gl)):
            box(gg + d * 0.22, (0.05, 0.015, 0.32), steel, hd, direction=d)
            box(gg + d * 0.05, (0.14, 0.04, 0.03), acc, hd, direction=d)
    elif kind in ('axe', 'hammer', 'scythe'):
        dd = Vector((0, -0.2, 1)).normalized()
        cyl(g + dd * 0.35, 0.025, 1.2, wood, 'hand.R', direction=dd, verts=10)
        if kind == 'axe':
            cyl(g + dd * 0.85 + Vector((-0.1, 0, 0)), 0.2, 0.04, steel, 'hand.R', direction=(1, 0, 0), verts=16, scale=(1, 0.8, 1))
        elif kind == 'hammer':
            box(g + dd * 0.88, (0.34, 0.2, 0.2), steel, 'hand.R')
        else:
            box(g + dd * 0.9 + Vector((-0.3, 0, 0.05)), (0.6, 0.02, 0.09), steel, 'hand.R', direction=(1, 0, 0.35))
    elif kind in ('staff', 'orb_staff'):
        dd = Vector((0, -0.1, 1)).normalized()
        cyl(g + dd * 0.35, 0.025, 1.7, wood, 'hand.R', direction=dd, verts=10)
        tip = g + dd * 1.2
        if kind == 'orb_staff':
            sphere(tip, 0.07, (1, 1, 1), glow, bone='hand.R')
            torus(tip, 0.1, 0.01, acc, 'hand.R', rot=(0.5, 0.3, 0))
        else:
            cone(tip, 0.06, 0, 0.16, glow, 'hand.R', direction=dd, verts=8)
    elif kind == 'book':
        box(gl + Vector((0, -0.08, 0.02)), (0.26, 0.05, 0.2), material('Libro', sp.get('book', 0x2a1a5a), rough=0.6), 'hand.L')
        box(gl + Vector((0, -0.08, 0.05)), (0.24, 0.02, 0.18), material('Paginas', 0xfff6e0, rough=0.8), 'hand.L')
    elif kind == 'bow':
        torus(gl + Vector((0, -0.05, 0.1)), 0.5, 0.018, wood, 'hand.L', scale=(0.6, 1, 1), rot=(0, math.pi / 2, 0))
        box(gl + Vector((0.0, 0.0, 0.1)), (0.004, 0.004, 1.0), material('Cuerda', 0xf4f4f0), 'hand.L')
    elif kind == 'rifle':
        box(g + d * 0.4, (0.05, 0.06, 0.9), material('Culata', 0x4a3220, rough=0.6), 'hand.R', direction=d)
        cyl(g + d * 0.85, 0.016, 0.6, steel, 'hand.R', direction=d, verts=10)
    elif kind == 'pistol':
        box(g + d * 0.15, (0.04, 0.05, 0.3), steel, 'hand.R', direction=d)
        box(g - d * 0.02 + Vector((0, 0.04, 0)), (0.04, 0.09, 0.05), wood, 'hand.R')
    elif kind == 'crystal_gun':
        box(g + d * 0.15, (0.06, 0.08, 0.26), steel, 'hand.R', direction=d)
        sphere(g + d * 0.33, 0.06, (1, 1, 1.4), glow, bone='hand.R')
    elif kind == 'fan':
        cyl(gl + Vector((0, -0.08, 0.1)), 0.28, 0.015, material('Abanico', sp.get('fan', 0xd8f4ff), emit=0x5ac8ff, strength=0.4), 'hand.L', direction=(0, 1, 0), verts=24, scale=(1, 0.5, 1))
    elif kind == 'fists':
        for hd, gg in (('hand.R', g), ('hand.L', gl)):
            sphere(gg + Vector((0, -0.02, -0.02)), 0.095, (1, 1, 1), glow, bone=hd)
    elif kind == 'lance':
        dd = Vector((0, -0.3, 1)).normalized()
        cyl(g + dd * 0.4, 0.022, 1.9, wood, 'hand.R', direction=dd, verts=10)
        cone(g + dd * 1.45, 0.05, 0, 0.26, steel, 'hand.R', direction=dd, verts=4)
    if sp.get('shield'):
        sm = material('Escudo', sp['shield'], metal=0.3, rough=0.4)
        p = gl + Vector((0.08, -0.1, 0.05))
        if sp.get('shield_shape') == 'kite':
            box(p, (0.05, 0.38, 0.4), sm, 'hand.L')
            cone(p + Vector((0, 0, -0.34)), 0.19, 0, 0.26, sm, 'hand.L', direction=(0, 0, -1), verts=4, scale=(0.25, 1, 1))
        else:
            cyl(p, 0.28, 0.04, sm, 'hand.L', direction=(1, 0, 0), verts=32)
            torus(p, 0.27, 0.02, acc, 'hand.L', rot=(0, math.pi / 2, 0))
            sphere(p + Vector((0.03, 0, 0)), 0.06, (0.5, 1, 1), acc, bone='hand.L')
