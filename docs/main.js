/******************************************************
 *  Global configuration & variables
 *****************************************************/
const dataUrl =
  "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";

let datasets = [];
let currentLanguage = "en";

// The normal text the user typed is shown in #search.
// The recognized hashtag chips (without "#") live here.
let keywordChips = [];

/******************************************************
 *  1) Reading & Writing URL parameters
 *****************************************************/
/**
 * Reads ?text=..., ?tags=..., ?lang=..., ?sort=...
 * and sets up the page accordingly.
 */
function readUrlParams() {
  const params = new URLSearchParams(window.location.search);

  // 1) Language
  if (params.has("lang")) {
    currentLanguage = params.get("lang");
    document.getElementById("language-select").value = currentLanguage;
  }

  // 2) Sort
  if (params.has("sort")) {
    document.getElementById("sort-options").value = params.get("sort");
  }

  // 3) Text param => put directly into #search
  if (params.has("text")) {
    const textParam = params.get("text");
    document.getElementById("search").value = textParam;
  }

  // 4) Tags param => split by commas => put into keywordChips
  if (params.has("tags")) {
    const tagsString = params.get("tags");
    // e.g. "milk,soil, environment"
    const tagsArray = tagsString
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    // Overwrite any existing chips with these
    keywordChips = [...new Set(tagsArray)]; // unique
  }
}

/**
 * Writes the current text + chips + language + sort to the URL.
 * Example: ?text=my milk&tags=soil,environment&lang=en&sort=title
 */
function updateUrlParams() {
  const lang = document.getElementById("language-select").value;
  const sortVal = document.getElementById("sort-options").value;

  // Normal text from the #search input
  const normalText = document.getElementById("search").value.trim();

  // Build "tags" from the chips array
  // e.g. ["milk","soil"] => "milk,soil"
  const tagsParam = keywordChips.join(",");

  // Create URLSearchParams
  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("sort", sortVal);

  if (normalText) {
    params.set("text", normalText);
  }
  if (tagsParam) {
    params.set("tags", tagsParam);
  }

  // Update URL without reloading
  window.history.replaceState({}, "", `?${params.toString()}`);
}

/******************************************************
 *  2) Hashtag Extraction from the #search input
 *****************************************************/
/**
 * If the user typed `#milk` and pressed space/Enter/tab/comma,
 * we extract the last token as a hashtag => store it in keywordChips.
 */
function extractHashtagIfFinished() {
  const inputEl = document.getElementById("search");
  let val = inputEl.value;

  if (!val) return;

  // Split by whitespace
  let tokens = val.split(/\s+/);
  const lastToken = tokens[tokens.length - 1];
  if (!lastToken || !lastToken.startsWith("#")) return;

  // E.g. "#milk," => remove trailing punctuation
  let cleaned = lastToken.replace(/[.,|]+$/, "");
  if (cleaned.length < 2) return; // means it was just "#"

  // remove the "#"
  const chipWord = cleaned.slice(1).toLowerCase();

  // Add to chips if not already there
  if (!keywordChips.includes(chipWord)) {
    keywordChips.push(chipWord);
  }

  // Remove the last token from leftover text
  tokens.pop();
  // Rebuild the leftover text
  inputEl.value = tokens.join(" ");

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
  // filter out that chip
  keywordChips = keywordChips.filter(w => w !== chipWord);
  updateSearchChips();
  applySearchLangSort();
  updateUrlParams();
}

/******************************************************
 *  4) Search & Filter Logic (AND for chips, OR for text)
 *****************************************************/
function applySearchLangSort() {
  // Filter
  const filtered = getFilteredDatasets(datasets);
  // Sort
  const sorted = getSortedDatasets(filtered);
  // Render
  renderDatasets(sorted);
}

/**
 * We combine two filters:
 *  1) All chips => a dataset must have **all** of these in `dcat:keyword` (AND).
 *  2) The normal text => we parse tokens by commas/OR/| => OR logic among them.
 *     If there are no text tokens, we skip text filtering entirely.
 *  Then final => dataset must pass chip filter AND text filter.
 */
