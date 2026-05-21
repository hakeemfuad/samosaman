const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

let dbInstance;
let fieldValueInstance;

function getDb() {
  if (!dbInstance) {
    const { getApps, initializeApp } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");
    if (getApps().length === 0) initializeApp();
    dbInstance = getFirestore();
  }

  return dbInstance;
}

const db = new Proxy({}, {
  get(_target, property) {
    const value = getDb()[property];
    return typeof value === 'function' ? value.bind(getDb()) : value;
  }
});

const FieldValue = new Proxy({}, {
  get(_target, property) {
    if (!fieldValueInstance) {
      fieldValueInstance = require("firebase-admin/firestore").FieldValue;
    }
    const value = fieldValueInstance[property];
    return typeof value === 'function' ? value.bind(fieldValueInstance) : value;
  }
});

let transporter;

function getTransporter() {
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'no_reply@samosamanvt.com',
        pass: 'fahr kjbl gudj bptm'
      }
    });
  }

  return transporter;
}

const REWARD_ITEM_CATALOG = {
  'apple-samosa': { name: 'Apple Pie Samosa', kind: 'samosa' },
  'punjabi-samosa': { name: 'Traditional Punjabi Samosa', kind: 'samosa' },
  'steak-cheese': { name: 'Steak & Cheese Samosa', kind: 'samosa' },
  'spicy-chicken': { name: 'Spicy Chicken Samosa', kind: 'samosa' },
  'chicken-cheese': { name: 'Chicken & Cheese Samosa', kind: 'samosa' },
  'steak-potato': { name: 'Steak & Potato Samosa', kind: 'samosa' },
  'spicy-potato': { name: 'Spicy Potato Samosa', kind: 'samosa' },
  'veggie-samosa': { name: 'Vegetarian Samosa', kind: 'samosa' },
  'reward-small-chicken-curry': { name: 'Small Chicken Curry Reward Meal', kind: 'meal' },
  'reward-small-chickpea-masala': { name: 'Small Chickpea Masala Reward Meal', kind: 'meal' }
};

const REWARD_TIERS = {
  'apple-pie-samosa': {
    id: 'apple-pie-samosa',
    title: 'Free Apple Pie Samosa',
    points: 1250,
    selectionLimit: 1,
    allowedItemIds: ['apple-samosa']
  },
  'three-samosas': {
    id: 'three-samosas',
    title: 'Free 3 Samosas',
    points: 3000,
    selectionLimit: 3,
    allowedItemIds: [
      'apple-samosa',
      'punjabi-samosa',
      'steak-cheese',
      'spicy-chicken',
      'chicken-cheese',
      'steak-potato',
      'spicy-potato',
      'veggie-samosa'
    ]
  },
  'small-curry-meal': {
    id: 'small-curry-meal',
    title: 'Free Small Curry or Masala Meal',
    points: 6000,
    selectionLimit: 1,
    allowedItemIds: ['reward-small-chicken-curry', 'reward-small-chickpea-masala']
  }
};

function toMoney(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function isRewardItem(item) {
  return Boolean(item && item.isReward === true && item.reward && item.reward.id);
}

function normalizeCartItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    price: toMoney(item.price),
    quantity: Number.parseInt(item.quantity, 10) || 0
  })).filter((item) => item.quantity > 0);
}

function addCount(counts, itemId, quantity) {
  counts[itemId] = (counts[itemId] || 0) + quantity;
  return counts;
}

function compareCounts(left, right) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] || 0) !== (right[key] || 0)) return false;
  }
  return true;
}

