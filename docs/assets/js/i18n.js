"use strict";

// Convert our translations.json structure into i18next resources.
function transformTranslations(data) {
  const resources = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const translationsForKey = data[key]; // e.g. { de: "Hallo", en: "Hi" }
      for (const lang in translationsForKey) {
        if (translationsForKey.hasOwnProperty(lang)) {
          if (!resources[lang]) {
            resources[lang] = { translation: {} };
          }
          resources[lang].translation[key] = translationsForKey[lang];
        }
      }
    }
  }
  return resources;
}

function updatePageTranslations() {
  // Update innerHTML for elements with data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = i18next.t(key);
  });
  // Update input placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', i18next.t(key));
  });
  // Update href attributes for elements with data-i18n-href
  document.querySelectorAll('[data-i18n-href]').forEach(el => {
    const key = el.getAttribute('data-i18n-href');
    el.setAttribute('href', i18next.t(key));
  });
  // Optionally update the title if needed
  document.querySelectorAll('title[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = i18next.t(key);
  });
}

function initI18n(initialLang, callback) {
  fetch('assets/translations.json')
    .then(response => response.json())
    .then(data => {
      const resources = transformTranslations(data);
      i18next.init({
        lng: initialLang,
        resources: resources,
        debug: false,
        keySeparator: false,
        nsSeparator: false
      }, function(err, t) {
        updatePageTranslations();
        if (callback) callback();
      });      
    })
    .catch(err => console.error("Error loading translations:", err));
}

function changeLanguage(lang) {
  i18next.changeLanguage(lang, (err, t) => {
    if (err) {
      console.error("Language change error:", err);
      return;
    }
    updatePageTranslations();
  });
}

window.initI18n = initI18n;
window.changeLanguage = changeLanguage;
window.updatePageTranslations = updatePageTranslations;
