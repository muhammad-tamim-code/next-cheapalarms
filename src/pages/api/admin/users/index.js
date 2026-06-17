import { createWpProxyHandler } from "../../../../lib/api/wp-proxy";

export default createWpProxyHandler("/ca/v1/admin/users", {
  allowedMethods: ["POST"],
});
