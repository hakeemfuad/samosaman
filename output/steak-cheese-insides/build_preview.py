"""Package the isolated preview; never reads or writes the website sources."""
from pathlib import Path
import base64

ROOT = Path(__file__).resolve().parent
INLINE = Path('/Users/hakeem/.codex/visualizations/2026/10/18/01a1508f-ae84-7a01-841c-f07a4b12b42b/steak-cheese-insides.html')
fragment = (ROOT / 'preview.fragment.html').read_text()
for name in ['samosa-shell.webp', 'steak-cheese-filling.webp']:
    data = base64.b64encode((ROOT / 'assets' / name).read_bytes()).decode('ascii')
    fragment = fragment.replace(f'assets/{name}', f'data:image/webp;base64,{data}')
assert len(fragment.encode()) < 1_000_000
INLINE.write_text(fragment)
head = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Steak and Cheese · See insides preview</title>
  <link rel="icon" href="data:,">
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; background: light-dark(#f6f4ee, #211e19); }
    main { min-height: 100svh; box-sizing: border-box; display: grid; place-items: center; padding: 12px 0; }
    main > section { box-sizing: border-box; }
    button { cursor: pointer; }
  </style>
</head>
<body><main>
'''
(ROOT / 'index.html').write_text(head + fragment + '\n</main></body></html>\n')
print(f'Self-contained preview: {ROOT / "index.html"}')
print(f'Inline preview: {INLINE}')
print(f'Inline bytes: {len(fragment.encode()):,}')
