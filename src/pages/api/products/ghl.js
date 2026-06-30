import { createWpProxyHandler } from "../../../lib/api/wp-proxy";

/**
 * Proxy: GET|POST /api/products/ghl
 * GET — list GHL catalog (local snapshots).
 * POST — create product in GHL + local snapshot.
 */
export default createWpProxyHandler("/ca/v1/products/ghl", {
  allowedMethods: ["GET", "POST"],
  // Building the catalog on a cache miss makes a couple of GHL calls; give it room.
  timeout: 60000,
});
