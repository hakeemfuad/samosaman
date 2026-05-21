const SQUARE_CONFIG_FUNCTION = 'https://us-central1-samosaman-6895e.cloudfunctions.net/getSquarePaymentConfig';
const SQUARE_PROCESS_PAYMENT_FUNCTION = 'https://us-central1-samosaman-6895e.cloudfunctions.net/processPayment';

let squareCard = null;
let pendingPayload = null;
let checkoutInProgress = false;
let squareReady = false;
let checkoutButton = null;

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

function showPaymentStatus(message, isError = true) {
    const statusDiv = document.getElementById('payment-status-container');
    if (!statusDiv) return;

    if (!message) {
        statusDiv.classList.add('hidden');
        statusDiv.innerText = '';
        return;
    }

    statusDiv.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    statusDiv.classList.add(isError ? 'bg-red-100' : 'bg-green-100', isError ? 'text-red-800' : 'text-green-800');
    statusDiv.innerText = message;
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.toggle('hidden', !show);
}

function setCheckoutButtonState({ disabled, label }) {
    if (!checkoutButton) return;
    checkoutButton.disabled = disabled;
    checkoutButton.innerText = label;
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

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw new Error(result.error || `Request failed (${response.status}).`);
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
            existing.addEventListener('error', () => reject(new Error('Unable to load the Square payment SDK.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = sdkUrl;
        script.async = true;
        script.dataset.squarePaymentsSdk = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Unable to load the Square payment SDK.'));
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
            scheduledTime: document.getElementById('del-scheduled-time')?.value || ''
        };

        if (deliveryDetails.timing === 'later' && !deliveryDetails.scheduledTime) {
            throw new Error('Please select a time for your scheduled delivery.');
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
            scheduledTime: document.getElementById('pickup-scheduled-time')?.value || ''
        };

        if (pickupDetails.timing === 'later' && !pickupDetails.scheduledTime) {
            throw new Error('Please select a time for your scheduled pickup.');
        }
    }

    const subtotal = window.SamosamanRewards
        ? window.SamosamanRewards.getPaidSubtotal(cart)
        : cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
        items: cart,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        discount: discount.toFixed(2),
        firstName,
        lastName,
        phone,
        specialInstructions: document.getElementById('special-instructions')?.value || '',
        scheduledTime: (orderType === 'delivery'
            ? document.getElementById('del-scheduled-time')?.value
            : document.getElementById('pickup-scheduled-time')?.value) || null,
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
    const result = await fetchJson(SQUARE_PROCESS_PAYMENT_FUNCTION, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...pendingPayload,
            sourceId
        })
    });

    if (!result.success) {
        throw new Error(result.error || 'Payment failed.');
    }

    finalizeSuccessfulCheckout();
}

async function initializeSquare() {
    const config = await fetchJson(SQUARE_CONFIG_FUNCTION, { method: 'GET' });
    await loadSquareSdk(config.sdkUrl);

    if (!window.Square) {
        throw new Error('Square payment SDK did not initialize.');
    }

    const payments = window.Square.payments(config.appId, config.locationId);
    squareCard = await payments.card();
    await squareCard.attach('#card-container');
    squareReady = true;
    setCheckoutButtonState({ disabled: false, label: 'Place Order' });
}

async function handleCheckoutClick(event) {
    event.preventDefault();
    if (checkoutInProgress) return;
    if (!squareReady || !squareCard) {
        showPaymentStatus('Secure payment is still loading. Please wait a moment.');
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
        setCheckoutButtonState({ disabled: false, label: 'Place Order' });
        showPaymentStatus(error.message || 'Unable to process payment.');
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    checkoutButton = document.getElementById('card-button');
    if (!checkoutButton || !document.getElementById('card-container')) return;

    try {
        await initializeSquare();
        checkoutButton.addEventListener('click', handleCheckoutClick);
    } catch (error) {
        console.error(error);
        setCheckoutButtonState({ disabled: true, label: 'Payment Unavailable' });
        showPaymentStatus(error.message || 'Unable to initialize Square payment.');
    }
});
