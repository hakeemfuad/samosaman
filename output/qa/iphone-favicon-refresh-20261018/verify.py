"""Check icon delivery. This does not test the iPhone's saved tab icon."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import sys
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree
from PIL import Image

base = sys.argv[1].rstrip('/') + '/'
qa = Path(__file__).resolve().parent
record = json.loads((qa / 'source-verification.json').read_text())
public = qa.parents[2] / 'Website/public'
expected = set(record['links'].values())

class Icons(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and 'icon' in attrs.get('rel', ''):
            self.links.append(attrs)

def get(path):
    request = Request(urljoin(base, path), headers={
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1',
        'Cache-Control': 'no-cache',
    })
    with urlopen(request, timeout=20) as response:
        return response.headers.get_content_type(), response.read()

def check_page(entry):
    _, data = get(entry['page'])
    parser = Icons()
    parser.feed(data.decode())
    assert len(parser.links) == 5
    assert {link['href'] for link in parser.links} == expected
    apple = [link for link in parser.links if link['rel'] == 'apple-touch-icon']
    assert len(apple) == 1 and apple[0]['sizes'] == '180x180'
    return entry['page']

with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(check_page, record['pages']))
for path in sorted(expected):
    mime, data = get(path)
    assert mime.startswith('image/'), (path, mime)
    assert data == (public / path.lstrip('/')).read_bytes(), path
    assert sha256(data).hexdigest()[:12] in path
    assert not urlparse(path).query
    if path.endswith('.svg'):
        assert ElementTree.fromstring(data).tag.endswith('svg')
    else:
        image = Image.open(BytesIO(data))
        image.load()
        if path.endswith('.ico'):
            assert {(16, 16), (32, 32), (48, 48)} <= image.ico.sizes()
        else:
            size = 180 if 'apple-touch' in path else (16 if '16x16' in path else 32)
            assert image.size == (size, size), (path, image.size)
print(f'PASS: {len(record["pages"])} pages and {len(expected)} new icon paths at {base}')
print('Physical iPhone tab icon: not verified by this check.')
