import { createWpProxyHandler } from "../../../lib/api/wp-proxy";

/**
 * Public: returns Stripe publishable key from WordPress config (same precedence as admin).
 * Used by the portal when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set at build time.
 */
export default createWpProxyHandler("/ca/v1/stripe/publishable-key", {
  allowedMethods: ["GET"],
});
