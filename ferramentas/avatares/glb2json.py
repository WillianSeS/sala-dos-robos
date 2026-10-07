import json, struct, sys, base64, os
src, outdir = sys.argv[1], sys.argv[2]
name = os.path.basename(src)[:-4]
glb = open(src, 'rb').read()
_, _, length = struct.unpack('<III', glb[:12]); off = 12; ch = []
while off < length:
    clen, ctype = struct.unpack('<II', glb[off:off + 8]); ch.append(glb[off + 8:off + 8 + clen]); off += 8 + clen
js = json.loads(ch[0]); binb = ch[1] if len(ch) > 1 else b''
bvs = js.get('bufferViews', []); img_bv = set()
for i, im in enumerate(js.get('images', [])):
    if 'bufferView' in im:
        bv = bvs[im['bufferView']]; data = binb[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
        ext = 'png' if im.get('mimeType') == 'image/png' else 'jpg'
        fn = f'{name}_t{i}.{ext}'; open(os.path.join(outdir, fn), 'wb').write(data)
        img_bv.add(im['bufferView']); im.pop('bufferView'); im['uri'] = fn
# reconstrói o buffer só com geometria/animação
newb = bytearray(); remap = {}; nbvs = []
for i, bv in enumerate(bvs):
    if i in img_bv: continue
    while len(newb) % 4: newb.append(0)
    o = bv.get('byteOffset', 0); seg = binb[o:o + bv['byteLength']]
    nb = dict(bv); nb['byteOffset'] = len(newb); newb += seg; remap[i] = len(nbvs); nbvs.append(nb)
js['bufferViews'] = nbvs
for a in js.get('accessors', []):
    if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
js['buffers'] = [{'byteLength': len(newb), 'uri': 'data:application/octet-stream;base64,' + base64.b64encode(bytes(newb)).decode()}]
open(os.path.join(outdir, name + '.json'), 'w').write(json.dumps(js, separators=(',', ':')))
print(name, 'json KB', os.path.getsize(os.path.join(outdir, name + '.json')) // 1024, 'imgs', len(img_bv))
