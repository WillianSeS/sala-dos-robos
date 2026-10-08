"""Sala da Fase 1 (recepção do 40º andar) modelada por script no Blender.

Medidas reais em metros. Coordenadas do jogo: X para o leste, Y para cima, Z para o sul (porta).
Uso: <python com bpy> sala_fase1.py <pasta das texturas> <saida.glb>

Convenções lidas pelo jogo:
  COL_*      vazio em forma de cubo: colisor (posição, rotação e meia-medida = escala)
  LUZ_*      vazio: posição de uma luz em tempo real
  SPAWN_*    vazio: ponto de partida do jogador
  PORTA_*    folha da porta, com a origem na dobradiça
  TELA_*     tela emissiva (monitor)
"""
import math
import random
import sys
import zlib

import bpy  # noqa: I001  (bpy precisa vir antes: ele registra bmesh e mathutils)
import bmesh
from mathutils import Euler, Matrix, Vector

TEX, OUT = sys.argv[-2], sys.argv[-1]
random.seed(4)

bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new('sala')
bpy.context.scene.collection.children.link(COL)

# ------------------------------------------------------------------ conversão jogo -> Blender (Z para cima)


def B(x, y, z):
    return Vector((x, -z, y))


def Bs(sx, sy, sz):
    return Vector((sx, sz, sy))


# ------------------------------------------------------------------ materiais PBR
IMGS = {}


def imagem(nome, nao_cor=False):
    if nome not in IMGS:
        img = bpy.data.images.load(f'{TEX}/{nome}')
        if nao_cor:
            img.colorspace_settings.name = 'Non-Color'
        IMGS[nome] = img
    return IMGS[nome]


MATS = {}
TILE = {}


def material(nome, tex=None, cor=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, alpha=1.0, emissao=None, forca=0.0,
             sheen=0.0, normal=1.0, recorte=False, dupla=False, tile=1.0, ext='jpg', sem_orm=False):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if tex:
        tc = nt.nodes.new('ShaderNodeTexImage')
        tc.image = imagem(f'{tex}_cor.{ext}')
        nt.links.new(tc.outputs['Color'], p.inputs['Base Color'])
        if recorte:
            gt = nt.nodes.new('ShaderNodeMath')
            gt.operation = 'GREATER_THAN'
            gt.inputs[1].default_value = 0.5
            nt.links.new(tc.outputs['Alpha'], gt.inputs[0])
            nt.links.new(gt.outputs[0], p.inputs['Alpha'])
        if not sem_orm:
            to = nt.nodes.new('ShaderNodeTexImage')
            to.image = imagem(f'{tex}_orm.jpg', True)
            sep = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(to.outputs['Color'], sep.inputs['Color'])
            nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
            nt.links.new(sep.outputs['Blue'], p.inputs['Metallic'])
        try:
            tn = nt.nodes.new('ShaderNodeTexImage')
            tn.image = imagem(f'{tex}_normal.png', True)
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nm.inputs['Strength'].default_value = normal
            nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
        except RuntimeError:
            nt.nodes.remove(tn)
    else:
        p.inputs['Base Color'].default_value = (*cor, 1)
    if emissao is not None:
        if emissao == 'textura':
            nt.links.new(tc.outputs['Color'], p.inputs['Emission Color'])
        else:
            p.inputs['Emission Color'].default_value = (*emissao, 1)
        p.inputs['Emission Strength'].default_value = forca
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if sheen:
        p.inputs['Sheen Weight'].default_value = sheen
        p.inputs['Sheen Tint'].default_value = (0.25, 0.3, 0.55, 1)
    m.use_backface_culling = not dupla
    MATS[nome] = m
    TILE[nome] = tile
    return m


