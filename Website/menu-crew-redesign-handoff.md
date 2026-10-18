# Burlington Menu Redesign Handoff — Option C "Crew Table"

## Goal

Redesign `Website/public/burlington.html` (the live ordering menu) into the approved **Option C · Crew Table** design: the crew photo as a wide establishing shot, a "counter" card docked over its lower-right corner, then a fast ordering layout with a sticky category rail.

Primary goal: faster ordering. Hours, location, and categories should always be one glance or one tap away.

Secondary goal: carry the warm cream look of the redesigned homepage (`css/home.css`) onto the menu, while keeping what regulars know (Oswald dish names, 4:3 photo cards, a Best Sellers row).

## Reference files

All in `design-handoff/menu-crew/`:

- `prototype.html`: a working design prototype. Open it directly in a browser and resize below 760px to see the phone layout. It loads the real images from `../../public/assets/`. **Treat it as reference, not production code.** It builds markup in JS and uses container queries; production should be static HTML like the rest of the site.
- `reference-top.png`: the approved design, top of page (desktop and phone).
- `reference-scrolled.png`: the same, scrolled into the menu.

The design system with tokens and a brand book lives in the SamosaMan Design System artifact. The tokens needed here are copied below.

## Target page and scope

- Replace the main content of `public/burlington.html` (everything inside `<main>`).
- Keep the shared navbar injection (`#navbar-placeholder` + `js/navbar.js`) and the footer injection exactly as they are. The prototype's header is a stand-in. Do not build it.
- Keep the `<head>` SEO/OG meta, the Firebase scripts, `js/cart.js`, and `js/auth.js`.
- Keep the existing **Opening Hours modal** and its `America/New_York` hours logic (`updateHoursStatus()`, `openHoursModal()`). Point the new status line at it (see Counter card).
- Add a page stylesheet `public/css/menu.css`, scoped under a `.menu-page` body class, the same pattern as `css/home.css` / `.home-page`. Tailwind can stay loaded for the navbar, cart, and modals.
- Do not touch `checkout.html`, `cart.js` internals, the navbar, or the footer.
- Use existing assets only.

## Design tokens

Define these on `.menu-page` in `menu.css`:

```css
.menu-page {
  --paper: #f7f3ea;      /* page ground */
  --paper-tint: #efe1d5; /* segmented control track, rail hover */
  --ink: #27261f;        /* text, bag/dark surfaces */
  --ink-muted: #68645b;  /* descriptions, address */
  --line: #d9d3c7;       /* hairlines */
  --line-strong: #a69d8d;/* chip borders, closed dot */
  --orange: #b94316;     /* the action colour: Add, active category, catering CTA */
  --orange-deep: #92320e;/* hover */
  --veg: #15803d;        /* vegetarian label, open-now dot */
  --night: #000;         /* catering panel */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Oswald", "Arial Narrow", sans-serif;
  --radius-md: 8px;
  --radius-pill: 999px;
}
```

Fonts: Inter 400/500/600/700 and Oswald 500/600/700 from Google Fonts (the page currently loads only Inter 400–600 and Oswald 500/700, so update the link).

Contrast already checked: ink on paper 13.7:1 · ink-muted on paper 5.3:1 · white on orange 5.4:1 · veg on paper 4.5:1 (keep the word "Vegetarian" with it, never colour alone).

## Page structure

Breakpoint: **768px** (`md`). The prototype switches at 760px; use 768 to match Tailwind `md:`. Mobile-first.

The fixed navbar is `h-20` (80px), so `<main>` keeps `pt-20`. All sticky offsets below account for it.

### 1. Hero photo

- `assets/menu-team-hero.webp`, 2400×1600, `loading="eager" fetchpriority="high"`, alt: "The SamosaMan crew crowding around a handful of golden samosas".
- Phone: full width, `aspect-ratio: 3/2`, `object-fit: cover`, `object-position: 46% 30%`.
- Desktop: full width, `height: clamp(480px, 42vw, 640px)`, `object-position: 50% 18%`. The height scales with the screen so wide screens don't crop off the crew's heads; check 1024, 1440 and 1920.
- Desktop only: a small caption pill at the bottom-left (`left: 32px; bottom: 16px`), "The crew, Burlington VT", 12px white text on `rgba(0,0,0,.55)`, radius pill, padding 6px 12px. Hidden on phones.
- Keep type off the lower centre of the photo. That's where the samosa hand-off is.

### 2. Counter card

A card that overlaps the photo.

