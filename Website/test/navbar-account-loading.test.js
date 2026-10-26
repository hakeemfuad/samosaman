const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const publicRoot = path.resolve(__dirname, '../public');
const scripts = ['navbar.js', 'auth.js'].map(file => ({
    file,
    source: fs.readFileSync(path.join(publicRoot, 'js', file), 'utf8'),
}));

// Small DOM fixture for the shared scripts. Firebase state is held pending so
// every test can inspect startup before the real auth observer renders a user.
class Element {
    constructor(tagName = 'div') {
        this.tagName = tagName.toLowerCase();
        this.attributes = new Map();
        this.children = [];
        this.listeners = new Map();
        this.style = {};
        this._text = '';
        this.classList = {
            contains: name => this.className.split(/\s+/).includes(name),
            add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
            remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
            toggle: (name, force) => {
                const enabled = force ?? !this.classList.contains(name);
                this.classList[enabled ? 'add' : 'remove'](name);
                return enabled;
            },
        };
    }
    get id() { return this.getAttribute('id') || ''; }
    set id(value) { this.setAttribute('id', value); }
    get className() { return this.getAttribute('class') || ''; }
    set className(value) { this.setAttribute('class', value); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(value) { this.toggleAttribute('disabled', value); }
    get hidden() { return this.hasAttribute('hidden'); }
    set hidden(value) { this.toggleAttribute('hidden', value); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this._text = String(value); this.children = []; }
    get innerHTML() { return this._text + this.children.map(child => child.outerHTML).join(''); }
    set innerHTML(value) { this._text = ''; this.children = []; parseHTML(String(value), this); }
    get outerHTML() {
        return `<${this.tagName}${[...this.attributes].map(([key, value]) => ` ${key}="${value}"`).join('')}>${this.innerHTML}</${this.tagName}>`;
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    toggleAttribute(name, value) { value ? this.setAttribute(name, '') : this.removeAttribute(name); }
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    replaceChildren(...children) { this._text = ''; this.children = []; this.append(...children); }
    insertAdjacentHTML(position, html) { assert.equal(position, 'beforeend'); parseHTML(html, this); }
    cloneNode(deep) {
        const clone = new Element(this.tagName);
        clone.attributes = new Map(this.attributes);
        clone._text = this._text;
        if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
        return clone;
    }
    querySelectorAll(selector) {
        const results = [];
        const visit = node => node.children.forEach(child => {
            if (selector.split(',').some(part => matches(child, part.trim()))) results.push(child);
            visit(child);
        });
        visit(this);
        return results;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, callback) {
        const callbacks = this.listeners.get(type) || [];
        callbacks.push(callback);
        this.listeners.set(type, callbacks);
    }
    click() {
        if (this.disabled) return;
        const event = { preventDefault() {}, target: this };
        this.onclick?.(event);
        (this.listeners.get('click') || []).forEach(callback => callback(event));
    }
}

function matches(element, selector) {
    const parts = selector.split(/\s+/);
    const own = parts.pop();
    if (parts.length && !ancestorMatches(element.parentElement, parts.join(' '))) return false;
    const excluded = [...own.matchAll(/:not\(([^)]+)\)/g)].map(match => match[1]);
    if (excluded.some(part => matches(element, part))) return false;
    const simple = own.replace(/:not\([^)]+\)/g, '');
    const tag = simple.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && element.tagName !== tag.toLowerCase()) return false;
    for (const match of simple.replace(/\[[^\]]+\]/g, '').matchAll(/([.#])([\w-]+)/g)) {
        if (match[1] === '#' ? element.id !== match[2] : !element.classList.contains(match[2])) return false;
    }
    for (const match of simple.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)) {
        if (!element.hasAttribute(match[1])) return false;
        if (match[2] !== undefined && element.getAttribute(match[1]) !== match[2]) return false;
    }
    return true;
}
function ancestorMatches(element, selector) {
    return !!element && (matches(element, selector) || ancestorMatches(element.parentElement, selector));
}
function parseHTML(html, root) {
    const stack = [root];
    const voidTags = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
    for (const token of html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || []) {
        if (token.startsWith('<!--')) continue;
        if (token.startsWith('</')) { stack.pop(); continue; }
        if (token.startsWith('<')) {
            const tag = token.match(/^<([\w-]+)/)?.[1];
            if (!tag) continue;
            const element = new Element(tag);
            const attributes = token.slice(tag.length + 1).replace(/\/?\s*>$/, '');
            for (const match of attributes.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)) {
                element.setAttribute(match[1], match[2] ?? match[3] ?? match[4] ?? '');
            }
            stack.at(-1).appendChild(element);
            if (!voidTags.has(tag) && !token.endsWith('/>')) stack.push(element);
        } else {
            stack.at(-1)._text += token;
        }
    }
}