M = {
    'marmore': material('marmore', 'marmore', tile=2.4, normal=0.6),
    'nogueira': material('nogueira', 'nogueira', tile=1.2, normal=0.8),
    'gesso': material('gesso', 'gesso', tile=2.0, normal=0.5),
    'teto': material('teto', cor=(0.82, 0.80, 0.77), rough=0.9),
    'couro': material('couro', 'couro', tile=0.5, normal=1.0),
    'veludo': material('veludo', 'veludo', tile=0.4, sheen=0.35),
    'latao': material('latao', 'latao', tile=0.5),
    'metal_preto': material('metal_preto', cor=(0.018, 0.018, 0.02), rough=0.32, metal=1.0),
    'pedra_preta': material('pedra_preta', cor=(0.02, 0.02, 0.022), rough=0.2),
    'vidro': material('vidro', cor=(0.55, 0.65, 0.78), rough=0.03, alpha=0.14, dupla=True),
    'tapete': material('tapete', 'tapete', tile=0),
    'quadro': material('quadro', 'quadro', tile=0),
    'livros': material('livros', 'livros', tile=0),
    'folha': material('folha', 'folha', recorte=True, dupla=True, tile=0, ext='png'),
    'tela': material('tela', 'tela', emissao='textura', forca=1.6, tile=0, sem_orm=True, rough=0.25),
    'led_ouro': material('led_ouro', cor=(1.0, 0.72, 0.38), emissao=(1.0, 0.72, 0.38), forca=6.0),
    'led_branco': material('led_branco', cor=(1, 0.95, 0.88), emissao=(1.0, 0.93, 0.82), forca=5.0),
    'globo': material('globo', cor=(1.0, 0.85, 0.6), emissao=(1.0, 0.78, 0.5), forca=4.0, rough=0.1),
    'ceramica': material('ceramica', cor=(0.035, 0.034, 0.038), rough=0.22),
    'terra': material('terra', cor=(0.045, 0.03, 0.02), rough=1.0),
    'tronco': material('tronco', cor=(0.16, 0.11, 0.07), rough=0.85),
    'garrafa_ambar': material('garrafa_ambar', cor=(0.55, 0.28, 0.06), rough=0.05, alpha=0.75),
    'garrafa_verde': material('garrafa_verde', cor=(0.08, 0.3, 0.12), rough=0.05, alpha=0.75),
    'garrafa_clara': material('garrafa_clara', cor=(0.75, 0.8, 0.82), rough=0.05, alpha=0.45),
    'cupula': material('cupula', cor=(0.85, 0.78, 0.66), rough=0.9, emissao=(1.0, 0.8, 0.55), forca=0.6, dupla=True),
    'tecla': material('tecla', cor=(0.05, 0.05, 0.055), rough=0.5),
}

# ------------------------------------------------------------------ geometria


def novo_obj(nome, bm, mat, loc=(0, 0, 0), yaw=0.0, mover=True):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    COL.objects.link(ob)
    if mover:
        ob.location = B(*loc)
        ob.rotation_euler = Euler((0, 0, yaw))
    me.materials.append(mat)
    return ob


def bevel(ob, w, seg=3):
    if w > 0:
        md = ob.modifiers.new('chanfro', 'BEVEL')
        md.width = w
        md.segments = seg
        md.limit_method = 'ANGLE'
        md.harden_normals = False
    return ob


def caixa(nome, centro, tam, mat, chanfro=0.0, yaw=0.0, seg=3, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    s = Bs(*tam)
    for v in bm.verts:
        v.co = Vector((v.co.x * s.x, v.co.y * s.y, v.co.z * s.z))
    ob = novo_obj(nome, bm, mat, centro, yaw)
    if rot:
        ob.rotation_euler = rot
    return bevel(ob, chanfro, seg)


def cilindro(nome, centro, raio, altura, mat, lados=32, raio2=None, yaw=0.0, eixo='y'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=raio, radius2=raio if raio2 is None else raio2, depth=altura)
    if eixo == 'x':
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler((0, math.pi / 2, 0)).to_matrix())
    elif eixo == 'z':
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler((math.pi / 2, 0, 0)).to_matrix())
    return novo_obj(nome, bm, mat, centro, yaw)


def esfera(nome, centro, raio, mat, seg=24):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=raio)
    return novo_obj(nome, bm, mat, centro)


def plano(nome, centro, larg, alt, mat, yaw=0.0):
    """Plano vertical (largura em X, altura em Y do jogo) com a face para +Z do jogo, girado por yaw."""
    bm = bmesh.new()
    a, b = larg / 2, alt / 2
    vs = [bm.verts.new(B(-a, -b, 0)), bm.verts.new(B(a, -b, 0)), bm.verts.new(B(a, b, 0)), bm.verts.new(B(-a, b, 0))]
    bm.faces.new(vs)
    bm.normal_update()
    return novo_obj(nome, bm, mat, centro, yaw)


def vazio(nome, centro, meia=None, yaw=0.0):
    ob = bpy.data.objects.new(nome, None)
    COL.objects.link(ob)
    ob.location = B(*centro)
    ob.rotation_euler = Euler((0, 0, yaw))
    if meia:
        ob.empty_display_type = 'CUBE'
        ob.empty_display_size = 1.0
        ob.scale = Bs(*meia)
    return ob


N_COL = [0]


def colisor(centro, meia, yaw=0.0, nome=None):
    N_COL[0] += 1
    return vazio(f'COL_{nome or "c"}_{N_COL[0]:03d}', centro, meia, yaw)


# ------------------------------------------------------------------ medidas
X0, X1, Z0, Z1, H = -5.0, 5.0, -4.0, 4.0, 3.2       # sala interna 10 x 8 x 3,2 m
E = 0.2                                              # espessura das paredes
PX0, PX1, PH = 2.75, 3.65, 2.15                      # vão da porta na parede sul
CX0, CX1, CZ1, CH = 2.2, 4.2, 6.6, 2.8               # corredor atrás da porta

