/**
 * main.js
 * - Fetches the data catalog JSON
 * - Fetches translations.json
 * - Renders dataset tiles
 * - Implements search & sort features
 * - Handles language switching
 */

const DATA_CATALOG_URL = "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";
let catalogData = [];
let translations = {};
let currentLanguage = "en";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    // Load translations first
    await loadTranslations();
    // Then load catalog data
    await loadCatalog();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial render
    renderCatalog();
    updateTextContent(); // i18n
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

async function loadCatalog() {
  const response = await fetch(DATA_CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Error fetching dataCatalog.json: ${response.statusText}`);
  }
  const jsonData = await response.json();

  // The JSON is an array containing an object with "dataset" and "datasetSeries".
  // We'll flatten or parse out each dataset entry for display.
  
  // jsonData[0].dataset might look like:
  // {
  //   "BFE-DS-0001": {
  //      "metadata": {...},
  //      "attributes": {...}
  //   }, ...
  // }

  if (!Array.isArray(jsonData)) {
    throw new Error("Catalog JSON is not an array as expected.");
  }

  const firstBlock = jsonData[0] || {};
  const datasetObj = firstBlock.dataset || {};

  // Convert datasetObj into an array of items
  catalogData = Object.keys(datasetObj).map((datasetKey) => {
    const datasetEntry = datasetObj[datasetKey];
    const metadata = datasetEntry.metadata || {};
    const attrs = datasetEntry.attributes || {};

    return {
      id: datasetKey,
      imageURL: metadata.ImageURL || "",
      title: attrs["dct:title"] || {},
      description: attrs["dct:description"] || {},
      issued: attrs["dct:issued"] || "", // string date
      dataOwner: attrs["bv:dataOwner"] || "",
      keyword: attrs["dcat:keyword"] || "",
    };
  });
}

async function loadTranslations() {
  const response = await fetch("translations.json");
  if (!response.ok) {
    throw new Error(`Error fetching translations.json: ${response.statusText}`);
  }
  translations = await response.json();
}

function setupEventListeners() {
  const languageSelect = document.getElementById("languageSelect");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  languageSelect.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    updateTextContent();
    renderCatalog();
  });

  searchInput.addEventListener("input", renderCatalog);
  sortSelect.addEventListener("change", renderCatalog);
}

function renderCatalog() {
  const container = document.getElementById("catalogContainer");
  container.innerHTML = "";

  // Filter data based on search
  const filtered = filterData(catalogData);

  // Sort data
  const sorted = sortData(filtered);

  // Create dataset tiles
  sorted.forEach((item) => {
    const tile = createTile(item);
    container.appendChild(tile);
  });
}

function filterData(data) {
  const searchValue = document.getElementById("searchInput").value.toLowerCase().trim();
  if (!searchValue) return data;

  return data.filter((item) => {
    const { title, description, dataOwner, keyword } = item;

    // We check multiple fields: title, description, dataOwner, keywords
    const inTitle = textForLang(title).toLowerCase().includes(searchValue);
    const inDescription = textForLang(description).toLowerCase().includes(searchValue);
    const inDataOwner = dataOwner.toLowerCase().includes(searchValue);
    const inKeyword = keyword.toLowerCase().includes(searchValue);

    return inTitle || inDescription || inDataOwner || inKeyword;
  });
}

function sortData(data) {
  const sortValue = document.getElementById("sortSelect").value;
  return [...data].sort((a, b) => {
    switch (sortValue) {
      case "title":
        return textForLang(a.title).localeCompare(textForLang(b.title));
      case "issued":
        return new Date(a.issued) - new Date(b.issued);
      case "dataOwner":
        return a.dataOwner.localeCompare(b.dataOwner);
      default:
        return 0;
    }
  });
}

/**
 * Creates a tile (DOM element) for a given dataset item
 */
function createTile(item) {
  const tile = document.createElement("div");
  tile.className = "dataset-tile";

  const image = document.createElement("img");
  image.src = item.imageURL;
  image.alt = textForLang(item.title) || "Dataset image";
  tile.appendChild(image);

  const textContainer = document.createElement("div");
  textContainer.className = "text-container";

  const titleEl = document.createElement("h3");
  titleEl.textContent = textForLang(item.title);
  textContainer.appendChild(titleEl);

  const descEl = document.createElement("p");
  descEl.className = "description";
  descEl.textContent = textForLang(item.description);
  textContainer.appendChild(descEl);

  if (item.issued) {
    const issuedEl = document.createElement("p");
    issuedEl.className = "issued";
    const issuedLabel = translations[currentLanguage]?.issuedLabel || "Issued";
    issuedEl.textContent = `${issuedLabel}: ${item.issued}`;
    textContainer.appendChild(issuedEl);
  }

  if (item.dataOwner) {
    const ownerEl = document.createElement("p");
    ownerEl.className = "data-owner";
    const ownerLabel = translations[currentLanguage]?.ownerLabel || "Data Owner";
    ownerEl.textContent = `${ownerLabel}: ${item.dataOwner}`;
    textContainer.appendChild(ownerEl);
  }

  if (item.keyword) {
    const keywordEl = document.createElement("p");
    keywordEl.className = "keywords";
    const keywordLabel = translations[currentLanguage]?.keywordLabel || "Keywords";
    keywordEl.textContent = `${keywordLabel}: ${item.keyword}`;
    textContainer.appendChild(keywordEl);
  }

  tile.appendChild(textContainer);
  return tile;
}

/**
 * Returns text for the current language from a multi-language object
 * Example object: { "de": "Titel DE", "fr": "Titre FR", ... }
 */
function textForLang(obj) {
  if (!obj) return "";
  return obj[currentLanguage] || obj["en"] || "";
}

function updateTextContent() {
  // Example of updating static text based on translations
  document.getElementById("pageTitle").textContent =
    translations[currentLanguage]?.pageTitle || "Data Catalog";

  document.getElementById("searchInput").placeholder =
    translations[currentLanguage]?.searchPlaceholder || "Search...";

  document.getElementById("footerText").textContent =
    translations[currentLanguage]?.footerText || "© 2025. All rights reserved.";
}
