(() => {
    const diagram = document.querySelector('[data-samosa-diagram]');
    if (!diagram) return;

    // Product language follows the Burlington menu. The Flutter app still has
    // its starter screen and has no product-detail component to share here.
    const fillingCopy = 'Steak & Cheese Samosa: Minced beef, Cabot® sharp white cheddar, onion, and spices.';
    const parts = [
        { id: 'fold', title: 'A personal touch.', description: 'Made with love. One samosa at a time.' },
        { id: 'filling', title: '', description: fillingCopy },
        {
            id: 'salsa',
            title: '',
            description: 'Tomato Garlic Chutney, made to bring out the boldness of flavor in the samosa.',
        },
    ];
    const stage = diagram.querySelector('.samosa-diagram__stage');
    const hotspots = diagram.querySelector('[data-diagram-hotspots]');
    const points = [...diagram.querySelectorAll('[data-diagram-part]')];
    const caption = diagram.querySelector('[data-diagram-caption]');
    const hint = diagram.closest('.home-spotlight').querySelector('[data-diagram-hint]');
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
                ? 'A closer look at Tomato Garlic Chutney'
                : expanded ? 'Steak and Cheese, with the filling exposed' : 'Steak and Cheese, whole');
        controls.dataset.state = detailOpen ? 'inside' : 'whole';
        toggle.setAttribute('aria-pressed', String(detailOpen));
        whole.setAttribute('aria-pressed', String(!detailOpen));

        const part = parts.find((item) => item.id === id);
        points.forEach((point) => {
            point.setAttribute('aria-pressed', String(point.dataset.diagramPart === id));
        });
        hint.textContent = detailOpen ? 'Press anywhere to close' : 'Select + for a closer look.';
        title.hidden = !part?.title;
        title.textContent = part?.title || '';
        const copy = part?.description || fillingCopy;
        description.replaceChildren(...copy.split(/(®)/).map((text) => {
            if (text !== '®') return text;
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
    // A background press closes the detail. Controls and scrolling keep their own behavior.
    const isControl = (target) => target.closest('button,a,input,label,select,textarea,summary,[role="button"],[role="link"],[contenteditable]');
    let detailTouch = null;
    document.addEventListener('pointerdown', (event) => {
        detailTouch = null;
        if (!event.isPrimary || event.button !== 0 || !selected || isControl(event.target)) return;
        detailTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }, { passive: true });
    document.addEventListener('pointerup', (event) => {
        if (!detailTouch || event.pointerId !== detailTouch.id) return;
        const start = detailTouch;
        detailTouch = null;
        if (selected && !isControl(event.target) && Math.hypot(start.x - event.clientX, start.y - event.clientY) <= 10) {
            detailTouch = { ...start, ready: true };
        }
    }, { passive: true });
    document.addEventListener('click', (event) => {
        if (!detailTouch?.ready) return;
        detailTouch = null;
        // Keep hotspots inactive until the browser has chosen this touch's click target.
        if (selected && !isControl(event.target)) leaveDetail({ restoreFocus: false });
    });
    document.addEventListener('pointercancel', () => { detailTouch = null; }, { passive: true });

    const fallback = document.querySelector('[data-diagram-fallback]');
    selectPart(null);
    if (fallback) fallback.hidden = true;
    hint.hidden = false;
    diagram.hidden = false;
})();
