/**
 * Build revision payload for portal meta + customer notification emails.
 * Same shape as EstimateDetailContent handleConfirmSave.
 */
export function buildRevisionData({
  adminNote = '',
  source = 'admin-edit',
  originalTotal = 0,
  newTotal = 0,
  changedItems = [],
  addedItems = [],
  removedItems = [],
  discount = null,
}) {
  const safeOldTotal = Number.isFinite(originalTotal) ? originalTotal : 0;
  const safeNewTotal = Number.isFinite(newTotal) ? newTotal : 0;
  const safeNetChange = Number.isFinite(safeNewTotal) && Number.isFinite(safeOldTotal)
    ? safeNewTotal - safeOldTotal
    : 0;

  return {
    revisedAt: new Date().toISOString(),
    adminNote,
    source,
    oldTotal: safeOldTotal,
    newTotal: safeNewTotal,
    netChange: safeNetChange,
    changedItems: (changedItems || []).filter(Boolean).map((item) => ({
      itemId: item?.itemId || '',
      name: item?.name || 'Item',
      oldQty: item?.originalQty ?? 0,
      newQty: item?.newQty ?? 0,
      oldAmount: item?.oldAmount ?? 0,
      newAmount: item?.newAmount ?? 0,
    })),
    addedItems: (addedItems || []).filter(Boolean).map((item) => ({
      itemId: item?.itemId || '',
      name: item?.name || 'Item',
      qty: item?.qty ?? 1,
      amount: item?.amount ?? 0,
      photoRequired: item?.photoRequired ?? false,
      isCustom: item?.isCustom ?? false,
    })),
    removedItems: (removedItems || []).filter(Boolean).map((item) => ({
      itemId: item?.itemId || '',
      name: item?.name || 'Item',
      qty: item?.qty ?? 1,
      amount: item?.amount ?? 0,
    })),
    discount,
  };
}

/** True when customer has already received the quote at least once. */
export function estimateWasSent(portalMeta) {
  const quote = portalMeta?.quote || {};
  return Boolean(quote.sentAt) || (quote.sendCount ?? 0) > 0;
}
