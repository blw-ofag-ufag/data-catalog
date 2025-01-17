/******************************************************
 *  Configuration
 *****************************************************/
const dataUrl =
    "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";

/******************************************************
 *  Hard-coded list of enumerated fields to highlight
 *****************************************************/
const enumeratedFields = [
    "dcterms:accessRights",
    "dcterms:accrualPeriodicity",
    "adms:status",
    "bv:classification",
    "bv:personalData",
    "bv:typeOfData",
    "bv:archivalValue",
    "dcat:themeTaxonomy"
];

/******************************************************
 *  Helper functions
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
    return new Intl.DateTimeFormat(lang, {
        dateStyle: "long"
    }).format(d);
}

/**
 * Formats the dcat:contactPoint field.
 * @param {Object} contact - The contactPoint JSON object (e.g., { name: "John Doe", email: "john.doe@example.com" }).
 * @returns {string} - A formatted string with name and mailto link.
 */
function formatContactPoint(contact) {
  if (!contact || typeof contact !== "object") return "";

  const name = contact.name || "Unknown";
  const email = contact.email || "";

  if (email) {
    return `${name} (<a href="mailto:${email}">${email}</a>)`;
  }
  return name; // Fallback if email is missing
}

/**
 * Formats the publication metadata for bv:opendata.swiss and bv:i14y.
 * @param {Object} publication - The publication metadata object.
 * @returns {string} - HTML string with a structured table layout.
 */
/**
 * Formats the publication metadata for bv:opendata.swiss and bv:i14y.
 * @param {Object} publication - The publication metadata object.
 * @returns {string} - HTML string with a structured table layout.
 */
function formatPublicationMetadata(publication) {
  if (!publication || typeof publication !== "object") {
    console.warn("Invalid publication object:", publication);
    return "N/A";
  }

  // Extract the fields from the object
  const mustBePublished = publication["bv:mustBePublished"] ? "true" : "false";
  const id = publication["dcterms:identifier"] || "N/A";
  const accessUrl = publication["dcat:accessURL"] || "N/A";

  // Build the inner table rows
  const publicationRow = `<tr>
    <td>Publication:</td>
    <td><span class="enumeration-chip">${mustBePublished}</span></td>
  </tr>`;
  const idRow = `<tr>
    <td>ID:</td>
    <td>${id}</td>
  </tr>`;
  const accessUrlRow = `<tr>
    <td>Access URL:</td>
    <td>
      <a href="${accessUrl}" target="_blank">${accessUrl !== "N/A" ? accessUrl : ""}</a>
    </td>
  </tr>`;

  // Combine rows into a table structure
  return `
    <table style="width:100%; border-collapse: collapse;">
      <tbody>
        ${publicationRow}
        ${idRow}
        ${accessUrlRow}
      </tbody>
    </table>
  `;
}

/**
 * Formats a single URL into an anchor tag.
 * @param {string|null} url - The URL to format.
 * @returns {string} - A formatted anchor or "N/A".
 */
function formatSingleUrl(url) {
  if (!url || typeof url !== "string") return "N/A";
  return `<a href="${url}" target="_blank">${url}</a>`;
}

/**
 * Formats an array of URLs into anchored links.
 * @param {Array|null} urlArray - The array of URLs.
 * @returns {string} - A formatted string with anchors or "N/A".
 */
function formatUrlArray(urlArray) {
  if (!Array.isArray(urlArray) || urlArray.length === 0) {
    return "N/A";
  }

  // Map each URL to an anchor (<a>) element
  return urlArray
    .map(url => {
      if (!url || typeof url !== "string") return "N/A";
      return `<a href="${url}" target="_blank">${url}</a>`;
    })
    .join("<br>"); // Separate links with line breaks
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
    const {
        metadata,
        attributes
    } = dataset;

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

    // 6) Distributions (as a table)
    renderDistributions(attributes, lang);
}

/**
 * Renders the array of `bv:affiliatedPersons` in a minimalistic table
 * with columns: 25%, 25%, 50%.
 */
