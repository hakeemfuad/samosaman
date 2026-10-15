(() => {
    const diagram = document.querySelector('[data-samosa-diagram]');
    if (!diagram) return;

    // Product language follows the Burlington menu. The Flutter app still has
    // its starter screen and has no product-detail component to share here.
    const parts = [
        { id: 'fold', title: 'A personal touch.', description: 'Folded by hand. One samosa at a time.' },
        { id: 'filling', title: 'Goodness inside.', description: 'Our Punjabi filling: spiced potatoes, green peas, and herbs.' },
        { id: 'salsa', title: 'Better together.', description: 'Garlic Tomato Salsa. A little tang for all that crunch.' },
    ];
    const stage = diagram.querySelector('.samosa-diagram__stage');
    const hotspots = diagram.querySelector('[data-diagram-hotspots]');
    const points = [...diagram.querySelectorAll('[data-diagram-part]')];
    const caption = diagram.querySelector('[data-diagram-caption]');
    const title = caption.querySelector('h3');
    const description = caption.querySelector('p');
    const toggle = diagram.querySelector('[data-diagram-toggle]');
    const toggleLabel = toggle.querySelector('[data-toggle-label]');
    let selected = null;
    let returnFocus = toggle;

    const selectPart = (id) => {
        selected = id;
        const detailOpen = id !== null;
        const closeup = id === 'fold' || id === 'salsa';
        const expanded = id === 'filling';

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
        toggleLabel.textContent = detailOpen ? 'Back to full view' : 'See inside';

        const part = parts.find((item) => item.id === id);
        points.forEach((point) => point.setAttribute('aria-pressed', String(point.dataset.diagramPart === id)));
        caption.classList.toggle('is-idle', !part);
        title.hidden = !part;
        title.textContent = part?.title || '';
        description.textContent = part?.description || 'Select + for a closer look.';
        if (detailOpen) toggle.focus({ preventScroll: true });
    };

    const leaveDetail = () => {
        selectPart(null);
        returnFocus.focus({ preventScroll: true });
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
            next.focus();
            returnFocus = next;
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
    diagram.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !selected) return;
        event.preventDefault();
        leaveDetail();
    });

    const fallback = document.querySelector('[data-diagram-fallback]');
    if (fallback) fallback.hidden = true;
    diagram.hidden = false;
})();
