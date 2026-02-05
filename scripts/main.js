// Easy Calendar - Main Entry Point

import { MODULE_ID, SETTINGS } from './constants.js';
import { CalendarApp } from './calendar-app.js';
import { CalendarData } from './calendar-data.js';
import { getPreset } from './calendar-presets.js';

// Global reference to the calendar application
let calendarApp = null;

/* -------------------------------------------- */
/*  Module Settings                             */
/* -------------------------------------------- */

function registerSettings() {
  // World settings (GM sets, all see)
  game.settings.register(MODULE_ID, SETTINGS.CALENDAR_CONFIG, {
    name: 'Calendar Configuration',
    hint: 'The full calendar configuration.',
    scope: 'world',
    config: false,
    type: Object,
    default: getPreset('gregorian')
  });

  game.settings.register(MODULE_ID, SETTINGS.CALENDAR_STATE, {
    name: 'Calendar State',
    hint: 'The current date and time.',
    scope: 'world',
    config: false,
    type: Object,
    default: CalendarData.getDefaultState()
  });

  game.settings.register(MODULE_ID, SETTINGS.WEEKDAY_OFFSET, {
    name: 'Weekday Offset',
    hint: 'Shifts the displayed weekday by this many days. Use this to align with external calendars (e.g. Kanka). Does not affect the world date.',
    scope: 'world',
    config: true,
    type: Number,
    default: 0,
    onChange: () => {
      if (calendarApp?.rendered) {
        calendarApp.render();
      }
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.SYNC_WORLD_TIME, {
    name: 'Sync with World Time',
    hint: 'When enabled, calendar changes will update Foundry\'s world time and vice versa.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (value && game.user.isGM) {
        await CalendarData.setSyncEnabled(true);
      }
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.PLAYERS_CAN_ADVANCE, {
    name: 'Players Can Advance Time',
    hint: 'Allow players to advance the calendar time.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      if (calendarApp?.rendered) {
        calendarApp.render();
      }
    }
  });
}

/* -------------------------------------------- */
/*  Initialization Hooks                        */
/* -------------------------------------------- */

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Easy Calendar`);
  registerSettings();

  // Register Handlebars helpers
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('add', function(a, b) {
    return a + b;
  });

  Handlebars.registerHelper('range', function(start, end, options) {
    let result = '';
    for (let i = start; i < end; i++) {
      result += options.fn(i);
    }
    return result;
  });

  // Expose API for macros/other modules
  game.modules.get(MODULE_ID).api = {
    getApp: () => calendarApp,
    refresh: () => calendarApp?.render(),
    getConfig: () => CalendarData.getConfig(),
    getState: () => CalendarData.getState(),
    setDate: (date) => CalendarData.setDate(date),
    setTime: (time) => CalendarData.setTime(time),
    advance: (amount, unit) => CalendarData.advance(amount, unit),
    loadPreset: (presetId) => CalendarData.loadPreset(presetId),
    exportConfig: (includeState) => CalendarData.exportConfig(includeState),
    importConfig: (data, importState) => CalendarData.importConfig(data, importState),
    openConfig: async () => {
      const { CalendarConfigApp } = await import('./calendar-config-app.js');
      new CalendarConfigApp().render({ force: true });
    }
  };
});

Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | Easy Calendar ready`);

  // Set up world time sync hook
  Hooks.on('updateWorldTime', (worldTime, delta) => {
    CalendarData.syncFromWorldTime(worldTime);

    // Refresh calendar display
    if (calendarApp?.rendered) {
      calendarApp.render();
    }
  });

  // Listen for state changes to refresh UI
  Hooks.on('easyCalendarStateChanged', (state) => {
    if (calendarApp?.rendered) {
      calendarApp.render();
    }
  });

  // Listen for config changes to refresh UI
  Hooks.on('easyCalendarConfigChanged', (config) => {
    if (calendarApp?.rendered) {
      calendarApp.render();
    }
  });

  // Show calendar if it should be visible (default: true for new users)
  if (game.user.getFlag(MODULE_ID, SETTINGS.PANEL_VISIBLE) ?? true) {
    calendarApp = new CalendarApp();
    calendarApp.render({ force: true });
  }
});

/* -------------------------------------------- */
/*  Scene Control Buttons                       */
/* -------------------------------------------- */

Hooks.on('getSceneControlButtons', (controls) => {
  // Foundry v13: controls is an object keyed by group name, tools are also objects
  if (!controls.tokens) return;

  const toolCount = Object.keys(controls.tokens.tools).length;

  controls.tokens.tools.easyCalendarToggle = {
    name: 'easyCalendarToggle',
    title: 'Toggle Calendar',
    icon: 'fa-solid fa-calendar-days',
    order: toolCount,
    button: true,
    visible: true,
    onChange: () => {
      if (calendarApp?.rendered) {
        game.user.setFlag(MODULE_ID, SETTINGS.PANEL_VISIBLE, false);
        calendarApp.close();
      } else {
        game.user.setFlag(MODULE_ID, SETTINGS.PANEL_VISIBLE, true);
        calendarApp = new CalendarApp();
        calendarApp.render({ force: true });
      }
    }
  };

  if (game.user.isGM) {
    controls.tokens.tools.easyCalendarConfig = {
      name: 'easyCalendarConfig',
      title: 'Calendar Configuration',
      icon: 'fa-solid fa-calendar-cog',
      order: toolCount + 1,
      button: true,
      visible: true,
      onChange: () => {
        import('./calendar-config-app.js').then(({ CalendarConfigApp }) => {
          new CalendarConfigApp().render({ force: true });
        });
      }
    };
  }
});

/* -------------------------------------------- */
/*  Export Module ID                            */
/* -------------------------------------------- */

export { MODULE_ID };
