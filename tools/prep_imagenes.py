"""Convierte imágenes al formato que espera el juego (.webp cuadrado).

Uso:
    python tools/prep_imagenes.py <tipo> <origen> <id> [<origen> <id> ...]

<tipo>:
    retrato   -> img/retratos/<id>.webp   (512 x 512, recorte cuadrado centrado)
    token     -> tokens/<id>.webp         (256 x 256, recorte cuadrado centrado)
    objeto    -> img/objetos/<id>.webp    (128 x 128, con transparencia)
    arte      -> img/arte/<id>.webp       (768 de ancho, sin recortar)

Ejemplo:
    python tools/prep_imagenes.py token "_entrada/Token Kouji.png" kouji "_entrada/token Lorik.png" lorik

Necesita Pillow (pip install pillow). Los <id> son los del juego: josephine, fotsor,
yeslie, astrid, kouji, grimdarkus, ikaruus, crixus, legna, catarina, lorik, o los
identificadores de objeto de js/config.js (potion, sword, fang...).
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIPOS = {
    'retrato': ('img/retratos', 512, True),
    'token': ('tokens', 256, True),
    'objeto': ('img/objetos', 128, True),
    'arte': ('img/arte', 768, False),
}


def convertir(tipo, origen, ident):
    carpeta, lado, cuadrado = TIPOS[tipo]
    im = Image.open(origen).convert('RGBA')
    if cuadrado:
        w, h = im.size
        s = min(w, h)
        im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((lado, lado), Image.LANCZOS)
    elif im.width > lado:
        im = im.resize((lado, round(im.height * lado / im.width)), Image.LANCZOS)
    destino = os.path.join(ROOT, carpeta, f'{ident}.webp')
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, 'WEBP', quality=88)
    print(f'{origen} -> {os.path.relpath(destino, ROOT)} ({os.path.getsize(destino) // 1024} KB)')


def main():
    args = sys.argv[1:]
    if len(args) < 3 or args[0] not in TIPOS or len(args) % 2 == 0:
        print(__doc__)
        sys.exit(1)
    for origen, ident in zip(args[1::2], args[2::2]):
        convertir(args[0], origen, ident)


if __name__ == '__main__':
    main()
