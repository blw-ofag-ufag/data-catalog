[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Pages](https://img.shields.io/github/deployments/blw-ofag-ufag/data-catalog/github-pages?label=GitHub%20Pages)](https://blw-ofag-ufag.github.io/data-catalog/)
[![GitHub last commit](https://img.shields.io/github/last-commit/blw-ofag-ufag/data-catalog.svg)](https://github.com/blw-ofag-ufag/data-catalog/commits)
[![GitHub issues](https://img.shields.io/github/issues/blw-ofag-ufag/data-catalog.svg)](https://github.com/blw-ofag-ufag/data-catalog/issues)


DigiAgriFoodCH Data Catalog
===========================

Welcome to the FOAG Data Catalog, a user-friendly yet robust repository that showcases our diverse data assets in one place. It brings together the best of modern data management: **interoperability**, **openness**, **collaboration**, and **ease of access**.

> [!IMPORTANT]
> While the code and metadata are publicly available, some dataset links point to internal FOAG services and require the right credentials to access.

# ✨ Why is this data catalog special?

This data catalog directly supports the principles of DigiAgriFoodCH, Switzerland’s [digital strategy for the agri-food sector](https://digiagrifood.ch/digiknowhow/digitalisierungsstrategie) — including Once Only, Open by Default, and Innovation First — while ensuring seamless interoperability by aligning its metadata structure with both [I14Y](https://www.i14y.admin.ch/) and [opendata.swiss](https://opendata.swiss) standards for frictionless data exchange.
Each dataset includes clear ownership and provenance information, empowering data owners and analysts to collaborate more effectively and streamline data governance.
Ultimately, everyone benefits: managers and decision-makers make strategic calls faster with trusted data; technical teams simplify system integrations and metadata maintenance; and external stakeholders can easily access public datasets for research or community-driven projects.

# ⚡ What are the key features?

1. **Intuitive frontend:** A user-friendly interface for browsing, filtering, and sorting datasets, making it simple to discover the information you need.
2. **Schema-based validation:** Each dataset is structured according to a robust JSON Schema, providing consistent quality and clarity throughout the catalog. *Note that data and schema are held on a [separate repository](https://github.com/blw-ofag-ufag/metadata).*
3. **Interoperability by design:** Metadata follows recognized standards and is compatible with both [I14Y](https://www.i14y.admin.ch/) and [opendata.swiss](https://opendata.swiss), ensuring seamless data exchange across platforms.
4. **Open source collaboration:** We welcome pull requests and community-driven improvements. Join our open source culture by sharing your ideas, reporting issues, or enhancing features for the benefit of all users.

# 🚀 Quick start

1. **Explore the data catalog online:** Head over to our [GitHub page](https://blw-ofag-ufag.github.io/data-catalog/index.html?lang=en&sort=issued-desc) to see the development version of the data catalog in action. Not that the main version is deployed on an Azure instance.
2. **Clone & Run Locally**  
   ```bash
   git clone https://github.com/blw-ofag-ufag/data-catalog.git
   cd data-catalog
   python3 -m http.server
   ```

# 🤝 Contributing

We believe a vibrant open-source community drives creativity.
Whether you’re a data geek or a UI/UX wizard, your input helps make agricultural data more accessible and impactful.
Check out our issues for tasks big or small, or open your own suggestions.

# 📜 License

All resources in this repository are available under the Creative Commons Attribution 4.0 License.
Feel free to reuse and remix — just give us credit!
