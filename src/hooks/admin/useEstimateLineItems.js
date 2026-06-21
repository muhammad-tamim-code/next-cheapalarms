import { useState, useMemo, useCallback } from 'react';

import { computeEstimateTotal } from '../../lib/admin/formatGhlEstimatePayload';



function normalizeItem(item, idx) {

  const id = item.id ?? `orig-${idx}`;

  const qty = item?.qty ?? item?.quantity ?? 1;

  return { ...item, id, qty, quantity: qty };

}



/** GHL discount shape for equality checks (type + value only). */

export function normalizeDiscountForCompare(discount) {

  if (!discount || discount.value == null || Number(discount.value) === 0) {

    return { type: 'percentage', value: 0 };

  }

  return {

    type: discount.type || 'percentage',

    value: parseFloat(discount.value) || 0,

  };

}



export function discountChanged(originalDiscount, editedDiscount) {

  const a = normalizeDiscountForCompare(originalDiscount);

  const b = normalizeDiscountForCompare(editedDiscount);

  return a.type !== b.type || a.value !== b.value;

}



function buildInitialState(initialItems, initialDiscount) {

  const filtered = (initialItems || []).filter((item) => item != null);

  const byId = {};

  const withId = filtered.map((item, idx) => {

    const normalized = normalizeItem(item, idx);

    byId[normalized.id] = { ...normalized };

    return normalized;

  });

  const discount = initialDiscount || null;

  return {

    editedItems: withId,

    originalItemsById: byId,

    editedDiscount: discount,

    originalDiscount: discount,

    removedItemIds: [],

  };

}



const EMPTY_INITIAL = {

  editedItems: [],

  originalItemsById: {},

  editedDiscount: null,

  originalDiscount: null,

};



/**

 * Shared line-item state for Quick Quote and estimate editing.

 * ID-based tracking — originals kept separate (no originalQty on items).

 */

