/**
 * Shared logic for determining which card to show: payment, booking, skeleton, or null.
 * Used by OverviewView and EstimateDetailView.
 *
 * @param {object} view - Portal view data (workflow, payment, invoice, etc.)
 * @param {string|null} [estimateId] - Estimate ID (required for payment/booking in OverviewView)
 * @returns {'payment'|'booking'|'skeleton'|null}
 */
export function getVisibleCard(view, estimateId) {
  const workflowStatus = view?.workflow?.status;
  const isPaymentEligible =
    workflowStatus === 'accepted' || workflowStatus === 'booked';

  const hasInvoice = view?.invoice && (view?.invoice.id || view?.invoice.number);
  const isNotFullyPaid = !view?.payment || view?.payment?.status !== 'paid';

  const invoiceTotal = view?.invoice?.ghl?.total ?? view?.invoice?.total ?? 0;
  const paymentAmount = view?.payment?.amount ?? 0;
  const remainingBalance =
    view?.minimumPaymentInfo?.remainingBalance ??
    view?.payment?.remainingBalance ??
    (invoiceTotal > 0 || paymentAmount > 0
      ? Math.max(0, invoiceTotal - paymentAmount)
      : null);

  const hasRemainingBalance =
    view?.payment?.status === 'partial' ||
    (typeof remainingBalance === 'number' && remainingBalance > 0) ||
    !view?.payment;

  if (
    isPaymentEligible &&
    hasInvoice &&
    isNotFullyPaid &&
    hasRemainingBalance &&
    estimateId
  ) {
    return 'payment';
  }

  if (
    isPaymentEligible &&
    !hasInvoice &&
    (view?.quote?.status === 'accepted' || workflowStatus === 'accepted') &&
    !view?.invoiceError
  ) {
    return 'skeleton';
  }

  if (
    isPaymentEligible &&
    view?.payment?.status === 'paid' &&
    !view?.booking &&
    estimateId
  ) {
    return 'booking';
  }

  return null;
}
