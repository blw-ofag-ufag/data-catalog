"use strict";

/********************************************
 * CONFIG & STATE
 ********************************************/
const config = {
  branch: "main",
  dataUrl: "assets/datasets.json", // can be relative or absolute
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
  tags: []           // holds array of selected tag keywords
};

let tagify = null; // Assigned to our Tagify instance

/********************************************
 * FILTER & SORT FUNCTIONS
 ********************************************/
function filterDatasets(dataArray) {
  const textTokens = Utils.parseTokens(state.searchText);
  const tagValues = state.tags.map(tag => tag.toLowerCase());

  return dataArray.filter(d => {
    let textMatch = true;
    if (textTokens.length) {
      textMatch = textTokens.some(tok => {
        const fields = [
          "dct:identifier", 
          "dct:title", 
          "dct:description", 
          "dcat:keyword",
          "dct:issued", 
          "businessDataOwner"
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
        const aTitle = ((a["dct:title"] && a["dct:title"][state.lang]) || "").toLowerCase();
        const bTitle = ((b["dct:title"] && b["dct:title"][state.lang]) || "").toLowerCase();
        if (!aTitle && bTitle) return 1;
        if (aTitle && !bTitle) return -1;
        return aTitle.localeCompare(bTitle);
      });
      break;
    case "issued-asc":
      sorted.sort((a, b) => {
        const aDate = a["dct:issued"] ? new Date(a["dct:issued"]) : null;
        const bDate = b["dct:issued"] ? new Date(b["dct:issued"]) : null;
        if (!aDate && bDate) return 1;
        if (aDate && !bDate) return -1;
        if (!aDate && !bDate) return 0;
        return aDate - bDate;
      });
      break;
    case "issued-desc":
      sorted.sort((a, b) => {
        const aDate = a["dct:issued"] ? new Date(a["dct:issued"]) : null;
        const bDate = b["dct:issued"] ? new Date(b["dct:issued"]) : null;
        if (!aDate && bDate) return 1;
        if (aDate && !bDate) return -1;
        if (!aDate && !bDate) return 0;
        return bDate - aDate;
      });
      break;
    case "owner":
      sorted.sort((a, b) => {
        const aOwner = Utils.getDataOwnerName(a).toLowerCase();
        const bOwner = Utils.getDataOwnerName(b).toLowerCase();
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

  if (params.has("tags")) {
    const raw = params.get("tags");
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
  if (state.tags.length > 0) {
    params.set("tags", state.tags.join(","));
  }
  const newUrl = "?" + params.toString();
  history.pushState(null, "", newUrl);
}

window.addEventListener("popstate", () => {
  syncStateFromURL();
  reflectStateInUI();
  applyFiltersAndRender();
});

/********************************************
 * REFLECT STATE IN UI ELEMENTS
 ********************************************/
function reflectStateInUI() {
  $("#search").val(state.searchText);
  $("input[name='viewMode'][value='" + state.viewMode + "']").prop("checked", true);
  Utils.setLanguageDropdownLabel(state.lang);
  Utils.setSortDropdownLabel(state.sort);
  tagify.removeAllTags();
  if (state.tags.length) {
    tagify.addTags(state.tags);
  }
}

/********************************************
 * RENDERING TEMPLATES
 ********************************************/
function tileCardTemplate(dataset) {
  const title = Utils.getDisplayTitle(dataset, state.lang);
  const desc = (dataset["dct:description"] && dataset["dct:description"][state.lang]) || "";
  const issued = Utils.formatDate(dataset["dct:issued"], state.lang);
  const keywords = dataset["dcat:keyword"] || [];
  const imageSrc = dataset["schema:image"] || "https://fal.media/files/koala/fu3fHRalAzcHsxBFze10d_dc302f8699ab49ffadb957300e226b94.jpg";

  const dateHTML = issued !== "N/A" && issued !== "Invalid Date"
    ? `<p><em class="tile-date-italic">${issued}</em></p>`
    : "";
  const keywordsHTML = keywords
    .map((kw) => `<span class="keyword" data-key="${kw}">${kw}</span>`)
    .join(" ");

  return `
    <div class="col">
      <div class="card h-100 dataset-card" data-id="${dataset["dct:identifier"]}">
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
  const identifier = dataset["dct:identifier"] || "";
  const title = (dataset["dct:title"] && dataset["dct:title"][state.lang]) || "";
  const issued = Utils.formatDate(dataset["dct:issued"], state.lang);
  const owner = Utils.getDataOwnerName(dataset);
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
  const paginationLabels = {
    en: { pageIndicator: "Page",   of: "of",  first: "First",    prev: "Previous",   next: "Next",       last: "Last" },
    de: { pageIndicator: "Seite",  of: "von", first: "Erste",    prev: "Zurück",     next: "Weiter",     last: "Letzte" },
    fr: { pageIndicator: "Page",   of: "de",  first: "Première", prev: "Précédent",  next: "Suivant",    last: "Dernière" },
    it: { pageIndicator: "Pagina", of: "di",  first: "Prima",    prev: "Precedente", next: "Successivo", last: "Ultima" }
  };  
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  $("#pagination-container").twbsPagination("destroy");
  if (totalPages > 1) {
    $("#pagination-container").twbsPagination({
      totalPages: totalPages,
      visiblePages: 5,
      startPage: state.currentPage,
      first: paginationLabels[state.lang].first,
      prev: paginationLabels[state.lang].prev,
      next: paginationLabels[state.lang].next,
      last: paginationLabels[state.lang].last,
      onPageClick: function (event, page) {
        $("#page-indicator").text(
          `${paginationLabels[state.lang].pageIndicator} ${page} ${paginationLabels[state.lang].of} ${totalPages}`
        );
        state.currentPage = page;
        syncURLFromState();
        renderPageCb();
      }
    });
    $("#page-indicator").text(
      `${paginationLabels[state.lang].pageIndicator} ${state.currentPage} ${paginationLabels[state.lang].of} ${totalPages}`
    );
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
  state.searchText = $("#search").val().trim().toLowerCase();
  const filtered = filterDatasets(state.datasets);
  $("#hero-dataset-count").text(`${filtered.length} Datensätze`);
  syncURLFromState();
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
  $("#search").on("input", function () {
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  tagify.on("change", function () {
    state.tags = tagify.value.map(item => item.value);
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  $("#navbar-placeholder").load("navbar.html", () => {
    Utils.setLanguageDropdownLabel(state.lang);
    Utils.setSortDropdownLabel(state.sort);
    $(document).on("click", ".dropdown-item.lang-option", function (e) {
      e.preventDefault();
      state.lang = $(this).data("lang");
      Utils.setLanguageDropdownLabel(state.lang);
      applyFiltersAndRender();
      changeLanguage(state.lang);
    });
    $(document).on("click", ".dropdown-item.sort-option", function (e) {
      e.preventDefault();
      state.sort = $(this).data("sort");
      Utils.setSortDropdownLabel(state.sort);
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  });

  $("input[name='viewMode']").on("change", function () {
    state.viewMode = $(this).val();
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  $(document).on("click", ".dataset-card, .dataset-row", function () {
    const id = $(this).data("id");
    window.location.href = `details.html?dataset=${id}&lang=${state.lang}`;
  });
  
  $(document).on("click", ".keywords .keyword", function (e) {
    e.stopPropagation();
    const tag = $(this).data("key") || $(this).text();
    if (!state.tags.includes(tag)) {
      tagify.addTags([tag]);
    }
  });
  
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
  syncStateFromURL();
  const tagInput = document.getElementById("tag-input");
  tagify = new Tagify(tagInput, {
    whitelist: [],
    dropdown: { enabled: 0 },
  });
  tagify.DOM.scope.classList.add('customLook');
  $.getJSON(config.dataUrl)
    .done(function (data) {
      state.datasets = data;
    })
    .fail(err => {
      console.error("Error fetching data:", err);
    });
  setupEventListeners();
  $("#footer-placeholder").load("footer.html");
  $.getJSON(config.dataUrl)
    .done(function (data) {
      state.datasets = data;
      applyFiltersAndRender();
    })
    .fail(function (err) {
      console.error("Error fetching data:", err);
    });
  initI18n(state.lang, () => {
    reflectStateInUI();        // Now translations exist
    applyFiltersAndRender();   // Data is loaded, so we can render properly
  });
});
