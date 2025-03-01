/********************************************
 * GLOBAL VARIABLES & CONFIG
 ********************************************/
const branch = "main";
const dataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/docs/assets/datasets.json`;

// Master data
let datasets = [];
// UI state
let currentLanguage = "en"; // Default
let viewMode = "tile";      // "tile" or "table"
let currentPage = 1;
// Page sizes
const TILE_PAGE_SIZE = 9;   // 3×3 layout
const TABLE_PAGE_SIZE = 10; // 10 rows per table page
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
    $("#language-select").val(currentLanguage);
  }
  if (params.has("sort")) {
    $("#sort-options").val(params.get("sort"));
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
  const lang = $("#language-select").val();
  const sort = $("#sort-options").val();
  const text = $("#search").val().trim();
  const params = new URLSearchParams({ lang, sort, view: viewMode, page: currentPage });
  if (text) params.set("text", text);
  window.history.replaceState({}, "", "?" + params.toString());
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

    // Tag: exact match (i.e., user typed "milk", dataset must have "milk" as a keyword)
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
/**
 * Initializes or re-initializes the twbs-pagination plugin.
 * @param {number} totalItems 
 * @param {number} itemsPerPage 
 * @param {function} onPageChangeCb callback when page changes
 */
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
        if (page !== currentPage) {
          currentPage = page;
          updateUrlParams();
          onPageChangeCb(page);
        }
      }
    });
  } else {
    // No pagination needed
    $("#pagination-container").empty();
  }
}

/********************************************
 * RENDER: TILE VIEW
 ********************************************/
function renderTileView(filtered) {
  // 1. Sort
  const sortOption = $("#sort-options").val();
  const sorted = sortDatasets(filtered, sortOption, currentLanguage);

  // 2. Initialize pagination for tile view
  initPagination(sorted.length, TILE_PAGE_SIZE, () => {
    renderTilePage(sorted);
  });

  // 3. Render the appropriate page
  renderTilePage(sorted);
}

function renderTilePage(dataArray) {
  const startIdx = (currentPage - 1) * TILE_PAGE_SIZE;
  const endIdx = startIdx + TILE_PAGE_SIZE;
  const pageData = dataArray.slice(startIdx, endIdx);

  let html = "";
  pageData.forEach(d => {
    const title = getDisplayTitle(d);
    const desc = d["dcterms:description"]?.[currentLanguage] || "";
    const truncatedDesc = truncate(desc, 80);
    const issued = formatDate(d["dcterms:issued"]);
    const owner = getDataOwnerName(d);
    const keywords = d["dcat:keyword"] || [];
    const imageSrc = d["schema:image"] || 
      "https://via.placeholder.com/300x180?text=No+Image";

    let keywordsHTML = "";
    keywords.forEach(kw => {
      keywordsHTML += `<span class="keyword" data-key="${kw}">${kw}</span> `;
    });

    html += `
      <div class="col">
        <div class="card h-100 dataset-card" data-id="${d["dcterms:identifier"]}">
          <img src="${imageSrc}" class="card-img-top" alt="${title}" />
          <div class="card-body">
            <h5 class="card-title">${title}</h5>
            <p class="card-text text-muted">${truncatedDesc}</p>
          </div>
          <ul class="list-group list-group-flush">
            <li class="list-group-item"><strong>Issued:</strong> ${issued}</li>
            <li class="list-group-item"><strong>Owner:</strong> ${owner}</li>
            <li class="list-group-item keywords">${keywordsHTML}</li>
          </ul>
        </div>
      </div>
    `;
  });

  // Insert into DOM
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
  const sortOption = $("#sort-options").val();
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

  // Build rows
  let rows = "";
  pageData.forEach(d => {
    const identifier = d["dcterms:identifier"] || "";
    const title = getDisplayTitle(d);
    const issued = formatDate(d["dcterms:issued"]);
    const owner = getDataOwnerName(d);
    const keywords = (d["dcat:keyword"] || []).join(", ");

    rows += `
      <tr class="dataset-row" data-id="${identifier}">
        <td>${identifier}</td>
        <td>${title}</td>
        <td>${issued}</td>
        <td>${owner}</td>
        <td>${keywords}</td>
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

  // Show or hide the sort dropdown (you could show it for both if you want)
  if (viewMode === "tile") {
    $("#sort-container").show();
    renderTileView(filtered);
  } else {
    $("#sort-container").show(); // or hide if you prefer
    renderTableView(filtered);
  }
}

/********************************************
 * DOCUMENT READY
 ********************************************/
$(document).ready(function () {
  // 1. Read initial URL params
  readUrlParams();

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
  // c) Language select
  $("#language-select").on("change", function () {
    currentLanguage = $(this).val();
    currentPage = 1;
    applyFiltersAndRender();
  });
  // d) Sort dropdown
  $("#sort-options").on("change", function () {
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
  // h) On window resize, re-render tile if needed
  $(window).on("resize", function () {
    if (viewMode === "tile") {
      currentPage = 1;
      applyFiltersAndRender();
    }
  });
});