# ------------------------------------------------------------------ piso, teto e paredes
caixa('piso', ((X0 + X1) / 2, -0.05, (Z0 + Z1) / 2), (X1 - X0, 0.1, Z1 - Z0), M['marmore'])
caixa('piso_corredor', ((CX0 + CX1) / 2, -0.05, (Z1 + CZ1) / 2 + 0.1), (CX1 - CX0, 0.1, CZ1 - Z1 + 0.2), M['marmore'])
colisor((0, -0.25, 1.3), (5.6, 0.25, 5.6), nome='piso')
caixa('teto', (0, H + 0.05, 0), (X1 - X0, 0.1, Z1 - Z0), M['teto'])
caixa('teto_corredor', ((CX0 + CX1) / 2, CH + 0.05, (Z1 + CZ1) / 2), (CX1 - CX0, 0.1, CZ1 - Z1), M['teto'])
colisor((0, H + 0.25, 1.3), (5.6, 0.25, 5.6), nome='teto')

# sanca (rebaixo perimetral) com fita de LED dourada escondida
SANCA = 0.55
for nome, c, t in [
    ('sanca_n', (0, H - 0.1, Z0 + SANCA / 2), (X1 - X0, 0.2, SANCA)),
    ('sanca_s', (0, H - 0.1, Z1 - SANCA / 2), (X1 - X0, 0.2, SANCA)),
    ('sanca_o', (X0 + SANCA / 2, H - 0.1, 0), (SANCA, 0.2, Z1 - Z0 - 2 * SANCA)),
    ('sanca_l', (X1 - SANCA / 2, H - 0.1, 0), (SANCA, 0.2, Z1 - Z0 - 2 * SANCA)),
]:
    caixa(nome, c, t, M['teto'], 0.01)
for nome, c, t in [
    ('led_n', (0, H - 0.005, Z0 + SANCA + 0.02), (X1 - X0 - 2 * SANCA, 0.01, 0.03)),
    ('led_s', (0, H - 0.005, Z1 - SANCA - 0.02), (X1 - X0 - 2 * SANCA, 0.01, 0.03)),
    ('led_o', (X0 + SANCA + 0.02, H - 0.005, 0), (0.03, 0.01, Z1 - Z0 - 2 * SANCA)),
    ('led_l', (X1 - SANCA - 0.02, H - 0.005, 0), (0.03, 0.01, Z1 - Z0 - 2 * SANCA)),
]:
    caixa(nome, c, t, M['led_ouro'])

# parede norte: janela panorâmica do piso ao teto entre dois pilares
JX = 4.4
for lado in (-1, 1):
    caixa(f'pilar_{lado}', (lado * (JX + 0.3), H / 2, Z0 - E / 2), (0.6, H, E), M['gesso'])
caixa('peitoril', (0, 0.06, Z0 - 0.06), (2 * JX, 0.12, 0.32), M['pedra_preta'], 0.005)
caixa('verga', (0, H - 0.12, Z0 - E / 2), (2 * JX, 0.24, E), M['gesso'])
for i, x in enumerate([-JX, -JX / 2, 0, JX / 2, JX]):
    caixa(f'montante_{i}', (x, H / 2, Z0 - E / 2), (0.07, H - 0.2, 0.12), M['metal_preto'], 0.004)
for i in range(4):
    x = -JX + JX / 2 * (i + 0.5)
    plano(f'VIDRO_{i}', (x, 1.54, Z0 - E / 2), JX / 2 - 0.07, 2.84, M['vidro'])
caixa('travessa', (0, 2.35, Z0 - E / 2), (2 * JX, 0.05, 0.1), M['metal_preto'], 0.004)
colisor((0, H / 2, Z0 - E / 2), (X1 + 0.4, H / 2, E / 2), nome='janela')

# parede sul com vão da porta
caixa('parede_s_a', ((X0 - E + PX0) / 2, H / 2, Z1 + E / 2), (PX0 - X0 + E, H, E), M['gesso'])
caixa('parede_s_b', ((PX1 + X1 + E) / 2, H / 2, Z1 + E / 2), (X1 + E - PX1, H, E), M['gesso'])
caixa('parede_s_verga', ((PX0 + PX1) / 2, (PH + H) / 2, Z1 + E / 2), (PX1 - PX0, H - PH, E), M['gesso'])
colisor(((X0 - E + PX0) / 2, H / 2, Z1 + E / 2), ((PX0 - X0 + E) / 2, H / 2, E / 2), nome='parede_s')
colisor(((PX1 + X1 + E) / 2, H / 2, Z1 + E / 2), ((X1 + E - PX1) / 2, H / 2, E / 2), nome='parede_s')
colisor(((PX0 + PX1) / 2, (PH + H) / 2, Z1 + E / 2), ((PX1 - PX0) / 2, (H - PH) / 2, E / 2), nome='verga')

# paredes leste e oeste
caixa('parede_l', (X1 + E / 2, H / 2, 0), (E, H, Z1 - Z0 + 2 * E), M['gesso'])
caixa('parede_o', (X0 - E / 2, H / 2, 0), (E, H, Z1 - Z0 + 2 * E), M['gesso'])
colisor((X1 + E / 2, H / 2, 0), (E / 2, H / 2, (Z1 - Z0) / 2 + E), nome='parede_l')
colisor((X0 - E / 2, H / 2, 0), (E / 2, H / 2, (Z1 - Z0) / 2 + E), nome='parede_o')

