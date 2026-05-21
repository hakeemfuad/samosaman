# Boston & Hanover — Preserved Implementation Reference

All Boston and Hanover code removed from the active codebase for the Burlington-only MVP. Retained here so both locations can be re-integrated seamlessly when ready.

---

## branch-config.js — Boston & Hanover Entries

Add back inside the `BRANCH_CONFIG` object in `public/js/branch-config.js`:

```js
Boston: {
  lat: 42.3601,
  lng: -71.0589,
  phone: '(802)-233-7783',   // placeholder — update with real Boston number
  displayName: 'Boston, MA'
},
Hanover: {
  lat: 43.7022,
  lng: -72.2896,
  phone: '(802)-233-7783',   // placeholder — update with real Hanover number
  displayName: 'Hanover, NH'
},
```

---

## store-hours.js — Boston & Hanover Entries

Add back inside the `STORE_HOURS` object in `public/js/store-hours.js`:

```js
Boston: {
  monday:    { open: '10:00', close: '21:00', closed: false },
  tuesday:   { open: '10:00', close: '21:00', closed: false },
  wednesday: { open: '10:00', close: '21:00', closed: false },
  thursday:  { open: '10:00', close: '21:00', closed: false },
  friday:    { open: '10:00', close: '22:00', closed: false },
  saturday:  { open: '10:00', close: '22:00', closed: false },
  sunday:    { open: '10:00', close: '20:00', closed: false }
},
Hanover: {
  monday:    { open: '10:00', close: '21:00', closed: false },
  tuesday:   { open: '10:00', close: '21:00', closed: false },
  wednesday: { open: '10:00', close: '21:00', closed: false },
  thursday:  { open: '10:00', close: '21:00', closed: false },
  friday:    { open: '10:00', close: '22:00', closed: false },
  saturday:  { open: '10:00', close: '22:00', closed: false },
  sunday:    { open: '10:00', close: '20:00', closed: false }
},
```

---

## index.html — Meta & SEO

**Title / OG tags** — restore `, Boston MA, Hanover NH` suffix:
```html
<title>SamosaMan - Authentic exotic Samosas | Burlington VT, Boston MA, Hanover NH</title>
<meta name="title" content="SamosaMan - Authentic exotic Samosas | Burlington VT, Boston MA, Hanover NH">
<meta name="description" content="Craving authentic exotic samosas? SamosaMan serves crispy, flavorful samosas with delivery & pickup in Burlington VT, Boston MA, and Hanover NH. Order online now!">
<meta name="keywords" content="samosas, exotic food, Burlington VT, Boston MA, Hanover NH, food delivery, exotic restaurant, catering, authentic samosas, crispy samosas">
<meta property="og:title" content="SamosaMan - Authentic exotic Samosas | Burlington VT, Boston MA, Hanover NH">
<meta property="og:description" content="Craving authentic exotic samosas? SamosaMan serves crispy, flavorful samosas with delivery & pickup in Burlington VT, Boston MA, and Hanover NH. Order online now!">
```

**JSON-LD Schema** — restore description and address/geo blocks:
```json
"description": "Authentic exotic samosas served fresh with delivery and pickup options in Burlington VT, Boston MA, and Hanover NH.",
```
```json
{
  "@type": "PostalAddress",
  "streetAddress": "456 Mass Ave",
  "addressLocality": "Boston",
  "addressRegion": "MA",
  "postalCode": "02115",
  "addressCountry": "US"
},
{
  "@type": "PostalAddress",
  "streetAddress": "789 Hanover St",
  "addressLocality": "Hanover",
  "addressRegion": "NH",
  "postalCode": "03755",
  "addressCountry": "US"
}
```
```json
{
  "@type": "GeoCoordinates",
  "latitude": "42.3601",
  "longitude": "-71.0589"
},
{
  "@type": "GeoCoordinates",
  "latitude": "43.7022",
  "longitude": "-72.2887"
}
```

---

## catering.html — Meta & Location Dropdown

**Meta tags** — restore `, Boston MA, and Hanover NH`:
```html
<meta name="description" content="Bring authentic exotic samosas to your next event! SamosaMan offers catering services in Burlington VT, Boston MA, and Hanover NH. Request a quote today!">
<meta name="keywords" content="samosa catering, exotic food catering, event catering, party catering, Burlington VT catering, Boston MA catering, Hanover NH catering, corporate catering">
```

**Location dropdown** — add back inside the `<select id="location">`:
```html
<option value="Boston">Boston, MA</option>
<option value="Hanover">Hanover, NH</option>
```

---

## checkout.html — Branch Dropdowns

Two `<select>` dropdowns (delivery branch and pickup branch) need these options added back:
```html
<option value="Boston">Boston, MA</option>
<option value="Hanover">Hanover, NH</option>
```
- Delivery branch select: around line 393
- Pickup branch select: around line 470

---

## guest-checkout.html — Branch Dropdowns

Same as checkout.html — two dropdowns:
```html
<option value="Boston">Boston, MA</option>
<option value="Hanover">Hanover, NH</option>
```
- Delivery branch select: around line 370
- Pickup branch select: around line 447

---

## Pages to Build

When Boston and Hanover go live, create:
- `public/boston.html` — mirror of `burlington.html` with Boston branch config (`branch = 'Boston'`)
- `public/hanover.html` — mirror of `burlington.html` with Hanover branch config (`branch = 'Hanover'`)

Update `menu.html:278` to include all three locations in the location picker array:
```js
{ name: "Burlington", state: "VT", lat: 44.5063, lng: -73.1788, url: "burlington.html" },
{ name: "Boston",     state: "MA", lat: 42.3601, lng: -71.0589, url: "boston.html"     },
{ name: "Hanover",    state: "NH", lat: 43.7022, lng: -72.2896, url: "hanover.html"    }
```

Update the `reorder()` function in `myaccount.html` to map `order.branch` to the correct URL:
```js
const branchUrls = { Burlington: 'burlington.html', Boston: 'boston.html', Hanover: 'hanover.html' };
window.location.href = branchUrls[order.branch] || 'burlington.html';
```
