/**
 * Generic WordPress API proxy utility.
 * Handles forwarding requests from Next.js to WordPress REST API.
 */

import { parse as parseCookie } from "cookie";
import { TOKEN_COOKIE } from "../wp";
import { API_TIMEOUT } from "./constants";

const WP_API_BASE = process.env.NEXT_PUBLIC_WP_URL || "http://localhost:8882";

/**
 * Get WordPress REST API base URL (always includes /wp-json so REST routes resolve correctly).
 * Normalizes env value: appends /wp-json when missing, strips trailing slash.
 */
export function getWpBase() {
  const raw = process.env.NEXT_PUBLIC_WP_URL || WP_API_BASE;
  if (!raw || typeof raw !== "string") return "";
  const base = raw.replace(/\/+$/, "");
  if (!base) return "";
  if (/\/wp-json\/?$/i.test(base)) return base.replace(/\/+$/, "");
  return `${base}/wp-json`;
}

/**
 * Parse WordPress REST response body safely (text then JSON).
 * Use in API routes that fetch WP directly instead of proxyToWordPress.
 *
 * @param {Response} response - Fetch Response
 * @returns {Promise<{ ok: boolean, body: unknown, status: number }>} Parsed body and status; body may be null on parse failure
 */
function isHostingBotWall(text) {
  return (
    text.includes("Bot Verification") ||
    text.includes("lsrecaptcha") ||
    text.includes(".lsrecap/recaptcha")
  );
}

export async function parseWpResponse(response) {
  const status = response.status;
  const text = await response.text().catch(() => "");
  if (!text) {
    return { ok: response.ok, body: { ok: false, err: "Empty response from WordPress API" }, status };
  }
  if (isHostingBotWall(text)) {
    return {
      ok: false,
      body: {
        ok: false,
        err:
          "WordPress hosting blocked the server request (LiteSpeed/Hostinger bot protection). " +
          "Allow /wp-json/ through the firewall or disable bot verification for REST API paths.",
        code: "hosting_bot_wall",
      },
      status: status || 403,
    };
  }
  try {
    const body = JSON.parse(text);
    return { ok: response.ok, body, status };
  } catch (e) {
    return {
      ok: false,
      body: {
        ok: false,
        err: "Failed to parse response from WordPress API",
        details: e instanceof Error ? e.message : "Unknown parsing error",
      },
      status: status || 500,
    };
  }
}

/**
 * Create headers for WordPress API request
 */
export function createWpHeaders(req) {
  // FIX: Always forward the raw cookie header, even if parsing fails
  // This ensures WordPress can parse cookies even if Next.js parsing has issues
  // This fixes intermittent 401 errors where cookies aren't available on first request
  const rawCookieHeader = req.headers.cookie || "";
  
  // Try to parse cookies for Authorization header
  let token = null;
  try {
    const cookies = parseCookie(rawCookieHeader);
    token = cookies[TOKEN_COOKIE] || null;
  } catch (parseError) {
    // Parsing failed - try manual extraction as fallback
    // This handles edge cases where parseCookie fails but cookie exists
    if (rawCookieHeader.includes(`${TOKEN_COOKIE}=`)) {
      const match = rawCookieHeader.match(new RegExp(`${TOKEN_COOKIE}=([^;]+)`));
      if (match && match[1]) {
        try {
          token = decodeURIComponent(match[1].trim());
        } catch (decodeError) {
          // If decode fails, try without decoding (might already be decoded)
          token = match[1].trim();
        }
      }
    }
  }
  
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const devHeader = process.env.NODE_ENV === "development" ? { "X-CA-Dev": "1" } : {};
  const nonceHeader = req.headers["x-wp-nonce"]
    ? { "X-WP-Nonce": req.headers["x-wp-nonce"] }
    : {};

  return {
    "Content-Type": "application/json",
    // Always forward raw cookie header for WordPress auth
    Cookie: rawCookieHeader,
    // CSRF: X-Requested-With proves the request came from same-origin JS code
    // (browsers block custom headers on cross-origin requests by default)
    "X-Requested-With": "NextJSProxy",
    ...authHeader,
    ...devHeader,
    ...nonceHeader,
  };
}

