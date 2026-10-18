# Interactive Samosa Replication Guide

Updated: October 18, 2026

## Purpose and Scope

Use this artifact to make the same interactive diagram for another samosa flavor. Steak and Cheese is the worked example. Its controls follow the Punjabi diagram that was inspected on the public website.

For a normal flavor change, replace the filling image and product text. Keep the shell, fold, salsa, image geometry, controls, motion, and section layout. If the actual product has a different shell or condiment, record that difference before work starts. It requires a separate visual check.

The current script supports **one diagram per page**. This guide supports a standalone HTML preview or a flavor replacement in the existing home page section. A flavor selector and multiple diagrams on one page are future changes. They are not implemented by this artifact.

## Source Files

Use the current component files as the starting point. Do not rebuild the diagram from screenshots.

| File | Responsibility |
| --- | --- |
| [Home page HTML](/Users/hakeem/Samosaman/Website/public/index.html) | Section, SVG layers and masks, buttons, accessible labels, and resource version queries. |
| [Diagram script](/Users/hakeem/Samosaman/Website/public/js/samosa-diagram.js) | Part descriptions, selection state, tap exit, keyboard input, and focus. |
| [Diagram stylesheet](/Users/hakeem/Samosaman/Website/public/css/samosa-diagram.css) | Layer movement, close views, + buttons, caption, and responsive diagram layout. |
| [Home stylesheet](/Users/hakeem/Samosaman/Website/public/css/home.css) | Page colors, type, section height, spacing, and action buttons. |
| [Shell and fold photograph](/Users/hakeem/Samosaman/Website/public/assets/home/samosa_header.webp) | Shared exterior image, divided by SVG masks. |
| [Salsa and fallback photograph](/Users/hakeem/Samosaman/Website/public/assets/home/samosa_hero.webp) | Shared salsa crop and static fallback image. |
| [Approved Steak and Cheese filling](/Users/hakeem/Samosaman/Website/public/assets/home/steak-cheese-filling-v3.webp) | Filling with reduced white cheddar and a transparent background. |

Before website work, inspect the mobile Flutter application for related code and product structures. The [Flutter entry file](/Users/hakeem/Samosaman/Samosaman-App/lib/main.dart) contained a starter screen when this guide was written. It had no product detail component to reuse. Check again when a new flavor is built.

The older [standalone preview](/Users/hakeem/Samosaman/output/steak-cheese-insides/index.html) is a visual reference only. It has earlier controls. Its [preview builder](/Users/hakeem/Samosaman/output/steak-cheese-insides/build_preview.py) expects the old Punjabi caption in the source. The current source no longer contains that caption. Update that builder before use, or make the new preview from the current component files.

## Flavor Data

Complete this brief before preparing a filling image. Use confirmed product information. Do not infer ingredients, brands, allergens, or dietary claims from an image.

```text
Flavor name:
Asset slug:
Heading:
Subtitle:
Confirmed ingredients:
Visible ingredients and relative amounts:
Color and texture requirements:
Ingredients or objects to exclude:
Filling caption:
Filling button accessible label:
Fallback image description:
Shell or condiment differences, if any:
Requested result: standalone preview / home page integration
Reference image and recipe source:
```

These fields form a work brief. The current script does not load them as a configuration file.

### What Changes for Each Flavor

| Field | Location | Rule |
| --- | --- | --- |
| Product name | Heading and accessible labels in HTML | Use the exact product name. |
| Subtitle | `.home-hero-copy` | Keep the approved subtitle or use supplied copy. Check wrapping. |
| Filling image | `[data-art-part="filling"] image` | Change `href`. Keep placement and dimensions. |
| Filling description | `parts` entry with `id: 'filling'` in JavaScript | Use a short, accurate ingredient sentence. |
| Filling button label | `[data-diagram-part="filling"]` | Use `Explore the [flavor name] filling`. |
| Fallback description | `[data-diagram-fallback]` image `alt` | Describe the image and the correct flavor. |
| Resource versions | Script and stylesheet URLs in HTML | Change the relevant version when its contents change. Use a new filename for a new filling image. |

Keep the fold and salsa descriptions when those parts are unchanged. Keep the caption titles **A personal touch.**, **Goodness inside.**, and **Better together.** Keep the idle prompt **Select + for a closer look.**

