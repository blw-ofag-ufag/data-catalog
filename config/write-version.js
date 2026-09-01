#!/usr/bin/env node
/**
 * Writes src/assets/VERSION.txt from package.json.
 *
 * The footer reads VERSION.txt at runtime (services/version.service.ts), so the number
 * has to be a build artefact rather than a second hand-maintained copy: release.sh used
 * to write both files and nothing kept them in step, so a partial release would ship a
 * footer disagreeing with the tag.
 *
 * Generated during prebuild. The file stays committed so `ng serve` works on a fresh
 * clone; CI checks it is up to date.
 */
const fs = require('fs');
const path = require('path');

const {version} = require('../package.json');
const target = path.join(__dirname, '..', 'src', 'assets', 'VERSION.txt');
const next = `${version}\n`;

if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === next) {
	console.log(`VERSION.txt already at ${version}`);
} else {
	fs.writeFileSync(target, next);
	console.log(`VERSION.txt written: ${version}`);
}
