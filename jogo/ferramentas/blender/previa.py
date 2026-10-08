"""Renderiza uma prévia (Cycles) de um GLB exportado, para conferir a modelagem.
Uso: <python com bpy> previa.py <arquivo.glb> <saida.png> [x y z alvo_x alvo_y alvo_z]  (coordenadas do jogo)"""
import math
import sys

import bpy  # noqa: I001
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
GLB, OUT = args[0], args[1]
cam = [float(v) for v in args[2:8]] if len(args) >= 8 else [3.8, 1.65, 3.3, -2.5, 1.0, -1.5]
bpy.ops.wm.read_factory_settings(use_empty=True)
for arq in GLB.split(','):
    bpy.ops.import_scene.gltf(filepath=arq)
for o in list(bpy.data.objects):
    if o.name.startswith('COL_'):
        bpy.data.objects.remove(o)
B = lambda x, y, z: Vector((x, -z, y))
for o in [o for o in bpy.data.objects if o.name.startswith('LUZ_')]:
    luz = bpy.data.lights.new(o.name, 'POINT')
    luz.energy = 60 if 'teto' in o.name else 25
    luz.color = (1.0, 0.86, 0.7)
    luz.shadow_soft_size = 0.15
    lo = bpy.data.objects.new(o.name + '_l', luz)
    bpy.context.scene.collection.objects.link(lo)
    lo.location = o.matrix_world.translation
w = bpy.data.worlds.new('mundo')
w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.03, 0.08, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
bpy.context.scene.world = w
cd = bpy.data.cameras.new('cam')
cd.lens = 20
co = bpy.data.objects.new('cam', cd)
bpy.context.scene.collection.objects.link(co)
co.location = B(*cam[:3])
d = B(*cam[3:6]) - co.location
co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
sc = bpy.context.scene
sc.camera = co
sc.render.engine = 'CYCLES'
sc.cycles.samples = 24
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 960, 540
sc.view_settings.view_transform = 'AgX'
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('previa', OUT)
