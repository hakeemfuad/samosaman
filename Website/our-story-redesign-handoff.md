# Our Story Page Redesign Handoff

## Goal

Redesign the existing `Website/public/our-story.html` page into a mobile-first, cinematic About/Our Story experience.

Primary goal: build brand trust through a personal, founder-led story.

Secondary goals: guide visitors toward ordering, catering, and rewards after the story has built confidence.

## Target Page

- Replace the main content of `Website/public/our-story.html`.
- Keep the existing shared navbar and footer injection intact.
- Do not create a new production page.
- Do not depend on new assets for v1.

## Design Direction

The page should feel like a vertical story, especially on mobile. It should not feel like a generic text page or a desktop layout squeezed onto a phone.

Use:

- People-first hero imagery.
- Short story sections.
- Stable image frames.
- Warm cream, brown, orange, and gold brand tones.
- Editorial feature blocks rather than dense paragraphs.
- Minimal scroll reveals.

Avoid:

- Mobile parallax.
- `background-attachment: fixed`.
- Large text overlays on busy mobile photos.
- Long copy blocks.
- Explaining design mechanics in production content.
- Heavy animation libraries.

## Recommended Page Structure

### 1. Image-Led Hero

Purpose: immediately make the page feel human and personal.

Recommended asset: `assets/fuad_ndibalema.webp`.

Mobile structure:

- Full-width image first.
- Small `EST. 2001` badge over the image.
- Main headline and intro copy directly below the image on a warm light background.
- Primary CTA: `Start Your Order`.
- Secondary CTA: `Plan Catering`.

Suggested headline direction:

> Built by hand. Shared with a new home.

### 2. Brand Pillars

Replace the preview concept of “No parallax. More story.” with real customer-facing content.

Use three compact pillars:

- Handmade Daily
- Fresh Ingredients
- Rooted in Community

These should be simple cards or compact editorial blocks. On mobile, stack them vertically. On desktop, three columns are acceptable.

### 3. Story Chapters

Use three main chapters. The chapters should be chronological enough to tell an origin-to-today arc, but visually presented like editorial feature blocks.

Chapter 1:

- Label: `2001`
- Title: `New Territory`
- Theme: founder/origin story, carrying tradition into a new place.
- Possible assets: `assets/fuad_and_fatu.webp`, `assets/fuad_ndibalema.webp`.

Chapter 2:

- Label: `The Craft`
- Title: `Handmade, Fresh, Repeatable`
- Theme: handmade samosas, fresh ingredients, sauces, spices, and daily process.
- Possible assets: `assets/samosas_frying.jpeg`, `assets/boys_at_work.png`.

Chapter 3:

- Label: `Community`
- Title: `The First Bites Spread`
- Theme: word of mouth, local events, customers, catering, and where SamosaMan is today.
- Possible assets: `assets/festival-photo.webp`, `assets/our-team.PNG`.

### 4. Closing CTA

End with a warm, direct action section.

CTA priority:

1. Order Now
2. Catering
3. Rewards

On mobile, stack CTA buttons or use a simple vertical layout. `Order Now` should have the strongest visual weight.

## Responsive Behavior

Build mobile-first. Desktop should enhance the same structure, not define it.

Use Tailwind breakpoints such as `md:` and `lg:` for:

- Switching from stacked mobile sections to split desktop layouts.
- Increasing type scale.
- Adding desktop-only sticky image/text moments if desired.

Do not use device/user-agent detection. Use viewport and capability-based responsive behavior.

Use JS `matchMedia` only if a behavior truly needs to differ between mobile and desktop.

## Image Handling

Use real `<img>` elements instead of parallax background images.

Every major image should have:

- Stable aspect ratio or fixed responsive height.
- `object-cover`.
- Intentional `object-position`.
- Descriptive `alt` text.

Suggested cropping guidance:

- Hero founder image: tall mobile frame, `object-[54%_16%]` or similar.
- Portrait/family images: square or 4:5, `object-top`.
- Food/process images: 4:3 or 16:10, `object-center`.
- Community images: 16:10, `object-center`.

## Motion

Use minimal motion only.

Recommended:

- Fade/slide reveal on sections.
- Light stagger on pillar cards.
- Optional desktop-only sticky chapter behavior.

Required:

- Respect `prefers-reduced-motion`.
- Avoid scroll-jacking.
- Avoid parallax backgrounds.
- Avoid complex animation libraries.

## Copy Direction

Use a light rewrite of the current copy.

Keep the existing factual story points, but make the copy:

- Shorter.
- More mobile-friendly.
- More founder-led.
- More emotionally specific.

Each section should generally have:

- A small label.
- A clear headline.
- One concise paragraph.
- Optional short proof points.

## Technical Notes

Current site shape:

- Static HTML pages.
- Tailwind loaded via CDN.
- Shared navbar injected by `Website/public/js/navbar.js`.
- Shared footer injected by `Website/public/js/footer.js`.
- Firebase/cart/auth scripts are already present on the page.

Scope:

- Keep the redesign scoped to `our-story.html`.
- Avoid touching nav/footer unless required.
- Use existing assets only for v1.

Opportunistic cleanup:

- Pages reference `css/global.css`, but no `Website/public/css/global.css` file currently exists. The implementation agent should either add a harmless shared CSS file or avoid relying on that reference.

## Mobile Acceptance Criteria

- Page reads well at 375px width.
- No `background-attachment: fixed`.
- No mobile parallax background images.
- No overlapping text, images, or CTAs.
- Every major image has stable sizing and intentional crop.
- CTA buttons are thumb-friendly and stack cleanly on narrow screens.
- Copy is short enough to scan on mobile.
- Motion is subtle and respects `prefers-reduced-motion`.
- Desktop enhancements do not degrade the mobile layout.

## Suggested Implementation Order

1. Replace the current hero with the image-led mobile-first hero.
2. Add the three brand pillars.
3. Replace the current long content blocks with the three story chapters.
4. Add the closing CTA section.
5. Remove parallax behavior from the page.
6. Add minimal reveal animation with reduced-motion support.
7. Test at mobile widths first, especially 375px and 430px.
8. Then tune tablet and desktop layouts.