/**
 * Generic proxy handler for WordPress REST API endpoints.
 * 
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @param {string} wpPath - WordPress API path (e.g., '/ca/v1/products')
 * @param {Object} options - Additional options
 * @param {string[]} options.allowedMethods - Allowed HTTP methods (default: ['GET', 'POST'])
 * @param {Function} options.transformRequest - Optional function to transform request body before sending
 * @param {Function} options.transformResponse - Optional function to transform response before returning
 * @param {Function} options.buildPath - Optional function to build the full path (for dynamic paths with query params)
 */
export async function proxyToWordPress(req, res, wpPath, options = {}) {
  const {
    allowedMethods = ["GET", "POST"],
    transformRequest = (body) => body,
    transformResponse = (body) => body,
    buildPath = null,
    timeout = API_TIMEOUT,
  } = options;

  // Check method
  if (!allowedMethods.includes(req.method)) {
    res.setHeader("Allow", allowedMethods);
    return res.status(405).json({ ok: false, err: "Method not allowed" });
  }

  const wpBase = getWpBase();
  if (!wpBase) {
    return res.status(500).json({ ok: false, err: "WP API base not configured" });
  }

  try {
    const headers = createWpHeaders(req);
    const fetchOptions = {
      method: req.method,
      headers,
      credentials: "include",
    };

    // Build the full URL path (handle query strings)
    let finalPath = wpPath;
    if (buildPath) {
      finalPath = buildPath(wpPath, req);
    } else if (req.method === "GET" && req.query && Object.keys(req.query).length > 0) {
      // Auto-append query string for GET requests
      const params = new URLSearchParams();
      Object.entries(req.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        finalPath = `${wpPath}${wpPath.includes("?") ? "&" : "?"}${queryString}`;
      }
    }

    // Add body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(transformRequest(req.body));
    }

    const wpUrl = `${wpBase}${finalPath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    let wpResp;
    try {
      wpResp = await fetch(wpUrl, fetchOptions);
    } finally {
      clearTimeout(timeoutId);
    }

    const { body, status } = await parseWpResponse(wpResp);
    const transformedBody = transformResponse(body);
    return res.status(status).json(transformedBody);
  } catch (e) {
    const message =
      e instanceof Error
        ? e.name === "AbortError"
          ? "WordPress API request timed out"
          : e.message
        : "Failed to proxy request";
    return res.status(500).json({
      ok: false,
      err: message,
    });
  }
}

/**
 * Create a Next.js API route handler that proxies to WordPress.
 * 
 * @param {string|Function} wpPath - WordPress API path or function that returns path
 * @param {Object} options - Options (same as proxyToWordPress)
 * @returns {Function} Next.js API route handler
 */
export function createWpProxyHandler(wpPath, options = {}) {
  return async (req, res) => {
    try {
      // Handle dynamic paths (functions that take req and return path)
      // Wrap in try-catch to handle validation errors from path functions
      const path = typeof wpPath === 'function' ? wpPath(req) : wpPath;
      
      // Handle validation
      if (options.validate) {
        const validation = options.validate(req);
        if (validation && !validation.valid) {
          return res.status(validation.status || 400).json({ 
            ok: false, 
            err: validation.error || 'Validation failed' 
          });
        }
      }
      
      return proxyToWordPress(req, res, path, options);
    } catch (error) {
      // Catch errors from path function (e.g., "Invalid estimateId")
      // Return 400 Bad Request instead of 500 Internal Server Error
      return res.status(400).json({
        ok: false,
        err: error instanceof Error ? error.message : 'Invalid request',
      });
    }
  };
}

