// Easy Calendar - Main Calendar Application

import { MODULE_ID, SETTINGS } from './constants.js';
import { CalendarData } from './calendar-data.js';
import * as CalendarTime from './calendar-time.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CalendarApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(options = {}) {
    // Load saved position from user flags (per-user)
    const savedPosition = game.user.getFlag(MODULE_ID, SETTINGS.PANEL_POSITION);
    options.position = {
      ...options.position,
      ...savedPosition
    };

    super(options);

    // Timer for real-time updates when synced
    this._timeUpdateInterval = null;

    // Selected time unit for advance controls
    this._selectedUnit = 'hour';

    // Display mode: full or compact (collapse is handled by Foundry's native minimize)
    this._displayMode = game.user.getFlag(MODULE_ID, SETTINGS.PANEL_MODE) || 'full';
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: 'easy-calendar-panel',
    classes: ['easy-calendar'],
    position: {
      width: 300,
      height: 'auto'
    },
    window: {
      frame: true,
      positioned: true,
      resizable: false,
      minimizable: true
    }
  };

  static PARTS = {
    calendar: {
      template: `modules/${MODULE_ID}/templates/calendar-view.hbs`
    }
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  get title() {
    const config = CalendarData.getConfig();
    return config?.name || 'Easy Calendar';
  }

  /**
   * Build the calendar grid for a month
   * @param {number} year - The year
   * @param {number} month - The month (0-indexed)
   * @param {Object} config - Calendar configuration
   * @returns {Array} Grid of week rows
   */
  _buildMonthGrid(year, month, config) {
    const state = CalendarData.getState();
    const daysInMonth = CalendarTime.getDaysInMonth(year, month, config);
    const weekdayCount = config.weekdays.length;

    // Get weekday of first day of month
    const weekdayOffset = game.settings.get(MODULE_ID, SETTINGS.WEEKDAY_OFFSET) || 0;
    const firstDayWeekday = CalendarTime.calculateWeekday(year, month, 1, config, weekdayOffset);

    // Adjust for first weekday setting
    let startOffset = (firstDayWeekday - config.firstWeekday + weekdayCount) % weekdayCount;

    const grid = [];
    let currentWeek = [];

    // Add empty cells for days before the first
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push({ empty: true });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = (year === state.year && month === state.month && day === state.day);

      currentWeek.push({
        day,
        isToday,
        empty: false
      });

      // Start new week if we've filled the current one
      if (currentWeek.length === weekdayCount) {
        grid.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining cells in last week
    while (currentWeek.length > 0 && currentWeek.length < weekdayCount) {
      currentWeek.push({ empty: true });
    }
    if (currentWeek.length > 0) {
      grid.push(currentWeek);
    }

    return grid;
  }

  /**
   * Get ordered weekdays starting from firstWeekday
   * @param {Object} config - Calendar configuration
   * @returns {Array} Ordered weekdays
   */
  _getOrderedWeekdays(config) {
    const weekdays = [];
    const count = config.weekdays.length;
    for (let i = 0; i < count; i++) {
      const index = (config.firstWeekday + i) % count;
      weekdays.push(config.weekdays[index]);
    }
    return weekdays;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** Map display mode to the icon shown on the cycle button */
  static MODE_ICONS = {
    full: 'fa-compress',
    compact: 'fa-expand'
  };

  _onRender(context, options) {
    // Apply display mode CSS class
    this.element.classList.remove('mode-full', 'mode-compact');
    this.element.classList.add(`mode-${this._displayMode}`);

    // Inject mode-cycle button into the header if not already present
    const header = this.element.querySelector('.window-header');
    if (header && !header.querySelector('[data-action="cycle-mode"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('header-control');
      btn.dataset.action = 'cycle-mode';
      btn.setAttribute('data-tooltip', 'Toggle Compact View');
      const icon = document.createElement('i');
      icon.classList.add('fas', CalendarApp.MODE_ICONS[this._displayMode]);
      btn.appendChild(icon);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._onCycleMode();
      });
      // Insert before the close button
      const closeBtn = header.querySelector('[data-action="close"]');
      if (closeBtn) {
        header.insertBefore(btn, closeBtn);
      } else {
        header.appendChild(btn);
      }
    } else if (header) {
      // Update the icon on re-renders
      const icon = header.querySelector('[data-action="cycle-mode"] i');
      if (icon) {
        icon.classList.remove('fa-compress', 'fa-expand');
        icon.classList.add(CalendarApp.MODE_ICONS[this._displayMode]);
      }
    }

    this._activateListeners();

    // Start time update interval if synced
    this._startTimeUpdates();
  }

  _onClose(options) {
    this._stopTimeUpdates();
    game.user.setFlag(MODULE_ID, SETTINGS.PANEL_VISIBLE, false);
    super._onClose?.(options);
  }

  /**
   * Save position when window is moved
   */
  async setPosition(position = {}) {
    const result = await super.setPosition(position);

    // Save the position per-user
    if (this.position.top !== undefined && this.position.left !== undefined) {
      await game.user.setFlag(MODULE_ID, SETTINGS.PANEL_POSITION, {
        top: this.position.top,
        left: this.position.left
      });
    }

    return result;
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  _activateListeners() {
    const el = this.element;

    // Navigation buttons
    el.querySelector('[data-action="prev-month"]')?.addEventListener('click', () => this._onNavigateMonth(-1));
    el.querySelector('[data-action="next-month"]')?.addEventListener('click', () => this._onNavigateMonth(1));
    el.querySelector('[data-action="prev-year"]')?.addEventListener('click', () => this._onNavigateYear(-1));
    el.querySelector('[data-action="next-year"]')?.addEventListener('click', () => this._onNavigateYear(1));
    el.querySelector('[data-action="today"]')?.addEventListener('click', () => this._onGoToToday());

    // Time unit selector
    el.querySelector('[name="time-unit"]')?.addEventListener('change', (e) => {
      this._selectedUnit = e.target.value;
    });

    // Time advance buttons
    el.querySelectorAll('[data-action="advance-time"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseInt(e.currentTarget.dataset.amount);
        this._onAdvanceTime(amount, this._selectedUnit);
      });
    });

    // Custom time input
    el.querySelector('[data-action="advance-custom"]')?.addEventListener('click', () => this._onAdvanceCustom());

    // Quick set date (GM only)
    el.querySelector('[data-action="quick-set"]')?.addEventListener('click', () => this._onQuickSetDate());

    // Sync toggle (GM only)
    el.querySelector('[data-action="toggle-sync"]')?.addEventListener('click', () => this._onToggleSync());

  }

  async _onCycleMode() {
    this._displayMode = this._displayMode === 'full' ? 'compact' : 'full';
    await game.user.setFlag(MODULE_ID, SETTINGS.PANEL_MODE, this._displayMode);
    this.render();
  }

  _onNavigateMonth(delta) {
    const state = CalendarData.getState();
    const config = CalendarData.getConfig();

    // Use current view position, not the actual date
    let currentMonth = this._viewMonth ?? state.month;
    let currentYear = this._viewYear ?? state.year;

    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    while (newMonth < 0) {
      newMonth += config.months.length;
      newYear--;
    }
    while (newMonth >= config.months.length) {
      newMonth -= config.months.length;
      newYear++;
    }

    // Update the view
    this._viewYear = newYear;
    this._viewMonth = newMonth;
    this.render();
  }

  _onNavigateYear(delta) {
    const state = CalendarData.getState();
    const currentYear = this._viewYear ?? state.year;
    this._viewYear = currentYear + delta;
    this.render();
  }

  _onGoToToday() {
    const state = CalendarData.getState();
    this._viewYear = state.year;
    this._viewMonth = state.month;
    this.render();
  }

  async _onAdvanceTime(amount, unit) {
    if (!game.user.isGM && !game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_ADVANCE)) {
      ui.notifications.warn('You do not have permission to advance time.');
      return;
    }

    await CalendarData.advance(amount, unit);

    // Update view to follow current date
    const state = CalendarData.getState();
    this._viewYear = state.year;
    this._viewMonth = state.month;

    this.render();
  }

  async _onAdvanceCustom() {
    if (!game.user.isGM && !game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_ADVANCE)) {
      ui.notifications.warn('You do not have permission to advance time.');
      return;
    }

    const content = `
      <form>
        <div class="form-group">
          <label>Amount (use negative to go back)</label>
          <input type="number" name="amount" value="1" />
        </div>
      </form>
    `;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: `Advance ${this._selectedUnit}s` },
      content,
      buttons: [
        {
          action: 'advance',
          label: 'Advance',
          icon: 'fas fa-check',
          default: true,
          callback: (event, button, dialog) => {
            return parseInt(button.form.querySelector('[name="amount"]').value) || 0;
          }
        },
        {
          action: 'cancel',
          label: 'Cancel',
          icon: 'fas fa-times'
        }
      ],
      rejectClose: false
    });

    if (result && result !== 'cancel' && result !== 0) {
      await this._onAdvanceTime(result, this._selectedUnit);
    }
  }

  async _onQuickSetDate() {
    if (!game.user.isGM) return;

    const state = CalendarData.getState();
    const config = CalendarData.getConfig();

    // Build month options
    const monthOptions = config.months.map((m, i) =>
      `<option value="${i}" ${i === state.month ? 'selected' : ''}>${m.name}</option>`
    ).join('');

    const content = `
      <form>
        <div class="form-group">
          <label>Year</label>
          <input type="number" name="year" value="${state.year}" />
        </div>
        <div class="form-group">
          <label>Month</label>
          <select name="month">${monthOptions}</select>
        </div>
        <div class="form-group">
          <label>Day</label>
          <input type="number" name="day" value="${state.day}" min="1" />
        </div>
        <div class="form-group">
          <label>Hour</label>
          <input type="number" name="hour" value="${state.hour}" min="0" max="${config.time.hoursPerDay - 1}" />
        </div>
        <div class="form-group">
          <label>Minute</label>
          <input type="number" name="minute" value="${state.minute}" min="0" max="${config.time.minutesPerHour - 1}" />
        </div>
      </form>
    `;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Set Date & Time' },
      content,
      buttons: [
        {
          action: 'set',
          label: 'Set',
          icon: 'fas fa-check',
          default: true,
          callback: (event, button, dialog) => {
            const form = button.form;
            return {
              year: parseInt(form.querySelector('[name="year"]').value),
              month: parseInt(form.querySelector('[name="month"]').value),
              day: parseInt(form.querySelector('[name="day"]').value),
              hour: parseInt(form.querySelector('[name="hour"]').value),
              minute: parseInt(form.querySelector('[name="minute"]').value),
              second: 0
            };
          }
        },
        {
          action: 'cancel',
          label: 'Cancel',
          icon: 'fas fa-times'
        }
      ],
      rejectClose: false
    });

    if (result && result !== 'cancel') {
      await CalendarData.setState(result, { updateWorldTime: false });
      this._viewYear = result.year;
      this._viewMonth = result.month;
      this.render();
    }
  }

  async _onToggleSync() {
    if (!game.user.isGM) return;

    const state = CalendarData.getState();
    await CalendarData.setSyncEnabled(!state.syncEnabled);
    this.render();
  }

  /* -------------------------------------------- */
  /*  Time Updates                                */
  /* -------------------------------------------- */

  _startTimeUpdates() {
    this._stopTimeUpdates();

    // Update every second if synced
    this._timeUpdateInterval = setInterval(() => {
      const state = CalendarData.getState();
      if (state.syncEnabled) {
        // Just update the time display without full re-render
        const timeEl = this.element?.querySelector('.calendar-time');
        if (timeEl) {
          const newState = CalendarData.getState();
          timeEl.textContent = CalendarTime.formatTime(newState.hour, newState.minute, newState.second);
        }
      }
    }, 1000);
  }

  _stopTimeUpdates() {
    if (this._timeUpdateInterval) {
      clearInterval(this._timeUpdateInterval);
      this._timeUpdateInterval = null;
    }
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const config = CalendarData.getConfig();
    const state = CalendarData.getState();

    // Use view state if set, otherwise use actual date
    const viewYear = this._viewYear ?? state.year;
    const viewMonth = this._viewMonth ?? state.month;

    // Calculate weekday for current date
    const weekdayOffset = game.settings.get(MODULE_ID, SETTINGS.WEEKDAY_OFFSET) || 0;
    const currentWeekday = CalendarTime.calculateWeekday(state.year, state.month, state.day, config, weekdayOffset);

    // Build calendar grid for viewed month
    const grid = this._buildMonthGrid(viewYear, viewMonth, config);

    // Get ordered weekdays
    const orderedWeekdays = this._getOrderedWeekdays(config);

    // Format current time
    const timeString = CalendarTime.formatTime(state.hour, state.minute, state.second);

    // Get month and year display for view
    const viewMonthData = config.months[viewMonth];
    const { yearPrefix, yearSuffix } = config.yearConfig;
    const yearDisplay = `${yearPrefix}${viewYear}${yearSuffix}`;

    // Format current date string
    const currentMonth = config.months[state.month];
    const currentDateString = `${currentMonth?.name || ''} ${state.day}, ${yearPrefix}${state.year}${yearSuffix}`;

    const isGM = game.user.isGM;

    // Time units for selector
    const timeUnits = [
      { value: 'year', label: 'Year' },
      { value: 'month', label: 'Month' },
      { value: 'week', label: 'Week' },
      { value: 'day', label: 'Day' },
      { value: 'hour', label: 'Hour' },
      { value: 'minute', label: 'Minute' },
      { value: 'second', label: 'Second' }
    ];

    // Get current season
    const currentSeason = CalendarTime.getCurrentSeason(state, config);

    // Get moon phases
    const moonPhases = CalendarTime.getAllMoonPhases(state, config);

    return {
      config,
      state,
      viewYear,
      viewMonth,
      viewMonthData,
      yearDisplay,
      timeString,
      currentWeekday,
      weekdayName: config.weekdays[currentWeekday]?.name || '',
      currentDateString,
      orderedWeekdays,
      grid,
      isGM,
      syncEnabled: state.syncEnabled,
      playersCanAdvance: game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_ADVANCE),
      canAdvance: isGM || game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_ADVANCE),
      timeUnits,
      selectedUnit: this._selectedUnit,
      currentSeason,
      moonPhases
    };
  }
}