export function useEstimateLineItems({

  trackChanges = false,

  initialItems = null,

  initialDiscount = null,

} = {}) {

  const [initialSnapshot] = useState(() => (

    initialItems ? buildInitialState(initialItems, initialDiscount) : EMPTY_INITIAL

  ));



  const [editedItems, setEditedItems] = useState(() => initialSnapshot.editedItems);

  const [originalItemsById, setOriginalItemsById] = useState(() => initialSnapshot.originalItemsById);

  const [originalDiscount, setOriginalDiscount] = useState(() => initialSnapshot.originalDiscount);

  const [removedItemIds, setRemovedItemIds] = useState([]);

  const [editedDiscount, setEditedDiscount] = useState(() => initialSnapshot.editedDiscount);



  const initializeFromEstimate = useCallback((items = [], discount = null) => {

    const next = buildInitialState(items, discount);

    setOriginalItemsById(next.originalItemsById);

    setEditedItems(next.editedItems);

    setOriginalDiscount(next.originalDiscount);

    setEditedDiscount(next.editedDiscount);

    setRemovedItemIds([]);

  }, []);



  const resetEmpty = useCallback(() => {

    setOriginalItemsById({});

    setEditedItems([]);

    setOriginalDiscount(null);

    setEditedDiscount(null);

    setRemovedItemIds([]);

  }, []);



  const subtotal = useMemo(() => computeEstimateTotal(editedItems, null), [editedItems]);

  const total = useMemo(

    () => computeEstimateTotal(editedItems, editedDiscount),

    [editedItems, editedDiscount]

  );



  const changedItems = useMemo(() => {

    if (!trackChanges) return [];

    return (editedItems || [])

      .filter((ed) => ed != null && originalItemsById[ed.id] != null)

      .filter((ed) => {

        const orig = originalItemsById[ed.id];

        const origQty = orig?.qty ?? orig?.quantity ?? 0;

        const edQty = ed?.qty ?? ed?.quantity ?? 0;

        return origQty !== edQty;

      })

      .map((ed) => {

        const orig = originalItemsById[ed.id];

        const origQty = orig?.qty ?? orig?.quantity ?? 0;

        const newQty = ed?.qty ?? ed?.quantity ?? 0;

        const unitPrice = Number(ed?.amount) || 0;

        return {

          itemId: ed.id,

          name: ed?.name || 'Item',

          originalQty: origQty,

          newQty,

          oldAmount: unitPrice * origQty,

          newAmount: unitPrice * newQty,

        };

      });

  }, [trackChanges, editedItems, originalItemsById]);



  const addedItems = useMemo(() => {

    if (!trackChanges) return [];

    return (editedItems || [])

      .filter((ed) => ed != null && !originalItemsById[ed.id])

      .map((ed) => ({

        itemId: ed.id,

        name: ed?.name || 'Item',

        qty: ed?.qty ?? ed?.quantity ?? 1,

        amount: Number(ed?.amount) || 0,

        photoRequired: ed?.photoRequired ?? false,

        isCustom: ed?.isCustom ?? false,

      }));

  }, [trackChanges, editedItems, originalItemsById]);



  const removedItems = useMemo(() => {

    if (!trackChanges) return [];

    return removedItemIds

      .map((id) => {

        const orig = originalItemsById[id];

        if (!orig) return null;

        return {

          itemId: id,

          name: orig?.name || 'Item',

          qty: orig?.qty ?? orig?.quantity ?? 1,

          amount: Number(orig?.amount) || 0,

        };

      })

      .filter(Boolean);

  }, [trackChanges, removedItemIds, originalItemsById]);



  const hasChanges = useMemo(() => {

    if (!trackChanges) return editedItems.length > 0;

    return (

      changedItems.length > 0

      || addedItems.length > 0

      || removedItems.length > 0

      || discountChanged(originalDiscount, editedDiscount)

    );

  }, [

    trackChanges,

    changedItems,

    addedItems,

    removedItems,

    originalDiscount,

    editedDiscount,

    editedItems.length,

  ]);



  const handleQuantityChange = useCallback((index, delta) => {

    setEditedItems((prev) => {

      if (index < 0 || index >= prev.length) return prev;

      const item = prev[index];

      if (!item) return prev;

      const orig = originalItemsById[item.id];

      const origQty = orig ? (orig.qty ?? orig.quantity ?? 1) : (item.qty ?? item.quantity ?? 1);

      const currentQty = item?.qty ?? item?.quantity ?? 1;

      const minQty = trackChanges ? Math.max(1, origQty - 10) : 1;

      const maxQty = trackChanges ? origQty + 10 : 999;

      const newQty = Math.max(minQty, Math.min(currentQty + delta, maxQty));

      const newItems = [...prev];

      newItems[index] = { ...item, qty: newQty, quantity: newQty };

      return newItems;

    });

  }, [originalItemsById, trackChanges]);



  const handleRemoveItem = useCallback((index) => {
    let removedId = null;

    setEditedItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;

      const item = prev[index];
      if (item?.id && originalItemsById[item.id]) {
        removedId = item.id;
      }

      return prev.filter((_, i) => i !== index);
    });

    if (removedId) {
      setRemovedItemIds((ids) => (ids.includes(removedId) ? ids : [...ids, removedId]));
    }
  }, [originalItemsById]);



  const handleAddCustomItem = useCallback((newItem) => {

    const id = newItem.id ?? `custom-${Date.now()}`;

    setEditedItems((prev) => [...prev, { ...newItem, id, isCustom: true }]);

  }, []);



  const handleApplyDiscount = useCallback((discount) => {

    setEditedDiscount(discount);

  }, []);



  const validateItems = useCallback(() => {

    if (editedItems.length === 0) {

      return 'Add at least one line item';

    }

    const invalid = editedItems.filter((item) => {

      if (!item) return true;

      const qty = Number(item?.qty || item?.quantity || 0);

      const amount = Number(item?.amount || 0);

      return Number.isNaN(amount) || Number.isNaN(qty) || amount < 0 || qty <= 0;
    });

    if (invalid.length > 0) {

      return 'All items need a valid quantity; prices cannot be negative';

    }

    return null;

  }, [editedItems]);



  const itemsForSave = useCallback(

    (currency) => (editedItems || [])

      .filter((item) => item != null)

      .map((item) => ({

        name: item?.name || 'Item',

        description: item?.description || '',

        currency: item?.currency || currency,

        amount: item?.amount || 0,

        qty: item?.qty || item?.quantity || 1,

        isCustom: item?.isCustom ?? false,

        photoRequired: item?.photoRequired ?? false,

        image: item?.image || '',

        ghlProductId: item?.ghlProductId || '',

        sku: item?.sku || '',

      })),

    [editedItems]

  );



  return {

    editedItems,

    editedDiscount,

    originalItemsById,

    originalDiscount,

    subtotal,

    total,

    changedItems,

    addedItems,

    removedItems,

    hasChanges,

    initializeFromEstimate,

    resetEmpty,

    handleQuantityChange,

    handleRemoveItem,

    handleAddCustomItem,

    handleApplyDiscount,

    validateItems,

    itemsForSave,

  };

}


