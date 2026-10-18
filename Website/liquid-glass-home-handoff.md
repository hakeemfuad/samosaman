# Homepage Liquid Glass Handoff — Qloset iOS glass language on samosamanvt.com

## Prompt (paste into Claude Code from the `Website/` folder)

> Implement the liquid glass homepage redesign described in `liquid-glass-home-handoff.md`. Read the whole spec first, then open `design-handoff/liquid-glass-home/prototype.html` in a browser and compare against the three `reference-*.png` files. Work in the order under "Suggested implementation order", keep every element ID listed under "IDs that must survive", and don't touch the files listed as out of scope. When done, check every item under "Acceptance criteria" at 1440px, 820px and 390px wide, and list anything you couldn't match.

## Goal

Refactor the homepage (`public/index.html`) into the approved **liquid glass** design, which brings over the design language of Qloset's iOS app (`Qloset/lib/widgets/profile/glass_surfaces.dart`, `glass_list_surfaces.dart`, `liquid_add_card.dart`):

- Floating, frosted glass controls, lit from the top edge, that sit **over photography**.
- On the cream page, controls switch to **ink** (solid black) or **paper** (5% ink tint). Qloset's rule: "glass over paper is normally the one thing this design system avoids."
- Springy press feedback, with sheets and drawers that float in instead of sliding in from the screen edge.

The content, copy, photos and section order stay the same as today. "Meet the crew" stays exactly as it is now.

## Reference files

All in `design-handoff/liquid-glass-home/`:

- `prototype.html`: a working, responsive prototype. Open it directly in a browser and resize below 980px and below 640px. It loads the real images from `../../public/assets/`. **Treat it as reference, not production code.** It is one standalone file; production should split CSS into `css/home.css` and wiring into the existing JS files. Anything marked `PROTOTYPE-ONLY` must not ship.
- `reference-desktop.png`: the full page at 1440px.
- `reference-phone.png`: the phone at 390px: top of page, menu open, and the pickup/delivery sheet.
- `reference-states.png`: desktop "See inside" with a part selected, and the pickup/delivery sheet.

New asset: `public/assets/samosaman-wordmark.webp`. It's the logo from `assets/yellow_heart.png` cropped to its edges (960×423). The original PNG has about 40% empty margin, which makes it tiny inside a 64px glass bar.

## Scope

