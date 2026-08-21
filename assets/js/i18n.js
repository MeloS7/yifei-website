(function () {
  var STORAGE_KEY = "site-lang";
  var root = document.documentElement;

  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  function detectDefault() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "en";
  }

  setLang(detectDefault());

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("lang-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      var current = root.getAttribute("data-lang");
      setLang(current === "en" ? "zh" : "en");
    });
  });
})();
