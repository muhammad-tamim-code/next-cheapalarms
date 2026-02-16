/**
 * Portal utility functions
 */

export function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return value;
  }
}

export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function badgeVariant(status) {
  const normalized = (status ?? "").toLowerCase();
  if (["accepted", "active", "scheduled"].includes(normalized)) {
    return "secondary";
  }
  if (["declined", "rejected", "failed"].includes(normalized)) {
    return "destructive";
  }
  return "outline";
}

export function cookieHeader(req) {
  const cookie = req?.headers?.cookie;
  return cookie ? { Cookie: cookie } : {};
}

/**
 * Format address object to string
 * Handles both string addresses and address objects with {addressLine1, city, state, postalCode, countryCode}
 */
export function formatAddress(addr) {
  if (typeof addr === "string") return addr;
  if (!addr) return "";
  
  const parts = [
    addr.addressLine1,
    addr.city,
    addr.state,
    addr.postalCode,
    addr.countryCode
  ].filter(Boolean);
  
  return parts.join(", ");
}

