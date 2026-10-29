const catalog = require('./catering-menu.json');
const products = new Map(catalog.groups.flatMap(group => group.items.map(item => [item.id, { name: item.name, unit: group.unit }])));

function invalidItems() {
    return Object.assign(new Error('Select valid menu items and whole-number quantities.'), { code: 'INVALID_ORDER_ITEMS' });
}

// Older clients can omit the optional menu selection. Names and units always
// come from our catalog, never from client-supplied display text or prices.
function normalizeOrderItems(items = []) {
    if (!Array.isArray(items) || items.length > products.size) throw invalidItems();
    const seen = new Set();
    return items.map(item => {
        if (!item || !products.has(item.id) || seen.has(item.id) ||
            !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > catalog.maxQuantity) throw invalidItems();
        seen.add(item.id);
        return { id: item.id, ...products.get(item.id), quantity: item.quantity };
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function itemText(item) {
    return `${item.quantity} × ${item.name} (${item.unit}${item.quantity === 1 ? '' : 's'})`;
}

function orderItemsText(items = []) {
    return items.length ? `--- REQUESTED MENU ---\n${items.map(item => escapeHtml(itemText(item))).join('\n')}\n` : '';
}

function orderItemsHtml(items = []) {
    if (!items.length) return '';
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:24px 30px 0;font-family:Helvetica,Arial,sans-serif;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Requested menu</h2>
        <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#64748b;">
          ${items.map(item => `<li>${escapeHtml(itemText(item))}</li>`).join('')}
        </ul>
        <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#64748b;">Items and quantities are subject to confirmation by our catering team.</p>
      </td></tr>
    </table>`;
}

module.exports = { normalizeOrderItems, orderItemsText, orderItemsHtml };
