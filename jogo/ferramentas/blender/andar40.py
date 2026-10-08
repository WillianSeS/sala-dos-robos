"""40º andar: recepção/lounge (a sala da Fase 1), corredor com porta e hall do elevador.

Uso: <python com bpy> andar40.py <pasta das texturas> <saida.glb>
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C  # noqa: E402
from comum import M, caixa, cilindro, colisor, esfera, plano, vazio  # noqa: E402

TEX, OUT = sys.argv[-2], sys.argv[-1]
FONTES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fontes')
SERIF = os.path.join(FONTES, 'DejaVuSerif-Bold.ttf')
C.iniciar(TEX, 'andar40')

X0, X1, Z0, Z1, H = -5.0, 5.0, -4.0, 4.0, 3.2   # recepção 10 x 8 x 3,2 m
E = 0.2
PX0, PX1, PH = 2.75, 3.65, 2.15                  # porta da recepção para o corredor
CX0, CX1, CZ1, CH = 2.2, 4.2, 6.6, 2.8           # corredor até o hall

# ------------------------------------------------------------------ recepção: piso, teto, sanca
caixa('piso', (0, -0.05, 0), (X1 - X0, 0.1, Z1 - Z0), M['marmore'])
caixa('piso_corredor', ((CX0 + CX1) / 2, -0.05, (Z1 + CZ1) / 2 + 0.05), (CX1 - CX0, 0.1, CZ1 - Z1 + 0.1), M['marmore'])
colisor((0, -0.25, 3.0), (7.0, 0.25, 7.5), nome='piso')
caixa('teto', (0, H + 0.05, 0), (X1 - X0, 0.1, Z1 - Z0), M['teto'])
caixa('teto_corredor', ((CX0 + CX1) / 2, CH + 0.05, (Z1 + CZ1) / 2), (CX1 - CX0, 0.1, CZ1 - Z1), M['teto'])
colisor((0, H + 0.25, 0), (5.6, 0.25, 4.6), nome='teto')
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

# janela panorâmica (norte) entre pilares
JX = 4.4
for lado in (-1, 1):
    caixa(f'pilar_{lado}', (lado * (JX + 0.3), H / 2, Z0 - E / 2), (0.6, H, E), M['gesso'])
C.janela_panoramica('janela', -JX, JX, Z0 - E / 2, H)

# parede sul com a porta, leste e oeste
C.parede_x('parede_s', X0 - E, X1 + E, Z1 + E / 2, H, M['gesso'], vaos=[(PX0, PX1, PH)])
C.parede_z('parede_l', Z0 - E, Z1 + E, X1 + E / 2, H, M['gesso'])
C.parede_z('parede_o', Z0 - E, Z1 + E, X0 - E / 2, H, M['gesso'])
caixa('painel_nogueira', (X0 + 0.015, 1.5, 0), (0.03, 3.0, Z1 - Z0), M['nogueira'], 0.004)
for z in (-2.4, -1.2, 1.2, 2.4):
    caixa(f'friso_{z}', (X0 + 0.034, 1.5, z), (0.008, 3.0, 0.012), M['latao'])
for nome, c, t in [
    ('rodape_s1', ((X0 + PX0) / 2, 0.05, Z1 - 0.01), (PX0 - X0, 0.1, 0.02)),
    ('rodape_s2', ((PX1 + X1) / 2, 0.05, Z1 - 0.01), (X1 - PX1, 0.1, 0.02)),
    ('rodape_l', (X1 - 0.01, 0.05, 0), (0.02, 0.1, Z1 - Z0)),
]:
    caixa(nome, c, t, M['metal_preto'])
for i, (x, z) in enumerate([(-2.7, -1.6), (-2.7, 1.6), (0.6, -2.3), (0.6, 1.2), (3.6, -1.1), (3.6, 1.1), (-0.9, 2.9)]):
    C.spot_teto(i, x, z, H)

# porta de nogueira com dobradiça (abre para o corredor)
FW, FH, FT = PX1 - PX0 - 0.02, PH - 0.02, 0.045
folha = caixa('PORTA_folha', (PX0 + 0.01 + FW / 2, FH / 2 + 0.01, Z1 + E / 2), (FW, FH, FT), M['nogueira'], 0.006)
C.mover_origem(folha, (PX0 + 0.01, 0, Z1 + E / 2))
for lado in (-1, 1):
    pux = caixa(f'PORTA_puxador_{lado}', (PX0 + 0.01 + FW - 0.1, 1.05, Z1 + E / 2 + lado * (FT / 2 + 0.03)), (0.025, 0.7, 0.025), M['latao'], 0.008)
    pux.parent = folha
    pux.matrix_parent_inverse = folha.matrix_world.inverted()
for nome, c, t in [
    ('batente_e', (PX0 - 0.03, PH / 2, Z1 + E / 2), (0.06, PH, E + 0.04)),
    ('batente_d', (PX1 + 0.03, PH / 2, Z1 + E / 2), (0.06, PH, E + 0.04)),
    ('batente_t', ((PX0 + PX1) / 2, PH + 0.03, Z1 + E / 2), (PX1 - PX0 + 0.12, 0.06, E + 0.04)),
]:
    caixa(nome, c, t, M['metal_preto'], 0.004)

# corredor (abre no hall do elevador)
C.parede_z('corredor_o', Z1, CZ1 - 0.1, CX0 - E / 2, CH, M['gesso'])
C.parede_z('corredor_l', Z1, CZ1 - 0.1, CX1 + E / 2, CH, M['gesso'])
C.spot_teto('corredor', (CX0 + CX1) / 2, (Z1 + CZ1) / 2, CH)
colisor(((CX0 + CX1) / 2, CH + 0.25, (Z1 + CZ1) / 2), ((CX1 - CX0) / 2 + 0.2, 0.25, (CZ1 - Z1) / 2), nome='corredor_teto')
C.quadro_parede('quadro_corredor', (CX0 + 0.02, 1.55, (Z1 + CZ1) / 2 + 0.1), 0.62, 0.82, math.pi / 2)

# ------------------------------------------------------------------ móveis da recepção
caixa('tapete', (-2.55, 0.006, 0), (3.0, 0.012, 2.25), M['tapete'], 0.003)
C.sofa('sofa', -4.42, 0.0, 0.0)
caixa('mesa_tampo', (-2.75, 0.4, 0), (0.7, 0.04, 1.25), M['marmore'], 0.01)
caixa('mesa_base', (-2.75, 0.19, 0), (0.5, 0.38, 1.0), M['latao'], 0.004)
caixa('mesa_vao', (-2.75, 0.19, 0), (0.52, 0.32, 0.94), M['metal_preto'])
colisor((-2.75, 0.21, 0), (0.36, 0.21, 0.64), nome='mesa_centro')
cilindro('vaso_mesa', (-2.75, 0.5, 0.35), 0.06, 0.16, M['ceramica'], 20, 0.04)
esfera('enfeite_mesa', (-2.7, 0.47, -0.3), 0.05, M['latao'])
C.poltrona('poltrona_a', -1.5, -0.95, math.radians(20))
C.poltrona('poltrona_b', -1.5, 0.95, math.radians(-20))

LX, LZ = -4.55, -1.62
cilindro('abajur_base', (LX, 0.025, LZ), 0.17, 0.05, M['marmore'], 32)
cilindro('abajur_haste', (LX, 0.9, LZ), 0.012, 1.75, M['latao'], 12)
cilindro('abajur_braco', (LX + 0.25, 1.77, LZ), 0.01, 0.5, M['latao'], 12, eixo='x')
cilindro('abajur_cupula', (LX + 0.5, 1.62, LZ), 0.2, 0.26, M['cupula'], 32, 0.11)
vazio('LUZ_abajur', (LX + 0.5, 1.5, LZ))
colisor((LX, 0.8, LZ), (0.2, 0.8, 0.2), nome='abajur')
C.quadro_parede('quadro', (X0 + 0.05, 1.75, 0), 0.9, 1.2, math.pi / 2)

# estante com livros
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
        hh = random.uniform(0.24, 0.34)
        caixa(f'livros_{k}_{x:.2f}', (x + w / 2, y + hh / 2 + 0.018, EZ + 0.02), (w, hh, 0.24), M['livros'])
        x += w + random.uniform(0.08, 0.25)
    cilindro(f'estante_vaso_{k}', (EX1 - 0.15, y + 0.13, EZ), 0.05, 0.22, M['latao'] if k % 2 else M['ceramica'], 20, 0.035)
colisor(((EX0 + EX1) / 2, 1.1, EZ), ((EX1 - EX0) / 2 + 0.03, 1.1, 0.19), nome='estante')

# mesa com monitor (simulação) e cadeira
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
CX_, CZ_ = DX, DZ + 0.78
for k in range(5):
    a = k * 2 * math.pi / 5
    caixa(f'cadeira_raio_{k}', (CX_ + 0.17 * math.cos(a), 0.06, CZ_ + 0.17 * math.sin(a)), (0.34, 0.035, 0.05), M['metal_preto'], 0.008, -a)
    cilindro(f'cadeira_rodizio_{k}', (CX_ + 0.32 * math.cos(a), 0.03, CZ_ + 0.32 * math.sin(a)), 0.025, 0.03, M['metal_preto'], 12, eixo='z')
cilindro('cadeira_coluna', (CX_, 0.27, CZ_), 0.025, 0.38, M['latao'], 16)
caixa('cadeira_assento', (CX_, 0.49, CZ_), (0.52, 0.09, 0.5), M['couro'], 0.04, seg=4)
caixa('cadeira_encosto', (CX_, 0.86, CZ_ + 0.26), (0.48, 0.6, 0.08), M['couro'], 0.04, seg=4, rot=C.Euler((math.radians(8), 0, 0)))
colisor((CX_, 0.5, CZ_ + 0.03), (0.3, 0.5, 0.32), nome='cadeira')
C.assento('cadeira', CX_, CZ_ + 0.02, math.pi)

# bar com banquetas, adega iluminada e pendentes
BX, BZ0, BZ1 = 3.8, -1.6, 1.6
caixa('bar_corpo', (BX, 0.52, 0), (0.55, 1.04, BZ1 - BZ0), M['nogueira'], 0.01)
caixa('bar_tampo', (BX - 0.06, 1.065, 0), (0.72, 0.05, BZ1 - BZ0 + 0.12), M['marmore'], 0.01)
caixa('bar_led', (BX - 0.29, 1.03, 0), (0.012, 0.012, BZ1 - BZ0), M['led_ouro'])
cilindro('bar_apoio_pes', (BX - 0.36, 0.2, 0), 0.018, BZ1 - BZ0 - 0.1, M['latao'], 16, eixo='z')
colisor((BX - 0.04, 0.54, 0), (0.36, 0.54, (BZ1 - BZ0) / 2 + 0.06), nome='bar')
for i, z in enumerate((-1.0, 0.0, 1.0)):
    C.banqueta(f'banqueta_{i}', BX - 0.72, z)
caixa('adega_fundo', (X1 - 0.03, 1.55, 0), (0.06, 1.3, 2.9), M['nogueira'], 0.004)
caixa('adega_luz', (X1 - 0.065, 1.55, 0), (0.01, 1.1, 2.6), M['led_ouro'])
for k, y in enumerate((1.05, 1.5, 1.95)):
    caixa(f'adega_prat_{k}', (X1 - 0.16, y, 0), (0.26, 0.03, 2.8), M['metal_preto'], 0.004)
    z = -1.3
    while z < 1.3:
        mat = random.choice([M['garrafa_ambar'], M['garrafa_verde'], M['garrafa_clara']])
        hg = random.uniform(0.2, 0.28)
        cilindro(f'garrafa_{k}_{z:.2f}', (X1 - 0.16, y + 0.015 + hg / 2, z), 0.04, hg, mat, 16)
        cilindro(f'gargalo_{k}_{z:.2f}', (X1 - 0.16, y + 0.015 + hg + 0.05, z), 0.014, 0.1, mat, 10, 0.012)
        z += random.uniform(0.12, 0.2)
colisor((X1 - 0.15, 1.3, 0), (0.15, 1.3, 1.45), nome='adega')
for i, z in enumerate((-1.0, 0.0, 1.0)):
    C.pendente(i, BX - 0.06, z, H)

C.planta('planta_no', X0 + 0.45, Z0 + 0.45, 1.5, 70)
C.planta('planta_ne', X1 - 0.45, Z0 + 0.45, 1.6, 70)
C.planta('planta_porta', PX0 - 0.55, Z1 - 0.4, 1.3, 55)

vazio('LUZ_janela', (0, 1.6, Z0 + 0.3))
vazio('SPAWN_jogador', (0.2, 0, 0.6), yaw=math.pi)

# ------------------------------------------------------------------ hall do elevador
C.hall_elevador(40, 'Recepção · Escritório', fonte=SERIF)

C.finalizar(OUT)
