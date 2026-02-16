import { useState, useEffect, useCallback, useMemo } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentFormInner } from "./PaymentCard/PaymentFormInner";
import { AmountBlock } from "./PaymentCard/AmountBlock";

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

/**
 * Helper function to format amounts (moved outside component to prevent recreation on every render)
 */
function formatAmount(amt) {
  if (amt === null || amt === undefined) return '—';
  const num = Number(amt);
  if (isNaN(num) || !isFinite(num)) return '—';
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * PaymentCard Component
 * 
 * Allows customers to complete payment after estimate acceptance.
 * NEW WORKFLOW: Payment comes BEFORE booking.
 * Shown when:
 * - workflow.status === "accepted" AND invoice exists (not yet paid)
 * - workflow.status === "booked" AND not yet fully paid (partial payment scenario)
 */
export function PaymentCard({ estimateId, locationId, inviteToken, payment, workflow, invoice, minimumPaymentInfo }) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS (React Rules of Hooks)
  const router = useRouter();
  const [shouldReload, setShouldReload] = useState(false);
  const [customAmount, setCustomAmount] = useState(null);
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null); // '25', '50', '75', 'minimum', 'full', or null
  const paymentsList = Array.isArray(payment?.payments) ? payment.payments : [];

  // Calculate invoice total (memoized for performance)
  const invoiceTotal = useMemo(() => {
    // Prefer minimumPaymentInfo (source of truth from backend)
    if (minimumPaymentInfo?.invoiceTotal) {
      return parseFloat(minimumPaymentInfo.invoiceTotal);
    }
    if (invoice) {
      // Check for new nested structure first
      if (invoice.ghl && invoice.ghl.total) {
        return parseFloat(invoice.ghl.total);
      }
      // Fallback to old flat structure
      if (invoice.total) {
        return parseFloat(invoice.total);
      }
    }
    // Fallback: try to get from payment data if exists
    if (payment && payment.invoiceTotal) {
      return parseFloat(payment.invoiceTotal);
    }
    return null;
  }, [minimumPaymentInfo?.invoiceTotal, invoice, payment]);
  
  // Get remaining balance from minimumPaymentInfo (source of truth) or calculate (memoized)
  const remainingBalance = useMemo(() => {
    if (minimumPaymentInfo?.remainingBalance !== undefined) {
      return parseFloat(minimumPaymentInfo.remainingBalance);
    }
    if (payment && typeof payment.remainingBalance === 'number') {
      return payment.remainingBalance;
    }
    // FIX: Calculate even when payment.amount doesn't exist (first payment scenario)
    // If invoiceTotal is valid, remaining balance = invoiceTotal - existing paid amount
    if (invoiceTotal !== null) {
      const existingPaid = payment?.amount ? Number(payment.amount) : 0;
      return Math.max(0, invoiceTotal - existingPaid);
    }
    return null;
  }, [minimumPaymentInfo?.remainingBalance, payment, invoiceTotal]);

  // Get minimum payment from minimumPaymentInfo or calculate fallback (memoized)
  const minimumPayment = useMemo(() => {
    if (minimumPaymentInfo?.minimumPayment !== undefined) {
      return parseFloat(minimumPaymentInfo.minimumPayment);
    }
    return null;
  }, [minimumPaymentInfo?.minimumPayment]);

  // Check if this is a subsequent payment (after first partial payment)
  // Second payment MUST be full remaining balance - no partial options allowed
  const requiresFullPayment = useMemo(() => {
    return minimumPaymentInfo?.requiresFullPayment === true || minimumPaymentInfo?.isSubsequentPayment === true;
  }, [minimumPaymentInfo?.requiresFullPayment, minimumPaymentInfo?.isSubsequentPayment]);

  // Calculate existing paid amount (memoized)
  const existingPaidAmount = useMemo(() => {
    if (minimumPaymentInfo?.existingPaidAmount !== undefined) {
      return parseFloat(minimumPaymentInfo.existingPaidAmount);
    }
    return payment?.amount ? parseFloat(payment.amount) : 0;
  }, [minimumPaymentInfo?.existingPaidAmount, payment?.amount]);

  // Calculate default payable amount that respects minimum requirement (memoized)
  const defaultPayableAmount = useMemo(() => {
    const baseAmount = payment?.status === 'partial' && remainingBalance !== null 
      ? remainingBalance 
      : invoiceTotal;
    
    // Ensure default meets minimum requirement if minimum exists
    let result = baseAmount;
    if (minimumPayment !== null && baseAmount !== null) {
      result = Math.max(baseAmount, minimumPayment);
    }
    
    // Defensive: Never exceed remaining balance (for partial) or invoice total (for first payment)
    if (payment?.status === 'partial' && remainingBalance !== null) {
      result = Math.min(result, remainingBalance);
    } else if (invoiceTotal !== null) {
      result = Math.min(result, invoiceTotal);
    }
    
    return result;
  }, [payment?.status, remainingBalance, invoiceTotal, minimumPayment]);

  // Calculate preset amounts (memoized)
  const preset25 = useMemo(() => remainingBalance !== null ? remainingBalance * 0.25 : null, [remainingBalance]);
  const preset50 = useMemo(() => remainingBalance !== null ? remainingBalance * 0.50 : null, [remainingBalance]);
  const preset75 = useMemo(() => remainingBalance !== null ? remainingBalance * 0.75 : null, [remainingBalance]);

  // Check if preset amounts meet minimum (for button enable/disable) - memoized
  const preset25Valid = useMemo(() => preset25 !== null && minimumPayment !== null && preset25 >= minimumPayment, [preset25, minimumPayment]);
  const preset50Valid = useMemo(() => preset50 !== null && minimumPayment !== null && preset50 >= minimumPayment, [preset50, minimumPayment]);
  const preset75Valid = useMemo(() => preset75 !== null && minimumPayment !== null && preset75 >= minimumPayment, [preset75, minimumPayment]);

  // Auto-select "full" if remaining balance < minimum OR if this is a subsequent payment (only one valid option)
  useEffect(() => {
    if (requiresFullPayment && remainingBalance !== null && remainingBalance > 0) {
      // Auto-select full payment for subsequent payments (second payment must be full)
      if (selectedPreset === null && !useCustomAmount) {
        setSelectedPreset('full');
      }
    } else if (remainingBalance !== null && minimumPayment !== null && remainingBalance < minimumPayment && remainingBalance > 0) {
      // Auto-select full if remaining balance < minimum (first payment edge case)
      if (selectedPreset === null && !useCustomAmount) {
        setSelectedPreset('full');
      }
    }
  }, [remainingBalance, minimumPayment, selectedPreset, useCustomAmount, requiresFullPayment]);

  // When preset is selected, use that amount (memoized)
  const selectedAmount = useMemo(() => {
    if (selectedPreset === '25' && preset25 !== null) return preset25;
    if (selectedPreset === '50' && preset50 !== null) return preset50;
    if (selectedPreset === '75' && preset75 !== null) return preset75;
    if (selectedPreset === 'minimum' && minimumPayment !== null) return minimumPayment;
    if (selectedPreset === 'full' && remainingBalance !== null) return remainingBalance;
    return null;
  }, [selectedPreset, preset25, preset50, preset75, minimumPayment, remainingBalance]);

  // Use custom amount if set, preset amount if selected, otherwise use default (memoized)
  // For subsequent payments, always use remaining balance (full payment required)
  const payableAmount = useMemo(() => {
    // If subsequent payment, must be full remaining balance
    if (requiresFullPayment && remainingBalance !== null) {
      return remainingBalance;
    }
    
    if (useCustomAmount && customAmount !== null && customAmount > 0) {
      return customAmount;
    }
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    return defaultPayableAmount;
  }, [useCustomAmount, customAmount, selectedAmount, defaultPayableAmount, requiresFullPayment, remainingBalance]);

  // Validate custom amount (including minimum payment check) - memoized
  const customAmountError = useMemo(() => {
    if (!useCustomAmount || customAmount === null) return null;
    
    if (customAmount <= 0) return 'Amount must be greater than zero';
    
    // If this is a subsequent payment, must be full remaining balance
    if (requiresFullPayment) {
      if (remainingBalance !== null && Math.abs(customAmount - remainingBalance) > 0.01) {
        return `Second payment must be the full remaining balance of ${formatAmount(remainingBalance)}`;
      }
    } else {
      // First payment: check minimum payment
      if (minimumPayment !== null && customAmount < minimumPayment) {
        return `Amount must be at least ${formatAmount(minimumPayment)}`;
      }
    }
    
    if (remainingBalance !== null && customAmount > remainingBalance) {
      return `Amount cannot exceed remaining balance of ${formatAmount(remainingBalance)}`;
    }
    if (invoiceTotal !== null && customAmount > invoiceTotal) {
      return `Amount cannot exceed invoice total of ${formatAmount(invoiceTotal)}`;
    }
    return null;
  }, [useCustomAmount, customAmount, minimumPayment, remainingBalance, invoiceTotal, requiresFullPayment]);

  // Handle preset button click (memoized with useCallback)
  const handlePresetClick = useCallback((preset) => {
    setSelectedPreset(preset);
    setUseCustomAmount(false);
    setCustomAmount(null);
  }, []);

  // Handle custom amount toggle (memoized with useCallback)
  const handleCustomAmountToggle = useCallback(() => {
    setUseCustomAmount(true);
    setSelectedPreset(null);
    // Pre-fill with remaining balance or minimum, whichever is higher, but never exceed remaining balance
    const prefillAmount = remainingBalance !== null 
      ? Math.min(
          remainingBalance,
          minimumPayment !== null ? Math.max(minimumPayment, remainingBalance * 0.25) : remainingBalance
        )
      : (invoiceTotal !== null 
          ? Math.min(invoiceTotal, minimumPayment !== null ? Math.max(minimumPayment, invoiceTotal * 0.25) : invoiceTotal)
          : null);
    setCustomAmount(prefillAmount);
  }, [remainingBalance, minimumPayment, invoiceTotal]);

  const handlePaymentSuccess = useCallback(() => {
    // Reload page after a short delay to show updated payment status
    setTimeout(() => {
      router.reload();
    }, 1500);
  }, [router]);

  // Reload if needed
  useEffect(() => {
    if (shouldReload) {
      router.reload();
    }
  }, [shouldReload, router]);

  // If already paid, show confirmation
  if (payment && payment.status === 'paid') {
    const formatPaidAmount = (amount) => {
      if (amount === null || amount === undefined) return '$0.00';
      const num = Number(amount);
      if (isNaN(num) || !isFinite(num)) return '$0.00';
      return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
      <div className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Payment</p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">Payment Confirmed</h3>
            <p className="text-sm text-muted-foreground">Your payment has been processed</p>
          </div>
          <div className="rounded-full bg-success-bg p-4 animate-in zoom-in duration-300">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-success/30 bg-success-bg p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-success">Amount Paid</span>
              <span className="text-2xl font-semibold text-success">
                {formatPaidAmount(payment.amount)}
              </span>
            </div>
            {payment.paidAt && (
              <p className="text-xs text-success">
                Paid on{" "}
                {(() => {
                  // SSR-safe date formatting
                  const date = new Date(payment.paidAt);
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
            {payment.provider && (
              <p className="text-xs text-success">
                Payment method: {payment.provider === 'stripe' ? 'Stripe' : payment.provider}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show payment form if:
  // 1. Accepted and invoice exists (new workflow: payment before booking)
  // 2. Booked but not fully paid (partial payment scenario)
  const isAccepted = workflow?.status === 'accepted';
  const isBooked = workflow?.status === 'booked';
  const hasInvoice = invoice && (invoice.id || invoice.number);
  const isFullyPaid = payment && payment.status === 'paid';
  
  if (!isAccepted && !isBooked) {
    return null; // Only show when accepted (with invoice) or booked (partial payment)
  }
  
  if (isAccepted && !hasInvoice) {
    return null; // Don't show payment form if no invoice yet
  }
  
  if (isBooked && isFullyPaid) {
    return null; // Don't show payment form if fully paid
  }

  // SECURITY: Don't show payment form if invoice total is invalid
  if (invoiceTotal === null || invoiceTotal <= 0) {
    return null; // Invalid invoice total
  }

  // SECURITY: Don't show payment form if no remaining balance
  if (remainingBalance !== null && remainingBalance <= 0) {
    return null; // No remaining balance to pay
  }

  if (!stripePromise) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <h3 className="text-xl font-semibold text-foreground">Payments unavailable</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Stripe is not configured. Please contact support or try again later.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} key="payment-elements">
      <div className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Payment</p>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">
              {payment?.status === 'partial' ? 'Complete Remaining Balance' : 'Complete Payment'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {payment?.status === 'partial'
                ? 'You have a partial payment recorded. Please pay the remaining balance.'
                : 'Finalize your estimate payment'}
            </p>
          </div>
          <div className="rounded-full bg-secondary/15 p-4">
            <CreditCard className="h-6 w-6 text-secondary" />
          </div>
        </div>

        {/* Invoice Summary - Gorgeous Modern Design with Glassmorphism */}
        {invoiceTotal !== null && invoiceTotal > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white/60 backdrop-blur-md border border-white/20 shadow-xl shadow-black/5 p-6">
            <div className="space-y-4">
              {/* Total Invoice - Prominent */}
              <div className="flex justify-between items-baseline pb-4 border-b-2 border-border/40">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Invoice</span>
                <span className="text-3xl font-black text-foreground tracking-tight">{formatAmount(invoiceTotal)}</span>
              </div>
              
              {/* Paid / Remaining - Clean Grid Layout */}
              <div className="grid grid-cols-2 gap-4">
                {existingPaidAmount > 0 && (
                  <div className="rounded-xl bg-success/10 p-4 border border-success/20 shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Paid so far</p>
                    <p className="text-xl font-bold text-success">{formatAmount(existingPaidAmount)}</p>
                  </div>
                )}
                {remainingBalance !== null && remainingBalance > 0 && (
                  <div className="rounded-xl bg-warning/10 p-4 border border-warning/20 shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Remaining</p>
                    <p className="text-xl font-bold text-warning">{formatAmount(remainingBalance)}</p>
                  </div>
                )}
              </div>
              
              {/* Minimum Payment - Highlighted Badge */}
              {minimumPayment !== null && minimumPayment > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-4 border-2 border-primary/30 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Minimum Payment Required</span>
                    <span className="text-lg font-black text-primary">{formatAmount(minimumPayment)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {paymentsList.length > 0 && (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground mb-2">Payment history</p>
            <div className="space-y-2 text-sm">
              {paymentsList.map((pmt, idx) => (
                <div key={`${pmt.transactionId || 'payment'}-${idx}`} className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{formatAmount(pmt.amount)}</span>
                    {pmt.paidAt && (
                      <span className="text-muted-foreground text-xs">
                        {(() => {
                          // SSR-safe date/time formatting
                          const date = new Date(pmt.paidAt);
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
                          const year = date.getUTCFullYear();
                          const hours = String(date.getUTCHours()).padStart(2, "0");
                          const minutes = String(date.getUTCMinutes()).padStart(2, "0");
                          return `${day} ${month} ${year}, ${hours}:${minutes}`;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-muted-foreground text-xs">
                    <div>{pmt.provider ? pmt.provider : 'Payment'}</div>
                    {pmt.transactionId && <div className="truncate max-w-[140px]">{pmt.transactionId}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <AmountBlock
            formatAmount={formatAmount}
            useCustomAmount={useCustomAmount}
            setUseCustomAmount={setUseCustomAmount}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            selectedPreset={selectedPreset}
            setSelectedPreset={setSelectedPreset}
            handlePresetClick={handlePresetClick}
            handleCustomAmountToggle={handleCustomAmountToggle}
            minimumPayment={minimumPayment}
            remainingBalance={remainingBalance}
            invoiceTotal={invoiceTotal}
            preset25={preset25}
            preset50={preset50}
            preset75={preset75}
            preset25Valid={preset25Valid}
            preset50Valid={preset50Valid}
            preset75Valid={preset75Valid}
            requiresFullPayment={requiresFullPayment}
            payableAmount={payableAmount}
            customAmountError={customAmountError}
          />
          <div className="rounded-2xl bg-gradient-to-br from-muted/50 via-muted/30 to-transparent border border-white/40 shadow-lg p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground font-bold mb-4">Payment Method</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 p-3 ring-1 ring-primary/20 shadow-sm">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">Credit Card</p>
                  <p className="text-xs text-muted-foreground">Secure via Stripe</p>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-border/40">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  🔒 All payments are encrypted. Your card details are never stored on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <PaymentFormInner
          estimateId={estimateId}
          locationId={locationId}
          inviteToken={inviteToken}
          amount={payableAmount}
          workflow={workflow}
          onSuccess={handlePaymentSuccess}
          stripeConfigured={!!stripePromise}
          isAmountValid={
            !customAmountError &&
            payableAmount !== null &&
            payableAmount > 0 &&
            (minimumPayment === null || payableAmount >= minimumPayment)
          }
        />
      </div>
    </Elements>
  );
}