/**
 * Renders the array of `bv:affiliatedPersons` in a minimalistic table
 * with columns: 25%, 25%, 50%.
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

  // A simple table with specified column widths
  html += `
    <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
      <colgroup>
        <col style="width: 25%;" />
        <col style="width: 25%;" />
        <col style="width: 50%;" />
      </colgroup>
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
    const name = p.name || "N/A";
    const email = p.email
      ? `<a href="mailto:${p.email}">${p.email}</a>`
      : "N/A"; // Anchor the email address
    const role = p.role || "N/A";

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">${name}</td>
        <td style="padding: 8px;">${email}</td>
        <td style="padding: 8px;">${role}</td>
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
 * Renders the leftover metadata (excluding the known fields) in a table.
 * If a field is in `enumeratedFields`, we wrap the displayed value(s)
 * in .enumeration-chip spans for emphasis.
 */
function renderMetadata(attributes, lang) {
    // We'll place it below the roles (in the same #metadataSection)
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
    <colgroup>
      <col style="width: 25%;" />
      <col style="width: 75%;" />
    </colgroup>
    <thead>
      <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
        <th style="padding: 8px;">Attribute</th>
        <th style="padding: 8px;">Value</th>
      </tr>
    </thead>
    <tbody>
`;

    // Loop over leftover fields
    for (const key of Object.keys(attributes)) {
      if (displayed.includes(key)) continue;
    
      let val = attributes[key];
    
      // Handle specific fields differently
      if (key === "dcat:contactPoint") {
        val = formatContactPoint(val);
      } else if (key === "bv:opendata.swiss" || key === "bv:i14y") {
        val = formatPublicationMetadata(val);
      } else if (key === "bv:legalBasis") {
        val = formatUrlArray(val); // Handles arrays of URLs
      } else if (key === "dcat:landingPage") {
        val = formatSingleUrl(val); // Handles single URL
      } else if (typeof val === "string") {
        val = formatDateIfPossible(val, lang);
      } else if (Array.isArray(val)) {
        val = val.map((item) => formatDateIfPossible(item, lang));
      }
    
      if (enumeratedFields.includes(key)) {
        val = highlightEnumeratedValues(val);
      } else {
        val = stringifyIfNeeded(val);
      }
    
      if (!val) continue; // Skip empty or undefined values
    
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
 * Renders distributions (if any) in a table:
 *   3 columns: Name, Description, Format
 */
function renderDistributions(attributes, lang) {
    const section = document.getElementById("distributionsSection");
    const distributions = attributes["dcat:distribution"] || [];

    if (!Array.isArray(distributions) || distributions.length === 0) {
        section.innerHTML = `
    <h2>Distributions</h2>
    <p>No Distributions</p>
  `;
        return;
    }

    // Start building the table
    let html = `
  <h2>Distributions</h2>
  <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
    <colgroup>
      <col style="width: 25%;" />
      <col style="width: 60%;" />
      <col style="width: 15%;" />
    </colgroup>
    <thead>
      <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
        <th style="padding: 8px;">Name</th>
        <th style="padding: 8px;">Description</th>
        <th style="padding: 8px;">Format</th>
      </tr>
    </thead>
    <tbody>
`;

    distributions.forEach((dist) => {
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

        // Build table row
        html += `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 8px;">
        <a href="${distURL}" target="_blank" class="download-icon" title="Download">
          ${distTitle}
        </a>
      </td>
      <td style="padding: 8px;">${distDesc}</td>
      <td style="padding: 8px;">${distFormat}</td>
    </tr>
  `;
    });

    html += `
    </tbody>
  </table>
`;

    section.innerHTML = html;
}

/******************************************************
 *  Utility Functions
 *****************************************************/

/**
 * Safely retrieve the correct language text from an object
 * like { "en": "foo", "de": "bar", ... }
 */
function getLocalized(fieldObj, lang) {
    if (!fieldObj) return "";
    return fieldObj[lang] || fieldObj["en"] || "";
}

/**
 * If the metadata value is an array, we map each item to a .enumeration-chip <span>.
 * If it's a string or boolean, we wrap it in a single chip.
 * If it's null/undefined/empty, returns empty string.
 */
function highlightEnumeratedValues(val) {
    if (!val && val !== false) return "";

    // If array, highlight each item
    if (Array.isArray(val)) {
        return val
            .map((item) => `<span class="enumeration-chip">${item}</span>`)
            .join(" ");
    }
    // If boolean or string
    return `<span class="enumeration-chip">${val}</span>`;
}

/**
 * Converts an object or array to a JSON string, or leaves strings/booleans as is.
 */
function stringifyIfNeeded(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) {
        // Already date-formatted above if needed, just join
        return val.join(", ");
    } else if (typeof val === "object") {
        // JSON-stringify
        return JSON.stringify(val);
    }
    // String or boolean => toString
    return String(val);
}