"""Fachada do arranha-céu Sala dos Robôs: torre de vidro com janelas acesas, andares 40–44 destacados e numerados,
letreiro SALA DOS ROBÔS com coroa dourada, LAS VEGAS NIGHT em neon, entrada com marquise, praça e rua.
A frente do prédio olha para +Z (rua). Uso: <python com bpy> predio.py <pasta das texturas> <saida.glb>"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C  # noqa: E402
from comum import M, caixa, cilindro, esfera, material, neon, plano, texto, vazio  # noqa: E402
import bmesh  # noqa: E402

TEX, OUT = sys.argv[-2], sys.argv[-1]
FONTES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fontes')
SERIF = os.path.join(FONTES, 'DejaVuSerif-Bold.ttf')
SANS = os.path.join(FONTES, 'Inter-SemiBold.otf')
C.iniciar(TEX, 'predio')
M.update({
    'janelas': material('janelas', 'janelas', emissao='textura', forca=1.2, tile=0, rough=0.08, metal=0.6, sem_orm=True),
    'concreto': material('concreto', 'gesso', tile=4.0, normal=0.8),
    'asfalto': material('asfalto', cor=(0.035, 0.036, 0.04), rough=0.92),
    'faixa': material('faixa', cor=(0.85, 0.82, 0.7), rough=0.6, emissao=(0.4, 0.38, 0.3), forca=0.4),
    'tapete_vermelho': material('tapete_vermelho', 'veludo_vermelho', tile=1.0) if os.path.exists(f'{TEX}/veludo_vermelho_cor.jpg') else material('tapete_vermelho', cor=(0.3, 0.02, 0.03), rough=0.9),
    'ouro_brilho': material('ouro_brilho', cor=(1.0, 0.78, 0.36), rough=0.2, metal=1.0, emissao=(1.0, 0.7, 0.3), forca=1.2),
})

W, D = 36.0, 28.0                      # largura (x) e profundidade (z) da torre
ANDAR = 4.0                            # altura de um andar na fachada
N_ANDARES = 44
BASE = 8.0                             # térreo de pé-direito duplo
TOPO = BASE + (N_ANDARES - 1) * ANDAR  # altura da laje do 44º
CORES = {40: (1.0, 0.82, 0.5), 41: (0.25, 1.0, 0.5), 42: (0.7, 0.3, 1.0), 43: (1.0, 0.6, 0.2), 44: (1.0, 0.25, 0.55)}
NOMES = {40: 'ESCRITÓRIO', 41: 'JOGOS', 42: 'DISCOTECA', 43: 'LOUNGE', 44: 'LAS VEGAS NIGHT'}


def y_andar(n):
    return BASE + (n - 1) * ANDAR


def caixa_uv(nome, x0, x1, y0, y1, z0, z1, mat, escala_u=W / 2, escala_v=16 * ANDAR, v0=0.0):
    """Bloco com UV contínuo em volta (fachada): u = perímetro / escala_u, v = altura / escala_v."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    cantos = [(x0, z1), (x1, z1), (x1, z0), (x0, z0)]          # frente, leste, fundo, oeste
    acum = 0.0
    for i in range(4):
        (ax, az), (bx, bz) = cantos[i], cantos[(i + 1) % 4]
        comp = math.hypot(bx - ax, bz - az)
        vs = [bm.verts.new(C.B(ax, y0, az)), bm.verts.new(C.B(bx, y0, bz)), bm.verts.new(C.B(bx, y1, bz)), bm.verts.new(C.B(ax, y1, az))]
        f = bm.faces.new(vs)
        for loop, (u, v) in zip(f.loops, [(acum, y0), (acum + comp, y0), (acum + comp, y1), (acum, y1)]):
            loop[uv].uv = (u / escala_u, (v - v0) / escala_v)
        acum += comp
    bm.normal_update()
    for f in bm.faces:
        f.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = C.novo_obj(nome, bm, mat, mover=False)
    ob['uv_pronto'] = 1
    return ob


# ------------------------------------------------------------------ torre
x0, x1, z0, z1 = -W / 2, W / 2, -D / 2, D / 2
caixa_uv('torre_baixa', x0, x1, BASE, y_andar(40), z0, z1, M['janelas'])
caixa_uv('torre_alta', x0, x1, y_andar(45), y_andar(45) + 2 * ANDAR, z0, z1, M['janelas'])
# lajes (linhas horizontais escuras entre os andares, a cada 4 andares)
for n in range(1, N_ANDARES + 3, 4):
    caixa(f'laje_{n}', (0, y_andar(n), 0), (W + 0.3, 0.35, D + 0.3), M['metal_preto'])
