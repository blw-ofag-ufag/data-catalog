const translationsUrl = "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/docs/assets/translations.json";
let translations = {};

/**
 * Fetch and cache translations from the JSON file.
 */
async function loadTranslations() {
  try {
    const response = await fetch(translationsUrl);
    translations = await response.json();
  } catch (error) {
    console.error("Failed to load translations:", error);
  }
}

/**
 * Get the current language from the page or URL.
 * If the `language-select` element exists, use its value.
 * Otherwise, read from the URL `lang` parameter.
 */
function getCurrentLanguage() {
  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    return langSelect.value; // From dropdown (index.html)
  }
  
  // From URL parameter (details.html)
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") || "en"; // Default to "en"
}

/**
 * Translate the page based on the selected or URL language.
 */
function translatePage() {
  const lang = getCurrentLanguage();

  // Loop through all translatable elements
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const translationKey = el.dataset.i18n; // Use the flat key from the `data-i18n` attribute
    const translation = translations[translationKey]?.[lang];

    if (translation) {
      if (el.tagName === "INPUT" && el.type === "text") {
        // Update placeholder for input fields
        el.placeholder = translation;
      } else {
        // Update inner HTML for other elements
        el.innerHTML = translation;
      }
    } else {
      console.warn(`No translation found for key: ${translationKey} in language: ${lang}`);
    }
  });
}

// Add an event listener for language selection dropdown if it exists
document.addEventListener("DOMContentLoaded", async () => {
  await loadTranslations();

  const langSelect = document.getElementById("language-select");
  if (langSelect) {
    langSelect.addEventListener("change", translatePage);
  }

  translatePage(); // Apply translations after loading
});
