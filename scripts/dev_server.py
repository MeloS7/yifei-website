#!/usr/bin/env python3
"""Local-only dev server: static files + a write endpoint to toggle a
paper's read status in paper-reading/data/papers.json.

Binds to 127.0.0.1 only. The deployed static site has no such endpoint,
so the read/unread toggle in paper-reading is only ever writable here.
"""
import json
import sys
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAPERS_PATH = ROOT / "paper-reading" / "data" / "papers.json"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/api/read":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            paper_id = payload["id"]
            read = bool(payload["read"])
        except (KeyError, ValueError, json.JSONDecodeError):
            self.send_error(400, "Expected JSON body {id, read}")
            return

        papers = json.loads(PAPERS_PATH.read_text(encoding="utf-8"))
        match = next((p for p in papers if p["id"] == paper_id), None)
        if match is None:
            self.send_error(404, f"Unknown paper id {paper_id}")
            return

        match["read"] = read
        match["read_at"] = (
            datetime.now(timezone.utc).isoformat(timespec="seconds") if read else None
        )
        PAPERS_PATH.write_text(
            json.dumps(papers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

        body = json.dumps(match, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT} (POST /api/read enabled)")
    server.serve_forever()
