/** Fixed app timezone. */
export const APP_TIMEZONE = "America/New_York";

/** YYYY-MM-DD for the current calendar day in the app timezone. */
export function todayInAppTz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(
    new Date(),
  );
}

/** Calendar arithmetic on YYYY-MM-DD (anchor day comes from todayInAppTz). */
export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Last N calendar days ending today (inclusive), oldest first. */
export function lastNDays(n: number, endDate?: string): string[] {
  const end = endDate ?? todayInAppTz();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDays(end, -i));
  }
  return days;
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00`));
}

/** True when date is within the last `window` days through today (inclusive). */
export function isWithinLastDays(
  dateStr: string,
  window: number,
  todayStr?: string,
): boolean {
  const today = todayStr ?? todayInAppTz();
  const earliest = addDays(today, -(window - 1));
  return dateStr >= earliest && dateStr <= today;
}

/** UTC ISO string for midnight of dateStr in the app timezone. */
export function startOfDayUTC(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Use 16:00 UTC as a reference point (noon EDT / 11am EST) to read the NY
  // offset without hitting DST ambiguity around midnight.
  const ref = new Date(Date.UTC(y, m - 1, d, 16, 0, 0));
  const nyHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(ref),
  );
  const utcOffset = 16 - nyHour; // 4 for EDT, 5 for EST
  return new Date(Date.UTC(y, m - 1, d, utcOffset, 0, 0)).toISOString();
}

export function formatDayLabel(dateStr: string, todayStr?: string): string {
  const today = todayStr ?? todayInAppTz();
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  const dt = new Date(`${dateStr}T12:00:00`);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
}

export function formatLongDate(dateStr: string): string {
  const dt = new Date(`${dateStr}T12:00:00`);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
}
