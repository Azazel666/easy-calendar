# Changelog

## v1.0.0 - 2026-02-05

Initial release of Easy Calendar for Foundry VTT v13+.

### Calendar System
- Fully customizable calendar with configurable months, weekdays, and time units
- Gregorian preset included for quick setup
- Leap year support with Gregorian and simple interval rules
- Per-month leap day configuration
- Custom year numbering with prefix/suffix and configurable starting year

### Seasons
- Define unlimited seasons with custom names, colors, and icons
- Configurable start dates and sunrise/sunset times
- Current season displayed in the calendar panel

### Moons
- Multiple moons with independent cycle lengths
- 8-phase lunar cycle with illumination percentage tracking
- Reference new moon date for accurate phase calculation
- Moon phases displayed in the calendar panel

### Calendar Panel
- Interactive calendar grid with month/year navigation
- Current date, time, weekday, season, and moon phase display
- Full and compact display modes (toggle via header button)
- Collapsible via Foundry's native double-click minimize
- Draggable panel with saved position across sessions
- Toggle visibility from the scene controls toolbar

### Time Controls
- Advance or rewind time by seconds, minutes, hours, days, weeks, months, or years
- Quick buttons for common increments (-10, -5, -1, +1, +5, +10)
- Custom amount dialog for arbitrary time changes
- Configurable player permission to advance time

### World Time Sync
- Bidirectional sync between calendar and Foundry's world time
- GM toggle to enable/disable sync

### Quick Set Date
- GM dialog to jump to any specific date and time

### Weekday Offset
- Configurable day offset to align weekday display with external calendars (e.g. Kanka)
- Display-only setting that does not affect world date or time

### Configuration Dialog (GM)
- Full calendar editor: months, weekdays, seasons, moons, leap years, time units
- Preset loader
- Import/export support with Simple Calendar format compatibility

### API
- Module API exposed at `game.modules.get('easy-calendar').api` for macros and integrations
- Hooks: `easyCalendarConfigChanged`, `easyCalendarStateChanged`
