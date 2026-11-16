// CIBERAN · página «Pronto». Mejora el formulario sin recargar. Sin dependencias.
(function () {
  "use strict";

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var form = document.querySelector("form[name='ideas']");
  if (!form || !window.fetch) return;

  var status = document.getElementById("form-status");
  var button = form.querySelector("button[type='submit']");

  function say(text, kind) {
    status.textContent = text;
    status.className = "form__status" + (kind ? " form__status--" + kind : "");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = new URLSearchParams(new FormData(form));
    button.disabled = true;
    say("Enviando…", "");

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data.toString()
    })
      .then(function (response) {
        if (!response.ok) throw new Error("status " + response.status);
        form.reset();
        say("¡Gracias! Hemos recibido tu sugerencia.", "ok");
      })
      .catch(function () {
        say("No hemos podido enviarla. Inténtalo de nuevo en un momento.", "error");
      })
      .then(function () {
        button.disabled = false;
      });
  });
})();
