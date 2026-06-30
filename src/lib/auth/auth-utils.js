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

/** True when an existing session may use the post-login return path. */
export function canAccessReturnUrl(authContext, from) {
  if (!authContext) return false;
  const returnUrl = sanitizeReturnUrl(from, "/dashboard");
  if (returnUrl.startsWith("/admin")) {
    return authContext.isAdmin === true;
  }
  return true;
}

/**
 * Resolve where to send the user after login (or when login page skips the form).
 * @param {{ isAdmin?: boolean, is_admin?: boolean }} user
 */
export function resolvePostLoginDestination(user, from) {
  const isAdmin = user?.isAdmin === true || user?.is_admin === true;
  const returnUrl = sanitizeReturnUrl(from, "/dashboard");

  if (returnUrl.startsWith("/admin")) {
    return isAdmin ? returnUrl : null;
  }
  if (returnUrl === "/dashboard") {
    return isAdmin ? "/admin" : "/portal";
  }
  return returnUrl;
}

