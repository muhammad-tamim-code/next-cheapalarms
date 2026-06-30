/**
 * SERVER ONLY - WordPress API client for Next.js API routes and SSR
 * 
 * ⚠️ DO NOT import this file in client-side code (components, hooks, pages)
 * This file makes direct calls to WordPress which will fail from the browser
 * due to CORS and cookie domain restrictions.
 * 
 * For client-side code, use:
 * - apiFetch() from lib/api/apiFetch.js to call Next.js API routes (/api/*)
 * - Next.js API routes will proxy to WordPress using wp-proxy.js
 */

import { parse as parseCookie } from "cookie";
import { API_TIMEOUT } from "./api/constants";

const TOKEN_COOKIE = "ca_jwt";

const WP_API_BASE =
  process.env.NEXT_PUBLIC_WP_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:10013/wp-json"
    : "");

/**
 * Server-side WordPress API fetch
 * Only works in Node.js environment (API routes, SSR, getServerSideProps)
 */
async function wpFetch(path, options = {}) {
  if (!path.startsWith("/")) {
    throw new Error("wpFetch expects path to start with '/'");
  }

  // Validate WP_API_BASE before making request
  if (!WP_API_BASE) {
    throw new Error("WordPress API base URL is not configured. Please set NEXT_PUBLIC_WP_URL environment variable.");
  }

  const url = `${WP_API_BASE}${path}`;

  const headers = normaliseHeaders(options.headers);
  let token =
    options.token ??
    headers.Authorization?.replace(/^Bearer\s+/i, "") ??
    extractTokenFromHeaders(headers);

  // On server-side, extract token from cookie header
  if (!token && options.headers?.Cookie) {
    const cookies = parseCookie(options.headers.Cookie);
    token = cookies[TOKEN_COOKIE] ?? null;
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Create AbortController for timeout (using API_TIMEOUT constant)
  const controller = new AbortController();
  let timeoutId = null;

  try {
    timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      next: {
        revalidate: options.next?.revalidate ?? 30,
      },
    });
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (
        errorText.includes("Bot Verification") ||
        errorText.includes("lsrecaptcha") ||
        errorText.includes(".lsrecap/recaptcha")
      ) {
        throw new Error(
          "WP error 403 Forbidden: WordPress hosting blocked this request (LiteSpeed/Hostinger bot protection). " +
            "Allow /wp-json/ through the firewall or disable bot verification for REST API paths."
        );
      }
      throw new Error(
        `WP error ${response.status} ${response.statusText}: ${errorText}`
      );
    }

    return response.json();
  } catch (error) {
    // Clear timeout if it was set
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. The server may be slow or unavailable. Please try again.");
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Unable to connect to WordPress API. Please check your connection and API configuration.");
    }
    // Re-throw other errors (including our custom errors)
    throw error;
  }
}

export async function authenticate({ username, password, remember = false }) {
  return wpFetch("/ca/v1/auth/token", {
    method: "POST",
    body: JSON.stringify({ username, password, remember: Boolean(remember) }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function resendPortalInvite({ estimateId, locationId }, fetchOptions = {}) {
  return wpFetch("/ca/v1/portal/resend-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
    body: JSON.stringify({
      estimateId,
      locationId,
    }),
    ...fetchOptions,
  });
}

export { WP_API_BASE, TOKEN_COOKIE, wpFetch };

function normaliseHeaders(customHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  for (const [key, value] of Object.entries(customHeaders)) {
    if (value === undefined || value === null) continue;
    headers[normaliseHeaderKey(key)] = value;
  }

  const cookieHeader = headers.Cookie ?? headers.cookie;
  if (cookieHeader) {
    delete headers.cookie;
    headers.Cookie = cookieHeader;
  }

  return headers;
}

function normaliseHeaderKey(key) {
  if (!key) return key;
  return key
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join("-");
}

function extractTokenFromHeaders(headers) {
  const cookieHeader = headers.Cookie ?? "";
  if (!cookieHeader) return null;
  const parsed = parseCookie(cookieHeader);
  const token = parsed[TOKEN_COOKIE] ?? null;
  delete headers.Cookie;
  return token;
}
