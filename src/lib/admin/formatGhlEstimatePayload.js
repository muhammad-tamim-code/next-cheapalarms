import { DEFAULT_CURRENCY } from './constants';

/** GHL only accepts discount.type and discount.value (negative value = surcharge). */
export function cleanDiscountForGhl(discount) {
  if (!discount || discount.value === 0 || discount.value == null) {
    return { type: 'percentage', value: 0 };
  }
  return {
    type: discount.type || 'percentage',
    value: parseFloat(discount.value) || 0,
  };
}

export function formatGhlLineItems(items, currency = DEFAULT_CURRENCY) {
  return (items || [])
    .filter((item) => item != null)
    .map((item) => ({
      name: item.name || '',
      description: item.description || '',
      currency: item.currency || currency,
      amount: parseFloat(item.amount) || 0,
      qty: parseInt(item.qty || item.quantity || 1, 10),
    }));
}

/** GST-inclusive total from line items + discount (matches EstimateDetailContent). */
export function computeEstimateTotal(items, discount) {
  const itemsTotal = (items || [])
    .filter((item) => item != null)
    .reduce((sum, item) => {
      const amount = Number(item?.amount);
      const qty = Number(item?.qty || item?.quantity || 1);
      return sum + ((Number.isNaN(amount) ? 0 : amount) * (Number.isNaN(qty) ? 1 : qty));
    }, 0);

  if (!discount || discount.value === 0 || !discount.type) {
    return itemsTotal;
  }

  const discountValue = Number(discount.value);
  if (Number.isNaN(discountValue)) {
    return itemsTotal;
  }

  if (discount.type === 'percentage') {
    return itemsTotal * (1 - discountValue / 100);
  }
  return itemsTotal - discountValue;
}
