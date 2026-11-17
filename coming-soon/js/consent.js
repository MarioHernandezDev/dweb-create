// CIBERAN · consentimiento de cookies y carga de Google Tag Manager.
//
// Funcionamiento («consentimiento básico» de Consent Mode v2):
//  - Antes de que el visitante elija, NO se carga ningún script de Google ni se crea
//    ninguna cookie. Solo se declara el estado por defecto «denegado».
//  - Si acepta la analítica, se concede analytics_storage y se carga GTM.
//  - Si rechaza (o no responde), GTM no se carga nunca.
//  - La publicidad (ad_storage, ad_user_data, ad_personalization) se queda siempre denegada.
//  - La elección se guarda en localStorage (almacenamiento técnico, exento) 12 meses.
(function () {
  "use strict";

  var GTM_ID = "GTM-WNBKBFNZ";
  var KEY = "ciberan-consent";
  var VERSION = 1;
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  // Estado por defecto: todo denegado, antes de cualquier carga de GTM.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied"
  });

  function readChoice() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== VERSION || typeof data.analytics !== "boolean") return null;
      if (typeof data.ts !== "number" || Date.now() - data.ts > MAX_AGE_MS) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function saveChoice(analytics) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: analytics, ts: Date.now() }));
    } catch (e) {
      /* sin almacenamiento: la elección vale solo para esta visita */
    }
  }

  var gtmLoaded = false;
  function loadGtm() {
    if (gtmLoaded) return;
    gtmLoaded = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    document.head.appendChild(s);
  }

  // Borra las cookies de Google Analytics (_ga, _ga_XXXX, _gid, _gat…) del dominio.
  function deleteAnalyticsCookies() {
    var host = window.location.hostname;
    var parts = host.split(".");
    var domains = ["", host];
    for (var i = 1; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));
    domains.push("." + host);
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (!/^(_ga|_gid|_gat|_gcl)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie =
          name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
      });
    });
  }

  var banner = null;
  function closeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function choose(analytics) {
    var previous = readChoice();
    saveChoice(analytics);
    closeBanner();
    if (analytics) {
      loadGtm();
    } else {
      gtag("consent", "update", { analytics_storage: "denied" });
      if (gtmLoaded || (previous && previous.analytics)) {
        deleteAnalyticsCookies();
        // GTM ya cargado en esta visita: recargar para que no siga activo.
        if (gtmLoaded) window.location.reload();
      }
    }
  }

  function openBanner() {
    if (banner) return;
    banner = document.createElement("div");
    banner.className = "consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.innerHTML =
      '<div class="consent__text">' +
      '<p class="consent__title">Tu privacidad, tu decisión</p>' +
      "<p>Usamos cookies de analítica de Google para saber cuántas personas visitan esta página y mejorarla. " +
      "Solo se activan si las aceptas y no usamos cookies de publicidad. Puedes cambiar de opinión cuando quieras. " +
      '<a href="/cookies.html">Más información</a></p>' +
      "</div>" +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--ghost consent__btn" data-consent="reject">Rechazar</button>' +
      '<button type="button" class="btn btn--ghost consent__btn" data-consent="accept">Aceptar</button>' +
      "</div>";
    banner.addEventListener("click", function (e) {
      var t = e.target;
      var action = t && t.getAttribute && t.getAttribute("data-consent");
      if (action === "accept") choose(true);
      else if (action === "reject") choose(false);
    });
    document.body.appendChild(banner);
  }

  function init() {
    var choice = readChoice();
    if (choice) {
      if (choice.analytics) loadGtm();
    } else {
      openBanner();
    }
    // Enlaces «Configurar cookies» (pie y página de cookies): reabren el aviso.
    document.addEventListener("click", function (e) {
      var el = e.target && e.target.closest ? e.target.closest("[data-consent-open]") : null;
      if (!el) return;
      e.preventDefault();
      openBanner();
      var first = banner && banner.querySelector("button");
      if (first) first.focus();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
