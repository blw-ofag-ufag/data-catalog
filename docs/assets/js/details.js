"use strict";

// Configuration
const branch = "main";
const baseDataUrl = `https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/${branch}/data/datasets/`;

// Enumerated fields to highlight
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

// --- Local Function: formatPublicationMetadata ---
// This function builds a table for publication metadata and is specific to the details page.
function formatPublicationMetadata(publication, lang) {
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
}

async function fetchDataset(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}

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
  const datasetTitle = Utils.getLocalized(data["dct:title"], lang) || "Untitled Dataset";
  document.getElementById("datasetTitle").textContent = datasetTitle;
  document.getElementById("datasetDescription").textContent =
    Utils.getLocalized(data["dct:description"], lang);
}

function renderActionButtons(datasetId, lang) {
  const gitHubUrl = `https://github.com/blw-ofag-ufag/data-catalog/blob/main/data/datasets/${datasetId}.json`;
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
  html += `<table class="table">
        <colgroup>
          <col style="width: 25%;">
          <col style="width: 75%;">
        </colgroup>
    <tbody>`;
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
  html += `<table class="table">
          <colgroup>
            <col style="width: 25%;">
            <col style="width: 75%;">
          </colgroup>
      <tbody>`;
  Object.keys(data).forEach((key) => {
    if (displayedKeys.includes(key)) return;
    let label = i18next.t(key, { defaultValue: key });
    let val = data[key];
  
    if (key === "dcat:keyword" && Array.isArray(val)) {
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
      // Use the local publication formatting function
      val = formatPublicationMetadata(val, lang);
    } else if (key === "dcatap:applicableLegislation" ) {
      val = Utils.formatUrlArray(val);
    } else if (key === "dcat:landingPage" || key === "bv:itSystem") {
      val = Utils.formatSingleUrl(val);
    } else if (enumeratedFields.includes(key)) {
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
  
  // If there are no distribution entries, clear the section.
  if (distributions.length === 0) {
    section.innerHTML = "";
    return;
  }
  
  let html = `<h1>${i18next.t("details.distribution")}</h1>`;
  html += `<table class="table">
        <colgroup>
          <col style="width: 25%;">
          <col style="width: 50%;">
          <col style="width: 25%;">
        </colgroup>
  <tbody>`;
  
  distributions.forEach((dist) => {
    const title = Utils.getLocalized(dist["dct:title"], lang) || "";
    const description = Utils.getLocalized(dist["dct:description"], lang) || "";
    const format = dist["dct:format"] || "N/A";
    if (dist["dct:modified"]) {
      dist["dct:modified"] = Utils.formatDate(dist["dct:modified"], lang);
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
  const section = document.getElementById("publicationsSection");
  if (!section) return;
  
  const publications = [
    { key: "bv:opendata_swiss", catalog: "opendata.swiss" },
    { key: "bv:i14y", catalog: "I14Y" }
  ];
  
  // Check if any publication information is available.
  const hasPublicationInfo = publications.some(pub => data[pub.key]);
  
  if (!hasPublicationInfo) {
    // If no publication info, clear the section (or you can remove it)
    section.innerHTML = "";
    return;
  }
  
  let html = `<h1>${i18next.t("details.publications", { defaultValue: "Publications" })}</h1>`;
  html += `<table class="table">
    <thead>
      <colgroup>
        <col style="width: 25%;">
        <col style="width: 25%;">
        <col style="width: 50%;">
      </colgroup>
      <tr>
        <th>${i18next.t("dcat:catalog")}</th>
        <th>${i18next.t("details.publication")}</th>
        <th>${i18next.t("dct:identifier")}</th>
      </tr>
    </thead>
    <tbody>`;
  
  publications.forEach(pub => {
    if (data[pub.key]) {
      const pubData = data[pub.key];
      const publication = Utils.highlightEnumeratedValues(pubData["bv:mustBePublished"]);
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
            <colgroup>
              <col style="width: 5%;">
              <col style="width: 20%;">
              <col style="width: 25%;">
              <col style="width: 50%;">
            </colgroup>
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
      const formattedDate = Utils.formatDateTime(datetime, lang);
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
  renderPublications(data, lang);
  renderEditHistory(data["dct:identifier"], branch, lang);
}

// --- Language Switch Handler ---
// Instead of reloading the page, we update the URL, change the language, update the dropdown label,
// and re-render the details page using a cached dataset.
$(document).on("click", ".dropdown-item.lang-option", function (e) {
  e.preventDefault();
  const newLang = $(this).data("lang");
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("lang", newLang);
  history.pushState(null, "", "?" + urlParams.toString());
  // Update language without page reload
  changeLanguage(newLang);
  Utils.setLanguageDropdownLabel(newLang);
  updatePageTranslations();
  // Re-render details using the cached dataset (if available)
  if (window.cachedDataset) {
    renderDatasetDetails(window.cachedDataset, newLang);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  $("#navbar-placeholder").load("navbar.html", function () {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang") || "en";
    $(".navbar-brand").attr("href", `index.html?lang=${lang}`);
    Utils.setLanguageDropdownLabel(lang);
    updatePageTranslations();
    // The language dropdown handler is now defined globally above
  });
  $("#footer-placeholder").load("footer.html");

  const params = new URLSearchParams(window.location.search);
  const datasetId = params.get("dataset");
  const lang = params.get("lang") || "en";

  if (datasetId) {
    renderActionButtons(datasetId, lang);
  } else {
    renderError("Dataset ID missing in URL parameters.");
    return;
  }

  initI18n(lang, function() {
    updatePageTranslations();
    const datasetUrl = `${baseDataUrl}${datasetId}.json`;
    fetchDataset(datasetUrl)
      .then((data) => {
        if (!data || data["dct:identifier"] !== datasetId) {
          renderNotFound(datasetId);
        } else {
          window.cachedDataset = data; // Cache for language re-rendering
          renderDatasetDetails(data, lang);
          Utils.verifyUrls();
        }
      })
      .catch((error) => {
        console.error("Error fetching dataset:", error);
        renderError("Could not load dataset. Check console for more information.");
      });
  });
});
