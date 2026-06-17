import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { EstimateLineItemsEditor } from './EstimateLineItemsEditor';
import { ChangeSummary } from './ChangeSummary';
import { SaveEstimateModal } from './SaveEstimateModal';
import { useEstimateLineItems } from '../../hooks/admin/useEstimateLineItems';
import { DEFAULT_CURRENCY } from '../../lib/admin/constants';
import { buildRevisionData, estimateWasSent } from '../../lib/admin/build-revision-data';
import { canEditEstimateLines, getEditBlockedMessage } from '../../lib/admin/estimate-edit-guards';
import { formatCurrencyAmount } from './EstimateDetailContent/helpers';
import { parseWpFetchError } from '../../lib/admin/utils/error-handler';
import {
  useCreateCustomQuote,
  useUpdateEstimate,
  useSendEstimate,
  useSendRevisionNotification,
} from '../../lib/react-query/hooks/admin';

const STEPS = ['Line items', 'Customer', 'Review'];

export function QuickQuoteWizard({ mode = 'create', estimateId: editEstimateId, estimate: estimateProp }) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [step, setStep] = useState(0);
  const [sendNow, setSendNow] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [customer, setCustomer] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const lineItems = useEstimateLineItems({
    trackChanges: isEdit,
    initialItems: isEdit ? estimateProp?.items : null,
    initialDiscount: isEdit ? estimateProp?.discount : null,
  });

  const {
    editedItems,
    editedDiscount,
    subtotal,
    total,
    changedItems,
    addedItems,
    removedItems,
    hasChanges,
    validateItems,
    itemsForSave,
    handleQuantityChange,
    handleRemoveItem: removeLineItem,
    handleAddCustomItem,
    handleApplyDiscount,
  } = lineItems;

  const handleRemoveItem = useCallback((index) => {
    const item = editedItems[index];
    const name = item?.name || 'this item';
    if (!window.confirm(`Remove "${name}" from the quote?`)) return;
    removeLineItem(index);
  }, [editedItems, removeLineItem]);

  const hasUnsavedWork = hasChanges || (!isEdit && step > 0);

  useEffect(() => {
    if (!hasUnsavedWork) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedWork]);

  const estimate = isEdit ? estimateProp : null;
  const locationId = estimate?.locationId || process.env.NEXT_PUBLIC_GHL_LOCATION_ID || '';
  const currency = estimate?.currency || DEFAULT_CURRENCY;
  const portalMeta = estimate?.portalMeta || {};
  const hasInvoice = !!(estimate?.linkedInvoice || portalMeta?.invoice?.id);
  const editGuard = isEdit ? canEditEstimateLines(portalMeta, hasInvoice) : { allowed: true };
  const editBlockedMessage = isEdit ? getEditBlockedMessage(editGuard) : null;
  const originalTotal = estimate?.total || 0;
  const contact = estimate?.contact || {};

  const createMutation = useCreateCustomQuote();
  const updateMutation = useUpdateEstimate();
  const sendEstimateMutation = useSendEstimate();
  const sendRevisionMutation = useSendRevisionNotification();

  const isSaving = createMutation.isPending || updateMutation.isPending
    || sendEstimateMutation.isPending || sendRevisionMutation.isPending;

  const stepLabels = useMemo(() => {
    if (isEdit) {
      return ['Line items', 'Customer (linked)', 'Review & save'];
    }
    return STEPS;
  }, [isEdit]);

  const goNext = useCallback(() => {
    if (step === 0) {
      const err = validateItems();
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (step === 1 && !isEdit) {
      if (!customer.email?.trim()) {
        toast.error('Customer email is required');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  }, [step, validateItems, isEdit, customer.email]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleCreateSubmit = useCallback(async (draft = false) => {
    const err = validateItems();
    if (err) {
      toast.error(err);
      return;
    }
    if (!customer.email?.trim()) {
      toast.error('Customer email is required');
      return;
    }

    try {
      const savedItems = itemsForSave(currency);
      const result = await createMutation.mutateAsync({
        contactDetails: customer,
        items: savedItems,
        discount: editedDiscount,
        sendNow: draft ? false : sendNow,
        locationId,
      });
      const id = result?.estimateId;
      if (id) {
        router.push(`/admin/estimates/${id}`);
      } else {
        router.push('/admin/estimates');
      }
    } catch {
      // toast handled in hook
    }
  }, [validateItems, itemsForSave, editedDiscount, customer, sendNow, locationId, createMutation, router, currency]);

  const handleEditSaveClick = useCallback(() => {
    const err = validateItems();
    if (err) {
      toast.error(err);
      return;
    }
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }
    setShowSaveModal(true);
  }, [validateItems, hasChanges]);

  const handleConfirmEditSave = useCallback(async ({ adminNote, sendNotification }) => {
    if (!editEstimateId) return;

    const revisionData = buildRevisionData({
      adminNote,
      source: 'admin-quick-quote',
      originalTotal,
      newTotal: total,
      changedItems,
      addedItems,
      removedItems,
      discount: editedDiscount,
    });

    try {
      await updateMutation.mutateAsync({
        estimateId: editEstimateId,
        locationId,
        items: itemsForSave(currency),
        discount: editedDiscount,
        revisionData,
      });

      setShowSaveModal(false);
      toast.success('Quote updated');

      if (sendNotification) {
        const wasSent = estimateWasSent(portalMeta);
        try {
          if (wasSent) {
            await sendRevisionMutation.mutateAsync({
              estimateId: editEstimateId,
              locationId,
              revisionNote: adminNote,
              revisionData,
            });
            toast.success('Customer notified — your quote has been updated');
          } else {
            await sendEstimateMutation.mutateAsync({
              estimateId: editEstimateId,
              locationId,
            });
            toast.success('Quote sent to customer');
          }
        } catch (notifyErr) {
          toast.error(parseWpFetchError(notifyErr) || 'Quote saved but failed to notify customer', {
            duration: 6000,
          });
        }
      } else {
        toast.info("Don't forget to send the updated quote to the customer!", { duration: 5000 });
      }

      router.push(`/admin/estimates/${editEstimateId}`);
    } catch (err) {
      toast.error(parseWpFetchError(err) || 'Failed to update quote');
    }
  }, [
    editEstimateId,
    originalTotal,
    total,
    changedItems,
    addedItems,
    removedItems,
    editedDiscount,
    itemsForSave,
    locationId,
    currency,
    portalMeta,
    updateMutation,
    sendRevisionMutation,
    sendEstimateMutation,
    router,
  ]);

  if (isEdit && !editGuard.allowed) {
    return (
      <div className="rounded-lg border border-warning/50 bg-warning-bg/50 p-6">
        <p className="font-semibold text-warning">Cannot edit this quote</p>
        <p className="text-sm text-muted-foreground mt-2">
          {editBlockedMessage}
        </p>
        <Button asChild className="mt-4">
          <Link href={`/admin/estimates/${editEstimateId}`}>Open estimate</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={
                i === step
                  ? 'font-semibold text-primary'
                  : i < step
                    ? 'text-success'
                    : 'text-muted-foreground'
              }
            >
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          {isEdit && hasChanges && (
            <ChangeSummary
              originalTotal={originalTotal}
              newTotal={total}
              changedItems={changedItems}
              addedItems={addedItems}
              removedItems={removedItems}
              discount={editedDiscount}
              currency={currency}
            />
          )}
          <EstimateLineItemsEditor
            items={editedItems}
            discount={editedDiscount}
            currency={currency}
            subtotal={subtotal}
            total={total}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            onAddCustomItem={handleAddCustomItem}
            onApplyDiscount={handleApplyDiscount}
          />
        </>
      )}

      {step === 1 && !isEdit && (
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4 shadow-md">
          <div>
            <h2 className="text-lg font-semibold">Customer details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Creates or links a portal account for this email.
            </p>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Email <span className="text-destructive">*</span></span>
            <Input
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
              className="mt-1"
              placeholder="customer@example.com"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium">First name</span>
              <Input
                value={customer.firstName}
                onChange={(e) => setCustomer((c) => ({ ...c, firstName: e.target.value }))}
                className="mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Last name</span>
              <Input
                value={customer.lastName}
                onChange={(e) => setCustomer((c) => ({ ...c, lastName: e.target.value }))}
                className="mt-1"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Phone (optional)</span>
            <Input
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
              className="mt-1"
            />
          </label>
        </div>
      )}

      {step === 1 && isEdit && (
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-md">
          <h2 className="text-lg font-semibold">Customer</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Already linked to this quote — no changes needed here.
          </p>
          <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
            <p className="font-medium">{contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '—'}</p>
            <p className="text-muted-foreground">{contact.email || '—'}</p>
            {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
            <p className="text-xs text-muted-foreground pt-2">Estimate {editEstimateId}</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {!isEdit && (
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
              <p className="text-muted-foreground">{customer.email}</p>
            </div>
          )}
          <EstimateLineItemsEditor
            items={editedItems}
            discount={editedDiscount}
            currency={currency}
            subtotal={subtotal}
            total={total}
            readOnly
          />
          {!isEdit && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={sendNow} onCheckedChange={(v) => setSendNow(v === true)} />
              Send quote email to customer immediately
            </label>
          )}
          {isEdit && (
            <p className="text-sm text-muted-foreground">
              Saving will overwrite the quote in GHL. You can notify the customer that their quote has been updated.
            </p>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={goBack} disabled={isSaving}>
            ← Back
          </Button>
        ) : (
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/quotes">← Cancel</Link>
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto mr-2">
          {formatCurrencyAmount(total, currency)} AUD
        </span>

        {step < 2 && (
          <Button type="button" onClick={goNext}>
            Continue →
          </Button>
        )}

        {step === 2 && !isEdit && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreateSubmit(true)}
              disabled={isSaving}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() => handleCreateSubmit(false)}
              disabled={isSaving}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {isSaving ? 'Sending…' : sendNow ? 'Send to customer' : 'Create quote'}
            </Button>
          </>
        )}

        {step === 2 && isEdit && (
          <Button
            type="button"
            onClick={handleEditSaveClick}
            disabled={isSaving || !hasChanges}
          >
            Save changes
          </Button>
        )}
      </div>

      {isEdit && (
        <SaveEstimateModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onConfirm={handleConfirmEditSave}
          changedItems={changedItems}
          addedItems={addedItems}
          removedItems={removedItems}
          discount={editedDiscount}
          originalTotal={originalTotal}
          newTotal={total}
          currency={currency}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

QuickQuoteWizard.displayName = 'QuickQuoteWizard';