# painel de nogueira na parede oeste, com frisos de latão
caixa('painel_nogueira', (X0 + 0.015, 1.5, 0), (0.03, 3.0, Z1 - Z0), M['nogueira'], 0.004)
for z in (-2.4, -1.2, 1.2, 2.4):
    caixa(f'friso_{z}', (X0 + 0.034, 1.5, z), (0.008, 3.0, 0.012), M['latao'])

# rodapés pretos
for nome, c, t in [
    ('rodape_s1', ((X0 + PX0) / 2, 0.05, Z1 - 0.01), (PX0 - X0, 0.1, 0.02)),
    ('rodape_s2', ((PX1 + X1) / 2, 0.05, Z1 - 0.01), (X1 - PX1, 0.1, 0.02)),
    ('rodape_l', (X1 - 0.01, 0.05, 0), (0.02, 0.1, Z1 - Z0)),
]:
    caixa(nome, c, t, M['metal_preto'])

# luminárias embutidas no teto (as luzes reais ficam nos vazios LUZ_teto_*)
for i, (x, z) in enumerate([(-2.7, -1.6), (-2.7, 1.6), (0.6, -2.3), (0.6, 1.2), (3.6, -1.1), (3.6, 1.1), (-0.9, 2.9)]):
    cilindro(f'spot_{i}', (x, H - 0.004, z), 0.07, 0.008, M['led_branco'], 24)
    cilindro(f'spot_aro_{i}', (x, H - 0.002, z), 0.085, 0.004, M['latao'], 24)
    vazio(f'LUZ_teto_{i}', (x, H - 0.05, z))

# ------------------------------------------------------------------ porta com dobradiça (abre para o corredor)
FW, FH, FT = PX1 - PX0 - 0.02, PH - 0.02, 0.045
folha = caixa('PORTA_folha', (FW / 2, FH / 2 + 0.01, 0), (FW, FH, FT), M['nogueira'], 0.006)
folha.location = Vector((0, 0, 0))
folha.data.transform(Matrix.Translation(B(FW / 2, FH / 2 + 0.01, 0)))
folha.location = B(PX0 + 0.01, 0, Z1 + E / 2)
for lado in (-1, 1):   # puxador vertical dos dois lados
    pux = caixa(f'PORTA_puxador_{lado}', (FW - 0.1, 1.05, lado * (FT / 2 + 0.03)), (0.025, 0.7, 0.025), M['latao'], 0.008)
    pux.parent = folha
    pux.location = B(FW - 0.1, 1.05, lado * (FT / 2 + 0.03))
    for k, y in enumerate((0.78, 1.32)):
        hs = caixa(f'PORTA_haste_{lado}_{k}', (FW - 0.1, y, lado * (FT / 2 + 0.015)), (0.012, 0.012, 0.03), M['latao'])
        hs.parent = folha
        hs.location = B(FW - 0.1, y, lado * (FT / 2 + 0.015))
# batente e guarnição
for nome, c, t in [
    ('batente_e', (PX0 - 0.03, PH / 2, Z1 + E / 2), (0.06, PH, E + 0.04)),
    ('batente_d', (PX1 + 0.03, PH / 2, Z1 + E / 2), (0.06, PH, E + 0.04)),
    ('batente_t', ((PX0 + PX1) / 2, PH + 0.03, Z1 + E / 2), (PX1 - PX0 + 0.12, 0.06, E + 0.04)),
]:
    caixa(nome, c, t, M['metal_preto'], 0.004)

# corredor
caixa('corredor_o', (CX0 - E / 2, CH / 2, (Z1 + CZ1) / 2 + E / 2), (E, CH, CZ1 - Z1 + E), M['gesso'])
caixa('corredor_l', (CX1 + E / 2, CH / 2, (Z1 + CZ1) / 2 + E / 2), (E, CH, CZ1 - Z1 + E), M['gesso'])
caixa('corredor_fundo', ((CX0 + CX1) / 2, CH / 2, CZ1 + E / 2), (CX1 - CX0 + 2 * E, CH, E), M['nogueira'])
colisor((CX0 - E / 2, CH / 2, (Z1 + CZ1) / 2 + E / 2), (E / 2, CH / 2, (CZ1 - Z1 + E) / 2), nome='corredor')
colisor((CX1 + E / 2, CH / 2, (Z1 + CZ1) / 2 + E / 2), (E / 2, CH / 2, (CZ1 - Z1 + E) / 2), nome='corredor')
colisor(((CX0 + CX1) / 2, CH / 2, CZ1 + E / 2), ((CX1 - CX0) / 2 + E, CH / 2, E / 2), nome='corredor')
cilindro('spot_corredor', ((CX0 + CX1) / 2, CH - 0.004, (Z1 + CZ1) / 2 + 0.3), 0.07, 0.008, M['led_branco'], 24)
vazio('LUZ_corredor', ((CX0 + CX1) / 2, CH - 0.05, (Z1 + CZ1) / 2 + 0.3))
caixa('quadro2_moldura', ((CX0 + CX1) / 2, 1.55, CZ1 - 0.02), (0.82, 1.06, 0.03), M['latao'], 0.004)
plano('quadro2_tela', ((CX0 + CX1) / 2, 1.55, CZ1 - 0.04), 0.74, 0.98, M['quadro'], math.pi)

