import {
  ArrowRight,
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  useAcceptEstimate,
  useRejectEstimate,
  useRetryInvoice,
  useRequestReview,
} from "../../../lib/react-query/hooks";
import { computeUIState } from "../../../lib/portal/status-computer";
import { Spinner } from "../../ui/spinner";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { toast } from "sonner";

export function ApprovalCard({ view, estimateId, locationId, onUploadPhotos, variant }) {
  const isOverview = variant === "overview";
  const quoteStatus = view?.quote?.status || "sent";
  const hasPhotos = (view?.photos?.items?.length || 0) > 0;
  const total = view?.quote?.total || 0;
  const scheduledFor = view?.installation?.scheduledFor;
  const invoice = view?.invoice;
  const payment = view?.payment; // Payment data - source of truth for payment status
  const invoiceError = view?.invoiceError; // Invoice creation error from API
  const isAccepted = quoteStatus === "accepted";
  const isRejected = quoteStatus === "rejected";
  const acceptedAt = view?.quote?.acceptedAt;
  const isGuestMode = view?.isGuestMode ?? false;

  // Use status computer to get UI state
  const uiState = computeUIState(view);
  const canRequestReview = uiState.canRequestReview;
  const canAccept = uiState.canAccept;
  const displayStatus = uiState.displayStatus;
  const statusMessage = uiState.statusMessage;

  const [showPhotoWarning, setShowPhotoWarning] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const acceptMutation = useAcceptEstimate();
  const rejectMutation = useRejectEstimate();
  const retryInvoiceMutation = useRetryInvoice();
  const requestReviewMutation = useRequestReview();

  const showPhotoPrompt = !scheduledFor && !isAccepted && !isRejected && (!canAccept || isOverview);

  const isProcessing =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    retryInvoiceMutation.isPending ||
    requestReviewMutation.isPending;

  const handleAccept = async () => {
    if (!hasPhotos) {
      setShowPhotoWarning(true);
      return;
    }
    await handleConfirmAccept();
  };

  const handleConfirmAccept = async () => {
    if (!estimateId) {
      toast.error("Missing estimate ID");
      return;
    }
    try {
      // Show initial feedback
      const loadingToast = toast.loading('Accepting estimate...', {
        description: 'This will only take a moment.',
      });
      
      const result = await acceptMutation.mutateAsync({
        estimateId,
        locationId: locationId || undefined,
        inviteToken: view?.account?.inviteToken,
      });
      
      setShowPhotoWarning(false);
      
      // Dismiss loading toast - success toast will be shown by the mutation hook
      // The mutation hook handles all toast notifications (success, warning, info)
      toast.dismiss(loadingToast);
    } catch (error) {
      // Error is handled by React Query's onError callback
      toast.error(
        error.message || "Failed to accept estimate. Please try again."
      );
    }
  };

  const handleReject = () => {
    setShowRejectConfirm(true);
  };

  const handleConfirmReject = async () => {
    if (!estimateId || !locationId) return;
    try {
      await rejectMutation.mutateAsync({
        estimateId,
        locationId,
        reason: rejectReason,
        inviteToken: view?.account?.inviteToken,
      });
      setShowRejectConfirm(false);
      setRejectReason("");
    } catch (error) {
      toast.error(error.message || "Failed to reject estimate");
    }
  };

  const handleRetryInvoice = async () => {
    if (!estimateId || !locationId) return;
    try {
      await retryInvoiceMutation.mutateAsync({
        estimateId,
        locationId,
        inviteToken: view?.account?.inviteToken,
      });
    } catch (error) {
      // Error is already handled by the mutation hook
    }
  };

  const handleRequestReview = async () => {
    if (!estimateId) {
      toast.error("Missing estimate ID");
      return;
    }
    try {
      await requestReviewMutation.mutateAsync({
        estimateId,
        locationId: locationId || undefined,
        inviteToken: view?.account?.inviteToken,
      });
      // Success - the mutation will automatically refetch and update the UI
    } catch (error) {
      // Error is handled by React Query's onError callback
      toast.error(
        error.message || "Failed to request review. Please try again."
      );
    }
  };

  return (
    <>
      <div className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Approval & payment
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">
              Finalize estimate
            </h3>
            <p
              className="text-sm text-muted-foreground"
              suppressHydrationWarning
            >
              {mounted && statusMessage
                ? statusMessage
                : isAccepted
                  ? "Your estimate has been accepted"
                  : isRejected
                    ? "This estimate has been rejected"
                    : "Estimate sent - ready for review"}
            </p>
          </div>
          <div className="rounded-full bg-secondary/15 p-4">
            <Shield className="h-6 w-6 text-secondary" />
          </div>
        </div>

        <div className={`mt-5 grid gap-4 ${isOverview ? "grid-cols-1 sm:grid-cols-2" : "md:grid-cols-2"}`}>
          <div className="rounded-2xl border border-border bg-muted p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Estimate total
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {total > 0
                ? (() => {
                  // SSR-safe currency formatting
                  const formatted = total.toFixed(2);
                  const parts = formatted.split(".");
                  const integer = parts[0].replace(
                    /\B(?=(\d{3})+(?!\d))/g,
                    ","
                  );
                  return `$${integer}.${parts[1]}`;
                })()
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mounted
                ? hasPhotos
                  ? "Final pricing"
                  : "Preliminary pricing"
                : "Preliminary pricing"}
            </p>
          </div>
          {showPhotoPrompt ? (
            <button
              type="button"
              onClick={onUploadPhotos}
              className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-secondary/10 to-warning-bg p-4 text-left transition hover:border-primary/50"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Camera className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    Upload photos
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    You may qualify for a lower price
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Share clear install photos — our team reviews them and sends updated pricing when ready.
                  </p>
                </div>
              </div>
            </button>
          ) : (
          <div className="rounded-2xl border border-border bg-muted p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Install window
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {scheduledFor
                ? (() => {
                  // SSR-safe date formatting
                  const date = new Date(scheduledFor);
                  const months = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ];
                  const month = months[date.getUTCMonth()];
                  const day = date.getUTCDate();
                  return `${month} ${day}`;
                })()
                : "TBD"}
            </p>
            <p className="text-xs text-muted-foreground">
              Tentative until approval
            </p>
          </div>
          )}
        </div>

        {/* Status Display - Only render after mount to prevent hydration mismatch */}
        {mounted && isAccepted && (
          <div className="mt-5 rounded-2xl bg-success-bg border border-success/30 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="text-sm font-semibold text-success">
                ✓ Estimate Accepted
              </p>
            </div>
            {acceptedAt && (
              <p className="text-xs text-success mt-1">
                Accepted on{" "}
                {(() => {
                  // SSR-safe date formatting
                  const date = new Date(acceptedAt);
                  const months = [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ];
                  const month = months[date.getUTCMonth()];
                  const day = date.getUTCDate();
                  const year = date.getUTCFullYear();
                  return `${day} ${month} ${year}`;
                })()}
              </p>
            )}
          </div>
        )}

        {mounted && invoice && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  Invoice
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {invoice.number || invoice.id || "Pending number"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  Status: {(() => {
                    // Use payment.status as source of truth (calculated from actual payments)
                    // Fallback to invoice.status if payment data not available
                    if (payment?.status === 'paid') {
                      return 'Paid';
                    } else if (payment?.status === 'partial') {
                      return 'Partially Paid';
                    } else if (invoice?.status) {
                      // Fallback to invoice status from GHL
                      return invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
                    }
                    return 'Pending';
                  })()}
                </p>
              </div>
              {invoice.url && (
                <a
                  href={invoice.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition"
                >
                  View & Pay
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {mounted && isRejected && (
          <div className="mt-5 rounded-2xl bg-error-bg border border-error/30 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-error" />
              <p className="text-sm font-semibold text-error">
                ✗ Estimate Rejected
              </p>
            </div>
            <p className="text-xs text-error mt-1">
              If you have questions, please contact support.
            </p>
          </div>
        )}

        {/* Invoice Error - Show retry option */}
        {mounted && isAccepted && invoiceError && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning">
                  Invoice Creation Failed
                </p>
                <p className="mt-1 text-xs text-warning">{invoiceError}</p>
                <Button
                  type="button"
                  onClick={handleRetryInvoice}
                  disabled={isProcessing}
                  variant="default"
                  className="mt-3 rounded-xl bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  {isProcessing ? "Retrying..." : "Retry Invoice Creation"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Only render after mount to prevent hydration mismatch */}
        {mounted && !isAccepted && !isRejected && (
          <div className="mt-5 space-y-3" suppressHydrationWarning>
            {isGuestMode ? (
              <div className="rounded-2xl border-2 border-border bg-muted px-4 py-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Please create an account to accept or reject this estimate
                </p>
              </div>
            ) : mounted ? (
              <>
                {/* Request Review Button - Only show when resubmitting photos (after admin already reviewed once) */}
                {canRequestReview && (
                  <Button
                    type="button"
                    onClick={handleRequestReview}
                    disabled={isProcessing}
                    variant="default"
                    className="w-full h-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold uppercase tracking-[0.3em] shadow-lg transition hover:-translate-y-0.5 bg-primary"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size="sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>Request Review</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {/* Accept + Reject — overview uses inline row; accept stays disabled until review */}
                {isOverview && !isAccepted && !isRejected && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleAccept}
                        disabled={!canAccept || isProcessing}
                        variant="default"
                        title={
                          !canAccept
                            ? "Available after we review your photos and send updated pricing"
                            : undefined
                        }
                        className="h-auto flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] shadow transition bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Spinner size="sm" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <span>Accept</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleReject}
                        disabled={!uiState.canReject || isProcessing}
                        variant="destructive"
                        className="h-auto flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] shadow transition disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Spinner size="sm" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <span>Reject</span>
                            <XCircle className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                    {!canAccept && (
                      <p className="text-center text-xs text-muted-foreground">
                        Accept unlocks after we review your photos and send updated pricing.
                      </p>
                    )}
                  </>
                )}

                {!isOverview && canAccept && (
                  <Button
                    type="button"
                    onClick={handleAccept}
                    disabled={isProcessing}
                    variant="default"
                    className="w-full h-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold uppercase tracking-[0.3em] shadow-lg transition hover:-translate-y-0.5 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size="sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>Accept</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {!isOverview && uiState.canReject && (
                  <Button
                    type="button"
                    onClick={handleReject}
                    disabled={isProcessing}
                    variant="destructive"
                    className="w-full h-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold uppercase tracking-[0.3em] shadow-lg transition hover:-translate-y-0.5"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size="sm" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>Reject</span>
                        <XCircle className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {isOverview && !canAccept && !isAccepted && !isRejected && (
                  <p className="text-center text-xs text-muted-foreground">
                    Accept unlocks after we review your photos and send updated pricing.
                  </p>
                )}
              </>
            ) : (
              // Placeholder during SSR - match structure but don't render buttons
              <div className="rounded-2xl border-2 border-border bg-muted px-4 py-4 text-center">
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            )}
          </div>
        )}

        {/* Status Messages - Only render after mount to prevent hydration mismatch */}
        {mounted && displayStatus === "UNDER_REVIEW" && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary">
                Your review request is being processed. Admin will review and
                notify you when acceptance is enabled.
              </p>
            </div>
          </div>
        )}

        {mounted && displayStatus === "PHOTOS_UNDER_REVIEW" && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary">
                Your photos have been submitted. We're reviewing them and will
                notify you when ready.
              </p>
            </div>
          </div>
        )}

        {mounted && displayStatus === "CHANGES_REQUESTED" && (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning-bg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">
                We've reviewed your photos and need some changes or additional
                photos. Please resubmit.
              </p>
            </div>
          </div>
        )}

        {/* Info message when estimate sent but no photos uploaded */}
        {mounted && displayStatus === "ESTIMATE_SENT" && !hasPhotos && (
          <div className="mt-4 rounded-2xl border border-warning/30 bg-warning-bg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">
                Consider uploading photos before requesting review. Your
                estimate cost may reduce once we review your property photos.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Photo Warning Modal */}
      {showPhotoWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-surface p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-warning-bg p-2">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  No Photos Uploaded
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You haven't uploaded photos yet. Your estimate cost may reduce
                  once we review your property photos. Do you want to proceed
                  with acceptance anyway?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isProcessing) {
                    handleConfirmAccept();
                  }
                }}
                disabled={isProcessing}
                variant="default"
                className="flex-1 rounded-xl shadow-lg transition hover:shadow-xl"
              >
                {isProcessing ? "Processing..." : "Accept Anyway"}
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPhotoWarning(false);
                  // Use setTimeout to ensure modal closes before navigation
                  setTimeout(() => {
                    onUploadPhotos?.();
                  }, 100);
                }}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Upload Photos First
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-surface p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-error-bg p-2">
                <XCircle className="h-5 w-5 text-error" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Reject Estimate?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Are you sure you want to reject this estimate? This action
                  cannot be undone.
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Reason (optional)
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let us know why you're rejecting this estimate..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmReject();
                }}
                disabled={isProcessing}
                variant="destructive"
                className="flex-1 rounded-xl shadow-lg transition"
              >
                {isProcessing ? "Processing..." : "Confirm Reject"}
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRejectConfirm(false);
                  setRejectReason("");
                }}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
