// Easy Calendar - Time Conversion Utilities

/**
 * Check if a year is a leap year based on the calendar configuration
 * @param {number} year - The year to check
 * @param {Object} config - The calendar configuration
 * @returns {boolean} True if it's a leap year
 */
export function isLeapYear(year, config) {
  if (!config.leapYear?.enabled) return false;

  if (config.leapYear.rule === 'gregorian') {
    // Gregorian rules: divisible by 4, except centuries unless divisible by 400
    if (year % 400 === 0) return true;
    if (year % 100 === 0) return false;
    if (year % 4 === 0) return true;
    return false;
  }

  if (config.leapYear.rule === 'simple') {
    // Simple interval-based leap year
    const interval = config.leapYear.interval || 4;
    return year % interval === 0;
  }

  return false;
}

/**
 * Get the number of days in a specific month
 * @param {number} year - The year
 * @param {number} monthIndex - The month index (0-based)
 * @param {Object} config - The calendar configuration
 * @returns {number} Number of days in the month
 */
export function getDaysInMonth(year, monthIndex, config) {
  const month = config.months[monthIndex];
  if (!month) return 0;

  let days = month.days;

  // Check for leap year extra days
  if (isLeapYear(year, config) && config.leapYear?.months) {
    const leapMonthConfig = config.leapYear.months.find(m => m.monthId === month.id);
    if (leapMonthConfig) {
      days += leapMonthConfig.extraDays;
    }
  }

  return days;
}

/**
 * Get the total number of days in a year
 * @param {number} year - The year
 * @param {Object} config - The calendar configuration
 * @returns {number} Total days in the year
 */
export function getDaysInYear(year, config) {
  let total = 0;
  for (let i = 0; i < config.months.length; i++) {
    total += getDaysInMonth(year, i, config);
  }
  return total;
}

/**
 * Get total seconds in a day based on time configuration
 * @param {Object} config - The calendar configuration
 * @returns {number} Seconds per day
 */
export function getSecondsPerDay(config) {
  const { hoursPerDay, minutesPerHour, secondsPerMinute } = config.time;
  return hoursPerDay * minutesPerHour * secondsPerMinute;
}

/**
 * Convert a calendar state to world time (seconds since epoch)
 * @param {Object} state - The calendar state { year, month, day, hour, minute, second }
 * @param {Object} config - The calendar configuration
 * @returns {number} World time in seconds
 */
export function toWorldTime(state, config) {
  const { year, month, day, hour, minute, second } = state;
  const startingYear = config.yearConfig.startingYear;
  const secondsPerDay = getSecondsPerDay(config);
  const { minutesPerHour, secondsPerMinute } = config.time;

  let totalDays = 0;

  // Count days for complete years
  if (year >= startingYear) {
    for (let y = startingYear; y < year; y++) {
      totalDays += getDaysInYear(y, config);
    }
  } else {
    for (let y = year; y < startingYear; y++) {
      totalDays -= getDaysInYear(y, config);
    }
  }

  // Count days for complete months in current year
  for (let m = 0; m < month; m++) {
    totalDays += getDaysInMonth(year, m, config);
  }

  // Add days (day is 1-indexed, so subtract 1)
  totalDays += (day - 1);

  // Convert to seconds and add time
  let totalSeconds = totalDays * secondsPerDay;
  totalSeconds += hour * minutesPerHour * secondsPerMinute;
  totalSeconds += minute * secondsPerMinute;
  totalSeconds += second;

  return totalSeconds;
}

/**
 * Convert world time (seconds) to a calendar state
 * @param {number} worldTime - World time in seconds
 * @param {Object} config - The calendar configuration
 * @returns {Object} Calendar state { year, month, day, hour, minute, second }
 */
export function fromWorldTime(worldTime, config) {
  const startingYear = config.yearConfig.startingYear;
  const secondsPerDay = getSecondsPerDay(config);
  const { hoursPerDay, minutesPerHour, secondsPerMinute } = config.time;

  // Handle negative world time (before epoch)
  const isNegative = worldTime < 0;
  let remainingSeconds = Math.abs(worldTime);

  // Extract time of day
  let daySeconds = remainingSeconds % secondsPerDay;
  let totalDays = Math.floor(remainingSeconds / secondsPerDay);

  if (isNegative && daySeconds > 0) {
    // Adjust for negative time
    totalDays += 1;
    daySeconds = secondsPerDay - daySeconds;
  }

  // Convert day seconds to hours, minutes, seconds
  const hour = Math.floor(daySeconds / (minutesPerHour * secondsPerMinute));
  daySeconds %= (minutesPerHour * secondsPerMinute);
  const minute = Math.floor(daySeconds / secondsPerMinute);
  const second = daySeconds % secondsPerMinute;

  let year = startingYear;
  let month = 0;
  let day = 1;

  if (isNegative) {
    // Go backwards from starting year
    while (totalDays > 0) {
      year--;
      const daysInYear = getDaysInYear(year, config);
      if (totalDays >= daysInYear) {
        totalDays -= daysInYear;
      } else {
        break;
      }
    }

    // Find month and day going backwards
    month = config.months.length - 1;
    while (totalDays > 0 && month >= 0) {
      const daysInMonth = getDaysInMonth(year, month, config);
      if (totalDays >= daysInMonth) {
        totalDays -= daysInMonth;
        month--;
      } else {
        break;
      }
    }

    if (month < 0) month = 0;
    day = getDaysInMonth(year, month, config) - totalDays;
  } else {
    // Go forward from starting year
    while (totalDays >= getDaysInYear(year, config)) {
      totalDays -= getDaysInYear(year, config);
      year++;
    }

    // Find month
    while (month < config.months.length && totalDays >= getDaysInMonth(year, month, config)) {
      totalDays -= getDaysInMonth(year, month, config);
      month++;
    }

    if (month >= config.months.length) {
      month = config.months.length - 1;
    }

    day = totalDays + 1; // Day is 1-indexed
  }

  return { year, month, day, hour, minute, second };
}

