/********************************************
 * GLOBAL VARIABLES & CONFIG
 ********************************************/
const branch = "main";
const dataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/docs/assets/datasets.json`;
let datasets = [];
let currentLanguage = "en";
let viewMode = "tile"; // "tile" or "table"
let currentPage = 1;
const TABLE_PAGE_SIZE = 10;
let tagify; // Tagify instance

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
// For tile view, calculate page size based on container width
function getTilePageSize() {
  const containerWidth = $("#dataset-container").width();
  const cols = Math.floor(containerWidth / 280) || 1;
  return cols * 3;
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
 * RENDER FUNCTIONS
 ********************************************/
// Render tile view using twbs-pagination
function renderTiles(filtered) {
  const pageSize = getTilePageSize();
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  
  const pageData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  let html = '<div class="tile-grid">';
  pageData.forEach(d => {
    let title = (d["dcterms:title"]?.[currentLanguage] || "Untitled");
    if (title.length > 50) title = title.slice(0,50) + "...";
    const desc = d["dcterms:description"]?.[currentLanguage] || "";
    const keywords = d["dcat:keyword"] || [];
    let keywordsHTML = keywords.slice(0,5).map(kw => `<span class="keyword" data-key="${kw}">${kw}</span>`).join(" ");
    if (keywords.length > 5) {
      keywordsHTML += `<span class="keyword">+${keywords.length - 5} more</span>`;
    }
    html += `
      <div class="dataset-tile" data-id="${d["dcterms:identifier"]}">
        <img src="${d["schema:image"] || ''}" alt="${title}" />
        <div class="dataset-info">
          <h3>${title}</h3>
          <p class="desc">${desc}</p>
          <p class="meta"><strong>Issued:</strong> ${formatDate(d["dcterms:issued"])}</p>
          <p class="meta"><strong>Owner:</strong> ${getDataOwnerName(d)}</p>
          <div class="keywords">${keywordsHTML}</div>
        </div>
      </div>
    `;
  });
  html += "</div>";
  $("#dataset-container").html(html);
  
  // Initialize pagination for tile view using twbs-pagination
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
          renderTiles(filtered);
        }
      }
    });
  } else {
    $("#pagination-container").html("");
  }
}

// Render table view using DataTables
function renderTable(filtered) {
  let rows = "";
  filtered.forEach(d => {
    let title = (d["dcterms:title"]?.[currentLanguage] || "Untitled");
    if (title.length > 50) title = title.slice(0,50) + "...";
    const issued = formatDate(d["dcterms:issued"]);
    const owner = getDataOwnerName(d);
    const keywords = (d["dcat:keyword"] || []).join(", ");
    rows += `
      <tr data-id="${d["dcterms:identifier"]}">
        <td>${d["dcterms:identifier"] || ""}</td>
        <td>${title}</td>
        <td>${issued}</td>
        <td>${owner}</td>
        <td>${keywords}</td>
      </tr>
    `;
  });
  $("#dataset-table tbody").html(rows);
  $("#table-container").show();
  $("#dataset-container, #pagination-container").hide();
  
  // Initialize DataTables (destroy previous instance if exists)
  if ($.fn.DataTable.isDataTable('#dataset-table')) {
    $('#dataset-table').DataTable().destroy();
  }
  $('#dataset-table').DataTable({
    pageLength: TABLE_PAGE_SIZE,
    lengthChange: false,
    searching: false,
    ordering: true,
    info: true
  });
}

/********************************************
 * FILTERING & RENDERING
 ********************************************/
function applyFilters() {
  const text = $("#search").val().trim().toLowerCase();
  const textTokens = parseTokens(text);
  // Get tag values from Tagify
  const tagData = tagify.value;
  const tagValues = tagData.map(item => item.value.toLowerCase());
  
  let filtered = datasets.filter(d => {
    // Text filtering
    let textMatch = true;
    if (textTokens.length) {
      const fields = ["dcterms:identifier", "dcterms:title", "dcterms:description", "dcat:keyword", "dcterms:issued", "dataOwner"];
      textMatch = textTokens.some(tok => {
        return fields.some(f => {
          const val = d[f];
          if (!val) return false;
          if (f === "dcat:keyword") {
            return val.some(k => k.toLowerCase().includes(tok));
          }
          if (typeof val === "object") {
            return Object.values(val).some(v => v.toLowerCase().includes(tok));
          }
          return String(val).toLowerCase().includes(tok);
        });
      });
    }
    // Tag filtering: every tag must appear in dcat:keyword
    let tagMatch = true;
    if (tagValues.length) {
      tagMatch = tagValues.every(tag => {
        return (d["dcat:keyword"] || []).some(k => k.toLowerCase().includes(tag));
      });
    }
    return textMatch && tagMatch;
  });
  
  // Update hero dataset count
  $("#hero-dataset-count").text(`${filtered.length} Datensätze`);
  
  // Show/hide sort dropdown based on view mode (only for tile view)
  if (viewMode === "tile") {
    $("#sort-options").show();
    $("#table-container").hide();
    $("#dataset-container, #pagination-container").show();
    renderTiles(filtered);
  } else {
    $("#sort-options").hide();
    renderTable(filtered);
  }
  
  updateUrlParams();
}

/********************************************
 * EVENT BINDINGS
 ********************************************/
$(document).ready(function () {
  readUrlParams();
  
  // Initialize Tagify on tag input
  const input = document.getElementById('tag-input');
  tagify = new Tagify(input, {
    whitelist: [],
    dropdown: { enabled: 0 }
  });
  
  // Fetch data
  $.getJSON(dataUrl)
    .done(function (data) {
      datasets = data;
      applyFilters();
    })
    .fail(function (err) {
      console.error("Error fetching data:", err);
    });
  
  // Search input
  $("#search").on("input", function () {
    currentPage = 1;
    applyFilters();
  });
  
  // Tagify change
  tagify.on('change', function () {
    currentPage = 1;
    applyFilters();
  });
  
  // Language selection
  $("#language-select").on("change", function () {
    currentLanguage = $("#language-select").val();
    currentPage = 1;
    applyFilters();
  });
  
  // Sort options (only visible in tile view)
  $("#sort-options").on("change", function () {
    currentPage = 1;
    applyFilters();
  });
  
  // View mode toggle
  $("input[name='viewMode']").on("change", function () {
    viewMode = $(this).val();
    currentPage = 1;
    applyFilters();
  });
  
  // Delegate click for details page
  $(document).on("click", ".dataset-tile, .dataset-table tbody tr", function () {
    const id = $(this).data("id");
    window.location.href = `details.html?dataset=${id}&lang=${$("#language-select").val()}`;
  });
  
  // Delegate click on keyword span to add tag via Tagify
  $(document).on("click", ".keywords .keyword", function (e) {
    e.stopPropagation();
    const tag = $(this).data("key") || $(this).text();
    if (tag && !tagify.value.find(item => item.value.toLowerCase() === tag.toLowerCase())) {
      tagify.addTags([tag]);
      currentPage = 1;
      applyFilters();
    }
  });
  
  // Recalculate tile page size on window resize
  $(window).on("resize", function () {
    if (viewMode === "tile") {
      currentPage = 1;
      applyFilters();
    }
  });
});
