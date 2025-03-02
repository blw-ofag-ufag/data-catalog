/********************************************
 * GLOBAL VARIABLES & CONFIG
 ********************************************/
const branch = "main";
const dataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/docs/assets/datasets.json`;

// Master data
let datasets = [];
// UI state
let currentLanguage = "en";
let currentSort = "issued-desc"; // or whichever default you want
let viewMode = "tile";      // "tile" or "table"
let currentPage = 1;
// Page sizes
const TILE_PAGE_SIZE = 9;   // 3×3 layout
const TABLE_PAGE_SIZE = 20; // 10 rows per table page
// Tagify instance
let tagify;

/********************************************
 * HELPER FUNCTIONS
 ********************************************/
function getDataOwnerName(data) {
  return data.dataOwner || "N/A";
}
function parseTokens(str) {
  if (!str) return [];
  return str.split(/\s+/).map(s => s.trim().toLowerCase()).filter(s => s);
}
function formatDate(dStr) {
  if (!dStr) return "N/A";
  try {
    const d = new Date(dStr);
    return new Intl.DateTimeFormat(currentLanguage, {
      day: "numeric",
      month: "long",
      year: "numeric"
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
  const rawTitle = dataset["dcterms:title"]?.[currentLanguage] || "Untitled";
  return truncate(rawTitle, 50);
}

/********************************************
 * URL PARAMS: READ / UPDATE
 ********************************************/

function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("lang")) {
    currentLanguage = params.get("lang");
  }
  if (params.has("sort")) {
    currentSort = params.get("sort");
  }
  if (params.has("text")) {
    $("#search").val(params.get("text"));
  }
  if (params.has("view")) {
    viewMode = params.get("view");
    $("input[name='viewMode'][value='" + viewMode + "']").prop("checked", true);
  }
  if (params.has("page")) {
    currentPage = parseInt(params.get("page"), 10) || 1;
  }
}

function updateUrlParams() {
  const params = new URLSearchParams();
  params.set("lang", currentLanguage);
  params.set("sort", currentSort);
  params.set("view", viewMode);
  params.set("page", currentPage);

  // If there's text in search, set it
  const text = $("#search").val().trim();
  if (text) params.set("text", text);

  window.history.replaceState({}, "", "?" + params.toString());
}

function setLanguageDropdownLabel(lang) {
  // Switch or if/else to pick the text to show
  let label = "English";
  if (lang === "de") label = "Deutsch";
  else if (lang === "fr") label = "Français";
  else if (lang === "it") label = "Italiano";
  else if (lang === "en") label = "English";
  $("#language-dropdown-button").text(label);
}

function setSortDropdownLabel(sortValue) {
  let label = "";
  switch(sortValue) {
    case "title":
      label = "Sort by Title";
      break;
    case "issued-asc":
      label = "Sort by Issued Date (Asc)";
      break;
    case "issued-desc":
      label = "Sort by Issued Date (Desc)";
      break;
    case "owner":
      label = "Sort by Data Owner";
      break;
    default:
      label = "Sort by Title";
  }
  $("#sort-dropdown-button").text(label);
}


/********************************************
 * FILTER & SORT
 ********************************************/
function filterDatasets(dataArray, textTokens, tagValues) {
  return dataArray.filter(d => {
    // Text: partial match if ANY token is found in ANY relevant field
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
            // Possibly multi-lang map
            return Object.values(val).some(v => v.toLowerCase().includes(tok));
          }
          return String(val).toLowerCase().includes(tok);
        });
      });
    }

    // Tag: exact match
    let tagMatch = true;
    if (tagValues.length) {
      const datasetKeywords = (d["dcat:keyword"] || []).map(k => k.toLowerCase());
      tagMatch = tagValues.every(tag => datasetKeywords.includes(tag));
    }

    return textMatch && tagMatch;
  });
}

function sortDatasets(dataArray, sortOption, lang) {
  // Shallow copy so we don't mutate original
  const sorted = [...dataArray];
  switch (sortOption) {
    case "title":
      sorted.sort((a, b) => {
        const aTitle = (a["dcterms:title"]?.[lang] || "").toLowerCase();
        const bTitle = (b["dcterms:title"]?.[lang] || "").toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
      break;
    case "issued-asc":
      sorted.sort((a, b) => {
        const aDate = new Date(a["dcterms:issued"]);
        const bDate = new Date(b["dcterms:issued"]);
        return aDate - bDate;
      });
      break;
    case "issued-desc":
      sorted.sort((a, b) => {
        const aDate = new Date(a["dcterms:issued"]);
        const bDate = new Date(b["dcterms:issued"]);
        return bDate - aDate;
      });
      break;
    case "owner":
      sorted.sort((a, b) => {
        const aOwner = getDataOwnerName(a).toLowerCase();
        const bOwner = getDataOwnerName(b).toLowerCase();
        return aOwner.localeCompare(bOwner);
      });
      break;
    default:
      // do nothing (no sort)
      break;
  }
  return sorted;
}

/********************************************
 * PAGINATION LOGIC (twbs)
 ********************************************/
function initPagination(totalItems, itemsPerPage, onPageChangeCb) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  // Destroy any existing pagination
  $("#pagination-container").twbsPagination("destroy");

  if (totalPages > 1) {
    $("#pagination-container").twbsPagination({
      totalPages: totalPages,
      visiblePages: 5,
      startPage: currentPage,
      onPageClick: function (event, page) {
        // Update "Page X of Y" text
        $("#page-indicator").text(`Page ${page} of ${totalPages}`);

        // Update currentPage, re-render
        currentPage = page;
        onPageChangeCb(page);
      }
    });
    // Also show the initial "Page X of Y" text
    $("#page-indicator").text(`Page ${currentPage} of ${totalPages}`);
  } else {
    // No pagination needed
    $("#pagination-container").empty();
    $("#page-indicator").empty(); // or show "Page 1 of 1" if you prefer
  }
}

/********************************************
 * RENDER: TILE VIEW
 ********************************************/
function renderTileView(filtered) {
  // 1. Sort
  const sortOption = currentSort;
  const sorted = sortDatasets(filtered, sortOption, currentLanguage);

  // 2. Initialize pagination for tile view
  initPagination(sorted.length, TILE_PAGE_SIZE, () => {
    renderTilePage(sorted);
  });

  // 3. Render the appropriate page
  renderTilePage(sorted);
}

/**
 * Build the tile HTML for the current page.
 * - No "owner" shown
 * - If date is not "N/A", show it italic
 * - Omit date field entirely if "N/A"
 * - No lines between attribute types
 * - Title: 1 line clamp
 * - Desc: 3 line clamp
 */
function renderTilePage(dataArray) {
  const startIdx = (currentPage - 1) * TILE_PAGE_SIZE;
  const endIdx = startIdx + TILE_PAGE_SIZE;
  const pageData = dataArray.slice(startIdx, endIdx);

  let html = "";
  pageData.forEach(d => {
    const title = getDisplayTitle(d);
    const desc = d["dcterms:description"]?.[currentLanguage] || "";
    const issued = formatDate(d["dcterms:issued"]);
    const keywords = d["dcat:keyword"] || [];
    const imageSrc = d["schema:image"] || 
      "https://via.placeholder.com/300x180?text=No+Image";

    // If date is not "N/A", we display it in italics. Otherwise, omit.
    let dateHTML = "";
    if (issued !== "N/A" && issued !== "Invalid Date") {
      dateHTML = `<p><em class="tile-date-italic">${issued}</em></p>`;
    }

    let keywordsHTML = "";
    keywords.forEach(kw => {
      keywordsHTML += `<span class="keyword" data-key="${kw}">${kw}</span> `;
    });

    html += `
      <div class="col">
        <div class="card h-100 dataset-card" data-id="${d["dcterms:identifier"]}">
          <img src="${imageSrc}" class="card-img-top" alt="${title}" />
          <div class="card-body">
            <!-- Title clamped to 1 line -->
            <h5 class="tile-title-ellipsis">${title}</h5>

            <!-- Description clamped to 3 lines -->
            <p class="tile-desc-ellipsis">${desc}</p>

            <!-- Date (italic) only if not N/A -->
            ${dateHTML}

            <!-- Keywords at the bottom -->
            <div class="keywords">${keywordsHTML}</div>
          </div>
        </div>
      </div>
    `;
  });

  $("#tile-view-container").html(html);

  // Show/hide relevant containers
  $("#tile-view-container").show();
  $("#table-container").hide();
}

/********************************************
 * RENDER: TABLE VIEW
 ********************************************/
function renderTableView(filtered) {
  // 1. Sort
  const sortOption = currentSort;
  const sorted = sortDatasets(filtered, sortOption, currentLanguage);

  // 2. Initialize pagination for table view
  initPagination(sorted.length, TABLE_PAGE_SIZE, () => {
    renderTablePage(sorted);
  });

  // 3. Render the appropriate page
  renderTablePage(sorted);
}

function renderTablePage(dataArray) {
  const startIdx = (currentPage - 1) * TABLE_PAGE_SIZE;
  const endIdx = startIdx + TABLE_PAGE_SIZE;
  const pageData = dataArray.slice(startIdx, endIdx);

  let rows = "";
  pageData.forEach(d => {
    const identifier = d["dcterms:identifier"] || "";
    const title = getDisplayTitle(d);
    const issued = formatDate(d["dcterms:issued"]);
    const owner = getDataOwnerName(d);
    const keywordsArr = d["dcat:keyword"] || [];
    const keywordsHTML = keywordsArr
      .map(kw => `<span class="keyword" data-key="${kw}">${kw}</span>`)
      .join(" ");

    rows += `
      <tr class="dataset-row" data-id="${identifier}">
        <td>${identifier}</td>
        <td>${title}</td>
        <td>${issued}</td>
        <td>${owner}</td>
        <td>
          <div class="keywords">${keywordsHTML}</div>
        </td>
      </tr>
    `;    
  });

  $("#dataset-table tbody").html(rows);

  // Show/hide containers
  $("#table-container").show();
  $("#tile-view-container").hide();
}

/********************************************
 * APPLY FILTERS & RENDER
 ********************************************/
function applyFiltersAndRender() {
  const text = $("#search").val().trim().toLowerCase();
  const textTokens = parseTokens(text);
  const tagValues = tagify.value.map(item => item.value.toLowerCase());

  // Filter
  const filtered = filterDatasets(datasets, textTokens, tagValues);

  // Update dataset count in hero banner
  $("#hero-dataset-count").text(`${filtered.length} Datensätze`);

  // Update URL
  updateUrlParams();

  if (viewMode === "tile") {
    $("#sort-container").show();
    renderTileView(filtered);
  } else {
    $("#sort-container").show();
    renderTableView(filtered);
  }
}

/********************************************
 * DOCUMENT READY
 ********************************************/
$(document).ready(function () {

  // 1. Read initial URL params
  readUrlParams();
  setLanguageDropdownLabel(currentLanguage);
  setSortDropdownLabel(currentSort);

  // 2. Initialize Tagify
  const input = document.getElementById('tag-input');
  tagify = new Tagify(input, {
    whitelist: [],
    dropdown: { enabled: 0 }
  });

  // 3. Fetch Data
  $.getJSON(dataUrl)
    .done(function (data) {
      datasets = data;
      applyFiltersAndRender();
    })
    .fail(function (err) {
      console.error("Error fetching data:", err);
    });

  // 4. Event listeners
  // a) Text search
  $("#search").on("input", function () {
    currentPage = 1;
    applyFiltersAndRender();
  });
  // b) Tagify
  tagify.on('change', function () {
    currentPage = 1;
    applyFiltersAndRender();
  });
  // When user clicks a language option
  $(document).on("click", ".dropdown-item.lang-option", function(e) {
    e.preventDefault(); // don't follow href
    currentLanguage = $(this).data("lang"); 
    setLanguageDropdownLabel(currentLanguage);
    currentPage = 1;
    applyFiltersAndRender();
  });

  // When user clicks a sort option
  $(document).on("click", ".dropdown-item.sort-option", function(e) {
    e.preventDefault();
    currentSort = $(this).data("sort");
    setSortDropdownLabel(currentSort);
    currentPage = 1;
    applyFiltersAndRender();
  });

  // e) View mode toggle
  $("input[name='viewMode']").on("change", function () {
    viewMode = $(this).val();
    currentPage = 1;
    applyFiltersAndRender();
  });
  // f) Click on tile or row => go to details
  $(document).on("click", ".dataset-card, .dataset-row", function () {
    const id = $(this).data("id");
    window.location.href = `details.html?dataset=${id}&lang=${currentLanguage}`;
  });
  // g) Click on a keyword => add tag
  $(document).on("click", ".keywords .keyword", function (e) {
    e.stopPropagation();
    const tag = $(this).data("key") || $(this).text();
    const lowerTag = tag.toLowerCase();
    if (!tagify.value.some(item => item.value.toLowerCase() === lowerTag)) {
      tagify.addTags([tag]);
      currentPage = 1;
      applyFiltersAndRender();
    }
  });
  // h) On window resize, re-render if needed (for tile layout)
  $(window).on("resize", function () {
    if (viewMode === "tile") {
      currentPage = 1;
      applyFiltersAndRender();
    }
  });
});
