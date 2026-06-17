import Head from "next/head";
import { Settings } from "lucide-react";
import { Button } from "../../../components/ui/button";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { Spinner } from "../../../components/ui/spinner";
import { SummaryCard } from "../../../components/admin/SummaryCard";
import { StatusTabs } from "../../../components/admin/StatusTabs";
import { Avatar } from "../../../components/admin/Avatar";
import { SearchBar } from "../../../components/admin/SearchBar";
import { DeleteDialog } from "../../../components/admin/DeleteDialog";
import { BulkDeleteDialog } from "../../../components/admin/BulkDeleteDialog";
import { FloatingActionBar } from "../../../components/admin/FloatingActionBar";
import { InvoiceDetailModal } from "../../../components/admin/InvoiceDetailModal";
import { Checkbox } from "../../../components/ui/checkbox";
import Link from "next/link";
import { useInvoicesListState } from "../../../lib/admin/useInvoicesListState";
import { useAdminPlatform } from "../../../lib/react-query/hooks/admin";

export default function InvoicesListPage({ authContext }) {
  const {
    invoices,
    total,
    totalPages,
    pageSize,
    isLoading,
    error,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    page,
    setPage,
    locationId,
    selectedIds,
    setSelectedIds,
    handleSelectAll,
    handleSelectItem,
    selectedInvoiceId,
    handleRowClick,
    handleCloseModal,
    deleteDialogOpen,
    setDeleteDialogOpen,
    invoiceToDelete,
    deleteScope,
    setDeleteScope,
    handleDeleteClick,
    handleDeleteConfirm,
    deleteInvoiceMutation,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    bulkDeleteScope,
    setBulkDeleteScope,
    handleBulkDelete,
    bulkDeleteMutation,
    summaryMetrics,
    getStatusBadgeClass,
    formatStatusLabel,
    statusTabs,
    DEFAULT_CURRENCY,
  } = useInvoicesListState();

  const { data: platformData } = useAdminPlatform();

  return (
    <>
      <Head>
        <title>Invoices • Admin</title>
      </Head>
      <AdminLayout title="Invoices" authContext={authContext}>
        <div className="space-y-8">
          {platformData?.xeroDirectInvoicingEnabled && (
            <div
              className="rounded-lg border border-warning/40 bg-warning-bg px-4 py-3 text-sm text-foreground"
              role="status"
            >
              <p className="font-semibold text-foreground">Xero-direct invoicing is on</p>
              <p className="mt-1 text-muted-foreground">
                New portal invoices can be created in Xero without a GoHighLevel invoice. Use{" "}
                <Link href="/admin/integrations" className="text-primary font-medium hover:underline">
                  Integrations
                </Link>{" "}
                for Xero connection status. Open an invoice to use &quot;Open invoice in Xero&quot; when linked.
              </p>
            </div>
          )}
          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                Invoices
              </h1>
              <p className="mt-2 text-base text-muted-foreground font-medium">
                Manage all invoices for your business
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="shadow-sm hover:shadow-md transition-all"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <SummaryCard
              label={`${summaryMetrics.sent.count} sent`}
              value={summaryMetrics.sent.total}
              currency={DEFAULT_CURRENCY}
              variant="sent"
            />
            <SummaryCard
              label={`${summaryMetrics.paid.count} paid`}
              value={summaryMetrics.paid.total}
              currency={DEFAULT_CURRENCY}
              variant="accepted"
            />
            <SummaryCard
              label={`${summaryMetrics.partiallyPaid.count} partially paid`}
              value={summaryMetrics.partiallyPaid.total}
              currency={DEFAULT_CURRENCY}
              variant="default"
            />
            <SummaryCard
              label={`${summaryMetrics.overdue.count} overdue`}
              value={summaryMetrics.overdue.total}
              currency={DEFAULT_CURRENCY}
              variant="declined"
            />
          </div>

          {/* Status Tabs */}
          <StatusTabs
            tabs={statusTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Search Bar */}
          <SearchBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by invoice number, email..."
          />

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-error/30 bg-error-bg p-4 text-sm text-error">
              <p className="font-semibold">Error loading invoices</p>
              <p className="mt-1">
                {error.message || "An unexpected error occurred"}
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-surface to-surface/95 p-16 text-center shadow-lg">
              <p className="text-muted-foreground font-medium">
                No invoices found
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {invoices.map((invoice) => {
                  const isSelected = selectedIds.has(invoice.id);
                  return (
                    <div
                      key={invoice.id}
                      onClick={() => handleRowClick(invoice.id)}
                      className={`bg-gradient-to-br from-surface to-surface/95 rounded-xl border border-border/60 p-5 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] ${isSelected ? "ring-2 ring-info/40 shadow-lg" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectItem(invoice.id, e.target.checked);
                            }}
                            aria-label={`Select invoice ${invoice.id}`}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-sm mb-1">
                              Invoice #{invoice.invoiceNumber || invoice.id}
                            </h3>
                          </div>
                        </div>
                        <span
                          className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${getStatusBadgeClass(invoice.portalStatus || invoice.ghlStatus || "sent")}
                          `}
                        >
                          {formatStatusLabel(
                            invoice.portalStatus || invoice.ghlStatus || "sent"
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Avatar
                          name={invoice.contactName}
                          email={invoice.contactEmail}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {invoice.contactName || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {invoice.contactEmail || ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {invoice.total > 0
                              ? `${invoice.currency || DEFAULT_CURRENCY} ${invoice.total.toFixed(2)}`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Amount Due
                          </p>
                          <p
                            className={`text-sm font-semibold ${
                              invoice.amountDue === 0
                                ? "text-success"
                                : "text-foreground"
                            }`}
                          >
                            {invoice.amountDue !== undefined
                              ? `${invoice.currency || DEFAULT_CURRENCY} ${invoice.amountDue.toFixed(2)}`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Created
                          </p>
                          <p className="text-sm text-foreground">
                            {invoice.createdAt
                              ? new Date(
                                  invoice.createdAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Updated
                          </p>
                          <p className="text-sm text-foreground">
                            {invoice.updatedAt
                              ? new Date(
                                  invoice.updatedAt
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-surface rounded-xl border border-border/60 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-b from-muted/80 to-muted/60 border-b-2 border-border/60">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <Checkbox
                            checked={
                              invoices.length > 0 &&
                              selectedIds.size === invoices.length
                            }
                            onChange={(e) =>
                              handleSelectAll(e.target.checked)
                            }
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Invoice #
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Total
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Amount Due
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Estimate
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Created
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border/40">
                      {invoices.map((invoice, index) => {
                        const isSelected = selectedIds.has(invoice.id);
                        const isEven = index % 2 === 0;
                        return (
                          <tr
                            key={invoice.id}
                            className={`
                            cursor-pointer transition-all duration-200 ease-standard
                            ${
                              isSelected
                                ? "bg-gradient-to-r from-info/10 via-primary/5 to-info/10 ring-2 ring-info/40 shadow-sm"
                                : isEven
                                  ? "bg-surface hover:bg-muted/30"
                                  : "bg-surface/50 hover:bg-muted/40"
                            }
                            hover:shadow-sm
                          `}
                            onClick={() => handleRowClick(invoice.id)}
                          >
                            <td
                              className="px-6 py-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) =>
                                  handleSelectItem(
                                    invoice.id,
                                    e.target.checked
                                  )
                                }
                                aria-label={`Select invoice ${invoice.id}`}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Button
                                variant="link"
                                className="font-medium text-sm text-left max-w-xs truncate block p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(invoice.id);
                                }}
                                title={`Invoice #${invoice.invoiceNumber || invoice.id}`}
                              >
                                {invoice.invoiceNumber || invoice.id}
                              </Button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  name={invoice.contactName}
                                  email={invoice.contactEmail}
                                  size="md"
                                />
                                <div>
                                  <div className="text-sm font-medium text-foreground">
                                    {invoice.contactName || "N/A"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.contactEmail || ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-foreground">
                              {invoice.currency || DEFAULT_CURRENCY}{" "}
                              {invoice.total?.toFixed(2) || "0.00"}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                                invoice.amountDue === 0
                                  ? "text-success"
                                  : "text-foreground"
                              }`}
                            >
                              {invoice.currency || DEFAULT_CURRENCY}{" "}
                              {invoice.amountDue?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`
                                inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm
                                ${getStatusBadgeClass(invoice.portalStatus || invoice.ghlStatus || "sent")}
                              `}
                              >
                                {formatStatusLabel(
                                  invoice.portalStatus ||
                                    invoice.ghlStatus ||
                                    "sent"
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {invoice.linkedEstimateId ? (
                                <Link
                                  href={`/admin/estimates/${invoice.linkedEstimateId}`}
                                  className="text-primary hover:text-primary-hover hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {invoice.createdAt
                                ? new Date(
                                    invoice.createdAt
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(
                                    invoice.id,
                                    invoice.locationId
                                  );
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-surface px-6 py-4 border-t border-border rounded-b-lg">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Floating Action Bar */}
          <FloatingActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            onDeleteSelected={() => setBulkDeleteDialogOpen(true)}
            isLoading={bulkDeleteMutation.isPending}
          />
        </div>

        {/* Bulk Delete Dialog */}
        <BulkDeleteDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          onConfirm={handleBulkDelete}
          itemCount={selectedIds.size}
          isLoading={bulkDeleteMutation.isPending}
          showScopeSelection={true}
          scope={bulkDeleteScope}
          onScopeChange={setBulkDeleteScope}
          itemType="Invoice"
          trashMode={false}
        />

        {/* Delete Dialog */}
        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Invoice"
          description={
            invoiceToDelete
              ? "This invoice will be permanently deleted. This action cannot be undone."
              : undefined
          }
          itemName={invoiceToDelete?.id}
          isLoading={deleteInvoiceMutation.isPending}
          showScopeSelection={true}
          scope={deleteScope}
          onScopeChange={setDeleteScope}
          trashMode={false}
        />

        {/* Invoice Detail Modal */}
        <InvoiceDetailModal
          isOpen={!!selectedInvoiceId}
          onClose={handleCloseModal}
          invoiceId={selectedInvoiceId || undefined}
          locationId={locationId || undefined}
        />
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }
  return { props: { ...(authCheck.props || {}) } };
}
