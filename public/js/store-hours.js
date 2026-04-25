// Store Hours Configuration for SamosaMan
// Single source of truth for store hours across all branches

const STORE_HOURS = {
  Burlington: {
    monday: { open: '10:00', close: '21:00', closed: false },
    tuesday: { open: '10:00', close: '21:00', closed: false },
    wednesday: { open: '10:00', close: '21:00', closed: false },
    thursday: { open: '10:00', close: '21:00', closed: false },
    friday: { open: '10:00', close: '22:00', closed: false },
    saturday: { open: '10:00', close: '22:00', closed: false },
    sunday: { open: '10:00', close: '20:00', closed: false }
  },
  Boston: {
    monday: { open: '10:00', close: '21:00', closed: false },
    tuesday: { open: '10:00', close: '21:00', closed: false },
    wednesday: { open: '10:00', close: '21:00', closed: false },
    thursday: { open: '10:00', close: '21:00', closed: false },
    friday: { open: '10:00', close: '22:00', closed: false },
    saturday: { open: '10:00', close: '22:00', closed: false },
    sunday: { open: '10:00', close: '20:00', closed: false }
  },
  Hanover: {
    monday: { open: '10:00', close: '21:00', closed: false },
    tuesday: { open: '10:00', close: '21:00', closed: false },
    wednesday: { open: '10:00', close: '21:00', closed: false },
    thursday: { open: '10:00', close: '21:00', closed: false },
    friday: { open: '10:00', close: '22:00', closed: false },
    saturday: { open: '10:00', close: '22:00', closed: false },
    sunday: { open: '10:00', close: '20:00', closed: false }
  }
};

function isStoreOpen(branch) {
  const now = new Date();
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const hours = STORE_HOURS[branch]?.[day];

  if (!hours || hours.closed) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  return currentTime >= openTime && currentTime < closeTime;
}

function getNextAvailableDates(branch, numDays = 7) {
  const dates = [];
  const now = new Date();

  // Start from 1 to skip "Today" as per user request
  // Go up to numDays to provide a full week of options
  for (let i = 1; i <= numDays; i++) {

    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const hours = STORE_HOURS[branch]?.[day];

    if (hours && !hours.closed) {
      dates.push({
        date: date,
        label: i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        hours: hours
      });
    }
  }

  return dates;
}


function getStoreHoursForToday(branch) {
  const now = new Date();
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  return STORE_HOURS[branch]?.[day] || null;
}

if (typeof window !== 'undefined') {
  window.STORE_HOURS = STORE_HOURS;
  window.isStoreOpen = isStoreOpen;
  window.getNextAvailableDates = getNextAvailableDates;
  window.getStoreHoursForToday = getStoreHoursForToday;
}
