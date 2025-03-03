"use strict";

let translations = {};

/**
 * Loads the translations JSON file.
 */
function loadTranslations(callback) {
  fetch('assets/translations.json')
    .then(response => response.json())
    .then(data => {
      translations = data;
      if (callback) callback();
    })
    .catch(err => console.error("Error loading translations:", err));
}

/**
 * Applies translations to all elements with data-i18n and data-i18n-placeholder.
 */
function applyTranslations(lang) {
  // Replace inner text for elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
    const key = el.getAttribute("data-i18n");
    if (translations[key] && translations[key][lang]) {
      el.textContent = translations[key][lang];
    }
  });

  // Replace placeholder attributes for elements with data-i18n-placeholder attribute
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[key] && translations[key][lang]) {
      el.placeholder = translations[key][lang];
    }
  });

  // Optionally, update other attributes (e.g. title) if needed
}

/**
 * Initializes the i18n system by loading translations and applying them.
 */
function initI18n(lang) {
  loadTranslations(function() {
    applyTranslations(lang);
  });
}

// Expose functions globally so they can be called in main.js and from event handlers.
window.applyTranslations = applyTranslations;
window.initI18n = initI18n;