function validateRewardSelection(selectedReward, items, uid) {
  const rewardItems = items.filter(isRewardItem);

  if (!selectedReward) {
    if (rewardItems.length > 0) {
      throw new Error("Reward items require a selected reward.");
    }
    return null;
  }

  if (!uid) {
    throw new Error("Please sign in to redeem rewards.");
  }

  const tier = REWARD_TIERS[selectedReward.rewardId];
  if (!tier) {
    throw new Error("Unknown reward selected.");
  }

  if (!Array.isArray(selectedReward.items) || selectedReward.items.length === 0) {
    throw new Error("Reward selections are missing.");
  }

  const selectedCounts = selectedReward.items.reduce((counts, item) => {
    const itemId = item.itemId;
    const quantity = Number.parseInt(item.quantity, 10) || 0;
    return addCount(counts, itemId, quantity);
  }, {});

  const cartCounts = rewardItems.reduce((counts, item) => {
    if (item.reward.id !== tier.id) {
      throw new Error("Only one reward can be redeemed per order.");
    }
    if (toMoney(item.price) !== 0) {
      throw new Error("Reward items must be free.");
    }
    return addCount(counts, item.reward.itemId, item.quantity);
  }, {});

  if (!compareCounts(selectedCounts, cartCounts)) {
    throw new Error("Reward cart items do not match the selected reward.");
  }

  const totalQuantity = Object.entries(selectedCounts).reduce((sum, [itemId, quantity]) => {
    if (!tier.allowedItemIds.includes(itemId) || !REWARD_ITEM_CATALOG[itemId]) {
      throw new Error("This item is not eligible for the selected reward.");
    }
    return sum + quantity;
  }, 0);

  if (totalQuantity !== tier.selectionLimit) {
    throw new Error(`This reward requires ${tier.selectionLimit} item(s).`);
  }

  return {
    rewardId: tier.id,
    title: tier.title,
    pointCost: tier.points,
    items: Object.entries(selectedCounts).map(([itemId, quantity]) => ({
      itemId,
      name: REWARD_ITEM_CATALOG[itemId].name,
      quantity
    }))
  };
}

function parseJsonSafely(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

const SQUARE_API_VERSION = '2026-04-21';

function getSquareEnvironment(applicationId = '') {
  const configured = String(process.env.SQUARE_ENVIRONMENT || '').toLowerCase();
  if (configured === 'sandbox' || configured === 'production') return configured;
  return String(applicationId).startsWith('sandbox-') ? 'sandbox' : 'production';
}

function getSquareApiBaseUrl(environment) {
  return environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com/v2'
    : 'https://connect.squareup.com/v2';
}

function getSquareSdkUrl(environment) {
  return environment === 'sandbox'
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js';
}

function buildSquareHeaders(accessToken) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_API_VERSION
  };
}

function formatSquareError(data, fallback) {
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
  return firstError?.detail || firstError?.code || fallback;
}

async function callSquare(path, accessToken, payload, environment) {
  const response = await fetch(`${getSquareApiBaseUrl(environment)}${path}`, {
    method: 'POST',
    headers: buildSquareHeaders(accessToken),
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  const data = parseJsonSafely(raw);

  if (!response.ok) {
    logger.error("Square API error", {
      path,
      status: response.status,
      body: data || raw
    });
    throw new Error(formatSquareError(data, `Square request failed (${response.status}).`));
  }

  return data;
}

function isCompletedSquarePayment(payment) {
  return String(payment?.status || '').toUpperCase() === 'COMPLETED';
}

function buildSquareCardSummary(payment) {
  const card = payment?.card_details?.card;
  return {
    brand: card?.card_brand || null,
    last4: card?.last_4 || null,
    expMonth: card?.exp_month || null,
    expYear: card?.exp_year || null,
    entryMethod: payment?.card_details?.entry_method || null
  };
}

exports.getSquarePaymentConfig = onRequest({
  secrets: ["SQUARE_APPLICATION_ID", "SQUARE_LOCATION_ID"]
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method Not Allowed');
    }

    const applicationId = process.env.SQUARE_APPLICATION_ID;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!applicationId || !locationId) {
      return res.status(500).json({ success: false, error: "Square Payments is not configured." });
    }

    const environment = getSquareEnvironment(applicationId);
    res.status(200).json({
      success: true,
      appId: applicationId,
      locationId,
      environment,
      sdkUrl: getSquareSdkUrl(environment)
    });
  });
});

