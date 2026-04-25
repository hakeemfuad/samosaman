const appId = 'sandbox-sq0idb-TtnfyBuN72Zbeow2p8S_rA';
const locationId = 'L2KAE6PSA7JEB';

// Use centralized branch configuration from branch-config.js
// Access via window.BRANCH_CONFIG and window.DELIVERY_RADIUS_MILES

// Calculate distance between two coordinates in miles using the Haversine formula
function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a delivery address using Google Maps Geocoding API
async function geocodeAddress(address, city, state, zip) {
    if (!window.GOOGLE_MAPS_API_KEY) {
        throw new Error(
            'Google Maps configuration is missing. Create public/js/app-config.js and set APP_CONFIG.googleMapsApiKey.'
        );
    }

    const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
    const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${window.GOOGLE_MAPS_API_KEY}`
    );
    const data = await resp.json();
    if (!data || data.status !== 'OK' || !data.results || data.results.length === 0) return null;
    const location = data.results[0].geometry.location;
    return { lat: location.lat, lon: location.lng };
}

// Check if the delivery address is within the configured delivery radius of the selected branch
async function checkDeliveryDistance(address, city, state, zip, branch) {
    const branchInfo = window.BRANCH_CONFIG?.[branch];
    if (!branchInfo) return; // Unknown branch — skip check

    const coords = await geocodeAddress(address, city, state, zip);
    if (!coords) return; // Could not geocode — don't block the order

    const miles = haversineDistanceMiles(coords.lat, coords.lon, branchInfo.lat, branchInfo.lng);
    const radiusMiles = window.DELIVERY_RADIUS_MILES || 15;

    if (miles > radiusMiles) {
        throw new Error(
            `You're outside of our delivery range. Reach out to us at ${branchInfo.phone} to ensure we have your correct location. (We do honor deliveries beyond ${radiusMiles} miles, we just need to confirm)`
        );
    }
}

async function initializeCard(payments) {
    const card = await payments.card();
    await card.attach('#card-container');
    return card;
}

