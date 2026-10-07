"""Funções comuns dos testes no navegador (Playwright + Chromium).

Variáveis de ambiente:
  URL        endereço da sala servida localmente (padrão http://127.0.0.1:8766/)
  THREE_DIR  pasta com uma cópia local do three.js r160 (o repositório mrdoob/three.js na tag r160).
             Use só se o computador não acessar o CDN; nesse modo as fontes do Google viram CSS vazio
             e qualquer outro endereço externo é bloqueado.
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
URL = os.environ.get('URL', 'http://127.0.0.1:8766/')
THREE_DIR = os.environ.get('THREE_DIR')
EXTERNOS = []
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
        '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']


def rota(r):
    u = r.request.url
    if THREE_DIR and 'cdn.jsdelivr.net/npm/three@0.160.0/' in u:
        f = os.path.join(THREE_DIR, u.split('three@0.160.0/')[1].split('?')[0])
        if os.path.exists(f):
            return r.fulfill(path=f, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})
        return r.abort()
    if THREE_DIR and 'fonts.g' in u:
        return r.fulfill(body='', headers={'content-type': 'text/css'})
    if THREE_DIR and not u.startswith(URL.rstrip('/')):
        EXTERNOS.append(u)
        return r.abort()
    return r.continue_()
