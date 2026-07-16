# Payment Server Catalog Change

Date: June 28, 2026

## Summary

The payment function no longer trusts menu item prices sent by the browser.

Before this change, `processPayment` normalized the submitted cart and checked that the submitted subtotal matched the submitted item prices. That protected subtotal arithmetic, but a modified browser payload could still lower an item's `price` and make the math internally consistent.

Now the server owns the order catalog. Checkout submits stable menu item IDs and quantities, and the Firebase function looks up names and prices from a server-controlled catalog before calculating:

- subtotal
- scheduled order discount
- tax
- final total
- Square charge amount
- loyalty points earned
- stored order item names/prices
- DoorDash order values/items

## Files Changed

```text
Website/functions/index.js
Website/public/js/sq-payment.js
Website/public/checkout.html
Website/public/guest-checkout.html
```

## Backend Changes

`Website/functions/index.js` now includes `MENU_CATALOG_BY_BRANCH`, currently scoped to the live Burlington menu.

The payment handler now:

- normalizes the submitted branch and order type
- rejects unknown branch/menu IDs
- rebuilds paid cart lines from the server catalog
- rebuilds reward cart lines from the server reward catalog
- recalculates subtotal from catalog prices
- recalculates the scheduled order discount server-side
- recalculates tax and total server-side
- uses the recalculated total for the Square payment amount
- stores server-normalized item names and prices in Firestore

The client-submitted `subtotal`, `discount`, `tax`, and `amount` are still accepted, but only as consistency checks. If they do not match server calculations within the existing tolerance, checkout fails before charging.

## Frontend Changes

`Website/public/js/sq-payment.js` now sends a slimmer cart payload:

```js
{
  id,
  quantity,
  isReward,
  reward: {
    id,
    itemId
  }
}
```

The browser still keeps prices and names in local storage for cart display and Square card verification UX, but those fields are not sent as authoritative payment data.

`checkout.html` and `guest-checkout.html` were also tightened so the closed-store scheduler writes the selected time to the currently selected fulfillment type. This keeps pickup and delivery scheduled discounts aligned with the server-side discount validation.

## Expected Security Behavior

These tampering attempts should now fail:

- lowering an item price in `localStorage`
- changing an item name in `localStorage`
- posting an unknown menu item ID
- increasing the submitted discount
- changing submitted tax or total without matching server catalog math

These fields remain legitimate user input:

- item IDs
- item quantities
- reward selection metadata
- tip amount
- pickup/delivery details
- customer contact details

## Testing

Run local syntax and whitespace checks:

```sh
node --check Website/functions/index.js
node --check Website/public/js/sq-payment.js
git diff --check -- Website/functions/index.js Website/public/js/sq-payment.js Website/public/checkout.html Website/public/guest-checkout.html
```

Compile inline checkout scripts:

```sh
node -e 'const fs=require("fs"),vm=require("vm"); for (const f of ["Website/public/checkout.html","Website/public/guest-checkout.html"]) { const html=fs.readFileSync(f,"utf8"); const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m,i=0; while ((m=re.exec(html))) { i += 1; new vm.Script(m[1], { filename: `${f}#script${i}` }); } console.log(`${f}: inline scripts ok (${i})`); }'
```

### Sandbox Checkout Test

The checkout JavaScript points at deployed Cloud Functions unless temporarily changed to an emulator URL. Deploy the updated function or point `CLOUD_FUNCTIONS_BASE_URL` at the local emulator before doing an end-to-end browser test.

Open checkout in sandbox mode:

```text
checkout.html?checkoutEnv=sandbox
```

Place a normal order with a Square sandbox test card.

Expected result:

- payment succeeds
- Firestore order contains catalog item names/prices
- subtotal, discount, tax, and total match server catalog math

### Tamper Test

Before submitting checkout, modify the cart in DevTools:

```js
const cart = JSON.parse(localStorage.getItem('samosaman_cart'));
cart[0].price = 0.01;
cart[0].name = 'Tampered Item';
localStorage.setItem('samosaman_cart', JSON.stringify(cart));
```

Submit checkout.

Expected result:

```text
Order subtotal does not match cart items.
```

Also test request payload tampering in the Network tab:

```text
items[0].id = "unknown-item"
discount = "999.00"
tax = "0.00"
amount = "0.01"
```

Expected failures:

```text
Cart contains an unavailable menu item.
Order discount does not match checkout details.
Order total does not match cart items.
```

## Deployment Notes

Deploy the updated Firebase functions before relying on this protection in production:

```sh
firebase deploy --only functions --project samosaman-6895e
```

If hosting changes are deployed separately, deploy the checkout JavaScript and HTML as well:

```sh
firebase deploy --only hosting --project samosaman-6895e
```

## Follow-Ups

- Add Boston/Hanover branch catalogs when those ordering pages are active.
- Add unit tests around cart normalization and total recalculation.
- Consider moving the catalog to Firestore or another managed admin surface once menu edits need to happen without function deploys.
