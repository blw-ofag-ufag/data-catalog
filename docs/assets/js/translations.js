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
 * Applies the translations for the given language to the page.
 */
function translatePage(lang) {
  // Update the document title
  if (translations.title && translations.title[lang]) {
    document.title = translations.title[lang];
  }

  // Update the hero banner heading
  const heroHeading = document.querySelector('.hero-banner h1');
  if (heroHeading && translations.heroBannerHeading && translations.heroBannerHeading[lang]) {
    heroHeading.textContent = translations.heroBannerHeading[lang];
  }

  // Update the hero banner text (lead paragraph)
  const heroText = document.querySelector('.hero-banner p.lead');
  if (heroText && translations.heroBannerText && translations.heroBannerText[lang]) {
    heroText.textContent = translations.heroBannerText[lang];
  }

  // Update the search input placeholder
  const searchInput = document.getElementById('search');
  if (searchInput && translations.searchPlaceholder && translations.searchPlaceholder[lang]) {
    searchInput.placeholder = translations.searchPlaceholder[lang];
  }

  // Update the tag input placeholder
  const tagInput = document.getElementById('tag-input');
  if (tagInput && translations.tagInputPlaceholder && translations.tagInputPlaceholder[lang]) {
    tagInput.placeholder = translations.tagInputPlaceholder[lang];
  }

  // Update sort dropdown button text (assuming default sort is title)
  const sortDropdownButton = document.getElementById('sort-dropdown-button');
  if (sortDropdownButton && translations.sortOptions && translations.sortOptions.title && translations.sortOptions.title[lang]) {
    sortDropdownButton.textContent = translations.sortOptions.title[lang];
  }

  // Update view mode labels
  const tileLabel = document.querySelector("label[for='tile-view']");
  const tableLabel = document.querySelector("label[for='table-view']");
  if (tileLabel && translations.viewModes && translations.viewModes.tile && translations.viewModes.tile[lang]) {
    tileLabel.textContent = translations.viewModes.tile[lang];
  }
  if (tableLabel && translations.viewModes && translations.viewModes.table && translations.viewModes.table[lang]) {
    tableLabel.textContent = translations.viewModes.table[lang];
  }
}

/**
 * Initializes the translation functionality by loading the translations
 * and applying them based on the provided language.
 */
function initTranslations(lang) {
  loadTranslations(() => {
    translatePage(lang);
  });
}

// Expose the translatePage function to be callable when needed (for example, when the language changes)
window.translatePage = translatePage;
window.initTranslations = initTranslations;
