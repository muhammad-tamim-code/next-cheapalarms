import Link from "next/link";
import {
  X,
  ExternalLink,
  Trash2,
  Mail,
  Phone,
  MapPin,
  User,
} from "lucide-react";
import { DEFAULT_CURRENCY } from "../../lib/admin/constants";
import { formatEstimateNumber } from "../../lib/admin/format-estimate-number";
import {
  getAvatarColorClass,
  getContactInitials,
  formatContactAddress,
} from "../../lib/admin/customers-utils";

const EST_STATUS = {
  accepted: "bg-emerald-50 text-emerald-700",
  sent: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  requested: "bg-neutral-100 text-neutral-600",
};

const INV_STATUS = {
  paid: "bg-emerald-50 text-emerald-700",
  sent: "bg-blue-50 text-blue-700",
  overdue: "bg-red-50 text-red-700",
  draft: "bg-neutral-100 text-neutral-600",
};

function statusCls(map, status) {
  const key = (status || "").toLowerCase();
  return map[key] || "bg-neutral-100 text-neutral-600";
}

function fmtMoney(n, currency = DEFAULT_CURRENCY) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${currency} ${num.toFixed(2)}`;
}

function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Right-hand customer detail drawer (GHL contact + recent activity).
 */
export function CustomerDetailPanel({
  contact,
  locationId,
  onClose,
  onDelete,
  onInvite,
  inviting,
  canDestructive,
}) {
  if (!contact) return null;

  const ghlUrl =
    locationId && contact.id
      ? `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contact.id}`
      : null;

  const address = formatContactAddress(contact);
  const canInvite =
    contact.status === "no_account" || contact.status === "needs_invite";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 lg:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={[
                "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
                getAvatarColorClass(contact.id),
              ].join(" ")}
            >
              {getContactInitials(contact)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-neutral-900">
                {contact.displayName}
              </h2>
              {contact.hasPortal && (
                <span className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Portal user
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-neutral-200 px-5 py-3">
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-400"
          >
            <User className="h-4 w-4" />
            View profile
          </button>
          {canInvite && (
            <button
              type="button"
              onClick={() => onInvite(contact.id)}
              disabled={inviting?.[contact.id]}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {inviting?.[contact.id] ? "Sending…" : "Send invite"}
            </button>
          )}
          {canDestructive && (
            <button
              type="button"
              onClick={() => onDelete(contact)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="space-y-3 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Contact details
            </h3>
            <dl className="space-y-2.5">
              <div>
                <dt className="text-xs text-neutral-400">Contact ID</dt>
                <dd className="font-mono text-xs text-neutral-700">{contact.id}</dd>
              </div>
              {contact.email && (
                <div>
                  <dt className="text-xs text-neutral-400">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-neutral-900 hover:underline"
                    >
                      {contact.email}
                    </a>
                  </dd>
                </div>
              )}
              {contact.phone && (
                <div>
                  <dt className="text-xs text-neutral-400">Phone</dt>
                  <dd className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              )}
              {address && (
                <div>
                  <dt className="text-xs text-neutral-400">Address</dt>
                  <dd className="flex items-start gap-1.5 text-neutral-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    {address}
                  </dd>
                </div>
              )}
              {contact.locationId && (
                <div>
                  <dt className="text-xs text-neutral-400">Location ID</dt>
                  <dd className="font-mono text-xs text-neutral-700">{contact.locationId}</dd>
                </div>
              )}
            </dl>
          </section>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-neutral-900">
                {contact.estimateCount ?? 0}
              </p>
              <p className="text-xs text-neutral-500">Estimates</p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-neutral-900">
                {contact.invoiceCount ?? 0}
              </p>
              <p className="text-xs text-neutral-500">Invoices</p>
            </div>
          </div>

          {(contact.recentEstimates?.length ?? 0) > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Recent estimates
              </h3>
              <ul className="space-y-2">
                {contact.recentEstimates.map((est) => (
                  <li
                    key={est.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/estimates?estimateId=${est.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {formatEstimateNumber(est.estimateNumber, { fallbackId: est.id }) || est.id}
                      </Link>
                      <p className="text-xs text-neutral-400">{fmtDate(est.updatedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {fmtMoney(est.total, est.currency)}
                      </p>
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          statusCls(EST_STATUS, est.workflowStatus || est.portalStatus),
                        ].join(" ")}
                      >
                        {est.workflowStatus || est.portalStatus || "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(contact.recentInvoices?.length ?? 0) > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Recent invoices
              </h3>
              <ul className="space-y-2">
                {contact.recentInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/invoices?invoiceId=${inv.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {inv.invoiceNumber || inv.id}
                      </Link>
                      <p className="text-xs text-neutral-400">{fmtDate(inv.updatedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {fmtMoney(inv.total, inv.currency)}
                      </p>
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          statusCls(INV_STATUS, inv.ghlStatus || inv.portalStatus),
                        ].join(" ")}
                      >
                        {inv.ghlStatus || inv.portalStatus || "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {ghlUrl && (
          <div className="border-t border-neutral-200 px-5 py-4">
            <a
              href={ghlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900"
            >
              <ExternalLink className="h-4 w-4" />
              Open in GoHighLevel
            </a>
          </div>
        )}
      </aside>
    </>
  );
}

CustomerDetailPanel.displayName = "CustomerDetailPanel";