// --- SQUARE EMBEDDED PAYMENT FUNCTION (v2) ---
exports.processPayment = onRequest({
  secrets: [
    "SQUARE_ACCESS_TOKEN",
    "SQUARE_APPLICATION_ID",
    "SQUARE_LOCATION_ID"
  ]
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { sourceId, amount, email, uid, tipAmount, orderType, branch, deliveryDetails, pickupDetails, items, subtotal, tax, discount, firstName, lastName, phone, specialInstructions, scheduledTime, selectedReward } = req.body;
    const normalizedItems = normalizeCartItems(items);
    let rewardValidation = null;
    const submittedSubtotal = toMoney(subtotal);
    const submittedDiscount = toMoney(discount);
    const submittedTip = toMoney(tipAmount);
    const submittedTax = toMoney(tax);
    const submittedAmount = toMoney(amount);
    const paidSubtotal = normalizedItems
      .filter((item) => !isRewardItem(item))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const roundedPaidSubtotal = toMoney(paidSubtotal);
    const netFoodSubtotal = Math.max(0, toMoney(submittedSubtotal - submittedDiscount));
    const expectedTax = toMoney(netFoodSubtotal * 0.07);
    const expectedAmount = toMoney(netFoodSubtotal + expectedTax + submittedTip);
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const applicationId = process.env.SQUARE_APPLICATION_ID;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environment = getSquareEnvironment(applicationId);
    let rewardDebit = null;
    let paymentSucceeded = false;

    try {
      if (!sourceId) {
        throw new Error("Missing Square payment token.");
      }
      if (!accessToken || !applicationId || !locationId) {
        throw new Error("Square Payments is not configured.");
      }

      rewardValidation = validateRewardSelection(selectedReward, normalizedItems, uid);

      if (Math.abs(submittedSubtotal - roundedPaidSubtotal) > 0.02) {
        throw new Error("Order subtotal does not match cart items.");
      }

      if (Math.abs(submittedTax - expectedTax) > 0.05 || Math.abs(submittedAmount - expectedAmount) > 0.05) {
        throw new Error("Order total does not match cart items.");
      }

      const baseChargeCents = Math.round(toMoney(submittedAmount - submittedTip) * 100);
      const tipCents = Math.round(submittedTip * 100);

      if (baseChargeCents + tipCents < 1) {
        throw new Error("Order total must be at least $0.01 to pay online.");
      }
      if (baseChargeCents < 1) {
        throw new Error("Order total before tip must be at least $0.01 to pay online.");
      }

      if (rewardValidation && uid) {
        const userRef = db.collection('users').doc(uid);
        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          const currentPoints = userDoc.exists ? userDoc.data().rewardPoints || 0 : 0;

          if (currentPoints < rewardValidation.pointCost) {
            throw new Error("Insufficient points for redemption.");
          }

          transaction.set(userRef, {
            rewardPoints: FieldValue.increment(-rewardValidation.pointCost)
          }, { merge: true });
        });

        rewardDebit = {
          uid,
          pointCost: rewardValidation.pointCost,
          title: rewardValidation.title
        };
      }

      const orderId = crypto.randomUUID();
      const paymentPayload = {
        source_id: sourceId,
        idempotency_key: orderId,
        amount_money: {
          amount: baseChargeCents,
          currency: 'USD'
        },
        autocomplete: true,
        location_id: locationId,
        buyer_email_address: email || undefined,
        reference_id: orderId,
        note: `SamosaMan Order ${orderId.slice(0, 8).toUpperCase()}`,
        customer_details: {
          customer_initiated: true,
          seller_keyed_in: false
        }
      };

      if (tipCents > 0) {
        paymentPayload.tip_money = {
          amount: tipCents,
          currency: 'USD'
        };
      }

      const squareResponse = await callSquare('/payments', accessToken, paymentPayload, environment);
      const payment = squareResponse.payment;

      if (!payment || !isCompletedSquarePayment(payment)) {
        throw new Error(`Square payment was not completed${payment?.status ? ` (${payment.status})` : ''}.`);
      }

      paymentSucceeded = true;

      if (uid) {
        const pointsEarned = Math.floor(netFoodSubtotal * 100);
        const userRef = db.collection('users').doc(uid);

        if (rewardValidation) {
          await userRef.collection('points_history').add({
            type: 'spend',
            points: rewardValidation.pointCost,
            description: `${rewardValidation.title} redemption`,
            rewardId: rewardValidation.rewardId,
            orderId,
            createdAt: FieldValue.serverTimestamp()
          });
        }

        if (pointsEarned > 0) {
          await userRef.set({
            rewardPoints: FieldValue.increment(pointsEarned)
          }, { merge: true });

          await userRef.collection('points_history').add({
            type: 'earn',
            points: pointsEarned,
            description: `Points earned from Order #${orderId.slice(0, 8).toUpperCase()}`,
            orderId,
            createdAt: FieldValue.serverTimestamp()
          });
        }
      }

      const orderData = {
        orderId,
        uid: uid || null,
        customerName: `${firstName || ''} ${lastName || ''}`.trim(),
        customerEmail: email,
        customerPhone: phone || '',
        orderType: orderType || 'pickup',
        branch: branch || 'Burlington',
        deliveryDetails: deliveryDetails || null,
        pickupDetails: pickupDetails || null,
        items: normalizedItems,
        reward: rewardValidation,
        subtotal: submittedSubtotal,
        tax: submittedTax,
        tip: submittedTip,
        discount: submittedDiscount,
        total: submittedAmount,
        specialInstructions: specialInstructions || '',
        scheduledFor: scheduledTime || null,
        status: 'pending',
        paymentStatus: 'paid',
        paymentProvider: 'square',
        squarePaymentId: payment.id || null,
        squarePaymentStatus: payment.status || null,
        squareReceiptUrl: payment.receipt_url || null,
        squareCard: buildSquareCardSummary(payment),
        createdAt: FieldValue.serverTimestamp()
      };

      await db.collection('orders').doc(orderId).set(orderData);

      try {
        await sendOrderConfirmationEmails(orderData);
      } catch (emailErr) {
        logger.error("Failed to send confirmation emails", emailErr);
      }

      res.status(200).json({
        success: true,
        orderId,
        payment: {
          id: payment.id || null,
          status: payment.status || null,
          receiptUrl: payment.receipt_url || null
        }
      });

    } catch (error) {
      if (rewardDebit && !paymentSucceeded) {
        try {
          await db.collection('users').doc(rewardDebit.uid).set({
            rewardPoints: FieldValue.increment(rewardDebit.pointCost)
          }, { merge: true });
        } catch (restoreError) {
          logger.error("Failed to restore reward points after Square payment error:", restoreError);
        }
      }

      logger.error("Square Payment Error:", error);
      res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
  });
});

