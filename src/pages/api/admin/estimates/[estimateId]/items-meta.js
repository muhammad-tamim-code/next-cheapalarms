import { createWpProxyHandler } from "../../../../../lib/api/wp-proxy";

/**
 * Admin: partially update itemsMeta on an estimate (photoRequired / isHeading per line).
 * Body: { items: [{ name, photoRequired?, isHeading? }, ...] }
 */
export default createWpProxyHandler((req) => {
  const { estimateId } = req.query;
  if (!estimateId || Array.isArray(estimateId)) {
    throw new Error("Invalid estimateId");
  }
  if (!/^[a-zA-Z0-9-]+$/.test(estimateId)) {
    throw new Error("Invalid estimateId format");
  }
  return `/ca/v1/admin/estimates/${encodeURIComponent(estimateId)}/items-meta`;
}, {
  allowedMethods: ["POST"],
});
