"""Genera un modelo 3D con la demo pública de Hunyuan3D-2 (Hugging Face, Gradio 4.44).
Uso: python tools/hunyuan3d.py <imagen> <carpeta_salida> [shape_generation|generation_all]

shape_generation (por defecto) devuelve solo la forma (white_mesh.glb); la textura se
pone después con tools/blender/ia_heroe.py proyectando la ilustración. generation_all
(forma + textura) fallaba en la demo pública en noviembre de 2026.
OJO: la imagen se envía a Hugging Face y Tencent; licencia del resultado: Tencent
Hunyuan 3D 2.0 Community License (ver CREDITOS.md)."""
import io
import json
import os
import sys
import time
import urllib.request
import uuid

from PIL import Image

BASE = 'https://tencent-hunyuan3d-2.hf.space'
img_path, out_dir = sys.argv[1], sys.argv[2]
ENDPOINT = sys.argv[3] if len(sys.argv) > 3 else 'shape_generation'
os.makedirs(out_dir, exist_ok=True)

im = Image.open(img_path).convert('RGB')
im.thumbnail((1024, 1024))
buf = io.BytesIO()
im.save(buf, 'PNG')

# 1. subir la imagen
bnd = uuid.uuid4().hex
body = (f'--{bnd}\r\nContent-Disposition: form-data; name="files"; filename="input.png"\r\nContent-Type: image/png\r\n\r\n').encode() \
    + buf.getvalue() + f'\r\n--{bnd}--\r\n'.encode()
req = urllib.request.Request(BASE + '/upload', data=body, headers={'Content-Type': f'multipart/form-data; boundary={bnd}'})
path = json.loads(urllib.request.urlopen(req, timeout=120).read())[0]
print('subida', path)

# 2. lanzar la generación (forma + textura)
fd = {'path': path, 'meta': {'_type': 'gradio.FileData'}, 'orig_name': 'input.png'}
data = {'data': ['', fd, None, None, None, None, 30, 5.0, 1234, 256, True, 8000, False]}
req = urllib.request.Request(BASE + '/call/" + ENDPOINT + "', data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
ev = json.loads(urllib.request.urlopen(req, timeout=120).read())['event_id']
print('evento', ev)

# 3. esperar el resultado (flujo SSE)
t0 = time.time()
resp = urllib.request.urlopen(BASE + f'/call/" + ENDPOINT + "/{ev}', timeout=900)
event, result = None, None
for raw in resp:
    line = raw.decode('utf-8', 'replace').strip()
    if line.startswith('event:'):
        event = line[6:].strip()
    elif line.startswith('data:'):
        payload = line[5:].strip()
        if event in ('complete', 'error'):
            result = (event, payload)
            break
        print(f'[{int(time.time() - t0)}s] {event}: {payload[:120]}')
print('fin', result[0], result[1][:1500] if result else None)
if result and result[0] == 'complete':
    items = json.loads(result[1])
    json.dump(items, open(os.path.join(out_dir, 'resultado.json'), 'w'), indent=1)
    n = 0
    for it in items:
        if isinstance(it, dict) and isinstance(it.get('value'), dict):
            it = it['value']
        if isinstance(it, dict) and it.get('path'):
            name = os.path.basename(it['path'])
            dest = os.path.join(out_dir, name)
            urllib.request.urlretrieve(BASE + '/file=' + it['path'], dest)
            print('descargado', dest, os.path.getsize(dest))
            n += 1
