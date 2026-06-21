import { ArrowRight, Camera, CheckCircle, ChevronDown, ChevronUp, FileText, Sparkles } from "lucide-react";
import { useState, useEffect, memo, useMemo } from "react";
import { Button } from "../../ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../ui/select";
import { Spinner } from "../../ui/spinner";
import { DEFAULT_CURRENCY } from "../../../lib/admin/constants";
import { getEstimateItemProductImage, proxyGhlImageUrl } from "../../../lib/admin/ghl-image";
import { computeUIState } from "../../../lib/portal/status-computer";
import { RevisionBanner } from "../sections/RevisionBanner";
import { ApprovalCard } from "../sections/ApprovalCard";
import { BookingCard } from "../sections/BookingCard";
import { PaymentCard } from "../sections/PaymentCard";
import { PaymentCardSkeleton } from "../sections/PaymentCardSkeleton";
import InstallationStatus from "../sections/InstallationStatus";
import { OverviewPhotoMissions } from "../overview/OverviewPhotoMissions";
import { getVisibleCard } from "../utils/payment-visibility";
import { formatAddress } from "../utils/portal-utils";

const PHOTO_FOCUS_STATUSES = new Set([
  "AWAITING_PHOTOS",
  "PHOTOS_UPLOADED",
  "CHANGES_REQUESTED",
  "ESTIMATE_SENT",
]);

