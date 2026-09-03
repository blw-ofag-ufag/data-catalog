[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Pages](https://img.shields.io/github/deployments/blw-ofag-ufag/data-catalog/github-pages?label=GitHub%20Pages)](https://blw-ofag-ufag.github.io/data-catalog/)
[![GitHub last commit](https://img.shields.io/github/last-commit/blw-ofag-ufag/data-catalog.svg)](https://github.com/blw-ofag-ufag/data-catalog/commits)
[![GitHub issues](https://img.shields.io/github/issues/blw-ofag-ufag/data-catalog.svg)](https://github.com/blw-ofag-ufag/data-catalog/issues)

🐮 Agri-Food Data Catalog
==========================

This data catalog was built in a joint effort by the Federal Office for Agriculture FOAG and the Federal Food Safety and Veterinary Office FSVO.
It aims to showcase the offices datasets in a user-friendly way and in one place while maintaining interoperability with broader metadata platforms.

This data catalog directly supports the principles of DigiAgriFoodCH, Switzerland’s [digital strategy for the agri-food sector](https://digiagrifood.ch/digiknowhow/digitalisierungsstrategie) — including Once Only, Open by Default, and Innovation First — while ensuring seamless interoperability by aligning its metadata structure with both [I14Y](https://www.i14y.admin.ch/) and [opendata.swiss](https://opendata.swiss) standards for frictionless data exchange.
Each dataset includes clear ownership and provenance information, empowering data owners and analysts to collaborate more effectively and streamline data governance.
Ultimately, everyone benefits: managers and decision-makers make strategic calls faster with trusted data; technical teams simplify system integrations and metadata maintenance; and external stakeholders can easily access public datasets for research or community-driven projects.

> [!IMPORTANT]
> - Please open an Issue if you have requirements that the data catalog should meet. Alternatively, you can reach us per mail.
> - While the code and metadata are publicly available, some dataset links point to internal services and require the right credentials to access.

# ⚡ What are the key features?

1. **Intuitive frontend:** A user-friendly interface for browsing, filtering, and sorting datasets, making it simple to discover the information you need.
2. **Schema-based validation:** Each dataset is structured according to a robust JSON Schema, providing consistent quality and clarity throughout the catalog. _Note that data and schema are held on a [separate repository](https://github.com/blw-ofag-ufag/metadata)._
3. **Interoperability by design:** Metadata follows recognized standards and is compatible with both [I14Y](https://www.i14y.admin.ch/) and [opendata.swiss](https://opendata.swiss), ensuring seamless data exchange across platforms.
4. **Open source collaboration:** We welcome pull requests and community-driven improvements. Join our open source culture by sharing your ideas, reporting issues, or enhancing features for the benefit of all users.

# 🔗 Useful links

- [Data catalog hosted as GitHub pages](https://blw-ofag-ufag.github.io/data-catalog/#/index)
- [Oblique documentation](https://oblique.bit.admin.ch/introductions/welcome)
- [Original figma design](https://www.figma.com/design/Nxnu7VCDCmiGCazmu689vc/DigiAgriFoodCH-Data-Catalog?node-id=14574-13069&p=f&t=IUnnNbYTltWaVDTr-0)

# 🚀 Quick start

(Github Actions are currently work in progress)
This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.10.

Prerequisites to run locally: node.js and globally installed angular CLI

1. **Explore the data catalog online:** Head over to our [GitHub page](https://blw-ofag-ufag.github.io/data-catalog/index.html?lang=en&sort=issued-desc) to see the development version of the data catalog in action. Not that the main version is deployed on an Azure instance.
2. **Clone & run locally:**
   ```bash
   git clone https://github.com/blw-ofag-ufag/data-catalog.git
   cd data-catalog
   npm install
   ng serve
   ```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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

# 🧪 Testing

Two suites, both expected to be green before merging.

```bash
npm test                    # Jest: unit + component specs (watch mode)
npm run test:ci             # the same, single run with coverage — what CI executes
npm run test:e2e            # Playwright: end-to-end, against a mocked API
npm run test:e2e:local      # same, but using the system Chromium (see below)
npm run test:e2e:ui         # Playwright's interactive UI mode
```

**Use `test:e2e:local` if `test:e2e` cannot launch a browser.** Playwright's bundled Chromium needs
libraries (e.g. `libnspr4`) that are missing from many WSL and container images, and installing them
via `npx playwright install --with-deps` requires root. The local config launches
`/usr/bin/chromium-browser` instead — override with `CHROMIUM_PATH` if yours lives elsewhere. See
`playwright.local.config.ts`; everything else (fixtures, network mocks, the auto-started dev server)
is inherited from `playwright.config.ts`.

The E2E suite is deliberately **not** run in CI — it runs locally.

# ✅ Code quality

```bash
npm run lint                # ESLint (+ prettier as a rule)
npm run lint:fix            # apply every auto-fixable rule
npm run format              # prettier --write across the repo
npm run format:check        # verify formatting without writing
npm run check:schema-drift  # compare dataset.ts against the runtime schema
```

A **husky pre-commit hook** runs `lint-staged`, which formats staged files with prettier. It is
scoped to staged files on purpose: a full-repo lint on every commit is slow enough that people
disable it (which is exactly what had happened — `format` was an empty string for a long time, and
the formatting debt that built up in the meantime was cleared in #282).

`.prettierignore` deliberately excludes `docs/` (the deployment artifact), `src/app/codegen/`
(regenerated by `npm run prebuild`, so formatting it would be undone on every build) and `.github/`
(the workflows use a 4-space YAML style prettier would flatten).

Lint currently reports ~274 errors and ~690 warnings. The three highest-volume rules
(`no-explicit-any`, `member-ordering`, `prefer-inject`) are set to **warn**: satisfying them means
restructuring most of the codebase, and as errors they drowned out real findings. A non-zero exit
from `npm run lint` therefore means something genuinely needs attention.

# Github actions / production build

**`test.yaml`** runs on every pull request and on pushes to `develop`: installs, runs `prebuild`,
then the Jest suite. It pins `TZ=Europe/Zurich` — the date-handling regression from #259 is only
observable on a clock east of UTC, so on a default UTC runner the test that guards it would pass
for the wrong reason.

**`develop.yaml`** runs on pushes to `develop`: builds the app, deploys it to the `gh-pages` branch,
and commits the build back to `docs/`. It uses a `deploy-develop` concurrency group because the job
pushes to `develop` itself — two runs in flight would otherwise race and the loser would fail with
`! [rejected] develop -> develop`.

The resulting build is a SPA: just an `index.html` with colocated js bundles. For environment
backwards compatibility reasons, this build is located under `docs`.
The base url is fixed to `data-catalog` and is not configurable. A deployment should check out the
code, point a web server document root to `/docs` and serve `index.html` under
`<domain>/data-catalog/`.

# Configuration (publishers)

The set of publishers is configurable, this can be declared in `config/publishers.yaml`. `npm run prebuild` applies the config (generates some code).
All publishers can provide a data repository adhering to the same structure as the BLW repo and JSON schema, for the index we query all and merge them, so an instance of the data catalog can serve multiple sources at once.

# 🔒 Dependency security (npm audit)

GitHub's [Dependabot](https://github.com/blw-ofag-ufag/data-catalog/security/dependabot) reports
known vulnerabilities in our dependencies. You can scan and fix them locally with npm.

> [!IMPORTANT]
> **Never hand-edit `package-lock.json`.** It is generated by npm and contains integrity hashes; a
> manual edit corrupts the file and breaks `npm install`/`npm audit`. Always let the commands below
> regenerate it.

## Scan for vulnerabilities

```bash
npm audit                 # human-readable report grouped by package and severity
npm audit --json          # machine-readable (useful to find the patched version of each advisory)
```

The report lists each advisory's severity, the affected package, and whether a fix is available.

## Let npm fix them

```bash
# 1. Refresh the lockfile from package.json. Because our dependency ranges (e.g. ^21.0.0)
#    already allow patched releases, most alerts are cleared just by regenerating the lockfile.
rm package-lock.json && npm install   # peers resolve cleanly (no --legacy-peer-deps needed)

# 2. Apply non-breaking fixes for anything left.
npm audit fix

# 3. Re-scan.
npm audit
```

Avoid `npm audit fix --force` — it applies breaking major/downgrade changes (for this project it
proposes destructive toolchain downgrades) and can break the build.

## When a transitive dependency has no direct fix

If a vulnerable package is pulled in indirectly and `npm audit fix` cannot reach it without a
breaking change, pin a patched version with an [`overrides`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
block in `package.json`, then reinstall. Overrides can be global or scoped to a single consumer (use
the `"."` key to also pin the consumer's own version):

```jsonc
// package.json
"overrides": {
  "esbuild": "^0.28.1",
  "@angular/build": { "undici": "^7.28.0", "piscina": "^5.2.0" },

  // When several major lines of the same package are in the tree and each has its own
  // patched release, pin them separately with version-scoped keys:
  "brace-expansion@1": "^1.1.16",
  "brace-expansion@2": "^2.1.2"
}
```

```bash
npm install
```

> [!WARNING]
> **`npm audit` reports false positives once `overrides` are in play.** It evaluates _declared_
> dependency ranges rather than the versions actually installed, so a package you have correctly
> pinned keeps showing up as vulnerable. Do not chase those.
>
> `package-lock.json` is the source of truth — check the resolved version directly:
>
> ```bash
> npm ls <package> --all      # what is actually installed
> ```
>
> Dependabot reads the lockfile, so its count is the one to trust. In PR #283 `npm audit` still
> claimed 30 advisories while Dependabot correctly dropped from 7 open alerts to 1.

## After updating, always verify

```bash
npm ci                      # the lockfile installs cleanly from scratch
npm run build               # the app still builds
npm test                    # unit/component tests still pass
npm run test:e2e:local      # end-to-end tests still pass
```

# Docker

The Dockerfile in the project root builds the angular application and copies the (html, css, js)-files
to the default document root of an nginx web server.
The image doesn't contain any node.js runtime anymore.

## 🚀 Build the Docker Image

```bash
docker build -t yourusername/data-catalog:latest .
```

## Run the container

```
docker run -p yourusername/data-catalog:latest
```

## 💡 Contribute to the data catalog

<img src="https://github.com/user-attachments/assets/2995fa0b-db7a-4141-bbb8-91a9301cd474" align="right" width="40%" alt="PAT Settings">

To interact with this project's repositories (i.e., add or edit metadata) in the **blw-ofag-ufag** organization, you need to generate a Fine-grained Personal Access Token (PAT).

#### **1. Navigate to Settings**

- Go to GitHub **Settings** > **Developer settings**.
- Select **Personal access tokens** > **Fine-grained tokens** (see image).

#### **2. Configuration**

- **Resource owner**: Select **blw-ofag-ufag**.
- **Token name**: e.g., `Metadata Repo`.
- **Expiration**: 90 days.

#### **3. Access & Permissions**

- **Repository access**: Choose **Only select repositories** and pick your metadata repo.
- **Permissions**: Set **Contents** to `Read and write`.

#### **4. Save Securely**

- Click **Generate token**.
- **Copy immediately** and store it in **KeePass**.

<br clear="right"/>
