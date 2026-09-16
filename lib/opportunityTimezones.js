/**
 * Opportunity timezones — same IANA list and wall-clock parsing as Studio.
 * Times are stored as timestamptz instants plus `event_timezone`, then shown
 * in that zone so 00:00 stays 00:00 on every device.
 */

export const EVENT_TIMEZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function resolveTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // ignore
  }
  return "UTC";
}

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone.trim()) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timeZone.trim() }).format(
      new Date()
    );
    return true;
  } catch {
    return false;
  }
}

export function timezoneSelectOptions(current) {
  const list = [...EVENT_TIMEZONES];
  const extras = [typeof current === "string" ? current.trim() : "", resolveTimeZone()].filter(
    Boolean
  );
  for (const tz of extras) {
    if (!list.includes(tz) && isValidTimeZone(tz)) {
      list.unshift(tz);
    }
  }
  return list;
}

export function formatTimezoneLabel(timeZone, at = new Date()) {
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
  try {
    const offset =
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        timeZoneName: "shortOffset",
        hour: "2-digit",
      })
        .formatToParts(at)
        .find((part) => part.type === "timeZoneName")?.value ?? "";
    return offset ? `${city} (${offset})` : city;
  } catch {
    return city;
  }
}

export function shortZoneName(timeZone, at = new Date()) {
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        timeZoneName: "short",
        hour: "2-digit",
      })
        .formatToParts(at)
        .find((part) => part.type === "timeZoneName")?.value ?? timeZone
    );
  } catch {
    return timeZone;
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeClock(time) {
  const trimmed = String(time || "").trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function addDaysYmd(ymd, days) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

function zonedParts(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const get = (type) => parts.find((part) => part.type === type)?.value ?? "0";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function offsetMsAt(instant, timeZone) {
  const wall = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );
  return asUtc - instant.getTime();
}

export function parseLocalDateTime(date, time) {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute, second] = normalizeClock(time).split(":").map(Number);
  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
    hour || 0,
    minute || 0,
    second || 0
  );
}

export function parseZonedDateTime(date, time, timeZone) {
  const asUtc = new Date(`${date}T${normalizeClock(time)}Z`);
  if (Number.isNaN(asUtc.getTime())) return asUtc;
  let instant = new Date(asUtc.getTime() - offsetMsAt(asUtc, timeZone));
  instant = new Date(asUtc.getTime() - offsetMsAt(instant, timeZone));
  return instant;
}

export function parseEventDateTime(date, time, timeZone) {
  const tz = typeof timeZone === "string" ? timeZone.trim() : "";
  if (tz && isValidTimeZone(tz)) {
    const parsed = parseZonedDateTime(date, time, tz);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseLocalDateTime(date, time);
}

export function nextCalendarDay(ymd) {
  return addDaysYmd(ymd, 1);
}
