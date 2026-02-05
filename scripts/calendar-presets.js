// Easy Calendar - Built-in Calendar Presets

import { DEFAULT_TIME_CONFIG, DEFAULT_YEAR_CONFIG, DEFAULT_MOON } from './constants.js';

export const PRESETS = {
  gregorian: {
    id: 'gregorian',
    name: 'Gregorian Calendar',
    namePrefix: '',
    nameSuffix: '',

    weekdays: [
      { id: 'sun', name: 'Sunday', abbreviation: 'Sun' },
      { id: 'mon', name: 'Monday', abbreviation: 'Mon' },
      { id: 'tue', name: 'Tuesday', abbreviation: 'Tue' },
      { id: 'wed', name: 'Wednesday', abbreviation: 'Wed' },
      { id: 'thu', name: 'Thursday', abbreviation: 'Thu' },
      { id: 'fri', name: 'Friday', abbreviation: 'Fri' },
      { id: 'sat', name: 'Saturday', abbreviation: 'Sat' }
    ],
    firstWeekday: 0,  // Sunday

    months: [
      { id: 'jan', name: 'January', abbreviation: 'Jan', days: 31 },
      { id: 'feb', name: 'February', abbreviation: 'Feb', days: 28 },
      { id: 'mar', name: 'March', abbreviation: 'Mar', days: 31 },
      { id: 'apr', name: 'April', abbreviation: 'Apr', days: 30 },
      { id: 'may', name: 'May', abbreviation: 'May', days: 31 },
      { id: 'jun', name: 'June', abbreviation: 'Jun', days: 30 },
      { id: 'jul', name: 'July', abbreviation: 'Jul', days: 31 },
      { id: 'aug', name: 'August', abbreviation: 'Aug', days: 31 },
      { id: 'sep', name: 'September', abbreviation: 'Sep', days: 30 },
      { id: 'oct', name: 'October', abbreviation: 'Oct', days: 31 },
      { id: 'nov', name: 'November', abbreviation: 'Nov', days: 30 },
      { id: 'dec', name: 'December', abbreviation: 'Dec', days: 31 }
    ],

    yearConfig: {
      ...DEFAULT_YEAR_CONFIG,
      startingYear: 2024
    },

    time: { ...DEFAULT_TIME_CONFIG },

    leapYear: {
      enabled: true,
      rule: 'gregorian',
      interval: 4,
      months: [{ monthId: 'feb', extraDays: 1 }]
    },

    seasons: [
      { id: 'spring', name: 'Spring', startingMonth: 2, startingDay: 20, color: '#46b946', icon: 'spring', sunriseTime: 21600, sunsetTime: 68400 },
      { id: 'summer', name: 'Summer', startingMonth: 5, startingDay: 21, color: '#e0c40b', icon: 'summer', sunriseTime: 18000, sunsetTime: 75600 },
      { id: 'fall', name: 'Fall', startingMonth: 8, startingDay: 22, color: '#ff8e47', icon: 'fall', sunriseTime: 23400, sunsetTime: 66600 },
      { id: 'winter', name: 'Winter', startingMonth: 11, startingDay: 21, color: '#479dff', icon: 'winter', sunriseTime: 27000, sunsetTime: 61200 }
    ],

    moons: [
      {
        id: 'moon',
        name: 'Moon',
        cycleLength: 29.53059,
        color: '#ffffff',
        phases: [
          { name: 'New Moon', length: 1, icon: 'new', singleDay: true },
          { name: 'Waxing Crescent', length: 6.38265, icon: 'waxing-crescent', singleDay: false },
          { name: 'First Quarter', length: 1, icon: 'first-quarter', singleDay: true },
          { name: 'Waxing Gibbous', length: 6.38265, icon: 'waxing-gibbous', singleDay: false },
          { name: 'Full Moon', length: 1, icon: 'full', singleDay: true },
          { name: 'Waning Gibbous', length: 6.38265, icon: 'waning-gibbous', singleDay: false },
          { name: 'Last Quarter', length: 1, icon: 'last-quarter', singleDay: true },
          { name: 'Waning Crescent', length: 6.38265, icon: 'waning-crescent', singleDay: false }
        ],
        referenceNewMoon: { year: 2000, month: 0, day: 6 }
      }
    ]
  }
};

/**
 * Get a preset configuration by ID
 * @param {string} presetId - The preset identifier
 * @returns {Object|null} The preset configuration or null if not found
 */
export function getPreset(presetId) {
  return PRESETS[presetId] ? foundry.utils.deepClone(PRESETS[presetId]) : null;
}

/**
 * Get all available preset IDs
 * @returns {string[]} Array of preset identifiers
 */
export function getPresetIds() {
  return Object.keys(PRESETS);
}

/**
 * Get preset display names for selection
 * @returns {Object} Object with preset IDs as keys and display names as values
 */
export function getPresetChoices() {
  const choices = {};
  for (const [id, preset] of Object.entries(PRESETS)) {
    choices[id] = preset.name;
  }
  return choices;
}
