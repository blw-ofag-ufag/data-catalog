"use strict";

const Utils = {
  // Data Helpers
  getDataOwnerName(data) {
    return data.businessDataOwner || "";
  },
  parseTokens(str) {
    if (!str) return [];
    return str.split(/(?:,\s|\s\|\s|\sOR\s)/i)
              .map(s => s.trim().toLowerCase())
              .filter(Boolean);
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
  formatTemporal(temporalObj, lang, options) {
    if (!temporalObj || typeof temporalObj !== "object") return "";
    const startDate = temporalObj["dcat:start_date"];
    const endDate = temporalObj["dcat:end_date"];
    const formattedStart = this.formatDate(startDate, lang, options);
    const formattedEnd = this.formatDate(endDate, lang, options);
    return `${formattedStart} - ${formattedEnd}`;
  },  
  getDisplayTitle(dataset, lang) {
    return (dataset["dct:title"] && dataset["dct:title"][lang]) || "N/A";
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
  formatIdArray(val, lang) {
    if (Array.isArray(val)) {
      return val
        .map(id => `<a href="details.html?dataset=${encodeURIComponent(id)}&lang=${lang}">${id}</a>`)
        .join(", ");
    } else {
      return `<a href="details.html?dataset=${encodeURIComponent(val)}&lang=${lang}">${val}</a>`;
    }
  },
  formatAliasURL(aliasURLobject) {
    if (!aliasURLobject || !Array.isArray(aliasURLobject) || aliasURLobject.length === 0) return "";
    return aliasURLobject.map(page => {
      const uri = page.uri;
      const alias = page.alias;
      if (uri && alias) {
        // Case 1: Both uri and alias are present.
        return `<a href="${uri}" target="_blank">${alias}</a>`;
      } else if (uri) {
        // Case 2: Only uri is present.
        return `<a href="${uri}" target="_blank">${uri}</a>`;
      } else if (alias) {
        // Case 3: Only alias is present.
        return alias;
      }
      return "";
    }).join("<br>");
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
