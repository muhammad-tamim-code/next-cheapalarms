import { computeUIState } from '../portal/status-computer';

const BLOCKED_UNLESS_PHOTOS_SUBMITTED = new Set(['ACCEPTED', 'REJECTED', 'INVOICE_READY']);

/**
 * Whether staff may overwrite line items (matches EstimateDetailContent edit gate).
 */
export function canOverwriteEstimateLines(portalMeta, hasInvoice) {
  if (hasInvoice) {
    return {
      allowed: false,
      reason: 'invoice',
      message: 'An invoice has already been created for this quote. It cannot be overwritten here.',
    };
  }

  const displayStatus = computeUIState(portalMeta ?? {}).displayStatus;
  const photosSubmitted = portalMeta?.photos?.submission_status === 'submitted';

  if (BLOCKED_UNLESS_PHOTOS_SUBMITTED.has(displayStatus) && !photosSubmitted) {
    return {
      allowed: false,
      reason: 'status',
      displayStatus,
      message:
        'This quote cannot be edited in Quick Quote because it is accepted, rejected, or invoice-ready. Use estimate detail if photos were submitted and pricing needs adjustment.',
    };
  }

  return { allowed: true };
}
