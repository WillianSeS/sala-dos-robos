"""Cabine do elevador (a mesma em todos os andares): interior 2,2 x 2,2 x 2,6 m, portas da cabine e do hall,
painel com os cinco andares, abrir/fechar e indicador. Uso: <python com bpy> elevador.py <texturas> <saida.glb>"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C  # noqa: E402
from comum import M, caixa, cilindro, colisor, plano, texto, vazio  # noqa: E402

TEX, OUT = sys.argv[-2], sys.argv[-1]
FONTES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fontes')
SANS = os.path.join(FONTES, 'Inter-SemiBold.otf')
C.iniciar(TEX, 'elevador')

X0, X1, Z0, Z1, H = 2.1, 4.3, 10.0, 12.2, 2.6        # interior da cabine
XA, XB, HP = C.PORTA_ELEV['xa'], C.PORTA_ELEV['xb'], C.PORTA_ELEV['h']
XM = (XA + XB) / 2
E = 0.1

# piso, teto e paredes da cabine
caixa('cab_piso', ((X0 + X1) / 2, -0.03, (Z0 + Z1) / 2), (X1 - X0, 0.06, Z1 - Z0), M['marmore'], 0.004)
caixa('cab_teto', ((X0 + X1) / 2, H + 0.04, (Z0 + Z1) / 2), (X1 - X0, 0.08, Z1 - Z0), M['aco'])
colisor(((X0 + X1) / 2, -0.25, (Z0 + Z1) / 2), ((X1 - X0) / 2 + 0.3, 0.25, (Z1 - Z0) / 2 + 0.3), nome='cab_piso')
colisor(((X0 + X1) / 2, H + 0.25, (Z0 + Z1) / 2), ((X1 - X0) / 2 + 0.3, 0.25, (Z1 - Z0) / 2 + 0.3), nome='cab_teto')
C.parede_z('cab_oeste', Z0, Z1 + E, X0 - E / 2, H, M['nogueira'], e=E)
C.parede_z('cab_leste', Z0, Z1 + E, X1 + E / 2, H, M['nogueira'], e=E)
C.parede_x('cab_fundo', X0 - E, X1 + E, Z1 + E / 2, H, M['nogueira'], e=E)
C.parede_x('cab_frente', X0 - E, X1 + E, Z0 + E / 2, H, M['aco'], e=E, vaos=[(XA, XB, HP)])
# espelho no fundo, corrimão de latão e friso de LED no teto
caixa('cab_espelho', ((X0 + X1) / 2, 1.45, Z1 - 0.012), (1.6, 1.5, 0.01), M['espelho'])
caixa('cab_espelho_moldura', ((X0 + X1) / 2, 1.45, Z1 - 0.008), (1.7, 1.6, 0.008), M['latao'])
for nome, c, t in [
    ('corrimao_fundo', ((X0 + X1) / 2, 0.92, Z1 - 0.06), (X1 - X0 - 0.2, 0.035, 0.035)),
    ('corrimao_oeste', (X0 + 0.06, 0.92, (Z0 + Z1) / 2 + 0.15), (0.035, 0.035, Z1 - Z0 - 0.6)),
]:
    caixa(nome, c, t, M['latao'], 0.012)
caixa('cab_led', ((X0 + X1) / 2, H - 0.005, (Z0 + Z1) / 2), (1.5, 0.01, 1.5), M['led_branco'])
vazio('LUZ_cabine', ((X0 + X1) / 2, H - 0.15, (Z0 + Z1) / 2))

# painel de botões na parede leste, perto da porta
PX, PZ = X1 - 0.01, Z0 + 0.42
caixa('painel_placa', (PX, 1.18, PZ), (0.02, 0.62, 0.22), M['latao'], 0.004)
plano('TELA_cabine', (PX - 0.014, 1.42, PZ), 0.16, 0.08, M['tela'], -math.pi / 2)
for i, n in enumerate((44, 43, 42, 41, 40)):
    y = 1.3 - i * 0.07
    cilindro(f'BOTAO_{n}', (PX - 0.016, y, PZ - 0.045), 0.02, 0.012, M['tecla'], 24, eixo='x')
    texto(f'rotulo_{n}', str(n), (PX - 0.012, y, PZ + 0.03), 0.03, M['led_ouro'], yaw=-math.pi / 2, profundidade=0.002, fonte=SANS)
for i, (n, sim) in enumerate((('abrir', '<|>'), ('fechar', '>|<'))):
    y = 0.95
    cilindro(f'BOTAO_{n}', (PX - 0.016, y, PZ - 0.045 + i * 0.09), 0.02, 0.012, M['tecla'], 24, eixo='x')
    texto(f'rotulo_{n}', sim, (PX - 0.012, y - 0.045, PZ - 0.045 + i * 0.09), 0.018, M['led_ouro'], yaw=-math.pi / 2, profundidade=0.002, fonte=SANS)
plano('TELA_cabine_porta', (XM, HP + 0.12, Z0 + E + 0.002), 0.4, 0.12, M['tela'])

# portas: duas folhas na cabine e duas no hall; origem na posição fechada (o jogo desliza para os lados)
FW, FH, FT = (XB - XA) / 2, HP, 0.03
for lado, sinal in (('esq', -1), ('dir', 1)):
    cx = XM + sinal * FW / 2
    for onde, z in (('cab', Z0 + 0.07), ('hall', Z0 - 0.07)):
        p = caixa(f'PORTA_{onde}_{lado}', (cx, FH / 2, z), (FW - 0.004, FH - 0.01, FT), M['aco'], 0.003)
        C.mover_origem(p, (cx, 0, z))
        caixa(f'PORTA_{onde}_{lado}_friso', (cx + sinal * (FW / 2 - 0.03), FH / 2, z), (0.012, FH - 0.2, FT + 0.004), M['latao']).parent = p
        p.children[0].matrix_parent_inverse = p.matrix_world.inverted()
vazio('PONTO_cabine', (XM, 0, (Z0 + Z1) / 2 + 0.2), yaw=0.0)

C.finalizar(OUT)