/**
 * Calculate the weekday for a given date
 * @param {number} year - The year
 * @param {number} month - The month (0-indexed)
 * @param {number} day - The day (1-indexed)
 * @param {Object} config - The calendar configuration
 * @param {number} [offset=0] - Additional day offset for display alignment
 * @returns {number} Weekday index (0-based, relative to firstWeekday)
 */
export function calculateWeekday(year, month, day, config, offset = 0) {
  // Calculate total days from a known reference point
  // We'll use the starting year, month 0, day 1 as weekday 0
  const startingYear = config.yearConfig.startingYear;

  let totalDays = 0;

  // Count days from starting year
  if (year >= startingYear) {
    for (let y = startingYear; y < year; y++) {
      totalDays += getDaysInYear(y, config);
    }
    for (let m = 0; m < month; m++) {
      totalDays += getDaysInMonth(year, m, config);
    }
    totalDays += (day - 1);
  } else {
    for (let y = year; y < startingYear; y++) {
      totalDays -= getDaysInYear(y, config);
    }
    for (let m = 0; m < month; m++) {
      totalDays -= getDaysInMonth(year, m, config);
    }
    totalDays -= (day - 1);
  }

  // Apply display offset and wrap to absolute weekday index
  // firstWeekday is NOT applied here — it only affects visual grid layout
  const weekdayCount = config.weekdays.length;
  let weekday = (((totalDays + offset) % weekdayCount) + weekdayCount) % weekdayCount;

  return weekday;
}

/**
 * Normalize a date state, handling overflow/underflow
 * @param {Object} state - The calendar state to normalize
 * @param {Object} config - The calendar configuration
 * @returns {Object} Normalized calendar state
 */
export function normalizeDate(state, config) {
  let { year, month, day, hour, minute, second } = state;
  const { hoursPerDay, minutesPerHour, secondsPerMinute } = config.time;

  // Normalize seconds
  while (second >= secondsPerMinute) {
    second -= secondsPerMinute;
    minute++;
  }
  while (second < 0) {
    second += secondsPerMinute;
    minute--;
  }

  // Normalize minutes
  while (minute >= minutesPerHour) {
    minute -= minutesPerHour;
    hour++;
  }
  while (minute < 0) {
    minute += minutesPerHour;
    hour--;
  }

  // Normalize hours
  while (hour >= hoursPerDay) {
    hour -= hoursPerDay;
    day++;
  }
  while (hour < 0) {
    hour += hoursPerDay;
    day--;
  }

  // Normalize days/months/years
  while (month >= config.months.length) {
    month -= config.months.length;
    year++;
  }
  while (month < 0) {
    month += config.months.length;
    year--;
  }

  // Handle day overflow
  let daysInMonth = getDaysInMonth(year, month, config);
  while (day > daysInMonth) {
    day -= daysInMonth;
    month++;
    if (month >= config.months.length) {
      month = 0;
      year++;
    }
    daysInMonth = getDaysInMonth(year, month, config);
  }

  // Handle day underflow
  while (day < 1) {
    month--;
    if (month < 0) {
      month = config.months.length - 1;
      year--;
    }
    daysInMonth = getDaysInMonth(year, month, config);
    day += daysInMonth;
  }

  return { year, month, day, hour, minute, second };
}

/**
 * Format time as a string
 * @param {number} hour - Hour
 * @param {number} minute - Minute
 * @param {number} second - Second
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export function formatTime(hour, minute, second) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  const s = String(second).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Format a full date string
 * @param {Object} state - Calendar state
 * @param {Object} config - Calendar configuration
 * @returns {string} Formatted date string
 */
export function formatDate(state, config) {
  const month = config.months[state.month];
  const { yearPrefix, yearSuffix } = config.yearConfig;
  return `${month?.name || 'Unknown'} ${state.day}, ${yearPrefix}${state.year}${yearSuffix}`;
}

/**
 * Get the current season for a given date
 * @param {Object} state - Calendar state { year, month, day }
 * @param {Object} config - Calendar configuration with seasons array
 * @returns {Object|null} Current season object or null if no seasons configured
 */
