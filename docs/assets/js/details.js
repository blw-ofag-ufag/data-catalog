// Configuration
const branch = "main";
const baseDataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/data/datasets/`;

// List of enumerated fields to highlight
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
 * Utility Functions
 ******************************************************/
const Utils = {
  formatEnumerationString(input) {
    if (typeof input === "boolean") {
      return input ? "YES" : "NO";
    }
    if (typeof input !== "string") {
      console.error(`Invalid input type: ${typeof input}`, input);
      return "";
    }
    let formatted = input.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
    return formatted.replace(/_/g, " ");
  },

  formatDateIfPossible(val, lang) {
    if (typeof val !== "string" || !val) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(d);
  },

  formatDateTimeIfPossible(val, lang) {
    let d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return val;
    const hasTime = d.getHours() || d.getMinutes() || d.getSeconds();
    const options = hasTime
      ? { dateStyle: "long", timeStyle: "short" }
      : { dateStyle: "long" };
    return new Intl.DateTimeFormat(lang, options).format(d);
  },

  formatContactPoint(contact) {
    if (!contact || typeof contact !== "object") return "";
    const name = contact.name || "Unknown";
    const email = contact.email || "";
    return email
      ? `${name} (<a href="mailto:${email}">${email}</a>)`
      : name;
  },

  formatPublicationMetadata(publication) {
    if (!publication || typeof publication !== "object") {
      console.warn("Invalid publication object:", publication);
      return "";
    }
    const mustBePublished = !!publication["bv:mustBePublished"];
    const id = publication["dcterms:identifier"] || "";
    const accessUrl = publication["dcat:accessURL"] || "";
    const publicationRow = `<tr>
      <td>Publication:</td>
      <td><span class="enumeration-chip">${Utils.formatEnumerationString(
        mustBePublished
      )}</span></td>
    </tr>`;
    const idRow = mustBePublished
      ? `<tr>
          <td>ID:</td>
          <td>${id}</td>
        </tr>`
      : "";
    const accessUrlRow = mustBePublished
      ? `<tr>
          <td>Access URL:</td>
          <td>
            <a href="${accessUrl}" target="_blank">${
          accessUrl !== "N/A" ? accessUrl : ""
        }</a>
          </td>
        </tr>`
      : "";
    return `
      <table style="width:100%; border-collapse: collapse;">
        <tbody>
          ${publicationRow}
          ${idRow}
          ${accessUrlRow}
        </tbody>
      </table>
    `;
  },

  formatSingleUrl(url) {
    if (!url || typeof url !== "string") return "N/A";
    return `<a href="${url}" target="_blank">${url}</a>`;
  },

  formatUrlArray(urlArray) {
    if (!Array.isArray(urlArray) || urlArray.length === 0) return "N/A";
    return urlArray
      .map((url) =>
        url && typeof url === "string"
          ? `<a href="${url}" target="_blank">${url}</a>`
          : "N/A"
      )
      .join("<br>");
  },

  getLocalized(fieldObj, lang) {
    if (!fieldObj) return "";
    return fieldObj[lang] || fieldObj["en"] || "";
  },

  highlightEnumeratedValues(val) {
    if (val === undefined || val === null) return "";
    if (Array.isArray(val)) {
      return val
        .map(
          (item) =>
            `<span class="enumeration-chip">${Utils.formatEnumerationString(
              item
            )}</span>`
        )
        .join(" ");
    }
    return `<span class="enumeration-chip">${Utils.formatEnumerationString(
      val
    )}</span>`;
  },

  stringifyIfNeeded(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }
};

/******************************************************
 * Data Fetching
 ******************************************************/
async function fetchDataset(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

/******************************************************
 * Rendering Functions
 ******************************************************/
function renderError(message) {
  const heroBanner = document.getElementById("heroBanner");
  heroBanner.style.background = "var(--secondary-background-color)";
  document.getElementById("datasetID").textContent = "";
  document.getElementById("datasetTitle").textContent = "Error";
  document.getElementById("datasetDescription").textContent =
    message || "Could not load dataset. Check console for more information.";
}

function renderNotFound(datasetId) {
  const heroBanner = document.getElementById("heroBanner");
  heroBanner.style.background = "var(--secondary-background-color)";
  document.getElementById("datasetID").textContent = "";
  document.getElementById("datasetTitle").textContent = "Dataset Not Found";
  document.getElementById("datasetDescription").textContent =
    `No dataset found with ID ${datasetId}`;
}

function renderHeroBanner(data, lang) {
  // Select the hero banner using the class selector since there's no id now
  const heroBanner = document.querySelector(".hero-banner");

  // (Remove background image setting)
  // if (data["schema:image"]) {
  //   heroBanner.style.backgroundImage = `url('${data["schema:image"]}')`;
  // }

  // Update text elements (they have specific IDs, so they’re unaffected)
  document.getElementById("datasetID").textContent =
    data["dcterms:identifier"] || "";
  const datasetTitle =
    Utils.getLocalized(data["dcterms:title"], lang) || "Untitled Dataset";
  document.getElementById("datasetTitle").textContent = datasetTitle;
  document.getElementById("datasetDescription").textContent =
    Utils.getLocalized(data["dcterms:description"], lang);
}

function renderAffiliatedPersons(data, lang) {
  const section = document.getElementById("metadataSection");
  const persons = data["schema:OrganizationRole"] || [];
  let html = `<h1>${
    translations["details.affiliatedRoles"]?.[lang] || "Affiliated Roles"
  }</h1>`;

  if (!Array.isArray(persons) || persons.length === 0) {
    html += `<p>${
      translations["details.noAffiliatedPersons"]?.[lang] || "No affiliated persons."
    }</p>`;
    section.innerHTML = html;
    return;
  }

  html += `
    <table class="table">
      <thead>
        <tr>
          <th>${translations["details.name"]?.[lang] || "Name"}</th>
          <th>${translations["details.role"]?.[lang] || "Role"}</th>
        </tr>
      </thead>
      <tbody>
  `;
  persons.forEach((p) => {
    const name =
      p["schema:name"] || translations["details.unknown"]?.[lang] || "Unknown";
    const role =
      p["schema:roleName"] ||
      translations["details.unknownRole"]?.[lang] ||
      "Unknown Role";
    html += `
      <tr>
        <td>
          <a href="https://admindir.verzeichnisse.admin.ch/person/${encodeURIComponent(
            name
          )}" target="_blank" rel="noopener noreferrer">
            ${name}
          </a>
        </td>
        <td>${Utils.formatEnumerationString(role)}</td>
      </tr>
    `;
  });
  html += `
      </tbody>
    </table>
  `;
  section.innerHTML = html;
}

function renderMetadata(data, lang) {
  const section = document.getElementById("metadataSection");
  const displayedKeys = [
    "dcterms:identifier",
    "dcterms:title",
    "dcterms:description",
    "dcat:keyword",
    "schema:OrganizationRole",
    "dcat:distribution",
    "schema:image"
  ];
  let html = `<h1>${
    translations["details.metadata"]?.[lang] || "Metadata"
  }</h1>`;
  html += `<table class="table"><tbody>`;

  Object.keys(data).forEach((key) => {
    if (displayedKeys.includes(key)) return;
    let label = translations[key]?.[lang] || key;
    let val = data[key];

    if (key === "dcat:contactPoint") {
      val = Utils.formatContactPoint(val);
    } else if (key === "bv:opendata.swiss" || key === "bv:i14y") {
      val = Utils.formatPublicationMetadata(val);
    } else if (key === "dpv:hasLegalBasis") {
      val = Utils.formatUrlArray(val);
    } else if (key === "dcat:landingPage" || key === "bv:itSystem") {
      val = Utils.formatSingleUrl(val);
    } else if (typeof val === "string") {
      val = Utils.formatDateIfPossible(val, lang);
    } else if (Array.isArray(val)) {
      val = val.map((item) => Utils.formatDateIfPossible(item, lang)).join(", ");
    }
    if (enumeratedFields.includes(key)) {
      val = Utils.highlightEnumeratedValues(val);
    } else {
      val = Utils.stringifyIfNeeded(val);
    }
    if (!val) return;
    html += `<tr>
               <td><strong>${label}</strong></td>
               <td>${val}</td>
             </tr>`;
  });

  html += `</tbody></table>`;
  section.innerHTML += html;
}

function renderDistributions(data, lang) {
  const section = document.getElementById("distributionsSection");
  const distributions = data["dcat:distribution"] || [];
  let html = `<h1>${
    translations["dcat:distribution"]?.[lang] || "Distributions"
  }</h1>`;
  html += `<table class="table">
             <thead>
               <tr>
                 <th>${translations["details.title"]?.[lang] || "Title"}</th>
                 <th>${
                   translations["details.description"]?.[lang] || "Description"
                 }</th>
                 <th class="text-end">${
                   translations["details.format"]?.[lang] || "Format"
                 }</th>
               </tr>
             </thead>
             <tbody>`;
  distributions.forEach((dist) => {
    const title = Utils.getLocalized(dist["dcterms:title"], lang) || "";
    const description = Utils.getLocalized(
      dist["dcterms:description"],
      lang
    ) || "";
    const format = dist["dcterms:format"] || "N/A";
    if (dist["dcterms:modified"]) {
      dist["dcterms:modified"] = Utils.formatDateIfPossible(
        dist["dcterms:modified"],
        lang
      );
    }
    const url = dist["dcat:downloadURL"] || dist["dcat:accessURL"] || "#";
    html += `<tr>
               <td><strong>${title}</strong></td>
               <td>${description}</td>
               <td class="text-end">
                 <a href="${url}" target="_blank">${format}</a>
               </td>
             </tr>`;
  });
  html += `</tbody></table>`;
  section.innerHTML = html;
}

async function renderEditHistory(datasetId, branch, lang) {
  const section = document.getElementById("editHistorySection");
  const commitsApiUrl = `https://api.github.com/repos/blw-ofag-ufag/data-catalog/commits?path=data/datasets/${datasetId}.json&sha=${branch}`;
  try {
    const response = await fetch(commitsApiUrl);
    const commits = await response.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      section.innerHTML = `<p>${
        translations["details.noEditHistory"]?.[lang] ||
        "No edit history available."
      }</p>`;
      return;
    }
    let html = `<h1>${
      translations["details.editHistory"]?.[lang] || "Edit history"
    }</h1>`;
    html += `<table class="table">
              <thead>
                <tr>
                  <th></th>
                  <th>${
                    translations["details.author"]?.[lang] || "Author"
                  }</th>
                  <th>${
                    translations["details.date"]?.[lang] || "Date"
                  }</th>
                  <th>${
                    translations["details.message"]?.[lang] || "Message"
                  }</th>
                  <th class="text-end">${
                    translations["details.commit"]?.[lang] || "Commit"
                  }</th>
                </tr>
              </thead>
              <tbody>`;
    commits.forEach((commitData) => {
      const commit = commitData.commit;
      const sha = commitData.sha;
      const datetime = commit.author
        ? commit.author.date
        : commit.committer.date;
      const message = commit.message.split("\n")[0];
      const authorLogin = commitData.author ? commitData.author.login : "Unknown";
      const authorAvatar = commitData.author ? commitData.author.avatar_url : "";
      const formattedDate = Utils.formatDateTimeIfPossible(datetime, lang);
      const commitUrl = `https://github.com/blw-ofag-ufag/data-catalog/commit/${sha}`;
      html += `<tr>
                 <td>${
                   authorAvatar
                     ? `<img src="${authorAvatar}" alt="${authorLogin}" style="width:24px;height:24px;border-radius:50%;">`
                     : ""
                 }</td>
                 <td>${authorLogin}</td>
                 <td>${formattedDate}</td>
                 <td>${message}</td>
                 <td class="text-end"><a href="${commitUrl}" target="_blank"><code>${sha.substring(
        0,
        20
      )}</code></a></td>
               </tr>`;
    });
    html += `</tbody></table>`;
    section.innerHTML = html;
  } catch (error) {
    console.error("Error fetching commit history:", error);
    section.innerHTML = `<p>${
      translations["details.errorEditHistory"]?.[lang] ||
      "Error loading edit history."
    }</p>`;
  }
}

function renderDatasetDetails(data, lang) {
  renderHeroBanner(data, lang);
  renderAffiliatedPersons(data, lang);
  renderMetadata(data, lang);
  renderDistributions(data, lang);
  renderEditHistory(data["dcterms:identifier"], branch, lang);
}

/******************************************************
 * Main Initialization
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  // Load navbar and footer
  $("#navbar-placeholder").load("navbar.html");
  $("#footer-placeholder").load("footer.html");

  const params = new URLSearchParams(window.location.search);
  const datasetId = params.get("dataset");
  const lang = params.get("lang") || "en";

  if (!datasetId) {
    renderError("Dataset ID missing in URL parameters.");
    return;
  }

  const datasetUrl = `${baseDataUrl}${datasetId}.json`;
  try {
    const data = await fetchDataset(datasetUrl);
    if (!data || data["dcterms:identifier"] !== datasetId) {
      renderNotFound(datasetId);
    } else {
      renderDatasetDetails(data, lang);
    }
  } catch (error) {
    console.error("Error fetching dataset:", error);
    renderError("Could not load dataset. Check console for more information.");
  }
});
