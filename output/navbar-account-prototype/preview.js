// Local UI fixture only. No authentication, storage, or account writes.
const variants = {
  1: ['Name pill', 'The name stays beside the icon.'],
  2: ['Initial circle', 'One letter keeps the navbar compact.'],
  3: ['Account text', 'A clear label with the same width for each user.'],
};
const params = new URLSearchParams(location.search);
let selected = variants[params.get('variant')] ? Number(params.get('variant')) : 1;
const nameInput = document.querySelector('#preview-name');
nameInput.value = params.get('name') || 'Hakeem';
const userButton = document.querySelector('#nav-user-btn');
const nav = document.querySelector('#glass-nav');
nav.classList.toggle('is-compact', params.get('compact') !== '0');
const sizeToggle = document.querySelector('#size-toggle');
sizeToggle.textContent = nav.classList.contains('is-compact') ? 'Compact navbar' : 'Full navbar';
sizeToggle.setAttribute('aria-pressed', String(nav.classList.contains('is-compact')));
const action = document.querySelector('#preview-action');
const icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>';

function render() {
  const name = nameInput.value.trim() || 'Me';
  document.body.dataset.variant = String(selected);
  userButton.replaceChildren();
  if (selected === 1) {
    userButton.insertAdjacentHTML('beforeend', icon);
    const label = document.createElement('span');
    label.className = 'account-name';
    label.textContent = name;
    userButton.append(label);
  } else if (selected === 2) {
    const initial = document.createElement('span');
    initial.textContent = Array.from(name)[0].toLocaleUpperCase();
    initial.setAttribute('aria-hidden', 'true');
    userButton.append(initial);
  } else {
    userButton.textContent = 'My account';
  }
  userButton.setAttribute('aria-label', `${name}, My account`);
  userButton.title = `${name} · My account`;
  document.querySelector('#variant-title').textContent = `0${selected} · ${variants[selected][0]}`;
  document.querySelector('#variant-note').textContent = variants[selected][1];
  document.querySelectorAll('[data-select]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.select) === selected)));
  const url = new URL(location.href);
  url.searchParams.set('variant', String(selected));
  url.searchParams.set('compact', nav.classList.contains('is-compact') ? '1' : '0');
  history.replaceState(null, '', url);
  const deviceLink = document.querySelector('#device-link');
  const inMobileFrame = params.get('embed') === 'mobile';
  const destination = new URL(inMobileFrame ? '/' : '/mobile.html', location.origin);
  destination.searchParams.set('variant', String(selected));
  destination.searchParams.set('compact', nav.classList.contains('is-compact') ? '1' : '0');
  if (name !== 'Hakeem') destination.searchParams.set('name', name);
  deviceLink.href = destination.href;
  deviceLink.textContent = inMobileFrame ? 'Desktop view' : 'Mobile view';
  if (inMobileFrame) window.parent.postMessage({type: 'navbar-preview', variant: selected, name, compact: nav.classList.contains('is-compact')}, location.origin);
  action.textContent = 'Select the arrows to compare the options.';
}
function cycle(direction) { selected = (selected - 1 + direction + 3) % 3 + 1; render(); }
document.querySelector('#previous').addEventListener('click', () => cycle(-1));
document.querySelector('#next').addEventListener('click', () => cycle(1));
document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => { selected = Number(button.dataset.select); render(); }));
nameInput.addEventListener('input', render);
document.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1); }
});
document.querySelector('#size-toggle').addEventListener('click', event => {
  const compact = nav.classList.toggle('is-compact');
  event.currentTarget.textContent = compact ? 'Compact navbar' : 'Full navbar';
  event.currentTarget.setAttribute('aria-pressed', String(compact));
  render();
});
const menuButton = document.querySelector('#mobile-menu-btn');
const menu = document.querySelector('#mobile-menu-overlay');
function setMenu(open) {
  menu.hidden = !open;
  menu.inert = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuButton.addEventListener('click', () => setMenu(menu.hidden));
document.addEventListener('click', event => { if (!menu.contains(event.target) && !menuButton.contains(event.target)) setMenu(false); });
document.addEventListener('focusin', event => { if (!menu.contains(event.target) && !menuButton.contains(event.target)) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { setMenu(false); menuButton.focus(); } });
window.addEventListener('resize', () => { if (innerWidth > 980) setMenu(false); });
document.querySelectorAll('#navbar-placeholder a, #navbar-placeholder button:not(#mobile-menu-btn)').forEach(control => {
  control.addEventListener('click', event => {
    event.preventDefault();
    if (menu.contains(control)) setMenu(false);
    action.textContent = control === userButton ? `Preview action: open ${nameInput.value.trim() || 'Me'}’s account.` : `Preview action: ${control.textContent.trim() || control.getAttribute('aria-label')}.`;
  });
});
// Preview controls are limited to this loopback-only server.
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(location.hostname)) document.querySelector('.prototype-switcher').remove();
render();
