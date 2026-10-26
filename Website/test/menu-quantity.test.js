const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cartScript = fs.readFileSync(path.join(__dirname, '../public/js/cart.js'), 'utf8');

function setup(saved = []) {
    let storage = JSON.stringify(saved);
    let writes = 0;
    const listeners = {};
    const context = vm.createContext({
        window: {},
        document: {getElementById: () => null, addEventListener: (event, callback) => { listeners[event] = callback; }},
        localStorage: {getItem: () => storage, setItem: (key, value) => { storage = value; writes++; }},
    });
    vm.runInContext(cartScript, context);
    return {context, listeners, cart: () => JSON.parse(storage), writes: () => writes};
}

test('existing callers still add one item and persist it once', () => {
    const app = setup();
    assert.equal(app.context.window.addToCart('spicy-chicken', 'Spicy Chicken', 4.75, 'chicken.webp'), true);
    assert.deepEqual(app.cart(), [{id:'spicy-chicken', name:'Spicy Chicken', price:4.75, quantity:1, image:'chicken.webp'}]);
    assert.equal(app.writes(), 1);
});

test('a selected quantity merges into the saved cart without a duplicate item', () => {
    const app = setup([{id:'spicy-chicken', name:'Spicy Chicken', price:4.75, quantity:2, image:'chicken.webp'}]);
    app.context.window.addToCart('spicy-chicken', 'Spicy Chicken', 4.75, 'chicken.webp', 3);
    assert.equal(app.cart().length, 1);
    assert.equal(app.cart()[0].quantity, 5);
    assert.equal(app.writes(), 1);
});

test('meal quantities retain their price and unrelated cart entries', () => {
    const reward = {id:'reward-1', name:'Reward', price:0, quantity:1, isReward:true};
    const app = setup([reward]);
    app.context.window.addToCart('chicken-curry', 'Chicken Curry', '13.95', 'meal.webp', 4);
    assert.deepEqual(app.cart()[0], reward);
    assert.equal(app.cart()[1].price * app.cart()[1].quantity, 55.8);
});

test('invalid quantities cannot change stored cart data', () => {
    for (const value of [0, -1, 1.5, 100, NaN, Infinity, '2', null]) {
        const app = setup();
        assert.equal(app.context.window.addToCart('spicy-chicken', 'Spicy Chicken', 4.75, 'chicken.webp', value), false);
        assert.deepEqual(app.cart(), []);
        assert.equal(app.writes(), 0);
    }
});

test('menu card Add opens the quantity step without writing until confirmed', () => {
    const app = setup();
    let click;
    let requested;
    const button = {
        dataset: {id:'spicy-chicken', name:'Spicy Chicken', price:'4.75'},
        closest: () => ({querySelector: () => ({getAttribute: () => 'chicken.webp'})}),
        addEventListener: (event, callback) => {click = callback;},
    };
    app.context.document.querySelectorAll = () => [button];
    app.context.window.SamosamanMenu = {selectQuantity: (...args) => {requested = args;}};
    vm.runInContext('injectOrderTypeModal = () => {};', app.context);
    app.listeners.DOMContentLoaded();
    click({stopPropagation(){}, preventDefault(){}});
    assert.deepEqual(requested, ['spicy-chicken', 'Spicy Chicken', '4.75', 'chicken.webp', button]);
    assert.equal(app.writes(), 0);
    delete app.context.window.SamosamanMenu;
    click({stopPropagation(){}, preventDefault(){}});
    assert.equal(app.cart()[0].quantity, 1);
});
