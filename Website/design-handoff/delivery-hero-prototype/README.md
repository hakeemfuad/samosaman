# Delivery hero preview

Approved layout: the SamosaMan figure holds the DoorDash bag below the headline,
with Served Fresh below the hero and 96px below the graphic on phones.

Run from the Website directory:

```sh
DELIVERY_PREVIEW_PORT=4194 DELIVERY_PREVIEW_ART=bag node design-handoff/delivery-hero-prototype/server.cjs
```

Open http://127.0.0.1:4194/?variant=C&controls=off for the approved view.
Remove `&controls=off` to use the bottom arrows or left/right keyboard keys to compare:

- A: Graphic first, with the delivery headline and controls underneath.
- B: Graphic and delivery copy side by side on desktop; stacked on phones.
- C: Headline and controls first, with the graphic below.

The headline now reads "Now on DoorDash." Layout C moves only the graphic down
48px, placing it 60px below the controls. The graphic size, heading position,
and section heights are unchanged by this adjustment.

At phone widths through 640px, layout C now uses its content height with 96px
below the graphic. The 48px graphic offset is handled as layout spacing so it
is included in that height. At 390 × 844, the heading and graphic retain their
positions and the bottom space is 96px. The hero is about 606px tall.
See `qa/mobile-96px-bottom-space-checks.json`.

The DoorDash hero, What is a samosa, Meet the crew, FAQ, and footer share
`--home-paper: #f5f5f7`, the off-white used by Apple's homepage tiles. This
also covers the full-width backgrounds beside the crew and FAQ content.
The value was checked in Apple's homepage stylesheet on 2026-10-25.

The current preview uses the full-width section heights and gaps measured on
[Apple's US home page](https://www.apple.com/) on 2026-10-25. The source rules are
in [Apple's homepage stylesheet](https://www.apple.com/v/homepage/a/styles/homepage.built.css).
`apple-layout.css` applies these measurements only to this local preview.

| Viewport width | Viewport height | Main section height | Top / bottom content space |
| --- | --- | --- | --- |
| 1069px and above | 776px and above | 692px | 56px / 63px |
| 1069px and above | Below 776px | 580px | 48px / 56px |
| 735–1068px | 734px and above | 650px | 61px / 69px |
| 735–1068px | Below 734px | 570px | 54px / 61px |
| 734px and below | Any | 500px | 39px / 43px |

- Served Fresh, the samosa diagram, and catering use the full-width section
  height. Above phone widths, the DoorDash hero uses `max(456px, 100svh - 172px)`.
  This leaves 160px for the full Served Fresh heading after the 12px section gap, except
  on short screens where the minimum hero height takes priority. The heading
  keeps the extra 32px of top padding from the previous adjustment.
- The first section starts at the page top. Apple's navbar reserve space is
  removed. The hero background extends behind our floating navigation, with
  enough internal padding to keep the headline below the navigation.
- The viewport meta tag matches Apple: `width=device-width, initial-scale=1, viewport-fit=cover`.
- The team and FAQ sections use their content height. They have no direct
  Apple product-tile equivalent. Forcing them to 500px would hide content.
- Apple's separate two-column promotion tiles use different heights:
  580px desktop, 490px tablet, and 500px phone. Those are not used for our
  full-width catering section.
- The visible part of the next section is the viewport height minus the
  hero height and 12px gap. The hero now adapts to the viewport for a small,
  consistent peek; the remaining sections retain Apple's measured heights.

| Viewport | DoorDash hero height | Next section starts | Visible next section |
| --- | --- | --- | --- |
| 1440 × 900 | 728px | 740px | 160px |
| 1280 × 720 | 548px | 560px | 160px |
| 820 × 1180 | 1008px | 1020px | 160px |
| 820 × 720 | 548px | 560px | 160px |
| 390 × 844 | ~606px | ~618px | ~226px |
| 320 × 568 | ~631px | ~643px | 0px |

The base section heights and gaps were checked against the live Apple page
using the actual returned browser viewport. The current preview removes the
navbar reserve and adapts the DoorDash hero to leave a small peek. The diagram
scales within its remaining space, with controls and captions inside the section.
See `qa/apple-layout-measurements.json` and `qa/apple-match-*.jpg`.
Add `&controls=off` to hide the local comparison bar while reviewing the peek.

The graphic uses `object-fit: contain` and can shrink within the available height.
No part of the logo is cropped. The next home-page section remains below the hero.

The FAQ omits the "Got questions?" heading. The existing "Frequently asked
questions" label names the section, and all questions and answers remain.

This is a local prototype. The server reads the current public/index.html and inserts the DoorDash hero before the original Served Fresh section in the HTTP response. Served Fresh keeps its original photo, copy, and buttons. Its heading becomes an h2, with the same visual style, below the DoorDash h1. The shared navigation, product section, and order selector come from the current website. The public files are not changed. Analytics is omitted from the preview response. Committing these preview files does not change the deployed homepage.

The default graphic is the simple SamosaMan mascot × DoorDash pairing. The file
pairing.png is an unchanged copy of ../delivery-announcement/samosaman-x-doordash-v1.png.
The wider graphic can use up to 900 pixels in layouts A and C.
Add &art=bag to compare the previous version 10 bag graphic, which remains in hero.png.
The original artwork and layered master remain in ../delivery-announcement/.
To run the bag version on its original preview URL, use:
`DELIVERY_PREVIEW_PORT=4194 DELIVERY_PREVIEW_ART=bag node design-handoff/delivery-hero-prototype/server.cjs`.

The Samosaman Flutter checkout was checked at lib/main.dart. It contains a starter counter screen, so it has no applicable hero layout. This preview uses the website's current typography, cream colors, glass controls, and shared order selector.

Earlier browser verification, before the exact Apple measurement update:

- All three layouts checked at 1440 × 900 and 390 × 844.
- Graphic-first checked at 320 × 740. Both action buttons fit on one row.
- Side-by-side checked at 820 × 1180.
- No horizontal overflow was found. The full graphic and controls fit inside the hero.
- The hero Order Now button opened and closed the existing pickup/delivery selector.
- Layout switching updates the URL.

Screenshots and observations are in qa/. These checks cover browser viewport layouts, not physical devices or delivery checkout.

The headline/spacing update was also checked at 1440 × 900, 1280 × 720,
390 × 844, 375 × 667 and 320 × 568. Hero heights match the established formulas;
the graphic clears the order buttons and navigation at all checked sizes.
See qa/now-on-doordash-checks.json and the c-now-on-doordash screenshots.

The simple pairing graphic in layout C was checked at 1440 × 900, 1280 × 720,
390 × 844 and 320 × 568. The image loaded at every size. The full image and
buttons fit inside the hero, with no horizontal page overflow. See
qa/pairing-checks.json and qa/c-pairing-*.jpg. The active local preview uses
port 4195. The bag preview on port 4194 now includes Served Fresh below DoorDash.

The restored section was checked at 1440 × 900 and 390 × 844. The section order
is DoorDash, Served Fresh, then What is a samosa. The original viewport settings
and panel heights remain in place. The photo loaded, the restored Order Now
button opened and closed the order selector, and no horizontal overflow was found.
See qa/served-fresh-checks.json and qa/c-served-fresh-*.jpg.
