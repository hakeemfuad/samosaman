# Steak and Cheese — See inside

Standalone preview of the existing Punjabi samosa diagram with Steak and Cheese
filling. No website or Flutter source has been modified.

Open `index.html` directly in a browser, or visit the local preview on port 4192.
The page embeds its artwork and runs offline with no external dependencies.

The diagram uses the Punjabi component's exact markup, CSS and interaction code:

- It starts in **Whole**, with the original samosa and salsa photographs.
- **See inside** opens the filling using the original layer positions and timing.
- The three original controls explore the **hand-folded edge**, **filling**, and
  **salsa**. The fold and salsa use the original close-up camera movement.
- Selecting the active + again or pressing **Escape** leaves the detail.
  Clicking outside the diagram leaves the detail using the original handler.
- **Whole** resets the diagram. Arrow-key selection and reduced motion follow
  the original implementation.

Only the filling image, its accessible label, and its ingredient description differ.
There are no separate beef/cheese close-ups, custom return controls or saved view state.
The surrounding heading identifies this standalone Steak and Cheese preview.

## Rebuild

```sh
python3 output/steak-cheese-insides/build_preview.py
python3 -m http.server 4192 --bind 127.0.0.1 --directory output/steak-cheese-insides
```

The build reads the current Punjabi diagram from `Website/public/index.html`,
`css/samosa-diagram.css`, `css/home.css` and `js/samosa-diagram.js`. It only writes
inside this preview directory and the existing conversation visualization path.
The initializer is scoped to the standalone root; event handlers remain unchanged.

`parity-source-verification.json` records source equivalence.
`reference/punjabi.html` packages the unchanged Punjabi component into the same
standalone frame for comparison. `preview.fragment.html` and `index.html` are
generated outputs; `preview-shell.html` contains only the surrounding frame.

`Samosaman-App/lib/main.dart` was inspected again; it still contains the Flutter
starter counter screen and has no product-detail component to reuse.

## Artwork

The current filling uses **Cabot sharp white cheddar**, as confirmed by the user.
The built-in image tool reduced the cheese in version 3. More beef is visible.
Small areas of melted white cheese and thin strands remain.
The image is `assets/steak-cheese-filling-less-cheese-v3.png`.
The preview uses `assets/steak-cheese-filling-less-cheese-v3.webp`, with a transparent background.
The edit prompt is saved in `less-cheese-v3.prompt.txt`.

Version 2, with more white cheese, remains in
`assets/steak-cheese-filling-white-cheddar-v2.png`. Its prompt remains in
`white-cheddar-v2.prompt.txt`.

The previous orange-cheese artwork and its original prompt remain available in
`assets/steak-cheese-filling-original.png` and `filling-prompt.txt` for provenance.
The crust, salsa, ingredient text, and diagram behavior were unchanged by this edit.

This remains a local review preview. It has not been integrated, committed,
pushed or deployed.
