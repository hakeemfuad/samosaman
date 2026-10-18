"""Copy the Punjabi diagram into an isolated preview, changing only its filling.

Website and Flutter sources are read-only. All generated files remain in this
preview directory or the existing thread-scoped visualization directory.
"""
from pathlib import Path
import base64
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parents[1] / 'Website' / 'public'
INLINE = Path('/Users/hakeem/.codex/visualizations/2026/10/18/01a1508f-ae84-7a01-841c-f07a4b12b42b/steak-cheese-insides.html')
PUNJABI_COPY = 'Our Punjabi filling: spiced potatoes, green peas, and herbs.'
STEAK_COPY = 'Our Steak and Cheese filling: tender minced beef, sharp cheese, onion, and spices.'

page_source = (SOURCE / 'index.html').read_text()
start = page_source.index('<div class="samosa-diagram" data-samosa-diagram hidden>')
component = page_source[start:page_source.index('</section>', start)].rstrip()
home_css = (SOURCE / 'css/home.css').read_text()
diagram_css = (SOURCE / 'css/samosa-diagram.css').read_text()
diagram_js = (SOURCE / 'js/samosa-diagram.js').read_text()
assert diagram_js.count(PUNJABI_COPY) == 1

for source, destination in [
    ('assets/home/samosa_header.webp', 'assets/samosa-shell.webp'),
    ('assets/home/samosa_hero.webp', 'assets/samosa-salsa.webp'),
    ('assets/home/samosa-filling-v1.webp', 'assets/punjabi-filling.webp'),
    ('css/home.css', 'assets/home-reference.css'),
    ('css/samosa-diagram.css', 'assets/samosa-diagram.css'),
]:
    shutil.copyfile(SOURCE / source, ROOT / destination)

reference = ROOT / 'reference'
reference.mkdir(exist_ok=True)
(reference / 'punjabi-diagram.html').write_text(component + '\n')
(reference / 'punjabi-diagram.js').write_text(diagram_js)
steak_js = diagram_js.replace(PUNJABI_COPY, STEAK_COPY)
(ROOT / 'assets/samosa-diagram.js').write_text(steak_js)

# Keep all source markup, positioning, icons and geometry. These are the only
# product substitutions; asset URLs are remapped for the isolated package.
steak_component = component.replace(
    'assets/home/samosa-filling-v1.webp', 'assets/steak-cheese-filling-less-cheese-v3.webp'
).replace('Explore the Punjabi filling', 'Explore the Steak and Cheese filling')
assert steak_component.replace(
    'assets/steak-cheese-filling-less-cheese-v3.webp', 'assets/home/samosa-filling-v1.webp'
).replace('Explore the Steak and Cheese filling', 'Explore the Punjabi filling') == component
assert steak_js.replace(STEAK_COPY, PUNJABI_COPY) == diagram_js

shell = (ROOT / 'preview-shell.html').read_text()

def make_fragment(markup, script, embed):
    # Scope the source initializer to this standalone root. Event handlers,
    # state transitions and document-level outside-click handling stay intact.
    script = script.replace(
        "const diagram = document.querySelector('[data-samosa-diagram]');",
        "const root = document.getElementById('steak-insides-preview');\n"
        "    const diagram = root.querySelector('[data-samosa-diagram]');"
    ).replace("document.querySelector('[data-diagram-fallback]')", "root.querySelector('[data-diagram-fallback]')")
    fragment = shell.replace('<!-- HOME_CSS -->', home_css).replace('<!-- DIAGRAM_CSS -->', diagram_css)
    fragment = fragment.replace('<!-- DIAGRAM_MARKUP -->', markup).replace('/* DIAGRAM_SCRIPT */', script)
    assets = {
        'assets/home/samosa_header.webp': 'assets/samosa-shell.webp',
        'assets/home/samosa_hero.webp?v=e7ad12fd': 'assets/samosa-salsa.webp',
        'assets/home/samosa-filling-v1.webp': 'assets/punjabi-filling.webp',
        'assets/steak-cheese-filling-less-cheese-v3.webp': 'assets/steak-cheese-filling-less-cheese-v3.webp',
    }
    for original, copied in assets.items():
        if embed:
            data = base64.b64encode((ROOT / copied).read_bytes()).decode('ascii')
            replacement = f'data:image/webp;base64,{data}'
        else:
            replacement = copied
        fragment = fragment.replace(original, replacement)
    return fragment

head = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Steak and Cheese · See inside preview</title>
  <link rel="icon" href="data:,">
  <style>:root { color-scheme: light; } body { margin: 0; background: #f6f4ee; }</style>
</head>
<body>
'''
tail = '\n</body></html>\n'
fragment = make_fragment(steak_component, steak_js, embed=True)
assert len(fragment.encode()) < 1_000_000, 'Inline preview exceeds the renderer size limit'
(ROOT / 'preview.fragment.html').write_text(make_fragment(steak_component, steak_js, embed=False))
(ROOT / 'index.html').write_text(head + fragment + tail)
INLINE.write_text(fragment)
(reference / 'punjabi.html').write_text(head + make_fragment(component, diagram_js, embed=True) + tail)

proof = {
    'source': str(SOURCE),
    'diagram_css_identical': (ROOT / 'assets/samosa-diagram.css').read_bytes() == (SOURCE / 'css/samosa-diagram.css').read_bytes(),
    'home_css_identical': (ROOT / 'assets/home-reference.css').read_bytes() == (SOURCE / 'css/home.css').read_bytes(),
    'behavior_identical_except_filling_description': steak_js.replace(STEAK_COPY, PUNJABI_COPY) == diagram_js,
    'markup_identical_except_filling_asset_and_accessible_label': True,
    'shell_identical': (ROOT / 'assets/samosa-shell.webp').read_bytes() == (SOURCE / 'assets/home/samosa_header.webp').read_bytes(),
    'salsa_identical': (ROOT / 'assets/samosa-salsa.webp').read_bytes() == (SOURCE / 'assets/home/samosa_hero.webp').read_bytes(),
    'source_sha256': {name: hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() for name in ['index.html', 'css/home.css', 'css/samosa-diagram.css', 'js/samosa-diagram.js']},
    'inline_bytes': len(fragment.encode()),
}
(ROOT / 'parity-source-verification.json').write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps(proof, indent=2))
