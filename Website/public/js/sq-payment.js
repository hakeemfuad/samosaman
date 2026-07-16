const CLOUD_FUNCTIONS_BASE_URL = 'https://us-central1-samosaman-6895e.cloudfunctions.net';
const CHECKOUT_ENVIRONMENTS = {
    production: {
        name: 'production',
        label: 'Production',
        squareConfigFunction: `${CLOUD_FUNCTIONS_BASE_URL}/getSquarePaymentConfig`,
        processPaymentFunction: `${CLOUD_FUNCTIONS_BASE_URL}/processPayment`
    },
    sandbox: {
        name: 'sandbox',
        label: 'Sandbox',
        squareConfigFunction: `${CLOUD_FUNCTIONS_BASE_URL}/getSquarePaymentConfigSandbox`,
        processPaymentFunction: `${CLOUD_FUNCTIONS_BASE_URL}/processPaymentSandbox`
    }
};
const CHECKOUT_ENVIRONMENT_STORAGE_KEY = 'samosaman_checkout_environment';
const CHECKOUT_ENVIRONMENT = resolveCheckoutEnvironment();
window.SAMOSAMAN_MINIMUM_ORDER_SUBTOTAL = window.SAMOSAMAN_MINIMUM_ORDER_SUBTOTAL || 30;
const SQUARE_CARD_STYLE = {
    '.input-container': {
        borderColor: '#cbd5e1',
        borderRadius: '8px',
        borderWidth: '1px'
    },
    '.input-container.is-focus': {
        borderColor: '#0f172a'
    },
    '.input-container.is-error': {
        borderColor: '#dc2626'
    },
    '.message-icon': {
        color: '#64748b'
    },
    '.message-icon.is-error': {
        color: '#dc2626'
    },
    '.message-text': {
        color: '#64748b'
    },
    '.message-text.is-error': {
        color: '#b91c1c'
    },
    input: {
        backgroundColor: '#ffffff',
        color: '#0f172a'
    },
    'input::placeholder': {
        color: '#64748b'
    },
    'input.is-error': {
        color: '#b91c1c'
    }
};

let squareCard = null;
let pendingPayload = null;
let checkoutInProgress = false;
let squareReady = false;
let checkoutButton = null;

function resolveCheckoutEnvironment() {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get('checkoutEnv') || params.get('env') || '').toLowerCase();

    if (CHECKOUT_ENVIRONMENTS[requested]) {
        localStorage.setItem(CHECKOUT_ENVIRONMENT_STORAGE_KEY, requested);
        return CHECKOUT_ENVIRONMENTS[requested];
    }

    const stored = (localStorage.getItem(CHECKOUT_ENVIRONMENT_STORAGE_KEY) || '').toLowerCase();
    return CHECKOUT_ENVIRONMENTS[stored] || CHECKOUT_ENVIRONMENTS.production;
}

function showCheckoutEnvironmentBanner() {
    if (CHECKOUT_ENVIRONMENT.name !== 'sandbox' || document.getElementById('sandbox-checkout-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sandbox-checkout-banner';
    banner.className = 'bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-3 text-center text-sm font-bold';
    banner.textContent = 'Sandbox checkout: use Square test cards. DoorDash will not dispatch a real Dasher.';

    const header = document.querySelector('header');
    if (header?.parentNode) {
        header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
        document.body.prepend(banner);
    }
}

function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address, city, state, zip) {
    const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
    const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${window.GOOGLE_MAPS_API_KEY}`
    );
    const data = await resp.json();
    if (!data || data.status !== 'OK' || !data.results || data.results.length === 0) return null;
    const location = data.results[0].geometry.location;
    return { lat: location.lat, lon: location.lng };
}

async function checkDeliveryDistance(address, city, state, zip, branch) {
    const branchInfo = window.BRANCH_CONFIG?.[branch];
    if (!branchInfo) return;

    const coords = await geocodeAddress(address, city, state, zip);
    if (!coords) return;

    const miles = haversineDistanceMiles(coords.lat, coords.lon, branchInfo.lat, branchInfo.lng);
    const radiusMiles = window.DELIVERY_RADIUS_MILES || 15;

    if (miles > radiusMiles) {
        throw new Error(
            `You're outside of our delivery range. Reach out to us at ${branchInfo.phone} to ensure we have your correct location. (We do honor deliveries beyond ${radiusMiles} miles, we just need to confirm)`
        );
    }
}

