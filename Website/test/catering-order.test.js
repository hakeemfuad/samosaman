const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const order = require('../functions/catering-order');
const catalog = require('../functions/catering-menu.json');

function setup() {
    const saved = [];
    const messages = [];
    const register = (_options, handler) => handler;
    const sandbox = {
        exports: {},
        console,
        require(name) {
            if (name === './catering-order') return order;
            if (name === 'firebase-functions/v2/https') return { onRequest: register };
            if (name === 'firebase-functions/v2/firestore') return { onDocumentCreated: register };
            if (name === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'test-only' }) };
            if (name === 'firebase-functions/logger') return { info() {}, error() {}, warn() {} };
            if (name === 'crypto') return require('node:crypto');
            if (name === 'cors') return () => (_req, _res, next) => next();
            if (name === 'firebase-admin/app') return { getApps: () => [{}] };
            if (name === 'firebase-admin/firestore') return {
                FieldValue: { serverTimestamp: () => 'test-timestamp' },
                getFirestore: () => ({ collection: collection => ({ doc: id => ({ async set(data) { saved.push({ collection, id, data }); } }) }) })
            };
            if (name === 'nodemailer') return { createTransport: () => ({ async sendMail(message) { messages.push(message); } }) };
            throw new Error(`Unexpected dependency: ${name}`);
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8'), sandbox);
    return {
        saved, messages,
        submit(body) {
            return new Promise((resolve, reject) => {
                const response = {
                    statusCode: 200,
                    status(code) { this.statusCode = code; return this; },
                    json(data) { resolve({ status: this.statusCode, data }); },
                    send(data) { resolve({ status: this.statusCode, data }); }
                };
                sandbox.exports.submitCateringInquiry({ method: 'POST', body }, response).catch(reject);
            });
        }
    };
}

const inquiry = {
    location: 'Burlington', fullName: 'Test Guest', phone: '8025550100', email: 'test@example.invalid',
    eventDate: '2026-12-01', eventTime: '12:30 PM', serviceType: 'pickup',
    address: '100 Church St', city: 'Burlington', state: 'VT',
    comments: 'Please discuss the menu with us.',
    orderItems: [{id:'steak-cheese',quantity:50}]
};

test('the browser catalog matches the server catalog and all image files exist', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/catering-menu.js'), 'utf8'), context);
    assert.deepEqual(JSON.parse(JSON.stringify(context.window.SamosamanCateringMenu)), catalog);
    for (const group of catalog.groups) for (const item of group.items) {
        assert(fs.existsSync(path.join(__dirname, '../public', item.image)), item.image);
    }
});

test('submitted names and prices cannot replace catalog data', () => {
    assert.deepEqual(order.normalizeOrderItems([{ id: 'chicken-curry-meal', quantity: 20, name: '<img src=x>', price: 0 }]), [
        { id: 'chicken-curry-meal', name: 'Chicken Curry', unit: 'meal', quantity: 20 }
    ]);
});

test('invalid, duplicate, or unknown items are rejected', () => {
    const invalid = [null, {}, 'chicken-curry-meal', [null], [{id:'unknown', quantity:1}],
        [{id:'__proto__', quantity:1}], [{id:'steak-cheese', quantity:1}, {id:'steak-cheese', quantity:2}],
        [{id:'steak-cheese'}],
        ...[0, -1, 1.5, '2', null, NaN, Infinity, 10000].map(quantity => [{id:'chickpea-masala', quantity}])];
    for (const items of invalid) assert.throws(() => order.normalizeOrderItems(items), {code:'INVALID_ORDER_ITEMS'});
    assert.equal(order.normalizeOrderItems([{id:'chickpea-masala', quantity:9999}])[0].quantity, 9999);
});

test('selected items reach Firestore and both emails with catalog names and units', async () => {
    const app = setup();
    const result = await app.submit({...inquiry, orderItems:[
        {id:'steak-cheese',quantity:50}, {id:'chicken-curry-meal',quantity:20}, {id:'chickpea-masala',quantity:10}
    ]});
    assert.equal(result.status, 200);
    assert.equal(app.saved.length, 1);
    assert.equal(app.saved[0].collection, 'catering_inquiries');
    assert.deepEqual(app.saved[0].data.orderItems, [
        {id:'steak-cheese',name:'Steak & Cheese',unit:'samosa',quantity:50},
        {id:'chicken-curry-meal',name:'Chicken Curry',unit:'meal',quantity:20},
        {id:'chickpea-masala',name:'Chickpea Masala',unit:'meal',quantity:10}
    ]);
    assert.equal(app.saved[0].data.comments, inquiry.comments);
    assert.equal(app.messages.length, 2);
    for (const message of app.messages) {
        assert.match(message.html, /50 × Steak &amp; Cheese \(samosas\)/);
        assert.match(message.html, /20 × Chicken Curry \(meals\)/);
        assert.match(message.html, /10 × Chickpea Masala \(meals\)/);
    }
});

