"""Base comum dos modelos do jogo no Blender (bpy): materiais PBR, primitivas, móveis e exportação.

Coordenadas do jogo: X para o leste, Y para cima, Z para o sul. B() converte para o Blender (Z para cima).
Convenções lidas pelo jogo:
  COL_*     vazio-cubo: colisor (posição, rotação e meia-medida = escala)
  LUZ_*     vazio: luz em tempo real          SPAWN_*  vazio: ponto de partida
  SENTAR_*  vazio: assento (posição da bacia no assento; yaw = para onde a pessoa sentada olha)
  PORTA_*   peça móvel (origem na dobradiça ou na posição fechada)
  TELA_*    tela emissiva atualizada pelo jogo     BOTAO_*  botão clicável
  VIDRO_*   vidro (material transparente)
"""
import math
import random
import zlib

import bpy  # noqa: I001  (bpy precisa vir antes: ele registra bmesh e mathutils)
import bmesh
from mathutils import Euler, Matrix, Vector

TEX = ''
COL = None
IMGS = {}
MATS = {}
TILE = {}
M = {}
N_COL = [0]


def iniciar(tex, nome='modelo', semente=4):
    """Cena vazia + coleção + materiais padrão."""
    global TEX, COL
    TEX = tex
    random.seed(semente)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    IMGS.clear(), MATS.clear(), TILE.clear(), M.clear()
    N_COL[0] = 0
    COL = bpy.data.collections.new(nome)
    bpy.context.scene.collection.children.link(COL)
    materiais_padrao()
    return M


def B(x, y, z):
    return Vector((x, -z, y))


def Bs(sx, sy, sz):
    return Vector((sx, sz, sy))


# ------------------------------------------------------------------ materiais


def imagem(nome, nao_cor=False):
    if nome not in IMGS:
        img = bpy.data.images.load(f'{TEX}/{nome}')
        if nao_cor:
            img.colorspace_settings.name = 'Non-Color'
        IMGS[nome] = img
    return IMGS[nome]


def material(nome, tex=None, cor=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, alpha=1.0, emissao=None, forca=0.0,
             sheen=0.0, normal=1.0, recorte=False, dupla=False, tile=1.0, ext='jpg', sem_orm=False, tinta=None):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    tc = None
    if tex:
        tc = nt.nodes.new('ShaderNodeTexImage')
        tc.image = imagem(f'{tex}_cor.{ext}')
        if tinta:  # multiplica a textura por uma cor (variações de tecido, couro etc.)
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            nt.links.new(tc.outputs['Color'], mix.inputs['A'])
            mix.inputs['B'].default_value = (*tinta, 1)
            nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
        else:
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
        tn = nt.nodes.new('ShaderNodeTexImage')
        try:
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


def neon(nome, cor, forca=8.0):
    return material(nome, cor=cor, emissao=cor, forca=forca, rough=0.3)


def materiais_padrao():
    M.update({
        'marmore': material('marmore', 'marmore', tile=2.4, normal=0.6),
        'nogueira': material('nogueira', 'nogueira', tile=1.2, normal=0.8),
        'gesso': material('gesso', 'gesso', tile=2.0, normal=0.5),
        'teto': material('teto', cor=(0.82, 0.80, 0.77), rough=0.9),
        'couro': material('couro', 'couro', tile=0.5, normal=1.0),
        'veludo': material('veludo', 'veludo', tile=0.4, sheen=0.35),
        'latao': material('latao', 'latao', tile=0.5),
        'metal_preto': material('metal_preto', cor=(0.018, 0.018, 0.02), rough=0.32, metal=1.0),
        'aco': material('aco', cor=(0.62, 0.62, 0.64), rough=0.28, metal=1.0),
        'pedra_preta': material('pedra_preta', cor=(0.02, 0.02, 0.022), rough=0.2),
        'vidro': material('vidro', cor=(0.55, 0.65, 0.78), rough=0.03, alpha=0.14, dupla=True),
        'espelho': material('espelho', cor=(0.85, 0.87, 0.9), rough=0.02, metal=1.0),
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
    })
    return M


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


