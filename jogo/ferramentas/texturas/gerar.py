"""Gera as texturas PBR da sala (cor, ORM = oclusão/rugosidade/metal, normal) de forma procedural.

Não depende de download: ruído periódico por FFT, veios de mármore com distorção de domínio,
fibras de madeira, granulado de couro etc.  Saída em JPEG/PNG para o Blender montar os materiais.
Uso: python3 gerar.py <pasta de saída>
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'saida'
os.makedirs(OUT, exist_ok=True)


def ruido(n, beta, seed, m=None):
    """Ruído 1/f^beta periódico (emenda perfeita), normalizado em 0..1."""
    m = m or n
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.standard_normal((m, n)))
    fy = np.fft.fftfreq(m)[:, None]
    fx = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    F /= f ** beta
    F[0, 0] = 0
    r = np.fft.ifft2(F).real
    return (r - r.min()) / (r.max() - r.min() + 1e-9)


def normal_de_altura(h, forca):
    """Mapa normal (convenção OpenGL/glTF: verde = para cima na imagem)."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * forca
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * forca
    n = np.stack([-dx, dy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def orm(rough, metal=0.0, ao=None):
    ao = np.ones_like(rough) if ao is None else ao
    met = np.full_like(rough, metal) if np.isscalar(metal) else metal
    return (np.stack([ao, rough, met], -1).clip(0, 1) * 255).astype(np.uint8)


def srgb(c):
    return (np.clip(c, 0, 1) * 255).astype(np.uint8)


def salvar(nome, cor=None, orm_=None, normal=None):
    if cor is not None:
        Image.fromarray(cor).save(f'{OUT}/{nome}_cor.jpg', quality=92)
    if orm_ is not None:
        Image.fromarray(orm_).save(f'{OUT}/{nome}_orm.jpg', quality=92)
    if normal is not None:
        Image.fromarray(normal).save(f'{OUT}/{nome}_normal.png')
    print('textura', nome)


def mix(a, b, t):
    return a + (b - a) * t[..., None]


# ---------------------------------------------------------------- mármore Nero Marquina (4 placas de 1,2 m)
def marmore():
    N = 1024
    placas = []
    for k in range(4):
        u, v = np.meshgrid(np.linspace(0, 1, N, endpoint=False), np.linspace(0, 1, N, endpoint=False))
        w1, w2 = ruido(N, 1.9, 10 + k), ruido(N, 2.2, 20 + k)
        nuvem = ruido(N, 2.4, 30 + k)
        ang = [0.6, -0.9, 0.35, -0.5][k]
        t = (u * math.cos(ang) + v * math.sin(ang)) * 1.3 + w1 * 1.6 + w2 * 0.7
        veio = np.exp(-((np.abs(np.sin(t * math.pi)) / 0.05) ** 2)) * (0.35 + 0.65 * ruido(N, 2.6, 15 + k))   # poucos veios fortes
        t2 = (u * math.cos(ang + 1.2) + v * math.sin(ang + 1.2)) * 7.0 + w2 * 3.0
        fio = np.exp(-((np.abs(np.sin(t2 * math.pi)) / 0.02) ** 2)) * (ruido(N, 2.0, 40 + k) > 0.55)
        dourado = np.exp(-((np.abs(np.sin((t + 0.37) * math.pi)) / 0.012) ** 2)) * (w1 > 0.6)
        base = np.array([0.035, 0.035, 0.04]) + (nuvem[..., None] - 0.5) * 0.05
        cor = base
        cor = mix(cor, np.array([0.78, 0.78, 0.76]), np.clip(veio * (0.55 + 0.45 * w2), 0, 1))
        cor = mix(cor, np.array([0.55, 0.55, 0.55]), np.clip(fio * 0.7, 0, 1))
        cor = mix(cor, np.array([0.80, 0.62, 0.30]), np.clip(dourado, 0, 1))
        rough = 0.11 + 0.06 * nuvem + 0.08 * veio
        h = 0.02 * veio
        # rejunte nas bordas da placa
        b = 4
        rej = np.zeros((N, N))
        rej[:b, :] = rej[-b:, :] = rej[:, :b] = rej[:, -b:] = 1
        cor = mix(cor, np.array([0.015, 0.015, 0.015]), rej)
        rough = np.where(rej > 0, 0.6, rough)
        h = np.where(rej > 0, -1.0, h)
        placas.append((cor, rough, h))
    C = np.zeros((2 * N, 2 * N, 3))
    R = np.zeros((2 * N, 2 * N))
    H = np.zeros((2 * N, 2 * N))
    for k, (c, r, h) in enumerate(placas):
        y, x = (k // 2) * N, (k % 2) * N
        C[y:y + N, x:x + N] = c
        R[y:y + N, x:x + N] = r
        H[y:y + N, x:x + N] = h
    salvar('marmore', srgb(C), orm(R), normal_de_altura(H, 6.0))


# ---------------------------------------------------------------- painéis de nogueira (tábuas verticais de 15 cm, 1,2 m)
def nogueira():
    N = 2048
    tabuas = 8
    u, v = np.meshgrid(np.linspace(0, 1, N, endpoint=False), np.linspace(0, 1, N, endpoint=False))
    idx = np.floor(u * tabuas).astype(int)
    lu = u * tabuas - idx
    fibra = np.zeros((N, N))
    tom = np.zeros((N, N))
    rng = np.random.default_rng(5)
    alongado = ruido(64, 1.6, 7, m=N)               # ruído esticado no sentido da fibra
    alongado = np.array(Image.fromarray((alongado * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)) / 255.0
    for i in range(tabuas):
        m = idx == i
        off, freq, t0 = rng.uniform(0, 1), rng.uniform(16, 26), rng.uniform(-0.06, 0.06)
        anel = np.sin((lu * freq + alongado * 6.0 + off * 10 + v * rng.uniform(0.5, 2.0)) * math.pi * 2)
        fibra[m] = (0.5 + 0.5 * anel[m]) ** 3
        tom[m] = t0
    poros = (ruido(N, 0.6, 9) > 0.82) * 0.5
    escuro = np.array([0.105, 0.062, 0.036])
    claro = np.array([0.30, 0.19, 0.11])
    cor = mix(claro, escuro, np.clip(fibra * 0.85 + poros * 0.3, 0, 1)) * (1 + tom[..., None])
    junta = (lu < 0.006) | (lu > 0.994)
    cor[junta] = [0.02, 0.012, 0.008]
    rough = 0.38 + 0.12 * fibra + 0.1 * poros
    rough[junta] = 0.8
    h = -0.3 * fibra - poros * 0.4
    h[junta] = -4
    salvar('nogueira', srgb(cor), orm(rough), normal_de_altura(h, 1.5))


# ---------------------------------------------------------------- gesso / reboco veneziano (2 m, periódico)
def gesso():
    N = 1024
    a, b, c = ruido(N, 2.6, 50), ruido(N, 1.4, 51), ruido(N, 0.8, 52)
    base = np.array([0.58, 0.55, 0.51])
    cor = base * (0.93 + 0.1 * a[..., None] + 0.03 * b[..., None])
    rough = 0.78 + 0.12 * c - 0.1 * a
    salvar('gesso', srgb(cor), orm(rough), normal_de_altura(b * 0.6 + c * 0.25, 2.0))


# ---------------------------------------------------------------- couro conhaque (0,5 m)
def couro():
    N = 1024
    cel = ruido(N, 0.9, 60)
    grao = np.abs(cel - 0.5) * 2
    grao = 1 - np.clip(grao * 3, 0, 1)          # sulcos estreitos entre as células
    mancha = ruido(N, 2.4, 61)
    cor = np.array([0.21, 0.085, 0.035]) * (0.85 + 0.35 * mancha[..., None]) * (1 - 0.25 * grao[..., None])
    rough = 0.42 + 0.25 * grao + 0.08 * mancha
    salvar('couro', srgb(cor), orm(rough), normal_de_altura(-grao * 0.8 + ruido(N, 1.2, 62) * 0.3, 3.0))


# ---------------------------------------------------------------- veludo azul-noite (0,4 m)
def veludo():
    N = 512
    n1, n2 = ruido(N, 1.0, 70), ruido(N, 2.2, 71)
    cor = np.array([0.035, 0.05, 0.13]) * (0.8 + 0.4 * n2[..., None])
    rough = 0.85 + 0.1 * n1
    salvar('veludo', srgb(cor), orm(rough), normal_de_altura(n1 * 0.5, 2.0))


# ---------------------------------------------------------------- latão escovado
def latao():
    N = 512
    linhas = ruido(4, 1.0, 80, m=N)
    linhas = np.array(Image.fromarray((linhas * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)) / 255.0
    fino = ruido(N, 0.5, 81)
    cor = np.array([0.86, 0.68, 0.38]) * (0.94 + 0.08 * linhas[..., None])
    rough = 0.24 + 0.1 * linhas + 0.05 * fino
    salvar('latao', srgb(cor), orm(rough, 1.0), normal_de_altura(linhas * 0.3, 2.0))


# ---------------------------------------------------------------- tapete art déco (3 m x 2 m)
def tapete():
    W, H = 2048, 1536   # 4:3, múltiplo de 4 em todas as escalas usadas (KTX2 exige)
    img = Image.new('RGB', (W, H), (14, 20, 44))
    d = ImageDraw.Draw(img)
    ouro = (176, 136, 64)
    for k, m in enumerate([30, 52, 60]):
        d.rectangle([m, m, W - m, H - m], outline=ouro, width=6 if k == 0 else 3)
    cx, cy = W // 2, H // 2
    for r in range(60, 420, 45):                    # leque art déco no centro
        d.arc([cx - r, cy - r, cx + r, cy + r], 200, 340, fill=ouro, width=3)
        d.arc([cx - r, cy - r, cx + r, cy + r], 20, 160, fill=ouro, width=3)
    for a in range(0, 360, 15):
        x, y = cx + 420 * math.cos(math.radians(a)), cy + 300 * math.sin(math.radians(a))
        d.line([cx, cy, x, y], fill=(120, 96, 50), width=1)
    for x in range(110, W - 100, 90):               # losangos na faixa
        for y in (85, H - 85):
            d.polygon([(x, y - 14), (x + 14, y), (x, y + 14), (x - 14, y)], outline=ouro)
    a = np.asarray(img).astype(np.float32) / 255.0
    fibras = ruido(W, 0.3, 90, m=H)
    a *= (0.88 + 0.2 * fibras[..., None])
    rough = 0.92 + 0.06 * fibras
    salvar('tapete', srgb(a), orm(rough), normal_de_altura(fibras * 0.7, 2.5))


# ---------------------------------------------------------------- quadro abstrato preto e ouro
def quadro():
    W, H = 768, 1024
    rng = np.random.default_rng(100)
    base = ruido(W, 2.2, 101, m=H)
    a = np.zeros((H, W, 3)) + np.array([0.03, 0.03, 0.035]) + (base[..., None] - 0.5) * 0.03
    img = Image.fromarray(srgb(a))
    d = ImageDraw.Draw(img)
    for _ in range(26):                              # pinceladas douradas
        x0, y0 = rng.uniform(0, W), rng.uniform(0, H)
        pts = [(x0, y0)]
        for _ in range(8):
            x0 += rng.uniform(-90, 90)
            y0 += rng.uniform(-40, 60)
            pts.append((x0, y0))
        g = int(rng.uniform(140, 220))
        d.line(pts, fill=(g, int(g * 0.76), int(g * 0.38)), width=int(rng.uniform(3, 16)), joint='curve')
    d.ellipse([W * 0.28, H * 0.3, W * 0.72, H * 0.63], outline=(205, 160, 80), width=10)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    arr = np.asarray(img).astype(np.float32) / 255
    ouro = (arr[..., 0] > 0.25).astype(np.float32)
    rough = np.where(ouro > 0, 0.3, 0.85)
    salvar('quadro', np.asarray(img), orm(rough, ouro * 0.9), None)


# ---------------------------------------------------------------- lombadas de livros
def livros():
    W, H = 1024, 512
    rng = np.random.default_rng(110)
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    x = 0
    cores = [(92, 22, 26), (20, 34, 62), (18, 48, 36), (110, 84, 52), (36, 30, 28), (130, 112, 86), (60, 18, 60)]
    while x < W:
        w = int(rng.uniform(26, 58))
        c = cores[rng.integers(len(cores))]
        d.rectangle([x, 0, x + w - 1, H], fill=c)
        for y in (int(H * 0.12), int(H * 0.86)):
            d.rectangle([x + 3, y, x + w - 4, y + 4], fill=(190, 150, 80))
        d.rectangle([x + w // 2 - 3, int(H * 0.35), x + w // 2 + 3, int(H * 0.6)], fill=(170, 135, 70))
        d.line([x + w - 1, 0, x + w - 1, H], fill=(8, 8, 8), width=2)
        x += w
    salvar('livros', np.asarray(img), orm(np.full((H, W), 0.6)), None)


# ---------------------------------------------------------------- folha (recorte com transparência)
def folha():
    W, H = 512, 1024
    alfa = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(alfa)
    pts = []
    for k in range(121):
        t = k / 120
        y = H * (0.02 + 0.96 * t)
        larg = math.sin(math.pi * t) ** 0.8 * (1 - 0.35 * t) * W * 0.46
        pts.append((W / 2 + larg, y))
    pts += [(W - x, y) for x, y in reversed(pts)]
    d.polygon(pts, fill=255)
    a = np.asarray(alfa).astype(np.float32) / 255
    u, v = np.meshgrid(np.linspace(-1, 1, W), np.linspace(0, 1, H))
    nervura = np.exp(-(u / 0.02) ** 2)
    lat = np.exp(-((np.abs(np.sin((v * 9 + np.abs(u) * 2.2) * math.pi))) / 0.08) ** 2) * (np.abs(u) > 0.03)
    tom = ruido(W, 2.0, 120, m=H)
    cor = np.array([0.05, 0.20, 0.06]) * (0.75 + 0.5 * tom[..., None]) + np.array([0.10, 0.18, 0.06]) * (nervura + lat * 0.4)[..., None]
    cor = cor * (0.8 + 0.2 * (1 - np.abs(u)))[..., None]
    rgba = np.concatenate([srgb(cor), (a[..., None] * 255).astype(np.uint8)], -1)
    Image.fromarray(rgba, 'RGBA').save(f'{OUT}/folha_cor.png')
    Image.fromarray(orm(0.55 - 0.15 * nervura)).save(f'{OUT}/folha_orm.jpg', quality=92)
    Image.fromarray(normal_de_altura(-nervura * 2 - lat * 0.6, 2.0)).save(f'{OUT}/folha_normal.png')
    print('textura folha')


# ---------------------------------------------------------------- tela do monitor (simulação)
def tela():
    W, H = 1024, 576
    img = Image.new('RGB', (W, H), (6, 10, 20))
    d = ImageDraw.Draw(img)
    for y in range(60, H, 60):
        d.line([0, y, W, y], fill=(18, 26, 44))
    rng = np.random.default_rng(7)
    p = H * 0.6
    x0 = 40
    for k in range(70):                              # candles
        o = p
        c = o + rng.normal(0, 14)
        hi, lo = max(o, c) + abs(rng.normal(0, 8)), min(o, c) - abs(rng.normal(0, 8))
        cor = (40, 210, 120) if c < o else (230, 70, 80)
        x = x0 + k * 13
        d.line([x + 4, hi, x + 4, lo], fill=cor)
        d.rectangle([x, min(o, c), x + 8, max(o, c) + 1], fill=cor)
        p = min(max(c, 80), H - 60)
    d.rectangle([0, 0, W, 34], fill=(14, 20, 34))
    d.text((12, 10), 'SALA DOS ROBOS  |  MERCADO SIMULADO  |  SEM DINHEIRO REAL', fill=(210, 180, 110))
    salvar('tela', np.asarray(img), None, None)


for f in (marmore, nogueira, gesso, couro, veludo, latao, tapete, quadro, livros, folha, tela):
    f()
