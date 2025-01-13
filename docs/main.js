/******************************************************
 *  Global configuration & variables
 *****************************************************/
const dataUrl =
  "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";

// All datasets from JSON
let datasets = [];

// Current interface language
let currentLanguage = "en";

/**
 * We'll store normal text in the #search input.
 * We'll store recognized hashtags (without '#') in this array, e.g. ["milk","environment"].
 */
let keywordChips = [];

/******************************************************
 *  1) Reading & Writing URL parameters
 *****************************************************/
function readUrlParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("lang")) {
    currentLanguage = params.get("lang");
    document.getElementById("language-select").value = currentLanguage;
  }
  if (params.has("sort")) {
    document.getElementById("sort-options").value = params.get("sort");
  }

  // The combined query: normal words + #keywords
  if (params.has("q")) {
    const rawQuery = params.get("q");
    // We'll parse out #tags from rawQuery, leftover becomes normal text
    extractAllHashtagsFromString(rawQuery);
  }
}

/**
 * Writes the current state (normal text + #chips + language + sort)
 * back into the URL, so reloading preserves filters.
 */
function updateUrlParams() {
  const lang = document.getElementById("language-select").value;
  const sortVal = document.getElementById("sort-options").value;

  // Normal text in the search input
  const normalText = document.getElementById("search").value.trim();

  // Combine normal tokens + #chips into one string
  const tokens = [];

  if (normalText) {
    tokens.push(...normalText.split(/\s*(?:,|OR|\|)\s*/i).filter(Boolean));
  }

  keywordChips.forEach(chip => {
    tokens.push(`${chip}`);
  });

  const combined = tokens.join(", ");

  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("sort", sortVal);

  if (combined) {
    params.set("q", combined);
  }
  // else no "q" param if the user cleared everything

  window.history.replaceState({}, "", `?${params.toString()}`);
}

/******************************************************
 *  2) Extracting Hashtags from a String
 *****************************************************/
/**
 * A function used on page load or when reading from URL:
 *   - Finds all #hashtags in the given string
 *   - Moves them to `keywordChips`
 *   - The leftover text (non-# stuff) goes into #search
 */
function extractAllHashtagsFromString(rawStr) {
  if (!rawStr) {
    document.getElementById("search").value = "";
    keywordChips = [];
    return;
  }

  // Regex to find #something
  const hashtagRegex = /#[^\s,|]+/g;
  const found = rawStr.match(hashtagRegex); // e.g. ["#milk", "#soil"]

  if (found) {
    found.forEach(item => {
      const chipWord = item.slice(1).toLowerCase();
      if (!keywordChips.includes(chipWord)) {
        keywordChips.push(chipWord);
      }
    });
  }

  // Remove them from rawStr
  let leftover = rawStr.replace(hashtagRegex, "").trim();
  // Minor cleanup of repeated spaces or commas
  leftover = leftover.replace(/\s{2,}/g, " ");
  leftover = leftover.replace(/,\s*,/g, ",");

  // Put leftover in search box
  document.getElementById("search").value = leftover;

  // Render updated chips
  updateSearchChips();
}

/**
 * The main function to do partial extraction for "finished" hashtags,
 * i.e. if user typed `#milk` and then space/Enter/etc.
 */
function extractHashtagIfFinished() {
  const inputEl = document.getElementById("search");
  const val = inputEl.value;

  // 1) Split by whitespace to get tokens
  let tokens = val.split(/\s+/);

  if (!tokens.length) return;

  // The last typed token
  let lastToken = tokens[tokens.length - 1];

  // If the last token does NOT start with "#", do nothing
  if (!lastToken.startsWith("#")) return;

  // If it's just "#" => skip
  if (lastToken.length < 2) return;

  // Example: "#milk,"
  lastToken = lastToken.replace(/[.,|]+$/, "");

  // Remove the "#"
  const chipWord = lastToken.slice(1).toLowerCase();
  if (!keywordChips.includes(chipWord)) {
    keywordChips.push(chipWord);
  }

  // remove last token from array
  tokens.pop();
  const leftoverText = tokens.join(" ");
  inputEl.value = leftoverText;

  // Re-render chips
  updateSearchChips();
}

