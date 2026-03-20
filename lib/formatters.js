/**
 * Pure formatting utilities for opportunity data.
 * These are stateless functions with no React dependencies.
 */

export const formatOpportunityDate = (dateValue) => {
  if (!dateValue) return "TBD";
  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "TBD";
    }

    const day = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "long" });
    const year = date.getFullYear();

    // Add ordinal suffix
    const getOrdinalSuffix = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };

    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  } catch (error) {
    if (__DEV__) console.warn("Unable to format opportunity date:", error);
    return "TBD";
  }
};

export const formatOpportunityTime = (startValue, endValue = null) => {
  const sanitize = (value) => {
    if (!value && value !== 0) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || /^tbd$/i.test(trimmed)) return null;

      // Handle ISO timestamps like "2025-09-12T21:00:00Z"
      if (/^\d{4}-\d{2}-\d{2}T/i.test(trimmed)) {
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
          return new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }).format(parsed);
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
          const normalizedHours = ((hours + 11) % 12) + 1;
          const period = hours >= 12 ? "PM" : "AM";
          const paddedMinutes = minutes.toString().padStart(2, "0");
          return `${normalizedHours}:${paddedMinutes} ${period}`;
        }
      }

      // Fallback to trimmed string
      return trimmed;
    }

    if (value instanceof Date) {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(value);
    }

    if (typeof value === "number") {
      // Treat as minutes past midnight
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      const normalizedHours = ((hours + 11) % 12) + 1;
      const period = hours >= 12 ? "PM" : "AM";
      const paddedMinutes = minutes.toString().padStart(2, "0");
      return `${normalizedHours}:${paddedMinutes} ${period}`;
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
  if (startResult && endResult) {
    if (startResult === endResult) return startResult;
    return `${startResult} – ${endResult}`;
  }
  return startResult || endResult || "TBD";
};

export const formatCurrency = (value, currencyCode) => {
  if (value === null || value === undefined) return "TBD";

  const hasWholeValue = Number.isInteger(value);

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: hasWholeValue ? 0 : 2,
      maximumFractionDigits: hasWholeValue ? 0 : 2,
    }).format(value);
  } catch (error) {
    if (__DEV__) console.warn("Unable to format opportunity compensation:", error);
    return `${currencyCode} ${value}`;
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

  if (parsedAmount && typeof parsedAmount === "object") {
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
    parsedMaxAmount &&
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
