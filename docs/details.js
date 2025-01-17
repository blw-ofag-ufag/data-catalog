/******************************************************
 *  Configuration
 *****************************************************/
const dataUrl =
  "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalogOld.json";

/******************************************************
 *  Helper for Date Formatting
 *****************************************************/
/**
 * If `val` looks like a date/time string, convert it to the user's
 * chosen language, "long" format. Otherwise return as-is.
 */
function formatDateIfPossible(val, lang) {
  if (typeof val !== "string") return val; // only attempt on strings
  if (!val) return val; // empty string => just return it

  // Try parsing as a date
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    // Not a valid Date => just return original
    return val;
  }

  // If valid, return in localized "long" format
  // e.g., "January 5, 2025"
  return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(d);
}

/******************************************************
 *  On Page Load
 *****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // 1) Read parameters => ?dataset=FOAG-D00001&lang=it
  const params = new URLSearchParams(window.location.search);
  const datasetId = params.get("dataset"); // e.g. "FOAG-D00001"
  const selectedLang = params.get("lang") || "en"; // default if missing

  // 2) Fetch the data from your GitHub JSON
  fetch(dataUrl)
    .then((res) => res.json())
    .then((data) => {
      // The new structure has "datasets" as an array
      const allDatasets = data.datasets;

      // Locate the matching dataset by ID (note "dcterms:identifier")
      const dataset = allDatasets.find((ds) => {
        return ds.attributes["dcterms:identifier"] === datasetId;
      });

      if (!dataset) {
        renderNotFound(datasetId);
      } else {
        renderFullPageDetails(dataset, selectedLang);
      }
    })
    .catch((err) => {
      console.error("Error fetching data:", err);
      renderErrorMessage();
    });
});

/******************************************************
 *  Rendering Functions
 *****************************************************/
/**
 * If dataset not found, show a simple message
 */
function renderNotFound(datasetId) {
  const banner = document.getElementById("heroBanner");
  banner.style.background = "var(--secondary-background-color)";

  document.getElementById("datasetID").textContent = "";
  document.getElementById("datasetTitle").textContent = "Dataset Not Found";
  document.getElementById("datasetDescription").textContent = `No dataset found with ID ${datasetId}`;
}

/**
 * Show a generic error if fetch fails
 */
function renderErrorMessage() {
  const banner = document.getElementById("heroBanner");
  banner.style.background = "var(--secondary-background-color)";

  document.getElementById("datasetID").textContent = "";
  document.getElementById("datasetTitle").textContent = "Error";
  document.getElementById("datasetDescription").textContent =
    "Could not load dataset. Check console for more information.";
}

/**
 * Render the entire page in a "full-page" style with hero image at top
 */
function renderFullPageDetails(dataset, lang) {
  const { metadata, attributes } = dataset;

  // 1) Hero Banner => set background image
  //    (Adjust to "metadata.ImageURL" if needed)
  const heroBanner = document.getElementById("heroBanner");
  heroBanner.style.backgroundImage = `url('${metadata.imageURL}')`;

  // 2) ID (monospace), Title (H1), Description
  const datasetIDEl = document.getElementById("datasetID");
  datasetIDEl.textContent = attributes["dcterms:identifier"] || "";

  const titleEl = document.getElementById("datasetTitle");
  const datasetTitle = getLocalized(attributes["dcterms:title"], lang);
  titleEl.textContent = datasetTitle || "Untitled Dataset";

  const descEl = document.getElementById("datasetDescription");
  const desc = getLocalized(attributes["dcterms:description"], lang);
  descEl.textContent = desc;

  // 3) Keywords
  const keywordsContainer = document.getElementById("keywordsContainer");
  const keywords = attributes["dcat:keyword"] || [];
  keywordsContainer.innerHTML = ""; // clear if any
  keywords.forEach((kw) => {
    const span = document.createElement("span");
    span.classList.add("keyword-chip");
    span.textContent = kw;
    keywordsContainer.appendChild(span);
  });

  // 4) Show the "Affiliated roles" (bv:affiliatedPersons) in its own table
  renderAffiliatedPersons(attributes, lang);

  // 5) Show leftover "Metadata" in a table
  renderMetadata(attributes, lang);

  // 6) Distributions
  renderDistributions(attributes, lang);
}

