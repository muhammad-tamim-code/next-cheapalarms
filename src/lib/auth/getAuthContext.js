/**
 * Server-side auth context fetched from WordPress
 * WordPress is the sole source of truth (Next.js never decodes JWT)
 */

import { AUTH_TIMEOUT } from "../api/constants";
import { getWpBase } from "../api/wp-proxy";
import { TOKEN_COOKIE } from "../wp";

/** Per-request memo so multiple getServerSideProps helpers don’t each call /auth/me */
const REQ_AUTH_CACHE = Symbol.for("cheapalarms.authContext");

export async function getAuthContext(req) {
  if (!req?.headers?.cookie) {
    return null;
  }

  if (req[REQ_AUTH_CACHE] !== undefined) {
    return req[REQ_AUTH_CACHE];
  }

  const markNull = () => {
    req[REQ_AUTH_CACHE] = null;
    return null;
  };

  // Check if cookie contains the token
  const hasToken = req.headers.cookie.includes(`${TOKEN_COOKIE}=`);
  if (!hasToken) {
    return markNull();
  }

  const wpBase = getWpBase();

  try {
    // Add timeout to prevent hanging (using AUTH_TIMEOUT constant)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT);

    let response;
    if (!wpBase) {
      console.error('[getAuthContext] WP API base not configured');
      clearTimeout(timeoutId);
      return markNull();
    }
    try {
      // Extract only token cookie to ensure clean format
      const cookies = req.headers.cookie.split(';').map(c => c.trim());
      const caJwtCookie = cookies.find(c => c.startsWith(`${TOKEN_COOKIE}=`));
      const cookieHeader = caJwtCookie || req.headers.cookie;

      response = await fetch(`${wpBase}/ca/v1/auth/me`, {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Next.js-SSR',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[getAuthContext] Fetch error:', fetchError.message);
      if (fetchError.name === 'AbortError') {
        console.error('[getAuthContext] Request timed out to', wpBase);
        return markNull();
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (response.status === 401) {
      return markNull();
    }
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unable to read error');
      console.error('[getAuthContext] WordPress error', response.status, response.statusText, text.substring(0, 200));
      return markNull();
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[getAuthContext] Failed to parse JSON response:', jsonError.message);
      return markNull();
    }

    if (!data?.ok) {
      console.error('[getAuthContext] WordPress response not ok:', data?.code || 'unknown');
      return markNull();
    }

    const ctx = {
      id: data.id,
      email: data.email,
      displayName: data.displayName,
      avatar: data.avatar || null,
      roleKey: data.role_key || null,
      roleLabel: data.role_label || null,
      roles: data.roles || [],
      permissions: data.permissions || [],
      capabilities: data.capabilities || [],
      isAdmin: data.is_admin === true,
      isCustomer: data.is_customer === true,
      allowedLocationIds: data.allowed_location_ids || [],
    };
    req[REQ_AUTH_CACHE] = ctx;
    return ctx;
  } catch (err) {
    console.error('[getAuthContext] Exception', err?.message || err);
    req[REQ_AUTH_CACHE] = null;
    return null;
  }
}
