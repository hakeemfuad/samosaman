// The function and browser use the same catalog. Run after editing its JSON.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = require('../functions/catering-menu.json');
const ids = new Set();
if (!Number.isSafeInteger(catalog.maxQuantity) || catalog.maxQuantity < 1) throw new Error('Invalid quantity limit');
for (const group of catalog.groups) {
    if (!group.id || !group.label || !group.unit || !group.items.length) throw new Error('Incomplete menu group');
    for (const item of group.items) {
        if (!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate product ID: ${item.id}`);
        ids.add(item.id);
        if (!item.name || !item.image?.startsWith('assets/') || !fs.existsSync(path.join(root, 'public', item.image))) {
            throw new Error(`Missing product name or image: ${item.id}`);
        }
    }
}
const target = path.join(root, 'public/js/catering-menu.js');
const source = '// Generated from functions/catering-menu.json. Run npm run build:catering-menu.\n' +
    `window.SamosamanCateringMenu = ${JSON.stringify(catalog, null, 2)};\n`;
if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== source) {
        throw new Error('Catering catalog is out of date. Run npm run build:catering-menu.');
    }
    console.log(`Catering catalog checked: ${ids.size} items.`);
} else {
    fs.writeFileSync(target, source);
    console.log(`Catering catalog built: ${ids.size} items.`);
}