function getFilteredDatasets(sourceData) {
  // 1) parse normal text tokens (OR among them)
  const normalText = document.getElementById("search").value.trim();
  const textTokens = parseNormalTokens(normalText);

  // 2) "chips" => must match all
  // i.e. for each chip in keywordChips => dataset has that chip in dcat:keyword
  return sourceData.filter(dataset => {
    // A) Check chips => AND logic
    const hasAllChips = keywordChips.every(chip => {
      const keywords = dataset.attributes["dcat:keyword"] || [];
      return keywords.some(k => k.toLowerCase().includes(chip));
    });
    if (!hasAllChips) return false;

    // B) If no text tokens => automatically pass text filter
    if (textTokens.length === 0) {
      return true;
    }

    // If we do have text tokens => need to pass OR among them
    const matchesSomeText = textTokens.some(tok => matchFullText(tok, dataset));
    return matchesSomeText;
  });
}

/**
 * Splits "milk, environment" or "milk OR environment" or "milk|env"
 * into multiple tokens for OR logic.  E.g. => ["milk","environment"].
 */
function parseNormalTokens(str) {
  if (!str) return [];
  return str
    .split(/\s*(?:,|OR|\|)\s*/i)
    .map(x => x.trim().toLowerCase())
    .filter(x => x.length > 0);
}

/** Checks if 'term' is found in normal text fields: title, desc, owner, etc. */
function matchFullText(term, dataset) {
  const fields = [
    "dct:identifier",
    "dct:title",
    "dct:description",
    "bv:dataOwner",
    "dcat:keyword", // normal text also hits keywords
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
      fieldA = a.attributes["dct:issued"] || "";
      fieldB = b.attributes["dct:issued"] || "";
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

  // Helper function to format the date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(currentLanguage, { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(date);
    } catch (error) {
      return "Invalid Date";
    }
  };

  container.innerHTML = data
    .map(dataset => {
      const { metadata, attributes } = dataset;
      const datasetId = attributes["dct:identifier"];
      const keywords = attributes["dcat:keyword"] || [];

      // Build the HTML for keywords, each with stopPropagation
      const keywordsHTML = keywords
        .map(kw => `
          <span
            class="keyword-chip"
            onclick="addKeywordChip('${kw}'); event.stopPropagation();"
          >
            ${kw}
          </span>
        `)
        .join("");

      // Return the tile (now clickable)
      return `
        <div
          class="dataset-tile"
          onclick="redirectToDetails('${datasetId}', '${currentLanguage}')"
        >
          <img 
            src="${metadata.imageURL}" 
            alt="${attributes["dct:title"][currentLanguage]}" 
          />
          <div class="dataset-info">
            <h3>${attributes["dct:title"][currentLanguage]}</h3>
            <p>${attributes["dct:description"][currentLanguage]}</p>
            <p><strong>Issued:</strong> ${formatDate(attributes["dct:issued"])}</p>
            <p><strong>Owner:</strong> ${attributes["bv:dataOwner"] || "N/A"}</p>
            <div class="keywords">${keywordsHTML}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

// redirect to the details.html page
function redirectToDetails(datasetId, lang) {
  // Build the details URL
  const url = `details.html?dataset=${datasetId}&lang=${lang}`;
  window.location.href = url;
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
  // 1) Read separate URL params: text=..., tags=..., lang=..., sort=...
  readUrlParams();

  // 2) Fetch data
  fetch(dataUrl)
    .then(res => res.json())
    .then(data => {
      datasets = data.datasets;
      applySearchLangSort();
      updateSearchChips();
    })
    .catch(err => console.error("Error fetching data:", err));

  // Partial text search on input
  document.getElementById("search").addEventListener("input", () => {
    applySearchLangSort();
    updateUrlParams();
  });

  // Hashtag detection on keyup
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
