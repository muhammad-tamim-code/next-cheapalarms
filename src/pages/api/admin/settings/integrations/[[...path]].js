import { createWpProxyHandler } from "../../../../../lib/api/wp-proxy";

function integrationsWpPath(req) {
  const raw = req.query.path;
  const segments = Array.isArray(raw) ? raw : raw != null && raw !== "" ? [String(raw)] : [];
  const suffix = segments.length ? `/${segments.join("/")}` : "";
  return `/ca/v1/admin/settings/integrations${suffix}`;
}

export default createWpProxyHandler(integrationsWpPath, {
  allowedMethods: ["GET", "POST", "DELETE"],
});
