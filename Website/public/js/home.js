// Homepage FAQ and order entry sheet. Navigation, cart and account handlers are shared.
(() => {
    if (!document.body.classList.contains('home-page')) return;

    const faqButtons = [...document.querySelectorAll('[data-faq-toggle]')];
    faqButtons.forEach(button => {
        button.addEventListener('click', () => {
            const shouldOpen = button.getAttribute('aria-expanded') !== 'true';
            faqButtons.forEach(item => {
                const open = item === button && shouldOpen;
                const answer = document.getElementById(item.getAttribute('aria-controls'));
                item.setAttribute('aria-expanded', String(open));
                answer.classList.toggle('is-open', open);
                answer.setAttribute('aria-hidden', String(!open));
                answer.inert = !open;
            });
        });
    });

    const button = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu-overlay');
    const closeMenu = () => { if (menu) menu.hidden = true; };
    let lockedScroll = null;

    const layer = document.getElementById('order-layer');
    const sheet = layer?.querySelector('[role="dialog"]');
    if (!layer || !sheet) return;

    const choices = [...sheet.querySelectorAll('[data-mode]')];
    const destinations = { pickup: 'burlington.html', delivery: 'delivery.html' };
    const storageKey = 'samosaman_order_mode';
    let mode = 'pickup';
    let trigger = null;
    let restoreMenu = false;
    let background = [];
    let previousStyles = null;

    const selectMode = (nextMode, persist = true) => {
        if (!Object.hasOwn(destinations, nextMode)) return;
        mode = nextMode;
        choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.mode === mode)));
        if (persist) {
            try { localStorage.setItem(storageKey, mode); } catch (_) { /* The sheet also works without storage. */ }
        }
    };
    const openOrder = (source) => {
        if (!layer.hidden) return;
        trigger = source;
        restoreMenu = Boolean(menu && !menu.hidden && menu.contains(source));
        closeMenu();
        try { selectMode(localStorage.getItem(storageKey), false); } catch (_) { /* Keep the in-memory choice. */ }
        lockedScroll = { x: window.scrollX, y: window.scrollY };
        const body = document.body;
        const root = document.documentElement;
        previousStyles = {
            rootOverflow: root.style.overflow,
            position: body.style.position,
            top: body.style.top,
            width: body.style.width,
            overflow: body.style.overflow,
            paddingRight: body.style.paddingRight,
        };
        const scrollbar = window.innerWidth - root.clientWidth;
        body.style.paddingRight = ((parseFloat(getComputedStyle(body).paddingRight) || 0) + scrollbar) + 'px';
        body.style.position = 'fixed';
        body.style.top = -lockedScroll.y + 'px';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        root.style.overflow = 'hidden';
        // Keep all background controls out of keyboard and assistive navigation.
        background = [...body.children].filter(element => element !== layer && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
            .map(element => ({ element, inert: element.inert }));
        background.forEach(({ element }) => { element.inert = true; });
        layer.hidden = false;
        sheet.querySelector('[data-close-order]').focus({ preventScroll: true });
    };
    const closeOrder = (event) => {
        if (layer.hidden) return;
        // Do not let this closing click dismiss the menu we are restoring.
        event?.stopPropagation();
        layer.hidden = true;
        background.forEach(({ element, inert }) => { element.inert = inert; });
        const body = document.body;
        document.documentElement.style.overflow = previousStyles.rootOverflow;
        ['position', 'top', 'width', 'overflow', 'paddingRight'].forEach(property => {
            body.style[property] = previousStyles[property];
        });
        const position = lockedScroll;
        lockedScroll = null;
        window.scrollTo(position.x, position.y);
        if (restoreMenu && menu && window.matchMedia('(max-width: 980px)').matches) {
            menu.hidden = false;
            // Restore focus before the shared menu observer runs.
            menu.inert = false;
        }
        const target = trigger?.isConnected && trigger.getClientRects().length ? trigger : button;
        target?.focus({ preventScroll: true });
    };

    document.addEventListener('click', (event) => {
        // Include the existing empty-cart CTA without changing the shared drawer markup.
        const source = event.target.closest('[data-open-order], #cart-empty-state a[href="burlington.html"]');
        if (!source) return;
        event.preventDefault();
        openOrder(source);
    });
    layer.querySelectorAll('[data-close-order]').forEach(control => control.addEventListener('click', closeOrder));
    choices.forEach(choice => choice.addEventListener('click', () => selectMode(choice.dataset.mode)));
    document.getElementById('start-order').addEventListener('click', () => {
        selectMode(mode);
        window.location.assign(destinations[mode]);
    });
    document.addEventListener('keydown', (event) => {
        if (layer.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeOrder();
        } else if (event.key === 'Tab') {
            const focusable = [...sheet.querySelectorAll('button, a[href], [tabindex="0"]')]
                .filter(element => !element.disabled && element.getClientRects().length);
            if (!focusable.length) return;
            // Safari can skip buttons when full keyboard navigation is off.
            // Advance explicitly so Tab always stays within the open dialog.
            event.preventDefault();
            const current = focusable.indexOf(document.activeElement);
            const next = event.shiftKey
                ? (current <= 0 ? focusable.length - 1 : current - 1)
                : (current + 1) % focusable.length;
            focusable[next].focus();
        }
    });
    // A page restored from the back-forward cache must not retain a locked sheet.
    window.addEventListener('pageshow', (event) => { if (event.persisted) closeOrder(); });
})();