### Worked Example: Steak and Cheese

| Field | Approved value |
| --- | --- |
| Heading | Steak and Cheese. |
| Subtitle | The holy grail of Samosas. |
| Filling caption | Minced beef, Cabot sharp white cheddar, onion, and spices. |
| Filling image | `steak-cheese-filling-v3.webp` |
| Appearance | Browned minced beef with small melted areas and thin strands of white cheddar. Keep the cheese soft and gooey. Let the beef remain clearly visible. |
| Cheese reference | The user confirmed Cabot sharp cheddar and its white color. The user then approved a version with less cheese. |

The filling entry in the current script is:

```js
{ id: 'filling', title: 'Goodness inside.', description: 'Minced beef, Cabot sharp white cheddar, onion, and spices.' },
```

For another flavor, change the description. Keep `id: 'filling'`. This ID controls the existing layer movement.

## Filling Image Preparation

The filling is a separate raster image with transparency. It sits between two parts of the shared shell photograph. The image must fit the existing geometry before it is placed in the diagram.

| Asset | Source size | Transparency | Use |
| --- | --- | --- | --- |
| Shell photograph | 960 × 960 | No alpha channel | The SVG masks remove its background and divide the shell. |
| Salsa photograph | 1254 × 1254 | No alpha channel | The SVG mask selects the bowl. The complete image is also the fallback. |
| Steak and Cheese filling v3 | 1254 × 1254 | Alpha channel | The empty canvas is transparent. The filling has soft, clean edges. |

Use the approved filling as a geometry reference. Preserve its triangular shape, orientation, camera angle, canvas margins, and light direction. Replace only the food needed for the new flavor. Do not add a shell, bowl, plate, label, or background to the filling asset.

A reusable image edit brief is:

```text
Edit the reference filling image for [FLAVOR].
Use these confirmed ingredients: [INGREDIENTS].
Show these relative amounts, colors, and textures: [DETAILS].
Keep the reference shape, orientation, camera angle, scale, canvas margins,
light direction, and photographic style. Change only the filling.
Keep the background transparent. Do not include pastry, a bowl, a plate,
text, packaging, or additional ingredients.
Match the reference framing so the result fits the existing SVG placement.
```

Save the source image and the exact prompt with the flavor preview. Use a versioned output name such as `<flavor-slug>-filling-v1.webp`. Keep the previous approved version until the replacement is checked. The Steak and Cheese reference is about 175 KiB. Treat this as a comparison point, not a required file size.

Check the exported WebP, not only the source image:

- Confirm that the alpha channel survives export. Check the image on both a light and a dark background.
- Check for a white rectangle, pale edge halo, stray food, or a cut edge.
- Compare the visible food bounds, not only the square canvas size.
- Check the whole and separated views at the actual display size. The filling must sit inside the shell and separate cleanly.
- Check ingredient color and amount against the brief. Do not use orange cheese for the Steak and Cheese reference.

The approved [source PNG](/Users/hakeem/Samosaman/output/steak-cheese-insides/assets/steak-cheese-filling-less-cheese-v3.png) and [image edit prompt](/Users/hakeem/Samosaman/output/steak-cheese-insides/less-cheese-v3.prompt.txt) remain available as references.

## SVG Composition

Keep the outer SVG `viewBox="100 0 800 650"`. The layer order is **fold → filling → crust → salsa**. The order lets the crust cover the filling in the whole view.

| Part | Placement and source coordinates |
| --- | --- |
| Fold and crust | Nested SVG at `x=170`, `y=45`, `width=530`, `height=530`; `viewBox="0 0 960 960"`. Both use the shell photograph. |
| Filling | Image at `x=205`, `y=90`, `width=425`, `height=425`. |
| Salsa | Nested SVG at `x=575`, `y=378`, `width=240`, `height=175`; `viewBox="736 711 492 358"`. |
| Main shadow | Ellipse at `cx=475`, `cy=574`, `rx=320`, `ry=42`. |
| Salsa shadow | Ellipse at `cx=691`, `cy=554`, `rx=132`, `ry=26`. |

For a simple flavor replacement, the filling image change is limited to its URL:

