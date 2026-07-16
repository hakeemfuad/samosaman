/**
 * Normalized error handling for the Samosaman site.
 *
 * Single source of truth for turning any thrown/returned error into a stable
 * { code, message } pair for the UI. Codes come from three places:
 *   - Firebase Auth   (error.code === 'auth/...')
 *   - Server responses (fetchJson attaches result.code onto the thrown Error)
 *   - Client-originated failures (set err.code before throwing)
 *
 * Only codes with a fully static, user-facing message live in MESSAGES. Dynamic
 * server messages (amounts, item counts) carry a code for analytics but are
 * displayed as-sent, so we never duplicate that copy on the client.
 */
(function () {
  'use strict';

  var MESSAGES = {
    // Firebase Auth
    'auth/invalid-credential': 'Incorrect email or password. Please try again.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',

    // Checkout / payment (client-originated)
    'SQUARE_SDK_LOAD': 'Unable to load secure payment. Please refresh and try again.',
    'SQUARE_SDK_INIT': 'Secure payment could not start. Please refresh and try again.',
    'PAYMENT_STILL_LOADING': 'Secure payment is still loading. Please wait a moment.',

    // Generic fallback
    'INTERNAL': 'Something went wrong. Please try again.'
  };

  var DEFAULT_MESSAGE = MESSAGES.INTERNAL;

  function cleanMessage(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(/^Firebase:\s*/i, '')
      .replace(/^Error:\s*/i, '')
      .replace(/\s*\(auth\/[^)]+\)\.?$/, '')
      .trim();
  }

  function extractCode(error) {
    if (!error || typeof error !== 'object') return null;
    if (error.code) return error.code;
    var match = String(error.message || '').match(/auth\/[a-z-]+/i);
    return match ? match[0] : null;
  }

  /**
   * Normalize any error shape into { code, message }.
   * Accepts an Error, a plain string, or a { code, error/message } object.
   */
  function resolve(error) {
    if (error == null) {
      return { code: 'INTERNAL', message: DEFAULT_MESSAGE };
    }

    if (typeof error === 'string') {
      return { code: null, message: cleanMessage(error) || DEFAULT_MESSAGE };
    }

    var code = extractCode(error);

    // Known code -> catalog message is the single source of truth.
    if (code && Object.prototype.hasOwnProperty.call(MESSAGES, code)) {
      return { code: code, message: MESSAGES[code] };
    }

    // Otherwise prefer a cleaned human message (covers dynamic server text).
    var message = cleanMessage(error.message || error.error);
    if (message) {
      return { code: code || null, message: message };
    }

    return { code: code || 'INTERNAL', message: DEFAULT_MESSAGE };
  }

  /**
   * Render a resolved message into a simple container element (toggles the
   * `hidden` class). Returns the resolved { code, message }.
   */
  function show(element, error) {
    var resolved = resolve(error);
    if (!element) return resolved;
    element.innerText = resolved.message;
    element.classList.remove('hidden');
    return resolved;
  }

  function clear(element) {
    if (!element) return;
    element.innerText = '';
    element.classList.add('hidden');
  }

  window.SamosamanErrors = {
    MESSAGES: MESSAGES,
    resolve: resolve,
    show: show,
    clear: clear
  };
})();
