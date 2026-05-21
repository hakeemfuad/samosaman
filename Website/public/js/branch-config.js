// Centralized branch configuration for SamosaMan delivery system
// Single source of truth for branch data, coordinates, and delivery settings

const BRANCH_CONFIG = {
  Burlington: {
    lat: 44.4759,
    lng: -73.2121,
    phone: '(802)-881-7607',
    displayName: 'Burlington, VT'
  }
};

const DELIVERY_RADIUS_MILES = 15;

// Google Maps API Key - Replace with your actual key
const GOOGLE_MAPS_API_KEY = 'AIzaSyD5voQI-AKGFVikvRXX_fLKJB4UtGgkr-4';

// Export to window object for global access
if (typeof window !== 'undefined') {
  window.BRANCH_CONFIG = BRANCH_CONFIG;
  window.DELIVERY_RADIUS_MILES = DELIVERY_RADIUS_MILES;
  window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;
}
