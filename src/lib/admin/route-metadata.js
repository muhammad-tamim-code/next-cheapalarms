import {
  LayoutDashboard,
  Package,
  FileText,
  Receipt,
  Mail,
  Users,
  Settings,
  Plug,
  ScrollText,
  UserCircle,
} from "lucide-react";

/**
 * Route metadata mapping for admin routes
 * Maps route paths to title and icon for header display
 */
export const routeMetadata = {
  // Exact matches
  "/admin": { title: "Overview", icon: LayoutDashboard },
  "/admin/products": { title: "Products", icon: Package },
  "/admin/estimates": { title: "Estimates", icon: FileText },
  "/admin/invoices": { title: "Invoices", icon: Receipt },
  "/admin/invites": { title: "Invites", icon: Mail },
  "/admin/customers": { title: "Customers", icon: Users },
  "/admin/team": { title: "Team", icon: Users },
  "/admin/settings": { title: "Settings", icon: Settings },
  "/admin/integrations": { title: "Integrations", icon: Plug },
  "/admin/logs": { title: "Logs", icon: ScrollText },
  "/admin/profile": { title: "Profile", icon: UserCircle },
  
  // Pattern matches (for dynamic routes)
  "/admin/estimates/[estimateId]": { title: "Estimates", icon: FileText },
  "/admin/invoices/[invoiceId]": { title: "Invoices", icon: Receipt },
};

/**
 * Get route metadata for a given pathname
 * Handles exact matches, pattern matches, and query params
 * 
 * @param {string} pathname - Next.js router.pathname (route pattern) or actual path
 * @param {string} asPath - Next.js router.asPath (actual URL) - optional
 * @returns {Object} { title, icon } metadata
 */
export function getRouteMetadata(pathname, asPath) {
  if (!pathname) {
    return { title: "Admin", icon: LayoutDashboard };
  }

  // Try exact match first (for route patterns like "/admin/estimates/[estimateId]")
  if (routeMetadata[pathname]) {
    return routeMetadata[pathname];
  }
  
  // Try base path from asPath (strip query params)
  if (asPath) {
    const basePath = asPath.split('?')[0];
    if (routeMetadata[basePath]) {
      return routeMetadata[basePath];
    }
  }
  
  // Try to match parent route for dynamic routes
  // e.g., /admin/estimates/[estimateId] -> /admin/estimates
  if (pathname.includes('[')) {
    const parentPath = pathname.split('/[')[0];
    if (routeMetadata[parentPath]) {
      return routeMetadata[parentPath];
    }
  }
  
  // Try matching the pathname directly (for actual paths like "/admin/customers")
  // This handles cases where pathname is an actual URL, not a pattern
  if (routeMetadata[pathname]) {
    return routeMetadata[pathname];
  }
  
  // Try to match by removing dynamic segments from actual paths
  // e.g., /admin/estimates/123 -> /admin/estimates
  const pathSegments = pathname.split('/');
  if (pathSegments.length > 2) {
    // Try parent path (remove last segment)
    const parentPath = pathSegments.slice(0, -1).join('/');
    if (routeMetadata[parentPath]) {
      return routeMetadata[parentPath];
    }
  }
  
  // Fallback to default
  return { title: "Admin", icon: LayoutDashboard };
}
