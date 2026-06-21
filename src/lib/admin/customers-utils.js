/**
 * Helpers for the admin Customers tab (GHL contacts + WP account + activity).
 */

import { matchContactsToUsers } from "./services/customers-data";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function getContactDisplayName(contact) {
  const name = `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim();
  return name || contact?.email || "No name";
}

export function getContactInitials(contact) {
  const name = getContactDisplayName(contact);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
}

export function getAvatarColorClass(contactId) {
  const key = String(contactId || "");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] || AVATAR_COLORS[0];
}

export function formatContactAddress(contact) {
  const parts = [
    contact?.addressLine1 || contact?.address1,
    contact?.city,
    contact?.state,
    contact?.postalCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** @param {Array} estimates @param {Array} invoices */
export function buildContactActivityIndex(estimates = [], invoices = []) {
  const byEmail = new Map();

  const bucket = (email) => {
    const key = (email || "").toLowerCase().trim();
    if (!key) return null;
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        estimateCount: 0,
        invoiceCount: 0,
        estimates: [],
        invoices: [],
      });
    }
    return byEmail.get(key);
  };

  for (const est of estimates) {
    const b = bucket(est.contactEmail);
    if (!b) continue;
    b.estimateCount += 1;
    b.estimates.push(est);
  }

  for (const inv of invoices) {
    const b = bucket(inv.contactEmail);
    if (!b) continue;
    b.invoiceCount += 1;
    b.invoices.push(inv);
  }

  for (const entry of byEmail.values()) {
    entry.estimates.sort((a, b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
    entry.invoices.sort((a, b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
  }

  return byEmail;
}

export function enrichContacts(contacts, wpUsers, activityByEmail, locationId) {
  const matched = matchContactsToUsers(contacts, wpUsers);

  return matched.map((contact) => {
    const emailKey = (contact.email || "").toLowerCase().trim();
    const activity = activityByEmail.get(emailKey) || {
      estimateCount: 0,
      invoiceCount: 0,
      estimates: [],
      invoices: [],
    };

    return {
      ...contact,
      displayName: getContactDisplayName(contact),
      locationId: contact.locationId || locationId || "",
      hasAccount: Boolean(contact.matchedUser),
      hasPortal: Boolean(contact.matchedUser?.hasPortal),
      estimateCount: activity.estimateCount,
      invoiceCount: activity.invoiceCount,
      recentEstimates: activity.estimates.slice(0, 3),
      recentInvoices: activity.invoices.slice(0, 3),
    };
  });
}

export const CUSTOMER_FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "portal", label: "Portal users" },
  { value: "no_portal", label: "No portal" },
  { value: "estimates", label: "With estimates" },
  { value: "invoices", label: "With invoices" },
];

export function filterCustomersByTab(customers, tab) {
  switch (tab) {
    case "portal":
      return customers.filter((c) => c.hasPortal);
    case "no_portal":
      return customers.filter((c) => !c.hasPortal);
    case "estimates":
      return customers.filter((c) => (c.estimateCount ?? 0) > 0);
    case "invoices":
      return customers.filter((c) => (c.invoiceCount ?? 0) > 0);
    default:
      return customers;
  }
}

export function computeCustomerStats(customers) {
  const totalEstimates = customers.reduce((s, c) => s + (c.estimateCount ?? 0), 0);
  const totalInvoices = customers.reduce((s, c) => s + (c.invoiceCount ?? 0), 0);
  const portalCount = customers.filter((c) => c.hasPortal).length;
  const total = customers.length;

  return {
    total,
    portalCount,
    portalPct: total > 0 ? Math.round((portalCount / total) * 100) : 0,
    totalEstimates,
    totalInvoices,
  };
}

export function tabCounts(customers) {
  return {
    all: customers.length,
    portal: customers.filter((c) => c.hasPortal).length,
    no_portal: customers.filter((c) => !c.hasPortal).length,
    estimates: customers.filter((c) => (c.estimateCount ?? 0) > 0).length,
    invoices: customers.filter((c) => (c.invoiceCount ?? 0) > 0).length,
  };
}

export function exportCustomersCsv(customers) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Location ID",
    "Has account",
    "Estimates",
    "Invoices",
    "Contact ID",
  ];
  const rows = customers.map((c) => [
    c.displayName,
    c.email || "",
    c.phone || "",
    c.locationId || "",
    c.hasAccount ? "Yes" : "No",
    String(c.estimateCount ?? 0),
    String(c.invoiceCount ?? 0),
    c.id || "",
  ]);

  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function pageNumbers(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}
