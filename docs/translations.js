const translationsUrl = "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/docs/translations.json";
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
 * Translate the page based on the selected language.
 */
function translatePage() {
  const lang = document.getElementById("language-select").value;

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

// Event listener for language selection change
document.getElementById("language-select").addEventListener("change", translatePage);

// Load translations on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadTranslations();
  translatePage(); // Apply translations after loading
});