test('invalid selection returns 400 before any write or email', async () => {
    const app = setup();
    const result = await app.submit({...inquiry, orderItems:[{id:'chickpea-masala',quantity:0}]});
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'INVALID_ORDER_ITEMS');
    assert.equal(app.saved.length, 0);
    assert.equal(app.messages.length, 0);
});

test('meal selections without quantities reach Firestore and both emails', async () => {
    const app = setup();
    const result = await app.submit({...inquiry, orderItems:[{id:'chicken-curry-meal'}, {id:'chickpea-masala'}]});
    assert.equal(result.status, 200);
    assert.deepEqual(app.saved[0].data.orderItems, [
        {id:'chicken-curry-meal',name:'Chicken Curry',unit:'meal'},
        {id:'chickpea-masala',name:'Chickpea Masala',unit:'meal'}
    ]);
    assert.equal(app.messages.length, 2);
    for (const message of app.messages) {
        assert.match(message.html, /Chicken Curry \(meal\)/);
        assert.match(message.html, /Chickpea Masala \(meal\)/);
        assert.doesNotMatch(message.html, /(?:undefined|NaN|1) × (?:Chicken Curry|Chickpea Masala)/);
    }
});

test('an inquiry requires at least one menu item before any write or email', async () => {
    for (const orderItems of [undefined, []]) {
        const app = setup();
        const result = await app.submit({...inquiry, orderItems});
        assert.equal(result.status, 400);
        assert.equal(result.data.code, 'INVALID_ORDER_ITEMS');
        assert.equal(app.saved.length, 0);
        assert.equal(app.messages.length, 0);
    }
});

test('missing or blank required fields are rejected before any write or email', async () => {
    for (const field of ['fullName', 'phone', 'email', 'eventDate', 'eventTime', 'serviceType', 'address', 'city', 'state']) {
        for (const value of [undefined, '', '   ']) {
            const app = setup();
            const result = await app.submit({...inquiry, [field]: value});
            assert.equal(result.status, 400, field);
            assert.equal(result.data.code, 'MISSING_REQUIRED_FIELDS', field);
            assert(result.data.fields.includes(field), field);
            assert.equal(app.saved.length, 0);
            assert.equal(app.messages.length, 0);
        }
    }
});

test('special requests can be omitted, empty, or blank', async () => {
    for (const comments of [undefined, '', '   ']) {
        const app = setup();
        const body = { ...inquiry, comments };
        if (comments === undefined) delete body.comments;
        const result = await app.submit(body);
        assert.equal(result.status, 200);
        assert.equal(app.saved.length, 1);
        assert.equal(app.saved[0].data.comments, '');
        assert.equal(app.messages.length, 2);
        assert.doesNotMatch(app.messages[1].html, /--- COMMENTS ---/);
    }
});

test('non-text special requests are rejected before any write or email', async () => {
    for (const comments of [null, false, 0, [], {}]) {
        const app = setup();
        const result = await app.submit({ ...inquiry, comments });
        assert.equal(result.status, 400);
        assert.equal(result.data.code, 'INVALID_COMMENTS');
        assert.equal(app.saved.length, 0);
        assert.equal(app.messages.length, 0);
    }
});

test('an unknown service type is rejected before any write or email', async () => {
    const app = setup();
    const result = await app.submit({...inquiry, serviceType:'other'});
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'INVALID_SERVICE_TYPE');
    assert.equal(app.saved.length, 0);
    assert.equal(app.messages.length, 0);
});

test('an inquiry without a guest count is saved and emails do not show a missing count', async () => {
    const app = setup();
    const result = await app.submit(inquiry);
    assert.equal(result.status, 200);
    assert.equal(app.saved[0].data.numberOfGuests, undefined);
    assert.equal(app.saved[0].data.eventAddress, inquiry.address);
    assert.equal(app.messages.length, 2);
    for (const message of app.messages) {
        assert.doesNotMatch(message.subject, /guests/i);
        assert.doesNotMatch(message.html, /Guests:|Guests &amp; Service|(?:0|TBD|undefined) guests/);
    }
});

test('guest counts supplied by older clients are retained', async () => {
    const app = setup();
    const result = await app.submit({...inquiry, guests:'45'});
    assert.equal(result.status, 200);
    assert.equal(app.saved[0].data.numberOfGuests, 45);
    assert.match(app.messages[1].subject, /45 guests/);
});

test('order email fragments escape HTML in display values', () => {
    const items = [{name:'<script>bad</script>',unit:'meal',quantity:2}];
    for (const rendered of [order.orderItemsHtml(items), order.orderItemsText(items)]) {
        assert.doesNotMatch(rendered, /<script>/);
        assert.match(rendered, /&lt;script&gt;/);
    }
});