export const OverviewView = memo(function OverviewView({
  estimate,
  estimates = [],
  currentEstimateIndex = 0,
  onSelectQuote,
  onUploadImages,
  onNavigateToPhotos,
  onViewDetails,
  onViewAll,
  view,
  estimateId,
  pendingPhotoCount = 0,
}) {
  const [mounted, setMounted] = useState(false);
  const [showQuoteDetails, setShowQuoteDetails] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const uiState = useMemo(() => computeUIState(view), [view]);
  const isLatestQuote = estimates.length > 0 && currentEstimateIndex === estimates.length - 1;
  const visibleCard = getVisibleCard(view, estimateId);
  const photoFocus = PHOTO_FOCUS_STATUSES.has(uiState.displayStatus) || uiState.canUploadPhotos;

  if (!estimate) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold text-foreground">Welcome to your portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Request a quote to get started.</p>
      </div>
    );
  }

  const subtotal = estimate.subtotal || 0;
  const taxTotal = estimate.taxTotal || 0;
  const total = estimate.total || subtotal + taxTotal;
  const lineItems = Array.isArray(estimate.items) ? estimate.items : [];
  const itemsLoading = Boolean(estimate.itemsLoading);
  const selectedEstimateId = estimate.estimateId || estimate.id || String(currentEstimateIndex);

  const formatCurrency = (amount) => {
    if (mounted) {
      return `AUD $${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `AUD $${amount.toFixed(2)}`;
  };

  const pendingPhotos = pendingPhotoCount > 0 ? pendingPhotoCount : (view?.photos?.missingCount ?? 0);

  const stickyLabel = uiState.canUploadPhotos
    ? "Upload photos"
    : uiState.canAccept
      ? "Accept quote"
      : uiState.canPay
        ? "Pay now"
        : null;

  const stickyAction = uiState.canUploadPhotos
    ? onUploadImages
    : uiState.canAccept || uiState.canPay
      ? onViewDetails
      : null;

  const stickyClass = uiState.canAccept
    ? "bg-success hover:bg-success/90"
    : uiState.canPay
      ? "bg-secondary hover:bg-secondary/90"
      : "";

  const renderWorkflowCards = () => {
    if (!estimateId) return null;

    if (visibleCard === "payment") {
      return (
        <PaymentCard
          estimateId={estimateId}
          locationId={view?.locationId}
          inviteToken={view?.account?.inviteToken}
          payment={view?.payment}
          workflow={view?.workflow}
          invoice={view?.invoice}
          minimumPaymentInfo={view?.minimumPaymentInfo}
        />
      );
    }

    if (visibleCard === "skeleton") {
      return <PaymentCardSkeleton />;
    }

    if (visibleCard === "booking") {
      return (
        <BookingCard
          estimateId={estimateId}
          locationId={view?.locationId}
          inviteToken={view?.account?.inviteToken}
          booking={view?.booking}
          workflow={view?.workflow}
        />
      );
    }

    if (visibleCard === null) {
      return (
        <ApprovalCard
          view={view}
          estimateId={estimateId}
          locationId={view?.locationId}
          onUploadPhotos={onNavigateToPhotos}
          variant="overview"
        />
      );
    }

    return null;
  };

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-24 md:max-w-none md:pb-6">
      {(estimate.revision || view?.revisionHistory?.length > 0) && (
        <RevisionBanner
          revision={estimate.revision}
          revisionHistory={view?.revisionHistory}
          currency={estimate.currency || DEFAULT_CURRENCY}
          portalStatus={estimate.statusValue || estimate.status}
        />
      )}

      {/* Quote selector dropdown */}
      {estimates.length >= 1 && onSelectQuote && (
        <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isLatestQuote ? "Latest quote" : `Quote ${currentEstimateIndex + 1} of ${estimates.length}`}
          </p>
          <Select
            value={String(selectedEstimateId)}
            onValueChange={(value) => onSelectQuote(value)}
          >
            <SelectTrigger className="h-auto w-full rounded-xl border-2 px-4 py-3">
              <SelectValue>
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-foreground">
                    {estimate.label || `Estimate #${estimate.number || selectedEstimateId}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatAddress(estimate.address || estimate.meta?.address) || "Site address pending"}
                  </p>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-full rounded-xl border-2 border-border p-0 shadow-2xl">
              {estimates.map((est, idx) => {
                const estId = est.estimateId || est.id;
                const isSelected = idx === currentEstimateIndex;

                return (
                  <SelectItem
                    key={estId}
                    value={String(estId)}
                    className={`h-auto rounded-none px-4 py-3 ${
                      isSelected
                        ? "border-l-4 border-primary bg-gradient-to-r from-primary/10 to-secondary/10"
                        : ""
                    }`}
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-semibold text-foreground">
                          {est.label || `Estimate #${est.number || estId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAddress(est.address || est.meta?.address) || "Site address pending"}
                        </p>
                      </div>
                      {isSelected ? <CheckCircle className="h-5 w-5 shrink-0 text-primary" /> : null}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {onViewAll && estimates.length > 1 ? (
            <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={onViewAll}>
              View all quotes
            </Button>
          ) : null}
        </div>
      )}

      {/* Hero card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Camera className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Quote {estimate.number || estimate.estimateId}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {formatAddress(estimate.address || estimate.meta?.address) || "Site address pending"}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {uiState.displayStatus.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <h1 className="mt-4 text-xl font-bold leading-snug text-foreground">
          {photoFocus ? "Please upload photos to proceed" : uiState.statusMessage}
        </h1>

        {photoFocus && (
          <p className="mt-2 text-sm text-muted-foreground">
            Upload clear photos of each install location — our team reviews them and{" "}
            <span className="font-medium text-foreground">you may qualify for a lower price</span> on your quote.
          </p>
        )}

        <div className="mt-4">
          <p className="text-2xl font-bold text-foreground" suppressHydrationWarning>
            {formatCurrency(total)}
          </p>
          {photoFocus && (
            <p className="mt-1 text-xs text-muted-foreground">
              Preliminary total — final pricing is confirmed after photo review
            </p>
          )}
        </div>
      </div>

      {/* Missing photos alert */}
      {photoFocus && pendingPhotos > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-bg px-4 py-3">
          <span className="mt-0.5 text-warning">⚠</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {pendingPhotos} photo{pendingPhotos === 1 ? "" : "s"} still missing
            </p>
            <p className="text-xs text-muted-foreground">We need these before we can review your quote.</p>
          </div>
          {onNavigateToPhotos && (
            <button type="button" onClick={onNavigateToPhotos} className="shrink-0 text-xs font-semibold text-primary">
              View details
            </button>
          )}
        </div>
      )}

      {/* Photo missions */}
      {photoFocus && estimateId && (
        <OverviewPhotoMissions
          estimateId={estimateId}
          locationId={view?.locationId}
          view={view}
          onOpenPhotosTab={onNavigateToPhotos}
        />
      )}

      {/* Approval / payment / booking — hidden during photo-upload focus to avoid duplicate CTAs */}
      {!photoFocus && (
        <div suppressHydrationWarning>{mounted ? renderWorkflowCards() : null}</div>
      )}

      {/* Accept / reject during photo phase (slim approval card only) */}
      {photoFocus && estimateId && visibleCard === null && (
        <div suppressHydrationWarning>
          {mounted ? (
            <ApprovalCard
              view={view}
              estimateId={estimateId}
              locationId={view?.locationId}
              onUploadPhotos={onNavigateToPhotos}
              variant="overview"
            />
          ) : null}
        </div>
      )}

      {view?.workflow?.status === "accepted" && estimateId && (
        <InstallationStatus estimateId={estimateId} />
      )}

      {/* Quote details — expanded by default, always visible for active quote */}
      {estimateId && (
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <button
            type="button"
            onClick={() => setShowQuoteDetails((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Quote details
              {lineItems.length > 0 ? (
                <span className="text-xs font-normal text-muted-foreground">
                  ({lineItems.length} item{lineItems.length === 1 ? "" : "s"})
                </span>
              ) : null}
            </span>
            {showQuoteDetails ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showQuoteDetails && (
            <div className="border-t border-border px-4 pb-4 pt-2">
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground" suppressHydrationWarning>
                    {formatCurrency(subtotal).replace("AUD ", "")}
                  </span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST included</span>
                    <span className="font-medium text-foreground" suppressHydrationWarning>
                      {formatCurrency(taxTotal).replace("AUD ", "")}
                    </span>
                  </div>
                )}
              </div>

              {itemsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Spinner size="sm" />
                  Loading line items…
                </div>
              ) : lineItems.length > 0 ? (
                <div className="space-y-2">
                  {lineItems.map((item, index) => {
                    const productImage = getEstimateItemProductImage(item, view?.itemsMeta);
                    return (
                      <div key={item.id || index} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
                        {productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={proxyGhlImageUrl(productImage)} alt="" className="h-9 w-9 rounded-md object-cover" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty {item.qty || item.quantity || 1}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Line items could not be loaded. Try refreshing or open the full quote.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop secondary action */}
      <div className="hidden md:block">
        <Button variant="outline" onClick={onViewDetails} className="w-full">
          View full quote <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Sticky primary CTA — mobile */}
      {stickyLabel && stickyAction && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <Button size="lg" className={`w-full ${stickyClass}`} onClick={stickyAction}>
            {uiState.canUploadPhotos && <Camera className="mr-2 h-5 w-5" />}
            {stickyLabel}
          </Button>
        </div>
      )}
    </div>
  );
});
