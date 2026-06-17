import { createWpProxyHandler } from "../../../../../lib/api/wp-proxy";

export default createWpProxyHandler((req) => {
  const userId = req.query.userId;
  return `/ca/v1/admin/users/${encodeURIComponent(userId)}/role`;
}, {
  allowedMethods: ["PUT"],
});
