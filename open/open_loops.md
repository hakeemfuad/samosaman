                                #### WHAT IS OPEN LOOPS #####
Single source of truth for ongoing loops that need to be closed asap, intermediately, or in the future.

#### DUE MAY 3RD
Have MVP website ready to post
 [] Connect GoDaddy POS — embedded Poynt Collect checkout wired; pending live credentials + Firebase deploy
 [] Rewards system functional
 [x] No traces of Hanover or Boston
 [] Remove all dead links

Finalize embedded GoDaddy / Poynt checkout
 [] Obtain live GoDaddy / Poynt values: `GODADDY_BUSINESS_ID`, `GODADDY_APPLICATION_ID`, `GODADDY_PAYMENTS_STORE_ID`, `GODADDY_PAYMENTS_ACCESS_TOKEN`
 [] Replace the short-lived `GODADDY_PAYMENTS_ACCESS_TOKEN` secret with a real server-side token generation / refresh flow from app credentials
 [] Set Firebase secrets and deploy updated `functions` + `hosting`
 [] Run one live end-to-end payment test: iframe loads, nonce returns, charge succeeds, order saves in Firestore, customer / restaurant emails send
 [] Upgrade Cloud Functions runtime from Node 20 to Node 22 before the next deploy

#### High Priority

### GoDaddy Payments Credentials and Deploy Needed
Checkout now uses embedded Poynt Collect on the site and charges the returned nonce through Firebase, but the live Firebase secrets still need to be set and deployed.
- `functions/index.js` — `getGoDaddyCollectConfig` expects `GODADDY_BUSINESS_ID` and `GODADDY_APPLICATION_ID`
- `functions/index.js` — `processGoDaddyPayment` expects `GODADDY_PAYMENTS_ACCESS_TOKEN`, `GODADDY_PAYMENTS_STORE_ID`, and `GODADDY_BUSINESS_ID`
- `public/js/godaddy-payment.js` — mounts the GoDaddy iframe on the checkout page and submits the nonce to the backend
- Deploy after setting secrets: `firebase deploy --only functions --project samosaman-6895e`

### Boston and Hanover Location Pages Don't Exist
The site lists three locations everywhere (meta, JSON-LD, dropdowns, footer) but only `burlington.html` exists. No `boston.html` or `hanover.html` have been built.
- `public/catering.html:120-121` — Boston/Hanover selectable in catering form
- `public/checkout.html:393-394`, `public/guest-checkout.html:370-371` — Boston/Hanover in branch dropdowns
- `public/menu.html:278` — only Burlington mapped as a selectable location
- `public/index.html:611-638` — JSON-LD schema lists all three with hardcoded addresses
- Note: existing `open_loops.md` item "No traces of Hanover or Boston" — removing references is the interim fix until pages are built

### Firestore Rules Don't Cover the `orders` Collection
Current rules only cover `users/{userId}` and subcollections. The `orders` collection has no client-side read rule. `loadOrderHistory()` on `myaccount.html` will be rejected with permission-denied for all real users.
- Fix: add `match /orders/{orderId} { allow read: if request.auth != null && resource.data.uid == request.auth.uid; }`

### Firestore Rules Not Tracked in the Project
Rules were updated directly in the Firebase console and are not committed as `firestore.rules`. There is no `"firestore"` section in `firebase.json` — rules are invisible to version control.
- `Website/firebase.json` — missing `"firestore": { "rules": "firestore.rules" }` entry
- Fix: create `firestore.rules`, update `firebase.json`, deploy with `firebase deploy --only firestore:rules`

### Reorder Always Redirects to Burlington
`reorder()` on `myaccount.html` loads previous order items into the cart then always navigates to `burlington.html`, ignoring the original order's branch.
- `public/myaccount.html:594` — `window.location.href = 'burlington.html'` hardcoded
- Fix: read `order.branch` from Firestore and route to the correct page

### Node.js 20 Cloud Functions — Deadline Approaching
Functions run on Node.js 20. Deprecation is **2026-04-30**, decommission is **2026-10-30** — deploys will be blocked after that.
- Upgrade `functions/package.json` engines to Node.js 22 before April 30

---

#### Medium Priority

### "Our Story" Navbar Chevron Has No Dropdown
"Our Story" renders with a `chevron-down` icon implying a submenu, but clicking it navigates directly to `our-story.html`. Either build the dropdown or remove the chevron.
- `public/js/navbar.js:25-28`

### `rewards.html` Exchange Carousel Is Non-Functional
`rewards.html` has a "View Rewards Exchange" button and a `data-rewards-exchange` container but never loads `rewards-config.js` or `rewards-ui.js`. The carousel never mounts.
- Fix: either add the missing script tags or redirect `rewards.html` → `myaccount.html`

### `rewards.html` Points History Modal Is Static
The history modal on `rewards.html` renders hardcoded markup (one "Welcome Bonus +100 pts" entry, static "No other recent activity" line). It doesn't query Firestore. `myaccount.html` has the correct dynamic implementation.
- `public/rewards.html:156-167`
- Fix: port `loadPointsHistory()` from `myaccount.html`

### Welcome Email Has Dead "Explore in Detail" Links
Two sections of the welcome email render underlined "Explore in detail" as `<span>` elements — not `<a>` tags. Clicking them does nothing.
- `functions/index.js` — welcome email HTML, Chickpea Masala and "Smile-inducing" sections

### `alert()` Used for Errors
Native browser `alert()` is used in two places — visually inconsistent and blocked on some browsers.
- `public/js/rewards-ui.js:339` — reward add-to-cart failure
- `public/myaccount.html:584` — reorder "Order not found"
- Fix: replace with styled inline error messages or a toast


---

#### Back Burner


### Google Maps API Key Exposed in Client-Side JS
The Maps Geocoding key is hardcoded in `branch-config.js` and shipped to all visitors. Without an HTTP referrer restriction it can be scraped and abused.
- `public/js/branch-config.js:26`
- Fix: lock the key to `samosamanvt.com/*` in Google Cloud Console → Credentials
