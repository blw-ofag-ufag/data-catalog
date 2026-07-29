#!/usr/bin/env node
/**
 * Guard against `src/app/models/schemas/dataset.ts` drifting from the schema the app actually uses.
 *
 * That file is a hand-maintained mirror: nothing generates it, and since the app started fetching
 * its schemas from the metadata repo at runtime, nothing checked it either. It silently fell three
 * fields behind — `bv:itSystem`, `bv:retentionPeriod` and `prov:wasGeneratedBy` were dropped from
 * the schema but stayed in the TypeScript, which is how the data loss in issue #284 went unnoticed.
 *
 * Compares TOP-LEVEL properties only. Nested keys such as `schema:email` / `schema:name` live under
 * `dcat:contactPoint` and `prov:qualifiedAttribution`; a flat walk reports them as drift when they
 * are perfectly fine.
 *
 * Usage: node config/check-schema-drift.js    (exit 0 = in sync, 1 = drift, 2 = could not check)
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SCHEMAS_YAML = path.join(__dirname, 'schemas.yaml');
const DATASET_TS = path.join(__dirname, '..', 'src', 'app', 'models', 'schemas', 'dataset.ts');
const INTERFACE = 'DatasetSchema';

function baseSchemaUrl() {
	const entries = yaml.load(fs.readFileSync(SCHEMAS_YAML, 'utf8'));
	const base = (entries || []).find(e => e.id === 'base');
	if (!base) {
		throw new Error(`no entry with id "base" in ${SCHEMAS_YAML}`);
	}
	return `https://raw.githubusercontent.com/${base.githubRepo}/${base.branch}/${base.path}`;
}

/** Field names declared directly on the named interface (not on nested ones). */
function declaredFields(source, interfaceName) {
	const start = source.indexOf(`export interface ${interfaceName}`);
	if (start === -1) {
		throw new Error(`interface ${interfaceName} not found in ${DATASET_TS}`);
	}
	const open = source.indexOf('{', start);
	const close = source.indexOf('\n}', open);
	const body = source.slice(open, close);

	const fields = new Set();
	// Matches `'dct:title': DatasetTitle;` and `'dcatap:availability'?: DatasetAvailability;`
	for (const m of body.matchAll(/^\s*'([^']+)'\??\s*:/gm)) {
		fields.add(m[1]);
	}
	return fields;
}

async function main() {
	const url = baseSchemaUrl();
	const response = await fetch(url);
	if (!response.ok) {
		console.error(`Could not fetch the base schema (${response.status}): ${url}`);
		process.exit(2);
	}
	const schema = await response.json();
	const remote = new Set(Object.keys(schema.properties || {}));
	const local = declaredFields(fs.readFileSync(DATASET_TS, 'utf8'), INTERFACE);

	const stale = [...local].filter(f => !remote.has(f)).sort();
	const missing = [...remote].filter(f => !local.has(f)).sort();

	console.log(`schema:     ${url}`);
	console.log(`typescript: ${path.relative(process.cwd(), DATASET_TS)} (interface ${INTERFACE})`);
	console.log(`            ${remote.size} schema properties, ${local.size} declared fields\n`);

	if (!stale.length && !missing.length) {
		console.log('In sync.');
		return;
	}

	if (stale.length) {
		console.error('Declared in TypeScript but NOT in the schema (removed upstream?):');
		stale.forEach(f => console.error(`  - ${f}`));
		console.error('');
	}
	if (missing.length) {
		console.error('In the schema but NOT declared in TypeScript (added upstream?):');
		missing.forEach(f => console.error(`  + ${f}`));
		console.error('');
	}
	console.error('The app validates against the runtime schema, so these types no longer describe');
	console.error('what it actually reads and writes. See issue #284 for what stale fields cost.');
	process.exit(1);
}

main().catch(err => {
	console.error(err.message);
	process.exit(2);
});
