"use strict";

// Configuration
const branch = "main";
const baseDataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/data/datasets/`;

// List of enumerated fields to highlight
const enumeratedFields = [
  "dct:accessRights",
  "dct:accrualPeriodicity",
  "adms:status",
  "bv:classification",
  "bv:personalData",
  "bv:typeOfData",
  "bv:archivalValue",
  "dcat:themeTaxonomy"
];

/******************************************************
 * Utility Functions (unchanged)
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
    const id = publication["dct:identifier"] || "";
    const accessUrl = publication["dcat:accessURL"] || "";
    const publicationRow = `<tr>
      <td>${i18next.t("details.publication")}:</td>
      <td>${Utils.formatEnumerationString(mustBePublished)}</td>
    </tr>`;
    const idRow = mustBePublished
      ? `<tr>
          <td>ID:</td>
          <td>${id}</td>
        </tr>`
      : "";
    const accessUrlRow = mustBePublished
      ? `<tr>
          <td>${i18next.t("details.accessURL")}:</td>
          <td>
            <a href="${accessUrl}" target="_blank">${ accessUrl !== "N/A" ? accessUrl : ""}</a>
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
            `<span class="enumeration-chip">${Utils.formatEnumerationString(item)}</span>`
        )
        .join(" ");
    }
    return `<span class="enumeration-chip">${Utils.formatEnumerationString(val)}</span>`;
  },
  stringifyIfNeeded(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }
};

function setLanguageDropdownLabel(lang) {
  let label = "English";
  if (lang === "de") label = "Deutsch";
  else if (lang === "fr") label = "Français";
  else if (lang === "it") label = "Italiano";
  $("#language-dropdown-button").text(label);
}


/******************************************************
 * Data Fetching
 ******************************************************/
