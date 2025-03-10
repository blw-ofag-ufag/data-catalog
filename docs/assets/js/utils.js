"use strict";

const Utils = {
  // Data Helpers
  getDataOwnerName(data) {
    return data.dataOwner || "";
  },
  parseTokens(str) {
    if (!str) return [];
    return str.split(/\s+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  },
  formatDate(dateStr, lang, options) {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Invalid Date";
      const formatter = new Intl.DateTimeFormat(lang, options || { day: "numeric", month: "long", year: "numeric" });
      return formatter.format(d);
    } catch (e) {
      return "Invalid Date";
    }
  },
  formatDateTime(dateStr, lang, options) {
    if (!dateStr) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hasTime = d.getHours() || d.getMinutes() || d.getSeconds();
    const opts = options || (hasTime ? { dateStyle: "long", timeStyle: "short" } : { dateStyle: "long" });
    return new Intl.DateTimeFormat(lang, opts).format(d);
  },
  truncate(str, length = 50) {
    if (!str) return "";
    return str.length > length ? str.slice(0, length) + "..." : str;
  },
  getDisplayTitle(dataset, lang) {
    const rawTitle = (dataset["dct:title"] && dataset["dct:title"][lang]) || "Untitled";
    return Utils.truncate(rawTitle, 50);
  },

  // Functions shared with details.js
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
  formatContactPoint(contact) {
    if (!contact || typeof contact !== "object") return "";
    const name = contact["schema:name"] || "Unknown";
    const email = contact["schema:email"] || "";
    return email ? `${name} (<a href="mailto:${email}">${email}</a>)` : name;
  },  
  formatSingleUrl(url) {
    if (!url || typeof url !== "string") return "N/A";
    return `<a href="${url}" target="_blank" class="check-url">${url}</a>`;
  },
  formatUrlArray(urlArray) {
    if (!Array.isArray(urlArray) || urlArray.length === 0) return "N/A";
    return urlArray
      .map((url) =>
        url && typeof url === "string"
          ? `<a href="${url}" target="_blank" class="check-url">${url}</a>`
          : "N/A"
      )
      .join("<br>");
  },
  verifyUrls() {
    // Select all anchors rendered by formatSingleUrl
    const links = document.querySelectorAll('.check-url');
    links.forEach(link => {
      const url = link.href;
      // Use a HEAD request to check if the URL works
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            // Create a warning icon using the Bootstrap exclamation-circle icon
            const warning = document.createElement('span');
            warning.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i>';
            warning.style.marginLeft = "5px";
            warning.style.color = "red";
            warning.title = `URL returned status: ${response.status}`;
            // Insert the warning icon after the link so it doesn't inherit underline
            link.insertAdjacentElement('afterend', warning);
          }
        })
        .catch(error => {
          // If the fetch fails entirely, also show the warning icon
          const warning = document.createElement('span');
          warning.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i>';
          warning.style.marginLeft = "5px";
          warning.style.color = "red";
          warning.title = "URL could not be reached.";
          link.insertAdjacentElement('afterend', warning);
        });
    });
  },  
  getLocalized(fieldObj, lang) {
    if (!fieldObj) return "";
    return fieldObj[lang] || fieldObj["en"] || "";
  },
  highlightEnumeratedValues(val) {
    if (val === undefined || val === null) return "";
    if (Array.isArray(val)) {
      return val
        .map(item => `<span class="enumeration-chip">${Utils.formatEnumerationString(item)}</span>`)
        .join(" ");
    }
    return `<span class="enumeration-chip">${Utils.formatEnumerationString(val)}</span>`;
  },
  stringifyIfNeeded(val) {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  },

  // UI Helpers
  setLanguageDropdownLabel(lang) {
    let label = "English";
    if (lang === "de") label = "Deutsch";
    else if (lang === "fr") label = "Français";
    else if (lang === "it") label = "Italiano";
    $("#language-dropdown-button").text(label);
  },
  setSortDropdownLabel(sortValue) {
    let key = "";
    switch (sortValue) {
      case "title":
        key = "sortTitle";
        break;
      case "issued-asc":
        key = "sortIssuedAsc";
        break;
      case "issued-desc":
        key = "sortIssuedDesc";
        break;
      case "owner":
        key = "sortOwner";
        break;
      default:
        key = "sortTitle";
    }
    const label = i18next.t(key);
    $("#sort-dropdown-button").text(label);
  }
};

window.Utils = Utils;