```html
<image href="assets/home/steak-cheese-filling-v3.webp"
       x="205" y="90" width="425" height="425"></image>
```

Retain the existing path data for the outline and all clipping masks. Retain `diagram-samosa-outline`, `diagram-samosa-clip`, `diagram-shell-clip`, `diagram-fold-clip`, `diagram-salsa-clip`, and `diagram-shadow`, including their `href` and `url(#...)` references. A new filling should fit this composition. Do not adjust the masks to compensate for incorrect image framing.

## Required Controls and States

The visitor starts with a whole samosa and three + buttons. The buttons select the fold, filling, or salsa. **All three + buttons disappear when any detail opens. A tap or click outside the view controls returns to the whole view.**

### State Table

| Selected part | `data-detail-open` | `data-closeup` | `--spread` | + buttons | View control state |
| --- | --- | --- | ---: | --- | --- |
| `null` | `false` | Empty | 0 | Visible and available | `whole` |
| `fold` | `true` | `fold` | 0 | Hidden and inert | `inside` |
| `filling` | `true` | Empty | 1 | Hidden and inert | `inside` |
| `salsa` | `true` | `salsa` | 0 | Hidden and inert | `inside` |

The `inside` control state applies to every detail, including the two close views. The caption shows the selected part's title and description. In the whole view, its title is hidden and the idle prompt returns.

### Input and Exit Rules

| Input | Required result |
| --- | --- |
| Click or tap a + button | Open that part and hide all + buttons. |
| Select See inside from the whole view | Open the filling. |
| Select See inside from any detail | Close the detail and return focus to the opening control. |
| Select Whole | Close the detail. Do not move focus back to a + button. |
| Click or tap the image, caption, or page while a detail is open | Close the detail. Do not cancel the clicked page control. |
| Press Enter or Space on a + button | Use the native button action to open that part. |
| Press Right or Down on a + button | Open the next part in fold → filling → salsa order. Wrap at the end. |
| Press Left or Up on a + button | Open the previous part. Wrap at the start. |
| Press Escape with focus in the diagram | Close the detail and return focus to the opening control. |
| Tap again during the opening animation | Close the detail without waiting for the animation to finish. |

Move focus to **See inside** before applying `inert` and `aria-hidden="true"` to the + button group. Opacity alone is insufficient: hidden buttons must also leave the tab order and accessibility tree. Use `preventScroll: true` for script focus changes.

The document click listener uses the **capture phase**. It checks the state before an opening button handles its click. This prevents the opening click from immediately closing the detail. The listener excludes clicks inside `[data-diagram-controls]`; those controls handle their own actions. It does not cancel a page action. For example, a click on **Order Now** closes the detail and still opens the order dialog.

### HTML and Accessibility Contract

| Selector or ID | Required purpose |
| --- | --- |
| `[data-samosa-diagram]` | Component root. Initially `hidden`. |
| `[data-diagram-fallback]` | Static image. Visible until script initialization completes. |
| `.samosa-diagram__stage` / `samosa-layers` | Image group and target of the view controls. |
| `[data-art-part]` | Layer keys: `fold`, `filling`, `crust`, `salsa`. |
| `[data-diagram-hotspots]` | Group that becomes inert and hidden during a detail view. |
| `[data-diagram-part]` | Native + buttons with keys `fold`, `filling`, `salsa`. |
| `[data-diagram-controls]` | Whole and See inside group, with `data-state`. |
| `[data-diagram-whole]` / `[data-diagram-toggle]` | Native view buttons with current `aria-pressed` values. |
| `[data-diagram-caption]` / `samosa-part-details` | Caption with an `h3` and a `p`; `aria-live="polite"`, `aria-atomic="true"`. |
| `hero-heading` | Target of the section's `aria-labelledby`. |
| `samosas-and-salsa` | Existing home page anchor. Keep it when replacing this section. |

Each + button uses `aria-controls="samosa-part-details"`. Both view buttons use `aria-controls="samosa-layers"`. Keep the illustration SVG `aria-hidden="true"` and `focusable="false"`; the native buttons and caption provide the accessible interface.

If JavaScript does not load, the static fallback must remain visible. Do not hide it in the initial HTML. Update its alternative text with the flavor name.

