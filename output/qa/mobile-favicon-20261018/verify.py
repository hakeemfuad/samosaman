from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen
from urllib.parse import urljoin
from PIL import Image

base = sys.argv[1].rstrip('/') + '/'
public = Path(__file__).resolve().parents[3] / 'Website/public'
pages = [p.name for p in sorted(public.glob('*.html')) if p.name != 'catering-order-confirmation.html']
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == 'link': self.links.append(dict(attrs))
def get(path):
    request = Request(urljoin(base, path), headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'})
    with urlopen(request, timeout=20) as response:
        return response.headers.get_content_type(), response.read()
def check_page(page):
    _, data = get(page)
    parser = Links(); parser.feed(data.decode())
    apple = [a for a in parser.links if a.get('rel') == 'apple-touch-icon']
    assert len(apple) == 1 and apple[0].get('sizes') == '180x180' and apple[0]['href'].split('?')[0] == '/apple-touch-icon.png', 'missing 180px PNG touch icon'
    assert any(a.get('rel') == 'icon' and a.get('type') == 'image/png' and a.get('sizes') == '32x32' for a in parser.links), 'missing PNG favicon'
    assert any(a.get('rel') == 'icon' and a['href'].split('?')[0] == '/favicon.ico' for a in parser.links), 'missing ICO fallback'
    assert any(a.get('rel') == 'manifest' for a in parser.links), 'missing mobile manifest'
    return page
failures = []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = [(page, pool.submit(check_page, page)) for page in pages]
    for page, future in futures:
        try: future.result()
        except Exception as error: failures.append(f'{page}: {error}')
for path, size in [('apple-touch-icon.png',180),('favicon-16x16.png',16),('favicon-32x32.png',32),('android-chrome-192x192.png',192),('android-chrome-512x512.png',512),('favicon.ico',None)]:
    try:
        mime, data = get(path)
        assert mime.startswith('image/'), f'wrong MIME type: {mime}'
        im = Image.open(BytesIO(data)); im.load()
        if size: assert im.size == (size,size), f'wrong size: {im.size}'
        else: assert {(16,16),(32,32),(48,48)} <= im.ico.sizes(), 'missing ICO sizes'
    except Exception as error: failures.append(f'{path}: {error}')
try:
    _, data = get('site.webmanifest'); manifest = json.loads(data)
    assert manifest['name'] == 'SamosaMan'
    assert {a['sizes'] for a in manifest['icons']} == {'192x192','512x512'}
    for icon in manifest['icons']:
        mime, data = get(icon['src']); assert mime == icon['type'] == 'image/png'
except Exception as error: failures.append(f'site.webmanifest: {error}')
for failure in failures: print('FAIL:', failure)
print(f'{"FAIL" if failures else "PASS"}: {len(pages)} pages and 7 icon/manifest resources at {base}')
sys.exit(bool(failures))