def texto(nome, conteudo, centro, altura, mat, yaw=0.0, profundidade=0.02, chanfro=0.0, alinhar='CENTER', fonte=None):
    """Texto 3D em pé (lido de frente para +Z do jogo), convertido em malha."""
    cu = bpy.data.curves.new(nome, 'FONT')
    cu.body = conteudo
    cu.size = altura
    cu.extrude = profundidade
    cu.bevel_depth = chanfro
    cu.align_x = alinhar
    cu.align_y = 'CENTER'
    if fonte:
        cu.font = bpy.data.fonts.load(fonte)
    ob = bpy.data.objects.new(nome, cu)
    COL.objects.link(ob)
    ob.location = B(*centro)
    ob.rotation_euler = Euler((math.pi / 2, 0, yaw))
    ob.data.materials.append(mat)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.view_layer.objects.active
    ob['uv_pronto'] = 1
    return ob


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


def colisor(centro, meia, yaw=0.0, nome=None):
    N_COL[0] += 1
    return vazio(f'COL_{nome or "c"}_{N_COL[0]:03d}', centro, meia, yaw)


def assento(nome, x, z, yaw, y=0.0):
    """Ponto de assento: posição da bacia sentada e direção para onde a pessoa olha."""
    return vazio(f'SENTAR_{nome}', (x, y, z), yaw=yaw)


# ------------------------------------------------------------------ móveis reutilizáveis


def sofa(nome, x, z, yaw=0.0, comprimento=2.3, mat=None, lugares=3):
    """Sofá de frente para +X local (yaw gira). Cria colisor e assentos."""
    mat = mat or M['couro']
    c, s = math.cos(yaw), math.sin(yaw)

    def P(dx, dz):
        return (x + dx * c + dz * s, z - dx * s + dz * c)
    meio = comprimento / 2
    for dz in (-meio + 0.15, meio - 0.15):
        for dx in (-0.36, 0.36):
            px, pz = P(dx, dz)
            cilindro(f'{nome}_pe_{dx}_{dz}', (px, 0.04, pz), 0.025, 0.08, M['latao'], 16)
    px, pz = P(0, 0)
    caixa(f'{nome}_base', (px, 0.2, pz), (0.92, 0.24, comprimento), mat, 0.03, yaw)
    px, pz = P(-0.37, 0)
    caixa(f'{nome}_encosto', (px, 0.58, pz), (0.18, 0.56, comprimento), mat, 0.05, yaw)
    larg = (comprimento - 0.3) / lugares
    for i in range(lugares):
        dz = -meio + 0.15 + larg * (i + 0.5)
        px, pz = P(0.07, dz)
        caixa(f'{nome}_assento_{i}', (px, 0.395, pz), (0.72, 0.15, larg - 0.02), mat, 0.06, yaw, seg=4)
        px, pz = P(-0.2, dz)
        caixa(f'{nome}_almofada_{i}', (px, 0.68, pz), (0.2, 0.42, larg - 0.03), mat, 0.08, seg=4,
              rot=Euler((0, math.radians(-12), yaw)))
        px, pz = P(0.12, dz)
        assento(f'{nome}_{i}', px, pz, yaw + math.pi / 2)
    for lado in (-1, 1):
        px, pz = P(0.02, lado * (meio - 0.08))
        caixa(f'{nome}_braco_{lado}', (px, 0.45, pz), (0.92, 0.38, 0.16), mat, 0.07, yaw, seg=4)
    px, pz = P(0.02, 0)
    colisor((px, 0.45, pz), (0.48, 0.45, meio + 0.02), yaw, nome=nome)


