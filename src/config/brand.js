/**
 * Central brand / business configuration.
 *
 * Single source of truth for all business-specific identity on the frontend.
 * Set matching NEXT_PUBLIC_* env vars per deployment — do not hardcode brand
 * name, logos, support email, etc. elsewhere in the app.
 */

const DEFAULT_LOGOS = {
  horizontal: "/brand/logo-horizontal.png",
  horizontalAlt: "/brand/logo-horizontal-alt.png",
  mark: "/brand/logo-mark.png",
};

export const BRAND = {
  /** Display name shown in titles, sidebars, headings. */
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "CheapAlarms",

  /** Short tagline under the logo (emails, marketing). */
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Your Security Partner",

  /** Customer-facing support email (mailto links, footers). */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@cheapalarms.com.au",

  /** Primary domain (no protocol), used for links/copy where needed. */
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || "cheapalarms.com.au",

  /** Logo asset paths (served from /public/brand/ or overridden via env). */
  logos: {
    horizontal: process.env.NEXT_PUBLIC_BRAND_LOGO_HORIZONTAL || DEFAULT_LOGOS.horizontal,
    horizontalAlt: process.env.NEXT_PUBLIC_BRAND_LOGO_HORIZONTAL_ALT || DEFAULT_LOGOS.horizontalAlt,
    mark: process.env.NEXT_PUBLIC_BRAND_LOGO_MARK || DEFAULT_LOGOS.mark,
  },
};

/**
 * Resolve which logo variant to show.
 *
 * @param {"horizontal"|"horizontal-alt"|"mark"|"auto"} variant
 * @param {"default"|"compact"|"icon"|"sidebar"|"email"} context
 */
export function getBrandLogo(variant = "auto", context = "default") {
  if (variant === "horizontal") return BRAND.logos.horizontal;
  if (variant === "horizontal-alt") return BRAND.logos.horizontalAlt;
  if (variant === "mark") return BRAND.logos.mark;

  if (context === "compact" || context === "icon") return BRAND.logos.mark;
  if (context === "sidebar") return BRAND.logos.horizontal;
  return BRAND.logos.horizontal;
}

export default BRAND;
