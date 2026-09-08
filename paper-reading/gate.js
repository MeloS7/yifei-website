(function () {
  // Lightweight client-side gate for the Paper Reading section. This is a
  // deterrent, not real security: the whole site is a public static repo on
  // GitHub Pages, so anyone who inspects this file or fetches data/papers.json
  // directly can bypass it. It only keeps the page from being casually opened
  // or indexed by search engines.
  var STORAGE_KEY = "pr_unlocked_v1";
  // SHA-256 hex digests of accepted passwords. Never store plaintext here.
  var ALLOWED_HASHES = [
    "0e4f8d6e57456270309a0628d9b9b2c7ab8882d2b319ab4995f33f8a25833dac",
    "4489a07883e4633debd197413a20990dbd7c14bcb36c683034b7c8a51a26682c"
  ];

  if (localStorage.getItem(STORAGE_KEY) === "1") return;

  var overlay = document.createElement("div");
  overlay.id = "pr-gate";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#111;color:#eee;" +
    "display:flex;align-items:center;justify-content:center;" +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";
  overlay.innerHTML =
    '<form id="pr-gate-form" style="width:280px;text-align:center;">' +
    '<p style="font-size:14px;margin:0 0 12px;color:#ccc;">This page is private.<br>此页面需要密码。</p>' +
    '<input id="pr-gate-input" type="password" autocomplete="off" ' +
    'style="width:100%;box-sizing:border-box;font-size:14px;padding:8px 10px;' +
    'border-radius:7px;border:1px solid #444;background:#1c1c1c;color:#eee;" />' +
    '<p id="pr-gate-error" style="font-size:12px;color:#e5484d;min-height:16px;margin:8px 0 0;"></p>' +
    '<button type="submit" style="margin-top:8px;font:inherit;font-size:13px;' +
    'background:#3a3a3a;color:#eee;border:1px solid #555;border-radius:999px;' +
    'padding:6px 18px;cursor:pointer;">Enter</button>' +
    "</form>";

  // Hide the real content behind the overlay until unlocked. documentElement
  // stays visible (so the overlay itself renders); we blank the body instead.
  var hideStyle = document.createElement("style");
  hideStyle.textContent = "body > *:not(#pr-gate) { visibility: hidden; }";
  document.head.appendChild(hideStyle);

  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(overlay);
    var input = document.getElementById("pr-gate-input");
    var error = document.getElementById("pr-gate-error");
    input.focus();

    document.getElementById("pr-gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input.value;
      if (!value) {
        error.textContent = "Enter a password. 请输入密码。";
        return;
      }
      var bytes = new TextEncoder().encode(value);
      crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
        var hex = Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, "0"); })
          .join("");
        if (ALLOWED_HASHES.indexOf(hex) !== -1) {
          localStorage.setItem(STORAGE_KEY, "1");
          hideStyle.remove();
          overlay.remove();
        } else {
          error.textContent = "Wrong password. 密码错误。";
          input.value = "";
          input.focus();
        }
      });
    });
  });
})();
