import json, struct, sys, io
from PIL import Image, ImageOps
name, outdir, dst = sys.argv[1], sys.argv[2], sys.argv[3]
import os
texdir = f"{os.environ.get('RB', 'rb')}/Assets/Avatars/{os.environ.get('CAT','Professions')}/{name}/Textures"
glb = open(f'{outdir}/{name}.raw.glb', 'rb').read()
magic, ver, length = struct.unpack('<III', glb[:12]); off = 12; chunks = []
while off < length:
    clen, ctype = struct.unpack('<II', glb[off:off + 8]); chunks.append(glb[off + 8:off + 8 + clen]); off += 8 + clen
js = json.loads(chunks[0].decode()); binb = bytearray(chunks[1])
texmap = json.load(open(f'{outdir}/{name}.tex.json'))
js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
for k in ('images', 'textures'): js.setdefault(k, [])
def add_image(data, mime):
    global binb
    while len(binb) % 4: binb.append(0)
    js.setdefault('bufferViews', []).append({'buffer': 0, 'byteOffset': len(binb), 'byteLength': len(data)})
    binb += data
    js['images'].append({'bufferView': len(js['bufferViews']) - 1, 'mimeType': mime})
    js['textures'].append({'sampler': 0, 'source': len(js['images']) - 1})
    return len(js['textures']) - 1
def load(f, size, mode):
    im = Image.open(f'{texdir}/{f}.tga')
    im = im.convert(mode)
    if im.size[0] > size: im = im.resize((size, size), Image.LANCZOS)
    return ImageOps.flip(im)   # glTF: origem da textura no topo
def jpg(f, size, q):
    b = io.BytesIO(); load(f, size, 'RGB').save(b, 'JPEG', quality=q, optimize=True); return b.getvalue()
def png_rgba(f, size):
    import numpy as np
    im = load(f, size, 'RGBA'); a = np.asarray(im).astype(np.float32); rgb, al = a[..., :3], a[..., 3] / 255.0
    h, w = al.shape
    def up(x, sw, sh):  # reduz e amplia (filtro suave) um canal float
        return np.asarray(Image.fromarray(x, 'F').resize((sw, sh), Image.BOX).resize((w, h), Image.BILINEAR))
    num = np.zeros_like(rgb); den = np.zeros_like(al)
    for sc in (2, 4, 8, 16, 32, 64):
        sw, sh = max(1, w // sc), max(1, h // sc)
        d = up(al.astype(np.float32), sw, sh)
        for c in range(3): num[..., c] += up((rgb[..., c] * al).astype(np.float32), sw, sh)
        den += d
    bleed = num / np.maximum(den, 1e-4)[..., None]
    out = np.where(al[..., None] > 0.5, rgb, bleed)
    res = np.concatenate([np.clip(out, 0, 255), a[..., 3:]], -1).astype(np.uint8)
    b = io.BytesIO(); Image.fromarray(res, 'RGBA').save(b, 'PNG', optimize=True); return b.getvalue()
sizes = {}
for m in js.get('materials', []):
    t = texmap.get(m['name'])
    if not t: continue
    pbr = m.setdefault('pbrMetallicRoughness', {}); pbr['metallicFactor'] = 0.0
    kind = 'head' if 'head' in m['name'] else 'glass' if 'glasses' in m['name'] else 'opacity' if (t.get('alphaMap') or 'opacity' in m['name']) else 'body'
    if kind == 'glass':
        data = png_rgba(t['map'], 512); pbr['baseColorTexture'] = {'index': add_image(data, 'image/png')}
        m['alphaMode'] = 'BLEND'; m['doubleSided'] = True; pbr['roughnessFactor'] = 0.15
    elif kind == 'opacity':
        data = png_rgba(t['map'], 512); pbr['baseColorTexture'] = {'index': add_image(data, 'image/png')}
        m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.45; m['doubleSided'] = True; pbr['roughnessFactor'] = 0.6
    else:
        size = 1024
        data = jpg(t['map'], size, 84); pbr['baseColorTexture'] = {'index': add_image(data, 'image/jpeg')}
        if t.get('normalMap'):
            nd = jpg(t['normalMap'], 1024 if kind == 'body' else 512, 88); m['normalTexture'] = {'index': add_image(nd, 'image/jpeg'), 'scale': 1.0}
        pbr['roughnessFactor'] = 0.55 if kind == 'head' else 0.78
    sizes[m['name']] = kind
while len(binb) % 4: binb.append(0)
js['buffers'][0]['byteLength'] = len(binb)
jb = json.dumps(js, separators=(',', ':')).encode()
while len(jb) % 4: jb += b' '
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(binb)) + struct.pack('<II', len(jb), 0x4E4F534A) + jb + struct.pack('<II', len(binb), 0x004E4942) + bytes(binb)
open(dst, 'wb').write(out)
print(name, 'final KB', len(out) // 1024, sizes)