function memoryStorage(entries = new Map()) {
    return {
        entries,
        getItem: key => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, String(value)),
        removeItem: key => entries.delete(key),
    };
}
function loadPage({ storage = memoryStorage(), page = 'index.html' } = {}) {
    const body = new Element('body');
    const withoutNavbar = page === 'checkout-options.html';
    if (withoutNavbar) {
        const html = fs.readFileSync(path.join(publicRoot, page), 'utf8');
        const bodyHTML = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
        parseHTML(bodyHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''), body);
    } else {
        const placeholder = body.appendChild(new Element());
        placeholder.id = 'navbar-placeholder';
    }
    const document = {
        body,
        referrer: 'https://samosamanvt.com/index.html',
        getElementById: id => body.querySelector(`#${id}`),
        querySelectorAll: selector => body.querySelectorAll(selector),
        getElementsByName: name => body.querySelectorAll(`[name="${name}"]`),
        createElement: tag => new Element(tag),
        addEventListener: (type, callback) => body.addEventListener(type, callback),
    };
    const callbacks = [];
    const auth = { currentUser: null, onAuthStateChanged: callback => { callbacks.push(callback); return () => {}; } };
    const location = { pathname: `/${page}`, href: `https://samosamanvt.com/${page}` };
    const context = {
        document, auth, location, sessionStorage: storage, localStorage: memoryStorage(),
        firebase: { auth: () => auth }, console,
        performance: { getEntriesByType: () => [{ type: 'navigate' }] },
        MutationObserver: class { observe() {} },
        setTimeout: callback => { callback(); return 1; }, clearTimeout() {},
        requestAnimationFrame: callback => callback(),
        scrollY: 0, addEventListener() {},
        matchMedia: () => ({ matches: false, addEventListener() {} }),
    };
    context.window = context;
    vm.createContext(context);
    for (const { source, file } of scripts) {
        if (withoutNavbar && file === 'navbar.js') continue;
        vm.runInContext(source, context, { filename: file });
    }
    return {
        button: document.getElementById('nav-user-btn'), document, location, storage,
        ready(user) { auth.currentUser = user; callbacks.forEach(callback => callback(user)); },
        domReady() { (body.listeners.get('DOMContentLoaded') || []).forEach(callback => callback()); },
    };
}
const user = { displayName: 'Hakeem Fuad', uid: 'test-account' };
function assertPending(button) {
    assert.equal(button.getAttribute('aria-busy'), 'true', 'Account must mark its unresolved state');
    assert.equal(button.disabled, true, 'Cached appearance must not authorize an account action');
    assert.equal(button.classList.contains('is-auth-pending'), true);
}
function assertSignedIn(button, initial = 'H') {
    assert.equal(button.classList.contains('is-signed-in'), true);
    assert.equal(button.querySelector('.nav-user-label')?.textContent, 'My account');
    assert.equal(button.querySelector('.nav-user-initial')?.textContent, initial);
    // CSS selects the account label on mobile and the initial on desktop.
    // Keeping the canonical SVG allows sign-out to restore the same artwork.
    assert.ok(button.querySelector('svg'));
}

test('initial account control waits for the first confirmed auth state', () => {
    const page = loadPage();
    assertPending(page.button);
    assert.equal(page.button.classList.contains('has-auth-preview'), false, 'Unknown auth state must stay hidden');
    page.domReady();
    page.button.click();
    assert.equal(page.document.getElementById('auth-modal').classList.contains('hidden'), true);
    page.ready(user);
    assertSignedIn(page.button);
    assert.equal(page.button.disabled, false);
    assert.notEqual(page.button.getAttribute('aria-busy'), 'true');
    page.button.click();
    assert.equal(page.location.href, 'myaccount.html');
});

test('next page retains confirmed signed-in appearance before Firebase responds', () => {
    const first = loadPage();
    first.ready(user);
    const next = loadPage({ storage: first.storage, page: 'catering.html' });
    assertSignedIn(next.button);
    assertPending(next.button);
    assert.equal(next.button.classList.contains('has-auth-preview'), true);
    next.domReady();
    next.button.click();
    assert.equal(next.document.getElementById('auth-modal').classList.contains('hidden'), true);
    assert.equal(next.location.href, 'https://samosamanvt.com/catering.html');
    next.ready(user);
    assertSignedIn(next.button);
    assert.equal(next.button.disabled, false);
});

