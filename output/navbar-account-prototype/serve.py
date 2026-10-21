"""Local prototype: three signed-in controls in the current homepage navbar.
Run: python3 output/navbar-account-prototype/serve.py
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parents[1] / 'Website' / 'public'


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def do_GET(self):
        if self.path.split('?')[0] in ('/', '/index.html'):
            source = (PUBLIC / 'index.html').read_text()
            crew = re.search(r'<section class="home-section home-team"[\s\S]*?</section>', source).group()
            page = (HERE / 'index.html').read_text().replace('<!-- CURRENT_CREW_SECTION -->', crew)
            body = page.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def translate_path(self, path):
        original = Path(super().translate_path(path))
        overlay = HERE / original.relative_to(PUBLIC)
        return str(overlay if overlay.is_file() else original)


if __name__ == '__main__':
    print('Navbar prototypes: http://127.0.0.1:4196/?variant=1', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 4196), PreviewHandler).serve_forever()
