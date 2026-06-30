/**
 * Dashboard data service for admin overview
 * Handles fetching and processing dashboard statistics
 *
 * SERVER-SIDE ONLY — called from getServerSideProps.
 * All WordPress calls go through wpFetch (never raw fetch + WP_API_BASE).
 */

import { wpFetch } from "../../wp.server";
import { cookieHeader } from "../utils/request-utils";
import { formatTimeAgo } from "../../utils/time-utils";
import { formatEstimateNumber } from "../format-estimate-number";

/**
 * Fetches GHL catalog product count from WordPress API
 * @param {object} req - Next.js request object
 * @returns {Promise<number>}
 */
async function fetchProductCount(req) {
  const headers = cookieHeader(req);

  try {
    const data = await wpFetch("/ca/v1/products/ghl?limit=1&excludeCalculator=1", { headers });
    return typeof data?.total === "number" ? data.total : Array.isArray(data?.items) ? data.items.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Calculates statistics from estimates data
 * @param {Array} estimates - Array of estimate objects
 * @param {number} productCount - GHL catalog product count
 * @returns {Array} Array of stat objects
 */
function calculateStats(estimates, productCount) {
  const totalEstimates = estimates.length;
  const pendingEstimates = estimates.filter(
    (e) => e.status && !["accepted", "approved"].includes(e.status.toLowerCase())
  ).length;
  const acceptedEstimates = estimates.filter((e) =>
    ["accepted", "approved"].includes((e.status || "").toLowerCase())
  ).length;

  return [
    {
      title: "Total estimates",
      value: totalEstimates.toString(),
      hint: `${acceptedEstimates} accepted`,
    },
    {
      title: "Pending estimates",
      value: pendingEstimates.toString(),
      hint: "Awaiting approval",
    },
    {
      title: "Accepted estimates",
      value: acceptedEstimates.toString(),
      hint: "Ready for installation",
    },
    {
      title: "Products",
      value: productCount.toString(),
      hint: "GHL catalog",
    },
  ];
}

/**
 * Generates alerts from estimates data
 * @param {Array} estimates - Array of estimate objects
 * @returns {Array} Array of alert objects
 */
function generateAlerts(estimates) {
  const alerts = [];
  const totalEstimates = estimates.length;
  const pendingEstimates = estimates.filter(
    (e) => e.status && !["accepted", "approved"].includes(e.status.toLowerCase())
  ).length;
  const estimatesWithInvites = estimates.filter((e) => e.inviteToken);

  if (estimatesWithInvites.length > 0 && pendingEstimates > 10) {
    alerts.push({
      title: `${pendingEstimates} estimates pending`,
      description: "Review and follow up on pending estimates.",
    });
  }

  if (totalEstimates === 0) {
    alerts.push({
      title: "No estimates found",
      description: "Create your first estimate to get started.",
    });
  }

  return alerts;
}

/**
 * Generates activity feed from recent estimates
 * @param {Array} estimates - Array of estimate objects
 * @returns {Array} Array of activity objects
 */
function generateActivity(estimates) {
  return estimates
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5)
    .map((estimate) => {
      const dateStr = estimate.updatedAt || estimate.createdAt;
      const status = estimate.status || "pending";
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

      return {
        title: `Estimate ${statusLabel}`,
        description: estimate.estimateNumber
          ? `#${formatEstimateNumber(estimate.estimateNumber, { fallbackId: estimate.id })}`
          : estimate.email
          ? `for ${estimate.email}`
          : `ID: ${estimate.id}`,
        when: formatTimeAgo(dateStr),
      };
    });
}

/**
 * Fetches and processes all dashboard data
 * @param {object} req - Next.js request object
 * @returns {Promise<{stats: Array, alerts: Array, activity: Array}>}
 */
export async function getDashboardData(req) {
  try {
    const headers = cookieHeader(req);
    // Parallelize admin estimates + product counts (Phase 0: fewer sequential WP round-trips)
    const [estimatesData, productCount] = await Promise.all([
      wpFetch(`/ca/v1/admin/estimates?page=1&pageSize=100`, { headers }),
      fetchProductCount(req),
    ]);

    const estimates = estimatesData?.items ?? [];

    return {
      stats: calculateStats(estimates, productCount),
      alerts: generateAlerts(estimates),
      activity: generateActivity(estimates),
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Returns error state for dashboard
 * @param {string} message - Error message
 * @returns {object} Error state object
 */
export function getDashboardErrorState(message) {
  // Check if it's a permission error
  const isPermissionError = /403|forbidden|insufficient privileges/i.test(message);
  
  return {
    stats: [
      { title: "Total estimates", value: "—", hint: "Error loading" },
      { title: "Pending estimates", value: "—", hint: "Error loading" },
      { title: "Accepted estimates", value: "—", hint: "Error loading" },
      { title: "Products", value: "—", hint: "Error loading" },
    ],
    alerts: [
      {
        title: isPermissionError ? "Access Denied" : "Failed to load data",
        description: message,
      },
    ],
    activity: [],
    error: message,
  };
}