## Layout and Motion

Retain the `.home-page` style scope and the section's position under `.home-frame`. The desktop layout depends on these ancestors. Keep the existing Order Now and Catering controls and their behavior.

### Section and Diagram Size

- At widths of at least 1024 pixels, the section uses `--home-panel-height: max(540px, calc(100svh - 132px))`. This gives 768 pixels at a 1440 × 900 viewport and 588 pixels at 1280 × 720.
- The desktop diagram uses three columns: controls on the left, image in the center, and caption on the right. Its maximum width is 1240 pixels.
- The desktop stage width is `min(640px, calc(100cqw - 560px), calc(100cqh * 800 / 650))`. Preserve its size container and available height rules.
- The stage aspect ratio is 800 / 650. Its normal maximum width is 640 pixels. Keep overflow clipped and the 24-pixel corner radius.
- At smaller widths, the controls and caption use the existing stacked layout. Do not force a desktop height onto a phone.
- The source at this update uses section padding `56px 24px 88px`, with responsive overrides. At widths of 640 pixels or less, it uses `56px 20px 40px`. Keep the complete stylesheet rules; do not copy one padding value without its overrides.

Use the existing type and glass styles. The heading is `clamp(36px, 4.6vw, 64px)` with a 34-pixel phone override. The subtitle is `clamp(18px, 2vw, 24px)` with an 18-pixel phone override. The caption title is 17 pixels and its description is 15 pixels. Keep the native font stack, focus indicator, 24-pixel glass blur, and 44 × 44-pixel + button targets.

The + button positions are unchanged across flavors:

| Part | X | Y | Expanded X offset | Expanded Y offset |
| --- | ---: | ---: | ---: | ---: |
| Fold | 22.5% | 67% | 1.25% | 9% |
| Filling | 47.5% | 55% | 17.5% | −9% |
| Salsa | 75% | 72% | 10% | 7% |

### Movement

| Movement | Existing rule |
| --- | --- |
| Fold close view | Camera `translate(160px, -110px) scale(2.8)`. |
| Salsa close view | Camera `translate(-834px, -194px) scale(2.8)`. |
| Camera | Origin `340px 435px`; 1000 ms, `cubic-bezier(.22, .75, .18, 1)`. |
| Layer separation | 850 ms with the same curve; origin `435px 310px`. |
| Layer opacity | 600 ms. |
| + button group | 250 ms opacity fade; pointer events disabled during detail. |
| View control indicator | 420 ms with the existing spring curve. |
| Reduced motion | Remove animations and transitions through the existing media query. |

At `--spread: 1`, the shell moves −140 pixels horizontally and −45 vertically, and scales to 0.84. The fold moves +10 and +65; the filling moves +170 and +35; the salsa moves +80 and +45. Filling opacity follows `--spread`. Keep these values together.

Capture a fresh section-height baseline before each flavor change. Compare each state with the same state in that baseline. Phone captions can make a detail taller than the whole view. Keep ingredient copy concise and check line wrapping. Do not reduce text size or cut off ingredients to force a match.

## Replication Procedure

1. **Identify the source.** Record the checkout, branch, source revision, and server root. Inspect the current website and Flutter code. Check for unrelated edits before work starts.
2. **Complete the flavor brief.** Confirm the name, ingredients, appearance, caption, and requested destination. Record any shell or condiment difference.
3. **Record the baseline.** Save whole, fold, filling, and salsa screenshots. Record section height and overflow at the target viewports. Use the current files, because other home page work can change spacing.
4. **Prepare the asset.** Make the filling image with the reference geometry. Save its prompt and source. Export a versioned WebP with transparency. Check the result in the actual SVG.
5. **Copy the current component for a preview.** Use an isolated preview directory or checkout with the same styles, script, assets, and path structure. Keep one diagram in the preview. Serve its public directory as the server root so relative asset URLs resolve correctly.
6. **Apply the flavor fields.** Change the filling URL, heading, approved subtitle, ingredient description, filling button label, and fallback description. Keep shared masks, IDs, layout, and behavior.
7. **Update resource versions.** The reference uses `20261018-tap-to-close` for both diagram resources. A caption change modifies the script, so update its query. Update the stylesheet query only when that file changes. Confirm the browser received the new contents.
8. **Run the checks below.** Fix visible geometry, text wrapping, keyboard behavior, or resource errors before delivery. Use the same fonts and viewport as the baseline.
9. **Deliver the requested result.** For a preview request, provide the HTML preview and evidence. For an integration request, replace the specified section and check its existing links and actions. Report source changes, local checks, and any public release as separate states.

