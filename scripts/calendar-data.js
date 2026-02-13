// Easy Calendar - Data Layer

import { MODULE_ID, SETTINGS, FLAGS, DEFAULT_TIME_CONFIG, DEFAULT_YEAR_CONFIG, DEFAULT_LEAP_YEAR_CONFIG } from './constants.js';
import { getPreset } from './calendar-presets.js';
import * as CalendarTime from './calendar-time.js';

/**
 * CalendarData handles all calendar configuration and state persistence
 */
export class CalendarData {

  /**
   * Get the current calendar configuration
   * @returns {Object} The calendar configuration
   */
  static getConfig() {
    return game.settings.get(MODULE_ID, SETTINGS.CALENDAR_CONFIG);
  }

  /**
   * Set the calendar configuration
   * @param {Object} config - The new configuration
   * @returns {Promise<Object>} The saved configuration
   */
  static async setConfig(config) {
    const result = await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_CONFIG, config);
    Hooks.callAll('easyCalendarConfigChanged', config);
    return result;
  }

  /**
   * Get the current calendar state (date/time)
   * @returns {Object} The calendar state
   */
  static getState() {
    return game.settings.get(MODULE_ID, SETTINGS.CALENDAR_STATE);
  }

  /**
   * Set the calendar state
   * @param {Object} state - The new state
   * @param {Object} options - Options for setting state
   * @param {boolean} options.updateWorldTime - Whether to sync to world time
   * @returns {Promise<Object>} The saved state
   */
  static async setState(state, { updateWorldTime = true } = {}) {
    const config = this.getConfig();
    const normalizedState = CalendarTime.normalizeDate(state, config);

    // Calculate weekday
    normalizedState.weekday = CalendarTime.calculateWeekday(
      normalizedState.year,
      normalizedState.month,
      normalizedState.day,
      config
    );

    // Preserve sync settings
    const currentState = this.getState();
    normalizedState.syncEnabled = currentState.syncEnabled;
    normalizedState.lastSyncedWorldTime = currentState.lastSyncedWorldTime;

    // Save the state
    await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_STATE, normalizedState);

    // Optionally sync to world time
    if (updateWorldTime && normalizedState.syncEnabled && game.user.isGM) {
      await this.syncToWorldTime(normalizedState);
    }

    // Notify listeners that state changed
    Hooks.callAll('easyCalendarStateChanged', normalizedState);

    return normalizedState;
  }

  /**
   * Sync calendar state to Foundry's world time
   * @param {Object} state - The calendar state
   */
  static async syncToWorldTime(state) {
    const config = this.getConfig();
    const worldTime = CalendarTime.toWorldTime(state, config);

    // Set flag to prevent feedback loop
    this._isUpdatingToWorldTime = true;

    try {
      await game.time.advance(worldTime - game.time.worldTime);

      // Update last synced time
      await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_STATE, {
        ...state,
        lastSyncedWorldTime: worldTime
      });
    } finally {
      this._isUpdatingToWorldTime = false;
    }
  }

  /**
   * Sync calendar state from Foundry's world time
   * @param {number} worldTime - The world time in seconds
   */
  static async syncFromWorldTime(worldTime) {
    // Prevent feedback loop
    if (this._isUpdatingToWorldTime) return;

    const currentState = this.getState();
    if (!currentState.syncEnabled) return;

    // Check if this is the same world time we last synced to
    if (currentState.lastSyncedWorldTime === worldTime) return;

    const config = this.getConfig();

    // Calculate the delta between new world time and last synced world time,
    // then apply that delta to the calendar's own time representation.
    // We cannot use fromWorldTime(worldTime) directly because Foundry's absolute
    // worldTime has no relation to the calendar's epoch.
    const delta = worldTime - (currentState.lastSyncedWorldTime ?? worldTime);
    const currentCalendarTime = CalendarTime.toWorldTime(currentState, config);
    const newState = CalendarTime.fromWorldTime(currentCalendarTime + delta, config);

    // Preserve sync settings and update last synced time
    newState.syncEnabled = currentState.syncEnabled;
    newState.lastSyncedWorldTime = worldTime;
    newState.weekday = CalendarTime.calculateWeekday(
      newState.year,
      newState.month,
      newState.day,
      config
    );

    this._isUpdatingFromWorldTime = true;
    try {
      await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_STATE, newState);
    } finally {
      this._isUpdatingFromWorldTime = false;
    }

    // Trigger UI refresh
    Hooks.callAll('easyCalendarStateChanged', newState);
  }

  /**
   * Toggle world time sync
   * @param {boolean} enabled - Whether sync should be enabled
   */
  static async setSyncEnabled(enabled) {
    const state = this.getState();
    state.syncEnabled = enabled;

    if (enabled) {
      // Just record current world time as last synced - don't change anything
      state.lastSyncedWorldTime = game.time.worldTime;
    }

    await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_STATE, state);
    return state;
  }

  /**
   * Advance the calendar by a specified amount
   * @param {number} amount - Amount to advance (can be negative)
   * @param {string} unit - Unit: 'second', 'minute', 'hour', 'day', 'week', 'month', 'year'
   * @returns {Promise<Object>} The new calendar state
   */
  static async advance(amount, unit) {
    const state = this.getState();
    const config = this.getConfig();
    const { hoursPerDay, minutesPerHour, secondsPerMinute } = config.time;
    const secondsPerDay = hoursPerDay * minutesPerHour * secondsPerMinute;

    // For month/year, calculate exact delta using world time difference
    // For smaller units, calculate directly
    let secondsDelta = 0;
    const beforeWorldTime = CalendarTime.toWorldTime(state, config);

    switch (unit) {
      case 'second':
        state.second += amount;
        secondsDelta = amount;
        break;
      case 'minute':
        state.minute += amount;
        secondsDelta = amount * secondsPerMinute;
        break;
      case 'hour':
        state.hour += amount;
        secondsDelta = amount * minutesPerHour * secondsPerMinute;
        break;
      case 'day':
        state.day += amount;
        secondsDelta = amount * secondsPerDay;
        break;
      case 'week': {
        const daysInWeek = config.weekdays.length;
        state.day += amount * daysInWeek;
        secondsDelta = amount * daysInWeek * secondsPerDay;
        break;
      }
      case 'month':
        state.month += amount;
        secondsDelta = CalendarTime.toWorldTime(state, config) - beforeWorldTime;
        break;
      case 'year':
        state.year += amount;
        secondsDelta = CalendarTime.toWorldTime(state, config) - beforeWorldTime;
        break;
    }

    // Save state without automatic world time sync (we'll handle it manually)
    const newState = await this.setState(state, { updateWorldTime: false });

    // Manually advance world time by the calculated delta
    if (newState.syncEnabled && game.user.isGM && secondsDelta !== 0) {
      this._isUpdatingToWorldTime = true;
      try {
        await game.time.advance(secondsDelta);
        // Update last synced time
        await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_STATE, {
          ...newState,
          lastSyncedWorldTime: game.time.worldTime
        });
      } finally {
        this._isUpdatingToWorldTime = false;
      }
    }

    return newState;
  }

  /**
   * Set a specific date
   * @param {Object} date - Date object { year, month, day }
   * @param {Object} options - Options
   * @param {boolean} options.updateWorldTime - Whether to update world time (default: false for explicit sets)
   * @returns {Promise<Object>} The new calendar state
   */
  static async setDate(date, { updateWorldTime = false } = {}) {
    const state = this.getState();
    return this.setState({
      ...state,
      year: date.year ?? state.year,
      month: date.month ?? state.month,
      day: date.day ?? state.day
    }, { updateWorldTime });
  }

  /**
   * Set a specific time
   * @param {Object} time - Time object { hour, minute, second }
   * @param {Object} options - Options
   * @param {boolean} options.updateWorldTime - Whether to update world time (default: false for explicit sets)
   * @returns {Promise<Object>} The new calendar state
   */
  static async setTime(time, { updateWorldTime = false } = {}) {
    const state = this.getState();
    return this.setState({
      ...state,
      hour: time.hour ?? state.hour,
      minute: time.minute ?? state.minute,
      second: time.second ?? state.second
    }, { updateWorldTime });
  }

  /**
   * Load a preset calendar configuration
   * @param {string} presetId - The preset identifier
   * @returns {Promise<Object>} The loaded configuration
   */
  static async loadPreset(presetId) {
    const preset = getPreset(presetId);
    if (!preset) {
      throw new Error(`Unknown preset: ${presetId}`);
    }

    await this.setConfig(preset);

    // Reset state to starting year, month 0, day 1
    await this.setState({
      year: preset.yearConfig.startingYear,
      month: 0,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      syncEnabled: false,
      lastSyncedWorldTime: 0
    }, { updateWorldTime: false });

    return preset;
  }

  /**
   * Export the current calendar configuration
   * @param {boolean} includeState - Whether to include current date/time
   * @returns {Object} Exportable configuration object
   */
  static exportConfig(includeState = false) {
    const config = this.getConfig();
    const exportData = {
      version: 1,
      config: config
    };

    if (includeState) {
      const state = this.getState();
      exportData.state = {
        year: state.year,
        month: state.month,
        day: state.day,
        hour: state.hour,
        minute: state.minute,
        second: state.second
      };
    }

    return exportData;
  }

  /**
   * Import a calendar configuration
   * @param {Object} data - The imported data
   * @param {boolean} importState - Whether to import the state if present
   * @returns {Promise<Object>} The imported configuration
   */
  static async importConfig(data, importState = true) {
    // Validate the import data
    if (!data.config) {
      throw new Error('Invalid import data: missing config');
    }

    // Validate required fields
    const required = ['weekdays', 'months', 'yearConfig', 'time'];
    for (const field of required) {
      if (!data.config[field]) {
        throw new Error(`Invalid import data: missing ${field}`);
      }
    }

    // Generate a new ID if not present
    if (!data.config.id) {
      data.config.id = foundry.utils.randomID();
    }

    // Set defaults for optional fields
    data.config.name = data.config.name || 'Imported Calendar';
    data.config.namePrefix = data.config.namePrefix || '';
    data.config.nameSuffix = data.config.nameSuffix || '';
    data.config.firstWeekday = data.config.firstWeekday ?? 0;
    data.config.leapYear = data.config.leapYear || { ...DEFAULT_LEAP_YEAR_CONFIG };

    await this.setConfig(data.config);

    // Import state if present and requested
    if (importState && data.state) {
      await this.setState({
        ...data.state,
        syncEnabled: false,
        lastSyncedWorldTime: 0
      }, { updateWorldTime: false });
    } else {
      // Reset to starting year
      await this.setState({
        year: data.config.yearConfig.startingYear,
        month: 0,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        syncEnabled: false,
        lastSyncedWorldTime: 0
      }, { updateWorldTime: false });
    }

    return data.config;
  }

  /**
   * Import from Simple Calendar export format
   * @param {Object} data - The Simple Calendar export data
   * @param {boolean} importState - Whether to import the current date
   * @returns {Promise<Object>} The imported configuration
   */
  static async importFromSimpleCalendar(data, importState = true) {
    // Simple Calendar exports have calendars array
    if (!data.calendars || data.calendars.length === 0) {
      throw new Error('Invalid Simple Calendar export: no calendars found');
    }

    const sc = data.calendars[0]; // Use first calendar

    // Convert to Easy Calendar format
    const config = {
      id: sc.id || foundry.utils.randomID(),
      name: sc.name || 'Imported Calendar',
      namePrefix: '',
      nameSuffix: '',

      // Convert weekdays
      weekdays: (sc.weekdays || []).map(wd => ({
        id: wd.id || foundry.utils.randomID(8),
        name: wd.name,
        abbreviation: wd.abbreviation || wd.name.substring(0, 3)
      })),

      firstWeekday: sc.year?.firstWeekday ?? 0,

      // Convert months
      months: (sc.months || []).map(m => ({
        id: m.id || foundry.utils.randomID(8),
        name: m.name,
        abbreviation: m.abbreviation || m.name.substring(0, 3),
        days: m.numberOfDays || m.days || 30,
        leapYearDays: m.numberOfLeapYearDays
      })),

      // Year config
      yearConfig: {
        startingYear: sc.year?.numericRepresentation || 1,
        yearZeroExists: sc.year?.yearZero !== undefined,
        yearPrefix: sc.year?.prefix || '',
        yearSuffix: sc.year?.postfix || ''
      },

      // Time config
      time: {
        hoursPerDay: sc.time?.hoursInDay || 24,
        minutesPerHour: sc.time?.minutesInHour || 60,
        secondsPerMinute: sc.time?.secondsInMinute || 60
      },

      // Leap year config
      leapYear: {
        enabled: sc.leapYear?.rule !== 'none',
        rule: sc.leapYear?.rule === 'gregorian' ? 'gregorian' : 'simple',
        interval: sc.leapYear?.customMod || 4,
        months: []
      },

      // Convert seasons
      seasons: (sc.seasons || []).map(s => ({
        id: s.id || foundry.utils.randomID(8),
        name: s.name,
        startingMonth: s.startingMonth,
        startingDay: s.startingDay,
        color: s.color || '#46b946',
        icon: s.icon || 'spring',
        sunriseTime: s.sunriseTime || 21600,
        sunsetTime: s.sunsetTime || 64800
      })),

      // Convert moons
      moons: (sc.moons || []).map(m => ({
        id: m.id || foundry.utils.randomID(8),
        name: m.name,
        cycleLength: m.cycleLength || 29.53059,
        color: m.color || '#ffffff',
        phases: (m.phases || []).map(p => ({
          name: p.name,
          length: p.length,
          icon: p.icon,
          singleDay: p.singleDay || false
        })),
        referenceNewMoon: {
          year: m.firstNewMoon?.year || 2000,
          month: m.firstNewMoon?.month || 0,
          day: m.firstNewMoon?.day || 6
        }
      }))
    };

    // Handle leap year months - find months that have different leap year days
    config.months.forEach(m => {
      if (m.leapYearDays && m.leapYearDays !== m.days) {
        config.leapYear.months.push({
          monthId: m.id,
          extraDays: m.leapYearDays - m.days
        });
      }
      delete m.leapYearDays; // Clean up
    });

    // Enable leap year if any months have leap year config
    if (config.leapYear.months.length > 0) {
      config.leapYear.enabled = true;
    }

    await this.setConfig(config);

    // Import current date if present and requested
    if (importState && sc.currentDate) {
      const { hoursPerDay, minutesPerHour, secondsPerMinute } = config.time;
      const secondsPerHour = minutesPerHour * secondsPerMinute;

      // Convert seconds since midnight to hour/minute/second
      const totalSeconds = sc.currentDate.seconds || 0;
      const hour = Math.floor(totalSeconds / secondsPerHour);
      const minute = Math.floor((totalSeconds % secondsPerHour) / secondsPerMinute);
      const second = totalSeconds % secondsPerMinute;

      await this.setState({
        year: sc.currentDate.year,
        month: sc.currentDate.month,
        day: sc.currentDate.day,
        hour,
        minute,
        second,
        syncEnabled: false,
        lastSyncedWorldTime: 0
      }, { updateWorldTime: false });
    } else {
      // Reset to year 1, month 0, day 1
      await this.setState({
        year: config.yearConfig.startingYear,
        month: 0,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        syncEnabled: false,
        lastSyncedWorldTime: 0
      }, { updateWorldTime: false });
    }

    return config;
  }

  /**
   * Detect import format and import accordingly
   * @param {Object} data - The import data
   * @param {boolean} importState - Whether to import state
   * @returns {Promise<Object>} The imported configuration
   */
  static async autoImport(data, importState = true) {
    // Detect Simple Calendar format (has calendars array)
    if (data.calendars && Array.isArray(data.calendars)) {
      return this.importFromSimpleCalendar(data, importState);
    }

    // Otherwise use standard Easy Calendar format
    return this.importConfig(data, importState);
  }

  /**
   * Get the default calendar configuration (Gregorian)
   * @returns {Object} Default configuration
   */
  static getDefaultConfig() {
    return getPreset('gregorian');
  }

  /**
   * Get the default calendar state
   * @returns {Object} Default state
   */
  static getDefaultState() {
    const config = this.getDefaultConfig();
    return {
      year: config.yearConfig.startingYear,
      month: 0,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      weekday: 0,
      syncEnabled: false,
      lastSyncedWorldTime: 0
    };
  }
}
