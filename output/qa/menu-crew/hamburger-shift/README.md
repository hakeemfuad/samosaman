# Hamburger menu layout verification

Local preview: http://127.0.0.1:4183/burlington.html

Opening the navigation used to remove the 8px scrollbar and change the available page width. The shared navigation now preserves that width with matching body and header padding, restoring their previous padding when it closes.

- `before-results.json`: failing measurements before the fix.
- `results.json`: unchanged card and text positions at 375, 430, 768, 900, and 1023px after the fix.
- `scroll-lock-results.json`: three open/close cycles for Burlington at 375 and 900px and the homepage at 375px, both with and without a visible scrollbar. Layout remained stable, existing padding was restored, background scrolling stayed locked while open, and scrolling resumed after closing.

To rerun with the local server running and Playwright available:

```sh
NODE_PATH=/private/tmp/menu-crew-tools/node_modules node output/qa/menu-crew/hamburger-shift/verify-shift.cjs
NODE_PATH=/private/tmp/menu-crew-tools/node_modules node output/qa/menu-crew/hamburger-shift/verify-scroll-lock.cjs
```

The visible scrollbar coverage intentionally disables Playwright's default `--hide-scrollbars` flag. This change has only been verified locally.
