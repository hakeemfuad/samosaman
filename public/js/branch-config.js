// Centralized branch configuration for SamosaMan delivery system
// Single source of truth for branch data, coordinates, and delivery settings

const BRANCH_CONFIG = {
  Burlington: {
    lat: 44.4759,
    lng: -73.2121,
    phone: '(802)-881-7607',
    displayName: 'Burlington, VT'
  },
  Boston: {
    lat: 42.3601,
    lng: -71.0589,
    phone: '(802)-233-7783',
    displayName: 'Boston, MA'
  },
  Hanover: {
    lat: 43.7022,
    lng: -72.2896,  // Consistent with sq-payment.js
    phone: '(802)-233-7783',
    displayName: 'Hanover, NH'
  }
};

const DELIVERY_RADIUS_MILES = 15;

const GOOGLE_MAPS_API_KEY = window.APP_CONFIG?.googleMapsApiKey || '';

// Export to window object for global access
if (typeof window !== 'undefined') {
  window.BRANCH_CONFIG = BRANCH_CONFIG;
  window.DELIVERY_RADIUS_MILES = DELIVERY_RADIUS_MILES;
  window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;
}

if (!GOOGLE_MAPS_API_KEY) {
  console.warn(
    'Google Maps API key is missing. Create public/js/app-config.js from public/js/app-config.example.js.'
  );
}