function getCurrentUser() {
    return new Promise((resolve) => {
        if (!window.firebase || !firebase.auth) {
            resolve(null);
            return;
        }

        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('samosaman_cart')) || [];
    } catch (error) {
        return [];
    }
}

function formatCheckoutMoney(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getCheckoutPaidSubtotal(cart) {
    if (window.SamosamanRewards) return window.SamosamanRewards.getPaidSubtotal(cart);
    return cart
        .filter(item => item?.isReward !== true)
        .reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 0;
            return sum + (price * quantity);
        }, 0);
}

function getCheckoutMinimumOrderState(cart = getCart()) {
    const minimum = Number(window.SAMOSAMAN_MINIMUM_ORDER_SUBTOTAL) || 30;
    const subtotal = Math.round(getCheckoutPaidSubtotal(cart) * 100) / 100;
    const shortfall = Math.max(0, Math.round((minimum - subtotal) * 100) / 100);
    return {
        minimum,
        subtotal,
        shortfall,
        meetsMinimum: shortfall <= 0
    };
}

function getCheckoutMinimumOrderMessage(state = getCheckoutMinimumOrderState()) {
    return `Delivery and pickup orders require a ${formatCheckoutMoney(state.minimum)} minimum before tax, tip, or discounts. Add ${formatCheckoutMoney(state.shortfall)} more to continue.`;
}

function validateCheckoutMinimumOrder(cart) {
    const state = getCheckoutMinimumOrderState(cart);
    if (!state.meetsMinimum) {
        throw new Error(getCheckoutMinimumOrderMessage(state));
    }
    return state;
}

function buildServerCartPayload(cart) {
    return cart.map((item) => {
        const payload = {
            id: item.id,
            quantity: item.quantity
        };

        if (item.isReward === true && item.reward) {
            payload.isReward = true;
            payload.reward = {
                id: item.reward.id,
                itemId: item.reward.itemId
            };
        }

        return payload;
    });
}

function getSpecialInstructions(orderType) {
    const activeFieldId = orderType === 'delivery'
        ? 'delivery-special-instructions'
        : 'pickup-special-instructions';

    return document.getElementById(activeFieldId)?.value
        || document.getElementById('special-instructions')?.value
        || '';
}

function showPaymentStatus(message, isError = true) {
    const statusDiv = document.getElementById('payment-status-container');
    if (!statusDiv) return;

    if (!message) {
        statusDiv.classList.add('hidden');
        statusDiv.innerText = '';
        return;
    }

    statusDiv.classList.remove(
        'hidden',
        'bg-green-50',
        'text-green-800',
        'border-green-200',
        'bg-red-50',
        'text-red-800',
        'border-red-200'
    );
    statusDiv.classList.add(
        'border',
        isError ? 'bg-red-50' : 'bg-green-50',
        isError ? 'text-red-800' : 'text-green-800',
        isError ? 'border-red-200' : 'border-green-200'
    );
    statusDiv.innerText = message;
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !show);
}

function setCheckoutButtonState({ disabled, label }) {
    if (!checkoutButton) return;

    const minimumState = getCheckoutMinimumOrderState();
    const blockedByMinimum = !disabled && !minimumState.meetsMinimum;
    checkoutButton.disabled = disabled || blockedByMinimum;
    checkoutButton.innerText = blockedByMinimum ? `Add ${formatCheckoutMoney(minimumState.shortfall)} More` : label;
    checkoutButton.title = blockedByMinimum ? getCheckoutMinimumOrderMessage(minimumState) : '';
    checkoutButton.classList.toggle('opacity-50', blockedByMinimum);
    checkoutButton.classList.toggle('cursor-not-allowed', blockedByMinimum);
}

function requireValue(selector, message) {
    const value = document.querySelector(selector)?.value?.trim() || '';
    if (!value) throw new Error(message);
    return value;
}

function getSuccessCustomerName() {
    return document.getElementById('fname')?.value?.trim() || 'there';
}

function showSuccessModal() {
    const modal = document.getElementById('success-modal');
    const nameEl = document.getElementById('success-customer-name');
    if (nameEl) nameEl.textContent = getSuccessCustomerName();
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        showPaymentStatus('Success! Order complete.', false);
    }
}

