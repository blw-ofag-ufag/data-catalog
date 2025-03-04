I am working on a data catalog site. It will be deployed as a static site and reads it's metadata that it displays form JSON files.

Here's the main page HTML:

```html
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>FOAG data catalog</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"  rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@yaireo/tagify/dist/tagify.css" />
      <link rel="stylesheet" href="assets/css/style.css" />
   </head>
   <body data-page="index.html">
      <div id="navbar-placeholder"></div>
      <section class="hero-banner">
         <h1>Willkommen zum Datenkatalog des Bundesamts für Landwirtschaft</h1>
         <p class="lead">
            Hier finden Sie alle vom Bundesamt für Landwirtschaft (BLW) gesammelten Datensätze. 
            Die Daten selbst werden in diesem GitHub-Repository veröffentlicht und gepflegt. 
            Wenn Sie zu dieser Sammlung beitragen möchten, wenden Sie sich bitte an das Kompetenzzentrum für die digitale Transformation.
         </p>
      </section>
      <section class="search-section">
         <div class="container">
            <div class="row align-items-center">
               <div class="col-sm-3">
                  <input type="text" id="search" class="form-control unified-control" placeholder="Search text..." />
               </div>
               <div class="col-sm-4">
                  <input type="text" id="tag-input" class="form-control unified-control" placeholder="Add tags..." />
               </div>
               <div class="col-sm-3" id="sort-container">
                  <div class="dropdown">
                     <button class="btn unified-control dropdown-toggle" type="button" id="sort-dropdown-button" data-bs-toggle="dropdown" aria-expanded="false">
                     Sort by Title
                     </button>
                     <ul class="dropdown-menu" aria-labelledby="sort-dropdown-button">
                        <li><a class="dropdown-item sort-option" data-sort="title" href="#">Sort by Title</a></li>
                        <li><a class="dropdown-item sort-option" data-sort="issued-asc" href="#">Sort by Issued Date (Asc)</a></li>
                        <li><a class="dropdown-item sort-option" data-sort="issued-desc" href="#">Sort by Issued Date (Desc)</a></li>
                        <li><a class="dropdown-item sort-option" data-sort="owner" href="#">Sort by Data Owner</a></li>
                     </ul>
                  </div>
               </div>
               <div class="col-sm-2 text-end">
                  <div class="btn-group" role="group">
                     <input type="radio" class="btn-check" name="viewMode" id="tile-view" value="tile" checked/>
                     <label class="btn unified-control" for="tile-view">Tile</label>
                     <input type="radio" class="btn-check" name="viewMode" id="table-view" value="table"/>
                     <label class="btn unified-control" for="table-view">Table</label>
                  </div>
               </div>
            </div>
            <div id="search-chips-container" class="mt-2"></div>
         </div>
      </section>

      <main class="container my-3">
         <div id="tile-view-container" class="row row-cols-1 row-cols-md-3 g-4"></div>
         <div id="table-container" style="display:none;">
            <table class="table table-hover table-fixed align-middle" id="dataset-table">
               <thead>
                  <tr>
                     <th>Identifier</th>
                     <th>Title</th>
                     <th>Issued</th>
                     <th>Owner</th>
                     <th>Keywords</th>
                  </tr>
               </thead>
               <tbody>
                  <!-- Rows appended dynamically -->
               </tbody>
            </table>
         </div>
         <div class="row align-items-center my-3">
            <div class="col text-start" id="page-indicator"></div>
            <div class="col text-end">
               <ul id="pagination-container" class="pagination justify-content-end"></ul>
            </div>
         </div>
      </main>

      <!-- Footer placeholder -->
      <div id="footer-placeholder"></div>

      <!-- Insert and navbar and footer -->
      <script>
         $(document).ready(function() {
           $("#navbar-placeholder").load("navbar.html", function() {});
           $("#footer-placeholder").load("footer.html", function() {});
         });
      </script>
      
      <!-- JavaScript Libraries -->
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@yaireo/tagify"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/twbs-pagination/1.4.2/jquery.twbsPagination.min.js"></script>
      <script src="assets/js/main.js"></script>
   </body>
</html>
```

