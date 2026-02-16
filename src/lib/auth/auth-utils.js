export function getLoginRedirect(from) {
  if (!from) return '/login';
  return `/login?from=${encodeURIComponent(from)}`;
}

/**
 * Sanitize a return URL to prevent open redirect attacks.
 * Only allows relative paths starting with '/'. Rejects absolute URLs,
 * protocol-relative URLs (//evil.com), and javascript: URIs.
 */
export function sanitizeReturnUrl(url, fallback = "/dashboard") {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  // Must start with exactly one '/' (not '//' which is protocol-relative)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  // Block javascript: and data: URIs that could be encoded in the path
  if (/^\/.*[:]/i.test(trimmed) && /javascript|data|vbscript/i.test(trimmed)) return fallback;
  return trimmed;
}

