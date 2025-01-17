/******************************************************
 *  Configuration
 *****************************************************/
const dataUrl =
  "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";

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
    .then(res => res.json())
    .then(data => {
      // The new structure has "datasets" as an array
      const allDatasets = data.datasets;

      // Locate the matching dataset by ID
      const dataset = allDatasets.find(ds => {
        return ds.attributes["dct:identifier"] === datasetId;
      });

      if (!dataset) {
        renderNotFound(datasetId);
      } else {
        renderFullPageDetails(dataset, selectedLang);
      }
    })
    .catch(err => {
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
  document.getElementById("datasetDescription").textContent =
    `No dataset found with ID ${datasetId}`;

  // or you could fill the main with a bigger message
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
  const heroBanner = document.getElementById("heroBanner");
  heroBanner.style.backgroundImage = `url('${metadata.imageURL}')`;

  // 2) ID (monospace), Title (H1), Description
  const datasetIDEl = document.getElementById("datasetID");
  datasetIDEl.textContent = attributes["dct:identifier"] || "";

  const titleEl = document.getElementById("datasetTitle");
  const datasetTitle = getLocalized(attributes["dct:title"], lang);
  titleEl.textContent = datasetTitle || "Untitled Dataset";

  const descEl = document.getElementById("datasetDescription");
  const desc = getLocalized(attributes["dct:description"], lang);
  descEl.textContent = desc;

  // 3) Keywords
  const keywordsContainer = document.getElementById("keywordsContainer");
  const keywords = attributes["dcat:keyword"] || [];
  keywordsContainer.innerHTML = ""; // clear if any
  keywords.forEach(kw => {
    const span = document.createElement("span");
    span.classList.add("keyword-chip"); // your tile-based styling
    span.textContent = kw; // or capitalize if you want
    keywordsContainer.appendChild(span);
  });

  // 4) Metadata => re-use the logic for the "common" fields
  // Then we also show *all* other leftover fields
  renderMetadata(attributes, lang);

  // 5) Distributions
  renderDistributions(attributes, lang);
}

/**
 * Renders the metadata (common fields + leftover fields)
 */
function renderMetadata(attributes, lang) {
  const section = document.getElementById("metadataSection");
  section.innerHTML = `<h2>Metadata</h2><div class="metadata-list" id="allMetadata"></div>`;

  const allMetaDiv = document.getElementById("allMetadata");

  // Prepare a list of "already displayed" fields so we skip them.
  const displayed = [
    "dct:identifier",
    "dct:title",
    "dct:description",
    "dcat:keyword",
    "dcat:distribution" 
    // We'll skip these from the "all leftover" loop
  ];

  // Show the standard fields first
  const issued = attributes["dct:issued"] || "N/A";
  const accessRights = attributes["dct:accessRights"] || "N/A";
  const publisher = attributes["dct:publisher"] || "N/A";
  const contact = attributes["dcat:contactPoint"] || {};
  const owner = attributes["bv:dataOwner"] || "N/A";

  let html = `
    <p><strong>Issued:</strong> ${issued}</p>
    <p><strong>Owner:</strong> ${owner}</p>
    <p><strong>Publisher:</strong> ${publisher}</p>
    <p><strong>Access Rights:</strong> ${accessRights}</p>
    <p><strong>Contact:</strong> ${contact.name || "N/A"} (${contact.email || "N/A"})</p>
  `;

  displayed.push("dct:issued","dct:accessRights","dct:publisher","bv:dataOwner","dcat:contactPoint");

  // Now let's show leftover fields (i.e. all attributes not in "displayed")
  for (const key of Object.keys(attributes)) {
    if (displayed.includes(key)) continue;

    const val = attributes[key];
    // Could be string, array, or object
    let valStr;

    if (Array.isArray(val)) {
      // e.g. "bv:legalBasis": ["...", "..."]
      valStr = val.join(", ");
    } else if (typeof val === "object") {
      // If it’s an object with subfields, we can JSON-stringify or skip
      valStr = JSON.stringify(val);
    } else {
      valStr = String(val);
    }

    if (valStr === "") continue; // skip empty

    html += `<p><strong>${key}:</strong> ${valStr}</p>`;
  }

  allMetaDiv.innerHTML = html;
}

/**
 * Renders distributions (if any) in a bullet list:
 *   - **Name**: Description <download_link>
 * with a small download icon.
 */
function renderDistributions(attributes, lang) {
  const section = document.getElementById("distributionsSection");
  const distributions = attributes["dcat:distribution"] || {};

  // Build bullet list
  const distList = Object.values(distributions)
    .map(dist => {
      const distTitle = getLocalized(dist.attributes["dct:title"], lang);
      const distDesc = getLocalized(dist.attributes["dct:description"], lang);
      const distFormat = dist.attributes["dct:format"] || "N/A";
      const distURL =
        dist.attributes["dcat:downloadURL"] ||
        dist.attributes["dcat:accessURL"] ||
        "#";

      // Example bullet:
      //  - **Annual Milk Prices**: This dataset ... <download_icon>
      // We'll incorporate the "format" if you wish, or skip it
      return `
        <li>
          - <strong>${distTitle}</strong>: ${distDesc}
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
      <ul>${distList || "<li>No Distributions</li>"}</ul>
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