def poltrona(nome, x, z, yaw, mat=None):
    """Poltrona de frente para -X local."""
    mat = mat or M['veludo']
    c, s = math.cos(yaw), math.sin(yaw)

    def P(dx, dz):
        return (x + dx * c + dz * s, z - dx * s + dz * c)
    for dx in (-0.3, 0.3):
        for dz in (-0.3, 0.3):
            px, pz = P(dx, dz)
            cilindro(f'{nome}_pe_{dx}_{dz}', (px, 0.06, pz), 0.02, 0.12, M['latao'], 12)
    px, pz = P(0, 0)
    caixa(f'{nome}_base', (px, 0.24, pz), (0.8, 0.2, 0.78), mat, 0.04, yaw)
    caixa(f'{nome}_assento', (px, 0.4, pz), (0.66, 0.12, 0.64), mat, 0.05, yaw, seg=4)
    px, pz = P(0.33, 0)
    caixa(f'{nome}_encosto', (px, 0.62, pz), (0.16, 0.6, 0.78), mat, 0.06, yaw, seg=4)
    for dz in (-0.35, 0.35):
        px, pz = P(0, dz)
        caixa(f'{nome}_braco_{dz}', (px, 0.48, pz), (0.78, 0.28, 0.12), mat, 0.05, yaw, seg=4)
    px, pz = P(0.02, 0)
    colisor((px, 0.45, pz), (0.42, 0.45, 0.42), yaw, nome=nome)
    px, pz = P(0.07, 0)
    assento(nome, px, pz, yaw - math.pi / 2)


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


def banqueta(nome, x, z, yaw=0.0):
    cilindro(f'{nome}_base', (x, 0.012, z), 0.19, 0.024, M['latao'], 32)
    cilindro(f'{nome}_haste', (x, 0.37, z), 0.028, 0.7, M['latao'], 16)
    cilindro(f'{nome}_anel', (x, 0.3, z), 0.16, 0.015, M['latao'], 32, 0.16)
    cilindro(f'{nome}_assento', (x, 0.76, z), 0.2, 0.08, M['couro'], 32)
    colisor((x, 0.4, z), (0.2, 0.4, 0.2), nome=nome)


def pendente(nome, x, z, teto, y=2.3):
    cilindro(f'{nome}_cabo', (x, (teto + y + 0.12) / 2, z), 0.004, teto - y - 0.12, M['metal_preto'], 8)
    cilindro(f'{nome}_capa', (x, y + 0.12, z), 0.05, 0.05, M['latao'], 20, 0.025)
    esfera(f'{nome}_globo', (x, y, z), 0.12, M['globo'])
    vazio(f'LUZ_pendente_{nome}', (x, y - 0.1, z))


def spot_teto(nome, x, z, teto):
    cilindro(f'spot_{nome}', (x, teto - 0.004, z), 0.07, 0.008, M['led_branco'], 24)
    cilindro(f'spot_aro_{nome}', (x, teto - 0.002, z), 0.085, 0.004, M['latao'], 24)
    vazio(f'LUZ_teto_{nome}', (x, teto - 0.05, z))


def quadro_parede(nome, centro, larg, alt, yaw, profundidade=0.03):
    """Moldura dourada + tela, de frente para +Z local girado por yaw."""
    c, s = math.cos(yaw), math.sin(yaw)
    cx, cy, cz = centro
    caixa(f'{nome}_moldura', (cx, cy, cz), (larg + 0.08, alt + 0.08, profundidade), M['latao'], 0.004, yaw)
    plano(f'{nome}_tela', (cx + s * (profundidade / 2 + 0.003), cy, cz + c * (profundidade / 2 + 0.003)), larg, alt, M['quadro'], yaw)


# ------------------------------------------------------------------ paredes e salas


def parede_x(nome, x0, x1, z, h, mat, e=0.2, vaos=(), colisao=True, y0=0.0):
    """Parede ao longo de X (face norte/sul) com vãos [(xa, xb, altura_do_vao)]."""
    pontos = sorted(vaos)
    cursor = x0
    for i, (xa, xb, hv) in enumerate(pontos):
        if xa > cursor:
            caixa(f'{nome}_{i}a', ((cursor + xa) / 2, y0 + h / 2, z), (xa - cursor, h, e), mat)
            if colisao:
                colisor(((cursor + xa) / 2, y0 + h / 2, z), ((xa - cursor) / 2, h / 2, e / 2), nome=nome)
        if hv < h:
            caixa(f'{nome}_{i}v', ((xa + xb) / 2, y0 + (hv + h) / 2, z), (xb - xa, h - hv, e), mat)
            if colisao:
                colisor(((xa + xb) / 2, y0 + (hv + h) / 2, z), ((xb - xa) / 2, (h - hv) / 2, e / 2), nome=nome)
        cursor = xb
    if x1 > cursor:
        caixa(f'{nome}_fim', ((cursor + x1) / 2, y0 + h / 2, z), (x1 - cursor, h, e), mat)
        if colisao:
            colisor(((cursor + x1) / 2, y0 + h / 2, z), ((x1 - cursor) / 2, h / 2, e / 2), nome=nome)