// [NEW] Helper to get current Firebase User safely
function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// [NEW] Helper to Calculate Total and Build Payment Request
function buildPaymentRequest(payments) {
    const CART_KEY = 'samosaman_cart';
    const TAX_RATE = 0.07;

    // 1. Get Cart Total
    const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 2. Get Tip (Global var from checkout.html)
    const tipAmount = window.checkoutTipAmount || 0;

    // 3. Calculate Final Total
    const total = subtotal + (subtotal * TAX_RATE) + tipAmount;

    // 4. Return Square Payment Request Object
    return payments.paymentRequest({
        countryCode: 'US',
        currencyCode: 'USD',
        total: {
            amount: total.toFixed(2),
            label: 'Samosaman Order',
            pending: false
        }
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    // Check if the container exists (prevent errors on other pages)
    if (!document.getElementById('card-container')) return;

    if (!window.Square) {
        throw new Error('Square.js failed to load properly');
    }

    const payments = Square.payments(appId, locationId);
    let card;

    try {
        card = await initializeCard(payments);
    } catch (e) {
        console.error('Initializing Card failed', e);
        return;
    }

    const cardButton = document.getElementById('card-button');
    const saveCardCheckbox = document.getElementById('save-card-checkbox');

    cardButton.addEventListener('click', async function (event) {
        event.preventDefault();

        // Determine which payment method is selected
        let selectedMethod = 'newCard';
        const methodRadio = document.querySelector('input[name="paymentMethod"]:checked');
        if (methodRadio) selectedMethod = methodRadio.value;

        cardButton.disabled = true;
        cardButton.innerText = "Processing...";

        try {
            const user = await getCurrentUser();
            const uid = user ? user.uid : null;
            let token = null;

            // --- 1. GATHER ORDER DETAILS (Re-calculate for safety) ---
            const CART_KEY = 'samosaman_cart';
            const TAX_RATE = 0.07;
            const cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

            // Get Order Type & Delivery Details
            const orderTypeInput = document.querySelector('input[name="orderType"]:checked');
            const orderType = orderTypeInput ? orderTypeInput.value : 'pickup';

            let deliveryDetails = null;
            let pickupDetails = null; // New variable for pickup details
            // Get Tip from global window object
            const tipAmount = window.checkoutTipAmount || 0;

            // DETERMINE BRANCH and DETAILS based on order type
            let finalBranch = '';

            if (orderType === 'delivery') {
                finalBranch = document.getElementById('delivery-branch').value;

                deliveryDetails = {
                    address: document.getElementById('del-address').value,
                    city: document.getElementById('del-city').value,
                    state: document.getElementById('del-state').value,
                    zip: document.getElementById('del-zip').value,
                    branch: finalBranch,
                    timing: document.querySelector('input[name="del-timing"]:checked').value,
                    scheduledTime: document.getElementById('del-scheduled-time').value
                };

                // Basic Validation
                if (!deliveryDetails.address || !deliveryDetails.city || !deliveryDetails.zip) {
                    throw new Error("Please complete all delivery address fields.");
                }
                if (deliveryDetails.timing === 'later' && !deliveryDetails.scheduledTime) {
                    throw new Error("Please select a time for your scheduled delivery.");
                }

                // Check if delivery address is within 15 miles of the selected branch
                await checkDeliveryDistance(
                    deliveryDetails.address,
                    deliveryDetails.city,
                    deliveryDetails.state,
                    deliveryDetails.zip,
                    deliveryDetails.branch
                );
            } else {
                // Pickup
                finalBranch = document.getElementById('pickup-branch').value;

                pickupDetails = {
                    branch: finalBranch,
                    timing: document.querySelector('input[name="pickup-timing"]:checked').value,
                    scheduledTime: document.getElementById('pickup-scheduled-time').value
                };

                // Validation for scheduled pickup
                if (pickupDetails.timing === 'later' && !pickupDetails.scheduledTime) {
                    throw new Error("Please select a time for your scheduled pickup.");
                }
            }

            // --- 2. TOKENIZATION LOGIC ---
            if (selectedMethod === 'newCard') {
                const result = await card.tokenize();
                if (result.status === 'OK') {
                    token = result.token;
                } else {
                    let errorMessage = `Tokenization failed: ${result.status}`;
                    if (result.errors) errorMessage += ` - ${result.errors[0].message}`;
                    throw new Error(errorMessage);
                }

            } else if (selectedMethod === 'googlePay') {
                // --- GOOGLE PAY FLOW ---
                try {
                    const paymentRequest = buildPaymentRequest(payments);
                    const googlePay = await payments.googlePay(paymentRequest);
                    const result = await googlePay.tokenize();

                    if (result.status === 'OK') {
                        token = result.token;
                    } else {
                        throw new Error('Google Pay failed: ' + (result.errors ? result.errors[0].message : result.status));
                    }
                } catch (gpError) {
                    console.error(gpError);
                    throw new Error("Google Pay failed to initialize or was cancelled.");
                }

            } else if (selectedMethod === 'applePay') {
                // --- APPLE PAY FLOW ---
                try {
                    const paymentRequest = buildPaymentRequest(payments);
                    const applePay = await payments.applePay(paymentRequest);
                    const result = await applePay.tokenize();

                    if (result.status === 'OK') {
                        token = result.token;
                    } else {
                        throw new Error('Apple Pay failed: ' + (result.errors ? result.errors[0].message : result.status));
                    }
                } catch (apError) {
                    console.error(apError);
                    throw new Error("Apple Pay failed to initialize or was cancelled.");
                }

            } else if (selectedMethod === 'savedCard') {
                // Mock Token for saved card
                token = 'saved-card-token-mock';
            }

            // --- 3. BACKEND PROCESSING ---
            if (token) {
                let emailVal = document.getElementById('email') ? document.getElementById('email').value : '';
                if (!emailVal && user && user.email) {
                    emailVal = user.email;
                }

                const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const total = subtotal + (subtotal * TAX_RATE) + tipAmount;
                const shouldSaveCard = (selectedMethod === 'newCard' && saveCardCheckbox && saveCardCheckbox.checked);

                const discount = window.scheduledOrderDiscount ? subtotal * window.scheduledOrderDiscount : 0;
                const finalTotal = total - discount;

                const response = await fetch('https://us-central1-samosaman-6895e.cloudfunctions.net/processPayment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sourceId: token,
                        amount: finalTotal.toFixed(2),
                        tipAmount: tipAmount.toFixed(2),
                        orderType: orderType,
                        branch: finalBranch,
                        deliveryDetails: deliveryDetails,
                        pickupDetails: pickupDetails,
                        email: emailVal,
                        uid: uid,
                        shouldSaveCard: shouldSaveCard,
                        items: cart,
                        subtotal: subtotal.toFixed(2),
                        tax: (subtotal * TAX_RATE).toFixed(2),
                        discount: discount.toFixed(2),
                        firstName: document.getElementById('fname')?.value || '',
                        lastName: document.getElementById('lname')?.value || '',
                        phone: document.getElementById('phone')?.value || '',
                        specialInstructions: document.getElementById('special-instructions')?.value || '',
                        scheduledTime: (orderType === 'delivery'
                            ? document.getElementById('del-scheduled-time')?.value
                            : document.getElementById('pickup-scheduled-time')?.value) || null,
                        isRedeemingPoints: window.isRedeemingReward || false,
                        rewardDiscountAmount: window.rewardDiscountAmount || 0
                    }),
                });

                const paymentResult = await response.json();

                if (paymentResult.success) {
                    // Show loading overlay
                    const loadingOverlay = document.getElementById('loading-overlay');
                    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

                    setTimeout(() => {
                        if (loadingOverlay) loadingOverlay.classList.add('hidden');

                        // Show success modal
                        const successModal = document.getElementById('success-modal');
                        const customerName = document.getElementById('fname')?.value || 'there';
                        const successNameEl = document.getElementById('success-customer-name');
                        if (successNameEl) successNameEl.textContent = customerName;

                        if (successModal) {
                            successModal.classList.remove('hidden');
                        } else {
                            // Fallback if modal doesn't exist
                            const statusDiv = document.getElementById('payment-status-container');
                            statusDiv.classList.remove('hidden', 'bg-red-100', 'text-red-800');
                            statusDiv.classList.add('bg-green-100', 'text-green-800');
                            statusDiv.innerText = `Success! Order Complete.`;
                        }

                        // Clear cart
                        localStorage.removeItem(CART_KEY);
                        if (typeof updateCartBadge === 'function') updateCartBadge();

                        cardButton.innerText = "Order Placed";

                        // Auto-redirect after 5 seconds
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 5000);
                    }, 2000);
                } else {
                    throw new Error(paymentResult.error || 'Payment failed on server');
                }
            }
        } catch (e) {
            console.error(e);
            const statusDiv = document.getElementById('payment-status-container');
            statusDiv.classList.remove('hidden', 'bg-green-100', 'text-green-800');
            statusDiv.classList.add('bg-red-100', 'text-red-800');
            statusDiv.innerText = e.message;

            cardButton.disabled = false;
            cardButton.innerText = "Place Order";
        }
    });
});
