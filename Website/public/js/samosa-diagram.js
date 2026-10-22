(() => {
    const diagram = document.querySelector('[data-samosa-diagram]');
    if (!diagram) return;

    // Product language follows the Burlington menu. The Flutter app still has
    // its starter screen and has no product-detail component to share here.
    const parts = [
        { id: 'fold', title: 'A personal touch.', description: 'Made with love. One samosa at a time.' },
        { id: 'filling', title: 'Goodness inside.', description: 'Minced beef, Cabot™ sharp white cheddar, onion, and spices.' },
        {
            id: 'salsa',
            title: 'Better together.',
            description: 'Tomato Garlic Chutney, made to bring out the boldness of flavor in the samosa.',
            ingredients: 'Tomato, green pepper, yellow onion, peeled garlic, cilantro, ginger, habanero peppers, lemon juice, and a dash of salt.',
        },
    ];
    const stage = diagram.querySelector('.samosa-diagram__stage');
    const hotspots = diagram.querySelector('[data-diagram-hotspots]');
    const points = [...diagram.querySelectorAll('[data-diagram-part]')];
    const caption = diagram.querySelector('[data-diagram-caption]');
    const title = caption.querySelector('h3');
    const description = caption.querySelector('p');
    const ingredients = caption.querySelector('[data-diagram-ingredients]');
    const toggle = diagram.querySelector('[data-diagram-toggle]');
    const whole = diagram.querySelector('[data-diagram-whole]');
    const controls = diagram.querySelector('[data-diagram-controls]');
    let selected = null;
    let returnFocus = toggle;

    const selectPart = (id) => {
        selected = id;
        const detailOpen = id !== null;
        const closeup = id === 'fold' || id === 'salsa';
        const expanded = id === 'filling';

        // Move focus before making the selected point unavailable.
        if (detailOpen) toggle.focus({ preventScroll: true });
        diagram.dataset.detailOpen = String(detailOpen);
        diagram.dataset.closeup = closeup ? id : '';
        diagram.style.setProperty('--spread', Number(expanded));
        hotspots.inert = detailOpen;
        hotspots.setAttribute('aria-hidden', String(detailOpen));
        stage.setAttribute('aria-label', id === 'fold'
            ? 'A closer look at the samosa’s hand-folded edge'
            : id === 'salsa'
                ? 'A closer look at the Garlic Tomato Salsa'
                : 'Explore the parts of a samosa');
        controls.dataset.state = detailOpen ? 'inside' : 'whole';
        toggle.setAttribute('aria-pressed', String(detailOpen));
        whole.setAttribute('aria-pressed', String(!detailOpen));

        const part = parts.find((item) => item.id === id);
        points.forEach((point) => {
            point.setAttribute('aria-pressed', String(point.dataset.diagramPart === id));
        });
        caption.classList.toggle('is-idle', !part);
        title.hidden = !part;
        title.textContent = part?.title || '';
        const copy = part?.description || 'Select + for a closer look.';
        description.replaceChildren(...copy.split(/(™)/).map((text) => {
            if (text !== '™') return text;
            const trademark = document.createElement('sup');
            trademark.textContent = text;
            return trademark;
        }));
        ingredients.hidden = !part?.ingredients;
        ingredients.textContent = part?.ingredients ? `Ingredients: ${part.ingredients}` : '';
    };

    const leaveDetail = ({ restoreFocus = true } = {}) => {
        selectPart(null);
        if (restoreFocus) returnFocus.focus({ preventScroll: true });
    };

    points.forEach((point, index) => {
        point.addEventListener('click', () => {
            returnFocus = point;
            selectPart(point.dataset.diagramPart);
        });
        point.addEventListener('keydown', (event) => {
            const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
            if (!(event.key in offsets)) return;
            event.preventDefault();
            const next = points[(index + offsets[event.key] + points.length) % points.length];
            returnFocus = next;
            next.focus({ preventScroll: true });
            selectPart(next.dataset.diagramPart);
        });
    });
    toggle.addEventListener('click', () => {
        if (selected) {
            leaveDetail();
            return;
        }
        returnFocus = toggle;
        selectPart('filling');
    });
    whole.addEventListener('click', () => {
        leaveDetail({ restoreFocus: false });
    });
    diagram.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !selected) return;
        event.preventDefault();
        leaveDetail();
    });
    // Capture checks the state before an opening control handles its click.
    // The view controls keep their own click and focus behavior.
    document.addEventListener('click', (event) => {
        if (!selected || controls.contains(event.target)) return;
        leaveDetail({ restoreFocus: false });
    }, { capture: true });

    const fallback = document.querySelector('[data-diagram-fallback]');
    selectPart(null);
    if (fallback) fallback.hidden = true;
    diagram.hidden = false;
})();
