/**
 * Xero OAuth Callback Handler
 * 
 * This endpoint handles the OAuth callback from Xero after user authorization.
 * Xero redirects here with a code and state parameter.
 * 
 * Flow:
 * 1. User clicks "Connect Xero" -> redirects to Xero authorization page
 * 2. User authorizes -> Xero redirects to this callback with code & state
 * 3. This endpoint exchanges code for access token via WordPress API
 * 4. Redirects user to admin page with success/error message
 * 
 * Note: This route is called by Xero (external redirect), so it cannot use
 * proxyToWordPress directly. It must handle the redirect flow itself.
 */
import { getWpBase, createWpHeaders } from "../../../lib/api/wp-proxy";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { code, state, error } = req.query;

  // Handle OAuth errors from Xero
  if (error) {
    return res.redirect(
      `/admin/invoices?xero_error=${encodeURIComponent(error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return res.redirect(
      `/admin/invoices?xero_error=${encodeURIComponent("Missing authorization code or state")}`
    );
  }

  try {
    // Exchange code for token via WordPress API
    // Use getWpBase() for consistency with other API routes
    const wpBase = getWpBase();
    if (!wpBase) {
      throw new Error("WordPress API URL not configured");
    }

    const wpHeaders = createWpHeaders(req);
    const response = await fetch(`${wpBase}/ca/v1/xero/callback`, {
      method: "POST",
      headers: {
        ...wpHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("[Xero Callback] JSON parse error:", parseError);
      return res.redirect(
        `/admin/invoices?xero_error=${encodeURIComponent("Invalid response format")}`
      );
    }

    if (!response.ok || !data.ok) {
      // Extract error message with proper fallback
      const errorMessage = 
        data?.err || 
        data?.message || 
        data?.error?.message ||
        `HTTP ${response.status}: ${response.statusText || "Unknown error"}` ||
        "Failed to connect Xero";
      console.error("[Xero Callback] API error:", {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return res.redirect(
        `/admin/invoices?xero_error=${encodeURIComponent(errorMessage)}`
      );
    }

    // Success - redirect to admin invoices page
    return res.redirect(
      `/admin/invoices?xero_connected=true&tenant_id=${data.tenantId || ""}`
    );
  } catch (error) {
    console.error("[Xero Callback] Error:", error);
    const errorMessage = error.message || "Connection failed";
    return res.redirect(
      `/admin/invoices?xero_error=${encodeURIComponent(errorMessage)}`
    );
  }
}

