(function () {
  "use strict";

  const COLORS = ["yellow", "green", "blue", "pink"];
  const EDITABLE = ["localhost", "127.0.0.1"].includes(location.hostname);
  const params = new URLSearchParams(location.search);
  const PAPER_ID = params.get("id");

  const STR = {
    en: {
      loading: "Loading PDF…",
      noId: "No paper selected.",
      fetchFail: "Could not load the PDF. It may not have a downloadable version, or you are offline.",
      saved: "Saved",
      notePlaceholder: "Add a note…",
      delete: "Delete",
      done: "Done",
      close: "Close",
      page: (n) => `p.${n}`,
    },
    zh: {
      loading: "正在加载 PDF…",
      noId: "没有选择论文。",
      fetchFail: "无法加载 PDF。可能没有可下载的版本，或者你处于离线状态。",
      saved: "已保存",
      notePlaceholder: "写点批注…",
      delete: "删除",
      done: "完成",
      close: "关闭",
      page: (n) => `第 ${n} 页`,
    },
  };

  function clientPdfUrl(link) {
    if (!link) return null;
    if (link.indexOf("arxiv.org/abs/") !== -1) return link.replace("/abs/", "/pdf/");
    if (link.indexOf("arxiv.org/pdf/") !== -1 || /\.pdf$/i.test(link)) return link;
    if (link.indexOf("aclanthology.org/") !== -1) return link.replace(/\/$/, "") + ".pdf";
    return null;
  }
  function lang() {
    return document.documentElement.getAttribute("data-lang") === "zh" ? "zh" : "en";
  }

  let pdfDoc = null;
  let scale = 1;
  let fitScale = 1;
  let baseWidth = 0;
  let ANN = [];
  let activeColor = "yellow";
  const pageWrappers = {}; // pageNum -> wrapper element

  const viewer = document.getElementById("viewer");
  const statusEl = document.getElementById("reader-status");
  const selToolbar = document.getElementById("sel-toolbar");

  function setStatus(msg) {
    if (!msg) {
      statusEl.hidden = true;
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = msg;
  }

  function uid() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Persistence ----------
  async function saveAnnotations() {
    if (!EDITABLE) return; // public site is read-only
    try {
      await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: PAPER_ID, annotations: ANN }),
      });
    } catch (e) {
      console.error("save failed", e);
    }
  }

  async function markDeepRead() {
    if (!EDITABLE) return; // only the owner's local session records reads
    try {
      await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: PAPER_ID, read: true, deep_read: true }),
      });
    } catch (e) {
      /* non-fatal */
    }
  }

  // ---------- Load ----------
  async function init() {
    if (!PAPER_ID) {
      setStatus(STR[lang()].noId);
      return;
    }
    if (!EDITABLE) document.body.classList.add("readonly");

    // Title + link from papers.json
    let link = null;
    try {
      const papers = await (await fetch("data/papers.json", { cache: "no-store" })).json();
      const meta = papers.find((p) => p.id === PAPER_ID);
      if (meta) {
        document.getElementById("reader-title").textContent = meta.title;
        link = meta.link;
      }
    } catch (e) { /* ignore */ }

    markDeepRead();

    // Annotations come from the committed static file (works locally and on the public site).
    try {
      const store = await (await fetch("data/annotations.json", { cache: "no-store" })).json();
      ANN = Array.isArray(store[PAPER_ID]) ? store[PAPER_ID] : [];
    } catch (e) { ANN = []; }

    setStatus(STR[lang()].loading);
    // Locally: use the caching proxy. Public: fetch straight from arXiv (CORS-enabled).
    const pdfSource = EDITABLE
      ? "/api/pdf?id=" + encodeURIComponent(PAPER_ID)
      : clientPdfUrl(link);
    if (!pdfSource) {
      setStatus(STR[lang()].fetchFail);
      return;
    }
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
      const task = pdfjsLib.getDocument(pdfSource);
      pdfDoc = await task.promise;
    } catch (e) {
      console.error(e);
      setStatus(STR[lang()].fetchFail);
      return;
    }

    const first = await pdfDoc.getPage(1);
    baseWidth = first.getViewport({ scale: 1 }).width;
    const target = Math.min(Math.max(viewer.clientWidth - 48, 320), 860);
    scale = Math.max(0.5, Math.min(2, target / baseWidth));
    fitScale = scale;
    updateZoomLabel();

    await renderAll();
    renderNotesList();
  }

  async function renderAll() {
    viewer.innerHTML = "";
    for (const k in pageWrappers) delete pageWrappers[k];
    for (let n = 1; n <= pdfDoc.numPages; n++) {
      await renderPage(n);
      if (n === 1) setStatus(null); // show the first page immediately
    }
  }

  async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });

    const wrapper = document.createElement("div");
    wrapper.className = "page";
    wrapper.dataset.page = String(num);
    wrapper.style.width = Math.floor(viewport.width) + "px";
    wrapper.style.height = Math.floor(viewport.height) + "px";
    wrapper.style.setProperty("--scale-factor", String(scale));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";
    wrapper.appendChild(canvas);

    const hlLayer = document.createElement("div");
    hlLayer.className = "hl-layer";
    wrapper.appendChild(hlLayer);

    const textLayerDiv = document.createElement("div");
    textLayerDiv.className = "textLayer";
    textLayerDiv.style.width = Math.floor(viewport.width) + "px";
    textLayerDiv.style.height = Math.floor(viewport.height) + "px";
    textLayerDiv.style.setProperty("--scale-factor", String(scale));
    wrapper.appendChild(textLayerDiv);

    viewer.appendChild(wrapper);
    pageWrappers[num] = wrapper;

    await page.render({
      canvasContext: ctx,
      viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
    }).promise;

    // Build the selectable text layer without blocking the page loop.
    page.getTextContent().then((textContent) => {
      return pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport,
        textDivs: [],
      }).promise;
    }).catch(() => { /* text layer optional */ });

    paintPage(num);
  }

  // ---------- Highlight painting ----------
  function paintPage(num) {
    const wrapper = pageWrappers[num];
    if (!wrapper) return;
    const layer = wrapper.querySelector(".hl-layer");
    layer.innerHTML = "";
    ANN.filter((a) => a.page === num).forEach((a) => {
      a.rects.forEach((r) => {
        const d = document.createElement("div");
        d.className = "hl-rect hl-" + a.color + (a.note ? " has-note" : "");
        d.style.left = r.x * 100 + "%";
        d.style.top = r.y * 100 + "%";
        d.style.width = r.w * 100 + "%";
        d.style.height = r.h * 100 + "%";
        layer.appendChild(d);
      });
    });
  }

  function repaintAll() {
    Object.keys(pageWrappers).forEach((n) => paintPage(Number(n)));
  }

  // ---------- Selection -> new highlight ----------
  let pending = null; // {groups: {pageNum: rects[]}, text}

  function pageWrapperAt(x, y) {
    for (const n in pageWrappers) {
      const rc = pageWrappers[n].getBoundingClientRect();
      if (x >= rc.left && x <= rc.right && y >= rc.top && y <= rc.bottom) {
        return { num: Number(n), rect: rc };
      }
    }
    return null;
  }

  function captureSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) return null;
    const rects = range.getClientRects();
    const groups = {};
    for (const rc of rects) {
      if (rc.width < 1 || rc.height < 1) continue;
      const cx = rc.left + rc.width / 2;
      const cy = rc.top + rc.height / 2;
      const pg = pageWrapperAt(cx, cy);
      if (!pg) continue;
      const norm = {
        x: (rc.left - pg.rect.left) / pg.rect.width,
        y: (rc.top - pg.rect.top) / pg.rect.height,
        w: rc.width / pg.rect.width,
        h: rc.height / pg.rect.height,
      };
      (groups[pg.num] = groups[pg.num] || []).push(norm);
    }
    if (Object.keys(groups).length === 0) return null;
    return { groups, text };
  }

  function showSelToolbar() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      hideSelToolbar();
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width) { hideSelToolbar(); return; }
    pending = captureSelection();
    if (!pending) { hideSelToolbar(); return; }
    selToolbar.hidden = false;
    selToolbar.style.position = "fixed";
    const tb = selToolbar.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tb.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tb.width - 8));
    let top = rect.top - tb.height - 8;
    if (top < 8) top = rect.bottom + 8;
    selToolbar.style.left = left + "px";
    selToolbar.style.top = top + "px";
  }

  function hideSelToolbar() {
    selToolbar.hidden = true;
    pending = null;
  }

  function createHighlight(color) {
    if (!pending) return;
    const created = new Date().toISOString();
    Object.keys(pending.groups).forEach((num) => {
      ANN.push({
        id: uid(),
        page: Number(num),
        color,
        rects: pending.groups[num],
        text: pending.text,
        note: "",
        created_at: created,
      });
      paintPage(Number(num));
    });
    saveAnnotations();
    renderNotesList();
    window.getSelection().removeAllRanges();
    hideSelToolbar();
    flashSaved();
  }

  // ---------- Click existing highlight -> note popover ----------
  let openPop = null;

  function annotationAt(x, y) {
    const pg = pageWrapperAt(x, y);
    if (!pg) return null;
    const nx = (x - pg.rect.left) / pg.rect.width;
    const ny = (y - pg.rect.top) / pg.rect.height;
    // topmost (last drawn) first
    const onPage = ANN.filter((a) => a.page === pg.num);
    for (let i = onPage.length - 1; i >= 0; i--) {
      const a = onPage[i];
      if (a.rects.some((r) => nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h)) {
        return a;
      }
    }
    return null;
  }

  function closePop() {
    if (openPop) { openPop.remove(); openPop = null; }
  }

  function openNotePopover(a, clientX, clientY) {
    closePop();
    const L = STR[lang()];
    const pop = document.createElement("div");
    pop.className = "note-pop";
    pop.style.position = "fixed";

    if (!EDITABLE) {
      // Read-only view: quote + note text (if any), nothing editable.
      pop.innerHTML = '<div class="note-quote"></div><div class="note-ro"></div>' +
        '<div class="note-pop-row"><span></span>' +
        '<div class="note-pop-actions"><button type="button" class="link done"></button></div></div>';
      pop.querySelector(".note-quote").textContent = a.text;
      const ro = pop.querySelector(".note-ro");
      if (a.note) { ro.textContent = a.note; } else { ro.remove(); }
      const done = pop.querySelector(".done");
      done.textContent = L.close;
      done.addEventListener("click", closePop);
      document.body.appendChild(pop);
      const pr = pop.getBoundingClientRect();
      pop.style.left = Math.max(12, Math.min(clientX, window.innerWidth - pr.width - 12)) + "px";
      pop.style.top = Math.max(12, Math.min(clientY + 10, window.innerHeight - pr.height - 12)) + "px";
      openPop = pop;
      return;
    }

    pop.innerHTML =
      '<div class="note-quote"></div>' +
      '<textarea></textarea>' +
      '<div class="note-pop-row">' +
      '<div class="note-pop-colors"></div>' +
      '<div class="note-pop-actions">' +
      '<button type="button" class="link del"></button>' +
      '<button type="button" class="link done"></button>' +
      "</div></div>";
    pop.querySelector(".note-quote").textContent = a.text;
    const ta = pop.querySelector("textarea");
    ta.placeholder = L.notePlaceholder;
    ta.value = a.note || "";
    ta.addEventListener("input", () => {
      a.note = ta.value;
      paintPage(a.page);
    });

    const colorsWrap = pop.querySelector(".note-pop-colors");
    COLORS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sw" + (a.color === c ? " active" : "");
      b.style.setProperty("--sw", swatchHex(c));
      b.addEventListener("click", () => {
        a.color = c;
        colorsWrap.querySelectorAll(".sw").forEach((s) => s.classList.remove("active"));
        b.classList.add("active");
        paintPage(a.page);
      });
      colorsWrap.appendChild(b);
    });

    const del = pop.querySelector(".del");
    del.textContent = L.delete;
    del.addEventListener("click", () => {
      ANN = ANN.filter((x) => x.id !== a.id);
      paintPage(a.page);
      saveAnnotations();
      renderNotesList();
      closePop();
    });
    const done = pop.querySelector(".done");
    done.textContent = L.done;
    done.addEventListener("click", () => {
      saveAnnotations();
      renderNotesList();
      closePop();
      flashSaved();
    });

    document.body.appendChild(pop);
    const pr = pop.getBoundingClientRect();
    let left = Math.min(clientX, window.innerWidth - pr.width - 12);
    let top = Math.min(clientY + 10, window.innerHeight - pr.height - 12);
    pop.style.left = Math.max(12, left) + "px";
    pop.style.top = Math.max(12, top) + "px";
    openPop = pop;
    ta.focus();
  }

  function swatchHex(c) {
    return { yellow: "#f2c744", green: "#7bc47f", blue: "#5aa9e6", pink: "#e6799f" }[c];
  }

  // ---------- Notes side panel ----------
  function renderNotesList() {
    const list = document.getElementById("notes-list");
    const empty = document.getElementById("notes-empty");
    const L = STR[lang()];
    document.getElementById("notes-count").textContent = String(ANN.length);
    list.innerHTML = "";
    empty.hidden = ANN.length > 0;
    const sorted = ANN.slice().sort((a, b) => a.page - b.page || (a.rects[0].y - b.rects[0].y));
    sorted.forEach((a) => {
      const item = document.createElement("div");
      item.className = "note-item";
      item.innerHTML =
        '<div class="q"><span class="swatch" style="background:' + swatchHex(a.color) + '"></span>' +
        escapeHtml(a.text) + "</div>" +
        (a.note ? '<div class="txt">' + escapeHtml(a.note) + "</div>" : "") +
        '<div class="pg">' + L.page(a.page) + "</div>";
      item.addEventListener("click", () => {
        const wrapper = pageWrappers[a.page];
        if (wrapper) {
          wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
          const rc = wrapper.getBoundingClientRect();
          setTimeout(() => {
            const cx = rc.left + a.rects[0].x * rc.width + 20;
            const cy = window.innerHeight / 2;
            openNotePopover(a, cx, cy);
          }, 350);
        }
      });
      list.appendChild(item);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  let savedTimer = null;
  function flashSaved() {
    setStatus(STR[lang()].saved);
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => setStatus(null), 1000);
  }

  // ---------- Zoom ----------
  function updateZoomLabel() {
    const pct = fitScale > 0 ? Math.round((scale / fitScale) * 100) : 100;
    document.getElementById("zoom-level").textContent = (isFinite(pct) ? pct : 100) + "%";
  }
  async function setZoom(mult) {
    scale = Math.max(0.4, Math.min(3, scale * mult));
    updateZoomLabel();
    await renderAll();
  }

  // ---------- Events ----------
  // Highlight creation (owner-only). Clicking an existing highlight to view/edit
  // its note works in both modes.
  if (EDITABLE) {
    viewer.addEventListener("mouseup", () => setTimeout(showSelToolbar, 0));

    selToolbar.querySelectorAll(".sw").forEach((sw) => {
      sw.addEventListener("mousedown", (e) => e.preventDefault());
      sw.addEventListener("click", () => createHighlight(sw.dataset.color));
    });

    const palette = document.getElementById("reader-palette");
    palette.querySelectorAll(".sw").forEach((sw) => {
      if (sw.dataset.color === activeColor) sw.classList.add("active");
      sw.addEventListener("click", () => {
        activeColor = sw.dataset.color;
        palette.querySelectorAll(".sw").forEach((s) => s.classList.remove("active"));
        sw.classList.add("active");
      });
    });

    // Hide the floating toolbar as soon as the selection collapses (e.g. the
    // user clicks or double-clicks elsewhere without picking a colour).
    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) hideSelToolbar();
    });
    document.addEventListener("mousedown", (e) => {
      if (!selToolbar.hidden && !selToolbar.contains(e.target)) hideSelToolbar();
    });
    document.addEventListener("scroll", hideSelToolbar, true);
  }

  viewer.addEventListener("click", (e) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // was a text selection
    if (selToolbar.contains(e.target)) return;
    const a = annotationAt(e.clientX, e.clientY);
    if (a) {
      e.preventDefault();
      openNotePopover(a, e.clientX, e.clientY);
    }
  });

  document.getElementById("zoom-in").addEventListener("click", () => setZoom(1.15));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(1 / 1.15));

  const notesBtn = document.getElementById("notes-btn");
  notesBtn.addEventListener("click", () => {
    const panel = document.getElementById("notes-panel");
    panel.hidden = !panel.hidden;
    notesBtn.classList.toggle("active", !panel.hidden);
  });

  document.addEventListener("mousedown", (e) => {
    if (openPop && !openPop.contains(e.target)) {
      const a = annotationAt(e.clientX, e.clientY);
      if (!a) closePop();
    }
  });

  document.getElementById("lang-toggle") &&
    document.getElementById("lang-toggle").addEventListener("click", () => setTimeout(renderNotesList, 0));

  init();
})();
