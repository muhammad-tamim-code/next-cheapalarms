import { createWpProxyHandler } from "../../../../../lib/api/wp-proxy";

/**
 * Next.js API route that proxies delete invoice requests to WordPress.
 * This route runs server-side and can read httpOnly cookies to authenticate requests.
 */
export default createWpProxyHandler((req) => {
  const { invoiceId } = req.query;
  if (!invoiceId || Array.isArray(invoiceId)) {
    throw new Error("Invalid invoiceId");
  }
  // Validate invoiceId format (alphanumeric and hyphens only) to prevent path injection
  if (!/^[a-zA-Z0-9_-]+$/.test(invoiceId)) {
    throw new Error("Invalid invoiceId format");
  }
  return `/ca/v1/admin/invoices/${encodeURIComponent(invoiceId)}/delete`;
}, {
  allowedMethods: ["POST"],
});
