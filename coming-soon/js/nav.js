// CIBERAN · menú móvil: abre/cierra, Escape y clic fuera lo cierran.
(function () {
  "use strict";
  var btn = document.querySelector(".nav-toggle");
  var menu = document.getElementById("menu");
  if (!btn || !menu) return;
  var mq = window.matchMedia("(max-width: 760px)");
  function set(open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    if (mq.matches) menu.hidden = !open;
    else menu.hidden = false;
  }
  set(false);
  btn.addEventListener("click", function () {
    set(btn.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { set(false); btn.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (btn.getAttribute("aria-expanded") === "true" && !menu.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  mq.addEventListener("change", function () { set(false); });
})();
