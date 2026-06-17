import { useState, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { useAdminInvoice, useSendInvoice, useSyncPaymentToXero, useXeroStatus, useDeleteInvoice } from "../../lib/react-query/hooks/admin";
import { useEstimatePhotos } from "../../lib/react-query/hooks/use-estimate-photos";
import { PhotoGallery } from "./PhotoGallery";
import { DeleteDialog } from "./DeleteDialog";
import { DEFAULT_CURRENCY } from "../../lib/admin/constants";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Trash2, ExternalLink } from "lucide-react";

// Memoized table row component for performance
const InvoiceTableRow = memo(function InvoiceTableRow({ 
  item, 
  idx, 
  photoCount, 
  isSelected, 
  currency, 
  onSelect 
}) {
  const itemName = item.name || "Item";
  const rowClassName = useMemo(() => 
    `cursor-pointer transition-colors ${isSelected ? "bg-info-bg ring-2 ring-info/50" : "hover:bg-muted/30"}`,
    [isSelected]
  );

  const handleClick = useCallback(() => {
    onSelect(item.id || item.name || idx);
  }, [onSelect, item.id, item.name, idx]);

  return (
    <tr
      onClick={handleClick}
      className={rowClassName}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="font-medium text-foreground">{itemName}</div>
            {item.description && (
              <div className="text-xs text-muted-foreground">{item.description}</div>
            )}
          </div>
          {photoCount > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-xs text-info">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{photoCount}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm text-foreground">{item.qty || item.quantity || 1}</td>
      <td className="px-4 py-3 text-right text-sm text-foreground">
        {currency} {(Number(item.amount) || 0).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
        {currency} {((Number(item.amount) || 0) * (Number(item.qty || item.quantity) || 1)).toFixed(2)}
      </td>
    </tr>
  );
});
InvoiceTableRow.displayName = 'InvoiceTableRow';

// Memoized payment item component for performance
const PaymentItem = memo(function PaymentItem({ 
  payment, 
  idx, 
  currency 
}) {
  const paymentDate = payment.date || payment.paidAt;
  const isRefunded = payment.refunded === true;
  
  const paymentProvider = useMemo(() => {
    return payment.provider || payment.method || 'Unknown';
  }, [payment.provider, payment.method]);
  
  const cardClassName = useMemo(() => 
    `rounded-lg border p-5 transition-colors shadow-sm ${
      isRefunded 
        ? 'border-error/40 bg-error-bg/30' 
        : 'border-border/60 bg-muted/20'
    }`,
    [isRefunded]
  );

  const formattedDate = useMemo(() => {
    if (!paymentDate) return null;
    const date = new Date(paymentDate);
    if (isNaN(date.getTime())) return null; // Invalid date
    return date.toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [paymentDate]);

  const formattedRefundDate = useMemo(() => {
    if (!payment.refundedAt) return null;
    const date = new Date(payment.refundedAt);
    if (isNaN(date.getTime())) return null; // Invalid date
    return date.toLocaleDateString();
  }, [payment.refundedAt]);

  return (
    <div className={cardClassName}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {currency} {payment.amount?.toFixed(2) || "0.00"}
            </p>
            {isRefunded && (
              <Badge variant="destructive" className="text-xs">
                Refunded
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="capitalize">{paymentProvider}</span>
            {formattedDate && <span>{formattedDate}</span>}
            {payment.transactionId && (
              <span className="font-mono text-xs">
                {payment.transactionId.length > 20 
                  ? `${payment.transactionId.substring(0, 20)}...` 
                  : payment.transactionId}
              </span>
            )}
          </div>
          {isRefunded && payment.refundAmount && (
            <p className="mt-1 text-xs text-error">
              Refunded: {currency} {payment.refundAmount?.toFixed(2) || "0.00"}
              {formattedRefundDate && (
                <span className="ml-2">
                  on {formattedRefundDate}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="ml-4">
          {isRefunded ? (
            <XCircle className="h-5 w-5 text-error" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-success" />
          )}
        </div>
      </div>
    </div>
  );
});
PaymentItem.displayName = 'PaymentItem';

export const InvoiceDetailContent = memo(function InvoiceDetailContent({ invoiceId, locationId }) {
  const { data, isLoading, error, refetch } = useAdminInvoice({
    invoiceId: invoiceId || null,
    locationId: locationId || undefined,
  });

  const sendInvoiceMutation = useSendInvoice();
  const syncPaymentToXeroMutation = useSyncPaymentToXero();
  const deleteInvoiceMutation = useDeleteInvoice();
  const { data: xeroStatus } = useXeroStatus();
  const isXeroConnected = xeroStatus?.ok && xeroStatus?.connected;

  const invoice = data?.ok ? data : null;
  const linkedEstimate = invoice?.linkedEstimate;
  const isXeroDirect = invoice?.invoiceSource === "xero_direct";
  
  // Row selection state
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteInvoiceDialogOpen, setDeleteInvoiceDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState('local');
  const [xeroPaymentTransactionId, setXeroPaymentTransactionId] = useState('');
  
  // Fetch photos from linked estimate (photos are stored against estimates, not invoices)
  // Always try to fetch - even if linkedEstimate is not yet available (it might load later)
  const estimateIdForPhotos = linkedEstimate?.id || invoice?.linkedEstimateId || null;
  const { data: photosData } = useEstimatePhotos({
    estimateId: estimateIdForPhotos || undefined,
    enabled: !!estimateIdForPhotos,
  });
  
  // Calculate photo counts per item
  const itemPhotoCounts = useMemo(() => {
    if (!photosData?.ok) return {};
    
    const counts = {};
    const uploads = photosData.stored?.uploads || [];
    
    uploads.forEach((upload) => {
      const itemName = upload.itemName || "Unknown";
      counts[itemName] = (counts[itemName] || 0) + 1;
    });
    
    return counts;
  }, [photosData]);

  // Extract invoice data (safe even if invoice is null)
  const contact = invoice?.contact || {};
  const items = invoice?.items || [];
  const payments = invoice?.payments || [];

  // Memoize date formatting (safe even if invoice is null)
  const issueDateFormatted = useMemo(() => {
    if (!invoice?.issueDate) return "N/A";
    const date = new Date(invoice.issueDate);
    if (isNaN(date.getTime())) return "N/A"; // Invalid date
    return date.toLocaleDateString();
  }, [invoice?.issueDate]);

  const dueDateFormatted = useMemo(() => {
    if (!invoice?.dueDate) return null;
    const date = new Date(invoice.dueDate);
    if (isNaN(date.getTime())) return null; // Invalid date
    return date.toLocaleDateString();
  }, [invoice?.dueDate]);

  const isOverdue = useMemo(() => {
    if (!invoice?.amountDue || invoice.amountDue === 0) return false;
    if (!invoice?.dueDate) return false;
    const dueDate = new Date(invoice.dueDate);
    if (isNaN(dueDate.getTime())) return false; // Invalid date
    return dueDate < new Date();
  }, [invoice?.amountDue, invoice?.dueDate]);

  // Memoize expensive total paid calculation (safe even if payments is empty)
  const totalPaid = useMemo(() => {
    return payments
      .filter(p => !p.refunded)
      .reduce((sum, p) => {
        const amount = Number(p.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
  }, [payments]);

  // Memoize row click handler - accepts item identifier for stable reference
  const handleRowClick = useCallback((itemIdentifier) => {
    setSelectedItem(prev => {
      // Find the item by identifier - handle both string (id/name) and number (index) identifiers
      let item = null;
      
      // First try to find by id or name
      item = items.find(i => 
        (i.id && i.id === itemIdentifier) || 
        (!i.id && i.name === itemIdentifier)
      );
      
      // If not found and identifier is a number, try array index access
      if (!item && typeof itemIdentifier === 'number' && itemIdentifier >= 0 && itemIdentifier < items.length) {
        item = items[itemIdentifier];
      }
      
      if (!item) return prev;
      
      // Toggle selection - if same item clicked, deselect
      if (prev && prev.id && item.id && prev.id === item.id) {
        return null;
      }
      if (prev && !prev.id && !item.id && prev.name === item.name) {
        return null;
      }
      return item;
    });
  }, [items]);

  const handleSendInvoice = async () => {
    try {
      await sendInvoiceMutation.mutateAsync({ invoiceId, locationId });
      toast.success("Invoice sent successfully");
      refetch();
    } catch (err) {
      // Show detailed error message
      const errorMessage = err.message || "Failed to send invoice";
      toast.error(errorMessage, {
        duration: 5000, // Show for 5 seconds
      });
      console.error("Send invoice error:", err);
    }
  };

  const handleSyncPaymentToXero = async () => {
    if (!isXeroConnected) {
      toast.error("Xero is not connected. Please connect Xero first in Settings > Integrations.");
      return;
    }

    try {
      const result = await syncPaymentToXeroMutation.mutateAsync({
        invoiceId,
        locationId,
        transactionId: xeroPaymentTransactionId.trim() || undefined,
      });
      if (result?.ok) {
        const syncedCount = result.syncedCount || 0;
        const hasErrors = Array.isArray(result.errors) && result.errors.length > 0;
        if (hasErrors) {
          toast.error(`Some payments failed to sync to Xero${syncedCount ? ` (${syncedCount} synced)` : ''}. Check logs for details.`);
        } else {
          toast.success(`Payment synced to Xero${syncedCount ? ` (${syncedCount})` : ''}`);
        }
        refetch();
      } else {
        throw new Error(result?.message || "Failed to sync payment to Xero");
      }
    } catch (err) {
      toast.error(err.message || "Failed to sync payment to Xero");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="rounded-md border border-error/50 bg-error-bg p-4 text-sm text-error">
        <p className="font-semibold">Error loading invoice</p>
        <p className="mt-1">{error?.message || "Invoice not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isXeroDirect && (
        <div
          className="rounded-lg border border-info/40 bg-info-bg px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <p className="font-semibold text-foreground">Xero-direct invoice</p>
          <p className="mt-1 text-muted-foreground">
            This receivable was created in Xero from the portal and is not stored in GoHighLevel.
            Customers pay via the customer portal. Sending the invoice through GHL is not available
            for this record.
          </p>
        </div>
      )}
      {/* Header */}
      <div className="rounded-xl border border-border/60 bg-card p-8 shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{invoice.title || "INVOICE"}</h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Invoice #{invoice.invoiceNumber || invoiceId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                invoice.portalStatus === "paid" ? "success" :
                invoice.portalStatus === "partial" ? "warning" :
                invoice.portalStatus === "accepted" ? "success" :
                invoice.portalStatus === "rejected" ? "destructive" :
                "warning"
              }
              className="text-xs font-semibold shadow-sm px-3 py-1"
            >
              {invoice.portalStatus === "partial" ? "Partially Paid" : (invoice.portalStatus || "sent")}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Customer</p>
            <p className="mt-2 font-semibold text-foreground">{contact.name || "N/A"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{contact.email || ""}</p>
            {contact.phone && (
              <p className="mt-1 text-sm text-muted-foreground">{contact.phone}</p>
            )}
          </div>
          <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Issue Date</p>
            <p className="mt-2 font-semibold text-foreground">
              {issueDateFormatted}
            </p>
            {dueDateFormatted && (
              <p className="mt-1 text-xs text-muted-foreground">
                Due: {dueDateFormatted}
              </p>
            )}
          </div>
          <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Invoice Total</p>
            <p className="mt-2 text-2xl font-bold text-foreground tracking-tight">
              {invoice.currency || DEFAULT_CURRENCY} {invoice.total?.toFixed(2) || "0.00"}
            </p>
            {payments.length > 0 && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
              </p>
            )}
          </div>
          <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Remaining Balance</p>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${
              (invoice.amountDue ?? 0) === 0 ? 'text-success' : 
              isOverdue ? 'text-error' :
              'text-warning'
            }`}>
              {invoice.currency || DEFAULT_CURRENCY} {invoice.amountDue?.toFixed(2) || "0.00"}
            </p>
            {(invoice.amountDue ?? 0) === 0 && (
              <p className="mt-2 text-xs font-semibold text-success">Fully paid</p>
            )}
            {isOverdue && (
              <p className="mt-2 text-xs font-semibold text-error">Overdue</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Line Items (Left 70%) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border/60 bg-card p-7 shadow-md">
            <h2 className="mb-6 text-xl font-bold text-foreground tracking-tight">Line Items</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Item</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((item, idx) => {
                      const itemName = item.name || "Item";
                      const photoCount = itemPhotoCounts[itemName] || 0;
                      const isSelected = selectedItem && (
                        (selectedItem.id && item.id && selectedItem.id === item.id) ||
                        (selectedItem.name === itemName && (!selectedItem.id || !item.id || selectedItem.id === item.id))
                      );
                      
                      return (
                        <InvoiceTableRow
                          key={item.id || `item-${idx}`}
                          item={item}
                          idx={idx}
                          photoCount={photoCount}
                          isSelected={isSelected}
                          currency={invoice.currency || DEFAULT_CURRENCY}
                          onSelect={handleRowClick}
                        />
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-border/60">
                    {((invoice.subtotal || 0) > 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-sm text-foreground">Subtotal</td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          {invoice.currency || DEFAULT_CURRENCY} {invoice.subtotal?.toFixed(2) || "0.00"}
                        </td>
                      </tr>
                    )}
                    {((invoice.tax || 0) > 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-sm text-foreground">Tax</td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          {invoice.currency || DEFAULT_CURRENCY} {invoice.tax?.toFixed(2) || "0.00"}
                        </td>
                      </tr>
                    )}
                    {((invoice.discount || 0) > 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-sm text-foreground">Discount</td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          -{invoice.currency || DEFAULT_CURRENCY} {invoice.discount?.toFixed(2) || "0.00"}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-foreground">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {invoice.currency || DEFAULT_CURRENCY} {invoice.total?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="rounded-xl border border-border/60 bg-card p-7 shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground tracking-tight">Payment History</h2>
              {payments.length > 0 && (
                <Badge variant="secondary" className="text-xs font-semibold shadow-sm px-3 py-1">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">No payments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, idx) => (
                  <PaymentItem
                    key={payment.id || payment.transactionId || idx}
                    payment={payment}
                    idx={idx}
                    currency={invoice.currency || DEFAULT_CURRENCY}
                  />
                ))}
                {/* Payment Summary */}
                <div className="mt-6 rounded-xl border-2 border-border/60 bg-card p-6 shadow-sm">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Paid</p>
                      <p className="mt-2 text-xl font-bold text-success tracking-tight">
                        {invoice.currency || DEFAULT_CURRENCY} {totalPaid.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Remaining Balance</p>
                      <p className={`mt-2 text-xl font-bold tracking-tight ${
                        (invoice.amountDue ?? 0) === 0 ? 'text-success' : 'text-foreground'
                      }`}>
                        {invoice.currency || DEFAULT_CURRENCY} {invoice.amountDue?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Right 30%) */}
        <div className="space-y-6">
          {/* Linked Estimate */}
          {linkedEstimate && (
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-md">
              <h3 className="mb-4 text-sm font-bold text-foreground tracking-wide uppercase">Linked Estimate</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Number:</span>{" "}
                  <Link
                    href={`/admin/estimates/${linkedEstimate.id}`}
                    className="font-medium text-info hover:underline"
                  >
                    {linkedEstimate.estimateNumber || linkedEstimate.id}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {invoice.xeroInvoiceOnlineUrl && (
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-md">
              <h3 className="mb-3 text-sm font-bold text-foreground tracking-wide uppercase">Xero</h3>
              <a
                href={invoice.xeroInvoiceOnlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open this invoice in Xero (opens in a new tab)"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
              >
                <ExternalLink className="h-4 w-4 text-primary" aria-hidden />
                Open invoice in Xero
              </a>
              {invoice.xeroInvoiceNumber && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Xero #{invoice.xeroInvoiceNumber}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-md">
            <h3 className="mb-4 text-sm font-bold text-foreground tracking-wide uppercase">Actions</h3>
            <div className="space-y-3">
              <Button
                type="button"
                variant="default"
                className="h-auto min-h-11 w-full rounded-lg px-4 py-3 text-sm font-semibold shadow-sm hover:shadow-md"
                onClick={handleSendInvoice}
                disabled={sendInvoiceMutation.isPending || isXeroDirect}
                title={isXeroDirect ? "Not available for Xero-direct invoices" : undefined}
              >
                {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}
              </Button>
              
              {/* Xero Payment Sync */}
              <div className="pt-4 border-t-2 border-border/60">
                <input
                  type="text"
                  value={xeroPaymentTransactionId}
                  onChange={(e) => setXeroPaymentTransactionId(e.target.value)}
                  placeholder="Optional: transaction ID (pi_...)"
                  className="w-full rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
                />
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  Use a Stripe payment ID (starts with <span className="font-mono font-semibold">pi_</span>) to sync one payment.
                </p>
                <button
                  onClick={handleSyncPaymentToXero}
                  disabled={syncPaymentToXeroMutation.isPending || !isXeroConnected}
                  className="mt-3 w-full rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground transition-colors duration-200 shadow-sm hover:shadow-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncPaymentToXeroMutation.isPending ? "Syncing Payment..." : "Sync Payment to Xero"}
                </button>
                {!isXeroConnected && (
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    <Link href="/admin/integrations" className="text-primary hover:underline">
                      Connect Xero
                    </Link> to sync payments
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-border/60">
                <button
                  onClick={() => setDeleteInvoiceDialogOpen(true)}
                  className="w-full rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>

          {/* Photos Gallery - always show, even if no linked estimate yet */}
          <PhotoGallery
            estimateId={estimateIdForPhotos}
            items={items}
            selectedItem={selectedItem}
          />
        </div>
      </div>

      {/* Delete Invoice Dialog */}
      <DeleteDialog
        open={deleteInvoiceDialogOpen}
        onOpenChange={setDeleteInvoiceDialogOpen}
        onConfirm={async () => {
          try {
            await deleteInvoiceMutation.mutateAsync({
              invoiceId,
              locationId: locationId || invoice?.locationId,
              scope: deleteScope,
            });
          } catch (err) {
            // Error already handled in mutation
          }
        }}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice #${invoice?.invoiceNumber || invoiceId}? This action cannot be undone.`}
        itemName={`invoice #${invoice?.invoiceNumber || invoiceId}`}
        isLoading={deleteInvoiceMutation.isPending}
        showScopeSelection={true}
        scope={deleteScope}
        onScopeChange={setDeleteScope}
      />
    </div>
  );
});
InvoiceDetailContent.displayName = 'InvoiceDetailContent';