// --- [UPDATED] WELCOME EMAIL FUNCTION (v2) ---
exports.sendWelcomeEmail = onDocumentCreated("users/{userId}", (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const newUser = snapshot.data();
  const email = newUser.email;
  const firstName = newUser.firstName || 'Samosa Lover';
  const safeFirstName = escapeHtml(firstName);

  const logoUrl = "https://i.ibb.co/r268hyb6/231cd8a888582779c5042d2577a2ec56.png";
  const heroUrl = "https://i.ibb.co/Z1271V1b/bb055516724cb0fd45293f8d365b389a.jpg";

  const mailOptions = {
    from: '"SamosaMan" <no_reply@samosamanvt.com>',
    to: email,
    subject: 'Welcome to the SamosaMan Clan!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
                <tr>
                  <td align="center" style="padding:28px 24px 12px;">
                    <img src="${logoUrl}" width="120" alt="SamosaMan" style="display:block;width:120px;height:auto;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 24px 20px;">
                    <h1 style="margin:0;font-size:34px;line-height:1.05;letter-spacing:-0.02em;">Treat yourself.<br>You earned it.</h1>
                  </td>
                </tr>
                <tr>
                  <td>
                    <img src="${heroUrl}" width="600" alt="Fresh SamosaMan samosas" style="display:block;width:100%;height:auto;">
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px 8px;text-align:center;">
                    <p style="margin:0;font-size:18px;line-height:1.5;">Hi ${safeFirstName}, welcome to SamosaMan Clan&reg; Rewards.</p>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#4b5563;">We dropped <strong>1,250 points</strong> into your Rewards wallet, enough for a free Apple Pie Samosa. Open the Rewards Exchange, redeem the deal, and add it to your next order.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:24px 32px 32px;">
                    <a href="https://samosaman-6895e.web.app/rewards.html" target="_blank" style="display:inline-block;background:#e96817;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:999px;padding:14px 28px;">View Rewards</a>
                  </td>
                </tr>
                <tr>
                  <td style="background:#111827;color:#ffffff;text-align:center;padding:18px;font-size:13px;">Terms and conditions apply. SamosaMan&reg; 2026</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  return getTransporter().sendMail(mailOptions)
    .then(() => console.log(`Welcome email sent to ${email}`))
    .catch((error) => console.error('Error sending email:', error));
});

// --- ORDER CONFIRMATION EMAIL TEMPLATES ---

function getCustomerEmailTemplate(order) {
  const orderTypeText = order.orderType === 'delivery' ? 'Delivery' : 'Pickup';
  const locationText = order.orderType === 'delivery'
    ? `${order.deliveryDetails?.address || ''}, ${order.deliveryDetails?.city || ''}, ${order.deliveryDetails?.state || ''} ${order.deliveryDetails?.zip || ''}`
    : `${order.branch} Location`;

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
        ${item.name} x${item.quantity}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">
        $${(item.price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const customerFirstName = (order.customerName || 'there').split(' ')[0];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - SamosaMan</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">SamosaMan</h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 18px;">Order Confirmed!</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 30px 20px;">
                  <h2 style="margin: 0 0 15px; font-size: 24px; color: #0f172a;">
                    Deliciousness is headed your way, ${customerFirstName}!
                  </h2>
                  <p style="margin: 0; color: #64748b; line-height: 1.6;">
                    We've received your order and our team is getting started. You'll receive updates as your order progresses.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 20px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">ORDER NUMBER</p>
                        <p style="margin: 0 0 20px; font-size: 18px; color: #0f172a; font-weight: bold;">${(order.orderId || '').substring(0, 8).toUpperCase()}</p>
                        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">${orderTypeText.toUpperCase()}</p>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #0f172a;">${locationText}</p>
                        ${order.scheduledFor ? `
                          <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">SCHEDULED FOR</p>
                          <p style="margin: 0; font-size: 16px; color: #0f172a;">${order.scheduledFor}</p>
                        ` : `
                          <p style="margin: 0 0 8px; font-size: 14px; color: #64748b; font-weight: 500;">ORDER TIME</p>
                          <p style="margin: 0; font-size: 16px; color: #0f172a;">ASAP (15-25 minutes)</p>
                        `}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px;">
                  <h3 style="margin: 0 0 15px; font-size: 18px; color: #0f172a;">Your Order</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    ${itemsHtml}
                    <tr>
                      <td style="padding: 8px; color: #64748b;">Subtotal</td>
                      <td style="padding: 8px; text-align: right; color: #64748b;">$${(order.subtotal || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; color: #64748b;">Tax</td>
                      <td style="padding: 8px; text-align: right; color: #64748b;">$${(order.tax || 0).toFixed(2)}</td>
                    </tr>
                    ${order.tip > 0 ? `
                      <tr>
                        <td style="padding: 8px; color: #64748b;">Tip</td>
                        <td style="padding: 8px; text-align: right; color: #64748b;">$${order.tip.toFixed(2)}</td>
                      </tr>
                    ` : ''}
                    ${order.discount > 0 ? `
                      <tr>
                        <td style="padding: 8px; color: #16a34a;">Discount (10%)</td>
                        <td style="padding: 8px; text-align: right; color: #16a34a;">-$${order.discount.toFixed(2)}</td>
                      </tr>
                    ` : ''}
                    <tr style="background-color: #f8fafc;">
                      <td style="padding: 12px 8px; font-weight: bold; color: #0f172a; font-size: 18px;">Total</td>
                      <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #ea580c; font-size: 18px;">$${(order.total || 0).toFixed(2)}</td>
                    </tr>
                  </table>
                  ${order.specialInstructions ? `
                    <div style="margin-top: 15px; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Special Instructions:</strong></p>
                      <p style="margin: 5px 0 0; font-size: 14px; color: #78350f;">${order.specialInstructions}</p>
                    </div>
                  ` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px;">
                  <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Questions about your order?</p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    Reply to this email or call us and we'll be happy to help.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2026 SamosaMan. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getRestaurantEmailTemplate(order) {
  const orderTypeText = order.orderType === 'delivery' ? 'DELIVERY' : 'PICKUP';
  const itemsList = (order.items || []).map(item =>
    `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');

  return `
    <div style="font-family: monospace; background: #1e293b; color: #e2e8f0; padding: 30px; border-radius: 8px;">
      <h2 style="color: #ea580c; margin: 0 0 20px;">NEW ORDER RECEIVED</h2>
      <pre style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
ORDER ID: ${(order.orderId || '').substring(0, 8).toUpperCase()}
TYPE: ${orderTypeText}
BRANCH: ${order.branch || 'N/A'}
TIME: ${order.scheduledFor || 'ASAP'}

--- CUSTOMER ---
Name: ${order.customerName || 'N/A'}
Phone: ${order.customerPhone || 'N/A'}
Email: ${order.customerEmail || 'N/A'}

${order.orderType === 'delivery' && order.deliveryDetails ? `--- DELIVERY ADDRESS ---
${order.deliveryDetails.address || ''}
${order.deliveryDetails.city || ''}, ${order.deliveryDetails.state || ''} ${order.deliveryDetails.zip || ''}
` : ''}
--- ORDER ITEMS ---
${itemsList}

--- TOTALS ---
Subtotal:  $${(order.subtotal || 0).toFixed(2)}
Tax:       $${(order.tax || 0).toFixed(2)}
Tip:       $${(order.tip || 0).toFixed(2)}
${order.discount > 0 ? `Discount:  -$${order.discount.toFixed(2)}\n` : ''}TOTAL:     $${(order.total || 0).toFixed(2)}

${order.specialInstructions ? `SPECIAL INSTRUCTIONS:
${order.specialInstructions}
` : ''}
Payment Status: ${order.paymentStatus || 'PAID'}
Payment Provider: ${(order.paymentProvider || 'square').toUpperCase()}
Payment ID: ${order.squarePaymentId || 'N/A'}
      </pre>
    </div>
  `;
}

async function sendOrderConfirmationEmails(order) {
  // Customer email
  if (order.customerEmail) {
    await getTransporter().sendMail({
      from: '"SamosaMan" <no_reply@samosamanvt.com>',
      to: order.customerEmail,
      subject: `Order Confirmation - ${(order.orderId || '').substring(0, 8).toUpperCase()}`,
      html: getCustomerEmailTemplate(order)
    });
  }

  // Restaurant email
  await getTransporter().sendMail({
    from: '"SamosaMan Orders" <no_reply@samosamanvt.com>',
    to: ['no_reply@samosamanvt.com', 'kfuad3@gmail.com'],
    subject: `NEW ORDER - ${order.branch || 'N/A'} - ${(order.orderType || 'pickup').toUpperCase()} - $${(order.total || 0).toFixed(2)}`,
    html: getRestaurantEmailTemplate(order)
  });
}

// --- CATERING INQUIRY FUNCTION (v2) ---
exports.submitCateringInquiry = onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { location, fullName, phone, email, eventDate, eventTime, guests, serviceType, address, city, state, comments, uid } = req.body;

    try {
      // Generate unique inquiry ID
      const inquiryId = crypto.randomUUID();
      const submittedAt = FieldValue.serverTimestamp();

      // Save catering inquiry to Firestore
      const cateringData = {
        inquiryId: inquiryId,
        location: location,
        customerName: fullName,
        customerPhone: phone,
        customerEmail: email,
        eventDate: eventDate,
        eventTime: eventTime,
        numberOfGuests: parseInt(guests) || 0,
        serviceType: serviceType || 'pickup',
        eventAddress: address || '',
        eventCity: city || '',
        eventState: state || '',
        comments: comments || '',
        uid: uid || null,
        status: 'pending',
        submittedAt: submittedAt,
        createdAt: submittedAt
      };

      await db.collection('catering_inquiries').doc(inquiryId).set(cateringData);
      logger.info("Catering inquiry saved to Firestore", { inquiryId: inquiryId });

      // Send confirmation emails
      try {
        await sendCateringConfirmationEmails(cateringData);
        logger.info("Catering confirmation emails sent", { inquiryId: inquiryId });
      } catch (emailErr) {
        logger.error("Failed to send catering confirmation emails", emailErr);
      }

      logger.info("Catering inquiry submitted successfully", { inquiryId });
      res.status(200).json({ success: true, inquiryId: inquiryId });

    } catch (error) {
      logger.error("Catering inquiry error:", error);
      res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
  });
});

// --- CATERING EMAIL TEMPLATES ---

function getCateringRestaurantEmailTemplate(inquiry) {
  const serviceTypeText = inquiry.serviceType === 'delivery' ? 'DELIVERY' : 'PICK-UP';

  return `
    <div style="font-family: monospace; background: #1e293b; color: #e2e8f0; padding: 30px; border-radius: 8px;">
      <h2 style="color: #ea580c; margin: 0 0 20px;">NEW CATERING INQUIRY</h2>
      <pre style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
INQUIRY ID: ${inquiry.inquiryId.substring(0, 8).toUpperCase()}
LOCATION: ${inquiry.location}
SERVICE: ${serviceTypeText}

--- CUSTOMER ---
Name: ${inquiry.customerName}
Phone: ${inquiry.customerPhone}
Email: ${inquiry.customerEmail}

--- EVENT DETAILS ---
Date: ${inquiry.eventDate}
Time: ${inquiry.eventTime}
Guests: ${inquiry.numberOfGuests}
${inquiry.eventAddress ? `
--- EVENT LOCATION ---
${inquiry.eventAddress}
${inquiry.eventCity}, ${inquiry.eventState}
` : ''}
${inquiry.comments ? `--- COMMENTS ---
${inquiry.comments}
` : ''}
STATUS: Pending Review
SUBMITTED: Just now
      </pre>
    </div>
  `;
}

async function sendCateringConfirmationEmails(inquiry) {
  // Customer confirmation email
  if (inquiry.customerEmail) {
    await getTransporter().sendMail({
      from: '"SamosaMan Catering" <no_reply@samosamanvt.com>',
      to: inquiry.customerEmail,
      subject: `Catering Inquiry Received - #${inquiry.inquiryId.substring(0, 8).toUpperCase()}`,
      html: getCateringCustomerEmailTemplate(inquiry)
    });
  }

  // Internal team notification
  await getTransporter().sendMail({
    from: '"SamosaMan Catering" <no_reply@samosamanvt.com>',
    to: ['no_reply@samosamanvt.com', 'kfuad3@gmail.com'],
    subject: `NEW CATERING INQUIRY - ${inquiry.location} - ${inquiry.eventDate} - ${inquiry.numberOfGuests} guests`,
    html: getCateringRestaurantEmailTemplate(inquiry)
  });
}

function getCateringCustomerEmailTemplate(inquiry) {
  const customerFirstName = (inquiry.customerName || 'there').split(' ')[0];
  const serviceTypeText = inquiry.serviceType === 'delivery' ? 'Delivery' : 'Pick-up';
  const eventLocation = inquiry.eventAddress
    ? `${inquiry.eventAddress}${inquiry.eventCity ? ', ' + inquiry.eventCity : ''}${inquiry.eventState ? ', ' + inquiry.eventState : ''}`
    : inquiry.location || 'Location to be confirmed';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catering Inquiry Received - SamosaMan</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f1f5;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f1f5">
<tr><td bgcolor="#f0f1f5">
<table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td>

  <!-- LOGO -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 20px 0;text-align:center;">
      <img src="https://i.ibb.co/r268hyb6/231cd8a888582779c5042d2577a2ec56.png"
           width="110" height="95" alt="SamosaMan"
           style="display:block;width:110px;height:auto;max-width:110px;margin:0 auto;">
    </td></tr>
  </table>

  <!-- HEADLINE -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:20px 30px 0;text-align:center;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:34px;font-weight:700;letter-spacing:-0.02em;line-height:1.05;color:#1a1a1a;text-transform:uppercase;">
        INQUIRY RECEIVED.<br>WE'LL BE IN TOUCH.
      </div>
    </td></tr>
  </table>

  <!-- HERO IMAGE -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:22px 20px 0;">
      <img src="https://i.ibb.co/Z1271V1b/bb055516724cb0fd45293f8d365b389a.jpg"
           width="560" alt="SamosaMan Catering"
           style="display:block;width:100%;height:auto;border-radius:8px;max-width:560px;">
    </td></tr>
  </table>

  <!-- SUBTEXT -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:20px 30px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:400;color:#64748b;line-height:1.6;">
      Thanks, ${customerFirstName} — we've received your catering request.<br>
      Our team will review and reach out within <strong style="color:#1a1a1a;">24 hours</strong>.
    </td></tr>
  </table>

  <!-- INQUIRY DETAILS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 30px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:14px 18px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Inquiry Number</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">#${(inquiry.inquiryId || '').substring(0, 8).toUpperCase()}</div>
          </td>
          <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Event Date</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">${inquiry.eventDate || 'TBD'} at ${inquiry.eventTime || 'TBD'}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;border-right:1px solid #e2e8f0;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Location</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">${eventLocation}</div>
          </td>
          <td style="padding:14px 18px;width:50%;">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;font-family:Helvetica,Arial,sans-serif;">Guests &amp; Service</div>
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;">${inquiry.numberOfGuests || 'TBD'} guests · ${serviceTypeText}</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- NEXT STEPS -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:28px 30px 32px;">
      <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.06em;font-family:Helvetica,Arial,sans-serif;">What Happens Next</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:7px 0;font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif;line-height:1.5;">&#x2192;&nbsp;&nbsp;Our catering team reviews your request</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif;line-height:1.5;">&#x2192;&nbsp;&nbsp;We reach out within 24 hours to discuss options &amp; pricing</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#64748b;font-family:Helvetica,Arial,sans-serif;line-height:1.5;">&#x2192;&nbsp;&nbsp;You receive a full order confirmation with invoice &amp; payment link</td></tr>
      </table>
    </td></tr>
  </table>

</td></tr>

<!-- FOOTER -->
<tr><td bgcolor="#000000" style="padding:24px 30px;text-align:center;">
  <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.06em;text-transform:uppercase;">SamosaMan</p>
  <p style="margin:0 0 14px;font-size:10px;color:rgba(255,255,255,0.35);font-family:Helvetica,Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase;">Artisan Catering</p>
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:12px;">
    <tr>
      <td style="padding:0 8px;"><a href="https://samosamanvt.com" style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;font-family:Helvetica,Arial,sans-serif;">samosamanvt.com</a></td>
      <td style="font-size:12px;color:rgba(255,255,255,0.2);">·</td>
      <td style="padding:0 8px;"><a href="mailto:catering@samosamanvt.com" style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;font-family:Helvetica,Arial,sans-serif;">catering@samosamanvt.com</a></td>
    </tr>
  </table>
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);font-family:Helvetica,Arial,sans-serif;line-height:1.6;">
    Burlington, VT &nbsp;·&nbsp; Boston, MA &nbsp;·&nbsp; Hanover, NH<br>
    &copy; 2026 SamosaMan. All rights reserved.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
