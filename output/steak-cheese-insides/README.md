# Steak and Cheese — See insides

Standalone visual preview. Nothing is integrated into the website or Flutter app.

Open `index.html` directly in a browser. It embeds its artwork and runs offline,
with no analytics, external dependencies, account services, or network requests.

The preview starts open so the new filling is visible. Choose **Whole**, then
**See insides** to watch the reveal. The three + buttons show the photographed
crust, minced beef, and sharp cheese. **All ingredients**, clicking the close-up,
or **Escape** returns to the exploded view. Escape again returns to Whole.
The controls support keyboard navigation and reduced motion.

To serve this folder locally:

```sh
python3 -m http.server 4192 --bind 127.0.0.1 --directory output/steak-cheese-insides
```

`preview.fragment.html` is the editable source; `python3 output/steak-cheese-insides/build_preview.py`
rebuilds the self-contained page and the conversation preview.

## Source references

- The original crust photograph and SVG seam masks come from the existing
  `Website/public/index.html` See inside component and
  `Website/public/assets/home/samosa_header.webp`.
- Ingredients follow `Website/public/burlington.html`: "Tender minced beef,
  sharp cheese, onion, and spices."
- The heading and subtitle match the existing Steak and Cheese treatment.
- `Samosaman-App/lib/main.dart` was inspected. It contains the Flutter starter
  counter screen and has no reusable product-detail or ingredient component.

## Artwork provenance

`assets/steak-cheese-filling-original.png` was generated with the built-in imagegen
tool for this visual concept; it is not a photograph of a finished product.
The prompt is saved in `filling-prompt.txt`. References were the existing Punjabi
filling silhouette, the Steak and Cheese menu photograph, and the crust photograph.
`assets/steak-cheese-filling.webp` is a WebP encoding with the generated alpha
preserved. The original generated PNG is also retained at its source location.

This folder is review-only. No site integration, commit, push, or deployment was performed.