# cantos com LED dourado de alto a baixo
for i, (cx, cz) in enumerate(((x0, z1), (x1, z1), (x0, z0), (x1, z0))):
    caixa(f'canto_{i}', (cx, (BASE + y_andar(47)) / 2, cz), (0.6, y_andar(47) - BASE, 0.6), M['metal_preto'])
    caixa(f'canto_led_{i}', (cx + (0.32 if cx > 0 else -0.32), (BASE + y_andar(47)) / 2, cz + (0.32 if cz > 0 else -0.32)), (0.06, y_andar(47) - BASE, 0.06), M['led_ouro'])

# andares 40–44: faixa de vidro com a cor do ambiente, número e nome na fachada da frente
for n in range(40, 45):
    yb = y_andar(n)
    cor = CORES[n]
    vid = material(f'vidro_{n}', cor=tuple(c * 0.2 for c in cor), rough=0.05, metal=0.4, emissao=cor, forca=0.9)
    caixa(f'andar_{n}_vidro', (0, yb + ANDAR / 2, 0), (W - 0.2, ANDAR - 0.5, D - 0.2), vid)
    caixa(f'andar_{n}_laje', (0, yb, 0), (W + 0.4, 0.3, D + 0.4), M['metal_preto'])
    texto(f'andar_{n}_numero', str(n), (x0 + 2.6, yb + ANDAR / 2, z1 + 0.25), 2.4, M['ouro_brilho'], profundidade=0.15, fonte=SERIF)
    texto(f'andar_{n}_nome', NOMES[n], (x0 + 4.6, yb + ANDAR / 2 - 0.6, z1 + 0.22), 1.1, neon(f'neon_{n}', cor, 6.0), profundidade=0.06, alinhar='LEFT', fonte=SANS)
caixa('andar_45_laje', (0, y_andar(45), 0), (W + 0.4, 0.3, D + 0.4), M['metal_preto'])

# coroamento: aletas douradas, letreiro e coroa
YC = y_andar(47)
caixa('coroamento', (0, YC + 1.5, 0), (W - 2, 3.0, D - 2), M['metal_preto'])
for i in range(19):
    x = x0 + 1 + i * (W - 2) / 18
    caixa(f'aleta_{i}', (x, YC + 6, z1 - 1.2), (0.25, 9.0, 0.5), M['latao'])
caixa('letreiro_fundo', (0, YC + 9.5, z1 - 0.6), (W - 1, 9.0, 0.6), M['metal_preto'])
texto('letreiro_sala', 'SALA DOS ROBÔS', (0, YC + 10.6, z1 + 0.05), 3.3, M['ouro_brilho'], profundidade=0.35, chanfro=0.05, fonte=SERIF)
texto('letreiro_vegas', 'LAS VEGAS NIGHT', (0, YC + 6.6, z1 + 0.05), 2.2, neon('neon_vegas', (1.0, 0.25, 0.6), 9.0), profundidade=0.12, fonte=SANS)
C.coroa('coroa_topo', (0, YC + 14.8, z1 - 0.2), 7.0, M['ouro_brilho'])
vazio('LUZ_letreiro', (0, YC + 10, z1 + 12))
vazio('MIRA_letreiro', (0, YC + 10, z1))
esfera('farol_topo', (0, YC + 22, 0), 0.6, neon('farol', (1.0, 0.1, 0.1), 12.0), 16)

# ------------------------------------------------------------------ térreo, entrada e praça
caixa('terreo_vidro', (0, BASE / 2, 0), (W - 2, BASE - 0.2, D - 2), C.M['vidro'])
caixa('terreo_fundo', (0, BASE / 2, -1), (W - 3, BASE - 0.5, D - 4), M['nogueira'])
caixa('terreo_teto', (0, BASE - 0.1, 0), (W, 0.4, D), M['metal_preto'])
for i in range(7):
    x = x0 + 1 + i * (W - 2) / 6
    caixa(f'coluna_{i}', (x, BASE / 2, z1 - 0.6), (0.9, BASE, 0.9), M['marmore'], 0.02)
