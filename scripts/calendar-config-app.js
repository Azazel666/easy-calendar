// Easy Calendar - Configuration Application (GM Only)

import { MODULE_ID } from './constants.js';
import { CalendarData } from './calendar-data.js';
import { getPresetChoices, getPreset } from './calendar-presets.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CalendarConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(options = {}) {
    super(options);
    this._editingConfig = null;
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: 'easy-calendar-config',
    classes: ['easy-calendar-config'],
    position: {
      width: 600,
      height: 700
    },
    window: {
      frame: true,
      positioned: true,
      resizable: true,
      minimizable: false,
      contentClasses: ['easy-calendar-config-content']
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/calendar-config.hbs`
    }
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  get title() {
    return 'Calendar Configuration';
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    // Use editing config or load from settings
    const config = this._editingConfig ?? CalendarData.getConfig();
    const presets = getPresetChoices();

    return {
      config,
      presets,
      leapYearRules: {
        gregorian: 'Gregorian (every 4, except 100, except 400)',
        simple: 'Simple Interval'
      }
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  _onRender(context, options) {
    this._activateListeners();
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  _activateListeners() {
    const el = this.element;

    // Preset loading
    el.querySelector('[data-action="load-preset"]')?.addEventListener('click', () => this._onLoadPreset());

    // Month management
    el.querySelector('[data-action="add-month"]')?.addEventListener('click', () => this._onAddMonth());
    el.querySelectorAll('[data-action="remove-month"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onRemoveMonth(e));
    });
    el.querySelectorAll('[data-action="move-month-up"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onMoveMonth(e, -1));
    });
    el.querySelectorAll('[data-action="move-month-down"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onMoveMonth(e, 1));
    });

    // Weekday management
    el.querySelector('[data-action="add-weekday"]')?.addEventListener('click', () => this._onAddWeekday());
    el.querySelectorAll('[data-action="remove-weekday"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onRemoveWeekday(e));
    });
    el.querySelectorAll('[data-action="move-weekday-up"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onMoveWeekday(e, -1));
    });
    el.querySelectorAll('[data-action="move-weekday-down"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onMoveWeekday(e, 1));
    });

    // Season management
    el.querySelector('[data-action="add-season"]')?.addEventListener('click', () => this._onAddSeason());
    el.querySelectorAll('[data-action="remove-season"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onRemoveSeason(e));
    });
    el.querySelectorAll('[data-action="move-season-up"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onMoveSeason(e, -1));
    });
    el.querySelectorAll('[data-action="move-season-down"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onMoveSeason(e, 1));
    });

    // Moon management
    el.querySelector('[data-action="add-moon"]')?.addEventListener('click', () => this._onAddMoon());
    el.querySelectorAll('[data-action="remove-moon"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._onRemoveMoon(e));
    });

    // Export/Import
    el.querySelector('[data-action="export"]')?.addEventListener('click', () => this._onExport());
    el.querySelector('[data-action="import"]')?.addEventListener('click', () => this._onImport());

    // Save/Cancel
    el.querySelector('[data-action="save"]')?.addEventListener('click', () => this._onSave());
    el.querySelector('[data-action="cancel"]')?.addEventListener('click', () => this.close());

    // Input changes trigger config update
    el.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', () => this._onInputChange());
    });
  }

  _getConfigFromForm() {
    const el = this.element;
    const config = foundry.utils.deepClone(this._editingConfig ?? CalendarData.getConfig());

    // Basic info
    config.name = el.querySelector('[name="name"]')?.value || 'Calendar';
    config.namePrefix = el.querySelector('[name="namePrefix"]')?.value || '';
    config.nameSuffix = el.querySelector('[name="nameSuffix"]')?.value || '';

    // Year config - preserve startingYear from existing config
    config.yearConfig = config.yearConfig || {};
    config.yearConfig.startingYear = config.yearConfig.startingYear || 1;
    config.yearConfig.yearZeroExists = config.yearConfig.yearZeroExists || false;
    config.yearConfig.yearPrefix = el.querySelector('[name="yearConfig.yearPrefix"]')?.value || '';
    config.yearConfig.yearSuffix = el.querySelector('[name="yearConfig.yearSuffix"]')?.value || '';

    // Time config
    config.time = config.time || {};
    config.time.hoursPerDay = parseInt(el.querySelector('[name="time.hoursPerDay"]')?.value) || 24;
    config.time.minutesPerHour = parseInt(el.querySelector('[name="time.minutesPerHour"]')?.value) || 60;
    config.time.secondsPerMinute = parseInt(el.querySelector('[name="time.secondsPerMinute"]')?.value) || 60;

    // First weekday
    config.firstWeekday = parseInt(el.querySelector('[name="firstWeekday"]')?.value) || 0;

    // Leap year config
    config.leapYear = config.leapYear || {};
    config.leapYear.enabled = el.querySelector('[name="leapYear.enabled"]')?.checked || false;
    config.leapYear.rule = el.querySelector('[name="leapYear.rule"]')?.value || 'gregorian';
    config.leapYear.interval = parseInt(el.querySelector('[name="leapYear.interval"]')?.value) || 4;

    // Months
    const monthRows = el.querySelectorAll('.month-row');
    config.months = [];
    monthRows.forEach((row, index) => {
      config.months.push({
        id: row.dataset.monthId || `month-${index}`,
        name: row.querySelector('[name="month-name"]')?.value || `Month ${index + 1}`,
        abbreviation: row.querySelector('[name="month-abbr"]')?.value || `M${index + 1}`,
        days: parseInt(row.querySelector('[name="month-days"]')?.value) || 30
      });
    });

    // Weekdays
    const weekdayRows = el.querySelectorAll('.weekday-row');
    config.weekdays = [];
    weekdayRows.forEach((row, index) => {
      config.weekdays.push({
        id: row.dataset.weekdayId || `weekday-${index}`,
        name: row.querySelector('[name="weekday-name"]')?.value || `Day ${index + 1}`,
        abbreviation: row.querySelector('[name="weekday-abbr"]')?.value || `D${index + 1}`
      });
    });

    // Leap year months (which months get extra days)
    config.leapYear.months = [];
    const leapMonthCheckboxes = el.querySelectorAll('.leap-month-checkbox:checked');
    leapMonthCheckboxes.forEach(cb => {
      const monthId = cb.dataset.monthId;
      const extraDays = parseInt(cb.closest('.leap-month-row')?.querySelector('[name="leap-extra-days"]')?.value) || 1;
      config.leapYear.months.push({ monthId, extraDays });
    });

    // Seasons
    const seasonRows = el.querySelectorAll('.season-row');
    config.seasons = [];
    seasonRows.forEach((row, index) => {
      const seasonId = row.dataset.seasonId;
      const detailsRow = el.querySelector(`.season-details[data-season-id="${seasonId}"]`);
      config.seasons.push({
        id: seasonId || `season-${index}`,
        name: row.querySelector('[name="season-name"]')?.value || `Season ${index + 1}`,
        color: row.querySelector('[name="season-color"]')?.value || '#46b946',
        icon: row.querySelector('[name="season-icon"]')?.value || 'spring',
        startingMonth: parseInt(detailsRow?.querySelector('[name="season-month"]')?.value) || 0,
        startingDay: parseInt(detailsRow?.querySelector('[name="season-day"]')?.value) || 1,
        sunriseTime: 21600,
        sunsetTime: 64800
      });
    });

    // Moons
    const moonRows = el.querySelectorAll('.moon-row');
    config.moons = [];
    moonRows.forEach((row, index) => {
      const existingMoon = (this._editingConfig?.moons || config.moons || [])[index];
      config.moons.push({
        id: row.dataset.moonId || `moon-${index}`,
        name: row.querySelector('[name="moon-name"]')?.value || `Moon ${index + 1}`,
        color: row.querySelector('[name="moon-color"]')?.value || '#ffffff',
        cycleLength: parseFloat(row.querySelector('[name="moon-cycle"]')?.value) || 29.53059,
        phases: existingMoon?.phases || [
          { name: 'New Moon', length: 1, icon: 'new', singleDay: true },
          { name: 'Waxing Crescent', length: 6.38265, icon: 'waxing-crescent', singleDay: false },
          { name: 'First Quarter', length: 1, icon: 'first-quarter', singleDay: true },
          { name: 'Waxing Gibbous', length: 6.38265, icon: 'waxing-gibbous', singleDay: false },
          { name: 'Full Moon', length: 1, icon: 'full', singleDay: true },
          { name: 'Waning Gibbous', length: 6.38265, icon: 'waning-gibbous', singleDay: false },
          { name: 'Last Quarter', length: 1, icon: 'last-quarter', singleDay: true },
          { name: 'Waning Crescent', length: 6.38265, icon: 'waning-crescent', singleDay: false }
        ],
        referenceNewMoon: existingMoon?.referenceNewMoon || { year: 2000, month: 0, day: 6 }
      });
    });

    return config;
  }

  _onInputChange() {
    this._editingConfig = this._getConfigFromForm();
  }

  async _onLoadPreset() {
    const el = this.element;
    const presetId = el.querySelector('[name="preset"]')?.value;
    if (!presetId) return;

    const preset = getPreset(presetId);
    if (!preset) {
      ui.notifications.error(`Unknown preset: ${presetId}`);
      return;
    }

    this._editingConfig = preset;
    this.render();
  }

  async _onAddMonth() {
    const config = this._getConfigFromForm();
    const newId = `month-${foundry.utils.randomID(8)}`;
    config.months.push({
      id: newId,
      name: 'New Month',
      abbreviation: 'New',
      days: 30
    });
    this._editingConfig = config;
    this.render();
  }

  async _onRemoveMonth(event) {
    const row = event.currentTarget.closest('.month-row');
    const monthId = row.dataset.monthId;

    const config = this._getConfigFromForm();
    config.months = config.months.filter(m => m.id !== monthId);

    // Also remove from leap year months
    if (config.leapYear?.months) {
      config.leapYear.months = config.leapYear.months.filter(m => m.monthId !== monthId);
    }

    this._editingConfig = config;
    this.render();
  }

  async _onMoveMonth(event, direction) {
    const row = event.currentTarget.closest('.month-row');
    const monthId = row.dataset.monthId;

    const config = this._getConfigFromForm();
    const index = config.months.findIndex(m => m.id === monthId);
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= config.months.length) return;

    // Swap
    [config.months[index], config.months[newIndex]] = [config.months[newIndex], config.months[index]];

    this._editingConfig = config;
    this.render();
  }

  async _onAddWeekday() {
    const config = this._getConfigFromForm();
    const newId = `weekday-${foundry.utils.randomID(8)}`;
    config.weekdays.push({
      id: newId,
      name: 'New Day',
      abbreviation: 'New'
    });
    this._editingConfig = config;
    this.render();
  }

  async _onRemoveWeekday(event) {
    const row = event.currentTarget.closest('.weekday-row');
    const weekdayId = row.dataset.weekdayId;

    const config = this._getConfigFromForm();
    config.weekdays = config.weekdays.filter(w => w.id !== weekdayId);

    // Adjust firstWeekday if needed
    if (config.firstWeekday >= config.weekdays.length) {
      config.firstWeekday = 0;
    }

    this._editingConfig = config;
    this.render();
  }

  async _onMoveWeekday(event, direction) {
    const row = event.currentTarget.closest('.weekday-row');
    const weekdayId = row.dataset.weekdayId;

    const config = this._getConfigFromForm();
    const index = config.weekdays.findIndex(w => w.id === weekdayId);
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= config.weekdays.length) return;

    // Swap
    [config.weekdays[index], config.weekdays[newIndex]] = [config.weekdays[newIndex], config.weekdays[index]];

    this._editingConfig = config;
    this.render();
  }

  // Season management
  async _onAddSeason() {
    const config = this._getConfigFromForm();
    const newId = `season-${foundry.utils.randomID(8)}`;
    config.seasons = config.seasons || [];
    config.seasons.push({
      id: newId,
      name: 'New Season',
      startingMonth: 0,
      startingDay: 1,
      color: '#46b946',
      icon: 'spring',
      sunriseTime: 21600,
      sunsetTime: 64800
    });
    this._editingConfig = config;
    this.render();
  }

  async _onRemoveSeason(event) {
    const row = event.currentTarget.closest('.season-row');
    const seasonId = row.dataset.seasonId;

    const config = this._getConfigFromForm();
    config.seasons = (config.seasons || []).filter(s => s.id !== seasonId);

    this._editingConfig = config;
    this.render();
  }

  async _onMoveSeason(event, direction) {
    const row = event.currentTarget.closest('.season-row');
    const seasonId = row.dataset.seasonId;

    const config = this._getConfigFromForm();
    const index = (config.seasons || []).findIndex(s => s.id === seasonId);
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= config.seasons.length) return;

    [config.seasons[index], config.seasons[newIndex]] = [config.seasons[newIndex], config.seasons[index]];

    this._editingConfig = config;
    this.render();
  }

  // Moon management
  async _onAddMoon() {
    const config = this._getConfigFromForm();
    const newId = `moon-${foundry.utils.randomID(8)}`;
    config.moons = config.moons || [];
    config.moons.push({
      id: newId,
      name: 'New Moon',
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
    });
    this._editingConfig = config;
    this.render();
  }

  async _onRemoveMoon(event) {
    const row = event.currentTarget.closest('.moon-row');
    const moonId = row.dataset.moonId;

    const config = this._getConfigFromForm();
    config.moons = (config.moons || []).filter(m => m.id !== moonId);

    this._editingConfig = config;
    this.render();
  }

  async _onExport() {
    const config = this._getConfigFromForm();

    // Ask if user wants to include current date
    const includeState = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Export Calendar' },
      content: '<p>Include the current date and time in the export?</p>',
      rejectClose: false
    });

    const exportData = {
      version: 1,
      config: config
    };

    if (includeState) {
      const state = CalendarData.getState();
      exportData.state = {
        year: state.year,
        month: state.month,
        day: state.day,
        hour: state.hour,
        minute: state.minute,
        second: state.second
      };
    }

    // Create and download file
    const filename = `${config.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-calendar.json`;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    ui.notifications.info(`Exported calendar: ${filename}`);
  }

  async _onImport() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Detect format: Simple Calendar has calendars array
        const isSimpleCalendar = data.calendars && Array.isArray(data.calendars);

        if (isSimpleCalendar) {
          // Import from Simple Calendar format
          const sc = data.calendars[0];

          // Ask if user wants to import the current date
          let importState = false;
          if (sc.currentDate) {
            importState = await foundry.applications.api.DialogV2.confirm({
              window: { title: 'Import Simple Calendar' },
              content: '<p>This file includes a saved date. Import the date as well?</p>',
              rejectClose: false
            });
          }

          // Use autoImport to convert and apply
          const config = await CalendarData.importFromSimpleCalendar(data, importState);
          this._editingConfig = config;

          this.render();
          ui.notifications.info('Simple Calendar imported successfully!');

        } else {
          // Standard Easy Calendar format
          if (!data.config) {
            throw new Error('Invalid calendar file: missing config');
          }

          // Ask if user wants to import state
          let importState = false;
          if (data.state) {
            importState = await foundry.applications.api.DialogV2.confirm({
              window: { title: 'Import Calendar' },
              content: '<p>This file includes a saved date. Import the date as well?</p>',
              rejectClose: false
            });
          }

          this._editingConfig = data.config;

          if (importState && data.state) {
            // We'll apply the state when saving
            this._importState = data.state;
          }

          this.render();
          ui.notifications.info('Calendar imported. Click Save to apply changes.');
        }
      } catch (err) {
        ui.notifications.error(`Failed to import calendar: ${err.message}`);
      }
    });

    input.click();
  }

  async _onSave() {
    const config = this._getConfigFromForm();

    // Validate
    if (config.months.length === 0) {
      ui.notifications.error('Calendar must have at least one month.');
      return;
    }
    if (config.weekdays.length === 0) {
      ui.notifications.error('Calendar must have at least one weekday.');
      return;
    }

    // Generate ID if needed
    if (!config.id) {
      config.id = foundry.utils.randomID();
    }

    // Save config
    await CalendarData.setConfig(config);

    // If we have imported state, apply it
    if (this._importState) {
      await CalendarData.setState({
        ...CalendarData.getState(),
        ...this._importState
      }, { updateWorldTime: false });
      this._importState = null;
    }

    ui.notifications.info('Calendar configuration saved.');
    this.close();
  }
}
