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
};

const STORE_TIME_ZONE = 'America/New_York';
const STORE_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: STORE_TIME_ZONE,
  weekday: 'long',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function getStoreDateParts(date = new Date()) {
  const parts = Object.fromEntries(
    STORE_DATE_FORMATTER.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  return {
    dayKey: parts.weekday.toLowerCase(),
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

function getStoreDateWithOffset(offsetDays, baseDate = new Date()) {
  const baseParts = getStoreDateParts(baseDate);
  return new Date(Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day + offsetDays, 12, 0, 0));
}

function isStoreOpen(branch) {
  const now = getStoreDateParts();
  const hours = STORE_HOURS[branch]?.[now.dayKey];

  if (!hours || hours.closed) return false;

  const currentTime = now.hour * 60 + now.minute;
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
    const date = getStoreDateWithOffset(i, now);
    const day = getStoreDateParts(date).dayKey;
    const hours = STORE_HOURS[branch]?.[day];

    if (hours && !hours.closed) {
      dates.push({
        date: date,
        label: i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { timeZone: STORE_TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric' }),
        hours: hours
      });
    }
  }

  return dates;
}


function getStoreHoursForToday(branch) {
  const now = getStoreDateParts();
  return STORE_HOURS[branch]?.[now.dayKey] || null;
}

if (typeof window !== 'undefined') {
  window.STORE_HOURS = STORE_HOURS;
  window.STORE_TIME_ZONE = STORE_TIME_ZONE;
  window.isStoreOpen = isStoreOpen;
  window.getNextAvailableDates = getNextAvailableDates;
  window.getStoreHoursForToday = getStoreHoursForToday;
}
