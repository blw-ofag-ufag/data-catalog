/******************************************************
 * Configuration
 *****************************************************/
const branch = "refactor-schema-with-data";
// Base URL for individual dataset JSON files. The full URL becomes:
// https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/{branch}/data/datasets/{datasetId}.json
const baseDataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/data/datasets/`;

/******************************************************
 * Hard-coded list of enumerated fields to highlight
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
 * Helper Functions
 *****************************************************/

// Converts an enumeration string or boolean to a legible, uppercase string.
function formatEnumerationString(input) {
  if (typeof input === 'boolean') {
    return input ? 'YES' : 'NO';
  }
  if (typeof input !== 'string') {
    console.error(`Invalid input type: ${typeof input}`, input);
    return '';
  }
  let formatted = input.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
  return formatted.replace(/_/g, ' ');
}

// If the value looks like a date string, format it in a localized "long" style.
function formatDateIfPossible(val, lang) {
  if (typeof val !== "string" || !val) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(d);
}

// Formats a contact point object into a name with a mailto link.
function formatContactPoint(contact) {
  if (!contact || typeof contact !== "object") return "";
  const name = contact.name || "Unknown";
  const email = contact.email || "";
  return email ? `${name} (<a href="mailto:${email}">${email}</a>)` : name;
}

// Formats publication metadata (if available) into a structured table.
function formatPublicationMetadata(publication) {
  if (!publication || typeof publication !== "object") {
    console.warn("Invalid publication object:", publication);
    return "";
  }
  const mustBePublished = !!publication["bv:mustBePublished"];
  const id = publication["dcterms:identifier"] || "";
  const accessUrl = publication["dcat:accessURL"] || "";
  const publicationRow = `<tr>
    <td>Publication:</td>
    <td><span class="enumeration-chip">${formatEnumerationString(mustBePublished)}</span></td>
  </tr>`;
  const idRow = mustBePublished ? `<tr>
         <td>ID:</td>
         <td>${id}</td>
       </tr>` : "";
  const accessUrlRow = mustBePublished ? `<tr>
         <td>Access URL:</td>
         <td>
           <a href="${accessUrl}" target="_blank">${accessUrl !== "N/A" ? accessUrl : ""}</a>
         </td>
       </tr>` : "";
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

// Formats a single URL into an anchor element.
function formatSingleUrl(url) {
  if (!url || typeof url !== "string") return "N/A";
  return `<a href="${url}" target="_blank">${url}</a>`;
}

// Formats an array of URLs into anchored links (separated by line breaks).
function formatUrlArray(urlArray) {
  if (!Array.isArray(urlArray) || urlArray.length === 0) return "N/A";
  return urlArray
    .map(url => {
      if (!url || typeof url !== "string") return "N/A";
      return `<a href="${url}" target="_blank">${url}</a>`;
    })
    .join("<br>");
}

// Retrieves a localized string from an object like { en: "foo", de: "bar", ... }
function getLocalized(fieldObj, lang) {
  if (!fieldObj) return "";
  return fieldObj[lang] || fieldObj["en"] || "";
}

// Wraps values in enumeration-chip spans. If the value is an array, each item is wrapped.
function highlightEnumeratedValues(val) {
  if (!val && val !== false) return "";
  if (Array.isArray(val)) {
    return val
      .map(item => `<span class="enumeration-chip">${formatEnumerationString(item)}</span>`)
      .join(" ");
  }
  return `<span class="enumeration-chip">${formatEnumerationString(val)}</span>`;
}

// Converts non-string values to a string (using JSON.stringify for objects).
function stringifyIfNeeded(val) {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return val.join(", ");
  else if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/******************************************************
 * On Page Load: Read URL params, fetch JSON, render page
 *****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Read URL parameters (?dataset=000001&lang=it)
  const params = new URLSearchParams(window.location.search);
  const datasetId = params.get("dataset"); // e.g., "000001"
  const selectedLang = params.get("lang") || "en"; // default to English if missing

  if (!datasetId) {
    renderErrorMessage("Dataset ID missing in URL parameters.");
    return;
  }

  // Build the full URL to the dataset JSON file
  const datasetUrl = `${baseDataUrl}${datasetId}.json`;

  fetch(datasetUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json();
    })
    .then((data) => {
      // Since our JSON is flat, verify by checking the identifier.
      if (!data || data["dcterms:identifier"] !== datasetId) {
        renderNotFound(datasetId);
      } else {
        renderFullPageDetails(data, selectedLang);
      }
    })
    .catch((err) => {
      console.error("Error fetching data:", err);
      renderErrorMessage();
    });
});

/******************************************************
 * Rendering Functions
 *****************************************************/

// Render a "not found" message if the dataset is missing.
function renderNotFound(datasetId) {
  const banner = document.getElementById("heroBanner");
  banner.style.background = "var(--secondary-background-color)";
  document.getElementById("datasetID").textContent = "";
  document.getElementById("datasetTitle").textContent = "Dataset Not Found";
  document.getElementById("datasetDescription").textContent = `No dataset found with ID ${datasetId}`;
}

// Render a generic error message.
function renderErrorMessage(message) {
  const banner = document.getElementById("heroBanner");
  banner.style.background = "var(--secondary-background-color)";
  document.getElementById("datasetID").textContent = "";
  document.getElementById("datasetTitle").textContent = "Error";
  document.getElementById("datasetDescription").textContent =
    message || "Could not load dataset. Check console for more information.";
}

// Render the full details page.
function renderFullPageDetails(data, lang) {
  // 1) Set the Hero Banner background image using the flat JSON field "schema:image"
  const heroBanner = document.getElementById("heroBanner");
  heroBanner.style.backgroundImage = `url('${data["schema:image"]}')`;

  // 2) Render the dataset ID, localized title, and description.
  document.getElementById("datasetID").textContent = data["dcterms:identifier"] || "";
  const titleEl = document.getElementById("datasetTitle");
  const datasetTitle = getLocalized(data["dcterms:title"], lang);
  titleEl.textContent = datasetTitle || "Untitled Dataset";
  document.getElementById("datasetDescription").textContent = getLocalized(data["dcterms:description"], lang);

  // 3) Render keywords.
  const keywordsContainer = document.getElementById("keywordsContainer");
  const keywords = data["dcat:keyword"] || [];
  keywordsContainer.innerHTML = "";
  keywords.forEach((kw) => {
    const span = document.createElement("span");
    span.classList.add("keyword-chip");
    span.textContent = kw;
    keywordsContainer.appendChild(span);
  });

  // 4) Render affiliated persons.
  renderAffiliatedPersons(data, lang);

  // 5) Render leftover metadata (all keys except known ones).
  renderMetadata(data, lang);

  // 6) Render distributions.
  renderDistributions(data, lang);

  // 7) Render the edit history (new section).
  renderEditHistory(data["dcterms:identifier"], branch);
}

// Render affiliated persons as a table.
function renderAffiliatedPersons(data, lang) {
  const section = document.getElementById("metadataSection");
  const persons = data["bv:affiliatedPersons"] || [];

  const adminDirIDHeader = translations["details.adminDirID"]?.[lang] || "Name";
  const roleHeader = translations["details.role"]?.[lang] || "Role";

  let html = `<h2>${translations["details.affiliatedRoles"]?.[lang] || "Affiliated Roles"}</h2>`;

  if (!Array.isArray(persons) || persons.length === 0) {
    html += `<p>${translations["details.noAffiliatedPersons"]?.[lang] || "No affiliated persons."}</p>`;
    section.innerHTML = html;
    return;
  }

  html += `
    <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
      <colgroup>
        <col style="width: 25%;" />
        <col style="width: 75%;" />
      </colgroup>
      <thead>
        <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
          <th style="padding: 8px;">${adminDirIDHeader}</th>
          <th style="padding: 8px;">${roleHeader}</th>
        </tr>
      </thead>
      <tbody>
  `;
  persons.forEach((p) => {
    const name = p["bv:adminDirID"] || translations["details.unknown"]?.[lang] || "Unknown";
    const role = p.role || translations["details.unknownRole"]?.[lang] || "Unknown Role";
    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <a href="https://admindir.verzeichnisse.admin.ch/person/${name}" target="_blank" rel="noopener noreferrer">
            ${name}
          </a>
        </td>
        <td style="padding: 8px;"><span class="enumeration-chip">${formatEnumerationString(role)}</span></td>
      </tr>
    `;
  });
  html += `
      </tbody>
    </table>
  `;
  section.innerHTML = html;
}

