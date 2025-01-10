const dataUrl =
  "https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/data/dataCatalog.json";

let datasets = [];
let currentLanguage = "en";

document.addEventListener("DOMContentLoaded", () => {
  fetch(dataUrl)
    .then(response => response.json())
    .then(data => {
      datasets = data.map(d => Object.values(d.dataset)[0]);
      renderDatasets(datasets);
    });

  document.getElementById("search").addEventListener("input", filterDatasets);
  document.getElementById("language-select").addEventListener("change", changeLanguage);
  document.getElementById("sort-options").addEventListener("change", sortDatasets);
});

function renderDatasets(data) {
  const container = document.getElementById("dataset-container");
  container.innerHTML = data
    .map(dataset => {
      const { metadata, attributes } = dataset;
      return `
        <div class="dataset-tile">
          <img src="${metadata.imageURL}" alt="${attributes["dct:title"][currentLanguage]}" />
          <div class="dataset-info">
            <h3>${attributes["dct:title"][currentLanguage]}</h3>
            <p>${attributes["dct:description"][currentLanguage]}</p>
            <p><strong>Issued:</strong> ${attributes["dct:issued"]}</p>
            <p><strong>Owner:</strong> ${attributes["bv:dataOwner"]}</p>
            <p class="keywords">${attributes["dcat:keyword"].join(", ")}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function filterDatasets() {
  const query = document.getElementById("search").value.toLowerCase();
  const filtered = datasets.filter(({ attributes }) =>
    ["dct:identifier", "dct:title", "dct:description", "bv:dataOwner", "dcat:keyword"]
      .some(field =>
        field === "dcat:keyword"
          ? attributes[field].join(", ").toLowerCase().includes(query)
          : Object.values(attributes[field] || {}).join(" ").toLowerCase().includes(query)
      )
  );
  renderDatasets(filtered);
}

function changeLanguage() {
  currentLanguage = document.getElementById("language-select").value;
  renderDatasets(datasets);
}

function sortDatasets() {
  const sortBy = document.getElementById("sort-options").value;
  const sorted = [...datasets].sort((a, b) => {
    const fieldA = a.attributes[`dct:${sortBy}`] || "";
    const fieldB = b.attributes[`dct:${sortBy}`] || "";
    return fieldA.localeCompare(fieldB, undefined, { numeric: true });
  });
  renderDatasets(sorted);
}
