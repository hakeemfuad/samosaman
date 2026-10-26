// Exercise the actual guest-to-auth rendering boundary without contacting Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const navbar = fs.readFileSync('Website/public/js/navbar.js', 'utf8');
const authSource = fs.readFileSync('Website/public/js/auth.js', 'utf8');
const initialMarkup = navbar.match(/<button[^>]*id="nav-user-btn"[^>]*>\s*(<svg[\s\S]*?<\/svg>)/)?.[1];
assert.ok(initialMarkup, 'The shared navbar must render the guest avatar');
const svgNode = markup => ({outerHTML: markup, cloneNode() {return svgNode(markup);}});
function element() {
    const classes = new Set();
    return {children: [], attributes: {}, className: '', textContent: '',
        classList: {add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n)},
        addEventListener() {}, querySelectorAll: () => [],
        setAttribute(name, value) {this.attributes[name] = value;},
        removeAttribute(name) {delete this.attributes[name];},
        querySelector(selector) {return selector === 'svg' ? this.children.find(c => c.outerHTML?.startsWith('<svg')) || null : null;},
        replaceChildren(...children) {this.children = children;},
        set innerHTML(markup) {this.children = [svgNode(markup)];},
        get innerHTML() {return this.children.map(c => c.outerHTML || c.textContent).join('');}
    };
}
function run(hasNavbar = true) {
    const button = hasNavbar ? element() : null;
    if (button) button.innerHTML = initialMarkup;
    let onAuth;
    const auth = {currentUser: null, onAuthStateChanged(callback) {onAuth = callback;}};
    const context = vm.createContext({
        auth, window: {location: {href: ''}}, console,
        document: {
            getElementById: id => id === 'nav-user-btn' ? button : element(),
            querySelectorAll: () => [], getElementsByName: () => [],
            addEventListener() {}, createElement: () => element()
        }
    });
    vm.runInContext(authSource, context);
    if (!button) {onAuth(null); onAuth({displayName: 'Preview User'}); return;}
    const firstNode = button.querySelector('svg');
    onAuth(null);
    assert.equal(button.innerHTML, initialMarkup, 'Guest auth callback changes the avatar drawn by navbar.js');
    assert.equal(button.querySelector('svg'), firstNode, 'Initial guest check must keep the visible SVG node');
    assert.match(initialMarkup, /stroke-width="1\.2"/, 'Guest avatar uses the approved stroke');
    onAuth({displayName: 'Preview User'});
    assert.equal(button.classList.contains('is-signed-in'), true);
    assert.equal(button.children[0].textContent, 'P');
    assert.equal(button.children[1].textContent, 'My account');
    assert.equal(button.attributes['aria-label'], 'Preview, My account');
    onAuth(null);
    assert.equal(button.classList.contains('is-signed-in'), false);
    assert.equal(button.innerHTML, initialMarkup, 'Sign-out restores the same shared avatar');
    const restoredNode = button.querySelector('svg');
    onAuth(null);
    assert.equal(button.querySelector('svg'), restoredNode, 'Repeated guest checks must keep the same node');
}
run();
run(false);
console.log('PASS: first guest render stays unchanged; sign-in labels and sign-out restoration work; pages without a navbar are supported.');