// Render leftover metadata in a table. Certain known fields are skipped.
function renderMetadata(data, lang) {
  const section = document.getElementById("metadataSection");
  const displayed = [
    "dcterms:identifier",
    "dcterms:title",
    "dcterms:description",
    "dcat:keyword",
    "bv:affiliatedPersons",
    "dcat:distribution",
    "schema:image"
  ];

  const attributeHeader = translations["details.attribute"]?.[lang] || "Attribute";
  const valueHeader = translations["details.value"]?.[lang] || "Value";

  let html = `
    <h2>${translations["details.metadata"]?.[lang] || "Metadata"}</h2>
    <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
      <colgroup>
        <col style="width: 25%;" />
        <col style="width: 75%;" />
      </colgroup>
      <thead>
        <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
          <th style="padding: 8px;">${attributeHeader}</th>
          <th style="padding: 8px;">${valueHeader}</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.keys(data).forEach((key) => {
    if (displayed.includes(key)) return;
    let fieldLabel = translations[key]?.[lang] || key;
    let val = data[key];

    if (key === "dcat:contactPoint") {
      val = formatContactPoint(val);
    } else if (key === "bv:opendata.swiss" || key === "bv:i14y") {
      val = formatPublicationMetadata(val);
    } else if (key === "bv:legalBasis") {
      val = formatUrlArray(val);
    } else if (key === "dcat:landingPage") {
      val = formatSingleUrl(val);
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
    if (!val) return;
    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;"><strong>${fieldLabel}</strong></td>
        <td style="padding: 8px;">${val}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;
  section.innerHTML += html;
}

// Render distributions (if any) in a table.
function renderDistributions(data, lang) {
  const section = document.getElementById("distributionsSection");
  const distributions = data["dcat:distribution"] || [];
  const distributionsHeader = translations["dcat:distribution"]?.[lang] || "Distributions";

  let html = `
    <h2>${distributionsHeader}</h2>
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
    const distTitle = getLocalized(dist["dcterms:title"], lang);
    const distDesc = getLocalized(dist["dcterms:description"], lang);
    const distFormat = dist["dcterms:format"] || "N/A";
    if (dist["dcterms:modified"]) {
      dist["dcterms:modified"] = formatDateIfPossible(dist["dcterms:modified"], lang);
    }
    const distURL = dist["dcat:downloadURL"] || dist["dcat:accessURL"] || "#";
    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">${distTitle}</td>
        <td style="padding: 8px;">${distDesc}</td>
        <td style="padding: 8px;">
          <a href="${distURL}" target="_blank">
            ${distFormat}
          </a>
        </td>
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
 * New: Render Edit History from GitHub
 *****************************************************/
/**
 * Fetches the commit history for the dataset JSON file using the GitHub API,
 * then renders a table with:
 * - GitHub account image
 * - GitHub account name
 * - Commit date
 * - First line of the commit message
 * - Commit hash (as a link)
 */
function renderEditHistory(datasetId, branch) {
  // Build the GitHub API URL for commits affecting this file.
  const commitsApiUrl = `https://api.github.com/repos/blw-ofag-ufag/data-catalog/commits?path=data/datasets/${datasetId}.json&sha=${branch}`;

  fetch(commitsApiUrl)
    .then(response => response.json())
    .then(commits => {
      const section = document.getElementById("editHistorySection");
      if (!Array.isArray(commits) || commits.length === 0) {
        section.innerHTML = "<p>No edit history available.</p>";
        return;
      }
      let html = `
        <h2>Edit History</h2>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 2rem;">
          <thead>
            <tr style="text-align:left; border-bottom: 1px solid var(--border-color);">
              <th style="padding: 8px;">Account</th>
              <th style="padding: 8px;">Name</th>
              <th style="padding: 8px;">Date</th>
              <th style="padding: 8px;">Commit Message</th>
              <th style="padding: 8px;">Hash</th>
            </tr>
          </thead>
          <tbody>
      `;
      commits.forEach(commitData => {
        const commit = commitData.commit;
        const sha = commitData.sha;
        const date = commit.author ? commit.author.date : commit.committer.date;
        const message = commit.message.split("\n")[0];
        const authorLogin = commitData.author ? commitData.author.login : "Unknown";
        const authorAvatar = commitData.author ? commitData.author.avatar_url : "";
        const formattedDate = formatDateIfPossible(date, "en");
        const commitUrl = `https://github.com/blw-ofag-ufag/data-catalog/commit/${sha}`;
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 8px;">
              ${authorAvatar ? `<img src="${authorAvatar}" alt="${authorLogin}" style="width:32px;height:32px;border-radius:50%;">` : ""}
            </td>
            <td style="padding: 8px;">${authorLogin}</td>
            <td style="padding: 8px;">${formattedDate}</td>
            <td style="padding: 8px;">${message}</td>
            <td style="padding: 8px;">
              <a href="${commitUrl}" target="_blank">${sha.substring(0,7)}</a>
            </td>
          </tr>
        `;
      });
      html += `
          </tbody>
        </table>
      `;
      section.innerHTML = html;
    })
    .catch(error => {
      console.error("Error fetching commit history:", error);
      document.getElementById("editHistorySection").innerHTML = "<p>Error loading edit history.</p>";
    });
}
