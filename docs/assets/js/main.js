"use strict";

/********************************************
 * CONFIG & STATE
 ********************************************/
const config = {
  branch: "main",
  dataUrl: `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/docs/assets/datasets.json`,
  TILE_PAGE_SIZE: 6,   // 3×3 layout
  TABLE_PAGE_SIZE: 12, // 12 rows per page
};

const state = {
  datasets: [],
  lang: "en",
  sort: "issued-desc", // default sort option
  viewMode: "tile",    // "tile" or "table"
  currentPage: 1,
  searchText: "",
  tags: [],            // <-- NEW: holds array of selected tag keywords
};

let tagify = null; // Assigned to our Tagify instance

/********************************************
 * HELPER FUNCTIONS
 ********************************************/
// Data helpers
function getDataOwnerName(data) {
  return data.dataOwner || "";
}
function parseTokens(str) {
  if (!str) return [];
  return str.split(/\s+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}
function formatDate(dStr) {
  if (!dStr) return "N/A";
  try {
    const d = new Date(dStr);
    return new Intl.DateTimeFormat(state.lang, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch (e) {
    return "Invalid Date";
  }
}
function truncate(str, length = 50) {
  if (!str) return "";
  return str.length > length ? str.slice(0, length) + "..." : str;
}
function getDisplayTitle(dataset) {
  const rawTitle = dataset["dcterms:title"]?.[state.lang] || "Untitled";
  return truncate(rawTitle, 50);
}

/********************************************
 * FILTER & SORT FUNCTIONS
 ********************************************/
function filterDatasets(dataArray) {
  const textTokens = parseTokens(state.searchText);
  // We compare tags in lower-case for searching
  const tagValues = state.tags.map(tag => tag.toLowerCase());

  return dataArray.filter(d => {
    // Text filtering: match any token in any of the fields.
    let textMatch = true;
    if (textTokens.length) {
      textMatch = textTokens.some(tok => {
        const fields = [
          "dcterms:identifier", 
          "dcterms:title", 
          "dcterms:description", 
          "dcat:keyword",
          "dcterms:issued", 
          "dataOwner"
        ];
        return fields.some(f => {
          const val = d[f];
          if (!val) return false;
          if (f === "dcat:keyword" && Array.isArray(val)) {
            return val.some(k => k.toLowerCase().includes(tok));
          }
          if (typeof val === "object") {
            return Object.values(val).some(v => v.toLowerCase().includes(tok));
          }
          return String(val).toLowerCase().includes(tok);
        });
      });
    }

    // Tag filtering: every tag must be present in the dataset keywords
    let tagMatch = true;
    if (tagValues.length) {
      const datasetKeywords = (d["dcat:keyword"] || []).map(k => k.toLowerCase());
      tagMatch = tagValues.every(tag => datasetKeywords.includes(tag));
    }

    return textMatch && tagMatch;
  });
}

function sortDatasets(dataArray) {
  const sorted = [...dataArray];
  switch (state.sort) {
    case "title":
      sorted.sort((a, b) => {
        const aTitle = (a["dcterms:title"]?.[state.lang] || "").toLowerCase();
        const bTitle = (b["dcterms:title"]?.[state.lang] || "").toLowerCase();
        if (!aTitle && bTitle) return 1;
        if (aTitle && !bTitle) return -1;
        return aTitle.localeCompare(bTitle);
      });
      break;
    case "issued-asc":
      sorted.sort((a, b) => {
        const aDate = a["dcterms:issued"] ? new Date(a["dcterms:issued"]) : null;
        const bDate = b["dcterms:issued"] ? new Date(b["dcterms:issued"]) : null;
        if (!aDate && bDate) return 1;
        if (aDate && !bDate) return -1;
        if (!aDate && !bDate) return 0;
        return aDate - bDate;
      });
      break;
    case "issued-desc":
      sorted.sort((a, b) => {
        const aDate = a["dcterms:issued"] ? new Date(a["dcterms:issued"]) : null;
        const bDate = b["dcterms:issued"] ? new Date(b["dcterms:issued"]) : null;
        if (!aDate && bDate) return 1;
        if (aDate && !bDate) return -1;
        if (!aDate && !bDate) return 0;
        return bDate - aDate;
      });
      break;
    case "owner":
      sorted.sort((a, b) => {
        const aOwner = getDataOwnerName(a).toLowerCase();
        const bOwner = getDataOwnerName(b).toLowerCase();
        if (!aOwner && bOwner) return 1;
        if (aOwner && !bOwner) return -1;
        return aOwner.localeCompare(bOwner);
      });
      break;
    default:
      break;
  }
  return sorted;
}

/********************************************
 * URL PARAM HANDLING (TWO-WAY BINDING)
 ********************************************/
function syncStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("lang")) state.lang = params.get("lang");
  if (params.has("sort")) state.sort = params.get("sort");
  if (params.has("view")) state.viewMode = params.get("view");
  if (params.has("page")) state.currentPage = parseInt(params.get("page"), 10) || state.currentPage;
  if (params.has("text")) state.searchText = params.get("text");

  // NEW: parse "tags" parameter (comma-separated)
  if (params.has("tags")) {
    // e.g. tags=milk,bread,grain
    const raw = params.get("tags");
    // We store them as an array of strings
    state.tags = raw.split(",").map(t => t.trim()).filter(Boolean);
  } else {
    state.tags = [];
  }
}

function syncURLFromState() {
  const params = new URLSearchParams();
  params.set("lang", state.lang);
  params.set("sort", state.sort);
  params.set("view", state.viewMode);
  params.set("page", state.currentPage);

  if (state.searchText.trim()) {
    params.set("text", state.searchText.trim());
  }

  // NEW: if we have tags, join them with commas
  if (state.tags.length > 0) {
    params.set("tags", state.tags.join(","));
  }

  const newUrl = "?" + params.toString();
  history.pushState(null, "", newUrl);
}

// Listen for browser back/forward
window.addEventListener("popstate", () => {
  syncStateFromURL();
  reflectStateInUI();   // Re-sync UI
  applyFiltersAndRender();
});

/********************************************
 * REFLECT STATE IN UI ELEMENTS
 ********************************************/
function setLanguageDropdownLabel(lang) {
  let label = "English";
  if (lang === "de") label = "Deutsch";
  else if (lang === "fr") label = "Français";
  else if (lang === "it") label = "Italiano";
  $("#language-dropdown-button").text(label);
}

function setSortDropdownLabel(sortValue) {
  let key = "";
  switch (sortValue) {
    case "title":
      key = "sortTitle";
      break;
    case "issued-asc":
      key = "sortIssuedAsc";
      break;
    case "issued-desc":
      key = "sortIssuedDesc";
      break;
    case "owner":
      key = "sortOwner";
      break;
    default:
      key = "sortTitle";
  }
  // Look up the translation based on the current language stored in state.lang.
  let label = key;
  if (translations && translations[key] && translations[key][state.lang]) {
    label = translations[key][state.lang];
  }
  $("#sort-dropdown-button").text(label);
}

/**
 * Apply current state to form controls (search, view mode, etc.)
 */
function reflectStateInUI() {
  // If navbar is dynamically loaded, ensure we do these calls
  // *after* the navbar is ready in the DOM.

  // 1. Text search
  $("#search").val(state.searchText);

  // 2. View mode
  $("input[name='viewMode'][value='" + state.viewMode + "']").prop("checked", true);

  // 3. Language
  setLanguageDropdownLabel(state.lang);

  // 4. Sort
  setSortDropdownLabel(state.sort);

  // 5. Tagify: clear and re-add tags
  tagify.removeAllTags();
  if (state.tags.length) {
    // Tagify automatically calls 'change' event when adding tags,
    // so we might want to temporarily disable the event or set
    // a silent flag. But let's keep it straightforward for now.
    tagify.addTags(state.tags);
  }
}

/********************************************
 * RENDERING TEMPLATES
 ********************************************/
function tileCardTemplate(dataset) {
  const title = getDisplayTitle(dataset);
  const desc = dataset["dcterms:description"]?.[state.lang] || "";
  const issued = formatDate(dataset["dcterms:issued"]);
  const keywords = dataset["dcat:keyword"] || [];
  const imageSrc = dataset["schema:image"] || "https://via.placeholder.com/300x180?text=No+Image";

  const dateHTML =
    issued !== "N/A" && issued !== "Invalid Date"
      ? `<p><em class="tile-date-italic">${issued}</em></p>`
      : "";
  const keywordsHTML = keywords
    .map((kw) => `<span class="keyword" data-key="${kw}">${kw}</span>`)
    .join(" ");

  return `
    <div class="col">
      <div class="card h-100 dataset-card" data-id="${dataset["dcterms:identifier"]}">
        <img src="${imageSrc}" class="card-img-top" alt="${title}" />
        <div class="card-body">
          <h5 class="tile-title-ellipsis">${title}</h5>
          <p class="tile-desc-ellipsis">${desc}</p>
          ${dateHTML}
          <div class="keywords">${keywordsHTML}</div>
        </div>
      </div>
    </div>
  `;
}

function tableRowTemplate(dataset) {
  const identifier = dataset["dcterms:identifier"] || "";
  const title = dataset["dcterms:title"]?.[state.lang] || "";
  const issued = formatDate(dataset["dcterms:issued"]);
  const owner = getDataOwnerName(dataset);
  const keywordsArr = dataset["dcat:keyword"] || [];
  const keywordsHTML = keywordsArr
    .map((kw) => `<span class="keyword" data-key="${kw}">${kw}</span>`)
    .join(" ");
  return `
    <tr class="dataset-row" data-id="${identifier}">
      <td>${title}</td>
      <td>${issued}</td>
      <td>
        <a href="https://admindir.verzeichnisse.admin.ch/person/${owner}" 
          target="_blank" 
          rel="noopener noreferrer" 
          onclick="event.stopPropagation();">
          ${owner}
        </a>
      </td>
      <td><div class="keywords">${keywordsHTML}</div></td>
    </tr>
  `;
}

/********************************************
 * RENDERING FUNCTIONS
 ********************************************/
function renderTilePage(sortedData) {
  const startIdx = (state.currentPage - 1) * config.TILE_PAGE_SIZE;
  const pageData = sortedData.slice(startIdx, startIdx + config.TILE_PAGE_SIZE);
  const html = pageData.map(tileCardTemplate).join("");
  $("#tile-view-container").html(html);
  $("#tile-view-container").show();
  $("#table-container").hide();
}

function renderTablePage(sortedData) {
  const startIdx = (state.currentPage - 1) * config.TABLE_PAGE_SIZE;
  const pageData = sortedData.slice(startIdx, startIdx + config.TABLE_PAGE_SIZE);
  const rowsHtml = pageData.map(tableRowTemplate).join("");
  $("#dataset-table tbody").html(rowsHtml);
  $("#table-container").show();
  $("#tile-view-container").hide();
}

function initPagination(totalItems, itemsPerPage, renderPageCb) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  
  $("#pagination-container").twbsPagination("destroy");
  if (totalPages > 1) {
    $("#pagination-container").twbsPagination({
      totalPages: totalPages,
      visiblePages: 5,
      startPage: state.currentPage,
      onPageClick: function (event, page) {
        $("#page-indicator").text(`Page ${page} of ${totalPages}`);
        state.currentPage = page;
        syncURLFromState();
        renderPageCb();
      }
    });
    $("#page-indicator").text(`Page ${state.currentPage} of ${totalPages}`);
  } else {
    $("#pagination-container").empty();
    $("#page-indicator").empty();
  }
}

