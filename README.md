# 📒 A MVP data catalog for the Federal Office for Agriculture (FOAG)

Welcome to this MVP data catalog repository! This project is a first version of a data catalog, presenting the Federal Office for Agricultures (FOAG) data in a structured yet user-friendly way.

The goal of this data catalog is to have a simple solution covering only basic requirements; but using a data model that is interoperable with [I14Y](https://www.i14y.admin.ch/) and [opendata.swiss](https://opendata.swiss).

You can access the data catalog [here](https://blw-ofag-ufag.github.io/data-catalog/index.html?lang=de&sort=issued-desc). Please note that while all the source code and the metadata about our datasets are publically available, many hyperlinks to resources or people point to internal services with restricted access.

# 📁 Repository structure

- `~/data/`: Contains the metadata of our datasets as JSON files.
- `~/schemas/`: Contains any schema used for the metadata.
- `~/docs/`: Contains the files for the static site. This includes intermediary JSON files that are generated automatically from files in `~/data/` or `~/schemas/`.