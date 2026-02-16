import { ArrowRight, Camera, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, memo } from "react";
import { Button } from "../../ui/button";
import Link from "next/link";
import { DEFAULT_CURRENCY } from "../../../lib/admin/constants";
import { RevisionBanner } from "../sections/RevisionBanner";
import { RevisionHistory } from "../sections/RevisionHistory";
import { WorkflowProgress } from "../sections/WorkflowProgress";
import { BookingCard } from "../sections/BookingCard";
import { PaymentCard } from "../sections/PaymentCard";
import InstallationStatus from "../sections/InstallationStatus";
import { getVisibleCard } from "../utils/payment-visibility";

export const OverviewView = memo(function OverviewView({ 
  estimate, 
  estimates = [], 
  currentEstimateIndex = 0,
  onNextEstimate,
  onPrevEstimate,
  onUploadImages, 
  onViewDetails, 
  onViewAll,
  view,
  estimateId
}) {
  const [mounted, setMounted] = useState(false);

   
  useEffect(() => {
    setMounted(true);
  }, []);

  // Empty state: no mounted branching needed -- static content is identical on server and client
  if (!estimate) {
    return (
      <div className="rounded-xl border-2 border-border bg-surface p-6 shadow-lg text-center">
        <h1 className="text-3xl font-semibold text-foreground">Welcome to Your Portal</h1>
        <p className="mt-2 text-muted-foreground">Request a quote to get started.</p>
      </div>
    );
  }

  const hasPhotos = (estimate.photosCount || 0) > 0;
  // Use statusValue (portal status: sent/accepted/rejected) not display status
  const statusValue = estimate.statusValue || estimate.status || "sent";
  const needsPhotos = !hasPhotos && statusValue !== "accepted";

  // Calculate totals
  const subtotal = estimate.subtotal || 0;
  const taxTotal = estimate.taxTotal || 0;
  const total = estimate.total || subtotal + taxTotal;

  // Format currency consistently - use toFixed for SSR, toLocaleString after mount
  // This ensures server and client render the same initial value
  const formatCurrency = (amount) => {
    if (mounted) {
      return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Revision Banner (if estimate was revised) */}
      {(estimate.revision || view?.revisionHistory?.length > 0) && (
        <RevisionBanner 
          revision={estimate.revision}
          revisionHistory={view?.revisionHistory}
          currency={estimate.currency || DEFAULT_CURRENCY}
          portalStatus={statusValue}
        />
      )}

      {/* Full Revision History (show after any edit) */}
      {view?.revisionHistory?.length >= 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RevisionHistory
            revisionHistory={view.revisionHistory}
            currency={estimate.currency || DEFAULT_CURRENCY}
          />
        </div>
      )}

      {/* Workflow Progress */}
      {view?.workflow && (
        <WorkflowProgress 
          workflow={view.workflow} 
          payment={view?.payment}
          invoice={view?.invoice}
        />
      )}

      {/* Booking/Payment Cards - Compact versions for overview */}
      {getVisibleCard(view, estimateId) === 'payment' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <PaymentCard
            estimateId={estimateId}
            locationId={view?.locationId}
            inviteToken={view?.account?.inviteToken}
            payment={view?.payment}
            workflow={view?.workflow}
            invoice={view?.invoice}
            minimumPaymentInfo={view?.minimumPaymentInfo}
          />
        </div>
      )}
      {getVisibleCard(view, estimateId) === 'booking' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <BookingCard
            estimateId={estimateId}
            locationId={view?.locationId}
            inviteToken={view?.account?.inviteToken}
            booking={view?.booking}
            workflow={view?.workflow}
          />
        </div>
      )}

      {/* Installation Status (ServiceM8 Job Status) - Show when estimate is accepted */}
      {view?.workflow?.status === 'accepted' && estimateId && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <InstallationStatus estimateId={estimateId} />
        </div>
      )}

      {/* Hero Section */}
      <div className="rounded-xl border-2 border-border bg-surface p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Your Estimate</p>
            <h1 className="mt-2 text-4xl font-semibold text-foreground">
              {estimate.label || `Estimate #${estimate.number || estimate.estimateId}`}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {estimate.address || estimate.meta?.address || "Site address pending"}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <span className="text-sm font-semibold text-primary">{estimate.statusLabel || estimate.status}</span>
            </div>
          </div>
          
          {/* Estimate Switcher - Show when multiple estimates available */}
          <div className="flex flex-col items-end gap-3">
            {estimates.length > 1 && onNextEstimate && onPrevEstimate && (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 shadow-sm">
                <Button
                  type="button"
                  onClick={onPrevEstimate}
                  disabled={currentEstimateIndex === 0}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous estimate"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm font-medium text-foreground min-w-[60px] text-center">
                  {currentEstimateIndex + 1} of {estimates.length}
                </span>
                <Button
                  type="button"
                  onClick={onNextEstimate}
                  disabled={currentEstimateIndex >= estimates.length - 1}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next estimate"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            {onViewAll && (
              <Link href="/portal?section=estimates">
                <Button variant="outline" size="sm">
                  View All Estimates <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Photo Upload Callout */}
        {needsPhotos && (
          <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/20 p-3">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Upload Photos for Accurate Pricing</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team needs photos of your property to provide you with the most accurate pricing. The current
                  estimate is preliminary and may change once we review your photos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Section */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              {needsPhotos ? "Estimated Total" : "Estimate Total"}
            </p>
            <p className="mt-2 text-4xl font-semibold text-foreground" suppressHydrationWarning>
              {formatCurrency(total)}
            </p>
            {needsPhotos && (
              <p className="mt-1 text-xs text-muted-foreground">Preliminary pricing • Updates after photo review</p>
            )}
            {hasPhotos && (
              <p className="mt-1 text-xs text-success">✓ Photos uploaded • Final pricing</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Breakdown</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground" suppressHydrationWarning>
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-semibold text-foreground" suppressHydrationWarning>
                    {formatCurrency(taxTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product/Items List */}
        {estimate.items && estimate.items.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground">Products & Services</h3>
            <div className="mt-4 space-y-3">
              {estimate.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name || "Item"}</p>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.sku && (
                      <p className="mt-1 text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      Qty: {item.qty || item.quantity || 1}
                    </p>
                    {item.amount && (
                      <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
                        {formatCurrency(item.amount * (item.qty || item.quantity || 1))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          {needsPhotos && (
            <Button
              size="lg"
              onClick={onUploadImages}
              className="flex-1 bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30"
            >
              <Camera className="mr-2 h-5 w-5" />
              Upload Images
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={onViewDetails}
            className="flex-1 border-border"
          >
            View Full Details <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