function renderTileView(filtered) {
  const sorted = sortDatasets(filtered);
  initPagination(sorted.length, config.TILE_PAGE_SIZE, () => renderTilePage(sorted));
  renderTilePage(sorted);
}

function renderTableView(filtered) {
  const sorted = sortDatasets(filtered);
  initPagination(sorted.length, config.TABLE_PAGE_SIZE, () => renderTablePage(sorted));
  renderTablePage(sorted);
}

/********************************************
 * APPLY FILTERS & RENDER
 ********************************************/
function applyFiltersAndRender() {
  // Make sure we have fresh search text and tags from the UI
  state.searchText = $("#search").val().trim().toLowerCase();
  // We already track tags in state.tags, updated in the Tagify 'change' event

  const filtered = filterDatasets(state.datasets);

  // Update dataset count in the hero banner if used
  $("#hero-dataset-count").text(`${filtered.length} Datensätze`);

  // Update URL to reflect the latest state
  syncURLFromState();

  // Render based on current view mode
  if (state.viewMode === "tile") {
    $("#sort-container").show();
    renderTileView(filtered);
  } else {
    $("#sort-container").show();
    renderTableView(filtered);
  }
}

/********************************************
 * EVENT LISTENERS
 ********************************************/
function setupEventListeners() {
  // Text search input
  $("#search").on("input", function () {
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  // Tagify change event
  tagify.on("change", function () {
    // On every Tagify change, update state.tags
    state.tags = tagify.value.map(item => item.value);
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  // Because the navbar is loaded separately, 
  // we attach events AFTER it's loaded in the callback:
  $("#navbar-placeholder").load("navbar.html", () => {
    // Now the elements exist, reflect current state in the UI
    setLanguageDropdownLabel(state.lang);
    setSortDropdownLabel(state.sort);

    // Existing language dropdown event (within navbar load callback)
    $(document).on("click", ".dropdown-item.lang-option", function (e) {
      e.preventDefault();
      state.lang = $(this).data("lang");
      setLanguageDropdownLabel(state.lang);
      state.currentPage = 1;
      applyFiltersAndRender();
      applyTranslations(state.lang); // Update all translatable UI elements when the language changes
    });

    // Sort dropdown
    $(document).on("click", ".dropdown-item.sort-option", function (e) {
      e.preventDefault();
      state.sort = $(this).data("sort");
      setSortDropdownLabel(state.sort);
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // View mode toggle
  $("input[name='viewMode']").on("change", function () {
    state.viewMode = $(this).val();
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  // Click on a dataset tile or row => details page
  $(document).on("click", ".dataset-card, .dataset-row", function () {
    const id = $(this).data("id");
    window.location.href = `details.html?dataset=${id}&lang=${state.lang}`;
  });
  
  // Click on a keyword => add to Tagify
  $(document).on("click", ".keywords .keyword", function (e) {
    e.stopPropagation();
    const tag = $(this).data("key") || $(this).text();
    // Avoid duplicates
    if (!state.tags.includes(tag)) {
      tagify.addTags([tag]);
      // The 'change' event updates state & re-renders
    }
  });
  
  // Re-render on window resize (if tile view)
  $(window).on("resize", function () {
    if (state.viewMode === "tile") {
      state.currentPage = 1;
      applyFiltersAndRender();
    }
  });
}

/********************************************
 * INITIALIZATION
 ********************************************/
$(document).ready(function () {
  
  // 1) Synchronize state from URL
  syncStateFromURL();

  // 2) Set up Tagify
  const tagInput = document.getElementById("tag-input");
  tagify = new Tagify(tagInput, {
    whitelist: [],
    dropdown: { enabled: 0 },
  });
  
  // Apply your custom styling to Tagify's container
  tagify.DOM.scope.classList.add('customLook');

  // 3) Reflect state into the UI (after Tagify is ready)
  //    This sets up search text, view mode, etc.
  reflectStateInUI();

  // 4) Initialize translations based on the current language**
  initI18n(state.lang);

  // 5) Fetch datasets
  $.getJSON(config.dataUrl)
    .done(function (data) {
      state.datasets = data;
      // Render for the first time
      applyFiltersAndRender();
    })
    .fail(function (err) {
      console.error("Error fetching data:", err);
    });

  // 6) Attach event listeners
  setupEventListeners();

  // 7) Load footer in the same manner, if needed
  $("#footer-placeholder").load("footer.html");
});