export function getCurrentSeason(state, config) {
  if (!config.seasons || config.seasons.length === 0) return null;

  const { month, day } = state;

  // Sort seasons by start date
  const sortedSeasons = [...config.seasons].sort((a, b) => {
    if (a.startingMonth !== b.startingMonth) {
      return a.startingMonth - b.startingMonth;
    }
    return a.startingDay - b.startingDay;
  });

  // Find the current season (the last season that has started)
  let currentSeason = sortedSeasons[sortedSeasons.length - 1]; // Default to last (wraps from previous year)

  for (let i = 0; i < sortedSeasons.length; i++) {
    const season = sortedSeasons[i];
    if (month > season.startingMonth ||
        (month === season.startingMonth && day >= season.startingDay)) {
      currentSeason = season;
    }
  }

  return currentSeason;
}

/**
 * Calculate the total days from a reference point to a given date
 * @param {Object} state - Calendar state { year, month, day }
 * @param {Object} refDate - Reference date { year, month, day }
 * @param {Object} config - Calendar configuration
 * @returns {number} Total days (can be negative)
 */
export function daysBetween(state, refDate, config) {
  let totalDays = 0;

  // Count years
  if (state.year >= refDate.year) {
    for (let y = refDate.year; y < state.year; y++) {
      totalDays += getDaysInYear(y, config);
    }
  } else {
    for (let y = state.year; y < refDate.year; y++) {
      totalDays -= getDaysInYear(y, config);
    }
  }

  // Add months and days for state
  for (let m = 0; m < state.month; m++) {
    totalDays += getDaysInMonth(state.year, m, config);
  }
  totalDays += state.day;

  // Subtract months and days for reference
  for (let m = 0; m < refDate.month; m++) {
    totalDays -= getDaysInMonth(refDate.year, m, config);
  }
  totalDays -= refDate.day;

  return totalDays;
}

/**
 * Get the current moon phase for a given date
 * @param {Object} state - Calendar state { year, month, day }
 * @param {Object} moon - Moon configuration object
 * @param {Object} config - Calendar configuration
 * @returns {Object} Moon phase info { phase, phaseName, icon, dayInCycle, percentIlluminated }
 */
export function getMoonPhase(state, moon, config) {
  if (!moon || !moon.phases || moon.phases.length === 0) {
    return null;
  }

  // Calculate days since reference new moon
  const refDate = moon.referenceNewMoon || { year: 2000, month: 0, day: 6 };
  const daysSinceRef = daysBetween(state, refDate, config);

  // Get position in cycle (0 to cycleLength)
  const cycleLength = moon.cycleLength || 29.53059;
  let dayInCycle = daysSinceRef % cycleLength;
  if (dayInCycle < 0) dayInCycle += cycleLength;

  // Find current phase
  let accumulatedDays = 0;
  let currentPhase = moon.phases[0];
  let phaseIndex = 0;

  for (let i = 0; i < moon.phases.length; i++) {
    const phase = moon.phases[i];
    if (dayInCycle >= accumulatedDays && dayInCycle < accumulatedDays + phase.length) {
      currentPhase = phase;
      phaseIndex = i;
      break;
    }
    accumulatedDays += phase.length;
  }

  // Calculate percent illuminated (0 at new moon, 100 at full moon)
  // Full moon is typically at half the cycle
  const halfCycle = cycleLength / 2;
  let percentIlluminated;
  if (dayInCycle <= halfCycle) {
    percentIlluminated = (dayInCycle / halfCycle) * 100;
  } else {
    percentIlluminated = ((cycleLength - dayInCycle) / halfCycle) * 100;
  }

  return {
    phase: currentPhase,
    phaseName: currentPhase.name,
    icon: currentPhase.icon,
    phaseIndex,
    dayInCycle: Math.floor(dayInCycle),
    percentIlluminated: Math.round(percentIlluminated)
  };
}

/**
 * Get all moon phases for the current date
 * @param {Object} state - Calendar state
 * @param {Object} config - Calendar configuration with moons array
 * @returns {Array} Array of moon phase info objects
 */
export function getAllMoonPhases(state, config) {
  if (!config.moons || config.moons.length === 0) return [];

  return config.moons.map(moon => {
    const phaseInfo = getMoonPhase(state, moon, config);
    if (!phaseInfo) {
      return {
        moonName: moon.name,
        moonColor: moon.color,
        phaseName: 'Unknown',
        icon: 'full',
        percentIlluminated: 50
      };
    }
    return {
      ...phaseInfo,
      moonName: moon.name,
      moonColor: moon.color
    };
  });
}

/**
 * Format seconds since midnight to time string
 * @param {number} seconds - Seconds since midnight
 * @param {Object} config - Calendar configuration
 * @returns {string} Formatted time string
 */
export function formatSecondsToTime(seconds, config) {
  const { minutesPerHour, secondsPerMinute } = config.time;
  const secondsPerHour = minutesPerHour * secondsPerMinute;

  const hours = Math.floor(seconds / secondsPerHour);
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
