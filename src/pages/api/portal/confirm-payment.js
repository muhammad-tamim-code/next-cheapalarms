import { proxyToWordPress } from "../../../lib/api/wp-proxy";

export default async function handler(req, res) {
  return proxyToWordPress(req, res, "/ca/v1/portal/confirm-payment", {
    allowedMethods: ["POST"],
  });
}
