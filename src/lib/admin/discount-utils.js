/** Normalize discount for GHL-style comparison (empty / zero → no discount). */
export function normalizeDiscount(discount) {
  if (!discount || discount.value == null || Number(discount.value) === 0) {
    return { type: 'percentage', value: 0 };
  }
  return {
    type: discount.type || 'percentage',
    value: parseFloat(discount.value) || 0,
  };
}

export function discountsDiffer(current, original) {
  const a = normalizeDiscount(current);
  const b = normalizeDiscount(original);
  return a.type !== b.type || a.value !== b.value;
}
