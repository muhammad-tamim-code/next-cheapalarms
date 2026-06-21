import Head from "next/head";
import Link from "next/link";
import { Search, Trash2, Plus, X, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { EstimateDetailModal } from "../../../components/admin/EstimateDetailModal";
import { DeleteDialog } from "../../../components/admin/DeleteDialog";
import { BulkDeleteDialog } from "../../../components/admin/BulkDeleteDialog";
import { EstimateActionsMenu } from "../../../components/admin/EstimateActionsMenu";
import { TrashView } from "../../../components/admin/TrashView";
import { useEstimatesListState } from "../../../lib/admin/useEstimatesListState";
import { DEFAULT_CURRENCY } from "../../../lib/admin/constants";

/* Estimates list — UI rebuilt neutral/business-agnostic on the EXISTING data
   layer (useEstimatesListState). Workflow status kept as-is. No backend change. */

// Workflow status → label + neutral-with-semantic badge. Legacy aliases normalised.
const WORKFLOW = {
  requested:       { label: "Requested",       cls: "bg-neutral-100 text-neutral-600" },
  sent:            { label: "Sent",            cls: "bg-blue-50 text-blue-700" },
  under_review:    { label: "Under review",    cls: "bg-amber-50 text-amber-700" },
  ready_to_accept: { label: "Ready to accept", cls: "bg-indigo-50 text-indigo-700" },
  accepted:        { label: "Accepted",        cls: "bg-emerald-50 text-emerald-700" },
  rejected:        { label: "Rejected",        cls: "bg-red-50 text-red-700" },
  booked:          { label: "Booked",          cls: "bg-violet-50 text-violet-700" },
  paid:            { label: "Paid",            cls: "bg-emerald-50 text-emerald-700" },
  completed:       { label: "Completed",       cls: "bg-emerald-50 text-emerald-700" },
};
const WF_ALIAS = { reviewing: "under_review", reviewed: "ready_to_accept" };
function wf(status) {
  const key = WF_ALIAS[status] || status || "requested";
  return WORKFLOW[key] || { label: key, cls: "bg-neutral-100 text-neutral-600" };
}
// Order for the filter dropdown (the full internal workflow).
const WORKFLOW_ORDER = [
  "requested", "sent", "under_review", "ready_to_accept",
  "accepted", "rejected", "booked", "paid", "completed",
];

export default function EstimatesListPage({ authContext }) {
  const s = useEstimatesListState();
  const {
    search, activeTab, setActiveTab, workflowStatusFilter, page, setPage, locationId,
    pageSize, selectedIds, setSelectedIds, data, isLoading, error,
    trashData, trashLoading, trashError, refetchTrash, estimates, total, totalPages,
    summaryMetrics, trashCount, selectedEstimateId,
    deleteDialogOpen, setDeleteDialogOpen, estimateToDelete, deleteScope, setDeleteScope,
    bulkDeleteDialogOpen, setBulkDeleteDialogOpen, bulkDeleteScope, setBulkDeleteScope,
    handleSearchChange, handleWorkflowStatusChange, handleSelectAll, handleSelectItem,
    handleBulkDelete, handleRowClick, handleCloseModal, handleInvoiceCreated,
    handleDeleteClick, handleDeleteConfirm, handleViewDetails, handleExportCSV,
    deleteEstimateMutation, bulkDeleteMutation,
  } = s;

  const inTrash = activeTab === "trash";

  // Tab counts — all from real data (backend summary + list total + trash count).
  const tabs = [
    { value: "all",      label: "All",      count: total },
    { value: "sent",     label: "Sent",     count: summaryMetrics.sent.count },
    { value: "accepted", label: "Accepted", count: summaryMetrics.accepted.count },
    { value: "rejected", label: "Rejected", count: summaryMetrics.declined.count },
    { value: "invoiced", label: "Invoiced", count: summaryMetrics.invoiced.count },
  ];

  const stats = [
    { label: "Total estimates", value: total, hint: "All estimates" },
    { label: "Sent",            value: summaryMetrics.sent.count, hint: "Awaiting response" },
    { label: "Accepted",        value: summaryMetrics.accepted.count, hint: "Ready for installation" },
    { label: "In trash",        value: trashCount, hint: "View trash", onClick: () => setActiveTab("trash") },
  ];

  const allSelected = estimates.length > 0 && selectedIds.size === estimates.length;
  const fmtMoney = (n, c) => (n > 0 ? `${c || DEFAULT_CURRENCY} ${Number(n).toFixed(2)}` : "—");
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <>
      <Head><title>Estimates • Admin</title></Head>
      <AdminLayout title="Estimates" subtitle="Manage customer quotes and approvals" authContext={authContext}>
        <div className="space-y-5">
          {/* Controls row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search estimates…"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>
            <select
              value={workflowStatusFilter}
              onChange={(e) => handleWorkflowStatusChange(e.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-neutral-400"
            >
              <option value="">All statuses</option>
              {WORKFLOW_ORDER.map((k) => (
                <option key={k} value={k}>{WORKFLOW[k].label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                onClick={handleExportCSV}
                disabled={!data?.items?.length || isLoading}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Export
              </button>
              <button
                onClick={() => setActiveTab(inTrash ? "all" : "trash")}
                className={["flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                  inTrash ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"].join(" ")}
              >
                <Trash2 className="h-4 w-4" /> Trash{trashCount > 0 ? ` (${trashCount})` : ""}
              </button>
              <Link href="/admin/quotes/new" className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                <Plus className="h-4 w-4" /> New estimate
              </Link>
            </div>
          </div>

          {/* Status tabs (hidden in trash) */}
          {!inTrash && (
            <div className="flex flex-wrap gap-1 border-b border-neutral-200">
              {tabs.map((t) => {
                const active = activeTab === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setActiveTab(t.value)}
                    className={["flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition",
                      active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"].join(" ")}
                  >
                    {t.label}
                    <span className={["rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                      active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"].join(" ")}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stat cards */}
          {!inTrash && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((st) => (
                <div
                  key={st.label}
                  onClick={st.onClick}
                  className={["rounded-xl border border-neutral-200 bg-white p-4", st.onClick ? "cursor-pointer hover:border-neutral-300" : ""].join(" ")}
                >
                  <p className="text-sm font-medium text-neutral-500">{st.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{st.value}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{st.hint}</p>
                </div>
              ))}
            </div>
          )}

          {/* Trash view (reuses existing component) */}
          {inTrash ? (
            <TrashView
              items={trashData?.items || []}
              isLoading={trashLoading}
              error={trashError}
              onRetry={refetchTrash}
              onViewDetails={handleViewDetails}
              locationId={locationId}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {/* Bulk selection bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm">
                  <span className="font-medium">{selectedIds.size} selected</span>
                  <button onClick={() => setBulkDeleteDialogOpen(true)} className="flex items-center gap-1.5 font-medium text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900">
                    <X className="h-4 w-4" /> Clear selection
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="px-4 py-16 text-center text-sm text-neutral-400">Loading estimates…</div>
              ) : error ? (
                <div className="px-4 py-12 text-center text-sm text-red-600">
                  {error.message || "Failed to load estimates"}
                </div>
              ) : estimates.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <FileText className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-3 text-sm font-medium text-neutral-700">No estimates found</p>
                  <p className="text-sm text-neutral-400">{search || workflowStatusFilter ? "Try adjusting your filters." : "Create your first estimate."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                        <th className="w-10 px-4 py-3">
                          <input type="checkbox" className="h-4 w-4 accent-neutral-900" checked={allSelected} onChange={(e) => handleSelectAll(e.target.checked)} aria-label="Select all" />
                        </th>
                        <th className="px-4 py-3">Estimate</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3 text-right">Total (AUD)</th>
                        <th className="px-4 py-3">Updated</th>
                        <th className="w-12 px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {estimates.map((e) => {
                        const checked = selectedIds.has(e.id);
                        const w = wf(e.workflowStatus);
                        return (
                          <tr
                            key={e.id}
                            onClick={() => handleRowClick(e.id)}
                            className={["cursor-pointer transition hover:bg-neutral-50", checked ? "bg-neutral-50" : ""].join(" ")}
                          >
                            <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                              <input type="checkbox" className="h-4 w-4 accent-neutral-900" checked={checked} onChange={(ev) => handleSelectItem(e.id, ev.target.checked)} aria-label={`Select ${e.id}`} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-neutral-900">{e.estimateNumber || e.id}</div>
                              <div className="text-xs text-neutral-400">ID: {e.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-neutral-800">{e.contactName || "—"}</div>
                              <div className="text-xs text-neutral-400">{e.contactEmail || ""}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={["inline-flex rounded-full px-2 py-0.5 text-xs font-medium", w.cls].join(" ")}>{w.label}</span>
                                {e.linkedInvoiceId && <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">Invoiced</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-neutral-700">{e.title || "—"}</td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-900">{fmtMoney(e.total, e.currency)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{fmtDate(e.updatedAt || e.createdAt)}</td>
                            <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                              <EstimateActionsMenu
                                estimateId={e.id}
                                isInTrash={false}
                                onViewDetails={handleViewDetails}
                                onMoveToTrash={handleDeleteClick}
                                locationId={locationId || e.locationId}
                                linkedInvoiceId={e.linkedInvoiceId}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && !error && estimates.length > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm sm:flex-row">
                  <p className="text-neutral-500">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} results
                  </p>
                  <div className="flex items-center gap-1">
                    <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></PageBtn>
                    {pageNumbers(page, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span key={`e${i}`} className="px-2 text-neutral-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={["h-8 min-w-8 rounded-lg px-2 text-sm font-medium",
                            p === page ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"].join(" ")}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></PageBtn>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialogs + detail modal — unchanged wiring */}
        <BulkDeleteDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          onConfirm={handleBulkDelete}
          itemCount={selectedIds.size}
          isLoading={bulkDeleteMutation.isPending}
          showScopeSelection={true}
          scope={bulkDeleteScope}
          onScopeChange={setBulkDeleteScope}
          itemType="Estimate"
          trashMode={true}
        />
        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Move to Trash"
          description={estimateToDelete ? "This estimate will be moved to trash and can be restored within 30 days." : undefined}
          itemName={estimateToDelete?.id}
          isLoading={deleteEstimateMutation.isPending}
          showScopeSelection={true}
          scope={deleteScope}
          onScopeChange={setDeleteScope}
          trashMode={true}
        />
        <EstimateDetailModal
          isOpen={!!selectedEstimateId}
          onClose={handleCloseModal}
          estimateId={selectedEstimateId || undefined}
          locationId={locationId || undefined}
          onInvoiceCreated={handleInvoiceCreated}
        />
      </AdminLayout>
    </>
  );
}

function PageBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

// Compact page list with ellipses, e.g. 1 … 4 5 6 … 12
function pageNumbers(current, totalPages) {
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

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) return authCheck;
  return { props: { ...(authCheck.props || {}) } };
}
