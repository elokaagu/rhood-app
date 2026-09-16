/**
 * Pure formatting utilities for opportunity data.
 * These are stateless functions with no React dependencies.
 */

const getOrdinalSuffix = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

/** IANA zone from Studio (`event_timezone`), or null if missing/invalid. */
export const resolveOpportunityTimeZone = (timeZone) => {
  if (typeof timeZone !== "string") return null;
  const tz = timeZone.trim();
  if (!tz) return null;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return null;
  }
};

const formatInstantDate = (date, timeZone) => {
  const tz = resolveOpportunityTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(tz ? { timeZone: tz } : {}),
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const day = Number(get("day"));
  if (!Number.isFinite(day) || day < 1) return "TBD";
  return `${day}${getOrdinalSuffix(day)} ${get("month")} ${get("year")}`;
};

const formatInstantTime = (date, timeZone) => {
  const tz = resolveOpportunityTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
};

const shortZoneName = (timeZone, at = new Date()) => {
  const tz = resolveOpportunityTimeZone(timeZone);
  if (!tz) return "";
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        timeZoneName: "short",
        hour: "2-digit",
      })
        .formatToParts(at)
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
};

const instantFromValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/i.test(value.trim())) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const appendZoneName = (clock, timeZone, instant) => {
  if (!clock || clock === "TBD") return clock;
  const zone = shortZoneName(timeZone, instant || new Date());
  if (!zone || clock.endsWith(` ${zone}`)) return clock;
  return `${clock} ${zone}`;
};

export const formatOpportunityDate = (dateValue, timeZone) => {
  if (!dateValue) return "TBD";
  try {
    // event_date is a DATE column — PostgREST returns it as a bare
    // "YYYY-MM-DD" with no time/zone. `new Date("2026-08-07")` parses that
    // as UTC midnight, then `.getDate()` below reads it back in the
    // device's LOCAL timezone — showing the previous day for anyone west of
    // UTC. Parse the Y-M-D components directly instead. Full timestamps
    // are shown in Studio's `event_timezone` (fallback: the device zone).
    const dateOnlyMatch =
      typeof dateValue === "string" && dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnlyMatch
      ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3])
        )
      : new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "TBD";
    }

    if (dateOnlyMatch) {
      const day = date.getDate();
      const month = date.toLocaleDateString("en-GB", { month: "long" });
      const year = date.getFullYear();
      return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
    }

    return formatInstantDate(date, timeZone);
  } catch (error) {
    if (__DEV__) console.warn("Unable to format opportunity date:", error);
    return "TBD";
  }
};

const formatDisplayTime = (hours, minutes) => {
  const normalizedHours = ((hours + 11) % 12) + 1;
  const period = hours >= 12 ? "PM" : "AM";
  const paddedMinutes = minutes.toString().padStart(2, "0");
  return `${normalizedHours}:${paddedMinutes} ${period}`;
};

