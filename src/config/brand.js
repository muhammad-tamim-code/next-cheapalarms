/**
 * Central brand / business configuration.
 *
 * Single source of truth for all business-specific identity on the frontend.
 * To launch this platform for a different business, edit the values here
 * (or set the matching NEXT_PUBLIC_* env vars) — do not hardcode the brand
 * name, support email, etc. anywhere else in the app.
 *
 * Env vars take precedence so the same build can be deployed per-business:
 *   NEXT_PUBLIC_BRAND_NAME
 *   NEXT_PUBLIC_SUPPORT_EMAIL
 *   NEXT_PUBLIC_BRAND_DOMAIN
 */
export const BRAND = {
  /** Display name shown in titles, sidebars, headings. */
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "CheapAlarms",

  /** Customer-facing support email (mailto links, footers). */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@cheapalarms.com.au",

  /** Primary domain (no protocol), used for links/copy where needed. */
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || "cheapalarms.com.au",
};

export default BRAND;
