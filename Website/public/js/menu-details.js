/* Burlington flavor details. Orders use the shared persistent cart. */
document.addEventListener('DOMContentLoaded', () => {
  const products = {
  "steak-cheese": {
    "name": "Steak & Cheese",
    "cartName": "Steak & Cheese Samosa",
    "price": 4.75,
    "description": "Minced beef, Cabot\u00ae sharp white cheddar, onion, and spices.",
    "filling": "assets/menu-diagrams/steak-cheese-85d0c2a3b408.webp",
    "chutney": true
  },
  "punjabi-samosa": {
    "name": "Traditional Punjabi",
    "cartName": "Traditional Punjabi Samosa",
    "price": 4.75,
    "description": "Spiced potatoes, green peas, and herbs.",
    "filling": "assets/menu-diagrams/punjabi-samosa-b02fc79d4202.webp",
    "chutney": true
  },
  "chicken-cheese": {
    "name": "Chicken & Cheese",
    "cartName": "Chicken & Cheese Samosa",
    "price": 4.75,
    "description": "Minced chicken, Cabot\u00ae sharp cheddar, spices, and herbs.",
    "filling": "assets/menu-diagrams/chicken-cheese-750318de9c65.webp",
    "chutney": true
  },
  "spicy-chicken": {
    "name": "Spicy Chicken",
    "cartName": "Spicy Chicken Samosa",
    "price": 4.75,
    "description": "Ground chicken with chili seasoning.",
    "filling": "assets/menu-diagrams/spicy-chicken-b525c5d4d827.webp",
    "chutney": true
  },
  "apple-samosa": {
    "name": "Apple Pie",
    "cartName": "Apple Pie Samosa",
    "price": 4.75,
    "description": "Apples, nutmeg, brown sugar, and cinnamon.",
    "filling": "assets/menu-diagrams/apple-samosa-c4b980ef8b5a.webp",
    "chutney": false
  }
};
  const dialog = document.getElementById('flavor-dialog');
  const diagram = dialog.querySelector('[data-product-diagram]');
  const stage = dialog.querySelector('.samosa-diagram__stage');
  const hotspots = dialog.querySelector('[data-diagram-hotspots]');
  const points = [...dialog.querySelectorAll('[data-diagram-part]')];
  const whole = dialog.querySelector('[data-diagram-whole]');
  const inside = dialog.querySelector('[data-diagram-toggle]');
  const chutney = dialog.querySelector('[data-chutney-toggle]');
  const bowlPoint = dialog.querySelector('[data-diagram-part="salsa"]');
  const status = dialog.querySelector('[data-product-status]');
  const viewBag = dialog.querySelector('[data-product-bag]');
  let productId, selected, opener, scrollState, touchStart;
  let openingFrame, noticeTimer;
  const quantityDialog = document.getElementById('quantity-dialog');
  const quantityInput = quantityDialog.querySelector('#quantity-input');
  const quantityConfirm = quantityDialog.querySelector('[data-quantity-confirm]');
  const quantityMinus = quantityDialog.querySelector('[data-quantity-minus]');
  const quantityPlus = quantityDialog.querySelector('[data-quantity-plus]');
  let pendingItem, quantityOpener, quantityScrollState;

  function lockPage() {
    const saved = {y:window.scrollY,position:document.body.style.position,top:document.body.style.top,width:document.body.style.width,paddingRight:document.body.style.paddingRight};
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    // A quantity dialog can open above the already locked flavor dialog.
    if (saved.position !== 'fixed') {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${saved.y}px`;
      document.body.style.width = '100%';
      document.body.style.paddingRight = `${padding + gutter}px`;
    }
    return saved;
  }

  function restorePage(saved) {
    if (!saved) return;
    document.body.style.position = saved.position;
    document.body.style.top = saved.top;
    document.body.style.width = saved.width;
    document.body.style.paddingRight = saved.paddingRight;
    if (saved.position !== 'fixed') window.scrollTo({top:saved.y,behavior:'instant'});
  }

  function selectedQuantity() {
    const value = quantityInput.valueAsNumber;
    return quantityInput.validity.valid && Number.isInteger(value) ? value : null;
  }

  function updateQuantity() {
    const value = selectedQuantity();
    const valid = value !== null;
    quantityInput.setAttribute('aria-invalid', String(!valid));
    quantityDialog.querySelector('#quantity-error').hidden = valid;
    quantityMinus.disabled = valid && value === 1;
    quantityPlus.disabled = valid && value === 99;
    quantityConfirm.disabled = !valid;
    quantityDialog.querySelector('[data-quantity-action]').textContent = valid ? `Add ${value} to bag` : 'Select a quantity';
    quantityDialog.querySelector('[data-quantity-total]').textContent = valid ? formatMoney(pendingItem.price * value) : '—';
  }

  const selectQuantity = (id, name, price, image, trigger) => {
    if (quantityDialog.open) return;
    pendingItem = {id, name, price:Number(price), image};
    quantityOpener = trigger;
    quantityInput.value = '1';
    quantityDialog.querySelector('#quantity-save-error').hidden = true;
    quantityDialog.querySelector('#quantity-product-name').textContent = products[id]?.name || name;
    quantityDialog.querySelector('[data-quantity-image]').src = image;
    quantityDialog.querySelector('[data-quantity-unit-price]').textContent = `${formatMoney(pendingItem.price)} each`;
    updateQuantity();
    quantityScrollState = lockPage();
    quantityDialog.showModal();
  };

  window.SamosamanMenu = {selectQuantity};

  function closeQuantity() {
    if (!quantityDialog.open) return;
    quantityDialog.close();
    pendingItem = null;
    restorePage(quantityScrollState);
    quantityScrollState = null;
    quantityOpener?.focus({preventScroll:true});
  }

  quantityInput.addEventListener('input', updateQuantity);
  quantityMinus.addEventListener('click', () => {
    quantityInput.value = String(Math.max(1, (selectedQuantity() || 1) - 1));
    updateQuantity();
  });
  quantityPlus.addEventListener('click', () => {
    quantityInput.value = String(Math.min(99, (selectedQuantity() || 0) + 1));
    updateQuantity();
  });
  quantityDialog.querySelectorAll('[data-quantity-close]').forEach(button => button.addEventListener('click', closeQuantity));
  quantityDialog.addEventListener('cancel', event => { event.preventDefault(); closeQuantity(); });
  let quantityBackdropDown = false;
  quantityDialog.addEventListener('pointerdown', event => {
    const rect = quantityDialog.getBoundingClientRect();
    quantityBackdropDown = event.target === quantityDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  });
  quantityDialog.addEventListener('pointerup', event => {
    if (quantityBackdropDown && event.target === quantityDialog) closeQuantity();
    quantityBackdropDown = false;
  });
  quantityDialog.querySelector('[data-quantity-form]').addEventListener('submit', event => {
    event.preventDefault();
    const value = selectedQuantity();
    if (!pendingItem || value === null) { updateQuantity(); quantityInput.focus(); return; }
    const item = pendingItem;
    try {
      if (!window.addToCart(item.id, item.name, item.price, item.image, value)) return;
    } catch (error) {
      quantityDialog.querySelector('#quantity-save-error').hidden = false;
      return;
    }
    closeQuantity();
    const count = window.getCart().find(entry => entry.id === item.id).quantity;
    if (dialog.open) {
      status.textContent = `${value} added. ${count} in your bag.`;
      status.hidden = false;
      viewBag.hidden = false;
    } else {
      showNotice(`${value} × ${products[item.id]?.name || item.name} added to your bag.`);
    }
  });
  document.querySelectorAll('.add-to-bag-btn').forEach(button => {
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'quantity-dialog');
  });

  const showNotice = text => {
    const toast = document.getElementById('menu-toast');
    clearTimeout(noticeTimer);
    toast.textContent = text;
    toast.hidden = false;
    noticeTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  };

  function selectPart(part, moveFocus = false) {
    selected = part;
    const product = products[productId];
    if (!product) return;
    if (part && hotspots.contains(document.activeElement)) inside.focus({preventScroll:true});
    diagram.dataset.detailOpen = String(Boolean(part));
    diagram.dataset.closeup = part === 'fold' || part === 'salsa' ? part : '';
    diagram.style.setProperty('--spread', part === 'filling' ? 1 : 0);
    hotspots.inert = Boolean(part);
    hotspots.setAttribute('aria-hidden', String(Boolean(part)));
    points.forEach(point => point.setAttribute('aria-pressed', String(point.dataset.diagramPart === part)));
    whole.setAttribute('aria-pressed', String(!part));
    inside.setAttribute('aria-pressed', String(Boolean(part)));
    dialog.querySelector('[data-diagram-controls]').dataset.state = part ? 'inside' : 'whole';
    dialog.querySelector('[data-diagram-hint]').textContent = part ? 'Tap the samosa to return to the whole view.' : 'Select + for a closer look.';
    const copy = part === 'fold' ? ['A personal touch.', 'Made with love. One samosa at a time.']
      : part === 'salsa' ? ['Better together.', 'Tomato Garlic Chutney, made to bring out the flavor of the samosa.']
      : ['', product.description];
    const partTitle = dialog.querySelector('[data-part-title]');
    partTitle.textContent = copy[0];
    partTitle.hidden = !copy[0];
    const description = dialog.querySelector('[data-part-description]');
    description.textContent = copy[1];
    description.classList.toggle('product-subtext', part !== 'fold' && part !== 'salsa');
    const ingredients = dialog.querySelector('[data-part-ingredients]');
    ingredients.hidden = part !== 'salsa';
    ingredients.textContent = part === 'salsa' ? 'Ingredients: Tomato, green pepper, yellow onion, peeled garlic, cilantro, ginger, habanero peppers, lemon juice, and a dash of salt.' : '';
    stage.setAttribute('aria-label', `${product.name}: ${part === 'filling' ? 'filling visible' : part === 'fold' ? 'hand-folded edge close-up' : part === 'salsa' ? 'chutney close-up' : 'whole samosa'}`);
    if (moveFocus) whole.focus({preventScroll:true});
  }

  function openProduct(id, trigger) {
    const product = products[id];
    if (!product || dialog.open) return;
    cancelAnimationFrame(openingFrame);
    productId = id;
    opener = trigger;
    touchStart = null;
    chutney.checked = false;
    bowlPoint.hidden = true;
    diagram.dataset.chutney = 'false';
    dialog.querySelector('[data-chutney-option]').hidden = !product.chutney;
    dialog.querySelector('[data-chutney-note]').hidden = !product.chutney;
    dialog.querySelector('#product-title').textContent = product.name;
    dialog.querySelector('[data-product-price]').textContent = formatMoney(product.price);
    dialog.querySelector('[data-art-part="filling"] image').setAttribute('href', product.filling);
    dialog.querySelector('[data-diagram-part="filling"]').setAttribute('aria-label', `Explore the ${product.name} filling`);
    dialog.querySelector('[data-product-add]').setAttribute('aria-label', `Add ${product.cartName} to bag`);
    status.hidden = true;
    viewBag.hidden = true;
    selectPart(null);
    scrollState = lockPage();
    dialog.showModal();
    dialog.querySelector('.product-dialog-scroll').scrollTop = 0;
    openingFrame = requestAnimationFrame(() => { if (dialog.open) selectPart('filling'); });
  }

  function closeProduct() {
    if (!dialog.open) return;
    cancelAnimationFrame(openingFrame);
    touchStart = null;
    dialog.close();
    restorePage(scrollState);
    scrollState = null;
    opener?.focus({preventScroll:true});
  }

  document.querySelectorAll('[data-product-open]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.productOpen, button)));
  dialog.querySelector('[data-product-close]').addEventListener('click', closeProduct);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (selected) selectPart(null, true); else closeProduct();
  });
  // Dismiss only a pointer gesture that starts and ends on the backdrop.
  let backdropDown = false;
  dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom); });
  dialog.addEventListener('pointerup', event => { if (backdropDown && event.target === dialog) closeProduct(); backdropDown = false; });
  whole.addEventListener('click', () => selectPart(null));
  inside.addEventListener('click', () => selectPart('filling'));
  points.forEach(point => {
    point.addEventListener('click', () => selectPart(point.dataset.diagramPart));
    point.addEventListener('keydown', event => {
      const delta = {ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
      if (!delta) return;
      event.preventDefault();
      const visible = points.filter(item => !item.hidden);
      const next = visible[(visible.indexOf(point) + delta + visible.length) % visible.length];
      next.focus();
      selectPart(next.dataset.diagramPart);
    });
  });
  stage.addEventListener('pointerdown', event => {
    touchStart = selected && !event.target.closest('button') ? {id:event.pointerId,x:event.clientX,y:event.clientY} : null;
  });
  stage.addEventListener('pointercancel', () => { touchStart = null; });
  stage.addEventListener('pointerup', event => {
    if (touchStart && touchStart.id === event.pointerId && Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y) < 10) selectPart(null);
    touchStart = null;
  });
  chutney.addEventListener('change', () => {
    diagram.dataset.chutney = String(chutney.checked);
    bowlPoint.hidden = !chutney.checked;
    if (!chutney.checked && selected === 'salsa') selectPart(null);
  });
  dialog.querySelector('[data-product-add]').addEventListener('click', event => {
    const product = products[productId];
    const card = document.querySelector(`.menu-card [data-id="${productId}"]`).closest('.menu-card');
    selectQuantity(productId, product.cartName, product.price, card.querySelector('img').src, event.currentTarget);
  });
  viewBag.addEventListener('click', () => { closeProduct(); window.openCart(); });

});
