const fs = require('fs');
const yaml = require('js-yaml');

const yamlPath = __dirname + '/schemas.yaml';
const jsonPath = __dirname + '/../src/app/codegen/schemas.json';

const yamlContent = fs.readFileSync(yamlPath, 'utf8');
const jsonData = yaml.load(yamlContent);

// Ensure the codegen directory exists
const codegenDir = __dirname + '/../src/app/codegen';
if (!fs.existsSync(codegenDir)) {
	fs.mkdirSync(codegenDir, {recursive: true});
}

fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
console.log('Converted schemas YAML to JSON:', jsonPath);