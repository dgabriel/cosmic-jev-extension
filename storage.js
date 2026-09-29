/**
 * Saved birthdate, via chrome.storage.local (this device only). Loaded into
 * both background.js (importScripts) and popup.html (plain <script> tag) --
 * classic global script, no module system.
 */
(function (root) {
  "use strict";

  const STORAGE_KEY = "birthdate"; // { year, month, day }

  function loadBirthdate() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY]);
      });
    });
  }

  function saveBirthdate(birthdate) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: birthdate }, resolve);
    });
  }

  root.Storage = { loadBirthdate, saveBirthdate };
})(typeof self !== "undefined" ? self : globalThis);
