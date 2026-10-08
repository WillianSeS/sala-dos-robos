"""Põe as texturas PBR do Rocketbox no GLB do personagem.

cor (JPEG), normal (JPEG) e metallicRoughness (canal G = rugosidade, derivada do mapa especular);
cabelo/cílios com transparência recortada (MASK) e cores sangradas para as bordas não escurecerem.
Uso: RB=<rocketbox> python3 texturas.py Male_Adult_07 Adults <pasta com .raw.glb> <saida.glb> [tamanho]
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image, ImageOps

name, cat, workdir, dst = sys.argv[1:5]
SIZE = int(sys.argv[5]) if len(sys.argv) > 5 else 2048
texdir = f"{os.environ.get('RB', 'rb')}/Assets/Avatars/{cat}/{name}/Textures"

glb = open(f'{workdir}/{name}.raw.glb', 'rb').read()
_, _, length = struct.unpack('<III', glb[:12])
off, chunks = 12, []
while off < length:
    clen, _ = struct.unpack('<II', glb[off:off + 8])
    chunks.append(glb[off + 8:off + 8 + clen])
    off += 8 + clen
js = json.loads(chunks[0].decode())
binb = bytearray(chunks[1])
texmap = json.load(open(f'{workdir}/{name}.tex.json'))
js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
js.setdefault('images', [])
js.setdefault('textures', [])


def add_image(data, mime):
    while len(binb) % 4:
        binb.append(0)
    js.setdefault('bufferViews', []).append({'buffer': 0, 'byteOffset': len(binb), 'byteLength': len(data)})
    binb.extend(data)
    js['images'].append({'bufferView': len(js['bufferViews']) - 1, 'mimeType': mime})
    js['textures'].append({'sampler': 0, 'source': len(js['images']) - 1})
    return len(js['textures']) - 1


def load(f, mode, size=SIZE):
    im = Image.open(f'{texdir}/{f}.tga').convert(mode)
    if im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    return ImageOps.flip(im)  # glTF: origem da textura no topo


def jpg(im, q):
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=q, optimize=True)
    return b.getvalue()


def png(im):
    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    return b.getvalue()


def bleed_rgba(f):
    im = load(f, 'RGBA', min(SIZE, 1024))
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3] / 255.0
    h, w = al.shape

    def up(x, sw, sh):
        return np.asarray(Image.fromarray(x, 'F').resize((sw, sh), Image.BOX).resize((w, h), Image.BILINEAR))

    num, den = np.zeros_like(rgb), np.zeros_like(al)
    for sc in (2, 4, 8, 16, 32, 64):
        sw, sh = max(1, w // sc), max(1, h // sc)
        den += up(al.astype(np.float32), sw, sh)
        for c in range(3):
            num[..., c] += up((rgb[..., c] * al).astype(np.float32), sw, sh)
    out = np.where(al[..., None] > 0.5, rgb, num / np.maximum(den, 1e-4)[..., None])
    return Image.fromarray(np.concatenate([np.clip(out, 0, 255), a[..., 3:]], -1).astype(np.uint8), 'RGBA')


def roughness_from_specular(f, base):
    """Especular claro = superfície lisa. G = rugosidade, B = metal (0), R = oclusão (1)."""
    spec = np.asarray(load(f, 'L')).astype(np.float32) / 255.0
    rough = np.clip(base - 0.45 * np.clip(spec / 0.12, 0, 1), 0.22, 0.95)
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    return Image.fromarray((orm * 255).astype(np.uint8), 'RGB')


kinds = {}
for m in js.get('materials', []):
    t = texmap.get(m['name'])
    if not t:
        continue
    pbr = m.setdefault('pbrMetallicRoughness', {})
    pbr['metallicFactor'] = 1.0
    if t.get('alphaMap') or 'opacity' in m['name']:
        pbr['baseColorTexture'] = {'index': add_image(png(bleed_rgba(t['map'])), 'image/png')}
        pbr['metallicFactor'] = 0.0
        pbr['roughnessFactor'] = 0.65
        m['alphaMode'] = 'MASK'
        m['alphaCutoff'] = 0.45
        m['doubleSided'] = True
        kinds[m['name']] = 'recorte'
        continue
    head = 'head' in m['name']
    pbr['baseColorTexture'] = {'index': add_image(jpg(load(t['map'], 'RGB'), 88), 'image/jpeg')}
    if t.get('normalMap'):
        m['normalTexture'] = {'index': add_image(jpg(load(t['normalMap'], 'RGB'), 92), 'image/jpeg'), 'scale': 1.0}
    pbr['roughnessFactor'] = 1.0
    if t.get('specularMap'):
        pbr['metallicRoughnessTexture'] = {'index': add_image(jpg(roughness_from_specular(t['specularMap'], 0.62 if head else 0.88), 92), 'image/jpeg')}
    kinds[m['name']] = 'pele' if head else 'corpo'

while len(binb) % 4:
    binb.append(0)
js['buffers'][0]['byteLength'] = len(binb)
jb = json.dumps(js, separators=(',', ':')).encode()
while len(jb) % 4:
    jb += b' '
out = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(binb))
       + struct.pack('<II', len(jb), 0x4E4F534A) + jb + struct.pack('<II', len(binb), 0x004E4942) + bytes(binb))
open(dst, 'wb').write(out)
print(name, SIZE, 'KB', len(out) // 1024, kinds)
