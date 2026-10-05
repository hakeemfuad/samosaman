// Accessibility for the shared navigation as used on the homepage.
// Keep its existing click handlers and destinations as the source of behavior.
(() => {
    const labels = {
        'nav-user-btn': 'My account',
        'open-cart-btn': 'Open shopping bag',
        'close-cart-btn': 'Close shopping bag',
        'mobile-menu-btn': 'Open menu',
    };
    Object.entries(labels).forEach(([id, label]) => {
        document.getElementById(id)?.setAttribute('aria-label', label);
    });

    const cart = document.getElementById('cart-sidebar');
    if (cart) {
        // An offscreen transform alone leaves the closed drawer in the tab order.
        const syncCart = () => { cart.inert = cart.classList.contains('translate-x-full'); };
        syncCart();
        new MutationObserver(syncCart).observe(cart, { attributes: true, attributeFilter: ['class'] });
    }

    const button = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu-overlay');
    if (!button || !menu) return;

    button.setAttribute('aria-controls', menu.id);
    const syncMenu = () => {
        const closed = menu.classList.contains('translate-x-full');
        button.setAttribute('aria-expanded', String(!closed));
        button.setAttribute('aria-label', closed ? 'Open menu' : 'Close menu');
        menu.inert = closed;
    };
    syncMenu();
    new MutationObserver(syncMenu).observe(menu, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.classList.contains('translate-x-full')) {
            button.click();
            button.focus();
        }
    });
})();
