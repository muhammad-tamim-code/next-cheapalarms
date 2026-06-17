import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { AddCustomItemModal } from './AddCustomItemModal';
import { DiscountModal } from './DiscountModal';
import { DEFAULT_CURRENCY } from '../../lib/admin/constants';
import { formatCurrencyAmount } from './EstimateDetailContent/helpers';

/**
 * Shared line-item table for Quick Quote (create + edit).
 * Same Add Item / Discount modals as EstimateDetailContent edit mode.
 */
export function EstimateLineItemsEditor({
  items,
  discount,
  currency = DEFAULT_CURRENCY,
  subtotal,
  total,
  readOnly = false,
  onQuantityChange,
  onRemoveItem,
  onAddCustomItem,
  onApplyDiscount,
}) {
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const handleAdd = useCallback((newItem) => {
    onAddCustomItem(newItem);
    setShowAddItemModal(false);
  }, [onAddCustomItem]);

  const handleDiscount = useCallback((d) => {
    onApplyDiscount(d);
    setShowDiscountModal(false);
  }, [onApplyDiscount]);

  const filtered = (items || []).filter((item) => item != null);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setShowAddItemModal(true)}
              variant="default"
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              + Add Item
            </Button>
            <Button
              type="button"
              onClick={() => setShowDiscountModal(true)}
              variant="default"
              size="sm"
            >
              Discount/Fee
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">No items yet — add a custom line item.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/60">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Item</th>
                <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Unit Price</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Total</th>
                {!readOnly && (
                  <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((item, idx) => {
                const itemQty = item?.qty || item?.quantity || 1;
                const lineTotal = (Number(item?.amount) || 0) * itemQty;
                return (
                  <tr key={item?.id || idx}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{item?.name || 'Item'}</div>
                      {item?.isCustom && (
                        <span className="text-xs text-muted-foreground">Custom</span>
                      )}
                      {item?.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span className="block text-center">{itemQty}</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            onClick={() => onQuantityChange(idx, -1)}
                            disabled={itemQty <= 1}
                            variant="outline"
                            size="icon-sm"
                            className="w-7 h-7"
                          >
                            −
                          </Button>
                          <span className="w-10 text-center font-medium">{itemQty}</span>
                          <Button
                            type="button"
                            onClick={() => onQuantityChange(idx, 1)}
                            variant="outline"
                            size="icon-sm"
                            className="w-7 h-7"
                          >
                            +
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {formatCurrencyAmount(item?.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatCurrencyAmount(lineTotal, currency)}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onRemoveItem(idx)}
                        >
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-border/60">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-sm text-muted-foreground">
                  Subtotal
                </td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrencyAmount(subtotal, currency)}</td>
                {!readOnly && <td />}
              </tr>
              {discount && discount.value !== 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-1 text-right text-sm text-info">
                    {discount.name || 'Adjustment'}
                    {discount.type === 'percentage' && ` (${Math.abs(discount.value)}%)`}
                  </td>
                  <td className="px-4 py-1 text-right text-sm text-info">
                    {Number(discount.value) < 0 ? '+' : '−'}
                    {formatCurrencyAmount(Math.abs(subtotal - total), currency)}
                  </td>
                  {!readOnly && <td />}
                </tr>
              )}
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                  Total (GST incl.)
                </td>
                <td className="px-4 py-3 text-right font-bold text-lg">
                  {formatCurrencyAmount(total, currency)}
                </td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AddCustomItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAdd={handleAdd}
        currency={currency}
      />
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleDiscount}
        currentDiscount={discount}
        estimateTotal={subtotal}
        currency={currency}
      />
    </div>
  );
}

EstimateLineItemsEditor.displayName = 'EstimateLineItemsEditor';
