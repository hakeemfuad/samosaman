from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

OVERLAY = Path(__file__).resolve().parent
SOURCE = Path('/Users/hakeem/.codex/worktrees/8cbe/Samosaman/Website/public')


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SOURCE), **kwargs)

    def translate_path(self, path):
        original = Path(super().translate_path(path))
        candidate = OVERLAY / original.relative_to(SOURCE)
        return str(candidate if candidate.is_file() else original)


ThreadingHTTPServer(('127.0.0.1', 4176), PreviewHandler).serve_forever()
