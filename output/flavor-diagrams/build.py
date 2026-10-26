"""Build independent, offline HTML previews from the saved website component."""
from pathlib import Path
import base64
import hashlib
import html
import json
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'reference/Website/public'
FLAVORS = json.loads((ROOT / 'flavors.json').read_text())
BASELINE = dict(slug='baseline', name='Steak and Cheese', heading='Steak and Cheese.',
                caption='Minced beef, Cabot sharp white cheddar, onion, and spices.',
                image='steak-cheese-reference.webp', chutney=True)
source_page = (SOURCE / 'index.html').read_text()
start = source_page.index('<section class="home-hero"')
section = source_page[start:source_page.index('</section>', start) + len('</section>')]
home_css = (SOURCE / 'css/home.css').read_text()
diagram_css = (SOURCE / 'css/samosa-diagram.css').read_text()
source_js = (SOURCE / 'js/samosa-diagram.js').read_text()


def data_url(name):
    return 'data:image/webp;base64,' + base64.b64encode((ROOT / 'assets' / name).read_bytes()).decode()


def wrap(title, css, body, script=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{html.escape(title)} · SamosaMan preview</title>
<link rel="icon" href="data:,">
<style>:root {{ color-scheme: light; }} body {{ margin: 0; background: #f6f4ee; }}
{css}</style>
</head>
<body class="home-page">
{body}
<script>{script}</script>
</body>
</html>
'''


def build(flavor, next_flavor):
    markup = section.replace('Steak and Cheese.', html.escape(flavor['heading']))
    # Preview navigation takes the place of commerce actions. No cart or auth is loaded.
    markup = markup.replace('<button class="btn btn-order" type="button" data-open-order>Order Now</button>',
                            '<a class="btn btn-order" href="index.html">All flavors</a>')
    markup = markup.replace('<a class="btn btn-paper" href="catering.html">Catering</a>',
                            f'<a class="btn btn-paper" href="{next_flavor["slug"]}.html">Next flavor</a>')
    markup = markup.replace('Explore the Steak and Cheese filling',
                            html.escape(f'Explore the {flavor["name"]} filling', quote=True))
    markup = markup.replace('A golden, crispy Steak and Cheese samosa with a bowl of Garlic Tomato Salsa',
                            html.escape(f'A whole {flavor["name"]} samosa with Tomato Garlic Chutney', quote=True))
    script = source_js.replace(BASELINE['caption'], flavor['caption'])
    assert script.count(flavor['caption']) == 1

    if flavor['slug'] != 'baseline':
        markup = markup.replace('data-samosa-diagram hidden', 'data-samosa-diagram data-chutney="false" hidden')
        controls_start = markup.index('<div class="samosa-diagram__toggle"')
        controls_end = markup.index('<div class="samosa-diagram__caption', controls_start)
        controls = markup[controls_start:controls_end]
        choice = (ROOT / 'chutney-control.html').read_text() if flavor['chutney'] else ''
        markup = markup[:controls_start] + '<div class="samosa-diagram__options">' + choice + controls + '</div>\n' + markup[controls_end:]

    if not flavor['chutney']:
        # Apple Pie has no condiment: keep the shell/fold geometry and remove only the bowl and its control.
        markup, count = re.subn(r'<g class="samosa-diagram__piece samosa-diagram__salsa".*?</g>', '', markup, flags=re.S)
        assert count == 1
        markup, count = re.subn(r'<button class="samosa-diagram__point"[^>]*data-diagram-part="salsa".*?</button>', '', markup, flags=re.S)
        assert count == 1
        script, count = re.subn(r"^        \{ id: 'salsa'.*\n", '', script, flags=re.M)
        assert count == 1
    if flavor['slug'] != 'baseline':
        # An independent SVG image gives the no-JavaScript fallback the same bowl-free exterior.
        outline = re.search(r'<path id="diagram-samosa-outline" d="([^"]+)"', markup).group(1)
        fallback = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 0 800 650">
<defs><clipPath id="shell"><path d="{outline}"/></clipPath></defs>
<svg x="170" y="45" width="530" height="530" viewBox="0 0 960 960">
<image href="{data_url('shell.webp')}" width="960" height="960" clip-path="url(#shell)"/>
</svg></svg>'''
        fallback_url = 'data:image/svg+xml;base64,' + base64.b64encode(fallback.encode()).decode()
        fallback_alt = html.escape(f'A whole {flavor["name"]} samosa without a condiment', quote=True)
        markup, count = re.subn(r'<img class="home-hero-art" data-diagram-fallback.*?>',
                                f'<img class="home-hero-art" data-diagram-fallback src="{fallback_url}" width="800" height="650" alt="{fallback_alt}" decoding="async">',
                                markup, flags=re.S)
        assert count == 1

    if flavor['chutney'] and flavor['slug'] != 'baseline':
        markup = markup.replace('data-diagram-part="salsa"', 'data-diagram-part="salsa" hidden')
        # Arrow navigation skips the condiment point while its bowl is absent.
        script = script.replace('const next = points[(index + offsets[event.key] + points.length) % points.length];',
            'const available = points.filter((item) => !item.hidden);\n'
            '            const next = available[(available.indexOf(point) + offsets[event.key] + available.length) % available.length];')
        script = script.replace('if (!selected || controls.contains(event.target)) return;',
            "if (!selected || controls.contains(event.target) || event.target.closest('[data-condiment-option]')) return;")
        hook = '''const chutneyToggle = diagram.querySelector('[data-chutney-toggle]');
    const chutneyPoint = diagram.querySelector('[data-diagram-part="salsa"]');
    chutneyToggle.addEventListener('change', () => {
        const enabled = chutneyToggle.checked;
        if (!enabled && selected === 'salsa') leaveDetail({ restoreFocus: false });
        if (!enabled && returnFocus === chutneyPoint) returnFocus = toggle;
        diagram.dataset.chutney = String(enabled);
        chutneyPoint.hidden = !enabled;
        diagram.querySelector('[data-chutney-hint]').textContent = enabled ? 'Added to the diagram' : 'Add to the diagram';
    });

    '''
        script = script.replace("const fallback = document.querySelector('[data-diagram-fallback]');", hook + "const fallback = document.querySelector('[data-diagram-fallback]');")

    if flavor['slug'] != 'baseline':
        # iOS does not synthesize click on every noninteractive element. Accept
        # a stationary touch that began in an open detail; leave scrolls alone.
        touch_hook = '''let detailTouch = null;
    document.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch' || !event.isPrimary || !selected ||
            controls.contains(event.target) || event.target.closest('[data-condiment-option]')) return;
        detailTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }, { capture: true, passive: true });
    document.addEventListener('pointercancel', () => { detailTouch = null; }, { capture: true, passive: true });
    document.addEventListener('pointerup', (event) => {
        if (!detailTouch || event.pointerId !== detailTouch.id) return;
        const start = detailTouch;
        detailTouch = null;
        if (!selected || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 ||
            controls.contains(event.target) || event.target.closest('[data-condiment-option]')) return;
        leaveDetail({ restoreFocus: false });
    }, { capture: true, passive: true });

    '''
        script = script.replace("const fallback = document.querySelector('[data-diagram-fallback]');", touch_hook + "const fallback = document.querySelector('[data-diagram-fallback]');")

    assets = {
        'assets/home/samosa_header.webp': 'shell.webp',
        'assets/home/samosa_hero.webp?v=e7ad12fd': 'salsa.webp',
        'assets/home/steak-cheese-filling-v3.webp': flavor['image'],
    }
    for original, local in assets.items():
        markup = markup.replace(original, data_url(local))
    assert 'assets/home/' not in markup
    body = '<main class="home-frame">\n' + markup + '\n</main>'
    extra_css = (ROOT / 'preview.css').read_text() if flavor['slug'] != 'baseline' else ''
    page = wrap(flavor['name'], home_css + '\n' + diagram_css + '\n' + extra_css, body, script)
    (ROOT / f'{flavor["slug"]}.html').write_text(page)
    return dict(flavor=flavor['slug'], bytes=len(page.encode()),
                sha256=hashlib.sha256(page.encode()).hexdigest(),
                chutney=flavor['chutney'], image=flavor['image'])


def gallery():
    cards = []
    for number, flavor in enumerate(FLAVORS, 1):
        cards.append(f'''<a class="flavor-card" href="{flavor['slug']}.html">
<div class="flavor-art"><img src="{data_url(flavor['image'])}" width="400" height="400" alt="" decoding="async"></div>
<div class="flavor-copy"><span class="number">0{number}</span><h2>{html.escape(flavor['name'])}</h2>
<p>{html.escape(flavor['caption'])}</p><span class="explore">Explore the samosa <span aria-hidden="true">↗</span></span></div></a>''')
    css = '''*{box-sizing:border-box}body{color:#0c0a09;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.gallery{max-width:1200px;margin:auto;padding:64px 28px 80px}.eyebrow{font-size:12px;letter-spacing:.14em;font-weight:600;color:#68645b;text-transform:uppercase}
h1{font-size:clamp(38px,5vw,64px);font-weight:600;line-height:1.04;letter-spacing:-.045em;margin:18px 0 14px}.intro{font-size:18px;line-height:1.5;color:#68645b;margin:0 0 36px}
.flavor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.flavor-card{color:inherit;text-decoration:none;border:1px solid rgba(12,10,9,.08);border-radius:26px;background:rgba(255,255,255,.45);overflow:hidden;transition:background 160ms ease,transform 160ms ease}
.flavor-card:hover{background:rgba(255,255,255,.85);transform:translateY(-3px)}.flavor-card:focus-visible{outline:3px solid #0071e3;outline-offset:4px}
.flavor-art{height:230px;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 65%,#eae4d8,transparent 65%)}.flavor-art img{height:190px;width:190px;object-fit:contain;filter:drop-shadow(0 16px 14px rgba(75,43,16,.10))}
.flavor-copy{padding:8px 28px 28px}.number{font-size:12px;color:#777267}h2{font-size:26px;letter-spacing:-.03em;font-weight:600;margin:9px 0}.flavor-copy p{font-size:15px;color:#68645b;line-height:1.5;margin:0;min-height:46px}.explore{display:flex;justify-content:space-between;align-items:center;margin-top:24px;font-size:14px;font-weight:600;color:#0071e3}
@media(max-width:620px){.gallery{padding:36px 20px 48px}.flavor-grid{grid-template-columns:1fr}.flavor-art{height:200px}.flavor-art img{height:170px;width:170px}}
@media(prefers-reduced-motion:reduce){.flavor-card{transition:none}.flavor-card:hover{transform:none}}'''
    body = f'''<main class="gallery"><div class="eyebrow">SamosaMan · Flavor previews</div>
<h1>See what is inside.</h1><p class="intro">Select a flavor to open its interactive diagram.</p>
<div class="flavor-grid">{''.join(cards)}</div></main>'''
    (ROOT / 'index.html').write_text(wrap('Flavor diagrams', css, body))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline-only', action='store_true')
    args = parser.parse_args()
    baseline = build(BASELINE, FLAVORS[0])
    if args.baseline_only:
        print(json.dumps(baseline, indent=2))
    else:
        results = [build(f, FLAVORS[(i + 1) % len(FLAVORS)]) for i, f in enumerate(FLAVORS)]
        gallery()
        (ROOT / 'build-results.json').write_text(json.dumps(results, indent=2) + '\n')
        print(json.dumps(results, indent=2))
