// Focused regression checks for the real shared cart entry points.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sourcePath = process.argv[2] || 'Website/public/js/cart.js';
const source = fs.readFileSync(sourcePath, 'utf8');

function harness({gutter = 8, position = 'fixed', overflow = 'auto'} = {}) {
    const body = {style: {paddingRight: '13px', overflow}};
    const navigation = {style: {paddingRight: '7px'}};
    const classes = (...initial) => {
        const values = new Set(initial);
        return {add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value)};
    };
    const overlay = {classList: classes('hidden', 'opacity-0')};
    const sidebar = {classList: classes('translate-x-full')};
    const nodes = {'open-cart-btn': {closest: () => navigation}, 'cart-overlay': overlay, 'cart-sidebar': sidebar};
    let now = 0, nextId = 0;
    const timers = new Map();
    const context = vm.createContext({
        window: {innerWidth: 1200},
        document: {
            body,
            documentElement: {get clientWidth() {return body.style.overflow === 'hidden' ? 1200 : 1200 - gutter;}},
            getElementById: id => nodes[id] || null,
            addEventListener() {}
        },
        localStorage: {getItem: () => '[]'},
        getComputedStyle: element => ({paddingRight: element.style.paddingRight, position: element === navigation ? position : 'static'}),
        setTimeout: (callback, delay) => {const id = ++nextId; timers.set(id, {callback, time: now + delay}); return id;},
        clearTimeout: id => timers.delete(id),
        console
    });
    vm.runInContext(source, context);
    const advance = milliseconds => {
        const end = now + milliseconds;
        while (true) {
            const pending = [...timers.entries()].filter(([,timer]) => timer.time <= end).sort((a,b) => a[1].time - b[1].time)[0];
            if (!pending) break;
            const [id, timer] = pending;
            now = timer.time;
            timers.delete(id);
            timer.callback();
        }
        now = end;
    };
    return {body, navigation, overlay, sidebar, advance, open: context.window.openCart, close: context.window.closeCart};
}

for (const options of [{}, {gutter: 0}, {position: 'relative'}, {gutter: 0, overflow: 'hidden'}]) {
    const h = harness(options);
    const originalBody = {...h.body.style};
    const originalNavigation = {...h.navigation.style};
    const expectedGutter = options.overflow === 'hidden' ? 0 : options.gutter ?? 8;
    for (let cycle = 0; cycle < 3; cycle++) {
        // Both existing click listeners can invoke open during one button press.
        h.open();
        h.open();
        h.advance(10);
        assert.equal(h.body.style.paddingRight, `${13 + expectedGutter}px`, 'Page lost its scrollbar compensation');
        assert.equal(h.navigation.style.paddingRight, `${7 + (options.position === 'relative' ? 0 : expectedGutter)}px`, 'Fixed header compensation is wrong');
        assert.equal(h.body.style.overflow, 'hidden');
        assert.equal(h.sidebar.classList.contains('translate-x-full'), false);
        h.close();
        h.advance(100);
        h.open();
        h.advance(400);
        assert.equal(h.body.style.overflow, 'hidden', 'An old close timer unlocked a reopened drawer');
        assert.equal(h.overlay.classList.contains('hidden'), false, 'An old close timer hid a reopened drawer');
        h.close();
        h.advance(300);
        assert.deepEqual(h.body.style, originalBody, 'Original page styles were not restored');
        assert.deepEqual(h.navigation.style, originalNavigation, 'Original header styles were not restored');
    }
    console.log(JSON.stringify({pass: true, ...options, cycles: 3, duplicateOpen: true, rapidReopen: true, originalStylesRestored: true}));
}
