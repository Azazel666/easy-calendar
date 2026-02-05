# Easy Calendar

A system-agnostic calendar module for Foundry VTT v13+. Build any calendar — real-world or fantasy — with custom months, weekdays, seasons, moons, and time systems. Features a compact draggable panel, world time sync, and import/export with Simple Calendar compatibility.

---

## Installation

1. In Foundry VTT, go to **Add-on Modules > Install Module**.
2. Paste the manifest URL and click **Install**.
3. Enable **Easy Calendar** in your world's module settings.

## Quick Start

Once enabled, a calendar icon appears in the **Token Controls** toolbar on the left side of the screen. Click it to open the calendar panel. GMs will also see a gear icon to open the configuration dialog.

By default the calendar loads with a **Gregorian** preset. To customize, click the gear icon or go to **Module Settings > Easy Calendar > Calendar Configuration**.

---

## The Calendar Panel

The calendar panel is a draggable window that displays the current date, time, weekday, season, and moon phases. It remembers its position between sessions.

### Display Modes

- **Full** — Shows everything: date/time info, month grid, navigation, and time controls.
- **Compact** — Shows only the current date, time, season, and moons. Hides the grid and controls.
- **Minimized** — Double-click the titlebar to collapse the window to just its titlebar (standard Foundry behavior). Double-click again to restore.

Use the button in the window header to toggle between full and compact. The chosen mode is saved per-user.

### Navigation

- Use the arrow buttons above the calendar grid to move between months and years.
- Click the home button to jump back to the current date.

### Time Controls

Below the calendar grid there is a unit selector (second, minute, hour, day, week, month, year) and quick buttons to advance or rewind time by -10, -5, -1, +1, +5, or +10 of the selected unit. The `...` button opens a dialog for entering a custom amount.

By default only the GM can advance time. To allow players, enable **Players Can Advance Time** in the module settings.

---

## Configuration (GM Only)

Open the configuration dialog from the calendar panel gear button or the toolbar gear icon.

### Calendar Name

The name displayed in the panel titlebar.

### Months

Add, remove, and reorder months. Each month has a name and a number of days.

### Weekdays

Add, remove, and reorder weekdays. Each weekday has a name and an abbreviation displayed in the calendar grid header. Use the **First Day of Week** dropdown to control which weekday appears in the leftmost column — this is purely visual and does not affect date calculations.

### Time

Configure the length of a day by setting hours per day, minutes per hour, and seconds per minute. This allows non-standard time systems for fantasy worlds.

### Year Settings

- **Starting Year** — The first year in the calendar epoch.
- **Year Zero Exists** — Whether year 0 is valid.
- **Year Prefix / Suffix** — Text displayed before/after the year number (e.g. "AD", "AR").

### Leap Years

Enable leap years and choose a rule:

- **Gregorian** — Divisible by 4, except centuries, unless divisible by 400.
- **Simple** — Every N years (configurable interval).

When enabled, select which months gain extra days during a leap year and how many.

### Seasons

Add seasons with a name, icon, color, and start date (month and day). The current season is shown in the calendar panel. Sunrise and sunset times can also be set per season.

### Moons

Add moons with a name, color, and cycle length in days. Each moon uses an 8-phase cycle (New Moon through Waning Crescent). Set a reference new moon date so the phase calculation aligns with your world's timeline. Current moon phases and illumination percentage are shown in the calendar panel.

### Import / Export

- **Export** — Save your calendar configuration as a JSON file. Optionally include the current date/time state.
- **Import** — Load a configuration from a JSON file. Supports both Easy Calendar native format and Simple Calendar exports.

---

## Settings

Found under **Configure Settings > Module Settings > Easy Calendar**.

| Setting | Scope | Description |
|---|---|---|
| **Weekday Offset** | World | Shifts the displayed weekday by N days. Use this to align with an external calendar tool (e.g. Kanka). Does not affect the actual date. |
| **Sync with World Time** | World | When enabled, calendar changes update Foundry's world time and vice versa. |
| **Players Can Advance Time** | World | Allow players to use the time advancement controls. |

### Quick Set Date (GM)

Click the pencil icon in the calendar panel to open a dialog where you can jump directly to any year, month, day, hour, and minute.

### World Time Sync (GM)

Click the sync icon in the calendar panel to toggle synchronization with Foundry's built-in world time. When enabled, advancing time in the calendar updates the world clock and vice versa.

---

## API

Easy Calendar exposes a module API for use in macros and by other modules:

```js
const api = game.modules.get('easy-calendar').api;

// Read state
api.getConfig();          // Full calendar configuration
api.getState();           // Current date/time state

// Modify state (GM only)
api.setDate({ year: 1490, month: 0, day: 1 });
api.setTime({ hour: 12, minute: 0, second: 0 });
api.advance(1, 'day');    // Advance by amount and unit

// Configuration
api.loadPreset('gregorian');
api.openConfig();         // Open the configuration dialog

// Import/Export
api.exportConfig(true);   // true = include current state
api.importConfig(data, true); // data object, true = import state

// UI
api.getApp();             // Reference to the CalendarApp instance
api.refresh();            // Force re-render the panel
```

### Hooks

| Hook | Payload | Description |
|---|---|---|
| `easyCalendarConfigChanged` | `config` | Fired when the calendar configuration is saved. |
| `easyCalendarStateChanged` | `state` | Fired when the date or time changes. |

---

## License

See [LICENSE](LICENSE) for details.