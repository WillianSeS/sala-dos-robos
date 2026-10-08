"""Andares 41 a 44: salão temático (14 x 12 m, pé-direito 3,6 m), corredor e hall do elevador.
Os conteúdos completos de cada ambiente (sinuca, DJ, narguilés, show) entram na Fase 4.
Uso: <python com bpy> andares.py <numero> <pasta das texturas> <saida.glb>"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C  # noqa: E402
from comum import M, caixa, cilindro, colisor, esfera, material, neon, texto, vazio  # noqa: E402

NUM, TEX, OUT = int(sys.argv[-3]), sys.argv[-2], sys.argv[-1]
FONTES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fontes')
SERIF = os.path.join(FONTES, 'DejaVuSerif-Bold.ttf')
SANS = os.path.join(FONTES, 'Inter-SemiBold.otf')
C.iniciar(TEX, f'andar{NUM}', semente=NUM)
M.update({
    'veludo_verde': material('veludo_verde', 'veludo_verde', tile=0.4, sheen=0.3),
    'veludo_vermelho': material('veludo_vermelho', 'veludo_vermelho', tile=0.4, sheen=0.3),
    'couro_preto': material('couro_preto', 'couro_preto', tile=0.5),
    'carpete': material('carpete', 'carpete', tile=2.0),
    'pista': material('pista', 'pista', emissao='textura', forca=1.0, tile=0, rough=0.15),
})

X0, X1, Z0, Z1, H = -7.0, 7.0, -8.0, 4.0, 3.6
E = 0.2
DX0, DX1, DH = 2.4, 4.0, 2.6            # vão aberto para o corredor
CX0, CX1, CZ1, CH = 2.2, 4.2, 6.6, 2.8

TEMAS = {
    41: dict(nome='Sala de Jogos', piso='nogueira', parede='gesso', neon=(0.2, 1.0, 0.45)),
    42: dict(nome='Discoteca', piso='pedra_preta', parede='metal_preto', neon=(0.75, 0.25, 1.0)),
    43: dict(nome='Smoking Lounge', piso='marmore', parede='nogueira', neon=(1.0, 0.62, 0.25)),
    44: dict(nome='Las Vegas Night', piso='carpete', parede='veludo_vermelho', neon=(1.0, 0.25, 0.6)),
}
T = TEMAS[NUM]
N_NEON = neon('neon_tema', T['neon'], 7.0)


def casca():
    caixa('piso', ((X0 + X1) / 2, -0.05, (Z0 + Z1) / 2), (X1 - X0, 0.1, Z1 - Z0), M[T['piso']])
    caixa('piso_corredor', ((CX0 + CX1) / 2, -0.05, (Z1 + CZ1) / 2 + 0.05), (CX1 - CX0, 0.1, CZ1 - Z1 + 0.1), M['marmore'])
    colisor((0, -0.25, 0), (8.0, 0.25, 11.0), nome='piso')
    caixa('teto', ((X0 + X1) / 2, H + 0.05, (Z0 + Z1) / 2), (X1 - X0, 0.1, Z1 - Z0), M['teto'] if NUM != 42 else M['metal_preto'])
    caixa('teto_corredor', ((CX0 + CX1) / 2, CH + 0.05, (Z1 + CZ1) / 2), (CX1 - CX0, 0.1, CZ1 - Z1), M['teto'])
    colisor((0, H + 0.25, (Z0 + Z1) / 2), (7.6, 0.25, 6.6), nome='teto')
    colisor(((CX0 + CX1) / 2, CH + 0.25, (Z1 + CZ1) / 2), ((CX1 - CX0) / 2 + 0.2, 0.25, (CZ1 - Z1) / 2), nome='corredor_teto')
    JX = 6.4
    for lado in (-1, 1):
        caixa(f'pilar_{lado}', (lado * (JX + 0.3), H / 2, Z0 - E / 2), (0.6, H, E), M['gesso'])
    C.janela_panoramica('janela', -JX, JX, Z0 - E / 2, H)
    parede = M[T['parede']]
    C.parede_x('parede_s', X0 - E, X1 + E, Z1 + E / 2, H, parede, vaos=[(DX0, DX1, DH)])
    C.parede_z('parede_l', Z0 - E, Z1 + E, X1 + E / 2, H, parede)
    C.parede_z('parede_o', Z0 - E, Z1 + E, X0 - E / 2, H, parede)
    for nome, c, t in [('portal_e', (DX0 - 0.05, DH / 2, Z1 + 0.02), (0.1, DH, 0.26)), ('portal_d', (DX1 + 0.05, DH / 2, Z1 + 0.02), (0.1, DH, 0.26)),
                       ('portal_t', ((DX0 + DX1) / 2, DH + 0.05, Z1 + 0.02), (DX1 - DX0 + 0.2, 0.1, 0.26))]:
        caixa(nome, c, t, M['latao'], 0.005)
    C.parede_z('corredor_o', Z1, CZ1 - 0.1, CX0 - E / 2, CH, M['gesso'])
    C.parede_z('corredor_l', Z1, CZ1 - 0.1, CX1 + E / 2, CH, M['gesso'])
    C.spot_teto('corredor', (CX0 + CX1) / 2, (Z1 + CZ1) / 2, CH)
    # nome do ambiente em neon na parede sul, virado para dentro do salão
    texto('letreiro', T['nome'].upper(), (-2.6, 2.75, Z1 - 0.02), 0.34, N_NEON, yaw=math.pi, profundidade=0.03, fonte=SANS)
    vazio('LUZ_letreiro', (-2.6, 2.6, Z1 - 0.8))
    vazio('LUZ_janela', (0, 1.8, Z0 + 0.4))
    vazio('SPAWN_jogador', ((CX0 + CX1) / 2, 0, Z1 - 1.0), yaw=math.pi)
    for i, (x, z) in enumerate([(-4.5, -5), (0, -5), (4.5, -5), (-4.5, 0), (0, 0), (4.5, 0), (-4.5, 2.6), (4.5, 2.6)]):
        C.spot_teto(i, x, z, H)


def bar(x, z0, z1, mat_corpo=None):
    mat_corpo = mat_corpo or M['nogueira']
    caixa('bar_corpo', (x, 0.52, (z0 + z1) / 2), (0.55, 1.04, z1 - z0), mat_corpo, 0.01)
    caixa('bar_tampo', (x - 0.06, 1.065, (z0 + z1) / 2), (0.72, 0.05, z1 - z0 + 0.12), M['marmore'], 0.01)
    caixa('bar_led', (x - 0.29, 1.03, (z0 + z1) / 2), (0.012, 0.012, z1 - z0), N_NEON)
    colisor((x - 0.04, 0.54, (z0 + z1) / 2), (0.36, 0.54, (z1 - z0) / 2 + 0.06), nome='bar')
    n = int((z1 - z0) / 0.9)
    for i in range(n):
        C.banqueta(f'banqueta_{i}', x - 0.72, z0 + 0.45 + i * 0.9)
    caixa('adega_fundo', (X1 - 0.03, 1.55, (z0 + z1) / 2), (0.06, 1.3, z1 - z0), M['nogueira'], 0.004)
    caixa('adega_luz', (X1 - 0.065, 1.55, (z0 + z1) / 2), (0.01, 1.1, z1 - z0 - 0.3), M['led_ouro'])
    colisor((X1 - 0.1, 1.3, (z0 + z1) / 2), (0.1, 1.3, (z1 - z0) / 2), nome='adega')


def mesa_redonda(nome, x, z, cadeiras=3, raio=0.45):
    cilindro(f'{nome}_tampo', (x, 0.74, z), raio, 0.04, M['marmore'], 40)
    cilindro(f'{nome}_pe', (x, 0.37, z), 0.05, 0.72, M['latao'], 16)
    cilindro(f'{nome}_base', (x, 0.015, z), 0.25, 0.03, M['latao'], 32)
    colisor((x, 0.38, z), (raio * 0.75, 0.38, raio * 0.75), nome=nome)
    for k in range(cadeiras):
        a = math.pi / 2 + k * 2 * math.pi / cadeiras
        cx, cz = x + math.cos(a) * (raio + 0.38), z + math.sin(a) * (raio + 0.38)
        yaw = math.atan2(x - cx, z - cz)       # olhando para a mesa
        cadeira(f'{nome}_cad_{k}', cx, cz, yaw)


def cadeira(nome, x, z, yaw):
    """Cadeira estofada; yaw = para onde a pessoa sentada olha."""
    fx, fz = math.sin(yaw), math.cos(yaw)
    caixa(f'{nome}_assento', (x, 0.46, z), (0.46, 0.08, 0.46), M['veludo_vermelho'] if NUM == 44 else M['couro'], 0.03, yaw, seg=3)
    caixa(f'{nome}_encosto', (x - fx * 0.21, 0.78, z - fz * 0.21), (0.44, 0.56, 0.06), M['veludo_vermelho'] if NUM == 44 else M['couro'], 0.03, yaw)
    for dx, dz in ((-0.18, -0.18), (0.18, -0.18), (-0.18, 0.18), (0.18, 0.18)):
        c, s = math.cos(yaw), math.sin(yaw)
        cilindro(f'{nome}_pe_{dx}_{dz}', (x + dx * c + dz * s, 0.21, z - dx * s + dz * c), 0.015, 0.42, M['latao'], 8)
    colisor((x, 0.45, z), (0.24, 0.45, 0.24), yaw, nome=nome)
    C.assento(nome, x - fx * 0.02, z - fz * 0.02, yaw)


def cortina(nome, x0, x1, z, y0, y1, mat, prof=0.18):
    n = int((x1 - x0) / 0.14)
    for i in range(n):
        x = x0 + (i + 0.5) * (x1 - x0) / n
        dz = (0.05 if i % 2 else -0.03)
        caixa(f'{nome}_{i}', (x, (y0 + y1) / 2, z + dz), ((x1 - x0) / n + 0.02, y1 - y0, prof * 0.4), mat, 0.03, seg=2)


casca()

if NUM == 41:
    C.sofa('sofa_a', -6.4, -1.5, 0.0, 2.6, M['couro'])
    C.sofa('sofa_b', -6.4, 1.6, 0.0, 2.0, M['couro'])
    for i, (x, z, a) in enumerate([(-4.6, -2.6, 25), (-4.6, -0.4, -25), (-4.6, 1.6, 0)]):
        C.poltrona(f'poltrona_{i}', x, z, math.radians(a), M['veludo_verde'])
    caixa('tapete', (0.3, 0.006, -3.0), (5.0, 0.012, 3.4), M['tapete'], 0.003)
    for i, x in enumerate((-1.0, 0.3, 1.6)):
        C.pendente(f'jogo_{i}', x, -3.0, H, y=2.4)
    bar(6.0, -3.0, 2.0)
    C.planta('planta_a', X0 + 0.5, Z0 + 0.5, 1.6, 60)
    C.planta('planta_b', X1 - 0.5, Z0 + 0.5, 1.6, 60)
elif NUM == 42:
    caixa('TELA_pista', (0, 0.006, -2.6), (6.0, 0.012, 5.0), M['pista'])
    caixa('palco_dj', (0, 0.15, -6.9), (4.0, 0.3, 1.8), M['metal_preto'], 0.01)
    colisor((0, 0.15, -6.9), (2.0, 0.15, 0.9), nome='palco_dj')
    caixa('cabine_dj', (0, 0.75, -6.5), (2.2, 0.9, 0.6), M['metal_preto'], 0.02)
    caixa('cabine_dj_led', (0, 0.9, -6.19), (2.0, 0.04, 0.01), N_NEON)
    colisor((0, 0.6, -6.5), (1.1, 0.6, 0.3), nome='cabine_dj')
    esfera('MOVEL_globo', (0, 3.0, -2.6), 0.35, M['espelho'], 32)
    cilindro('globo_haste', (0, 3.35, -2.6), 0.01, 0.4, M['metal_preto'], 8)
    rosa, roxo = neon('neon_rosa', (1.0, 0.25, 0.7), 7.0), neon('neon_roxo', (0.6, 0.3, 1.0), 7.0)
    for i, x in enumerate((-6.9, 6.9)):
        for k in range(5):
            caixa(f'neon_parede_{i}_{k}', (x - math.copysign(0.02, x), 1.8, -6.5 + k * 2.4), (0.02, 2.6, 0.05), rosa if k % 2 else roxo)
    C.sofa('sofa_o', -6.4, 0.5, 0.0, 3.0, M['couro_preto'])
    C.sofa('sofa_l', 4.8, -4.5, math.pi, 2.4, M['couro_preto'])
    bar(6.0, -1.5, 3.0, M['metal_preto'])
elif NUM == 43:
    caixa('tapete_a', (-3.5, 0.006, -2.5), (4.0, 0.012, 3.2), M['tapete'], 0.003)
    caixa('tapete_b', (2.0, 0.006, -4.5), (3.4, 0.012, 2.8), M['tapete'], 0.003)
    C.sofa('sofa_a', -6.4, -2.5, 0.0, 2.6, M['couro'])
    C.sofa('sofa_b', -3.5, -5.2, -math.pi / 2, 2.4, M['couro'])
    C.poltrona('poltrona_a', -1.6, -2.0, math.radians(-15))
    C.sofa('sofa_c', 2.0, -6.8, -math.pi / 2, 2.6, M['couro'])
    C.poltrona('poltrona_b', 3.9, -4.2, math.radians(15))
    for i, (x, z) in enumerate(((-3.8, -2.5), (2.0, -4.6))):
        cilindro(f'mesa_baixa_{i}', (x, 0.22, z), 0.42, 0.44, M['nogueira'], 40)
        colisor((x, 0.22, z), (0.4, 0.22, 0.4), nome=f'mesa_baixa_{i}')
    bar(6.0, -2.0, 2.5)
    for i, (x, z) in enumerate(((-3.8, -2.5), (2.0, -4.6))):
        C.pendente(f'lounge_{i}', x, z, H, y=2.5)
    C.planta('planta_a', X0 + 0.5, Z0 + 0.5, 1.6, 60)
    C.planta('planta_b', X0 + 0.5, Z1 - 0.6, 1.4, 55)
elif NUM == 44:
    caixa('palco', (0, 0.3, -6.9), (8.4, 0.6, 2.2), M['nogueira'], 0.01)
    caixa('palco_borda', (0, 0.62, -5.8), (8.4, 0.04, 0.08), M['latao'])
    colisor((0, 0.3, -6.9), (4.2, 0.3, 1.1), nome='palco')
    cortina('cortina_fundo', -4.2, 4.2, -7.85, 0.6, 3.5, M['veludo_vermelho'])
    for lado in (-1, 1):
        cortina(f'cortina_lado_{lado}', lado * 4.2 - (0.6 if lado > 0 else 0), lado * 4.2 + (0.6 if lado < 0 else 0), -6.0, 0.6, 3.5, M['veludo_vermelho'])
    for i in range(29):
        esfera(f'lampada_{i}', (-4.2 + i * 0.3, 0.68, -5.78), 0.035, M['globo'], 12)
    texto('letreiro_palco', 'LAS VEGAS NIGHT', (0, 3.15, -7.6), 0.34, N_NEON, profundidade=0.03, fonte=SERIF)
    C.coroa('coroa_palco', (0, 2.55, -7.6), 0.5)
    for i, (x, z) in enumerate(((-4.0, -3.0), (-1.3, -2.6), (1.3, -2.6), (4.0, -3.0), (-2.6, -0.4), (2.6, -0.4))):
        mesa_redonda(f'mesa_{i}', x, z, 3)
    bar(6.0, 0.4, 3.4)
    for i, x in enumerate((-3, 0, 3)):
        vazio(f'LUZ_palco_{i}', (x, 3.3, -5.0))
    C.planta('planta_a', X0 + 0.5, Z1 - 0.6, 1.5, 55)

C.hall_elevador(NUM, T['nome'], fonte=SERIF, cor_neon=T['neon'])
C.finalizar(OUT)