/******************************************************
 *  3) Updating & Removing "Chips"
 *****************************************************/
function updateSearchChips() {
  const container = document.getElementById("search-chips-container");
  container.innerHTML = "";

  keywordChips.forEach(chipWord => {
    const chipEl = document.createElement("span");
    chipEl.classList.add("search-chip", "keyword-chip");
    chipEl.textContent = `${chipWord}`;

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("remove-btn");
    removeBtn.textContent = "×";
    removeBtn.onclick = () => removeChip(chipWord);

    chipEl.appendChild(removeBtn);
    container.appendChild(chipEl);
  });
}

function removeChip(chipWord) {
  keywordChips = keywordChips.filter(w => w !== chipWord);
  updateSearchChips();
  applySearchLangSort();
  updateUrlParams();
}

/******************************************************
 *  4) Searching & Sorting
 *****************************************************/
function applySearchLangSort() {
  // 1) Filter
  const filtered = getFilteredDatasets(datasets);

  // 2) Sort
  const sorted = getSortedDatasets(filtered);

  // 3) Render
  renderDatasets(sorted);
}

/**
 * - The normal text tokens (from #search) are OR'd among themselves.
 * - The keyword chips (in `keywordChips`) are AND'd among themselves.
 * - Final result is AND between the chip match and the normal-text match.
 *
 * So a dataset must:
 *   (1) Match ALL chips in its "dcat:keyword" (AND),
 *   (2) AND also match at least one text token if any text tokens exist (OR).
 */
function getFilteredDatasets(sourceData) {
  // 1) Parse normal text tokens => OR logic
  const normalText = document.getElementById("search").value.trim();
  const normalTokens = parseNormalTokens(normalText);

  // 2) If no normal tokens => no text restriction
  //   => "text pass" is automatically true
  //   => else we check if dataset matches any of them (OR).
  
  // 3) The chips => must match ALL chips (AND logic).
  
  return sourceData.filter(dataset => {
    // A) Must pass the "chips" filter => i.e. has all the chips
    const hasAllChips = keywordChips.every(chip => {
      const keywords = dataset.attributes["dcat:keyword"] || [];
      return keywords.some(k => k.toLowerCase().includes(chip));
    });
    if (!hasAllChips) return false; // fail early if missing a chip

    // B) If user typed no normal tokens => automatically pass text filter
    if (normalTokens.length === 0) {
      return true;
    }

    // Otherwise, dataset must match ANY normal token => OR
    const matchesAnyTextToken = normalTokens.some(tok => matchFullText(tok, dataset));
    return matchesAnyTextToken;
  });
}

function parseNormalTokens(str) {
  if (!str) return [];
  return str
    .split(/\s*(?:,|OR|\|)\s*/i)
    .map(x => x.trim().toLowerCase())
    .filter(x => x.length > 0);
}

/** 
 * Checks if 'term' is found in 
 *   dct:identifier, dct:title, dct:description, bv:dataOwner,
 *   dcat:keyword, dct:issued
 * (the normal text fields).
 */
function matchFullText(term, dataset) {
  const fields = [
    "dct:identifier",
    "dct:title",
    "dct:description",
    "bv:dataOwner",
    "dcat:keyword", 
    "dct:issued",
  ];

  return fields.some(field => {
    const value = dataset.attributes[field];
    if (!value) return false;

    if (field === "dcat:keyword") {
      return value.some(k => k.toLowerCase().includes(term));
    }
    if (field === "dct:title" || field === "dct:description") {
      return Object.values(value).some(v => v.toLowerCase().includes(term));
    }
    if (field === "dct:issued") {
      return value.toLowerCase().includes(term);
    }
    return String(value).toLowerCase().includes(term);
  });
}