# marquise com luzes douradas por baixo
caixa('marquise', (0, 5.2, z1 + 4.0), (14.0, 0.5, 8.0), M['metal_preto'], 0.05)
caixa('marquise_luz', (0, 4.93, z1 + 4.0), (13.4, 0.04, 7.4), M['led_ouro'])
caixa('marquise_borda', (0, 5.2, z1 + 8.0), (14.0, 0.55, 0.12), M['latao'])
texto('marquise_nome', 'SALA DOS ROBÔS', (0, 5.95, z1 + 8.0), 0.9, M['ouro_brilho'], profundidade=0.08, fonte=SERIF)
C.coroa('coroa_marquise', (0, 6.75, z1 + 8.0), 0.9, M['ouro_brilho'])
for lado in (-1, 1):
    cilindro(f'pilar_marquise_{lado}', (lado * 6.4, 2.5, z1 + 7.6), 0.18, 5.0, M['latao'], 24)
# porta giratória e portas de vidro
cilindro('porta_giratoria', (0, 1.4, z1 - 0.2), 1.4, 2.8, C.M['vidro'], 32)
cilindro('porta_giratoria_topo', (0, 2.85, z1 - 0.2), 1.45, 0.1, M['latao'], 32)
for k in range(4):
    caixa(f'porta_giratoria_aba_{k}', (0, 1.4, z1 - 0.2), (2.7, 2.7, 0.04), C.M['vidro'], yaw=k * math.pi / 4)
for lado in (-1, 1):
    caixa(f'porta_vidro_{lado}', (lado * 3.0, 1.5, z1 - 0.2), (2.4, 3.0, 0.08), C.M['vidro'])
    caixa(f'porta_vidro_moldura_{lado}', (lado * 3.0, 3.05, z1 - 0.2), (2.5, 0.1, 0.12), M['latao'])
# tapete vermelho, pedestais com cordão e vasos
caixa('tapete_entrada', (0, 0.02, z1 + 4.5), (3.0, 0.04, 9.0), M['tapete_vermelho'])
for lado in (-1, 1):
    for k in range(5):
        z = z1 + 1.5 + k * 1.6
        cilindro(f'pedestal_{lado}_{k}', (lado * 1.9, 0.5, z), 0.05, 1.0, M['latao'], 12)
        esfera(f'pedestal_bola_{lado}_{k}', (lado * 1.9, 1.02, z), 0.07, M['latao'], 12)
    C.planta(f'vaso_entrada_{lado}', lado * 5.5, z1 + 2.0, 2.0, 60)
# praça e calçada
caixa('praca', (0, -0.1, z1 + 5.0), (W + 30, 0.2, 10.0), M['marmore'])
caixa('calcada', (0, -0.05, z1 + 12.0), (220, 0.3, 4.0), C.M['concreto'])
caixa('rua', (0, -0.2, z1 + 21.0), (220, 0.2, 14.0), M['asfalto'])
for k in range(-27, 28):
    caixa(f'faixa_{k}', (k * 4.0, -0.09, z1 + 21.0), (2.0, 0.02, 0.15), M['faixa'])
caixa('calcada_oposta', (0, -0.05, z1 + 30.0), (220, 0.3, 4.0), C.M['concreto'])
for k in range(-6, 7):
    x = k * 15.0
    for zz, sinal in ((z1 + 13.6, 1), (z1 + 28.4, -1)):
        cilindro(f'poste_{k}_{sinal}', (x, 3.5, zz), 0.08, 7.0, M['metal_preto'], 12)
        caixa(f'poste_braco_{k}_{sinal}', (x, 6.95, zz + sinal * 0.8), (0.12, 0.1, 1.6), M['metal_preto'])
        esfera(f'poste_luz_{k}_{sinal}', (x, 6.85, zz + sinal * 1.5), 0.22, M['globo'], 12)
# chão ao redor do prédio
caixa('chao', (0, -0.3, 0), (400, 0.2, 400), C.M['asfalto'])

# câmera e pontos usados pela entrada cinematográfica
vazio('PONTO_entrada', (0, 0, z1 + 9.0), yaw=math.pi)
vazio('PONTO_porta', (0, 0, z1 + 1.2), yaw=math.pi)
vazio('PONTO_rua', (0, 0, z1 + 21.0))

C.finalizar(OUT)
