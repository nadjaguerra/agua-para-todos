"""Abre a versão pronta em localhost. Não instala pacotes nem baixa dados."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading, webbrowser

def main():
    folder=Path(__file__).resolve().parent/'web'/'dist'
    if not (folder/'index.html').exists():
        raise SystemExit('Versão pronta não encontrada. Na pasta web, execute npm ci e npm run build.')
    handler=partial(SimpleHTTPRequestHandler,directory=str(folder))
    try:server=ThreadingHTTPServer(('127.0.0.1',8765),handler)
    except OSError:server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    url=f'http://127.0.0.1:{server.server_port}/'
    print('\nÁgua para Todos — versão local\n'+url+'\nMantenha este terminal aberto. Para encerrar, pressione Ctrl+C.\n',flush=True)
    threading.Timer(0.7,lambda:webbrowser.open(url)).start()
    try:server.serve_forever()
    except KeyboardInterrupt:print('\nSite encerrado.')
    finally:server.server_close()

if __name__=='__main__':main()