# ------------------------------------------------------------------ móveis
# tapete
caixa('tapete', (-2.55, 0.006, 0), (3.0, 0.012, 2.25), M['tapete'], 0.003)

# sofá de couro de três lugares encostado no painel oeste, de frente para o leste
SX, SZ = -4.42, 0.0
for dz in (-1.05, 1.05):
    for dx in (-0.36, 0.36):
        cilindro(f'sofa_pe_{dx}_{dz}', (SX + dx, 0.04, SZ + dz), 0.025, 0.08, M['latao'], 16)
caixa('sofa_base', (SX, 0.2, SZ), (0.92, 0.24, 2.3), M['couro'], 0.03)
caixa('sofa_encosto', (SX - 0.37, 0.58, SZ), (0.18, 0.56, 2.3), M['couro'], 0.05)
for i, dz in enumerate((-0.73, 0, 0.73)):
    caixa(f'sofa_assento_{i}', (SX + 0.07, 0.395, SZ + dz), (0.72, 0.15, 0.71), M['couro'], 0.06, seg=4)
    caixa(f'sofa_almofada_{i}', (SX - 0.2, 0.68, SZ + dz), (0.2, 0.42, 0.7), M['couro'], 0.08, seg=4,
          rot=Euler((0, math.radians(-12), 0)))
for dz in (-1.08, 1.08):
    caixa(f'sofa_braco_{dz}', (SX + 0.02, 0.45, SZ + dz + (0.07 if dz > 0 else -0.07)), (0.92, 0.38, 0.16), M['couro'], 0.07, seg=4)
colisor((SX + 0.02, 0.45, SZ), (0.48, 0.45, 1.24), nome='sofa')

# mesa de centro: tampo de mármore e base de latão
caixa('mesa_tampo', (-2.75, 0.4, 0), (0.7, 0.04, 1.25), M['marmore'], 0.01)
caixa('mesa_base', (-2.75, 0.19, 0), (0.5, 0.38, 1.0), M['latao'], 0.004)
caixa('mesa_vao', (-2.75, 0.19, 0), (0.52, 0.32, 0.94), M['metal_preto'])
colisor((-2.75, 0.21, 0), (0.36, 0.21, 0.64), nome='mesa_centro')
cilindro('vaso_mesa', (-2.75, 0.5, 0.35), 0.06, 0.16, M['ceramica'], 20, 0.04)
esfera('enfeite_mesa', (-2.7, 0.47, -0.3), 0.05, M['latao'])

# duas poltronas de veludo azul-noite viradas para o sofá


def poltrona(nome, x, z, yaw):
    c, s = math.cos(yaw), math.sin(yaw)

    def P(dx, dz):          # ponto local (frente da poltrona = -X local) para o jogo
        return (x + dx * c + dz * s, z - dx * s + dz * c)
    for dx in (-0.3, 0.3):
        for dz in (-0.3, 0.3):
            px, pz = P(dx, dz)
            cilindro(f'{nome}_pe_{dx}_{dz}', (px, 0.06, pz), 0.02, 0.12, M['latao'], 12)
    px, pz = P(0, 0)
    caixa(f'{nome}_base', (px, 0.24, pz), (0.8, 0.2, 0.78), M['veludo'], 0.04, yaw)
    caixa(f'{nome}_assento', (px, 0.4, pz), (0.66, 0.12, 0.64), M['veludo'], 0.05, yaw, seg=4)
    px, pz = P(0.33, 0)
    caixa(f'{nome}_encosto', (px, 0.62, pz), (0.16, 0.6, 0.78), M['veludo'], 0.06, yaw, seg=4)
    for dz in (-0.35, 0.35):
        px, pz = P(0, dz)
        caixa(f'{nome}_braco_{dz}', (px, 0.48, pz), (0.78, 0.28, 0.12), M['veludo'], 0.05, yaw, seg=4)
    px, pz = P(0.02, 0)
    colisor((px, 0.45, pz), (0.42, 0.45, 0.42), yaw, nome=nome)


poltrona('poltrona_a', -1.5, -0.95, math.radians(20))
poltrona('poltrona_b', -1.5, 0.95, math.radians(-20))