And here is the main JavaScript code:

```js
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
  return data.dataOwner || "N/A";
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
        return aTitle.localeCompare(bTitle);
      });
      break;
    case "issued-asc":
      sorted.sort((a, b) => new Date(a["dcterms:issued"]) - new Date(b["dcterms:issued"]));
      break;
    case "issued-desc":
      sorted.sort((a, b) => new Date(b["dcterms:issued"]) - new Date(a["dcterms:issued"]));
      break;
    case "owner":
      sorted.sort((a, b) => {
        const aOwner = getDataOwnerName(a).toLowerCase();
        const bOwner = getDataOwnerName(b).toLowerCase();
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
  let label = "";
  switch (sortValue) {
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
  const title = getDisplayTitle(dataset);
  const issued = formatDate(dataset["dcterms:issued"]);
  const owner = getDataOwnerName(dataset);
  const keywordsArr = dataset["dcat:keyword"] || [];
  const keywordsHTML = keywordsArr
    .map((kw) => `<span class="keyword" data-key="${kw}">${kw}</span>`)
    .join(" ");

  return `
    <tr class="dataset-row" data-id="${identifier}">
      <td>${identifier}</td>
      <td>${title}</td>
      <td>${issued}</td>
      <td>${owner}</td>
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

    // Language dropdown
    $(document).on("click", ".dropdown-item.lang-option", function (e) {
      e.preventDefault();
      state.lang = $(this).data("lang");
      setLanguageDropdownLabel(state.lang);
      state.currentPage = 1;
      applyFiltersAndRender();
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

  // 3) Reflect state into the UI (after Tagify is ready)
  //    This sets up search text, view mode, etc.
  reflectStateInUI();

  // 4) Fetch datasets
  $.getJSON(config.dataUrl)
    .done(function (data) {
      state.datasets = data;
      // Render for the first time
      applyFiltersAndRender();
    })
    .fail(function (err) {
      console.error("Error fetching data:", err);
    });

  // 5) Attach event listeners
  setupEventListeners();

  // 6) Load footer in the same manner, if needed
  $("#footer-placeholder").load("footer.html");
});
```

Note that the navbar is externalized as it's reused across pages:

```html
<nav class="navbar navbar-expand-lg navbar-light bg-light">
  <div class="container">
     <a class="navbar-brand" href="index.html">DigiAgriCat</a>
     <div class="d-flex ms-auto align-items-right">
        <ul class="navbar-nav me-3">
           <li class="nav-item"><a class="nav-link" href="about.html">Über diesen Datenkatalog</a></li>
           <li class="nav-item"><a class="nav-link" href="handbook.html">Handbuch</a></li>
           <li class="nav-item"><a class="nav-link" href="mailto:kompetenzzentrumdigitaletransformation@blw.admin.ch">Kontakt</a></li>
        </ul>
        <div class="dropdown me-0">
           <button class="btn unified-control dropdown-toggle" type="button" id="language-dropdown-button" data-bs-toggle="dropdown" aria-expanded="false">
           English
           </button>
           <ul class="dropdown-menu" aria-labelledby="language-dropdown-button">
              <li><a class="dropdown-item lang-option" data-lang="de" href="#">Deutsch</a></li>
              <li><a class="dropdown-item lang-option" data-lang="fr" href="#">Français</a></li>
              <li><a class="dropdown-item lang-option" data-lang="it" href="#">Italiano</a></li>
              <li><a class="dropdown-item lang-option" data-lang="en" href="#">English</a></li>
           </ul>
        </div>
     </div>
  </div>
</nav>
```

I want to implement working multilingualism to the site. Currently, the site only supports multilingualism in the fetched data, but not the content of the static site. Please propose a JSON structure for `translations.json` and then re-write the code where necessary. Implement a translating script in a separate `translations.js`.