def parede_z(nome, z0, z1, x, h, mat, e=0.2, vaos=(), colisao=True, y0=0.0):
    """Parede ao longo de Z (face leste/oeste) com vãos [(za, zb, altura_do_vao)]."""
    pontos = sorted(vaos)
    cursor = z0
    for i, (za, zb, hv) in enumerate(pontos):
        if za > cursor:
            caixa(f'{nome}_{i}a', (x, y0 + h / 2, (cursor + za) / 2), (e, h, za - cursor), mat)
            if colisao:
                colisor((x, y0 + h / 2, (cursor + za) / 2), (e / 2, h / 2, (za - cursor) / 2), nome=nome)
        if hv < h:
            caixa(f'{nome}_{i}v', (x, y0 + (hv + h) / 2, (za + zb) / 2), (e, h - hv, zb - za), mat)
            if colisao:
                colisor((x, y0 + (hv + h) / 2, (za + zb) / 2), (e / 2, (h - hv) / 2, (zb - za) / 2), nome=nome)
        cursor = zb
    if z1 > cursor:
        caixa(f'{nome}_fim', (x, y0 + h / 2, (cursor + z1) / 2), (e, h, z1 - cursor), mat)
        if colisao:
            colisor((x, y0 + h / 2, (cursor + z1) / 2), (e / 2, h / 2, (z1 - cursor) / 2), nome=nome)


def piso_teto(nome, x0, x1, z0, z1, h, mat_piso=None, mat_teto=None, colisao=True):
    mat_piso = mat_piso or M['marmore']
    mat_teto = mat_teto or M['teto']
    cx, cz, lx, lz = (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0
    caixa(f'{nome}_piso', (cx, -0.05, cz), (lx, 0.1, lz), mat_piso)
    caixa(f'{nome}_teto', (cx, h + 0.05, cz), (lx, 0.1, lz), mat_teto)
    if colisao:
        colisor((cx, -0.25, cz), (lx / 2 + 0.3, 0.25, lz / 2 + 0.3), nome=f'{nome}_piso')
        colisor((cx, h + 0.25, cz), (lx / 2 + 0.3, 0.25, lz / 2 + 0.3), nome=f'{nome}_teto')


def janela_panoramica(nome, x0, x1, z, h, pilar=0.6):
    """Parede de vidro do piso ao teto com montantes pretos (face para +Z do jogo)."""
    larg = x1 - x0
    n = max(2, round(larg / 2.2))
    passo = larg / n
    caixa(f'{nome}_peitoril', ((x0 + x1) / 2, 0.06, z + 0.04), (larg, 0.12, 0.32), M['pedra_preta'], 0.005)
    caixa(f'{nome}_verga', ((x0 + x1) / 2, h - 0.12, z), (larg, 0.24, 0.2), M['gesso'])
    for i in range(n + 1):
        caixa(f'{nome}_montante_{i}', (x0 + i * passo, h / 2, z), (0.07, h - 0.2, 0.12), M['metal_preto'], 0.004)
    for i in range(n):
        plano(f'VIDRO_{nome}_{i}', (x0 + passo * (i + 0.5), (h - 0.36) / 2 + 0.12, z), passo - 0.07, h - 0.36, M['vidro'])
    caixa(f'{nome}_travessa', ((x0 + x1) / 2, h * 0.73, z), (larg, 0.05, 0.1), M['metal_preto'], 0.004)
    colisor(((x0 + x1) / 2, h / 2, z), (larg / 2 + pilar, h / 2, 0.1), nome=nome)


# ------------------------------------------------------------------ acabamento e exportação


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
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    cs = [v.co for v in bm.verts]
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][ax]
        amin, amax = min(c[a] for c in cs), max(c[a] for c in cs)
        bmin, bmax = min(c[b] for c in cs), max(c[b] for c in cs)
        for loop in f.loops:
            c = loop.vert.co
            loop[uv].uv = ((c[a] - amin) / (amax - amin + 1e-9), (c[b] - bmin) / (bmax - bmin + 1e-9))
    bm.to_mesh(me)
    bm.free()