# luminária de chão em arco ao lado do sofá
LX, LZ = -4.55, -1.62
cilindro('abajur_base', (LX, 0.025, LZ), 0.17, 0.05, M['marmore'], 32)
cilindro('abajur_haste', (LX, 0.9, LZ), 0.012, 1.75, M['latao'], 12)
cilindro('abajur_braco', (LX + 0.25, 1.77, LZ), 0.01, 0.5, M['latao'], 12, eixo='x')
cilindro('abajur_cupula', (LX + 0.5, 1.62, LZ), 0.2, 0.26, M['cupula'], 32, 0.11)
vazio('LUZ_abajur', (LX + 0.5, 1.5, LZ))
colisor((LX, 0.8, LZ), (0.2, 0.8, 0.2), nome='abajur')

# quadro acima do sofá
caixa('quadro_moldura', (X0 + 0.05, 1.75, 0), (0.03, 1.28, 0.96), M['latao'], 0.004)
plano('quadro_tela', (X0 + 0.068, 1.75, 0), 0.9, 1.2, M['quadro'], math.pi / 2)

# estante de nogueira na parede sul com livros
EX0, EX1, EZ = -4.3, -2.6, Z1 - 0.18
caixa('estante_lado_a', (EX0, 1.1, EZ), (0.04, 2.2, 0.34), M['nogueira'], 0.004)
caixa('estante_lado_b', (EX1, 1.1, EZ), (0.04, 2.2, 0.34), M['nogueira'], 0.004)
caixa('estante_fundo', ((EX0 + EX1) / 2, 1.1, Z1 - 0.01), (EX1 - EX0, 2.2, 0.02), M['nogueira'])
for k, y in enumerate((0.04, 0.55, 1.05, 1.55, 2.18)):
    caixa(f'estante_prat_{k}', ((EX0 + EX1) / 2, y, EZ), (EX1 - EX0, 0.035, 0.34), M['nogueira'], 0.004)
for k, y in enumerate((0.06, 0.57, 1.07, 1.57)):
    x = EX0 + 0.04
    while x < EX1 - 0.3:
        w = random.uniform(0.25, 0.55)
        h = random.uniform(0.24, 0.34)
        lv = caixa(f'livros_{k}_{x:.2f}', (x + w / 2, y + h / 2 + 0.018, EZ + 0.02), (w, h, 0.24), M['livros'])
        lv['uv_livros'] = 1
        x += w + random.uniform(0.08, 0.25)
    cilindro(f'estante_vaso_{k}', (EX1 - 0.15, y + 0.13, EZ), 0.05, 0.22, M['latao'] if k % 2 else M['ceramica'], 20, 0.035)
colisor(((EX0 + EX1) / 2, 1.1, EZ), ((EX1 - EX0) / 2 + 0.03, 1.1, 0.19), nome='estante')

# mesa de trabalho com monitor e cadeira
DX, DZ = 0.9, -2.35
caixa('mesa_trab_tampo', (DX, 0.735, DZ), (1.8, 0.04, 0.8), M['nogueira'], 0.008)
for sx in (-0.82, 0.82):
    caixa(f'mesa_trab_perna_{sx}', (DX + sx, 0.36, DZ), (0.05, 0.72, 0.7), M['latao'], 0.006)
caixa('mesa_trab_painel', (DX, 0.5, DZ - 0.3), (1.6, 0.35, 0.02), M['nogueira'])
colisor((DX, 0.38, DZ), (0.92, 0.38, 0.42), nome='mesa_trab')
caixa('monitor_pe', (DX, 0.76, DZ - 0.2), (0.24, 0.012, 0.18), M['metal_preto'], 0.004)
caixa('monitor_haste', (DX, 0.95, DZ - 0.24), (0.04, 0.38, 0.03), M['metal_preto'], 0.004)
caixa('monitor_moldura', (DX, 1.1, DZ - 0.22), (0.72, 0.43, 0.03), M['metal_preto'], 0.006)
plano('TELA_monitor', (DX, 1.1, DZ - 0.204), 0.69, 0.39, M['tela'])
caixa('teclado', (DX, 0.765, DZ + 0.12), (0.44, 0.018, 0.14), M['tecla'], 0.004)
caixa('mouse', (DX + 0.34, 0.765, DZ + 0.13), (0.06, 0.02, 0.1), M['tecla'], 0.008)

# cadeira de escritório (couro, base estrela)
CX_, CZ_ = DX, DZ + 0.78
for k in range(5):
    a = k * 2 * math.pi / 5
    caixa(f'cadeira_raio_{k}', (CX_ + 0.17 * math.cos(a), 0.06, CZ_ + 0.17 * math.sin(a)), (0.34, 0.035, 0.05), M['metal_preto'], 0.008, -a)
    cilindro(f'cadeira_rodizio_{k}', (CX_ + 0.32 * math.cos(a), 0.03, CZ_ + 0.32 * math.sin(a)), 0.025, 0.03, M['metal_preto'], 12, eixo='z')
cilindro('cadeira_coluna', (CX_, 0.27, CZ_), 0.025, 0.38, M['latao'], 16)
caixa('cadeira_assento', (CX_, 0.49, CZ_), (0.52, 0.09, 0.5), M['couro'], 0.04, seg=4)
caixa('cadeira_encosto', (CX_, 0.86, CZ_ + 0.26), (0.48, 0.6, 0.08), M['couro'], 0.04, seg=4, rot=Euler((math.radians(8), 0, 0)))
colisor((CX_, 0.5, CZ_ + 0.03), (0.3, 0.5, 0.32), nome='cadeira')

