# Steak & Potato Samosa — Removal Notes

The Steak & Potato samosa was removed from the Burlington menu. This document captures the exact markup that was deleted so it can be re-added cleanly later.

## File modified
`public/burlington.html`

## Removed card (Meat Samosas grid section)

The block below was located in the `Meat Samosas` `<section>`, inside the `grid grid-cols-2 lg:grid-cols-4 ...` container, as the **4th (last) card**, immediately after the Spicy Chicken card.

```html
<div class="group cursor-pointer reveal-on-scroll">
    <div class="bg-slate-50 rounded-lg overflow-hidden mb-4 relative aspect-[4/3]">
        <img src="assets/samosas/steak_and_potato.webp" alt="Steak and Potato Samosa" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
    </div>
    <h3 class="font-oswald text-lg md:text-xl font-bold uppercase text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">Steak & Potato</h3>
    <p class="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2 md:line-clamp-none">Our classic steak mixed with savory potatoes.</p>
    
    <div class="flex items-center justify-between mt-auto">
        <span class="text-sm font-bold text-slate-900">$3.75</span>
        <button 
            class="add-to-bag-btn flex items-center justify-center w-8 h-8 bg-brand-500 text-white rounded-full shadow-sm hover:scale-110 transition-transform duration-200" 
            aria-label="Add to bag"
            data-id="steak-potato"
            data-name="Steak & Potato Samosa"
            data-price="3.75"
        >
            <i data-lucide="plus" class="w-5 h-5"></i>
        </button>
    </div>
</div>
```

## Item metadata

| Field       | Value                                           |
| ----------- | ----------------------------------------------- |
| Name        | Steak & Potato Samosa                           |
| data-id     | `steak-potato`                                  |
| data-name   | `Steak & Potato Samosa`                         |
| Price       | `$3.75`                                         |
| Image       | `assets/samosas/steak_and_potato.webp`          |
| Alt text    | `Steak and Potato Samosa`                       |
| Description | `Our classic steak mixed with savory potatoes.` |
| Category    | Meat Samosas                                    |

## Reimplementation steps

1. Open `public/burlington.html`.
2. Locate the `Meat Samosas` section (search for `>Meat Samosas<`).
3. Inside its `grid grid-cols-2 lg:grid-cols-4 ...` container, paste the card markup above as the last child (after the Spicy Chicken card).
4. Update the description's class from `line-clamp-2 md:line-clamp-none` to `line-clamp-2 min-h-[2lh]` so it matches the rest of the menu's current alignment scheme:
   ```html
   <p class="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2 min-h-[2lh]">Our classic steak mixed with savory potatoes.</p>
   ```
5. Verify the image asset still exists at `public/assets/samosas/steak_and_potato.webp`.
6. Confirm cart logic recognizes `data-id="steak-potato"` (no change should be needed — the add-to-bag handler reads attributes generically).

## Related (not removed)

- The `assets/samosas/steak_and_potato.webp` image file was **not** deleted and remains available.
- No other pages (menu.html, catering.html, etc.) referenced this item, so no other edits are required when re-adding.
