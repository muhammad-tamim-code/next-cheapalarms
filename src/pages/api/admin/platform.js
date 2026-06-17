import { createWpProxyHandler } from "../../../lib/api/wp-proxy";

/**
 * Proxies GET /ca/v1/admin/platform (feature flags / integration hints for admin UI).
 */
export default createWpProxyHandler(() => "/ca/v1/admin/platform", {
  allowedMethods: ["GET"],
});
