/**
 * Public quote submission — browser → WordPress REST (CORS).
 *
 * Do NOT proxy via /api/quote-request on production: Hostinger/LiteSpeed bot
 * protection blocks server-to-server calls from Vercel and returns a reCAPTCHA
 * HTML page (403). The user's browser can reach WP directly when CORS allows
 * the portal origin (api_allowed_origins in plugin config).
 */

function getWpJsonBase() {
  const raw = process.env.NEXT_PUBLIC_WP_URL || "";
  const base = raw.replace(/\/+$/, "");
  if (!base) return "";
  if (/\/wp-json$/i.test(base)) return base;
  return `${base}/wp-json`;
}

/**
 * @param {Record<string, unknown>} payload Quote request body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function submitQuoteRequest(payload) {
  const wpBase = getWpJsonBase();
  if (!wpBase) {
    throw new Error("Quote service is not configured. Please try again later.");
  }

  const url = `${wpBase}/ca/v1/quote-request`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to reach the quote service. Check your connection and try again.");
  }

  const raw = await res.text().catch(() => "");
  const isBotWall =
    raw.includes("Bot Verification") || raw.includes("lsrecaptcha") || raw.includes(".lsrecap/recaptcha");

  if (isBotWall) {
    throw new Error(
      "The quote service is temporarily blocked by hosting security. Please try again in a moment or contact support.",
    );
  }

  let json = null;
  if (raw.trim()) {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(
        res.ok
          ? "Unexpected response from quote service."
          : `Quote request failed (${res.status}). Please try again.`,
      );
    }
  }

  if (!res.ok || !json?.ok) {
    const message =
      json?.error ||
      json?.err ||
      json?.message ||
      (json?.code === "duplicate_request"
        ? "A quote was just requested with this email — check your inbox."
        : `Quote request failed (${res.status}). Please try again.`);
    throw new Error(message);
  }

  return json;
}