async function fetchDataset(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

/******************************************************
 * Rendering Functions (using i18next.t instead of translations)
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
  const datasetTitle =
    Utils.getLocalized(data["dct:title"], lang) || "Untitled Dataset";
  document.getElementById("datasetTitle").textContent = datasetTitle;
  document.getElementById("datasetDescription").textContent =
    Utils.getLocalized(data["dct:description"], lang);
}

function renderActionButtons(datasetId, lang) {
  const gitHubUrl = `https://github.com/blw-ofag-ufag/data-catalog/blob/main/data/datasets/${datasetId}.json`
  const rawUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/main/data/datasets/${datasetId}.json`;
  document.getElementById("downloadBtn").setAttribute("href", rawUrl);
  document.getElementById("viewOnGithubBtn").setAttribute("href", gitHubUrl);
  document.getElementById("editBtn").setAttribute("href", `modify.html?id=${datasetId}&lang=${lang}`);
}

function renderAffiliatedPersons(data, lang) {
  const section = document.getElementById("metadataSection");
  const persons = data["prov:qualifiedAttribution"] || [];
  let html = `<h1>${i18next.t("details.affiliatedRoles")}</h1>`;
  if (!Array.isArray(persons) || persons.length === 0) {
    html += `<p>${i18next.t("details.noAffiliatedPersons")}</p>`;
    section.innerHTML = html;
    return;
  }
  html += `<table class="table"><tbody>`;
  persons.forEach((p) => {
    const name = p["prov:agent"] || i18next.t("details.unknown");
    const role = p["dcat:hadRole"] || i18next.t("details.unknownRole");
    html += `
      <tr>
        <td>
          <a href="https://admindir.verzeichnisse.admin.ch/person/${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">${name}</a>
        </td>
        <td>${Utils.highlightEnumeratedValues(role)}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  section.innerHTML = html;
}

function renderMetadata(data, lang) {
  const section = document.getElementById("metadataSection");
  const displayedKeys = [
    "dct:title",
    "dct:description",
    "prov:qualifiedAttribution",
    "dcat:distribution",
    "bv:i14y",
    "bv:opendata_swiss",
    "schema:image"
  ];
  let html = `<h1>${i18next.t("details.metadata")}</h1>`;
  html += `<table class="table"><tbody>`;
  Object.keys(data).forEach((key) => {
    if (displayedKeys.includes(key)) return;
    let label = i18next.t(key, { defaultValue: key });
    let val = data[key];
  
    if (key === "dcat:keyword" && Array.isArray(val)) {
      // Special handling for keywords
      val = `<div class="keywords">` +
        val.map((item) =>
          `<a href="index.html?lang=${lang}&tags=${encodeURIComponent(item)}" data-key="${item}">
             <span>${item}</span>
           </a>`
        ).join(" ") +
        `</div>`;
    } else if (key === "dcat:contactPoint") {
      val = Utils.formatContactPoint(val);
    } else if (key === "bv:opendata.swiss" || key === "bv:i14y") {
      val = Utils.formatPublicationMetadata(val);
    } else if (key === "dpv:hasLegalBasis") {
      val = Utils.formatUrlArray(val);
    } else if (key === "dcat:landingPage" || key === "bv:itSystem") {
      val = Utils.formatSingleUrl(val);
    }
    
    // Handle enumerated fields before generic array/string formatting
    else if (enumeratedFields.includes(key)) {
      val = Utils.highlightEnumeratedValues(val);
    } else if (typeof val === "string") {
      val = Utils.formatDateIfPossible(val, lang);
    } else if (Array.isArray(val)) {
      // For non-enumerated arrays, format each item (e.g. for dates)
      val = val.map((item) => Utils.formatDateIfPossible(item, lang)).join(", ");
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
  let html = `<h1>${i18next.t("details.distribution")}</h1>`;
  html += `<table class="table"><tbody>`;
  distributions.forEach((dist) => {
    const title = Utils.getLocalized(dist["dct:title"], lang) || "";
    const description = Utils.getLocalized(dist["dct:description"], lang) || "";
    const format = dist["dct:format"] || "N/A";
    if (dist["dct:modified"]) {
      dist["dct:modified"] = Utils.formatDateIfPossible(dist["dct:modified"], lang);
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

function renderPublications(data, lang) {
  // Get the publications section element.
  const section = document.getElementById("publicationsSection");
  if (!section) return;
  
  let html = `<h1>${i18next.t("details.publications", { defaultValue: "Publications" })}</h1>`;
  html += `<table class="table">
    <thead>
      <tr>
        <th>${i18next.t("dcat:catalog")}</th>
        <th>${i18next.t("details.publication")}</th>
        <th>${i18next.t("dct:identifier")}</th>
      </tr>
    </thead>
    <tbody>`;
  
  // List of publication types with their display names.
  const publications = [
    { key: "bv:opendata_swiss", catalog: "opendata.swiss" },
    { key: "bv:i14y", catalog: "I14Y" }
  ];
  
  publications.forEach(pub => {
    if (data[pub.key]) {
      const pubData = data[pub.key];
      // Format the publication flag.
      const publication = Utils.highlightEnumeratedValues(pubData["bv:mustBePublished"]);
      // Read identifier and accessURL if available.
      let identifier = pubData["dct:identifier"] || "";
      const accessURL = pubData["dcat:accessURL"] || "";
      if (identifier && accessURL && accessURL !== "N/A") {
        identifier = `<a href="${accessURL}" target="_blank">${identifier}</a>`;
      }
      html += `<tr>
        <td>${pub.catalog}</td>
        <td>${publication}</td>
        <td>${identifier}</td>
      </tr>`;
    }
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
      section.innerHTML = `<p>${i18next.t("details.noEditHistory")}</p>`;
      return;
    }
    let html = `<h1>${i18next.t("details.editHistory")}</h1>`;
    html += `<table class="table">
              <thead>
                <tr>
                  <th></th>
                  <th>${i18next.t("details.author")}</th>
                  <th>${i18next.t("details.date")}</th>
                  <th>${i18next.t("details.message")}</th>
                </tr>
              </thead>
              <tbody>`;
    commits.forEach((commitData) => {
      const commit = commitData.commit;
      const sha = commitData.sha;
      const datetime = commit.author ? commit.author.date : commit.committer.date;
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
                 <td><a href="https://github.com/${authorLogin}" target="_blank">${authorLogin}</a></td>
                 <td>${formattedDate}</td>
                 <td><a href="${commitUrl}" target="_blank">${message}</a></td>
               </tr>`;
    });
    html += `</tbody></table>`;
    section.innerHTML = html;
  } catch (error) {
    console.error("Error fetching commit history:", error);
    section.innerHTML = `<p>${i18next.t("details.errorEditHistory")}</p>`;
  }
}

function renderDatasetDetails(data, lang) {
  renderHeroBanner(data, lang);
  renderAffiliatedPersons(data, lang);
  renderMetadata(data, lang);
  renderDistributions(data, lang);
  renderPublications(data, lang);  // New call for publications
  renderEditHistory(data["dct:identifier"], branch, lang);
}

/******************************************************
 * Main Initialization
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {
  
  // Load navbar and footer, and attach language dropdown listener.
  $("#navbar-placeholder").load("navbar.html", function () {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang") || "en";
    $(".navbar-brand").attr("href", `index.html?lang=${lang}`);
    setLanguageDropdownLabel(lang);   // Set the dropdown label
    updatePageTranslations();           // Update any data-i18n elements in the navbar
    // Attach language dropdown event listener:
    $(document).on("click", ".dropdown-item.lang-option", function (e) {
      e.preventDefault();
      const newLang = $(this).data("lang");
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("lang", newLang);
      window.location.search = urlParams.toString();
    });
  });
  $("#footer-placeholder").load("footer.html");

  // Get URL parameters: dataset ID and language.
  const params = new URLSearchParams(window.location.search);
  const datasetId = params.get("dataset");
  const lang = params.get("lang") || "en";

  // Render action buttons if dataset ID exists
  if (datasetId) {
    renderActionButtons(datasetId, lang);
  } else {
    renderError("Dataset ID missing in URL parameters.");
    return;
  }

  if (!datasetId) {
    renderError("Dataset ID missing in URL parameters.");
    return;
  }

  // Initialize i18next for the details page then fetch and render dataset details.
  initI18n(lang, function() {
    // Optionally update any static elements with data-i18n attributes:
    updatePageTranslations();

    const datasetUrl = `${baseDataUrl}${datasetId}.json`;
    fetchDataset(datasetUrl)
      .then((data) => {
        if (!data || data["dct:identifier"] !== datasetId) {
          renderNotFound(datasetId);
        } else {
          renderDatasetDetails(data, lang);
        }
      })
      .catch((error) => {
        console.error("Error fetching dataset:", error);
        renderError("Could not load dataset. Check console for more information.");
      });
  });
});
