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
      // Flatten all datasets
      const allDatasets = data.flatMap(d => Object.values(d.dataset));

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

  document.getElementById("datasetTitle").textContent = "Dataset Not Found";

  const main = document.getElementById("detailsMain");
  main.innerHTML = `
    <h2>404 - Not Found</h2>
    <p>No dataset found with ID <strong>${datasetId}</strong>.</p>
  `;
}

/**
 * Show a generic error if fetch fails
 */
function renderErrorMessage() {
  const banner = document.getElementById("heroBanner");
  banner.style.background = "var(--secondary-background-color)";

  document.getElementById("datasetTitle").textContent = "Error";

  const main = document.getElementById("detailsMain");
  main.innerHTML = `
    <h2>Could Not Load Dataset</h2>
    <p>Check the console for more information.</p>
  `;
}

/**
 * Render the entire page in a "full-page" style with hero image at top
 */
function renderFullPageDetails(dataset, lang) {
  const { metadata, attributes } = dataset;

  // 1) Hero Banner => set background image + h1 title
  const heroBanner = document.getElementById("heroBanner");
  heroBanner.style.backgroundImage = `url('${metadata.imageURL}')`;

  const titleEl = document.getElementById("datasetTitle");
  const datasetTitle = getLocalized(attributes["dct:title"], lang);
  titleEl.textContent = datasetTitle || "Untitled Dataset";

  // 2) Fill out the rest
  renderDescription(attributes, lang);
  renderMetadata(attributes, lang);
  renderKeywords(attributes);
  renderDistributions(attributes, lang);
}

/**
 * Renders the "Description" section
 */
function renderDescription(attributes, lang) {
  const section = document.getElementById("descriptionSection");

  const desc = getLocalized(attributes["dct:description"], lang);
  section.innerHTML = `
    <h2>Description</h2>
    <p>${desc}</p>
  `;
}

/**
 * Renders the metadata in a section (e.g., issued, publisher, contact)
 */
function renderMetadata(attributes, lang) {
  const section = document.getElementById("metadataSection");

  // Some sample fields
  const issued = attributes["dct:issued"] || "N/A";
  const accessRights = attributes["dct:accessRights"] || "N/A";
  const publisher = attributes["dct:publisher"] || "N/A";
  const contact = attributes["dcat:contactPoint"] || {};
  const owner = attributes["bv:dataOwner"] || "N/A";

  section.innerHTML = `
    <h2>Metadata</h2>
    <div class="metadata-list">
      <p><strong>Issued:</strong> ${issued}</p>
      <p><strong>Owner:</strong> ${owner}</p>
      <p><strong>Publisher:</strong> ${publisher}</p>
      <p><strong>Access Rights:</strong> ${accessRights}</p>
      <p><strong>Contact:</strong> ${contact.name || "N/A"} (${contact.email || "N/A"})</p>
    </div>
  `;
}

/**
 * Renders the keywords in a section
 */
function renderKeywords(attributes) {
  const section = document.getElementById("keywordsSection");
  const keywords = attributes["dcat:keyword"] || [];

  section.innerHTML = `
    <h2>Keywords</h2>
    <p>${keywords.join(", ") || "None"}</p>
  `;
}

/**
 * Renders distributions (if any) in a section
 */
function renderDistributions(attributes, lang) {
  const section = document.getElementById("distributionsSection");
  const distributions = attributes["dcat:distribution"] || {};

  // Build a list of <li> items
  const distList = Object.values(distributions)
    .map(dist => {
      const distTitle = getLocalized(dist.attributes["dct:title"], lang);
      const distDesc = getLocalized(dist.attributes["dct:description"], lang);
      const distFormat = dist.attributes["dct:format"] || "N/A";
      const distURL =
        dist.attributes["dcat:downloadURL"] ||
        dist.attributes["dcat:accessURL"] ||
        "#";

      return `
        <li>
          <strong>${distTitle} (${distFormat})</strong><br />
          <em>${distDesc}</em><br />
          <a href="${distURL}" target="_blank">Download</a>
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
