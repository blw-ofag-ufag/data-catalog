const fs = require('fs');
const yaml = require('js-yaml');

const yamlPath = __dirname + '/publishers.yaml';
const jsonPath = __dirname + '/../src/app/codegen/publishers.json';

const yamlContent = fs.readFileSync(yamlPath, 'utf8');
const jsonData = yaml.load(yamlContent);

fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
console.log('Converted YAML to JSON:', jsonPath);