# bar: balcão de nogueira com tampo de mármore, frisos de LED e prateleira de garrafas
BX, BZ0, BZ1 = 3.8, -1.6, 1.6
caixa('bar_corpo', (BX, 0.52, 0), (0.55, 1.04, BZ1 - BZ0), M['nogueira'], 0.01)
caixa('bar_tampo', (BX - 0.06, 1.065, 0), (0.72, 0.05, BZ1 - BZ0 + 0.12), M['marmore'], 0.01)
caixa('bar_led', (BX - 0.29, 1.03, 0), (0.012, 0.012, BZ1 - BZ0), M['led_ouro'])
cilindro('bar_apoio_pes', (BX - 0.36, 0.2, 0), 0.018, BZ1 - BZ0 - 0.1, M['latao'], 16, eixo='z')
for z in (-1.2, 0, 1.2):
    caixa(f'bar_suporte_{z}', (BX - 0.32, 0.2, z), (0.08, 0.02, 0.02), M['latao'])
colisor((BX - 0.04, 0.54, 0), (0.36, 0.54, (BZ1 - BZ0) / 2 + 0.06), nome='bar')
for i, z in enumerate((-1.0, 0.0, 1.0)):
    cilindro(f'banqueta_base_{i}', (BX - 0.72, 0.012, z), 0.19, 0.024, M['latao'], 32)
    cilindro(f'banqueta_haste_{i}', (BX - 0.72, 0.37, z), 0.028, 0.7, M['latao'], 16)
    cilindro(f'banqueta_anel_{i}', (BX - 0.72, 0.3, z), 0.16, 0.015, M['latao'], 32, 0.16)
    cilindro(f'banqueta_assento_{i}', (BX - 0.72, 0.76, z), 0.2, 0.08, M['couro'], 32)
    colisor((BX - 0.72, 0.4, z), (0.2, 0.4, 0.2), nome='banqueta')
# prateleira de garrafas na parede leste, iluminada por trás
caixa('adega_fundo', (X1 - 0.03, 1.55, 0), (0.06, 1.3, 2.9), M['nogueira'], 0.004)
caixa('adega_luz', (X1 - 0.065, 1.55, 0), (0.01, 1.1, 2.6), M['led_ouro'])
for k, y in enumerate((1.05, 1.5, 1.95)):
    caixa(f'adega_prat_{k}', (X1 - 0.16, y, 0), (0.26, 0.03, 2.8), M['metal_preto'], 0.004)
    z = -1.3
    while z < 1.3:
        mat = random.choice([M['garrafa_ambar'], M['garrafa_verde'], M['garrafa_clara']])
        hgt = random.uniform(0.2, 0.28)
        cilindro(f'garrafa_{k}_{z:.2f}', (X1 - 0.16, y + 0.015 + hgt / 2, z), 0.04, hgt, mat, 16)
        cilindro(f'gargalo_{k}_{z:.2f}', (X1 - 0.16, y + 0.015 + hgt + 0.05, z), 0.014, 0.1, mat, 10, 0.012)
        z += random.uniform(0.12, 0.2)
colisor((X1 - 0.15, 1.3, 0), (0.15, 1.3, 1.45), nome='adega')
# pendentes sobre o balcão
for i, z in enumerate((-1.0, 0.0, 1.0)):
    cilindro(f'pendente_cabo_{i}', (BX - 0.06, (H + 2.25) / 2 + 0.1, z), 0.004, H - 2.45, M['metal_preto'], 8)
    cilindro(f'pendente_capa_{i}', (BX - 0.06, 2.42, z), 0.05, 0.05, M['latao'], 20, 0.025)
    esfera(f'pendente_globo_{i}', (BX - 0.06, 2.3, z), 0.12, M['globo'])
    vazio(f'LUZ_pendente_{i}', (BX - 0.06, 2.2, z))

# plantas em vasos (folhas recortadas com transparência)


