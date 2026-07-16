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

const MENU_CATALOG_BY_BRANCH = {
  Burlington: {
    'apple-samosa': {
      id: 'apple-samosa',
      name: 'Apple Pie Samosa',
      price: 3.75,
      image: 'assets/samosas/apple_samosa3.webp'
    },
    'punjabi-samosa': {
      id: 'punjabi-samosa',
      name: 'Traditional Punjabi Samosa',
      price: 3.75,
      image: 'assets/samosas/traditional_punjabi_samosa.webp'
    },
    'steak-cheese': {
      id: 'steak-cheese',
      name: 'Steak & Cheese Samosa',
      price: 3.75,
      image: 'assets/samosas/steakandcheese.webp'
    },
    'spicy-chicken': {
      id: 'spicy-chicken',
      name: 'Spicy Chicken Samosa',
      price: 3.75,
      image: 'assets/samosas/spicy_chicken2.webp'
    },
    'chicken-cheese': {
      id: 'chicken-cheese',
      name: 'Chicken & Cheese Samosa',
      price: 3.75,
      image: 'assets/samosas/chicken_cheese3.webp'
    },
    'spicy-potato': {
      id: 'spicy-potato',
      name: 'Spicy Potato Samosa',
      price: 3.75,
      image: 'assets/samosas/spicy_potato_samosa.webp'
    },
    'veggie-samosa': {
      id: 'veggie-samosa',
      name: 'Vegetarian Samosa',
      price: 3.75,
      image: 'assets/samosas/veggie_samosa3.webp'
    },
    'chicken-curry-meal': {
      id: 'chicken-curry-meal',
      name: 'Chicken Curry Meal',
      price: 13.95,
      image: 'assets/chicken_curry.webp'
    },
    'chickpea-masala': {
      id: 'chickpea-masala',
      name: 'Chickpea Masala',
      price: 12.95,
      image: 'assets/chickpea_masala.webp'
    }
  }
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

const TAX_RATE = 0.07;
const SCHEDULED_ORDER_DISCOUNT_RATE = 0.10;
const MINIMUM_ORDER_SUBTOTAL = 30;

function toMoney(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function isSandboxEnvironment(environment) {
  return String(environment || '').toLowerCase() === 'sandbox';
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

function getCartItemId(item) {
  return String(item?.id || item?.itemId || '').trim();
}

/**
 * Error carrying a stable, machine-readable code alongside the user-facing
 * message. Request handlers echo `code` back to the client so the UI can key
 * off it instead of matching on message text.
 */
class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

function normalizeBranch(value) {
  const branch = String(value || 'Burlington').trim() || 'Burlington';
  if (!MENU_CATALOG_BY_BRANCH[branch]) {
    throw new AppError('LOCATION_UNAVAILABLE', "Selected ordering location is unavailable.");
  }
  return branch;
}

function normalizeOrderType(value) {
  return String(value || '').toLowerCase() === 'delivery' ? 'delivery' : 'pickup';
}

function normalizeCartQuantity(value) {
  const quantity = Number.parseInt(value, 10) || 0;
  if (quantity < 1) return 0;
  if (quantity > 99) throw new AppError('ITEM_QTY_TOO_HIGH', "Item quantity is too high.");
  return quantity;
}

function normalizePaidCartItem(item, branch) {
  const id = getCartItemId(item);
  const catalogItem = MENU_CATALOG_BY_BRANCH[branch]?.[id];

  if (!catalogItem) {
    throw new AppError('ITEM_UNAVAILABLE', "Cart contains an unavailable menu item.");
  }

  const quantity = normalizeCartQuantity(item.quantity);
  if (quantity < 1) return null;

  return {
    id: catalogItem.id,
    name: catalogItem.name,
    price: toMoney(catalogItem.price),
    quantity,
    image: catalogItem.image || ''
  };
}

function normalizeRewardCartItem(item) {
  const rewardId = String(item?.reward?.id || '').trim();
  const rewardItemId = String(item?.reward?.itemId || '').trim();
  const tier = REWARD_TIERS[rewardId];
  const catalogItem = REWARD_ITEM_CATALOG[rewardItemId];

  if (!tier || !catalogItem || !tier.allowedItemIds.includes(rewardItemId)) {
    throw new AppError('REWARD_INVALID_ITEM', "Cart contains an invalid reward item.");
  }

  const quantity = normalizeCartQuantity(item.quantity);
  if (quantity < 1) return null;

  return {
    id: `reward-${tier.id}-${rewardItemId}`,
    name: catalogItem.name,
    price: 0,
    quantity,
    isReward: true,
    reward: {
      id: tier.id,
      title: tier.title,
      itemId: rewardItemId,
      pointCost: tier.points,
      itemType: tier.itemType || catalogItem.kind
    }
  };
}

function normalizeCartItems(items, branch = 'Burlington') {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => isRewardItem(item)
      ? normalizeRewardCartItem(item)
      : normalizePaidCartItem(item, branch))
    .filter(Boolean);
}

function calculatePaidSubtotal(items) {
  return toMoney(items
    .filter((item) => !isRewardItem(item))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0));
}

function normalizeFulfillmentDetails({ orderType, branch, deliveryDetails, pickupDetails, scheduledDate }) {
  if (orderType === 'delivery') {
    return {
      deliveryDetails: deliveryDetails
        ? {
          ...deliveryDetails,
          branch,
          scheduledDate: deliveryDetails.scheduledDate || scheduledDate || null
        }
        : null,
      pickupDetails: null
    };
  }

  return {
    deliveryDetails: null,
    pickupDetails: {
      ...(pickupDetails || {}),
      branch,
      scheduledDate: pickupDetails?.scheduledDate || scheduledDate || null
    }
  };
}

function getScheduledOrderDate(orderType, deliveryDetails, pickupDetails, fallbackScheduledDate) {
  const details = orderType === 'delivery' ? deliveryDetails : pickupDetails;
  return String(details?.scheduledDate || fallbackScheduledDate || '').trim();
}

function getScheduledOrderTime(orderType, deliveryDetails, pickupDetails, fallbackScheduledTime) {
  const details = orderType === 'delivery' ? deliveryDetails : pickupDetails;
  return String(details?.scheduledTime || fallbackScheduledTime || '').trim();
}

function isIsoDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function calculateScheduledOrderDiscount(subtotal, orderType, deliveryDetails, pickupDetails, scheduledDate, scheduledTime) {
  const date = getScheduledOrderDate(orderType, deliveryDetails, pickupDetails, scheduledDate);
  const time = getScheduledOrderTime(orderType, deliveryDetails, pickupDetails, scheduledTime);

  if (!isIsoDateString(date) || !parseTimeLabel(time)) return 0;
  if (date <= todayInDoorDashTimeZone()) return 0;

  return toMoney(subtotal * SCHEDULED_ORDER_DISCOUNT_RATE);
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
      throw new AppError('REWARD_REQUIRED', "Reward items require a selected reward.");
    }
    return null;
  }

  if (!uid) {
    throw new AppError('REWARD_SIGN_IN', "Please sign in to redeem rewards.");
  }

  const tier = REWARD_TIERS[selectedReward.rewardId];
  if (!tier) {
    throw new AppError('REWARD_UNKNOWN', "Unknown reward selected.");
  }

  if (!Array.isArray(selectedReward.items) || selectedReward.items.length === 0) {
    throw new AppError('REWARD_MISSING', "Reward selections are missing.");
  }

  const selectedCounts = selectedReward.items.reduce((counts, item) => {
    const itemId = item.itemId;
    const quantity = Number.parseInt(item.quantity, 10) || 0;
    return addCount(counts, itemId, quantity);
  }, {});

  const cartCounts = rewardItems.reduce((counts, item) => {
    if (item.reward.id !== tier.id) {
      throw new AppError('REWARD_ONE_PER_ORDER', "Only one reward can be redeemed per order.");
    }
    if (toMoney(item.price) !== 0) {
      throw new AppError('REWARD_MUST_BE_FREE', "Reward items must be free.");
    }
    return addCount(counts, item.reward.itemId, item.quantity);
  }, {});

  if (!compareCounts(selectedCounts, cartCounts)) {
    throw new AppError('REWARD_MISMATCH', "Reward cart items do not match the selected reward.");
  }

  const totalQuantity = Object.entries(selectedCounts).reduce((sum, [itemId, quantity]) => {
    if (!tier.allowedItemIds.includes(itemId) || !REWARD_ITEM_CATALOG[itemId]) {
      throw new AppError('REWARD_INELIGIBLE_ITEM', "This item is not eligible for the selected reward.");
    }
    return sum + quantity;
  }, 0);

  if (totalQuantity !== tier.selectionLimit) {
    throw new AppError('REWARD_SELECTION_COUNT', `This reward requires ${tier.selectionLimit} item(s).`);
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
const DOORDASH_API_BASE_URL = 'https://openapi.doordash.com';
const DOORDASH_JWT_TTL_SECONDS = 300;
const DOORDASH_TIME_ZONE = 'America/New_York';
const DOORDASH_STORE_CONFIG = {
  Burlington: {
    pickupAddress: '100 Church St, Burlington, VT 05401',
    pickupBusinessName: 'SamosaMan Burlington',
    pickupPhoneNumber: '+18028817607',
    pickupInstructions: 'Please pick up at the counter. Use the order number as the pickup reference.'
  }
};

function getSquareCredentials(environment = 'production') {
  if (isSandboxEnvironment(environment)) {
    return {
      accessToken: process.env.SQUARE_SANDBOX_ACCESS_TOKEN,
      applicationId: process.env.SQUARE_SANDBOX_APPLICATION_ID,
      locationId: process.env.SQUARE_SANDBOX_LOCATION_ID
    };
  }

  return {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID
  };
}

function getDoorDashCredentials(environment = 'production') {
  if (isSandboxEnvironment(environment)) {
    return {
      developerId: process.env.DOORDASH_SANDBOX_DEVELOPER_ID,
      keyId: process.env.DOORDASH_SANDBOX_KEY_ID,
      signingSecret: process.env.DOORDASH_SANDBOX_SIGNING_SECRET
    };
  }

  return {
    developerId: process.env.DOORDASH_DEVELOPER_ID,
    keyId: process.env.DOORDASH_KEY_ID,
    signingSecret: process.env.DOORDASH_SIGNING_SECRET
  };
}

function getSquareEnvironment(applicationId = '', forcedEnvironment = '') {
  if (isSandboxEnvironment(forcedEnvironment)) return 'sandbox';
  if (String(forcedEnvironment || '').toLowerCase() === 'production') return 'production';

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
    throw new AppError('SQUARE_API', formatSquareError(data, `Square request failed (${response.status}).`));
  }

  return data;
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function hasDoorDashConfig(credentials = {}) {
  return Boolean(
    credentials.developerId &&
    credentials.keyId &&
    credentials.signingSecret
  );
}

function buildDoorDashJwt(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    'dd-ver': 'DD-JWT-V1'
  };
  const payload = {
    aud: 'doordash',
    iss: credentials.developerId,
    kid: credentials.keyId,
    exp: now + DOORDASH_JWT_TTL_SECONDS,
    iat: now
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', base64UrlDecodeToBuffer(credentials.signingSecret))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
}

function formatDoorDashError(data, fallback) {
  if (data?.message) return data.message;
  if (data?.error) return data.error;

  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
  if (typeof firstError === 'string') return firstError;
  if (firstError?.message) return firstError.message;

  const firstFieldError = Array.isArray(data?.field_errors) ? data.field_errors[0] : null;
  if (firstFieldError?.error) {
    return `${firstFieldError.field || 'DoorDash field'}: ${firstFieldError.error}`;
  }

  return fallback;
}

async function callDoorDash(path, method, payload, credentials) {
  const response = await fetch(`${DOORDASH_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${buildDoorDashJwt(credentials)}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const raw = await response.text();
  const data = parseJsonSafely(raw);

  if (!response.ok) {
    logger.error("DoorDash API error", {
      path,
      status: response.status,
      body: data || raw
    });
    throw new AppError('DOORDASH_API', formatDoorDashError(data, `DoorDash request failed (${response.status}).`));
  }

  return data;
}

function normalizeUsPhoneToE164(value) {
  const raw = String(value || '').trim();
  if (/^\+\d{10,15}$/.test(raw)) return raw;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

function sanitizeDoorDashId(value, fallback) {
  const sanitized = String(value || '').replace(/[^a-zA-Z0-9-._~]/g, '-');
  return (sanitized || fallback).slice(0, 64);
}

function sanitizeDoorDashText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function formatDoorDashAddress(deliveryDetails = {}) {
  return [
    deliveryDetails.address,
    deliveryDetails.city,
    [deliveryDetails.state, deliveryDetails.zip].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');
}

function parseTimeLabel(timeLabel) {
  const match = String(timeLabel || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

function getTimeZoneOffsetMs(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return localAsUtc - date.getTime();
}

function zonedDateTimeToUtcIso(dateIso, timeLabel, timeZone = DOORDASH_TIME_ZONE) {
  const dateMatch = String(dateIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const time = parseTimeLabel(timeLabel);
  if (!dateMatch || !time) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, time.hours, time.minutes, 0));
  let offset = getTimeZoneOffsetMs(timeZone, localAsUtc);
  let utc = new Date(localAsUtc.getTime() - offset);

  offset = getTimeZoneOffsetMs(timeZone, utc);
  utc = new Date(localAsUtc.getTime() - offset);
  return utc.toISOString();
}

function todayInDoorDashTimeZone() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DOORDASH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date()).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function buildDoorDashItems(items = []) {
  return items.map((item, index) => ({
    name: sanitizeDoorDashText(item.name || `Item ${index + 1}`, 100),
    quantity: Number.parseInt(item.quantity, 10) || 1,
    external_id: sanitizeDoorDashId(item.id || item.itemId || `item-${index + 1}`, `item-${index + 1}`),
    price: Math.max(0, Math.round(toMoney(item.price) * 100))
  }));
}

function buildDoorDashDeliveryRequest(order) {
  if (order.orderType !== 'delivery' || !order.deliveryDetails) return null;

  const store = DOORDASH_STORE_CONFIG[order.branch] || DOORDASH_STORE_CONFIG.Burlington;
  const customerPhone = normalizeUsPhoneToE164(order.customerPhone);
  const dropoffAddress = formatDoorDashAddress(order.deliveryDetails);

  if (!customerPhone) {
    throw new AppError('DELIVERY_PHONE_INVALID', "Please enter a valid U.S. mobile phone number for delivery updates.");
  }
  if (!dropoffAddress) {
    throw new AppError('DELIVERY_ADDRESS_INCOMPLETE', "Please enter a complete delivery address.");
  }

  const externalDeliveryId = sanitizeDoorDashId(`SM-${order.orderId}`, `SM-${Date.now()}`);
  const shortOrderId = (order.orderId || '').substring(0, 8).toUpperCase();
  const request = {
    external_delivery_id: externalDeliveryId,
    locale: 'en-US',
    pickup_address: store.pickupAddress,
    pickup_business_name: store.pickupBusinessName,
    pickup_phone_number: store.pickupPhoneNumber,
    pickup_instructions: store.pickupInstructions,
    pickup_reference_tag: `Order ${shortOrderId}`,
    dropoff_address: dropoffAddress,
    dropoff_phone_number: customerPhone,
    dropoff_contact_given_name: sanitizeDoorDashText((order.customerName || '').split(' ')[0], 50) || undefined,
    dropoff_contact_family_name: sanitizeDoorDashText((order.customerName || '').split(' ').slice(1).join(' '), 50) || undefined,
    dropoff_contact_send_notifications: true,
    dropoff_email_address: order.customerEmail || undefined,
    dropoff_instructions: sanitizeDoorDashText(order.specialInstructions, 500) || undefined,
    contactless_dropoff: true,
    order_value: Math.max(0, Math.round(toMoney(order.subtotal - order.discount) * 100)),
    items: buildDoorDashItems(order.items),
    action_if_undeliverable: 'return_to_pickup',
    order_contains: {
      alcohol: false,
      pharmacy_items: false,
      age_restricted_pharmacy_items: false,
      tobacco: false,
      hemp: false,
      otc: false
    }
  };

  if (order.deliveryDetails.timing === 'later') {
    const scheduledDate = order.deliveryDetails.scheduledDate || todayInDoorDashTimeZone();
    const dropoffIso = zonedDateTimeToUtcIso(scheduledDate, order.deliveryDetails.scheduledTime);
    if (!dropoffIso) {
      throw new AppError('DELIVERY_TIME_INVALID', "Please select a valid scheduled delivery time.");
    }
    if (new Date(dropoffIso).getTime() <= Date.now() + 15 * 60 * 1000) {
      throw new AppError('DELIVERY_TIME_TOO_SOON', "Please select a scheduled delivery time at least 15 minutes from now.");
    }
    request.dropoff_time = dropoffIso;
  }

  return request;
}

function summarizeDoorDashResponse(response = {}) {
  return {
    status: 'created',
    externalDeliveryId: response.external_delivery_id || null,
    deliveryStatus: response.delivery_status || null,
    trackingUrl: response.tracking_url || null,
    fee: Number.isFinite(response.fee) ? response.fee : null,
    tax: Number.isFinite(response.tax) ? response.tax : null,
    supportReference: response.support_reference || null,
    pickupTimeEstimated: response.pickup_time_estimated || null,
    dropoffTimeEstimated: response.dropoff_time_estimated || null,
    createdAt: new Date().toISOString()
  };
}

async function createDoorDashDelivery(order, request, credentials) {
  if (order.orderType !== 'delivery') return null;

  if (!request) {
    return {
      status: 'failed',
      error: 'DoorDash delivery request could not be built.',
      attemptedAt: new Date().toISOString()
    };
  }

  if (!hasDoorDashConfig(credentials)) {
    return {
      status: 'skipped',
      reason: 'not_configured',
      message: 'DoorDash credentials are not configured for this Cloud Function.',
      attemptedAt: new Date().toISOString()
    };
  }

  try {
    const response = await callDoorDash('/drive/v2/deliveries', 'POST', request, credentials);
    return summarizeDoorDashResponse(response);
  } catch (error) {
    return {
      status: 'failed',
      error: error.message || 'DoorDash delivery creation failed.',
      attemptedAt: new Date().toISOString()
    };
  }
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

function handleSquarePaymentConfig(req, res, checkoutEnvironment = 'production') {
  cors(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method Not Allowed');
    }

    const { applicationId, locationId } = getSquareCredentials(checkoutEnvironment);

    if (!applicationId || !locationId) {
      return res.status(500).json({
        success: false,
        error: `Square Payments is not configured for ${checkoutEnvironment}.`,
        code: 'PAYMENT_NOT_CONFIGURED'
      });
    }

    const environment = getSquareEnvironment(applicationId, checkoutEnvironment);
    res.status(200).json({
      success: true,
      appId: applicationId,
      locationId,
      environment,
      sdkUrl: getSquareSdkUrl(environment)
    });
  });
}

exports.getSquarePaymentConfig = onRequest({
  secrets: ["SQUARE_APPLICATION_ID", "SQUARE_LOCATION_ID"]
}, (req, res) => {
  handleSquarePaymentConfig(req, res, 'production');
});

exports.getSquarePaymentConfigSandbox = onRequest({
  secrets: ["SQUARE_SANDBOX_APPLICATION_ID", "SQUARE_SANDBOX_LOCATION_ID"]
}, (req, res) => {
  handleSquarePaymentConfig(req, res, 'sandbox');
});

function handleProcessPayment(req, res, checkoutEnvironment = 'production') {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { sourceId, amount, email, uid, tipAmount, orderType, branch, deliveryDetails, pickupDetails, items, subtotal, tax, discount, firstName, lastName, phone, specialInstructions, scheduledTime, scheduledDate, selectedReward } = req.body;
    let rewardValidation = null;
    const submittedSubtotal = toMoney(subtotal);
    const submittedDiscount = toMoney(discount);
    const submittedTip = Math.max(0, toMoney(tipAmount));
    const submittedTax = toMoney(tax);
    const submittedAmount = toMoney(amount);
    const isSandboxCheckout = isSandboxEnvironment(checkoutEnvironment);
    const { accessToken, applicationId, locationId } = getSquareCredentials(checkoutEnvironment);
    const doorDashCredentials = getDoorDashCredentials(checkoutEnvironment);
    const environment = getSquareEnvironment(applicationId, checkoutEnvironment);
    let rewardDebit = null;
    let paymentSucceeded = false;
    let doorDashDeliveryRequest = null;

    try {
      if (!sourceId) {
        throw new AppError('PAYMENT_TOKEN_MISSING', "Missing Square payment token.");
      }
      if (!accessToken || !applicationId || !locationId) {
        throw new AppError('PAYMENT_NOT_CONFIGURED', "Square Payments is not configured.");
      }

      const normalizedOrderType = normalizeOrderType(orderType);
      const normalizedBranch = normalizeBranch(branch || deliveryDetails?.branch || pickupDetails?.branch);
      const fulfillmentDetails = normalizeFulfillmentDetails({
        orderType: normalizedOrderType,
        branch: normalizedBranch,
        deliveryDetails,
        pickupDetails,
        scheduledDate
      });
      const normalizedItems = normalizeCartItems(items, normalizedBranch);
      const catalogSubtotal = calculatePaidSubtotal(normalizedItems);
      const expectedDiscount = calculateScheduledOrderDiscount(
        catalogSubtotal,
        normalizedOrderType,
        fulfillmentDetails.deliveryDetails,
        fulfillmentDetails.pickupDetails,
        scheduledDate,
        scheduledTime
      );
      const netFoodSubtotal = Math.max(0, toMoney(catalogSubtotal - expectedDiscount));
      const expectedTax = toMoney(netFoodSubtotal * TAX_RATE);
      const expectedAmount = toMoney(netFoodSubtotal + expectedTax + submittedTip);

      if (normalizedItems.length === 0) {
        throw new AppError('CART_EMPTY', "Cart is empty.");
      }

      if (catalogSubtotal < MINIMUM_ORDER_SUBTOTAL) {
        throw new AppError('ORDER_MINIMUM', `Delivery and pickup orders require a $${MINIMUM_ORDER_SUBTOTAL.toFixed(2)} minimum before tax, tip, or discounts.`);
      }

      rewardValidation = validateRewardSelection(selectedReward, normalizedItems, uid);

      if (Math.abs(submittedSubtotal - catalogSubtotal) > 0.02) {
        throw new AppError('ORDER_SUBTOTAL_MISMATCH', "Order subtotal does not match cart items.");
      }

      if (Math.abs(submittedDiscount - expectedDiscount) > 0.02) {
        throw new AppError('ORDER_DISCOUNT_MISMATCH', "Order discount does not match checkout details.");
      }

      if (Math.abs(submittedTax - expectedTax) > 0.05 || Math.abs(submittedAmount - expectedAmount) > 0.05) {
        throw new AppError('ORDER_TOTAL_MISMATCH', "Order total does not match cart items.");
      }

      const baseChargeCents = Math.round(toMoney(expectedAmount - submittedTip) * 100);
      const tipCents = Math.round(submittedTip * 100);

      if (baseChargeCents + tipCents < 1) {
        throw new AppError('ORDER_TOTAL_TOO_LOW', "Order total must be at least $0.01 to pay online.");
      }
      if (baseChargeCents < 1) {
        throw new AppError('ORDER_TOTAL_TIP_TOO_LOW', "Order total before tip must be at least $0.01 to pay online.");
      }

      if (rewardValidation && uid && !isSandboxCheckout) {
        const userRef = db.collection('users').doc(uid);
        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          const currentPoints = userDoc.exists ? userDoc.data().rewardPoints || 0 : 0;

          if (currentPoints < rewardValidation.pointCost) {
            throw new AppError('REWARD_INSUFFICIENT_POINTS', "Insufficient points for redemption.");
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
      const customerName = `${firstName || ''} ${lastName || ''}`.trim();
      const orderDraft = {
        orderId,
        checkoutEnvironment,
        uid: uid || null,
        customerName,
        customerEmail: email,
        customerPhone: phone || '',
        orderType: normalizedOrderType,
        branch: normalizedBranch,
        deliveryDetails: fulfillmentDetails.deliveryDetails,
        pickupDetails: fulfillmentDetails.pickupDetails,
        items: normalizedItems,
        subtotal: catalogSubtotal,
        tax: expectedTax,
        tip: submittedTip,
        discount: expectedDiscount,
        total: expectedAmount,
        specialInstructions: specialInstructions || '',
        scheduledFor: scheduledTime || null
      };

      if (orderDraft.orderType === 'delivery') {
        doorDashDeliveryRequest = buildDoorDashDeliveryRequest(orderDraft);
      }

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
        throw new AppError('PAYMENT_NOT_COMPLETED', `Square payment was not completed${payment?.status ? ` (${payment.status})` : ''}.`);
      }

      paymentSucceeded = true;

      if (uid && !isSandboxCheckout) {
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
        checkoutEnvironment,
        uid: uid || null,
        customerName,
        customerEmail: email,
        customerPhone: phone || '',
        orderType: normalizedOrderType,
        branch: normalizedBranch,
        deliveryDetails: fulfillmentDetails.deliveryDetails,
        pickupDetails: fulfillmentDetails.pickupDetails,
        items: normalizedItems,
        reward: rewardValidation,
        subtotal: catalogSubtotal,
        tax: expectedTax,
        tip: submittedTip,
        discount: expectedDiscount,
        total: expectedAmount,
        specialInstructions: specialInstructions || '',
        scheduledFor: scheduledTime || null,
        status: isSandboxCheckout ? 'sandbox_pending' : 'pending',
        paymentStatus: isSandboxCheckout ? 'sandbox_paid' : 'paid',
        paymentProvider: 'square',
        squarePaymentId: payment.id || null,
        squarePaymentStatus: payment.status || null,
        squareReceiptUrl: payment.receipt_url || null,
        squareCard: buildSquareCardSummary(payment),
        doordash: null,
        notifications: isSandboxCheckout ? { skipped: true, reason: 'sandbox_checkout' } : null,
        createdAt: FieldValue.serverTimestamp()
      };

      if (orderData.orderType === 'delivery') {
        orderData.doordash = await createDoorDashDelivery(orderData, doorDashDeliveryRequest, doorDashCredentials);
      }

      await db.collection('orders').doc(orderId).set(orderData);

      if (!isSandboxCheckout) {
        try {
          await sendOrderConfirmationEmails(orderData);
        } catch (emailErr) {
          logger.error("Failed to send confirmation emails", emailErr);
        }
      }

      res.status(200).json({
        success: true,
        orderId,
        payment: {
          id: payment.id || null,
          status: payment.status || null,
          receiptUrl: payment.receipt_url || null
        },
        delivery: orderData.doordash
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
      res.status(500).json({ success: false, error: error.message || "Internal Server Error", code: error.code || 'INTERNAL' });
    }
  });
}

// --- SQUARE EMBEDDED PAYMENT FUNCTION (v2) ---
exports.processPayment = onRequest({
  secrets: [
    "SQUARE_ACCESS_TOKEN",
    "SQUARE_APPLICATION_ID",
    "SQUARE_LOCATION_ID",
    "DOORDASH_DEVELOPER_ID",
    "DOORDASH_KEY_ID",
    "DOORDASH_SIGNING_SECRET"
  ]
}, (req, res) => {
  handleProcessPayment(req, res, 'production');
});

exports.processPaymentSandbox = onRequest({
  secrets: [
    "SQUARE_SANDBOX_ACCESS_TOKEN",
    "SQUARE_SANDBOX_APPLICATION_ID",
    "SQUARE_SANDBOX_LOCATION_ID",
    "DOORDASH_SANDBOX_DEVELOPER_ID",
    "DOORDASH_SANDBOX_KEY_ID",
    "DOORDASH_SANDBOX_SIGNING_SECRET"
  ]
}, (req, res) => {
  handleProcessPayment(req, res, 'sandbox');
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

function getDoorDashRestaurantSummary(order) {
  if (order.orderType !== 'delivery') return '';

  const delivery = order.doordash;
  if (!delivery) {
    return `--- DOORDASH ---
Status: Not attempted
`;
  }

  if (delivery.status === 'created') {
    return `--- DOORDASH ---
Status: Created${delivery.deliveryStatus ? ` (${delivery.deliveryStatus})` : ''}
External ID: ${delivery.externalDeliveryId || 'N/A'}
Tracking: ${delivery.trackingUrl || 'N/A'}
Estimated pickup: ${delivery.pickupTimeEstimated || 'N/A'}
Estimated dropoff: ${delivery.dropoffTimeEstimated || 'N/A'}
Support reference: ${delivery.supportReference || 'N/A'}
`;
  }

  if (delivery.status === 'skipped') {
    return `--- DOORDASH ---
Status: Skipped
Reason: ${delivery.message || delivery.reason || 'N/A'}
`;
  }

  return `--- DOORDASH ---
Status: Failed
Error: ${delivery.error || 'N/A'}
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
${getDoorDashRestaurantSummary(order)}
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
      res.status(500).json({ success: false, error: error.message || "Internal Server Error", code: error.code || 'INTERNAL' });
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
