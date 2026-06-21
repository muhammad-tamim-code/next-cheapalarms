import { createWpProxyHandler } from "../../../../../lib/api/wp-proxy";

/**
 * Proxy: GET /api/products/ghl/{id}/price
 * Fetches a single GHL product's price(s) on demand.
 */
export default createWpProxyHandler((req) => {
  const { id } = req.query;
  if (!id || Array.isArray(id) || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Invalid product id");
  }
  return `/ca/v1/products/ghl/${encodeURIComponent(id)}/price`;
}, {
  allowedMethods: ["GET"],
});
