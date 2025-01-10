const dataUrl =
  "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";

let datasets = [];
let currentLanguage = "en";

document.addEventListener("DOMContentLoaded", () => {
  fetch(dataUrl)
    .then(response => response.json())
    .then(data => {
      // Extract all datasets from the JSON structure
      datasets = data.flatMap(d => Object.values(d.dataset));
      renderDatasets(datasets);
    })
    .catch(error => console.error('Error fetching data:', error));

  document.getElementById("search").addEventListener("input", filterDatasets);
  document.getElementById("language-select").addEventListener("change", changeLanguage);
  document.getElementById("sort-options").addEventListener("change", sortDatasets);
});

function renderDatasets(data) {
  const container = document.getElementById("dataset-container");
  container.innerHTML = data
    .map(dataset => {
      const { metadata, attributes } = dataset;

      // Render keywords as tags
      const keywordsHTML = attributes["dcat:keyword"]
        .map(keyword => `<span>${keyword}</span>`)
        .join("");

      return `
        <div class="dataset-tile">
          <img src="${metadata.imageURL}" alt="${attributes["dct:title"][currentLanguage]}" />
          <div class="dataset-info">
            <h3>${attributes["dct:title"][currentLanguage]}</h3>
            <p>${attributes["dct:description"][currentLanguage]}</p>
            <p><strong>Issued:</strong> ${attributes["dct:issued"] || "N/A"}</p>
            <p><strong>Owner:</strong> ${attributes["bv:dataOwner"] || "N/A"}</p>
            <div class="keywords">${keywordsHTML}</div>
          </div>
        </div>
      `;
    })
    .join("");
}


function filterDatasets() {
  const query = document.getElementById("search").value.toLowerCase();

  const filtered = datasets.filter(({ attributes }) => {
    return ["dct:identifier", "dct:title", "dct:description", "bv:dataOwner", "dcat:keyword", "dct:issued"]
      .some(field => {
        const value = attributes[field];

        if (!value) return false; // Skip null or undefined values

        // Handle specific cases
        if (field === "dcat:keyword") {
          return value.join(", ").toLowerCase().includes(query);
        }

        if (field === "dct:title" || field === "dct:description") {
          return Object.values(value).some(val => val.toLowerCase().includes(query));
        }

        if (field === "dct:issued") {
          return value.toLowerCase().includes(query); // Dates as strings
        }

        // Default case for other fields
        return String(value).toLowerCase().includes(query);
      });
  });

  renderDatasets(filtered);
}

function changeLanguage() {
  currentLanguage = document.getElementById("language-select").value;
  renderDatasets(datasets);
}

function sortDatasets() {
  const sortBy = document.getElementById("sort-options").value;

  const sorted = [...datasets].sort((a, b) => {
    let fieldA, fieldB;

    if (sortBy === "title") {
      fieldA = a.attributes["dct:title"][currentLanguage] || "";
      fieldB = b.attributes["dct:title"][currentLanguage] || "";
      return fieldA.localeCompare(fieldB, undefined, { numeric: true });
    } else if (sortBy === "issued-asc" || sortBy === "issued-desc") {
      fieldA = a.attributes["dct:issued"] || null;
      fieldB = b.attributes["dct:issued"] || null;

      // Ensure null values are always at the end
      if (!fieldA) return 1;
      if (!fieldB) return -1;

      // Convert to Date objects for comparison
      fieldA = new Date(fieldA);
      fieldB = new Date(fieldB);

      if (sortBy === "issued-asc") {
        return fieldA - fieldB; // Ascending
      } else if (sortBy === "issued-desc") {
        return fieldB - fieldA; // Descending
      }
    } else if (sortBy === "owner") {
      fieldA = a.attributes["bv:dataOwner"] || "";
      fieldB = b.attributes["bv:dataOwner"] || "";
      return fieldA.localeCompare(fieldB, undefined, { numeric: true });
    }

    return 0; // Default case (shouldn't be reached)
  });

  renderDatasets(sorted);
}
