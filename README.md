[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Pages](https://img.shields.io/github/deployments/blw-ofag-ufag/data-catalog/github-pages?label=GitHub%20Pages)](https://blw-ofag-ufag.github.io/data-catalog/)
[![GitHub last commit](https://img.shields.io/github/last-commit/blw-ofag-ufag/data-catalog.svg)](https://github.com/blw-ofag-ufag/data-catalog/commits)
[![GitHub issues](https://img.shields.io/github/issues/blw-ofag-ufag/data-catalog.svg)](https://github.com/blw-ofag-ufag/data-catalog/issues)

DigiAgriFoodCH Data Catalog
===========================

This data catalog was built in a joint effort by the Federal Office for Agriculture FOAG and the Federal Food Safety and Veterinary Office FSVO.
It aims to showcase the offices datasets in a user-friendly way and in one place while maintaining interoperability with broader metadata platforms.

> [!IMPORTANT]
> We are currently migrating the application to angular. The current state of this is alpha, but we will be up to feature parity with the previous version in May/June 2025.

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
(Github Actions are currently work in progress)
This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.10.

Prerequisites to run locally: node.js and globally installed angular CLI

1. **Explore the data catalog online:** Head over to our [GitHub page](https://blw-ofag-ufag.github.io/data-catalog/index.html?lang=en&sort=issued-desc) to see the development version of the data catalog in action. Not that the main version is deployed on an Azure instance.
2. **Clone & Run Locally**  
   ```bash
   git clone https://github.com/blw-ofag-ufag/data-catalog.git
   cd data-catalog
   npm install
   ng serve
   ```
   
Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Useful links
* Oblique docs: https://oblique.bit.admin.ch/introductions/welcome
* Figma design: https://www.figma.com/design/Nxnu7VCDCmiGCazmu689vc/DigiAgriFoodCH-Data-Catalog?node-id=14574-13069&p=f&t=IUnnNbYTltWaVDTr-0

[//]: # (Previous version: https://blw-ofag-ufag.github.io/data-catalog/index.html?lang=en&sort=issued-desc&view=tile&page=1)


## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

# Docker
The Dockerfile in the project root builds the angular application and copies the (html, css, js)-files
to the default document root of an nginx web server.
The image doesn't contain any node.js runtime anymore.


## 🚀 Build the Docker Image
```bash
docker build -t yourusername/data-catalog:latest .
```

## run the container
```docker run -p yourusername/data-catalog:latest```
or for the pre-built image:
```docker run -p iwfbr/data-catalog:latest```

## Pre-built Docker Image
https://hub.docker.com/repository/docker/iwfbr/data-catalog

# 🤝 Contributing

We believe a vibrant open-source community drives creativity.
Whether you’re a data geek or a UI/UX wizard, your input helps make agricultural data more accessible and impactful.
Check out our issues for tasks big or small, or open your own suggestions.

# 📜 License

All resources in this repository are available under the Creative Commons Attribution 4.0 License. Feel free to reuse and remix — just give us credit!
