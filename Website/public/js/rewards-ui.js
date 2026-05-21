(function () {
  let currentPoints = 0;
  let activeTier = null;
  let selectedItemIds = [];
  const carouselStates = new WeakMap();

  const CARD_PCT = 87;   // % of container each card occupies — 13% peek of next
  const CARD_GAP = 12;   // px gap between cards
  const AUTO_MS  = 5000; // auto-advance interval

  function rewards() {
    return window.SamosamanRewards;
  }

  function formatPoints(points) {
    return Number(points || 0).toLocaleString('en-US');
  }

  function getRemainingCount() {
    return activeTier ? Math.max(0, activeTier.selectionLimit - selectedItemIds.length) : 0;
  }

  function getCarouselState(container, tierCount) {
    let state = carouselStates.get(container);
    if (!state) {
      state = { index: 0, intervalId: null, tierCount, hinted: false };
      carouselStates.set(container, state);
    }
    state.tierCount = tierCount;
    state.index = Math.min(state.index, Math.max(0, tierCount - 1));
    return state;
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

  function getScrollEl(container) {
    return container.querySelector('[data-carousel-scroll]');
  }

  function getCardWidth(container) {
    const card = container.querySelector('[data-carousel-card]');
    return card ? card.offsetWidth + CARD_GAP : 0;
  }

  function scrollToIndex(container, index, smooth) {
    if (smooth === undefined) smooth = true;
    const el = getScrollEl(container);
    if (!el) return;
    const w = getCardWidth(container);
    if (!w) return;
    el.scrollTo({ left: index * w, behavior: smooth ? 'smooth' : 'instant' });
  }

  function updateDots(container, activeIndex, total) {
    for (let i = 0; i < total; i++) {
      const dot = container.querySelector('[data-reward-carousel-dot="' + i + '"]');
      if (!dot) continue;
      dot.className = i === activeIndex
        ? 'h-2 w-6 rounded-full bg-brand-600 transition-all duration-300 cursor-pointer'
        : 'h-2 w-2 rounded-full bg-slate-300 hover:bg-slate-400 transition-all duration-300 cursor-pointer';
      dot.setAttribute('aria-current', i === activeIndex ? 'true' : 'false');
    }
  }

  function startAutoAdvance(container, state) {
    if (state.intervalId || state.tierCount <= 1) return;
    state.intervalId = window.setInterval(function () {
      if (!container.isConnected) {
        clearInterval(state.intervalId);
        state.intervalId = null;
        return;
      }
      state.index = (state.index + 1) % state.tierCount;
      scrollToIndex(container, state.index);
      updateDots(container, state.index, state.tierCount);
    }, AUTO_MS);
  }

  function stopAutoAdvance(state) {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  // Nudge right then back to hint there's more content
  function nudgeHint(container) {
    const api = rewards();
    if (!api || api.REWARD_TIERS.length <= 1) return;
    const state = getCarouselState(container, api.REWARD_TIERS.length);
    if (state.hinted || state.index !== 0) return;
    state.hinted = true;
    const el = getScrollEl(container);
    if (!el) return;
    el.scrollTo({ left: 56, behavior: 'smooth' });
    setTimeout(function () { el.scrollTo({ left: 0, behavior: 'smooth' }); }, 680);
  }

  function attachScrollListener(container) {
    const api = rewards();
    if (!api) return;
    const el = getScrollEl(container);
    if (!el) return;
    const state = getCarouselState(container, api.REWARD_TIERS.length);

    el.addEventListener('scroll', function () {
      const w = getCardWidth(container);
      if (!w) return;
      const newIndex = Math.round(el.scrollLeft / w);
      if (newIndex !== state.index) {
        state.index = newIndex;
        updateDots(container, newIndex, state.tierCount);
      }
    }, { passive: true });

    startAutoAdvance(container, state);
  }

  function moveCarousel(container, direction) {
    const api = rewards();
    if (!api) return;
    const state = getCarouselState(container, api.REWARD_TIERS.length);
    stopAutoAdvance(state);
    state.index = (state.index + direction + state.tierCount) % state.tierCount;
    scrollToIndex(container, state.index);
    updateDots(container, state.index, state.tierCount);
  }

  function selectCarouselSlide(container, index) {
    const api = rewards();
    if (!api) return;
    const state = getCarouselState(container, api.REWARD_TIERS.length);
    stopAutoAdvance(state);
    state.index = Math.max(0, Math.min(index, state.tierCount - 1));
    scrollToIndex(container, state.index);
    updateDots(container, state.index, state.tierCount);
  }

  function renderRewardCard(tier, activeReward) {
    const unlocked = currentPoints >= tier.points;
    const pointsAway = Math.max(0, tier.points - currentPoints);
    const isInOrder = activeReward?.rewardId === tier.id;
    const stateText = isInOrder
      ? 'Added to order'
      : unlocked
        ? 'Available now'
        : `${formatPoints(pointsAway)} pts to unlock`;
    const buttonText = isInOrder ? 'In Order' : 'Redeem';
    const buttonDisabled = !unlocked || isInOrder;
    const buttonClasses = buttonDisabled
      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm active:scale-95';

    return `
      <article class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col min-h-[245px]">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-brand-600">${formatPoints(tier.points)} points</p>
            <h3 class="font-oswald text-2xl font-bold uppercase text-slate-900 leading-tight mt-1">${tier.title}</h3>
          </div>
          <span class="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${unlocked ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${stateText}</span>
        </div>
        <p class="text-sm text-slate-600 leading-relaxed flex-grow">${tier.description}</p>
        <button type="button" data-redeem-reward="${tier.id}" ${buttonDisabled ? 'disabled' : ''}
          class="mt-5 w-full rounded-md py-3 px-4 font-oswald text-base font-bold uppercase tracking-wide transition-all ${buttonClasses}">
          ${buttonText}
        </button>
      </article>
    `;
  }

  function renderRewardCards() {
    const api = rewards();
    if (!api) return;
    const activeReward = api.buildRewardPayload();

    // Inject scrollbar-hiding rule once
    if (!document.getElementById('carousel-no-scrollbar')) {
      const style = document.createElement('style');
      style.id = 'carousel-no-scrollbar';
      style.textContent = '[data-carousel-scroll]::-webkit-scrollbar{display:none}';
      document.head.appendChild(style);
    }

    document.querySelectorAll('[data-rewards-exchange]').forEach(function (container) {
      const state = getCarouselState(container, api.REWARD_TIERS.length);

      if (!getScrollEl(container)) {
        // ── First render: build full scroll-snap track ──────────────────

        // Build cards HTML
        var cardsHTML = '';
        api.REWARD_TIERS.forEach(function (tier) {
          cardsHTML += '<div data-carousel-card style="flex:0 0 calc(' + CARD_PCT + '% - ' + (CARD_GAP / 2) + 'px);scroll-snap-align:start;">' + renderRewardCard(tier, activeReward) + '</div>';
        });

        // Build dots HTML
        var dotsHTML = '';
        api.REWARD_TIERS.forEach(function (tier, i) {
          var dotClass = i === state.index
            ? 'h-2 w-6 rounded-full bg-brand-600 transition-all duration-300 cursor-pointer'
            : 'h-2 w-2 rounded-full bg-slate-300 hover:bg-slate-400 transition-all duration-300 cursor-pointer';
          dotsHTML += '<button type="button" data-reward-carousel-dot="' + i + '" class="' + dotClass + '" aria-label="Show ' + tier.title + '" aria-current="' + (i === state.index ? 'true' : 'false') + '"></button>';
        });

        var wrapper = document.createElement('div');
        wrapper.setAttribute('data-reward-carousel', '');
        wrapper.setAttribute('aria-roledescription', 'carousel');
        wrapper.setAttribute('aria-label', 'Rewards Exchange');
        wrapper.className = 'w-full relative';

        // Scroll track
        var track = document.createElement('div');
        track.setAttribute('data-carousel-scroll', '');
        track.className = 'flex overflow-x-scroll';
        track.style.cssText = 'gap:' + CARD_GAP + 'px;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;';
        track.innerHTML = cardsHTML;
        wrapper.appendChild(track);

        // Peek fade gradient
        var fade = document.createElement('div');
        fade.className = 'pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg';
        fade.style.background = 'linear-gradient(to right, transparent, rgba(248,250,252,0.9))';
        wrapper.appendChild(fade);

        // Controls bar
        var controls = document.createElement('div');
        controls.className = 'mt-3 flex items-center justify-between gap-3';
        controls.innerHTML = '<button type="button" data-reward-carousel-prev class="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center flex-shrink-0" aria-label="Previous reward"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>'
          + '<div class="flex items-center justify-center gap-2" aria-label="Carousel position">' + dotsHTML + '</div>'
          + '<button type="button" data-reward-carousel-next class="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center flex-shrink-0" aria-label="Next reward"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>';
        wrapper.appendChild(controls);

        container.innerHTML = '';
        container.appendChild(wrapper);

        attachScrollListener(container);

        if (state.index > 0) {
          setTimeout(function () { scrollToIndex(container, state.index, false); }, 50);
        }

        setTimeout(function () { nudgeHint(container); }, 1200);

      } else {
        // ── Subsequent renders: update card content in place ────────────
        var cards = container.querySelectorAll('[data-carousel-card]');
        api.REWARD_TIERS.forEach(function (tier, i) {
          if (cards[i]) cards[i].innerHTML = renderRewardCard(tier, activeReward);
        });
        updateDots(container, state.index, state.tierCount);
      }

      if (window.lucide) window.lucide.createIcons();
    });
  }

  function renderModalItems() {
    const api = rewards();
    const list = document.getElementById('reward-modal-items');
    const title = document.getElementById('reward-modal-title');
    const addBtn = document.getElementById('reward-add-btn');
    const resetBtn = document.getElementById('reward-reset-btn');
    if (!api || !list || !title || !addBtn || !activeTier) return;

    const remaining = getRemainingCount();
    const noun = activeTier.itemType === 'meal' ? 'Meal' : 'Samosa(s)';
    title.textContent = `Select ${remaining} ${noun}!`;
    addBtn.disabled = selectedItemIds.length !== activeTier.selectionLimit;
    addBtn.classList.toggle('bg-brand-600', !addBtn.disabled);
    addBtn.classList.toggle('hover:bg-brand-700', !addBtn.disabled);
    addBtn.classList.toggle('text-white', !addBtn.disabled);
    addBtn.classList.toggle('bg-slate-200', addBtn.disabled);
    addBtn.classList.toggle('text-slate-500', addBtn.disabled);
    addBtn.classList.toggle('cursor-not-allowed', addBtn.disabled);
    if (resetBtn) resetBtn.classList.toggle('hidden', selectedItemIds.length === 0);

    const selectedCounts = selectedItemIds.reduce((counts, itemId) => {
      counts[itemId] = (counts[itemId] || 0) + 1;
      return counts;
    }, {});

    list.innerHTML = activeTier.allowedItemIds.map((itemId) => {
      const item = api.getItem(itemId);
      const count = selectedCounts[itemId] || 0;
      const disabled = remaining === 0;
      return `
        <button type="button" data-reward-item-id="${item.id}" ${disabled ? 'disabled' : ''}
          class="w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-colors ${disabled ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-200 bg-white hover:border-brand-500 hover:bg-orange-50'}">
          <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-md object-cover bg-slate-100 flex-shrink-0">
          <span class="flex-grow min-w-0">
            <span class="block font-bold text-slate-900 leading-tight">${item.name}</span>
            ${item.description ? `<span class="block text-xs text-slate-500 mt-1">${item.description}</span>` : ''}
            ${count ? `<span class="block text-xs font-bold text-brand-600 mt-1">Selected x${count}</span>` : ''}
          </span>
          <span class="w-9 h-9 rounded-full ${disabled ? 'bg-slate-200 text-slate-400' : 'bg-brand-600 text-white'} flex items-center justify-center flex-shrink-0">
            <i data-lucide="plus" class="w-5 h-5"></i>
          </span>
        </button>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  function openRewardModal(rewardId) {
    const api = rewards();
    activeTier = api?.getTier(rewardId) || null;
    selectedItemIds = [];
    if (!activeTier) return;

    const modal = document.getElementById('reward-redemption-modal');
    const confirm = document.getElementById('reward-exit-confirmation');
    if (!modal) return;

    if (confirm) confirm.classList.add('hidden');
    modal.classList.remove('hidden');
    renderModalItems();
  }

  function closeRewardModal(force = false) {
    if (!force && activeTier && selectedItemIds.length < activeTier.selectionLimit) {
      document.getElementById('reward-exit-confirmation')?.classList.remove('hidden');
      return;
    }

    document.getElementById('reward-redemption-modal')?.classList.add('hidden');
    document.getElementById('reward-exit-confirmation')?.classList.add('hidden');
    activeTier = null;
    selectedItemIds = [];
  }

  function addSelectedRewardToCart() {
    const api = rewards();
    if (!api || !activeTier || selectedItemIds.length !== activeTier.selectionLimit) return;

    const result = api.addRewardToCart(activeTier.id, selectedItemIds);
    if (!result.ok) {
      alert(result.error || 'Unable to add reward.');
      return;
    }

    closeRewardModal(true);
    renderRewardCards();
    if (typeof window.openCart === 'function') window.openCart();
  }

  function injectModal() {
    if (document.getElementById('reward-redemption-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="reward-redemption-modal" class="fixed inset-0 z-[110] hidden">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" data-reward-close></div>
        <div class="relative flex min-h-full items-center justify-center p-4">
          <div class="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
            <div class="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
              <div>
                <h2 id="reward-modal-title" class="font-oswald text-3xl font-bold uppercase text-slate-900 leading-none">Select 1 Samosa(s)!</h2>
                <p class="text-slate-500 text-sm mt-2">Your selections will be added to your order.</p>
              </div>
              <button type="button" data-reward-close class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" aria-label="Close reward modal">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
            <div id="reward-modal-items" class="p-5 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50"></div>
            <div class="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <button id="reward-reset-btn" type="button" class="hidden text-sm font-bold text-slate-500 hover:text-slate-800 underline underline-offset-4">Reset selections</button>
              <button id="reward-add-btn" type="button" class="sm:ml-auto rounded-md py-3 px-6 font-oswald text-base font-bold uppercase tracking-wide transition-colors bg-slate-200 text-slate-500 cursor-not-allowed" disabled>
                Add Reward to Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="reward-exit-confirmation" class="fixed inset-0 z-[120] hidden">
        <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"></div>
        <div class="relative flex min-h-full items-center justify-center p-4">
          <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl text-center">
            <h3 class="font-oswald text-2xl font-bold uppercase text-slate-900 leading-tight">Are you sure?</h3>
            <p class="text-slate-600 mt-3">Are you sure you want to exit without redeeming your deal?</p>
            <div class="mt-6 space-y-3">
              <button id="reward-keep-redeeming-btn" type="button" class="w-full rounded-md bg-brand-600 hover:bg-brand-700 text-white font-oswald font-bold uppercase tracking-wide py-3 transition-colors">Keep Redeeming</button>
              <button id="reward-exit-without-btn" type="button" class="w-full rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 transition-colors">Exit Without Redeeming</button>
            </div>
          </div>
        </div>
      </div>
    `);

    document.querySelectorAll('[data-reward-close]').forEach((el) => {
      el.addEventListener('click', () => closeRewardModal(false));
    });
    document.getElementById('reward-add-btn')?.addEventListener('click', addSelectedRewardToCart);
    document.getElementById('reward-reset-btn')?.addEventListener('click', () => {
      selectedItemIds = [];
      renderModalItems();
    });
    document.getElementById('reward-keep-redeeming-btn')?.addEventListener('click', () => {
      document.getElementById('reward-exit-confirmation')?.classList.add('hidden');
    });
    document.getElementById('reward-exit-without-btn')?.addEventListener('click', () => closeRewardModal(true));
    document.getElementById('reward-modal-items')?.addEventListener('click', (event) => {
      const tile = event.target.closest('[data-reward-item-id]');
      if (!tile || !activeTier || getRemainingCount() <= 0) return;
      selectedItemIds.push(tile.dataset.rewardItemId);
      renderModalItems();
    });
  }

  function init() {
    if (!rewards()) return;
    injectModal();
    renderRewardCards();

    document.addEventListener('click', (event) => {
      const redeemBtn = event.target.closest('[data-redeem-reward]');
      if (redeemBtn) {
        event.preventDefault();
        openRewardModal(redeemBtn.dataset.redeemReward);
        return;
      }

      const scrollBtn = event.target.closest('[data-rewards-scroll]');
      if (scrollBtn) {
        event.preventDefault();
        document.getElementById('rewards-exchange')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const prevBtn = event.target.closest('[data-reward-carousel-prev]');
      if (prevBtn) {
        event.preventDefault();
        const container = prevBtn.closest('[data-rewards-exchange]');
        if (container) moveCarousel(container, -1);
        return;
      }

      const nextBtn = event.target.closest('[data-reward-carousel-next]');
      if (nextBtn) {
        event.preventDefault();
        const container = nextBtn.closest('[data-rewards-exchange]');
        if (container) moveCarousel(container, 1);
        return;
      }

      const dotBtn = event.target.closest('[data-reward-carousel-dot]');
      if (dotBtn) {
        event.preventDefault();
        const container = dotBtn.closest('[data-rewards-exchange]');
        if (container) selectCarouselSlide(container, Number(dotBtn.dataset.rewardCarouselDot));
      }
    });
  }

  window.SamosamanRewardsUI = {
    init,
    setPoints(points) {
      currentPoints = Number(points) || 0;
      renderRewardCards();
    },
    refresh: renderRewardCards
  };

  document.addEventListener('DOMContentLoaded', init);
})();
