import { computeUIState } from '../portal/status-computer';

/**
 * Whether staff may overwrite line items (matches EstimateDetailContent edit gate).
 * Blocked when invoice exists, or accepted/rejected/invoice-ready without photo submission.
 */
export function canEditEstimateLines(portalMeta, hasInvoice) {
  if (hasInvoice) {
    return { allowed: false, reason: 'invoice' };
  }

  const { displayStatus } = computeUIState(portalMeta ?? {});
  const photosSubmitted = portalMeta?.photos?.submission_status === 'submitted';
  const lockedStatuses = ['ACCEPTED', 'REJECTED', 'INVOICE_READY'];

  if (lockedStatuses.includes(displayStatus) && !photosSubmitted) {
    return {
      allowed: false,
      reason: 'status',
      displayStatus,
    };
  }

  return { allowed: true };
}

export function getEditBlockedMessage(result) {
  if (result.allowed) return null;
  if (result.reason === 'invoice') {
    return 'This quote cannot be overwritten because an invoice exists.';
  }
  if (result.reason === 'status') {
    return `This quote is ${result.displayStatus?.replace(/_/g, ' ').toLowerCase() ?? 'locked'} and cannot be edited here. Open estimate detail if photo-based adjustments apply.`;
  }
  return 'This quote cannot be edited.';
}
