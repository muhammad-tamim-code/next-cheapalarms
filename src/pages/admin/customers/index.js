import Head from "next/head";
import Link from "next/link";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  MoreVertical,
  ExternalLink,
  Trash2,
  Mail,
  RefreshCw,
} from "lucide-react";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { hasPermission } from "../../../lib/auth/hasPermission";
import { useCustomersListState } from "../../../lib/admin/useCustomersListState";
import { CustomerDetailPanel } from "../../../components/admin/CustomerDetailPanel";
import { NewContactModal } from "../../../components/admin/NewContactModal";
import { DeleteDialog } from "../../../components/admin/DeleteDialog";
import {
  CUSTOMER_FILTER_TABS,
  getAvatarColorClass,
  getContactInitials,
  pageNumbers,
} from "../../../lib/admin/customers-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

/* Customers — GHL contacts enriched with WP accounts + estimate/invoice activity. */

export default function AdminCustomers({ authContext }) {
  const canDestructive = hasPermission(authContext, "data.destructive");
  const s = useCustomersListState();

  const {
    q,
    handleSearchChange,
    activeTab,
    setActiveTab,
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    pageCustomers,
    stats,
    counts,
    loading,
    errMsg,
    refetchContacts,
    handleRefresh,
    selectedContact,
    handleRowClick,
    handleClosePanel,
    handleExport,
    inviting,
    handleInvite,
    deleteDialogOpen,
    setDeleteDialogOpen,
    contactToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    deleteGhlContactMutation,
    newContactOpen,
    setNewContactOpen,
    handleCreateContact,
    locationId,
  } = s;

  const tabs = CUSTOMER_FILTER_TABS.map((t) => ({
    ...t,
    count: counts[t.value] ?? 0,
  }));

  const statCards = [
    { label: "Total customers", value: stats.total, hint: "All GHL contacts" },
    {
      label: "Portal accounts",
      value: stats.portalCount,
      hint: stats.total > 0 ? `${stats.portalPct}% of customers` : "With portal access",
    },
    { label: "Linked estimates", value: stats.totalEstimates, hint: "Across all customers" },
    { label: "Linked invoices", value: stats.totalInvoices, hint: "Across all customers" },
  ];

  return (
    <>
      <Head>
        <title>Customers • Admin</title>
      </Head>
      <AdminLayout
        title="Customers"
        subtitle="Manage customer contacts from GoHighLevel"
        authContext={authContext}
      >
        <div className="space-y-5">
          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={q}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search customers…"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                <RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={loading || total === 0}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => setNewContactOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <Plus className="h-4 w-4" />
                New contact
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1 border-b border-neutral-200">
            {tabs.map((t) => {
              const active = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setActiveTab(t.value)}
                  className={[
                    "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition",
                    active
                      ? "border-neutral-900 text-neutral-900"
                      : "border-transparent text-neutral-500 hover:text-neutral-900",
                  ].join(" ")}
                >
                  {t.label}
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                      active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500",
                    ].join(" ")}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((st) => (
              <div
                key={st.label}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <p className="text-sm font-medium text-neutral-500">{st.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{st.value}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{st.hint}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {loading ? (
              <div className="px-4 py-16 text-center text-sm text-neutral-400">
                Loading customers…
              </div>
            ) : errMsg ? (
              <div className="px-4 py-12 text-center text-sm text-red-600">
                {errMsg}{" "}
                <button type="button" className="underline" onClick={() => refetchContacts()}>
                  Retry
                </button>
              </div>
            ) : pageCustomers.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <Users className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-3 text-sm font-medium text-neutral-700">No customers found</p>
                <p className="text-sm text-neutral-400">
                  {q ? "Try adjusting your search." : "Add a contact or sync from GoHighLevel."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Location ID</th>
                      <th className="px-4 py-3 text-center">Estimates</th>
                      <th className="px-4 py-3 text-center">Invoices</th>
                      <th className="w-12 px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pageCustomers.map((contact) => {
                      const selected = selectedContact?.id === contact.id;
                      const ghlUrl =
                        locationId && contact.id
                          ? `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contact.id}`
                          : null;
                      const canInvite =
                        contact.status === "no_account" || contact.status === "needs_invite";

                      return (
                        <tr
                          key={contact.id}
                          onClick={() => handleRowClick(contact.id)}
                          className={[
                            "cursor-pointer transition hover:bg-neutral-50",
                            selected ? "bg-neutral-50" : "",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={[
                                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
                                  getAvatarColorClass(contact.id),
                                ].join(" ")}
                              >
                                {getContactInitials(contact)}
                              </div>
                              <div>
                                <div className="font-medium text-neutral-900">
                                  {contact.displayName}
                                </div>
                                {contact.hasPortal && (
                                  <span className="text-xs text-emerald-600">Portal user</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-neutral-700">{contact.email || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                            {contact.phone || "—"}
                          </td>
                          <td className="max-w-[8rem] truncate px-4 py-3 font-mono text-xs text-neutral-500">
                            {contact.locationId || "—"}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums font-medium text-neutral-800">
                            {contact.estimateCount ?? 0}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums font-medium text-neutral-800">
                            {contact.invoiceCount ?? 0}
                          </td>
                          <td
                            className="px-4 py-3 text-right"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                                  aria-label="Actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleRowClick(contact.id)}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/admin/quotes?email=${encodeURIComponent(contact.email || "")}&firstName=${encodeURIComponent(contact.firstName || "")}&lastName=${encodeURIComponent(contact.lastName || "")}`}
                                  >
                                    New quote
                                  </Link>
                                </DropdownMenuItem>
                                {canInvite && (
                                  <DropdownMenuItem
                                    disabled={inviting[contact.id]}
                                    onSelect={() => handleInvite(contact.id)}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send invite
                                  </DropdownMenuItem>
                                )}
                                {ghlUrl && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={() => window.open(ghlUrl, "_blank", "noopener")}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Open in GHL
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canDestructive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onSelect={() => handleDeleteClick(contact)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !errMsg && pageCustomers.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 text-sm sm:flex-row">
                <p className="text-neutral-500">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
                  {total} results
                </p>
                <div className="flex items-center gap-1">
                  <PageBtn
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </PageBtn>
                  {pageNumbers(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-neutral-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={[
                          "h-8 min-w-8 rounded-lg px-2 text-sm font-medium",
                          p === page
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-600 hover:bg-neutral-100",
                        ].join(" ")}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <PageBtn
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PageBtn>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedContact && (
          <CustomerDetailPanel
            contact={selectedContact}
            locationId={locationId}
            onClose={handleClosePanel}
            onDelete={handleDeleteClick}
            onInvite={handleInvite}
            inviting={inviting}
            canDestructive={canDestructive}
          />
        )}

        <NewContactModal
          open={newContactOpen}
          onClose={() => setNewContactOpen(false)}
          onSubmit={handleCreateContact}
        />

        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete GHL Contact"
          description={
            contactToDelete
              ? `Delete ${contactToDelete.displayName || contactToDelete.email} from GoHighLevel? This cannot be undone.`
              : ""
          }
          itemName={
            contactToDelete
              ? contactToDelete.displayName || contactToDelete.email || contactToDelete.id
              : ""
          }
          isLoading={deleteGhlContactMutation.isPending}
          showScopeSelection={false}
        />
      </AdminLayout>
    </>
  );
}

function PageBtn({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) return authCheck;
  return { props: { ...(authCheck.props || {}) } };
}