def planta(nome, x, z, alt, n):
    cilindro(f'{nome}_vaso', (x, 0.24, z), 0.24, 0.48, M['ceramica'], 32, 0.19)
    cilindro(f'{nome}_terra', (x, 0.47, z), 0.2, 0.02, M['terra'], 24)
    for k in range(3):
        a = k * 2.1
        cilindro(f'{nome}_tronco_{k}', (x + 0.04 * math.cos(a), 0.47 + alt / 2, z + 0.04 * math.sin(a)), 0.016, alt, M['tronco'], 8)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    for k in range(n):
        h = 0.55 + (alt - 0.1) * (k / n) ** 0.7 + random.uniform(-0.05, 0.05)
        ang = random.uniform(0, 2 * math.pi)
        r = random.uniform(0.05, 0.32) * (1.15 - 0.6 * k / n)
        tam = random.uniform(0.2, 0.32)
        incl = random.uniform(0.35, 1.0)
        base = Vector((x + r * math.cos(ang), -(z + r * math.sin(ang)), h))
        d = Vector((math.cos(ang), math.sin(ang) * -1, 0))
        dirv = (d * math.sin(incl) + Vector((0, 0, math.cos(incl)))).normalized()
        lado = Vector((-d.y, d.x, 0)).normalized()
        ponta = base + dirv * tam * 2
        meio = base + dirv * tam + Vector((0, 0, 0.04))
        vs = [bm.verts.new(base - lado * 0.004), bm.verts.new(base + lado * 0.004),
              bm.verts.new(meio + lado * tam * 0.48), bm.verts.new(meio - lado * tam * 0.48),
              bm.verts.new(ponta + lado * 0.004), bm.verts.new(ponta - lado * 0.004)]
        f1 = bm.faces.new([vs[0], vs[1], vs[2], vs[3]])
        f2 = bm.faces.new([vs[3], vs[2], vs[4], vs[5]])
        for f, uvs in ((f1, [(0.49, 0.0), (0.51, 0.0), (1.0, 0.5), (0.0, 0.5)]), (f2, [(0.0, 0.5), (1.0, 0.5), (0.51, 1.0), (0.49, 1.0)])):
            for loop, c in zip(f.loops, uvs):
                loop[uv].uv = c
    ob = novo_obj(f'{nome}_folhas', bm, M['folha'], mover=False)
    ob['uv_pronto'] = 1
    colisor((x, 0.5, z), (0.27, 0.5, 0.27), nome=nome)


planta('planta_no', X0 + 0.45, Z0 + 0.45, 1.5, 70)
planta('planta_ne', X1 - 0.45, Z0 + 0.45, 1.6, 70)
planta('planta_porta', PX0 - 0.55, Z1 - 0.4, 1.3, 55)

# pontos de referência
vazio('LUZ_janela', (0, 1.6, Z0 + 0.3))
vazio('SPAWN_jogador', (0.2, 0, 0.6), yaw=math.pi)

# ------------------------------------------------------------------ aplica chanfros, UV em escala real e sombreamento


def uv_mundo(ob, tile, semente):
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    mw = ob.matrix_world
    rot = mw.to_3x3()
    du, dv = (semente % 97) / 97.0, (semente % 89) / 89.0
    for f in bm.faces:
        n = (rot @ f.normal).normalized()
        ax = max(range(3), key=lambda i: abs(n[i]))
        for loop in f.loops:
            w = mw @ loop.vert.co
            if ax == 2:
                u, v = w.x, w.y
            elif ax == 0:
                u, v = w.y, w.z
            else:
                u, v = w.x, w.z
            loop[uv].uv = (u / tile + du, v / tile + dv)
    bm.to_mesh(me)
    bm.free()


def uv_caixa_unitaria(ob):
    """Mapa 0..1 na maior face (tapete, quadros, livros, tela)."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][ax]
        cs = [v.co for v in bm.verts]
        amin, amax = min(c[a] for c in cs), max(c[a] for c in cs)
        bmin, bmax = min(c[b] for c in cs), max(c[b] for c in cs)
        for loop in f.loops:
            c = loop.vert.co
            loop[uv].uv = ((c[a] - amin) / (amax - amin + 1e-9), (c[b] - bmin) / (bmax - bmin + 1e-9))
    bm.to_mesh(me)
    bm.free()


bpy.context.view_layer.update()
malhas = [o for o in COL.objects if o.type == 'MESH']
for ob in malhas:
    for md in list(ob.modifiers):
        ctx = {'object': ob}
        with bpy.context.temp_override(**ctx):
            bpy.ops.object.modifier_apply(modifier=md.name)
    mat = ob.data.materials[0]
    if ob.get('uv_pronto'):
        pass
    elif TILE[mat.name] > 0:
        uv_mundo(ob, TILE[mat.name], zlib.crc32(ob.name.encode()))
    else:
        uv_caixa_unitaria(ob)
    # sombreamento suave com arestas vivas acima de 40 graus
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40):
            e.smooth = False
    bm.to_mesh(me)
    bm.free()

# junta as peças estáticas por material (menos chamadas de desenho); porta, tela e vidros ficam separados
bpy.context.view_layer.update()
grupos = {}
for ob in malhas:
    if ob.name.startswith(('PORTA_', 'TELA_', 'VIDRO_')) or ob.parent:
        continue
    grupos.setdefault(ob.data.materials[0].name, []).append(ob)
for nome, obs in grupos.items():
    if len(obs) < 2:
        obs[0].name = f'estatico_{nome}'
        continue
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    obs[0].name = f'estatico_{nome}'

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT',
                          export_image_format='AUTO', export_jpeg_quality=92, export_lights=False,
                          export_extras=True, use_selection=False)
print('OK', OUT, len(COL.objects), 'objetos;', sum(1 for o in COL.objects if o.name.startswith('COL_')), 'colisores')
