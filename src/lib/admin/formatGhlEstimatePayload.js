import { DEFAULT_CURRENCY, GHL_CURRENCY } from './constants';

/** Map display currency (AU$) to GHL ISO code (AUD). */
export function toGhlCurrency(currency) {
  const c = (currency || '').trim().toUpperCase();
  if (!c || c === 'AU$' || c === '$') return GHL_CURRENCY;
  if (c === 'AUD') return GHL_CURRENCY;
  if (/^[A-Z]{3}$/.test(c)) return c;
  return GHL_CURRENCY;
}

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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** GHL estimate line descriptions support HTML — embed catalog product images here. */
export function buildGhlItemDescription(item) {
  const text = (item?.description || '').trim();
  const imageUrl = (item?.image || '').trim();

  if (text && /<img\s/i.test(text)) {
    return text;
  }

  const parts = [];
  if (text) {
    parts.push(`<p>${escapeHtml(text)}</p>`);
  }
  if (imageUrl) {
    const safeSrc = imageUrl.replace(/"/g, '&quot;');
    parts.push(
      `<img src="${safeSrc}" width="170" style="border-radius:8px;margin:6px 0;display:block;" alt="">`
    );
  }
  return parts.join('\n');
}

export function formatGhlLineItems(items, currency = GHL_CURRENCY) {
  const ghlCurrency = toGhlCurrency(currency);
  return (items || [])
    .filter((item) => item != null && (item.name || '').trim())
    .map((item) => ({
      name: item.name || '',
      description: buildGhlItemDescription(item),
      currency: toGhlCurrency(item.currency || ghlCurrency),
      amount: Math.max(0, parseFloat(item.amount) || 0),
      qty: Math.max(1, parseInt(item.qty || item.quantity || 1, 10)),
      type: item.type || 'one_time',
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