/******************************************************
 *  5) Sorting
 *****************************************************/
function getSortedDatasets(sourceData) {
  const sortBy = document.getElementById("sort-options").value;
  return [...sourceData].sort((a, b) => {
    let fieldA, fieldB;

    if (sortBy === "title") {
      fieldA = a.attributes["dct:title"][currentLanguage] || "";
      fieldB = b.attributes["dct:title"][currentLanguage] || "";
      return fieldA.localeCompare(fieldB, undefined, { numeric: true });
    } else if (sortBy === "issued-asc" || sortBy === "issued-desc") {
      fieldA = a.attributes["dct:issued"] || null;
      fieldB = b.attributes["dct:issued"] || null;
      if (!fieldA) return 1;
      if (!fieldB) return -1;
      const dateA = new Date(fieldA);
      const dateB = new Date(fieldB);
      if (sortBy === "issued-asc") return dateA - dateB;
      return dateB - dateA;
    } else if (sortBy === "owner") {
      fieldA = a.attributes["bv:dataOwner"] || "";
      fieldB = b.attributes["bv:dataOwner"] || "";
      return fieldA.localeCompare(fieldB, undefined, { numeric: true });
    }
    return 0;
  });
}

/******************************************************
 *  6) Rendering the Dataset Tiles
 *****************************************************/
function renderDatasets(data) {
  const container = document.getElementById("dataset-container");
  container.innerHTML = data
    .map(dataset => {
      const { metadata, attributes } = dataset;
      const keywords = attributes["dcat:keyword"] || [];

      const keywordsHTML = keywords
        .map(kw => `
          <span class="keyword-chip" onclick="addKeywordChip('${kw}')">
            ${kw}
          </span>
        `)
        .join("");

      return `
        <div class="dataset-tile">
          <img 
            src="${metadata.imageURL}" 
            alt="${attributes["dct:title"][currentLanguage]}" 
          />
          <div class="dataset-info">
            <h3>${attributes["dct:title"][currentLanguage]}</h3>
            <p>${attributes["dct:description"][currentLanguage]}</p>
            <p><strong>Issued:</strong> ${attributes["dct:issued"] || "N/A"}</p>
            <p><strong>Owner:</strong> ${attributes["bv:dataOwner"] || "N/A"}</p>
            <div class="keywords">${keywordsHTML}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

/******************************************************
 *  7) Clickable Keyword in Tiles => add as Chip
 *****************************************************/
function addKeywordChip(keyword) {
  const normalized = keyword.trim().toLowerCase();
  if (!keywordChips.includes(normalized)) {
    keywordChips.push(normalized);
    updateSearchChips();
    applySearchLangSort();
    updateUrlParams();
  }
}

/******************************************************
 *  8) Main Initialization
 *****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // 1) Read URL => sets #search, #language-select, #sort-options, plus extracting #chips
  readUrlParams();

  // 2) Fetch data
  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      datasets = data.flatMap(d => Object.values(d.dataset));
      applySearchLangSort();
      updateSearchChips();
    })
    .catch(err => console.error("Error fetching data:", err));

  // We do partial text search on input
  document.getElementById("search").addEventListener("input", () => {
    applySearchLangSort();
    updateUrlParams();
  });

  // ...and hashtag detection on keyup
  document.getElementById("search").addEventListener("keyup", e => {
    if ([" ", ",", "Enter", "Tab"].includes(e.key)) {
      extractHashtagIfFinished();
      applySearchLangSort();
      updateUrlParams();
    }
  });

  // Language
  document.getElementById("language-select").addEventListener("change", () => {
    currentLanguage = document.getElementById("language-select").value;
    applySearchLangSort();
    updateUrlParams();
  });

  // Sorting
  document.getElementById("sort-options").addEventListener("change", () => {
    applySearchLangSort();
    updateUrlParams();
  });
});