- Phone: in flow, `margin: -28px 12px 0`, `position: relative; z-index: 2`.
- Desktop: `position: absolute; right: 32px; bottom: -64px; width: 400px`. Anchor it **right** so it never covers the samosas at the photo's centre-left.
- Style: `--paper` background, 1px `--line` border, `radius-md`, `box-shadow: 0 10px 30px rgba(39,38,31,.12)`, padding 20px 18px on phones and 28px on desktop.
- Contents:
  1. `<h1>` "Burlington Menu": Oswald 700, uppercase, 36px phone / 44px desktop, line-height 1.05, letter-spacing -0.01em.
  2. Address "100 Church St, Burlington, VT 05401": 14px, `--ink-muted`, margin-top 10px.
  3. Status line: an 8px dot plus text, 14px/500, `--ink`. Dot is `--veg` when open and `--line-strong` when closed. **Reuse `#hours-status-text`** and the existing `updateHoursStatus()`. Make the line a button that calls `openHoursModal()`. Prototype copy: "Open now · until 9 PM" / "Closed · opens tomorrow at 10 AM".
  4. Pickup / Delivery segmented control: margin-top 16px, track `--paper-tint`, padding 4px, radius pill, two 40px buttons. The selected button gets a white fill and `box-shadow: 0 1px 3px rgba(39,38,31,.15)`. Use `aria-pressed`.
     - **Behaviour:** order type is chosen at checkout (`input[name="orderType"]` in `sq-payment.js`), and `delivery.html` is currently a waitlist page. So this control only saves a preference to `localStorage` key `samosaman_order_type` (`"pickup"` / `"delivery"`, default pickup). Wrap storage calls in try/catch. Do not change checkout in this pass. Note it as a follow-up to pre-select from that key.

### 3. Body layout

- Phone: one column. A sticky **chip row** for categories, then the sections.
- Desktop: `display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 40px; padding: 96px 32px 24px; align-items: start;`. The 96px top clears the overlapping counter card. Max width ~1400px centred, matching the navbar's `max-w-[1400px]`.

### 4. Category navigation

Categories, with counts: Best Sellers (5) · Meat Samosas (3) · Vegetarian Samosas (4) · Meals (2).

- **Phone, sticky chip row:** `position: sticky; top: 80px` (under the navbar), `--paper` background, bottom hairline, padding 12px 16px, horizontal scroll with the scrollbar hidden. Chips are 36px tall, 14px horizontal padding, pill, 1px `--line-strong` border, 13px/500, with the count in 11px `--ink-muted`. The active chip is `--orange` fill and border with white text.
- **Desktop, sticky left rail:** `position: sticky; top: 104px` (navbar 80 + 24). Vertical list, 2px gap. Items are full-width 44px buttons with radius-md, 14px text, count right-aligned, no border. Hover uses `--paper-tint`; active is `--orange` fill with white text.
- Under the rail (desktop only), a hairline and then an info block at 13px/1.6 `--ink-muted`:
  - "HOURS" label (11px/600, letter-spacing .12em, uppercase, `--ink`), then a 2-column list: Mon – Thu 10 AM – 9 PM · Fri – Sat 10 AM – 10 PM · Sunday 10 AM – 8 PM. Values are right-aligned in `--ink`. **Render these from the same hours config the status logic uses**, not hard-coded twice.
  - "CALL" label, then `<a href="tel:8028817607">(802) 881-7607</a>`.
- Clicking a category smooth-scrolls to its section, offset by the sticky heights (navbar 80, plus the chip row on phones). Use `scroll-margin-top` on sections rather than JS math where possible.
- **Add scroll-spy (not in the prototype):** an `IntersectionObserver` updates the active chip/rail item as the user scrolls. Use `aria-current="true"` on the active item.
- Respect `prefers-reduced-motion` (no smooth scroll).

### 5. Section headers

`h2` in Oswald 700, uppercase, 26px phone / 30px desktop, letter-spacing .025em, then a flexible 1px `--line` rule filling the rest of the row (`display:flex; align-items:center; gap:16px`). Margin-bottom 18px. Section padding-top 32px (the first section on desktop has 0).

### 6. Best Sellers carousel

Order: Chicken Curry, Punjabi, Steak & Cheese, Spicy Chicken, Chicken & Cheese.

Horizontal scroll with `scroll-snap-type: x mandatory`. Cards are 70% wide on phones (bleeding to the screen edge) and `calc((100% - 24px) / 3)` on desktop, with a 12px gap. Keep the "Scroll →" hint from the current page only if it helps on desktop.

### 7. Menu card (all sections)

- Grid: 2 columns on phones (gap 24px 12px), 3 columns on desktop (gap 32px 20px).
- **The card root must keep the `group` class and contain the `<img>`.** `cart.js` finds the cart thumbnail with `btn.closest('.group').querySelector('img')`.
- Image well: radius-md, overflow hidden, `--ink` background, image `aspect-ratio: 4/3; object-fit: cover`. On hover, scale the image 1.04 over 400ms.
- Vegetarian flag (vegetarian items only): top-left at 8px, pill, `--paper` background, `--veg` text, 10px/600, letter-spacing .08em, uppercase, "Vegetarian".
- Name: Oswald 700, uppercase, 18px, line-height 1.2, margin 12px 0 4px.
- Description: 13px/1.55, `--ink-muted`, clamped to 2 lines with a `min-height` of 2 lines so the rows align.
- Footer row: price at 14px/700 (always two decimals), and the **Add** button: 34px tall pill, `--orange` with white 13px/500 text, a plus icon, the label "Add", and hover `--orange-deep`.
- Add button attributes (unchanged contract): `class="add-to-bag-btn …" data-id data-name data-price aria-label="Add {name} to bag"`. Optional: after adding, flash a check icon for ~700ms (the prototype does this).