function finalizeSuccessfulCheckout() {
    localStorage.removeItem('samosaman_cart');
    if (window.SamosamanRewards) window.SamosamanRewards.clearActiveReward();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    setCheckoutButtonState({ disabled: true, label: 'Order Placed' });
    showLoadingOverlay(false);
    showSuccessModal();

    window.setTimeout(() => {
        window.location.href = 'index.html';
    }, 5000);
}

function codedError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw codedError(result.code || null, result.error || `Request failed (${response.status}).`);
    }
    return result;
}

function loadSquareSdk(sdkUrl) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-square-payments-sdk="true"]');
        if (existing) {
            if (window.Square) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(codedError('SQUARE_SDK_LOAD', 'Unable to load the Square payment SDK.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = sdkUrl;
        script.async = true;
        script.dataset.squarePaymentsSdk = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(codedError('SQUARE_SDK_LOAD', 'Unable to load the Square payment SDK.'));
        document.head.appendChild(script);
    });
}

async function buildCheckoutPayload() {
    const user = await getCurrentUser();
    const uid = user ? user.uid : null;
    const cart = getCart();

    if (cart.length === 0) {
        throw new Error('Your cart is empty.');
    }

    const minimumState = validateCheckoutMinimumOrder(cart);
    const subtotal = minimumState.subtotal;

    const firstName = requireValue('#fname', 'Please enter your first name.');
    const lastName = requireValue('#lname', 'Please enter your last name.');
    const email = requireValue('#email', 'Please enter your email address.');
    const phone = requireValue('#phone', 'Please enter your phone number.');

    const orderTypeInput = document.querySelector('input[name="orderType"]:checked');
    const orderType = orderTypeInput ? orderTypeInput.value : 'pickup';
    const tipAmount = window.checkoutTipAmount || 0;
    let deliveryDetails = null;
    let pickupDetails = null;
    let finalBranch = '';

    if (orderType === 'delivery') {
        finalBranch = document.getElementById('delivery-branch')?.value || 'Burlington';
        deliveryDetails = {
            address: requireValue('#del-address', 'Please enter your delivery address.'),
            city: requireValue('#del-city', 'Please enter your delivery city.'),
            state: document.getElementById('del-state')?.value || 'VT',
            zip: requireValue('#del-zip', 'Please enter your delivery zip code.'),
            branch: finalBranch,
            timing: document.querySelector('input[name="del-timing"]:checked')?.value || 'now',
            scheduledTime: document.getElementById('del-scheduled-time')?.value || '',
            scheduledDate: window.scheduledOrderDate || null
        };

        if (deliveryDetails.timing === 'later' && !deliveryDetails.scheduledTime) {
            throw new Error('Please select a time for your scheduled delivery.');
        }
        if (deliveryDetails.timing === 'later' && !deliveryDetails.scheduledDate) {
            deliveryDetails.scheduledDate = new Date().toLocaleDateString('en-CA', {
                timeZone: 'America/New_York'
            });
        }

        await checkDeliveryDistance(
            deliveryDetails.address,
            deliveryDetails.city,
            deliveryDetails.state,
            deliveryDetails.zip,
            deliveryDetails.branch
        );
    } else {
        finalBranch = document.getElementById('pickup-branch')?.value || 'Burlington';
        pickupDetails = {
            branch: finalBranch,
            timing: document.querySelector('input[name="pickup-timing"]:checked')?.value || 'now',
            scheduledTime: document.getElementById('pickup-scheduled-time')?.value || '',
            scheduledDate: window.scheduledOrderDate || null
        };

        if (pickupDetails.timing === 'later' && !pickupDetails.scheduledTime) {
            throw new Error('Please select a time for your scheduled pickup.');
        }
    }

    const discount = window.scheduledOrderDiscount ? subtotal * window.scheduledOrderDiscount : 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * 0.07;
    const finalTotal = taxableAmount + tax + tipAmount;
    const selectedReward = window.SamosamanRewards
        ? window.SamosamanRewards.buildRewardPayload(cart)
        : (window.selectedReward || null);

    return {
        amount: finalTotal.toFixed(2),
        tipAmount: tipAmount.toFixed(2),
        orderType,
        branch: finalBranch,
        deliveryDetails,
        pickupDetails,
        email,
        uid,
        items: buildServerCartPayload(cart),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        discount: discount.toFixed(2),
        firstName,
        lastName,
        phone,
        specialInstructions: getSpecialInstructions(orderType),
        scheduledTime: (orderType === 'delivery'
            ? document.getElementById('del-scheduled-time')?.value
            : document.getElementById('pickup-scheduled-time')?.value) || null,
        scheduledDate: (orderType === 'delivery' ? deliveryDetails?.scheduledDate : pickupDetails?.scheduledDate) || null,
        selectedReward
    };
}

