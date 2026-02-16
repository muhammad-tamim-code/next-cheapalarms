/**
 * Normalizes portal status data from API to consistent format
 */
export function normaliseStatus(status) {
  if (!status) return null;
  const quote = status.quote ?? {};
  const account = status.account ?? {};
  const installation = status.installation ?? {};
  const photos = status.photos ?? {};

  return {
    estimateId: status.estimateId ?? quote.number ?? null,
    locationId: status.locationId ?? null,
    nextStep: status.nextStep ?? installation.message ?? "We'll keep you posted.",
    invoice: status.invoice ?? null,
    quote: {
      status: quote.status ?? "sent", // Portal uses: sent, accepted, rejected
      label: quote.statusLabel ?? "Sent", // Default label matches backend
      number: quote.number ?? status.estimateId ?? "—",
      acceptedAt: quote.acceptedAt ?? null,
      // Preserve acceptance and revision fields for status computer
      acceptance_enabled: quote.acceptance_enabled ?? false,
      revisionNumber: quote.revisionNumber ?? null,
      photos_required: quote.photos_required ?? false,
      approval_requested: quote.approval_requested ?? false,
      canAccept: quote.canAccept ?? false,
      total: quote.total ?? null,
      currency: quote.currency ?? null,
    },
    account: {
      status: account.status ?? "pending",
      label: account.statusLabel ?? "Invite pending",
      lastInviteAt: account.lastInviteAt ?? null,
      expiresAt: account.expiresAt ?? null,
      portalUrl: account.portalUrl ?? null,
      resetUrl: account.resetUrl ?? null,
    },
    installation: {
      status: installation.status ?? "pending",
      label: installation.statusLabel ?? "Not scheduled",
      message: installation.message ?? null,
      canSchedule: installation.canSchedule ?? false,
      scheduledFor: installation.scheduledFor ?? null,
    },
    photos: {
      items: Array.isArray(photos.items) ? photos.items : [],
      missingCount:
        photos.missingCount ??
        Math.max(
          0,
          (photos.required ?? 0) - (Array.isArray(photos.items) ? photos.items.length : 0)
        ),
      required: photos.required ?? 6,
      samples: photos.samples ?? [],
      // Preserve backend submission status fields (critical for "Resubmit" button persistence)
      submission_status: photos.submission_status ?? null,
      submitted_at: photos.submitted_at ?? null,
      total: photos.total ?? 0,
      uploaded: photos.uploaded ?? 0,
      last_edited_at: photos.last_edited_at ?? null,
    },
    // Transform backend payment → PaymentsView shape
    // Backend returns `payment` (singular) with { remainingBalance, payments[], invoiceTotal }
    // PaymentsView expects `payments` (plural) with { outstanding, history[] }
    payments: status.payment
      ? {
          outstanding: status.payment.remainingBalance ?? 0,
          history: (status.payment.payments ?? [])
            .filter((p) => p.status === "succeeded" && !p.refunded)
            .map((p, i) => ({
              id: p.transactionId || p.paymentIntentId || `pay-${i}`,
              label: `${p.provider === "stripe" ? "Card payment" : p.provider ?? "Payment"}`,
              amount: p.amount ?? 0,
              date: p.paidAt ?? null,
            })),
        }
      : null,
    // Documents from backend portal meta (may be empty until populated by workflows)
    documents: status.documents ?? null,
    tasks: status.tasks ?? null,
    support: status.support ?? null,
    // Transform revisionHistory → activity log for PreferencesView
    // Each revision has { revisionId, revisedAt, revisedBy, adminNote, oldTotal, newTotal, netChange }
    activity:
      (status.revisionHistory ?? []).length > 0
        ? status.revisionHistory.map((rev, i) => ({
            id: rev.revisionId || `rev-${i}`,
            title: rev.adminNote
              ? `Estimate revised: ${rev.adminNote}`
              : `Estimate revised`,
            description: rev.netChange
              ? `Total changed by $${Math.abs(rev.netChange).toFixed(2)} (by ${rev.revisedBy?.name || "Admin"})`
              : `Updated by ${rev.revisedBy?.name || "Admin"}`,
            when: rev.revisedAt ?? null,
          }))
        : null,
    timeline: installation.timeline ?? null,
    // Workflow data (for customer journey tracking)
    workflow: status.workflow ?? null,
    booking: status.booking ?? null,
    payment: status.payment ?? null,
    revision: status.revision ?? null, // Include revision data for RevisionBanner
    revisionHistory: status.revisionHistory ?? [], // Full revision history for edit timeline
    itemsMeta: status.itemsMeta ?? {}, // Custom item metadata (photoRequired, isCustom)
    minimumPaymentInfo: status.minimumPaymentInfo ?? null, // Include minimum payment calculation
    // Guest mode info
    isGuestMode: status.isGuestMode ?? false,
    daysRemaining: status.daysRemaining ?? null,
    canCreateAccount: status.canCreateAccount ?? false,
  };
}

