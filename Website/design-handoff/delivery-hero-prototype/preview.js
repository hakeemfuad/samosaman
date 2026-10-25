(() => {
  const layouts = { A: 'Graphic first', B: 'Side by side', C: 'Headline first' };
  const keys = Object.keys(layouts);
  const hero = document.querySelector('.delivery-hero');
  const bar = document.createElement('nav');
  bar.className = 'delivery-preview-switcher';
  bar.setAttribute('aria-label', 'Local hero preview layouts');
  bar.innerHTML = '<button type="button" aria-label="Previous layout">←</button><div class="delivery-preview-switcher__text"><small>Local preview</small><span aria-live="polite"></span></div><button type="button" aria-label="Next layout">→</button>';
  document.body.append(bar);
  let key;
  function apply(next, updateUrl = true) {
    key = Object.hasOwn(layouts, next) ? next : 'A';
    hero.dataset.deliveryVariant = key;
    bar.querySelector('span').textContent = `${key} · ${layouts[key]}`;
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('variant', key);
      history.replaceState(null, '', url);
    }
  }
  function cycle(step) { apply(keys[(keys.indexOf(key) + step + keys.length) % keys.length]); }
  bar.querySelectorAll('button')[0].addEventListener('click', () => cycle(-1));
  bar.querySelectorAll('button')[1].addEventListener('click', () => cycle(1));
  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]') || !document.querySelector('#order-layer').hidden) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  apply(new URLSearchParams(location.search).get('variant'), false);
  if (new URLSearchParams(location.search).get('controls') === 'off') bar.hidden = true;
})();
