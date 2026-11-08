// Homepage FAQ. Navigation, cart and account handlers are shared.
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
})();
