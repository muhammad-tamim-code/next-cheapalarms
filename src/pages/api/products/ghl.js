import { createWpProxyHandler } from "../../../lib/api/wp-proxy";

/**
 * Proxy: GET /api/products/ghl?search=&refresh=1
 * Lists the GHL product catalog (cached server-side in the WP plugin).
 */
export default createWpProxyHandler("/ca/v1/products/ghl", {
  allowedMethods: ["GET"],
  // Building the catalog on a cache miss makes a couple of GHL calls; give it room.
  timeout: 30000,
});
