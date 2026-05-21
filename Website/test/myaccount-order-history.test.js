const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const websiteRoot = path.resolve(__dirname, '..');

function readProjectFile(...segments) {
    return fs.readFileSync(path.join(websiteRoot, ...segments), 'utf8');
}

test('empty recent orders state invites ordering from the Burlington menu', () => {
    const html = readProjectFile('public', 'myaccount.html');
    const emptyStateMatch = html.match(/if \(!orderDocs\.length\) \{[\s\S]*?container\.innerHTML = `([\s\S]*?)`;/);

    assert.ok(emptyStateMatch, 'Recent Orders empty state template should exist');

    const emptyState = emptyStateMatch[1];
    assert.match(emptyState, /Let's fill this section up!/);
    assert.match(emptyState, /href="burlington\.html"/);
    assert.match(emptyState, />\s*Order Now\s*</);
});

test('Firebase config tracks Firestore rules that allow users to read their orders', () => {
    const firebaseConfig = JSON.parse(readProjectFile('firebase.json'));

    assert.equal(firebaseConfig.firestore?.rules, 'firestore.rules');

    const rules = readProjectFile('firestore.rules');
    assert.match(rules, /match \/orders\/\{orderId\}/);
    assert.match(rules, /allow read:/);
    assert.match(rules, /request\.auth != null/);
    assert.match(rules, /resource\.data\.uid == request\.auth\.uid/);
});