Items and their exact `data-*` values (from the current page):

| Section | Card name | data-id | data-name | price | image |
| --- | --- | --- | --- | --- | --- |
| Meat | Steak & Cheese | steak-cheese | Steak & Cheese Samosa | 3.75 | samosas/steakandcheese.webp |
| Meat | Chicken & Cheese | chicken-cheese | Chicken & Cheese Samosa | 3.75 | samosas/chicken_cheese3.webp |
| Meat | Spicy Chicken | spicy-chicken | Spicy Chicken Samosa | 3.75 | samosas/spicy_chicken2.webp |
| Veg | Spicy Potato | spicy-potato | Spicy Potato Samosa | 3.75 | samosas/spicy_potato_samosa.webp |
| Veg | Punjabi | punjabi-samosa | Traditional Punjabi Samosa | 3.75 | samosas/traditional_punjabi_samosa.webp |
| Veg | Vegetarian | veggie-samosa | Vegetarian Samosa | 3.75 | samosas/veggie_samosa3.webp |
| Veg | Apple Pie | apple-samosa | Apple Pie Samosa | 3.75 | samosas/apple_samosa3.webp |
| Meals | Chicken Curry | chicken-curry-meal | Chicken Curry Meal | 13.95 | chicken_curry.webp |
| Meals | Chickpea Masala | chickpea-masala | Chickpea Masala | 12.95 | chickpea_masala.webp |

Keep the current descriptions word for word.

### 8. Catering panel

After the menu: phone margin 48px 16px 0, desktop 64px 32px 0. Radius-md, overflow hidden, `--night` background, white text.

- Phone: image on top (16:9), copy below at padding 24px 20px 28px.
- Desktop: 2 columns. Image fills the left half (min-height 260px), copy is vertically centred on the right with 40px padding.
- Image: `samosas/traditional_punjabi_samosa.webp`, `object-position: 48% 32%`, opacity .9.
- Copy (from the homepage): h2 "Samosas are best shared." Inter 600, 28px phone / 40px desktop, letter-spacing -0.045em. Then p "Bring the crunch. Feed the crowd." at 15px in `--line`. Then the pill CTA "Plan your catering" → `catering.html` (min-height 48px, `--orange`).

### 9. Phone bag bar (optional, recommended)

On phones only, once the bag has items: a sticky bottom bar (`bottom: 16px`, margin 0 16px 16px, 52px tall, pill, `--ink` background, `--paper` text) reading "View bag · N items" with the total. Tapping it calls the existing `openCart()`. Drive it from the cart state `cart.js` already keeps. Hide it at md and up.

## Remove from the current page

- The current full-height hero image block and the slate "Burlington Menu" heading/meta row. These are replaced by sections 1–2.
- The duplicate Best Sellers / category headings in red, slate, green, and orange. Category colour now comes only from the active nav state.
- Slate Tailwind colours in the menu area (`text-slate-*`, `bg-slate-50`). Use the tokens.
- `unpkg.com/lucide@latest`: pin a version or inline the two icons used (plus, arrow) as SVG.

## Motion

Keep it minimal. The image hover scale and colour transitions are 160–400ms. The existing `reveal-on-scroll` fade can stay on cards. No parallax. Everything is off under `prefers-reduced-motion`.

## Acceptance criteria

- Reads well at 375px and 430px; no horizontal page scroll. The Best Sellers carousel scrolls inside itself only.
- The counter card never covers the samosa hand-off in the photo at 768–1440px widths.
- Sticky chip row (phone) and rail (desktop) sit under the fixed navbar with no overlap or gap.
- Every Add button adds the right item, name, price, **and thumbnail** to the cart drawer. Test all 9 items.
- The status line shows the correct open/closed state and opens the existing hours modal.
- Pickup/Delivery persists across reloads via `samosaman_order_type`.
- Scroll-spy highlights the section in view; category taps land with the header fully visible.
- Keyboard: every control is reachable, with a visible 2px `--orange` focus ring. Touch targets are ≥ 34px.
- Lighthouse accessibility ≥ 95; hero image is not lazy-loaded; other images are lazy.

## Suggested implementation order

1. Add `css/menu.css` with tokens and the `.menu-page` class; update the font link.
2. Build sections 1–2 (photo and counter card) and wire the status line to the existing hours logic.
3. Build the body grid, chip row, and rail, with jump links.
4. Rebuild the menu cards in static HTML with the exact `data-*` attributes; verify the cart drawer.
5. Best Sellers carousel, then the catering panel.
6. Scroll-spy, the Pickup/Delivery preference, and the phone bag bar.
7. Test at 375 / 430 / 768 / 1024 / 1440. Compare against `reference-top.png` and `reference-scrolled.png`.
