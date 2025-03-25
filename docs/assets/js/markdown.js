"use strict";

// Initialize Mermaid without auto-render
mermaid.initialize({ startOnLoad: false });

// Document ready
document.addEventListener("DOMContentLoaded", () => {

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
  const primaryTextColor = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: primaryColor,
      primaryTextColor: primaryTextColor
    }
  });

  // Load navbar, then do some i18n setup
  $("#navbar-placeholder").load("navbar.html", function () {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang") || "en";

    // Adjust home link and language dropdown label
    $(".navbar-brand").attr("href", `index.html?lang=${lang}`);
    Utils.setLanguageDropdownLabel(lang);

    // Once the navbar is loaded, you can update its text via i18n
    updatePageTranslations();
  });

  // Load footer
  $("#footer-placeholder").load("footer.html");

  // Grab "lang" from query params (default to 'en')
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") || "en";

  // Initialize i18n then fetch + render the correct markdown
  initI18n(lang, function () {
    updatePageTranslations();
    loadMarkdownContent(lang);
  });
});

// Load the correct markdown file
function loadMarkdownContent(lang) {
  const fallbackLang = "en";
  // Read the markdown folder path from the data attribute
  const mdFolder = document.body.getAttribute("data-md-folder") || "assets/md/about/";
  const url = `${mdFolder}${lang}.md`;

  fetch(url)
    .then((response) => {
      // If missing, fallback to English
      if (!response.ok) {
        console.warn(
          `Markdown file for lang '${lang}' not found. Falling back to '${fallbackLang}'.`
        );
        return fetch(`${mdFolder}${fallbackLang}.md`);
      }
      return response;
    })
    .then((response) => response.text())
    .then((md) => {
      // Render Markdown to HTML
      const html = marked.parse(md);
      document.getElementById("content").innerHTML = html;

      // Render any Mermaid blocks with the "language-mermaid" class
      mermaid.init(undefined, document.querySelectorAll(".language-mermaid"));
    })
    .catch((error) =>
      console.error("Error loading or rendering Markdown:", error)
    );
}

// Language-switching handler: same logic as in details.js
$(document).on("click", ".dropdown-item.lang-option", function (e) {
  e.preventDefault();
  const newLang = $(this).data("lang");
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("lang", newLang);

  // Update the browser URL without reloading
  history.pushState(null, "", "?" + urlParams.toString());

  // Switch i18n to the new language
  changeLanguage(newLang);
  Utils.setLanguageDropdownLabel(newLang);
  updatePageTranslations();

  // Re-fetch and re-render the Markdown content
  loadMarkdownContent(newLang);
});
