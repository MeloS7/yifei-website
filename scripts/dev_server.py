#!/usr/bin/env python3
"""Local-only dev server: static files + write endpoints to update a
paper's read status and interest score in paper-reading/data/papers.json.

Binds to 127.0.0.1 only. The deployed static site has no such endpoints,
so the read/unread toggle and interest rating in paper-reading are only
ever writable here.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
PAPERS_PATH = ROOT / "paper-reading" / "data" / "papers.json"
ANNOTATIONS_PATH = ROOT / "paper-reading" / "data" / "annotations.json"
INTEREST_PATH = ROOT / "paper-reading" / "data" / "interest.json"
PDF_DIR = ROOT / "paper-reading" / "pdfs"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173


def pdf_url_for(link):
    """Best-effort map a paper's landing-page link to a downloadable PDF URL."""
    if not link:
        return None
    if "arxiv.org/abs/" in link:
        return link.replace("/abs/", "/pdf/")
    if "arxiv.org/pdf/" in link or link.lower().endswith(".pdf"):
        return link
    if "aclanthology.org/" in link:
        return link.rstrip("/") + ".pdf"
    return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Never let the browser cache local dev assets, so edits show up on reload.
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/pdf":
            self._handle_pdf(parse_qs(parsed.query))
        elif parsed.path == "/api/annotations":
            self._handle_get_annotations(parse_qs(parsed.query))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/read":
            self._handle_read()
        elif self.path == "/api/interest":
            self._handle_interest()
        elif self.path == "/api/annotations":
            self._handle_save_annotations()
        else:
            self.send_error(404)

    def _read_payload(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def _load_match(self, paper_id):
        papers = json.loads(PAPERS_PATH.read_text(encoding="utf-8"))
        match = next((p for p in papers if p["id"] == paper_id), None)
        return papers, match

    def _save_and_respond(self, papers, match):
        PAPERS_PATH.write_text(
            json.dumps(papers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        body = json.dumps(match, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_read(self):
        try:
            payload = self._read_payload()
            paper_id = payload["id"]
            read = bool(payload["read"])
            deep = bool(payload.get("deep_read", False))
        except (KeyError, ValueError, json.JSONDecodeError):
            self.send_error(400, "Expected JSON body {id, read, deep_read?}")
            return

        papers, match = self._load_match(paper_id)
        if match is None:
            self.send_error(404, f"Unknown paper id {paper_id}")
            return

        # Interlock: deep read implies brief read; not read implies not deep.
        if deep:
            read = True
        if not read:
            deep = False

        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if read and not match.get("read"):
            match["read_at"] = now
        elif not read:
            match["read_at"] = None
        match["read"] = read

        if deep and not match.get("deep_read"):
            match["deep_read_at"] = now
        elif not deep:
            match["deep_read_at"] = None
        match["deep_read"] = deep

        self._save_and_respond(papers, match)

    def _handle_interest(self):
        # Interest ratings are private: stored in a local-only, gitignored file so
        # they never reach the committed papers.json or the public site.
        try:
            payload = self._read_payload()
            paper_id = payload["id"]
            interest = payload["interest"]
            if interest is not None:
                interest = int(interest)
                if not 1 <= interest <= 5:
                    raise ValueError("interest out of range")
        except (KeyError, ValueError, TypeError, json.JSONDecodeError):
            self.send_error(400, "Expected JSON body {id, interest: 1-5 or null}")
            return

        _, match = self._load_match(paper_id)
        if match is None:
            self.send_error(404, f"Unknown paper id {paper_id}")
            return

        store = {}
        if INTEREST_PATH.exists():
            try:
                store = json.loads(INTEREST_PATH.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                store = {}
        if interest is None:
            store.pop(paper_id, None)
        else:
            store[paper_id] = interest
        INTEREST_PATH.write_text(
            json.dumps(store, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        body = json.dumps({"id": paper_id, "interest": interest}, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ---------- Full-text reader: PDF proxy + annotations ----------

    def _handle_pdf(self, query):
        paper_id = (query.get("id") or [""])[0]
        if not paper_id:
            self.send_error(400, "Expected ?id=<paper id>")
            return
        _, match = self._load_match(paper_id)
        if match is None:
            self.send_error(404, f"Unknown paper id {paper_id}")
            return

        PDF_DIR.mkdir(parents=True, exist_ok=True)
        cache = PDF_DIR / f"{paper_id}.pdf"

        if not cache.exists():
            url = pdf_url_for(match.get("link"))
            if not url:
                self.send_error(422, f"No downloadable PDF URL for {match.get('link')}")
                return
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "paper-reading-local/1.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
            except Exception as exc:  # noqa: BLE001 - report any fetch failure to the client
                self.send_error(502, f"Failed to fetch PDF: {exc}")
                return
            if not data.startswith(b"%PDF"):
                self.send_error(502, "Fetched resource is not a PDF")
                return
            cache.write_bytes(data)

        body = cache.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _load_annotations(self):
        if ANNOTATIONS_PATH.exists():
            try:
                return json.loads(ANNOTATIONS_PATH.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                return {}
        return {}

    def _handle_get_annotations(self, query):
        paper_id = (query.get("id") or [""])[0]
        store = self._load_annotations()
        items = store.get(paper_id, []) if paper_id else store
        body = json.dumps(items, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_save_annotations(self):
        try:
            payload = self._read_payload()
            paper_id = payload["id"]
            annotations = payload["annotations"]
            if not isinstance(annotations, list):
                raise ValueError("annotations must be a list")
        except (KeyError, ValueError, json.JSONDecodeError):
            self.send_error(400, "Expected JSON body {id, annotations: [...]}")
            return

        store = self._load_annotations()
        if annotations:
            store[paper_id] = annotations
        else:
            store.pop(paper_id, None)
        ANNOTATIONS_PATH.write_text(
            json.dumps(store, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        body = json.dumps({"ok": True, "count": len(annotations)}).encode("utf-8")
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
