"""Andares 40 a 44: salão temático (14 x 12 m, pé-direito 3,6 m), corredor e hall do elevador.
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
    'feltro': material('feltro', cor=(0.02, 0.22, 0.12), rough=0.95),
    'feltro_azul': material('feltro_azul', cor=(0.02, 0.09, 0.22), rough=0.95),
    'cacapa': material('cacapa', cor=(0.01, 0.01, 0.012), rough=0.9),
})

X0, X1, Z0, Z1, H = -7.0, 7.0, -8.0, 4.0, 3.6
E = 0.2
DX0, DX1, DH = 2.4, 4.0, 2.6            # vão aberto para o corredor
CX0, CX1, CZ1, CH = 2.2, 4.2, 6.6, 2.8

TEMAS = {
    40: dict(nome='Escritório e Recepção', piso='marmore', parede='nogueira', neon=(1.0, 0.82, 0.5)),
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


def mesa_trader(i, x, z):
    """Estação de trader: mesa, dois monitores (TELA_monitor_i_k), teclado, cadeira giratória e assento olhando para -Z."""
    caixa(f'mt{i}_tampo', (x, 0.735, z), (1.6, 0.04, 0.8), M['nogueira'], 0.008)
    for sx in (-0.74, 0.74):
        caixa(f'mt{i}_perna_{sx}', (x + sx, 0.36, z), (0.05, 0.72, 0.7), M['metal_preto'], 0.006)
    caixa(f'mt{i}_painel', (x, 0.5, z - 0.3), (1.45, 0.35, 0.02), M['nogueira'])
    colisor((x, 0.38, z), (0.82, 0.38, 0.42), nome=f'mt{i}')
    for k, dx in enumerate((-0.37, 0.37)):
        yaw = 0.18 if dx < 0 else -0.18
        caixa(f'mt{i}_monitor_pe_{k}', (x + dx, 0.76, z - 0.2), (0.22, 0.012, 0.16), M['metal_preto'], 0.004)
        caixa(f'mt{i}_monitor_haste_{k}', (x + dx, 0.93, z - 0.24), (0.04, 0.34, 0.03), M['metal_preto'], 0.004)
        caixa(f'mt{i}_monitor_moldura_{k}', (x + dx, 1.08, z - 0.22), (0.66, 0.4, 0.03), M['metal_preto'], 0.006, yaw)
        C.plano(f'TELA_monitor_{i}_{k}', (x + dx + math.sin(yaw) * 0.017, 1.08, z - 0.22 + math.cos(yaw) * 0.017), 0.63, 0.36, M['tela'], yaw)
    caixa(f'mt{i}_teclado', (x, 0.765, z + 0.12), (0.44, 0.018, 0.14), M['tecla'], 0.004)
    caixa(f'mt{i}_mouse', (x + 0.34, 0.765, z + 0.13), (0.06, 0.02, 0.1), M['tecla'], 0.008)
    cx, cz = x, z + 0.72
    for k in range(5):
        a = k * 2 * math.pi / 5
        caixa(f'mt{i}_cad_raio_{k}', (cx + 0.17 * math.cos(a), 0.06, cz + 0.17 * math.sin(a)), (0.34, 0.035, 0.05), M['metal_preto'], 0.008, -a)
    cilindro(f'mt{i}_cad_coluna', (cx, 0.27, cz), 0.025, 0.38, M['latao'], 16)
    caixa(f'mt{i}_cad_assento', (cx, 0.49, cz), (0.52, 0.09, 0.5), M['couro'], 0.04, seg=4)
    caixa(f'mt{i}_cad_encosto', (cx, 0.86, cz + 0.26), (0.48, 0.6, 0.08), M['couro'], 0.04, seg=4, rot=C.Euler((math.radians(8), 0, 0)))
    colisor((cx, 0.5, cz + 0.03), (0.3, 0.5, 0.32), nome=f'mt{i}_cadeira')
    vazio(f'TRADER_{i}', (cx, 0, cz + 0.02), yaw=math.pi)


casca()

if NUM == 40:
    # porta de nogueira (pivô na esquerda) na entrada do escritório; abre para o corredor
    import bpy
    FW, FH, FT = DX1 - DX0 - 0.02, DH - 0.02, 0.05
    folha = caixa('PORTA_folha', (DX0 + 0.01 + FW / 2, FH / 2 + 0.01, Z1 + E / 2), (FW, FH, FT), M['nogueira'], 0.006)
    C.mover_origem(folha, (DX0 + 0.01, 0, Z1 + E / 2))
    bpy.context.view_layer.update()
    for lado in (-1, 1):
        pux = caixa(f'PORTA_puxador_{lado}', (DX0 + 0.01 + FW - 0.12, 1.05, Z1 + E / 2 + lado * (FT / 2 + 0.03)), (0.025, 0.8, 0.025), M['latao'], 0.008)
        pux.parent = folha
        pux.matrix_parent_inverse = folha.matrix_world.inverted()
    # 10 estações em duas fileiras, de frente para a janela; telão na parede oeste
    for i in range(10):
        mesa_trader(i, -4.2 + (i % 5) * 2.0, -5.6 if i < 5 else -3.0)
    caixa('telao_moldura', (X0 + 0.08, 2.0, -4.3), (0.12, 2.3, 4.2), M['metal_preto'], 0.01)
    C.plano('TELA_telao', (X0 + 0.15, 2.0, -4.3), 4.0, 2.1, M['tela'], math.pi / 2)
    # recepção da Aurora, à direita de quem entra
    caixa('recepcao_corpo', (5.4, 0.55, 1.9), (2.6, 1.1, 0.6), M['nogueira'], 0.02)
    caixa('recepcao_tampo', (5.4, 1.12, 2.0), (2.8, 0.05, 0.8), M['marmore'], 0.01)
    caixa('recepcao_led', (5.4, 0.15, 2.21), (2.5, 0.02, 0.01), M['led_ouro'])
    texto('recepcao_nome', 'SALA DOS ROBÔS', (5.4, 0.72, 2.215), 0.13, M['latao'], profundidade=0.01, fonte=SERIF)
    colisor((5.4, 0.56, 1.95), (1.42, 0.56, 0.42), nome='recepcao')
    vazio('PESSOA_aurora', (5.4, 0, 1.15), yaw=0.0)
    # lounge: sofás, mesa de café e poltronas no lado oeste
    C.sofa('sofa_a', -6.4, 0.6, 0.0, 2.6, M['couro'])
    C.poltrona('poltrona_a', -3.3, -0.3, math.radians(-20), M['veludo'])
    C.poltrona('poltrona_b', -3.3, 1.6, math.radians(20), M['veludo'])
    caixa('mesa_cafe', (-4.55, 0.4, 0.6), (0.7, 0.04, 1.3), M['marmore'], 0.01)
    caixa('mesa_cafe_base', (-4.55, 0.19, 0.6), (0.5, 0.38, 1.0), M['latao'], 0.004)
    colisor((-4.55, 0.21, 0.6), (0.36, 0.21, 0.66), nome='mesa_cafe')
    caixa('tapete_lounge', (-4.8, 0.006, 0.6), (3.6, 0.012, 3.4), M['tapete'], 0.003)
    # copa: máquina de café e geladeira na parede leste
    caixa('copa_balcao', (X1 - 0.35, 0.45, -2.0), (0.6, 0.9, 2.2), M['nogueira'], 0.01)
    caixa('copa_tampo', (X1 - 0.35, 0.92, -2.0), (0.66, 0.04, 2.26), M['marmore'], 0.01)
    colisor((X1 - 0.35, 0.47, -2.0), (0.33, 0.47, 1.13), nome='copa')
    caixa('MOVEL_cafeteira', (X1 - 0.38, 1.15, -2.5), (0.4, 0.42, 0.36), M['aco'], 0.02)
    caixa('cafeteira_bico', (X1 - 0.6, 1.05, -2.5), (0.06, 0.08, 0.06), M['metal_preto'], 0.01)
    for k in range(3):
        cilindro(f'xicara_{k}', (X1 - 0.5, 0.97, -1.7 + k * 0.18), 0.04, 0.08, M['ceramica'], 16)
    caixa('MOVEL_geladeira', (X1 - 0.42, 0.95, -4.4), (0.75, 1.9, 0.8), M['aco'], 0.02)
    caixa('geladeira_puxador', (X1 - 0.81, 1.1, -4.1), (0.03, 0.6, 0.03), M['metal_preto'], 0.005)
    colisor((X1 - 0.42, 0.95, -4.4), (0.4, 0.95, 0.42), nome='geladeira')
    for i, (x, z) in enumerate(((X0 + 0.5, Z0 + 0.5), (X1 - 0.5, Z0 + 0.5), (X0 + 0.5, Z1 - 0.6), (X1 - 0.6, -0.4))):
        C.planta(f'planta_{i}', x, z, 1.5, 55)
elif NUM == 41:
    C.sofa('sofa_a', -6.4, -1.5, 0.0, 2.6, M['couro'])
    C.sofa('sofa_b', -6.4, 1.6, 0.0, 2.0, M['couro'])
    for i, (x, z, a) in enumerate([(-4.6, -2.6, 25), (-4.6, -0.4, -25), (-4.6, 1.6, 0)]):
        C.poltrona(f'poltrona_{i}', x, z, math.radians(a), M['veludo_verde'])
    caixa('tapete', (0.3, 0.006, -3.0), (5.0, 0.012, 3.4), M['tapete'], 0.003)
    for i, x in enumerate((-1.0, 0.3, 1.6)):
        C.pendente(f'jogo_{i}', x, -3.0, H, y=2.4)
    # mesa de sinuca oficial (campo 2,44 x 1,22 m, feltro a 0,80 m); o jogo desenha bolas e taco
    SX, SZ, SY = 0.3, -3.0, 0.80
    caixa('sinuca_feltro', (SX, SY - 0.02, SZ), (2.44, 0.04, 1.22), M['feltro'])
    for lado in (-1, 1):
        caixa(f'sinuca_tabela_x_{lado}', (SX, SY + 0.02, SZ + lado * 0.65), (2.6, 0.06, 0.08), M['feltro'], 0.01)
        caixa(f'sinuca_tabela_z_{lado}', (SX + lado * 1.26, SY + 0.02, SZ), (0.08, 0.06, 1.3), M['feltro'], 0.01)
        caixa(f'sinuca_borda_x_{lado}', (SX, SY + 0.01, SZ + lado * 0.74), (2.78, 0.1, 0.12), M['nogueira'], 0.02)
        caixa(f'sinuca_borda_z_{lado}', (SX + lado * 1.35, SY + 0.01, SZ), (0.12, 0.1, 1.6), M['nogueira'], 0.02)
    for px, pz in ((-1.22, -0.61), (0, -0.64), (1.22, -0.61), (-1.22, 0.61), (0, 0.64), (1.22, 0.61)):
        cilindro(f'sinuca_cacapa_{px}_{pz}', (SX + px, SY + 0.005, SZ + pz), 0.065, 0.06, M['cacapa'], 20)
    caixa('sinuca_saia', (SX, SY - 0.17, SZ), (2.7, 0.3, 1.52), M['nogueira'], 0.02)
    for px in (-1.15, 1.15):
        for pz in (-0.6, 0.6):
            caixa(f'sinuca_perna_{px}_{pz}', (SX + px, 0.32, SZ + pz), (0.14, 0.64, 0.14), M['nogueira'], 0.02)
    for k in range(-3, 4):
        for lado in (-1, 1):
            esfera(f'sinuca_diamante_{k}_{lado}', (SX + k * 0.305, SY + 0.065, SZ + lado * 0.74), 0.008, M['latao'], 8)
    colisor((SX, 0.45, SZ), (1.42, 0.45, 0.82), nome='sinuca')
    vazio('JOGO_sinuca', (SX, SY, SZ))
    # suporte de tacos na parede norte
    caixa('suporte_tacos', (3.4, 1.2, Z0 + 0.12), (0.9, 1.4, 0.06), M['nogueira'], 0.01)
    for k in range(5):
        cilindro(f'taco_parede_{k}', (3.05 + k * 0.17, 1.2, Z0 + 0.17), 0.012, 1.45, M['nogueira'], 10)
    # alvo de dardos na parede sul (oeste do vão), linha de arremesso a 2,37 m
    AX, AY, AZ = -4.2, 1.73, Z1 - 0.06
    caixa('dardos_armario', (AX, AY, Z1 - 0.04), (0.82, 0.86, 0.06), M['nogueira'], 0.01)
    cilindro('dardos_aro', (AX, AY, AZ - 0.02), 0.25, 0.04, M['metal_preto'], 48, eixo='z')
    C.plano('TELA_dardos', (AX, AY, AZ - 0.045), 0.46, 0.46, M['tela'], math.pi)
    caixa('dardos_linha', (AX, 0.004, AZ - 2.37), (0.6, 0.008, 0.04), M['latao'])
    vazio('JOGO_dardos', (AX, AY, AZ - 0.045))
    vazio('JOGO_dardos_linha', (AX, 0, AZ - 2.37 - 0.25), yaw=math.pi)
    # mesa do Clube do 21 (meia-lua com feltro azul) e lugar do crupiê
    VX, VZ = -2.2, 1.4
    cilindro('vinteum_tampo', (VX, 0.76, VZ), 0.95, 0.05, M['nogueira'], 48)
    cilindro('vinteum_feltro', (VX, 0.79, VZ), 0.86, 0.012, M['feltro_azul'], 48)
    cilindro('vinteum_pe', (VX, 0.38, VZ), 0.12, 0.74, M['metal_preto'], 20)
    cilindro('vinteum_base', (VX, 0.02, VZ), 0.45, 0.04, M['metal_preto'], 32)
    colisor((VX, 0.4, VZ), (0.8, 0.4, 0.8), nome='vinteum')
    vazio('JOGO_vinteum', (VX, 0.8, VZ))
    vazio('PESSOA_crupie', (VX, 0, VZ - 1.25), yaw=0.0)
    vazio('JOGO_vinteum_jogador', (VX, 0, VZ + 1.3), yaw=math.pi)
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