test('confirmed sign-out restores the guest icon and removes stale signed-in appearance', () => {
    const first = loadPage();
    first.ready(user);
    const next = loadPage({ storage: first.storage, page: 'myaccount.html' });
    next.ready(null);
    assert.equal(next.button.classList.contains('is-signed-in'), false);
    assert.ok(next.button.querySelector('svg'));
    assert.notEqual(next.button.getAttribute('aria-busy'), 'true');
    assert.equal(next.button.disabled, false);
    next.button.click();
    assert.equal(next.document.getElementById('auth-modal').classList.contains('hidden'), false);
    const signedOutPage = loadPage({ storage: first.storage });
    assert.equal(signedOutPage.button.classList.contains('is-signed-in'), false);
    assertPending(signedOutPage.button);
    assert.equal(signedOutPage.button.classList.contains('has-auth-preview'), true);
    assert.deepEqual(JSON.parse(first.storage.getItem('samosaman_nav_account')), { signedIn: false });
});

test('unavailable session storage does not block auth rendering', () => {
    const unavailable = () => { throw new Error('Storage is unavailable'); };
    const page = loadPage({ storage: { getItem: unavailable, setItem: unavailable, removeItem: unavailable } });
    assertPending(page.button);
    assert.equal(page.button.classList.contains('has-auth-preview'), false);
    page.ready(user);
    assertSignedIn(page.button);
    assert.equal(page.button.disabled, false);
    page.ready(null);
    assert.ok(page.button.querySelector('svg'));
    assert.equal(page.button.disabled, false);
});


test('cached state stores display data only', () => {
    const page = loadPage();
    page.ready(user);
    assert.deepEqual(JSON.parse(page.storage.getItem('samosaman_nav_account')), { signedIn: true, initial: 'H' });
});

test('invalid cached appearance stays hidden until Firebase supplies a user', () => {
    for (const invalid of ['not-json', '{"signedIn":"true","initial":"H"}', '{"signedIn":true,"initial":"<script>"}', '{"signedIn":true,"initial":""}']) {
        const storage = memoryStorage(new Map([['samosaman_nav_account', invalid]]));
        const page = loadPage({ storage });
        assertPending(page.button);
        assert.equal(page.button.classList.contains('has-auth-preview'), false);
        page.ready(user);
        assertSignedIn(page.button);
    }
});

test('cached Unicode initials are text and cannot create HTML elements', () => {
    for (const initial of ['😀', '<']) {
        const storage = memoryStorage(new Map([['samosaman_nav_account', JSON.stringify({ signedIn: true, initial })]]));
        const page = loadPage({ storage });
        assertPending(page.button);
        assert.equal(page.button.classList.contains('has-auth-preview'), true);
        assert.equal(page.button.querySelector('.nav-user-initial').textContent, initial);
        assert.equal(page.button.querySelector('.nav-user-initial').children.length, 0);
    }
});


test('auth pages without a navbar still refresh the next page appearance', () => {
    const page = loadPage({ page: 'checkout-options.html' });
    assert.equal(page.button, null, 'Use the actual checkout page without a navbar');
    page.ready(user);
    assert.deepEqual(JSON.parse(page.storage.getItem('samosaman_nav_account')), { signedIn: true, initial: 'H' });
    const next = loadPage({ storage: page.storage });
    assertSignedIn(next.button);
    assertPending(next.button);
    page.ready(null);
    assert.deepEqual(JSON.parse(page.storage.getItem('samosaman_nav_account')), { signedIn: false });
    const signedOut = loadPage({ storage: page.storage });
    assert.equal(signedOut.button.classList.contains('is-signed-in'), false);
    assert.equal(signedOut.button.classList.contains('has-auth-preview'), true);
});

test('missing, whitespace, and Unicode names remain stable across pages', () => {
    const cases = [
        { displayName: null, initial: 'M' },
        { displayName: '   \t  ', initial: 'M' },
        { displayName: 'éloise Sample', initial: 'É' },
        { displayName: '😀 Cook', initial: '😀' },
    ];
    for (const { displayName, initial } of cases) {
        const page = loadPage();
        page.ready({ uid: 'test-account', displayName });
        assertSignedIn(page.button, initial);
        const next = loadPage({ storage: page.storage });
        assertSignedIn(next.button, initial);
        assertPending(next.button);
    }
});
