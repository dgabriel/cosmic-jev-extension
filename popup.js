/**
 * Popup: a single birthdate field. Classic script (no imports) -- shares
 * global scope with storage.js via the plain <script> tags in popup.html.
 */
(function () {
  "use strict";

  const form = document.getElementById("birthdate-form");
  const input = document.getElementById("birthdate");
  const status = document.getElementById("status");

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  Storage.loadBirthdate().then((birthdate) => {
    if (birthdate) {
      input.value = `${birthdate.year}-${pad2(birthdate.month)}-${pad2(birthdate.day)}`;
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const [year, month, day] = input.value.split("-").map(Number);
    Storage.saveBirthdate({ year, month, day }).then(() => {
      status.textContent = "Saved.";
    });
  });
})();
