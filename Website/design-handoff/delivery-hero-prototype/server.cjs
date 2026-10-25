// Local-only prototype: compare three hero layouts within the current homepage.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const publicRoot = path.resolve(__dirname, '../../public');
const port = Number(process.env.DELIVERY_PREVIEW_PORT || 4195);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json', '.webmanifest':'application/manifest+json' };

const artwork = {
  pairing: { file: 'pairing.png', width: 1942, height: 809, alt: 'SamosaMan mascot × DoorDash' },
  bag: { file: 'hero.png', width: 1961, height: 1026, alt: 'The SamosaMan logo holds a red DoorDash bag with navy straps and orange samosas spilling to the left' }
};
const hero = (key) => {
  const art = artwork[key];
  return `
        <section class="delivery-hero" data-delivery-variant="A" data-delivery-art="${key}" aria-labelledby="delivery-heading">
          <div class="delivery-hero__inner">
            <div class="delivery-hero__art">
              <img src="/__delivery/${art.file}" width="${art.width}" height="${art.height}" alt="${art.alt}" fetchpriority="high" loading="eager" decoding="async">
            </div>
            <div class="delivery-hero__copy">
              <p class="delivery-hero__eyebrow">Delivery with DoorDash</p>
              <h1 id="delivery-heading">Now on DoorDash.</h1>
              <p class="delivery-hero__description">Your favorite samosas. Right to your door.</p>
              <div class="home-actions">
                <button class="btn btn-order" type="button" data-open-order>Order Now</button>
                <a class="btn btn-glass" href="burlington.html">View menu <span aria-hidden="true">→</span></a>
              </div>
            </div>
          </div>
        </section>`;
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const requestedArt = url.searchParams.get('art') || process.env.DELIVERY_PREVIEW_ART;
      const artKey = requestedArt === 'bag' ? 'bag' : 'pairing';
      let html = await fs.readFile(path.join(publicRoot, 'index.html'), 'utf8');
      html = html.replace(/    <!-- Google tag[\s\S]*?(?=    <meta charset)/, '    <!-- Analytics omitted from this local design preview. -->\n');
      html = html.replace(/<title>.*?<\/title>/, '<title>SamosaMan delivery hero — local preview</title>');
      html = html.replace(/<meta name="viewport"[^>]+>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
      html = html.replace(/<link rel="preload" as="image"[^>]+>/, `<link rel="preload" as="image" href="/__delivery/${artwork[artKey].file}" fetchpriority="high">`);
      html = html.replace(/        <section class="home-fresh"[\s\S]*?<\/section>/, (freshSection) =>
        `${hero(artKey)}\n\n${freshSection.replace(/<(\/?)h1\b/g, '<$1h2')}`);
      html = html.replace(/<p class="home-faq-label">Frequently asked questions<\/p>\s*<h2 id="faq-heading">Got questions\?<\/h2>/,
        '<p class="home-faq-label" id="faq-heading">Frequently asked questions</p>');
      html = html.replace('</head>', '<link rel="stylesheet" href="/__delivery/preview.css">\n<link rel="stylesheet" href="/__delivery/apple-layout.css">\n</head>');
      html = html.replace('</body>', '<script src="/__delivery/preview.js"></script>\n</body>');
      res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control':'no-store' });
      res.end(html);
      return;
    }
    const isPreviewAsset = url.pathname.startsWith('/__delivery/');
    const root = isPreviewAsset ? __dirname : publicRoot;
    const requested = isPreviewAsset ? url.pathname.slice('/__delivery/'.length) : url.pathname.slice(1);
    const target = path.resolve(root, decodeURIComponent(requested));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const data = await fs.readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(data);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Delivery hero preview: http://127.0.0.1:${port}/?variant=A`));