function buildVerificationDetails(payload) {
    const billingContact = {
        givenName: payload.firstName,
        familyName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        countryCode: 'US'
    };

    if (payload.deliveryDetails) {
        billingContact.addressLines = [payload.deliveryDetails.address];
        billingContact.city = payload.deliveryDetails.city;
        billingContact.state = payload.deliveryDetails.state;
    }

    return {
        amount: payload.amount,
        billingContact,
        currencyCode: 'USD',
        intent: 'CHARGE',
        customerInitiated: true,
        sellerKeyedIn: false
    };
}

async function tokenizeSquareCard() {
    const tokenResult = await squareCard.tokenize(buildVerificationDetails(pendingPayload));

    if (tokenResult.status === 'OK') {
        return tokenResult.token;
    }

    const firstError = Array.isArray(tokenResult.errors) ? tokenResult.errors[0] : null;
    throw new Error(firstError?.message || `Card tokenization failed: ${tokenResult.status}`);
}

async function submitTokenToBackend(sourceId) {
    const result = await fetchJson(CHECKOUT_ENVIRONMENT.processPaymentFunction, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...pendingPayload,
            checkoutEnvironment: CHECKOUT_ENVIRONMENT.name,
            sourceId
        })
    });

    if (!result.success) {
        throw new Error(result.error || 'Payment failed.');
    }

    finalizeSuccessfulCheckout();
}

async function initializeSquare() {
    const config = await fetchJson(CHECKOUT_ENVIRONMENT.squareConfigFunction, { method: 'GET' });
    await loadSquareSdk(config.sdkUrl);

    if (!window.Square) {
        throw codedError('SQUARE_SDK_INIT', 'Square payment SDK did not initialize.');
    }

    const payments = window.Square.payments(config.appId, config.locationId);
    squareCard = await payments.card({ style: SQUARE_CARD_STYLE });
    await squareCard.attach('#card-container');
    document.getElementById('card-container')?.classList.add('square-ready');
    squareReady = true;
    setCheckoutButtonState({
        disabled: false,
        label: CHECKOUT_ENVIRONMENT.name === 'sandbox' ? 'Place Sandbox Order' : 'Place Order'
    });
}

async function handleCheckoutClick(event) {
    event.preventDefault();
    if (checkoutInProgress) return;
    if (!squareReady || !squareCard) {
        showPaymentStatus(window.SamosamanErrors.MESSAGES.PAYMENT_STILL_LOADING);
        return;
    }

    try {
        checkoutInProgress = true;
        showPaymentStatus('', false);
        pendingPayload = await buildCheckoutPayload();
        showLoadingOverlay(true);
        setCheckoutButtonState({ disabled: true, label: 'Processing Payment...' });
        const sourceId = await tokenizeSquareCard();
        await submitTokenToBackend(sourceId);
    } catch (error) {
        console.error(error);
        checkoutInProgress = false;
        pendingPayload = null;
        showLoadingOverlay(false);
        setCheckoutButtonState({
            disabled: false,
            label: CHECKOUT_ENVIRONMENT.name === 'sandbox' ? 'Place Sandbox Order' : 'Place Order'
        });
        showPaymentStatus(window.SamosamanErrors.resolve(error).message);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    checkoutButton = document.getElementById('card-button');
    if (!checkoutButton || !document.getElementById('card-container')) return;
    showCheckoutEnvironmentBanner();

    try {
        await initializeSquare();
        checkoutButton.addEventListener('click', handleCheckoutClick);
    } catch (error) {
        console.error(error);
        setCheckoutButtonState({ disabled: true, label: 'Payment Unavailable' });
        showPaymentStatus(window.SamosamanErrors.resolve(error).message);
    }
});
