const CART_KEY = 'samosaman_cart';
const TAX_RATE = 0.07; // Estimated 7% tax

// --- NEW: Order Type Modal HTML (Copied from checkout-options.html style) ---
const ORDER_TYPE_MODAL_HTML = `
<div id="order-type-modal" class="fixed inset-0 z-[100] hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div id="type-modal-backdrop" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity opacity-0 duration-300"></div>
    <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div id="type-modal-panel" class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg opacity-0 translate-y-4 duration-300 ease-out">
                <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                            <h3 class="text-xl font-oswald font-bold leading-6 text-slate-900 text-center mb-8" id="modal-title">How would you like to receive your order?</h3>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <button onclick="proceedToCheckout('delivery')" class="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition-all group">
                                    <div class="p-3 bg-slate-100 rounded-full group-hover:bg-brand-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                                    </div>
                                    <span class="font-bold text-lg">Delivery</span>
                                </button>

                                <button onclick="proceedToCheckout('pickup')" class="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition-all group">
                                    <div class="p-3 bg-slate-100 rounded-full group-hover:bg-brand-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
                                    </div>
                                    <span class="font-bold text-lg">Pickup</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

/**
 * loads the cart array from local storage
 */
function getCart() {
    const cartJson = localStorage.getItem(CART_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
}

/**
 * saves the cart array to local storage and updates UI
 */
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    renderCartDrawer(); // Re-render drawer if it's open
}

/**
 * Updates the navigation badge based on total quantity
 */
function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    
    if (badge) {
        badge.innerText = totalItems;
        
        // Always ensure it is visible
        badge.classList.remove('opacity-0');

        // Only animate when items are actually added (count > 0)
        if (totalItems > 0) {
            badge.classList.remove('animate-pop');
            void badge.offsetWidth; 
            badge.classList.add('animate-pop');
        }
    }
}

/**
 * Adds an item to the cart
 */
function addToCart(id, name, price, image) {
    let cart = getCart();
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: parseFloat(price),
            quantity: 1,
            image: image // We now store the image path for the display
        });
    }
    saveCart(cart);
}

/**
 * Removes an item from the cart
 */
function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
}

/**
 * Formats number as USD currency
 */
function formatMoney(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/**
 * Renders the Cart Drawer contents
 */
function renderCartDrawer() {
    const cart = getCart();
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const emptyMsg = document.getElementById('cart-empty-state');
    const footer = document.getElementById('cart-footer');

    if (!container) return; // Guard clause if drawer doesn't exist

    container.innerHTML = '';
    
    if (cart.length === 0) {
        emptyMsg.classList.remove('hidden');
        footer.classList.add('hidden');
        return;
    } else {
        emptyMsg.classList.add('hidden');
        footer.classList.remove('hidden');
    }

    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        // Create the card matching the reference style
        const itemHTML = `
            <div class="flex gap-4 py-6 border-b border-slate-100">
                <div class="w-20 h-20 flex-shrink-0 bg-slate-50 rounded-md overflow-hidden">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                
                <div class="flex-1 flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-slate-800 text-lg leading-tight mb-1">${item.name}</h4>
                            <p class="text-sm text-slate-500">Qty: ${item.quantity}</p>
                        </div>
                        <span class="font-bold text-slate-900">${formatMoney(itemTotal)}</span>
                    </div>
                    
                    <div class="flex items-center gap-4 mt-2">
                        <button onclick="removeFromCart('${item.id}')" class="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    });

    // Calculate Totals
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    subtotalEl.innerText = formatMoney(subtotal);
    taxEl.innerText = formatMoney(tax);
    totalEl.innerText = formatMoney(total);
    
    // --- UPDATED CHECKOUT BUTTON LOGIC ---
    const checkoutBtn = document.querySelector('#cart-footer button:last-child');
    if (checkoutBtn) {
        checkoutBtn.onclick = handleCheckoutClick;
    }
}

// --- NEW HELPER: Handle checkout click dependent on auth state ---
function handleCheckoutClick(e) {
    if(e) e.preventDefault();
    
    const user = firebase.auth().currentUser;
    
    if (user) {
        // SCENARIO: User is signed in.
        // 1. Ensure modal exists in DOM
        injectOrderTypeModal();
        
        // 2. Show the modal
        const modal = document.getElementById('order-type-modal');
        const backdrop = document.getElementById('type-modal-backdrop');
        const panel = document.getElementById('type-modal-panel');
        
        if (modal) {
            modal.classList.remove('hidden');
            // Animate in
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                panel.classList.remove('opacity-0', 'translate-y-4');
                panel.classList.add('translate-y-0');
            }, 10);
            
            // Allow closing by clicking backdrop
            backdrop.onclick = () => {
                backdrop.classList.add('opacity-0');
                panel.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => modal.classList.add('hidden'), 300);
            };
        }
    } else {
        // SCENARIO: Guest. Redirect to options page.
        window.location.href = 'checkout-options.html';
    }
}

// --- NEW HELPER: Redirect from modal to checkout.html ---
window.proceedToCheckout = function(type) {
    // Redirects to the new checkout page with the selected type
    window.location.href = `checkout.html?type=${type}`;
};

// --- NEW HELPER: Inject modal HTML if missing ---
function injectOrderTypeModal() {
    if (!document.getElementById('order-type-modal')) {
        document.body.insertAdjacentHTML('beforeend', ORDER_TYPE_MODAL_HTML);
    }
}

// Drawer Toggle Logic
function openCart() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');
    
    renderCartDrawer();
    
    overlay.classList.remove('hidden');
    // slight delay to allow display:block to apply before opacity transition
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        sidebar.classList.remove('translate-x-full');
    }, 10);
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeCart() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');

    sidebar.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }, 300);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Pre-inject modal so it's ready
    injectOrderTypeModal();

    // Attach Add to Cart Listeners
    const buttons = document.querySelectorAll('.add-to-bag-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const card = btn.closest('.group');
            const imageSrc = card ? card.querySelector('img').getAttribute('src') : '';

            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const price = btn.dataset.price;

            if(id && name && price) {
                addToCart(id, name, price, imageSrc);
            }
        });
    });

    // Open Cart Button Listener (Nav Icon)
    const cartTrigger = document.getElementById('open-cart-btn');
    if (cartTrigger) {
        cartTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    }

    // Close Cart Listeners
    const closeBtn = document.getElementById('close-cart-btn');
    const overlay = document.getElementById('cart-overlay');
    const addItemsBtn = document.getElementById('add-items-btn'); 

    if(closeBtn) closeBtn.addEventListener('click', closeCart);
    if(overlay) overlay.addEventListener('click', closeCart);
    if(addItemsBtn) addItemsBtn.addEventListener('click', closeCart);
});