SEPARADOS = ('PORTA_', 'TELA_', 'VIDRO_', 'BOTAO_', 'MOVEL_')


def finalizar(saida, juntar=True):
    """Aplica chanfros, cria UV em escala real, suaviza, junta por material e exporta o GLB."""
    bpy.context.view_layer.update()
    malhas = [o for o in COL.objects if o.type == 'MESH']
    for ob in malhas:
        for md in list(ob.modifiers):
            with bpy.context.temp_override(object=ob):
                bpy.ops.object.modifier_apply(modifier=md.name)
        mat = ob.data.materials[0]
        if ob.get('uv_pronto'):
            if not ob.data.uv_layers:
                uv_mundo(ob, 1.0, 1)
        elif TILE.get(mat.name, 1.0) > 0:
            uv_mundo(ob, TILE.get(mat.name, 1.0), zlib.crc32(ob.name.encode()))
        else:
            uv_caixa_unitaria(ob)
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
    bpy.context.view_layer.update()
    if juntar:
        grupos = {}
        for ob in malhas:
            if ob.name.startswith(SEPARADOS) or ob.parent:
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
    bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', export_apply=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT',
                              export_image_format='AUTO', export_jpeg_quality=92, export_lights=False,
                              export_extras=True, use_selection=False)
    n_col = sum(1 for o in COL.objects if o.name.startswith('COL_'))
    print('OK', saida, len(COL.objects), 'objetos;', n_col, 'colisores')


def mover_origem(ob, ponto_jogo):
    """Coloca a origem do objeto num ponto (coordenadas do jogo) sem mexer na geometria."""
    alvo = B(*ponto_jogo)
    desloc = alvo - ob.location
    ob.data.transform(Matrix.Translation(-desloc))
    ob.location = alvo
    return ob


# ------------------------------------------------------------------ hall dos elevadores (igual em todos os andares)
HALL = dict(x0=0.0, x1=6.4, z0=6.6, z1=9.8, h=3.0)
PORTA_ELEV = dict(xa=2.65, xb=3.75, h=2.3)


