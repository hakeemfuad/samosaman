# Standalone flavor diagrams

Status: local HTML previews. These files are not part of the public menu page or a deployment.

Open `index.html` to select a flavor, or open one of these files:

- `punjabi.html`
- `chicken-cheese.html`
- `spicy-chicken.html`
- `apple-pie.html`

Each diagram has its images, styles, and script inside its HTML file. It works from `file://` without a server. The All flavors and Next flavor links use the other HTML files in this folder.

## Chutney control

The three savory flavors start without a chutney bowl. Select the Tomato Garlic Chutney box to add the bowl and its + control. Clear the box to remove them. The box uses the home page glass tokens, shelf, well, rounded corners, and check mark.

Adding chutney keeps an open filling or fold view in place. Removing it during the chutney close view returns to the whole samosa. Hidden chutney controls are skipped by keyboard navigation. Apple Pie has no chutney option, as requested.

The original Whole, See inside, +, tap-to-close, Escape, focus, and reduced motion behavior remains. A small touch handler closes detail views on plain-text taps in WebKit, where a click event is not always sent. Moving and cancelled touches do not close the view. The new option uses a native checkbox. The previews replace commerce actions with All flavors and Next flavor links. They do not load cart or account scripts.

## Source and assets

The source is the current website component on branch `liquidglassrefactor`, revision `feed97ff9ab2c091c66f58d93d3f883a39961af4`, plus the working files recorded in `source-before.json`. The saved source is in `reference/`.

The Flutter file `Samosaman-App/lib/main.dart` was inspected. It has a starter counter screen and no product component to reuse. Flavor names and ingredients come from `Website/public/burlington.html`. `flavors.json` stores the source descriptions and the shorter filling captions.

Punjabi uses the existing filling asset. The new Chicken & Cheese, Spicy Chicken, and Apple Pie filling images were made with the built-in imagegen tool. They use the approved Steak and Cheese filling as their geometry reference. Exact prompts are in `prompts.json`. The PNG sources and WebP exports are in `assets/`. These are images for visual iteration, not new recipe claims or approved product photographs.

The filling coordinates, shell masks, fold image, and source motion values are retained. The new control is defined in `chutney-control.html` and `preview.css`. Each file includes its own copy, so each flavor can be reviewed on its own.

## Rebuild and preview

On October 20, 2026, Spicy Chicken was changed to ground chicken at the user's request. The current asset is `assets/spicy-chicken-ground-v2.webp`; its PNG source is beside it. The built-in imagegen edit prompt is in `spicy-chicken-ground-v2.prompt.txt`. The earlier shredded-chicken image remains as version 1. The caption now says “Ground chicken with chili seasoning.” The gallery uses the same new image and caption. This revision has a browser screenshot and a separate verification record in `qa/spicy-chicken-ground-v2-verification.json`.

The next Spicy Chicken revision uses `assets/spicy-chicken-ground-v3.webp`. It reduces the red chili color and visible spice flecks. The ground texture, shape, caption, and controls remain the same. Its PNG source, prompt, and verification record are saved beside the earlier versions.

Apple Pie now uses `assets/apple-pie-fewer-pieces-v2.webp`. It has fewer, larger apple pieces with the same cinnamon glaze. Its PNG source, prompt, and earlier version are saved. The page and gallery use this image. The check record is `qa/apple-pie-fewer-pieces-v2-verification.json`.

Apple Pie version 3 uses `assets/apple-pie-more-syrup-v3.webp`. The apple pieces are slightly smaller. The piece count remains low, with more syrup between the pieces. Its PNG source, prompt, and earlier versions are saved. The page and gallery use version 3. The check record is `qa/apple-pie-more-syrup-v3-verification.json`.

Run from this folder:

```sh
python3 build.py
python3 -m http.server 4195 --bind 127.0.0.1 --directory .
```

Open `http://127.0.0.1:4195/`. Edit `flavors.json`, `preview.css`, `chutney-control.html`, or `build.py`, then rebuild. A rebuild replaces the generated HTML files. `baseline.html` is a saved-source Steak and Cheese comparison page.

## Checks

`verify.cjs` runs the browser checks. `qa/verification.json` records the result, sizes, component heights, input checks, and errors. The viewport set is 320 × 760, 390 × 844, 820 × 1180, 1024 × 768, 1280 × 720, and 1440 × 900.

The checks cover all flavor states, optional chutney, keyboard input, rapid dismissal, reduced motion, file access, static fallbacks with JavaScript off, and WebKit simulated touch. Phone sections have extra height for the new selection box. Desktop panels retain the source height. Screenshots and alpha checks are in `qa/`. Physical iPhone behavior is not verified by these checks.

`source-verification.json` compares the existing website and Flutter sources with the starting snapshot. Separate work changed Cabot trademark markup in the website during this task. These previews retain the saved starting component. This task writes only to `output/flavor-diagrams/`.