For example, a checkout preview can be served from its public directory with this command. Use an available port and the intended checkout path:

```sh
python3 -m http.server 4193 --bind 127.0.0.1 --directory /Users/hakeem/Samosaman/Website/public
```

For that command, open the server root at port 4193. Do not append `/Website/public/index.html` to the URL. For an isolated preview, replace the directory argument with that preview's public root.

## Verification Checklist

Use 320 × 760, 390 × 844, 820 × 1180, 1024 × 768, 1280 × 720, and 1440 × 900 as the initial viewport set. Check every state at each size for fit and caption wrapping. Run normal motion and reduced motion checks. Use mouse, keyboard, and simulated touch. Label simulated touch results accurately; they do not prove physical device behavior.

| Check | Pass condition |
| --- | --- |
| Initial state | Whole samosa, three visible + buttons, Whole selected, and idle caption. |
| Each detail | Correct part and caption; all + buttons disappear. |
| Hidden controls | The + group is inert, has `aria-hidden="true"`, and cannot receive keyboard focus. |
| Tap exit | Image, caption, and outside page clicks restore the whole view and all + buttons. |
| View controls | Whole closes. See inside opens the filling, then closes any open detail. |
| Keyboard | Enter, Space, arrows, Escape, and focus return follow the input table. No scroll jump. |
| Rapid input | A second tap during opening closes the detail. Repeated open and close actions leave a correct state. |
| Page actions | Order Now still opens the order dialog after it closes a detail. Catering and the section anchor still work. |
| Image fit | No opaque background, clipped food, halo, misplaced filling, or unexpected visible ingredients. |
| Layout | No horizontal overflow, clipped caption, overlapping controls, or unintended height change against the fresh baseline. |
| Motion | Existing timing remains smooth. Reduced motion removes movement transitions. |
| Fallback | With JavaScript disabled, the static image and accurate alternative text remain available. |
| Resources | No missing images, failed local asset requests, script errors, duplicate IDs, or broken SVG references. |

Allow at least 1150 milliseconds after a state change before taking a settled screenshot. Also inspect the transition itself. Reduced motion screenshots alone cannot verify the normal animation.

Save screenshots and a small results file with the flavor, source revision, asset version, viewport, input method, motion setting, section heights, errors, and result. Record any check that was not run. Do not mark a new flavor as verified from the Steak and Cheese evidence below.

## Common Problems

| Symptom | Check and correction |
| --- | --- |
| + buttons stay visible in a detail | Confirm that the current script and stylesheet were copied and loaded. Check `data-detail-open`, `inert`, and the resource versions. |
| A detail closes as soon as it opens | Preserve the document listener's capture phase and control exclusion. |
| Focus remains on a hidden button | Move focus to See inside before making the + group inert. |
| Filling has a rectangular background | Check the exported WebP alpha channel. Do not solve this with another SVG mask. |
| Filling looks too large or sits outside the shell | Compare visible image bounds and canvas margins. Correct the asset framing first. |
| Phone section grows after a flavor change | Compare the heading and caption line counts with the baseline. Use concise, accurate copy and preserve the existing layout. |
| New copy or behavior does not appear | Inspect the served file and its URL version. Confirm that the server points to the intended checkout. |
| Preview builder fails its Punjabi text assertion | It is the older builder. Use the current component or update its assumptions before use. |
| A second diagram does not work | The current initializer selects only the first root. Follow the future scope below. |

## Future Scope: Multiple Flavors on One Page

Separate pages can each use one instance of the current component. Adding a second diagram to the same page needs a code change. The script currently uses `document.querySelector('[data-samosa-diagram]')` and a global fallback query.

If multiple instances are requested:

1. Extract an initializer for each root. Keep selected state, captions, controls, and return focus within that instance.
2. Supply flavor data to each instance. Move the filling description out of the single shared `parts` array.
3. Scope the fallback lookup to the correct section.
4. Give each heading, stage, caption, SVG path, clip, and gradient a unique ID. Update every `aria-controls`, `aria-labelledby`, `href`, and `url(#...)` reference.
5. Define whether opening one diagram closes another. Test document tap exit with that rule. Avoid duplicate event handlers.
6. Check keyboard focus, captions, image loading, and fallback behavior for every instance.

A flavor selector within one diagram is also a new feature. It must return to the whole view before changing flavors and update the image, caption, heading, and accessible labels together. Define loading and image failure behavior before adding the selector. These changes are outside the current one-flavor replication procedure.

## Copyable Task Brief

```text
Create an interactive samosa diagram for [FLAVOR] using the current
Interactive Samosa Replication Guide in the open folder.
Destination: [STANDALONE HTML PREVIEW / SPECIFIED PAGE SECTION].
Ingredients and appearance: [CONFIRMED DETAILS].
Heading, subtitle, and caption: [APPROVED COPY].
Use the current Steak and Cheese component as the behavior and layout source.
Replace only the flavor fields and filling asset unless a product difference
is listed here: [DIFFERENCES OR NONE].
Keep all + buttons hidden while a detail is open. Keep tap-to-exit,
Whole, See inside, keyboard controls, focus behavior, and reduced motion.
Preserve section height against a fresh baseline at the listed viewports.
Inspect the Flutter application before website implementation.
Save the image source, prompt, preview, and verification evidence.
Report the exact local, preview, or public state of the result.
```

## Steak and Cheese Evidence

The local reference checkpoint recorded for this work is branch `liquidglassrefactor`, commit `5314f65`. Later working files can differ. Use the current source and a fresh baseline for new work.

The completed local browser checks covered mouse and simulated touch for all three details, tap exit, Enter, Space, arrows, Escape, focus return, Whole, See inside, and Order Now. A second tap during opening also passed. No horizontal overflow, JavaScript runtime errors, or failed local resource requests occurred in those checks.

The following heights are historical measurements from the behavior change, in CSS pixels. Whole and filling heights each matched their preceding state. Phone detail captions made the filling state taller than the whole state. Home page padding changed after these measurements, so do not use them as current tablet or phone targets.

| Viewport | Whole height | Filling height |
| --- | ---: | ---: |
| 1440 × 900 | 768.00 | 768.00 |
| 1280 × 720 | 588.00 | 588.00 |
| 820 × 1180 | 1018.98 | 1018.98 |
| 390 × 844 | 667.45 | 680.20 |
| 320 × 760 | 610.58 | 623.33 |

On October 18, 2026, at 22:57 UTC, a public file check found the Steak and Cheese section on the [live home page](https://samosamanvt.com/#samosas-and-salsa). The diagram script, diagram stylesheet, and filling image matched the local files. The complete home page HTML did not match. This was a file comparison; it was not a new public browser behavior test or proof that all website files were synchronized.

| Evidence | Purpose |
| --- | --- |
| [Browser verification](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/verification.json) | Local behavior, keyboard, input, and layout results. |
| [Source verification](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/source-verification.json) | Source comparison for the behavior change. |
| [Recorded Punjabi behavior](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/live-browser-behavior.json) | Public interaction reference inspected before replacement. |
| [Public file comparison](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/public-artifact-check.json) | Dated comparison of public and local files. |
| [Desktop whole view](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/desktop-whole.png) | Reference composition and visible + buttons. |
| [Desktop filling view](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/desktop-filling.png) | Reference separation and hidden + buttons. |
| [Desktop fold view](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/desktop-fold.png) | Fold close view. |
| [Desktop salsa view](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/desktop-salsa.png) | Salsa close view. |
| [Phone whole view](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/touch-whole.png) | Phone composition. |
| [Phone filling view](/Users/hakeem/Samosaman/output/qa/steak-diagram-live-behavior/touch-filling.png) | Phone detail and caption. |

The existing [local home page preview](http://127.0.0.1:4191/?preview=steak-tap-to-close#samosas-and-salsa) requires its local server to be running. The standalone preview linked earlier records an older visual stage. The current component files define the reusable interaction.