- **`public/index.html`**: replace everything inside `<main>` with the new markup. Keep the `<head>` (SEO/OG meta, gtag, Firebase, `cart.js`, `auth.js`, the structured data), the auth modal and the footer placeholder.
- **`public/css/home.css`**: restyle. It stays scoped under `.home-page`.
- **`public/js/navbar.js`**: new glass nav markup (see "Nav" below). The navbar is shared by 10 pages, so **ship the glass nav for `body.home-page` only** and leave the current nav on every other page. Rolling it out site-wide is a follow-up decision.
- **`public/js/home.js`**: update the menu accessibility observer for the new dropdown. Add the scroll-condense behavior and the order sheet.
- **`public/js/samosa-diagram.js` + `css/samosa-diagram.css`**: restyle the hotspots and the toggle only (see "Samosas and Salsa").
- **`public/js/cart.js`**: one small change to `updateCartBadge()` (hide the badge at 0). Nothing else.
- **Out of scope:** `footer.js` (the prototype's footer is a stand-in), `auth.js` internals, the auth modal's look, checkout pages, `cart.js` logic, and every non-home page.
- Tailwind stays loaded: the cart drawer, auth modal and other pages still use it.

## Design tokens

Put these on `.home-page` in `home.css`:

```css
--ink:#0C0A09;           /* Qloset GlassTokens.ink */
--ink-62:rgba(12,10,9,.62);
--ink-55:rgba(12,10,9,.55);
--bone:#F6F4EE;          /* Qloset GlassTokens.bone (≈ current --home-paper) */
--crew-ink:#27261F;      /* current --home-ink, kept for Meet the crew */
--accent:#B94316;        /* SamosaMan orange = tint for primary actions */
--blur:24px;             /* controls; shelves & sheets use 28px */
--glass:rgba(255,255,255,.55);
--glass-hi:rgba(255,255,255,.72);
--edge:rgba(255,255,255,.7);
--lift:0 1px 2px rgba(0,0,0,.06),0 12px 34px rgba(12,10,9,.16);
--bevel:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(0,0,0,.05);
--spring:cubic-bezier(.34,1.56,.64,1);
--ease:cubic-bezier(.2,.8,.2,1);
```

**Type:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", sans-serif`. Inter is already loaded as the fallback. Headings are weight 600 with `letter-spacing:-.045em`.

**Radii:** pills 999, circle buttons 44×44, sheet/drawer 34 (phone sheet 44 on the top corners only), shelf 28, bar 24, well 20, glyph plate 18.

## Materials and controls

Copy these from `prototype.html`. The class names are suggestions.

| Control | Use where | Recipe |
|---|---|---|
| `.btn-tint` | Primary action **over a photo** (hero "Order Now", nav "Start your order") | accent at 90%, blur + saturate(180%), white text, inner top highlight, orange glow shadow |
| `.btn-glass` | Secondary action **over a photo** (hero "Catering"), circle icon buttons, close buttons | `--glass` fill, `--edge` border, `--bevel` + `--lift`; hover → `--glass-hi` |
| `.btn-ink` | Primary action **on cream** ("Samosas and Salsa" Order Now, "Start order" in sheet) | `#0C0A09` + white 20%→0 top gradient, white text |
| `.btn-paper` | Secondary action **on cream** | `rgba(12,10,9,.05)` fill, 0.5px `rgba(0,0,0,.08)` border |
| `.shelf` | Frosted panel holding content and wells (catering card, nav dropdown, sheet body) | white 82%→56% gradient, blur 28, radius 28, padding 8 |
| `.well` | Pressable row inset into a shelf (Plan your catering, Pickup, Delivery) | white 50%, **lit from below**: dark 5% top hairline + white 90% bottom hairline; pressed → 36%; selected (`aria-pressed=true`) → 86% |
| `.glyph` | 48px icon plate inside a well | same recessed recipe, radius 18 |
| `.inkbar` | Not on the homepage this round (Join Rewards lives in the footer, which is out of scope) | — |

All buttons are at least 44px tall (48px standard, 56px for full-width sheet actions).

**Fallback:** wrap the blur in `@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))`. Without support, use solid fills: glass 92% white, shelf 96% white.

## Page structure

### 1. Nav (glass bar, `navbar.js`, home only)

- Floating capsule, sticky. Width `max-width:1200px`, 64px tall, 16px from the top, 24px side gutter. The glass is painted on `.nav::before`, **not** on `.nav`. A `backdrop-filter` on the nav itself would stop the dropdown inside it from blurring the page.
- Prevent the top margin from collapsing into a cream gap above the hero: `display:flow-root` on the nav's wrapper.
- **Contents, left to right:** wordmark (32px tall) · links (Menu → `burlington.html`, Delivery → `delivery.html`, Rewards → `rewards-signup.html`, Catering → `catering.html`, Our Story → `our-story.html`) · spacer · **account** circle (`#nav-user-btn`) · **bag** circle (`#open-cart-btn` with `#cart-badge`) · tint "Start your order" · menu circle (`#mobile-menu-btn`, hidden above 980px).
- **The location pill ("Ordering Pickup? / Select your location") is removed.** The account icon takes its place. Remove or guard the `location-trigger` / `location-label` block in `navbar.js` (around lines 112–130) so it doesn't throw when those elements are missing.
- **Current page:** use `aria-current="page"` on the matching link. It gets a white 85% pill. This replaces the `font-bold text-brand-600` swap.
- **Condense:** after 48px of scroll, add `.is-compact` (max-width 940px, height 56px, top 12px), animated over 460ms on `--ease`. Use a passive scroll listener.
- **≤980px:** hide the links and "Start your order", and show the menu circle. Clicking it opens `#mobile-menu-overlay`, which is now a **glass dropdown shelf** under the nav (240px wide, right-aligned) instead of the full-screen white overlay. It holds the five links (52px rows) and a full-width tint "Start your order". The menu icon swaps to ✕. Toggle with `hidden` + `aria-expanded`, and close on Escape and on link click. Update the `MutationObserver` in `home.js`, which currently watches `translate-x-full`.
- **≤640px (phone):** the nav **stays at the top of the page**, 12px gutter, 60px tall (52px compact), wordmark 26px, dropdown full width.
- **Bag badge:** orange pill, top-right of the bag circle, white 2px ring, pops in with `--spring`. In `cart.js` `updateCartBadge()`, add `badge.hidden = totalItems === 0;`. Today it always shows, even at 0.

### 2. Hero — "Served Fresh."

- Same photo (`home/holding_samosa.webp`), full bleed, 860px tall, `object-position:center 40%`, with a black 50%→0 gradient over the top 46%.
- Headline `clamp(44px,6vw,84px)`. Subhead `clamp(19px,2vw,26px)`. Copy starts 136px from the top so it clears the nav.
- Buttons: **tint "Order Now"** (opens the order sheet) + **glass "Catering"** (→ `catering.html`).
- On load, the headline, subhead and buttons rise 14px over 700ms, staggered by 90ms.
- **Phone (≤640px): do not zoom or crop the photo further.** The hero is 760px tall. The photo stays at its natural cover scale (640px tall) but starts **120px from the top**. The 120px band above it is filled with `#4D5562` (sampled from the photo's top edge), with a 90px fade from that colour into the photo. This keeps the samosa clear of the buttons. Copy starts 112px from the top, headline 44px.

### 3. Samosas and Salsa

- Cream section. Buttons: **ink "Order Now"** (opens the order sheet) + **paper "Catering"**.
- Keep the existing exploded-layer diagram in `samosa-diagram.js`. Restyle only:
  - **Hotspots** (`.samosa-diagram__point`): 44px glass circles with a + icon and a pulsing white ring (2.4s). When pressed (`aria-pressed=true`), the fill turns ink with white text, the + rotates 45° to an ×, and the ring stops. They pop in with `--spring`, staggered by 70ms.
  - **Toggle** (`.samosa-diagram__toggle`): becomes a **segmented control**, "Whole" | "See inside" (with the layers icon). It's a 6% ink track with a white lens that slides between the two options (`transform`, 420ms `--spring`). Both buttons drive the existing open/close logic, and `aria-pressed` reflects the state. If changing the single toggle into two buttons is invasive, keep one button but style it as the segmented control showing the current state.
  - **Caption:** keep the existing copy and `aria-live`. Title 17/600, description 15px at `--ink-62`.

### 4. Catering

- **Changed:** the tray photo (`home/tray_of_samosas.webp`) is now a full-bleed band, 820px tall (560px on phone), `object-position:60% 50%`.
- A **glass shelf** sits bottom-left, aligned to the 1280px content edge, max 440px wide (14px inset and full width on phone). It contains:
  - the heading "Samosas are best shared." and "Bring the crunch. Feed the crowd."
  - a **well** row: calendar glyph · "Plan your catering" · chevron → `catering.html`.
- ⚠️ The well's subtitle "Trays for offices, parties and events" is **new copy** written for the mockup. Confirm it or drop the subtitle.

### 5. Meet the crew — unchanged

Keep the current markup and styles exactly: the 6/3/2-column grid, square-cornered 4:5 portraits on `#d2d0c9`, and 20px names below (17px on phone). No glass here. The prototype matches today's `home.css`.

### 6. Pickup / delivery sheet (new)

- Opened by every "Order Now" and "Start your order". It's a dialog with `role="dialog"`, `aria-modal`, focus moved inside, Escape and scrim click to close, focus returned to the trigger, and page scroll locked.
- **Desktop:** a floating glass sheet (radius 34) centred 24px from the bottom, max 520px wide. It scales 0.94→1 and rises 24px over 420ms `--spring`, over a 20% black scrim with a 4px blur.
- **Phone:** a bottom sheet, full width, with only the top corners rounded (44), sliding up over 460ms `--spring`. Add `env(safe-area-inset-bottom)` padding.
- Content: the title "How are you getting it?", a 44px glass close circle, a shelf with two wells (**Pickup** "Grab it from us in Burlington" / **Delivery** "Brought to your door"), each with a glyph and an orange check when selected, then a full-width ink **"Start order"**.
- **Production behavior:** Pickup → `burlington.html`, Delivery → `delivery.html`. Remember the choice in `localStorage` (for example `samosaman_order_mode`) so the sheet opens on the last choice. The prototype's fake bag count and the "Undo" toast are PROTOTYPE-ONLY.
- ⚠️ The well subtitles are **new copy**. Confirm them.
- This is **not** the same as `#order-type-modal` in `cart.js`, which is the checkout-time picker. Leave that one alone.

### 7. Bag drawer (optional, recommended)

The prototype shows `#cart-sidebar` as a floating glass drawer (inset 12px, radius 34, glass 90%→70%, scale-in from the right). Restyling the existing drawer with CSS on its IDs under `.home-page` is optional. Don't change its markup or `cart.js` behavior. Skip this if it gets fiddly.

## IDs that must survive

`nav-user-btn`, `open-cart-btn`, `cart-badge`, `mobile-menu-btn`, `mobile-menu-overlay`, `cart-sidebar`, `cart-overlay`, `close-cart-btn`, `auth-modal` and all `auth-*` / `signup-*` IDs, `navbar-placeholder`, `footer-placeholder`, and every ID `samosa-diagram.js` queries.

## Motion

- Press: `scale(.96)` over 120ms ease-out (circles 0.9). Release springs back over 340ms on `--spring`.
- Hover: the glass fill goes 55% → 72%. Tint and ink buttons brighten slightly.
- Sheet 420ms, drawer 460ms, dropdown 360ms, segmented lens 420ms, badge pop 420ms, all on `--spring`. Nav condense is 460ms on `--ease`.
- `prefers-reduced-motion: reduce` turns off every animation and transition (the existing rule in `home.css` already does this; keep it).

## Acceptance criteria

1. Desktop (1440): matches `reference-desktop.png`. The glass nav floats over the hero with no cream gap above the photo, and condenses after scrolling.
2. Glass only appears over photos (hero, catering, hotspots) and on floating layers (nav, dropdown, sheet). Buttons on cream are ink or paper.
3. The location pill is gone. Account sits beside the bag. Nothing in `navbar.js` throws on the home page.
4. At 820px: links collapse into the menu circle, and the dropdown blurs the page behind it (legible over the hero headline).
5. At 390px: the nav stays pinned to the top. The hero photo is **not zoomed**. The samosa sits fully below "Order Now" / "Catering" and its bottom tip isn't cut off. This matches `reference-phone.png`.
6. Every Order Now / Start your order opens the sheet. Pickup goes to `burlington.html`, Delivery to `delivery.html`, and the last choice is remembered.
7. "See inside" keeps the existing layer animation, with glass hotspots and the segmented toggle working by mouse, touch and keyboard.
8. "Meet the crew" is visually identical to the current live page.
9. The bag badge is hidden at 0 items and pops in when items are added. Cart drawer, sign-in and checkout all still work.
10. Other pages that load `navbar.js` still show the current nav, unchanged.
11. Keyboard: visible orange focus rings everywhere, Escape closes the dropdown and sheet, and focus returns to the trigger.
12. No console errors. Safari (iOS and macOS) renders the blur, since it needs the `-webkit-` prefix.

## Suggested implementation order

1. Add the tokens and the material/button classes to `home.css`.
2. Nav: the home-only branch in `navbar.js`, the dropdown, `aria-current`, condense on scroll, and the badge change in `cart.js`.
3. Hero, including the phone photo offset.
4. Samosas and Salsa buttons, then the restyled diagram hotspots and toggle.
5. Catering band and shelf.
6. Order sheet in `home.js` (desktop float, then phone bottom sheet).
7. Optional bag drawer restyle.
8. Go through the acceptance criteria at 1440 / 820 / 390, in Safari and Chrome.
