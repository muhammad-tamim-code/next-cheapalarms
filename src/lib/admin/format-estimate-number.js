/** Default matches plugin config `estimate_number_prefix`. */
export const ESTIMATE_NUMBER_PREFIX = "EST-";

/**
 * Format GHL estimate numbers for display (prefix + sequence).
 * Handles bare integers (146), GHL UI bug ("undefined146"), and already-formatted values.
 */
export function formatEstimateNumber(raw, { prefix = ESTIMATE_NUMBER_PREFIX, fallbackId = "" } = {}) {
  if (raw === null || raw === undefined || raw === "") {
    return fallbackId || "";
  }

  let value = String(raw).trim();
  if (!value) {
    return fallbackId || "";
  }

  const undefinedMatch = /^undefined(\d+)$/i.exec(value);
  if (undefinedMatch) {
    value = undefinedMatch[1];
  }

  if (/^\d+$/.test(value)) {
    return `${prefix}${value}`;
  }

  if (/^[A-Za-z]+-\S+$/.test(value)) {
    return value;
  }

  return value;
}
