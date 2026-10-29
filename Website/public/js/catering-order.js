/* Product tiles follow the Flutter product-card image/name structure and
   GlassWell selection state. The form reads IDs and quantities through read(). */
(() => {
    'use strict';

    function create(root, catalog) {
        const template = document.getElementById('catering-item-template');
        const count = document.getElementById('catering-order-count');
        const entries = [];
        const fragment = document.createDocumentFragment();

        for (const group of catalog.groups) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'catering-product-group';
            const legend = document.createElement('legend');
            legend.textContent = group.label;
            const grid = document.createElement('div');
            grid.className = 'catering-product-grid';
            fieldset.append(legend, grid);

            for (const product of group.items) {
                const tile = template.content.firstElementChild.cloneNode(true);
                const selection = tile.querySelector('[data-item-select]');
                const quantity = tile.querySelector('[data-item-quantity]');
                const error = tile.querySelector('[data-item-error]');
                const name = tile.querySelector('[data-item-name]');
                const quantityLabel = tile.querySelector('[data-quantity-label]');
                const image = tile.querySelector('img');
                tile.dataset.productId = product.id;
                selection.id = `item-${product.id}`;
                selection.value = product.id;
                selection.name = 'menu-items';
                tile.querySelector('[data-item-label]').htmlFor = selection.id;
                name.id = `${selection.id}-name`;
                name.textContent = product.name;
                tile.querySelector('[data-item-unit]').textContent = `Individual ${group.unit}`;
                const ingredients = tile.querySelector('[data-item-ingredients]');
                ingredients.textContent = product.ingredients || '';
                ingredients.hidden = !product.ingredients;
                image.src = product.image;
                quantity.id = `quantity-${product.id}`;
                quantity.name = quantity.id;
                quantity.max = catalog.maxQuantity;
                quantityLabel.id = `${quantity.id}-label`;
                quantityLabel.htmlFor = quantity.id;
                quantity.setAttribute('aria-labelledby', `${name.id} ${quantityLabel.id}`);
                error.id = `${quantity.id}-error`;
                quantity.setAttribute('aria-describedby', error.id);
                const entry = { product, tile, selection, quantity, error };
                entries.push(entry);
                grid.append(tile);
            }
            fragment.append(fieldset);
        }
        root.querySelector('[data-order-products]').replaceChildren(fragment);

        function validate(entry) {
            const { selection, quantity, error } = entry;
            const valid = !selection.checked || (quantity.validity.valid && Number.isSafeInteger(quantity.valueAsNumber));
            error.hidden = valid;
            error.textContent = valid ? '' : `Enter a whole number from 1 to ${catalog.maxQuantity.toLocaleString()}.`;
            if (valid) quantity.removeAttribute('aria-invalid');
            else quantity.setAttribute('aria-invalid', 'true');
            return valid;
        }

        function syncSelection() {
            let selected = 0;
            entries.forEach(entry => {
                const checked = entry.selection.checked;
                entry.tile.dataset.selected = String(checked);
                entry.quantity.disabled = !checked;
                entry.quantity.required = checked;
                if (!checked || entry.quantity.value !== '' || entry.quantity.hasAttribute('aria-invalid')) {
                    validate(entry);
                }
                if (checked) selected++;
            });
            count.textContent = selected ? `${selected} ${selected === 1 ? 'item' : 'items'} selected` : 'No items selected';
        }

        root.addEventListener('change', event => {
            if (event.target.matches('[data-item-select]')) syncSelection();
        });
        root.addEventListener('input', event => {
            if (!event.target.matches('[data-item-quantity]')) return;
            const entry = entries.find(item => item.quantity === event.target);
            // Match the menu quantity control. A blur-time error can move the
            // submit button between pointer-down and pointer-up in WebKit.
            validate(entry);
        });
        root.form.addEventListener('reset', () => {
            // The reset event runs before native controls receive default values.
            queueMicrotask(syncSelection);
        });
        syncSelection();

        return {
            read() {
                const invalid = entries.filter(entry => !validate(entry));
                return {
                    invalidField: invalid[0]?.quantity || null,
                    items: invalid.length ? [] : entries.filter(entry => entry.selection.checked).map(entry => ({
                        id: entry.product.id,
                        quantity: entry.quantity.valueAsNumber
                    }))
                };
            }
        };
    }

    window.SamosamanCateringOrder = { create };
})();