def hall_elevador(numero, nome_andar, fonte=None, cor_neon=(1.0, 0.72, 0.38)):
    """Hall com o portal do elevador, botão de chamada, indicador e placa do andar."""
    H = HALL
    x0, x1, z0, z1, h = H['x0'], H['x1'], H['z0'], H['z1'], H['h']
    piso_teto('hall', x0, x1, z0, z1, h)
    parede_x('hall_norte', x0 - 0.2, x1 + 0.2, z0 - 0.1, h, M['gesso'], vaos=[(2.2, 4.2, 2.6)])
    parede_x('hall_sul', x0 - 0.2, x1 + 0.2, z1 + 0.1, h, M['nogueira'], vaos=[(PORTA_ELEV['xa'], PORTA_ELEV['xb'], PORTA_ELEV['h'])])
    parede_z('hall_oeste', z0 - 0.2, z1 + 0.2, x0 - 0.1, h, M['nogueira'])
    parede_z('hall_leste', z0 - 0.2, z1 + 0.2, x1 + 0.1, h, M['gesso'])
    # portal de latão do elevador
    xa, xb, hp = PORTA_ELEV['xa'], PORTA_ELEV['xb'], PORTA_ELEV['h']
    for i, x in enumerate((xa - 0.06, xb + 0.06)):
        caixa(f'portal_lado_{i}', (x, hp / 2, z1 - 0.01), (0.12, hp, 0.06), M['latao'], 0.006)
    caixa('portal_topo', ((xa + xb) / 2, hp + 0.06, z1 - 0.01), (xb - xa + 0.24, 0.12, 0.06), M['latao'], 0.006)
    caixa('indicador_moldura', ((xa + xb) / 2, hp + 0.32, z1 - 0.02), (0.62, 0.24, 0.04), M['metal_preto'], 0.006)
    plano('TELA_indicador_hall', ((xa + xb) / 2, hp + 0.32, z1 - 0.042), 0.54, 0.17, M['tela'], math.pi)
    # botão de chamada à direita da porta (de quem olha para o elevador)
    caixa('chamada_placa', (xb + 0.42, 1.15, z1 - 0.01), (0.12, 0.26, 0.03), M['latao'], 0.004)
    cilindro('BOTAO_chamar', (xb + 0.42, 1.15, z1 - 0.035), 0.028, 0.02, M['led_ouro'], 24, eixo='z')
    # placa do andar (número grande e nome) na parede oeste, virada para o hall
    texto('placa_numero', str(numero), (x0 + 0.02, 1.85, (z0 + z1) / 2), 0.62, M['latao'], yaw=math.pi / 2, profundidade=0.03, chanfro=0.004, fonte=fonte)
    texto('placa_nome', nome_andar.upper(), (x0 + 0.02, 1.32, (z0 + z1) / 2), 0.13, neon('neon_placa', cor_neon, 5.0), yaw=math.pi / 2, profundidade=0.01, fonte=fonte)
    # banco de couro e planta
    caixa('hall_banco', (x1 - 0.32, 0.23, (z0 + z1) / 2), (0.46, 0.12, 1.5), M['couro'], 0.04, seg=4)
    for dz in (-0.6, 0.6):
        caixa(f'hall_banco_pe_{dz}', (x1 - 0.32, 0.09, (z0 + z1) / 2 + dz), (0.4, 0.18, 0.06), M['latao'], 0.005)
    colisor((x1 - 0.32, 0.25, (z0 + z1) / 2), (0.25, 0.25, 0.78), nome='hall_banco')
    for i, dz in enumerate((-0.38, 0.38)):
        assento(f'hall_banco_{i}', x1 - 0.36, (z0 + z1) / 2 + dz, -math.pi / 2)
    planta('hall_planta', x0 + 0.45, z1 - 0.45, 1.3, 50)
    for i, (x, z) in enumerate(((1.6, 7.6), (4.8, 7.6), (3.2, 8.9))):
        spot_teto(f'hall_{i}', x, z, h)
    vazio('PONTO_hall', ((xa + xb) / 2, 0, z1 - 1.3), yaw=0.0)


def coroa(nome, centro, tamanho, mat_ouro=None, mat_joia=None, yaw=0.0):
    """Coroa dourada (logotipo): aro, cinco pontas com esferas e joias vermelhas, de frente para +Z."""
    mat_ouro = mat_ouro or M['latao']
    mat_joia = mat_joia or material(f'{nome}_joia', cor=(0.6, 0.02, 0.05), rough=0.1, emissao=(0.8, 0.05, 0.08), forca=1.5)
    cx, cy, cz = centro
    s = tamanho
    c, sn = math.cos(yaw), math.sin(yaw)

    def P(dx, dy, dz=0.0):
        return (cx + dx * c + dz * sn, cy + dy, cz - dx * sn + dz * c)
    caixa(f'{nome}_aro', P(0, 0), (1.0 * s, 0.22 * s, 0.12 * s), mat_ouro, 0.02 * s, yaw)
    for k in range(5):
        dx = (-0.4 + k * 0.2) * s
        alt = (0.62 if k == 2 else 0.5 if k in (1, 3) else 0.42) * s
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.09 * s, radius2=0.0, depth=alt)
        ob = novo_obj(f'{nome}_ponta_{k}', bm, mat_ouro, P(dx, 0.11 * s + alt / 2), yaw)
        ob.scale = (1.0, 0.6, 1.0)
        esfera(f'{nome}_bola_{k}', P(dx, 0.11 * s + alt + 0.03 * s), 0.045 * s, mat_ouro, 12)
        if k % 2 == 0:
            esfera(f'{nome}_joia_{k}', P(dx, 0.0, 0.065 * s), 0.035 * s, mat_joia, 12)
