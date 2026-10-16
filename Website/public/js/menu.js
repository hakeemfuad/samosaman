(() => {
    // --- CONFIGURATION ---
    // Hours use 24h format in America/New_York.
    // Days: 0=Sun, 1=Mon, ..., 6=Sat
    const BURLINGTON_TIME_ZONE = 'America/New_York';
    const BURLINGTON_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
        timeZone: BURLINGTON_TIME_ZONE,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });
    const DAY_INDEXES = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6
    };
    const branchConfig = {
        hours: [
            { days: [1, 2, 3, 4], label: 'Mon – Thu', open: 10, close: 21 },
            { days: [5, 6], label: 'Fri – Sat', open: 10, close: 22 },
            { days: [0], label: 'Sunday', open: 10, close: 20 }
        ]
    };

    // The rail and the existing modal use the same schedule as the status line.
    function renderMenuHours() {
        document.getElementById('menu-hours-list').innerHTML = branchConfig.hours.map(rule =>
            `<dt>${rule.label}</dt><dd>${formatTime(rule.open, true)} – ${formatTime(rule.close, true)}</dd>`
        ).join('');
        document.getElementById('modal-hours-list').innerHTML = branchConfig.hours.map((rule, index) =>
            `<div class="flex justify-between items-center py-2 ${index < branchConfig.hours.length - 1 ? 'border-b border-slate-100' : ''}">
                <span class="font-medium text-slate-600">${rule.label}</span>
                <span class="font-bold text-slate-900">${formatTime(rule.open)} – ${formatTime(rule.close)}</span>
            </div>`
        ).join('');
    }

    function getStoreTimeParts(date = new Date()) {
        const parts = Object.fromEntries(
            BURLINGTON_DATE_FORMATTER.formatToParts(date)
                .filter(part => part.type !== 'literal')
                .map(part => [part.type, part.value])
        );

        return {
            day: DAY_INDEXES[parts.weekday],
            hour: Number(parts.hour) + (Number(parts.minute) / 60)
        };
    }

    function updateHoursStatus(date = new Date()) {
        const storeTime = getStoreTimeParts(date);
        const currentDay = storeTime.day;
        const currentHour = storeTime.hour;

        let isOpen = false;
        let closingTime = null;
        let nextOpenTime = null;
        let nextOpenDay = null;

        // 1. Check if currently open
        // We check "Yesterday's" shift first (e.g. it's Sat 1AM, but that's Fri night shift)
        const prevDay = (currentDay + 6) % 7;
        const prevRule = branchConfig.hours.find(r => r.days.includes(prevDay));
        if (prevRule && prevRule.close > 24) {
            // If yesterday's shift goes past midnight
            const closeHourNextDay = prevRule.close - 24;
            if (currentHour < closeHourNextDay) {
                isOpen = true;
                closingTime = formatTime(closeHourNextDay, true);
            }
        }

        // Check "Today's" shift
        if (!isOpen) {
            const todayRule = branchConfig.hours.find(r => r.days.includes(currentDay));
            if (todayRule) {
                if (currentHour >= todayRule.open && currentHour < todayRule.close) {
                    isOpen = true;
                    // Format closing time (handle > 24)
                    const closeH = todayRule.close > 24 ? todayRule.close - 24 : todayRule.close;
                    closingTime = formatTime(closeH, true);
                }
            }
        }

        // 2. If Closed, find next open time
        if (!isOpen) {
            // Simple lookahead for next 7 days
            for (let i = 0; i < 8; i++) {
                const checkDay = (currentDay + i) % 7;
                const rule = branchConfig.hours.find(r => r.days.includes(checkDay));
                if (rule) {
                    // If it's today, make sure open time is in future
                    if (i === 0 && currentHour >= rule.open) continue;

                    nextOpenTime = formatTime(rule.open, true);
                    nextOpenDay = i === 0 ? "today" : (i === 1 ? "tomorrow" : getDayName(checkDay));
                    break;
                }
            }
        }

        // 3. Update DOM
        const statusText = document.getElementById('hours-status-text');
        const modalBadge = document.getElementById('modal-status-badge');
        const modalText = document.getElementById('modal-status-text');
        const ping = document.getElementById('status-ping');
        const dot = document.getElementById('status-dot');

        document.getElementById('menu-hours-trigger').dataset.open = String(isOpen);

        if (isOpen) {
            statusText.textContent = `Open now · until ${closingTime}`;

            // Modal Green Style
            modalBadge.className = "mt-6 p-3 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center gap-2";
            modalText.className = "text-sm font-bold text-green-700";
            modalText.innerText = `Open until ${closingTime}`;
            ping.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75";
            dot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500";
        } else {
            const openingText = nextOpenTime ? `opens ${nextOpenDay} at ${nextOpenTime}` : 'view opening hours';
            statusText.textContent = `Closed · ${openingText}`;

            // Modal Red/Gray Style
            modalBadge.className = "mt-6 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center gap-2";
            modalText.className = "text-sm font-bold text-slate-600";
            modalText.textContent = `Closed · ${openingText}`;
            ping.className = "hidden"; // No ping when closed
            dot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400";
        }
    }

    // Helper: Format decimal hour (14.5 -> 2:30 PM)
    function formatTime(decimalTime, compact = false) {
        const hrs = Math.floor(decimalTime);
        const mins = Math.round((decimalTime - hrs) * 60);
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const formattedHrs = hrs % 12 || 12;
        const formattedMins = mins < 10 ? '0' + mins : mins;
        return `${formattedHrs}${compact && mins === 0 ? '' : ':' + formattedMins} ${ampm}`;
    }

    function getDayName(dayIndex) {
        return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIndex];
    }

    // Preserve the hours modal, with keyboard dismissal and focus restoration.
    let hoursReturnFocus;
    let hoursHideTimer;
    let hoursShowTimer;
    let hoursBodyOverflow;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function openHoursModal() {
        const modal = document.getElementById('hours-modal');
        const backdrop = document.getElementById('hours-backdrop');
        const panel = document.getElementById('hours-panel');

        if (!modal.classList.contains('hidden')) return;
        clearTimeout(hoursHideTimer);
        hoursReturnFocus = document.activeElement;
        hoursBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.getElementById('menu-hours-trigger').setAttribute('aria-expanded', 'true');
        updateHoursStatus();
        modal.classList.remove('hidden');
        document.getElementById('hours-close-btn').focus({ preventScroll: true });
        // Small delay for animation
        hoursShowTimer = setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            panel.classList.remove('opacity-0', 'translate-y-4');
        }, 10);
    }

    function closeHoursModal() {
        const modal = document.getElementById('hours-modal');
        const backdrop = document.getElementById('hours-backdrop');
        const panel = document.getElementById('hours-panel');

        clearTimeout(hoursShowTimer);
        document.getElementById('menu-hours-trigger').setAttribute('aria-expanded', 'false');
        backdrop.classList.add('opacity-0');
        panel.classList.add('opacity-0', 'translate-y-4');

        clearTimeout(hoursHideTimer);
        hoursHideTimer = setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = hoursBodyOverflow || '';
            hoursReturnFocus?.focus({ preventScroll: true });
        }, reducedMotion.matches ? 0 : 300);
    }

    document.getElementById('hours-modal').addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeHoursModal();
        } else if (event.key === 'Tab') {
            // The close button is the only interactive element in this dialog.
            event.preventDefault();
            document.getElementById('hours-close-btn').focus();
        }
    });

    function initializeOrderPreference() {
        const buttons = [...document.querySelectorAll('[data-order-type]')];
        const select = type => buttons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.orderType === type));
        });
        let preference = 'pickup';
        try {
            if (localStorage.getItem('samosaman_order_type') === 'delivery') preference = 'delivery';
        } catch { /* A blocked storage policy must not disable the control. */ }
        select(preference);
        buttons.forEach(button => button.addEventListener('click', () => {
            const type = button.dataset.orderType;
            select(type);
            try {
                localStorage.setItem('samosaman_order_type', type);
            } catch { /* Keep the preference usable for this visit. */ }
        }));
        // Checkout still owns orderType; reading this preference there is a follow-up.
    }

    function initializeCategoryNavigation() {
        const links = [...document.querySelectorAll('.menu-category')];
        const sections = [...document.querySelectorAll('.menu-section')];
        const sidebar = document.querySelector('.menu-sidebar');
        const categoryList = document.querySelector('.menu-categories');
        const desktop = window.matchMedia('(min-width: 768px)');
        let observer;

        function setActive(id) {
            links.forEach(link => {
                const active = link.hash === '#' + id;
                if (active) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
            // Reveal the current chip horizontally without moving the document.
            if (!desktop.matches) {
                const active = links.find(link => link.hash === '#' + id);
                const item = active.getBoundingClientRect();
                const row = categoryList.getBoundingClientRect();
                if (item.left < row.left + 16) categoryList.scrollLeft += item.left - row.left - 16;
                else if (item.right > row.right - 16) categoryList.scrollLeft += item.right - row.right + 16;
            }
        }

        function updateActiveSection() {
            const offset = parseFloat(getComputedStyle(document.body).getPropertyValue('--menu-scroll-offset'));
            let current = sections[0];
            // The last heading to cross the reading line remains current in a tall section.
            for (const section of sections) {
                if (section.getBoundingClientRect().top <= offset + 40) current = section;
            }
            setActive(current.id);
        }

        function observeSections() {
            const offset = desktop.matches ? 104 : 80 + sidebar.offsetHeight;
            document.body.style.setProperty('--menu-scroll-offset', `${offset}px`);
            document.body.style.setProperty('--menu-sidebar-height', `${sidebar.offsetHeight}px`);
            observer?.disconnect();
            // Observe a thin reading band below the fixed navigation. This works for
            // tall sections as well as the shorter meals section, in either direction.
            const readingLine = Math.min(offset + 40, window.innerHeight - 1);
            observer = new IntersectionObserver(updateActiveSection, {
                rootMargin: `-${readingLine}px 0px -${Math.max(0, window.innerHeight - readingLine - 1)}px 0px`,
                threshold: 0
            });
            sections.forEach(section => observer.observe(section));
            updateActiveSection();
        }

        links.forEach(link => link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            const target = document.getElementById(link.hash.slice(1));
            target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
            target.focus({ preventScroll: true });
            history.replaceState(null, '', link.hash);
        }));
        new ResizeObserver(observeSections).observe(sidebar);
        window.addEventListener('resize', observeSections);
        window.addEventListener('pageshow', updateActiveSection);
        observeSections();
    }

    function initializeBagBar() {
        const bar = document.getElementById('menu-bag-bar');
        const count = document.getElementById('menu-bag-count');
        const total = document.getElementById('menu-bag-total');
        function refresh() {
            let cart;
            try { cart = window.getCart(); } catch { cart = []; }
            const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
            const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
            count.textContent = `${quantity} ${quantity === 1 ? 'item' : 'items'}`;
            // Match the reference: item total before the drawer's estimated tax.
            total.textContent = window.formatMoney(subtotal);
            bar.setAttribute('aria-label', `View bag, ${count.textContent}, subtotal ${total.textContent}`);
            bar.hidden = quantity === 0;
            document.body.classList.toggle('menu-has-items', quantity > 0);
        }
        bar.addEventListener('click', () => window.openCart());
        // cart.js already updates its badge for every add/remove/save. Observe that
        // shared signal so no second cart state or changes to cart.js are needed.
        new MutationObserver(refresh).observe(document.getElementById('cart-badge'), {
            childList: true, characterData: true, subtree: true
        });
        window.addEventListener('storage', event => {
            if (event.key === 'samosaman_cart' || event.key === null) refresh();
        });
        window.addEventListener('pageshow', refresh);
        refresh();
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderMenuHours();
        updateHoursStatus();
        initializeOrderPreference();
        initializeCategoryNavigation();
        initializeBagBar();
    });
    setInterval(() => updateHoursStatus(), 60000);
    window.updateHoursStatus = updateHoursStatus;
    window.openHoursModal = openHoursModal;
    window.closeHoursModal = closeHoursModal;
})();