/**
 * Renders the array of `bv:affiliatedPersons` in a minimalistic table
 */
function renderAffiliatedPersons(attributes, lang) {
  const section = document.getElementById("metadataSection");
  // We'll add a sub-section for affiliated persons
  const persons = attributes["bv:affiliatedPersons"] || [];

  let html = `<h2>Affiliated Roles</h2>`;

  if (!Array.isArray(persons) || persons.length === 0) {
    html += `<p>No affiliated persons.</p>`;
    section.innerHTML = html;
    return;
  }

  // A simple table
  html += `
    <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
          <th style="padding: 8px;">Name</th>
          <th style="padding: 8px;">Email</th>
          <th style="padding: 8px;">Role</th>
        </tr>
      </thead>
      <tbody>
  `;

  persons.forEach((p) => {
    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">${p.name}</td>
        <td style="padding: 8px;">${p.email}</td>
        <td style="padding: 8px;">${p.role}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  section.innerHTML = html;
}

/**
 * Renders the leftover metadata (excluding the known fields) in a table
 */
function renderMetadata(attributes, lang) {
  // We'll place it below the roles (in the same #metadataSection) or you can place it elsewhere
  const section = document.getElementById("metadataSection");

  // Prepare a list of fields to skip
  const displayed = [
    "dcterms:identifier",
    "dcterms:title",
    "dcterms:description",
    "dcat:keyword",
    "bv:affiliatedPersons",
    "dcat:distribution"
  ];

  // We'll build a sub-header plus table
  let html = `
    <h2>Metadata</h2>
    <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
          <th style="padding: 8px;">Field</th>
          <th style="padding: 8px;">Value</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Loop over leftover fields
  for (const key of Object.keys(attributes)) {
    if (displayed.includes(key)) continue;

    let val = attributes[key];

    // If it's a date string, localize it
    if (typeof val === "string") {
      val = formatDateIfPossible(val, lang);
    }
    // If it's an array, we might date-format each item
    else if (Array.isArray(val)) {
      val = val.map((item) => formatDateIfPossible(item, lang)).join(", ");
    }
    // If it's an object, try JSON-stringify
    else if (typeof val === "object" && val !== null) {
      val = JSON.stringify(val);
    }

    if (!val) continue; // skip empty or undefined

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;"><strong>${key}</strong></td>
        <td style="padding: 8px;">${val}</td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  // Append to the existing content in #metadataSection
  section.innerHTML += html;
}

/**
 * Renders distributions (if any) in a bullet list
 */
function renderDistributions(attributes, lang) {
  const section = document.getElementById("distributionsSection");
  const distributions = attributes["dcat:distribution"] || [];

  if (!Array.isArray(distributions) || distributions.length === 0) {
    section.innerHTML = `
      <h2>Distributions</h2>
      <div class="distributions-list">
        <ul><li>No Distributions</li></ul>
      </div>
    `;
    return;
  }

  // Build bullet list
  const distList = distributions
    .map((dist) => {
      const distAttrs = dist.attributes || {};
      const distTitle = getLocalized(distAttrs["dcterms:title"], lang);
      const distDesc = getLocalized(distAttrs["dcterms:description"], lang);
      const distFormat = distAttrs["dcterms:format"] || "N/A";

      // If there's a "dcterms:modified", format it
      if (distAttrs["dcterms:modified"]) {
        distAttrs["dcterms:modified"] = formatDateIfPossible(
          distAttrs["dcterms:modified"],
          lang
        );
      }

      const distURL =
        distAttrs["dcat:downloadURL"] ||
        distAttrs["dcat:accessURL"] ||
        "#";

      return `
        <li>
          - <strong>${distTitle}</strong>
            (Format: ${distFormat})<br />
            ${distDesc}<br />
            <a href="${distURL}" target="_blank" class="download-icon" title="Download">
              [Download]
            </a>
        </li>
      `;
    })
    .join("");

  section.innerHTML = `
    <h2>Distributions</h2>
    <div class="distributions-list">
      <ul>${distList}</ul>
    </div>
  `;
}

/**
 * Safely retrieve the correct language text from an object
 * like { "en": "foo", "de": "bar", ... }
 */
function getLocalized(fieldObj, lang) {
  if (!fieldObj) return "";
  return fieldObj[lang] || fieldObj["en"] || "";
}
