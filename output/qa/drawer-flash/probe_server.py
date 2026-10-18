"""Serve the real public files with read-only first-frame drawer diagnostics."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json

ROOT = Path('/Users/hakeem/Samosaman/Website/public')
PROBE = r'''<script>
(() => {
  const frames = [], transitions = [];
  let frameCount = 0, done = false;
  const start = performance.now();
  const ids = ['cart-sidebar', 'mobile-menu-overlay', 'auth-modal', 'order-layer'];
  const sample = (reason) => {
    frameCount++;
    for (const id of ids) {
      const node = document.getElementById(id);
      if (!node) continue;
      const r = node.getBoundingClientRect(), style = getComputedStyle(node);
      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.max(0, Math.min(viewportWidth, r.right) - Math.max(0, r.left));
      const height = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top));
      const hiddenAncestor = node.closest('[hidden]');
      const visible = !hiddenAncestor && width > 2 && height > 2 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .001;
      const record = {id, ms: Math.round(performance.now() - start), reason, visible,
        x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100,
        width: Math.round(r.width * 100) / 100, visibleWidth: Math.round(width * 100) / 100,
        transform: style.transform, translate: style.translate, visibility: style.visibility,
        display: style.display, opacity: style.opacity, closedClass: node.classList.contains('translate-x-full')};
      const previous = frames.findLast(item => item.id === id);
      if (!previous || ['visible','x','y','width','transform','translate','visibility','display','opacity','closedClass'].some(key => record[key] !== previous[key])) frames.push(record);
    }
  };
  for (const type of ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']) {
    document.addEventListener(type, event => {
      if (!ids.includes(event.target.id)) return;
      transitions.push({id:event.target.id, type, property:event.propertyName, ms:Math.round(performance.now() - start)});
      sample(type);
    }, true);
  }
  const tick = () => {
    if (done) return;
    sample('frame');
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const finish = () => {
    if (done) return;
    sample('settled');
    done = true;
    const drawers = ids.map(id => {
      const records = frames.filter(item => item.id === id);
      const visible = records.filter(item => item.visible);
      return {id, present:records.length > 0, flashed:visible.length > 0,
        visibleSamples:visible.length, first:records[0], peak:visible.sort((a,b) => b.visibleWidth-a.visibleWidth)[0], last:records.at(-1)};
    });
    const report = {path:location.pathname, frameCount, duration:Math.round(performance.now()-start),
      pass:drawers.every(drawer => !drawer.flashed), drawers, transitions, frames};
    const output = document.createElement('pre');
    output.id = 'drawer-flash-report';
    output.hidden = true;
    output.textContent = JSON.stringify(report);
    document.body.appendChild(output);
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(finish, 1600), {once:true});
  setTimeout(finish, 12000);
})();
</script>'''

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/':
            path = '/index.html'
        target = (ROOT / path.lstrip('/')).resolve()
        if target.is_relative_to(ROOT) and target.suffix == '.html' and target.is_file():
            critical = '<style>#cart-sidebar.translate-x-full{transform:translateX(100%)}</style>' if 'critical=1' in urlsplit(self.path).query else ''
            html = target.read_text().replace('<head>', '<head>' + PROBE + critical, 1).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return
        super().do_GET()

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
print(f'Diagnostic preview: http://127.0.0.1:{server.server_address[1]}', flush=True)
server.serve_forever()
