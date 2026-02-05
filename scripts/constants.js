// Easy Calendar - Constants and Defaults

export const MODULE_ID = 'easy-calendar';

export const SETTINGS = {
  PANEL_POSITION: 'panelPosition',
  PANEL_VISIBLE: 'panelVisible',
  PANEL_MODE: 'panelMode',
  CALENDAR_CONFIG: 'calendarConfig',
  CALENDAR_STATE: 'calendarState',
  WEEKDAY_OFFSET: 'weekdayOffset',
  SYNC_WORLD_TIME: 'syncWorldTime',
  PLAYERS_CAN_ADVANCE: 'playersCanAdvance'
};

export const FLAGS = {
  CALENDAR_STATE: 'calendarState'
};

export const DEFAULT_TIME_CONFIG = {
  hoursPerDay: 24,
  minutesPerHour: 60,
  secondsPerMinute: 60
};

export const DEFAULT_YEAR_CONFIG = {
  startingYear: 1,
  yearZeroExists: false,
  yearPrefix: '',
  yearSuffix: ''
};

export const DEFAULT_LEAP_YEAR_CONFIG = {
  enabled: false,
  rule: 'gregorian',
  interval: 4,
  months: []
};

export const DEFAULT_SEASON = {
  id: '',
  name: 'New Season',
  startingMonth: 0,
  startingDay: 1,
  color: '#46b946',
  icon: 'spring',
  sunriseTime: 21600,  // 6:00 AM in seconds
  sunsetTime: 64800    // 6:00 PM in seconds
};

export const SEASON_ICONS = ['spring', 'summer', 'fall', 'winter'];

export const DEFAULT_MOON = {
  id: '',
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
  // Reference point for moon cycle calculation
  referenceNewMoon: {
    year: 2000,
    month: 0,
    day: 6
  }
};

export const MOON_PHASE_ICONS = {
  'new': '🌑',
  'waxing-crescent': '🌒',
  'first-quarter': '🌓',
  'waxing-gibbous': '🌔',
  'full': '🌕',
  'waning-gibbous': '🌖',
  'last-quarter': '🌗',
  'waning-crescent': '🌘'
};