export const formatOpportunityTime = (
  startValue,
  endValue = null,
  timeZone = null
) => {
  const sanitize = (value) => {
    if (!value && value !== 0) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || /^tbd$/i.test(trimmed)) return null;

      // Studio stores 17 Sep 00:00 in the listing timezone as an instant
      // (e.g. Europe/London → 16 Sep 23:00Z). Print that wall clock, not UTC.
      if (/^\d{4}-\d{2}-\d{2}T/i.test(trimmed)) {
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
          return formatInstantTime(parsed, timeZone);
        }
      }

      // Handle ranges encoded within a single string (e.g. "18:00-22:00")
      const rangeRegex =
        /^([0-2]?\d(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*(?:-|–|to)\s*([0-2]?\d(?::\d{2})?(?:\s*[AaPp][Mm])?)$/i;
      const rangeMatch = trimmed.match(rangeRegex);
      if (rangeMatch && !endValue) {
        return {
          start: sanitize(rangeMatch[1]),
          end: sanitize(rangeMatch[2]),
          range: true,
        };
      }

      // Handle explicit AM/PM values (e.g. "9 PM", "9:30 am")
      const meridiemMatch = trimmed.match(
        /^([0-1]?\d)(?::([0-5]\d))?\s*([AaPp][Mm])$/
      );
      if (meridiemMatch) {
        const hours = parseInt(meridiemMatch[1], 10);
        const minutes = meridiemMatch[2] ? parseInt(meridiemMatch[2], 10) : 0;
        const period = meridiemMatch[3].toUpperCase();
        const normalizedHours =
          period === "PM" && hours < 12
            ? hours + 12
            : period === "AM" && hours === 12
            ? 0
            : hours;
        return sanitize(
          `${normalizedHours}:${minutes.toString().padStart(2, "0")}`
        );
      }

      // Ensure we only deal with HH:mm[:ss]
      const colonParts = trimmed.split(":");
      if (colonParts.length >= 2) {
        const hours = parseInt(colonParts[0], 10);
        const minutes = parseInt(colonParts[1], 10);

        if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
          return formatDisplayTime(hours, minutes);
        }
      }

      // Fallback to trimmed string
      return trimmed;
    }

    if (value instanceof Date) {
      return formatInstantTime(value, timeZone);
    }

    if (typeof value === "number") {
      // Numeric values are interpreted as minutes past midnight.
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      return formatDisplayTime(hours, minutes);
    }

    return `${value}`;
  };

  const startResult = sanitize(startValue);

  // Handle ranges embedded in sanitize response
  if (startResult && typeof startResult === "object" && startResult.range) {
    const { start, end } = startResult;
    if (start && end) return `${start} – ${end}`;
    return start || end || "TBD";
  }

  const endResult = sanitize(endValue);

  if (!startResult && !endResult) return "TBD";
  let clock;
  if (startResult && endResult) {
    clock = startResult === endResult ? startResult : `${startResult} – ${endResult}`;
  } else {
    clock = startResult || endResult || "TBD";
  }
  return appendZoneName(clock, timeZone, instantFromValue(startValue));
};

export const formatCurrency = (value, currencyCode) => {
  if (value === null || value === undefined) return "TBD";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "TBD";

  const hasWholeValue = Number.isInteger(numericValue);

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: hasWholeValue ? 0 : 2,
      maximumFractionDigits: hasWholeValue ? 0 : 2,
    }).format(numericValue);
  } catch (error) {
    if (__DEV__) console.warn("Unable to format opportunity compensation:", error);
    return `${currencyCode} ${numericValue}`;
  }
};

export const parseCompensationValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) return null;

  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    // Handle range within a single string
    const rangeParts = trimmed.split(/\s*(?:-|–|to)\s*/i);
    if (rangeParts.length === 2) {
      const min = parseCompensationValue(rangeParts[0]);
      const max = parseCompensationValue(rangeParts[1]);
      if (min !== null && max !== null) {
        return { min, max };
      }
    }

    const sanitized = trimmed.replace(/[^0-9.-]+/g, "");
    const numeric = parseFloat(sanitized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
};

export const formatOpportunityCompensation = (
  amount,
  currency,
  maxAmount = null
) => {
  const currencyCode = (currency || "GBP").toUpperCase();
  const parsedAmount = parseCompensationValue(amount);
  let parsedMaxAmount = parseCompensationValue(maxAmount);

  if (parsedAmount !== null && typeof parsedAmount === "object") {
    const min = parsedAmount.min ?? null;
    const max = parsedAmount.max ?? null;
    if (min !== null && max !== null) {
      return `${formatCurrency(min, currencyCode)} – ${formatCurrency(
        max,
        currencyCode
      )}`;
    }
    return min !== null
      ? formatCurrency(min, currencyCode)
      : max !== null
      ? formatCurrency(max, currencyCode)
      : "TBD";
  }

  if (
    parsedMaxAmount !== null &&
    typeof parsedMaxAmount === "object" &&
    parsedMaxAmount.min !== undefined
  ) {
    parsedMaxAmount = parsedMaxAmount.max ?? parsedMaxAmount.min;
  }

  if (parsedAmount === null && parsedMaxAmount === null) {
    return "TBD";
  }

  if (
    parsedAmount !== null &&
    parsedMaxAmount !== null &&
    parsedAmount !== parsedMaxAmount
  ) {
    const min = Math.min(parsedAmount, parsedMaxAmount);
    const max = Math.max(parsedAmount, parsedMaxAmount);
    return `${formatCurrency(min, currencyCode)} – ${formatCurrency(
      max,
      currencyCode
    )}`;
  }

  const valueToFormat =
    parsedAmount !== null ? parsedAmount : parsedMaxAmount;
  return formatCurrency(valueToFormat, currencyCode);
};
