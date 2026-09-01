#!/usr/bin/env node
/**
 * Prüft die vier i18n-Dateien auf Konsistenz. Läuft in CI (test.yaml).
 *
 * Zwei Klassen von Fehlern:
 *  1. Schlüssel fehlt in einer Sprache -> Nutzer sehen den rohen Key in der Oberfläche.
 *  2. Schlüssel existiert nur in einer Sprache -> meist ein Rest aus einer halb
 *     durchgezogenen Umbenennung.
 *
 * Deutsch ist die Referenz: es ist die Sprache, in der neue Felder zuerst gepflegt werden.
 * Leere Werte gelten ebenfalls als fehlend, sonst rutschen Platzhalter durch.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'assets', 'i18n');
const REFERENCE = 'de';
const LANGS = ['de', 'en', 'fr', 'it'];

const flatten = (obj, prefix = '') =>
	Object.entries(obj).flatMap(([k, v]) =>
		typeof v === 'object' && v !== null && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]
	);

const catalogs = {};
for (const lang of LANGS) {
	const file = path.join(DIR, `${lang}.json`);
	if (!fs.existsSync(file)) {
		console.error(`✗ missing translation file: ${file}`);
		process.exit(1);
	}
	catalogs[lang] = Object.fromEntries(flatten(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

const reference = Object.keys(catalogs[REFERENCE]);
const problems = [];

for (const lang of LANGS.filter(l => l !== REFERENCE)) {
	const keys = catalogs[lang];
	for (const key of reference) {
		if (!(key in keys)) problems.push(`${lang}: missing "${key}"`);
		else if (typeof keys[key] === 'string' && keys[key].trim() === '') problems.push(`${lang}: empty value for "${key}"`);
	}
	for (const key of Object.keys(keys)) {
		if (!(key in catalogs[REFERENCE])) problems.push(`${lang}: "${key}" not present in ${REFERENCE}.json`);
	}
}

if (problems.length > 0) {
	console.error(`✗ i18n catalogs are out of sync (${problems.length} problems):\n`);
	for (const p of problems) console.error(`  ${p}`);
	console.error(`\nAdd the key to all of ${LANGS.join(', ')} or remove it everywhere.`);
	process.exit(1);
}

console.log(`✓ i18n catalogs in sync: ${LANGS.join(', ')} — ${reference.length} keys each`);
