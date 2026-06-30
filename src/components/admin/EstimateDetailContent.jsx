import { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { DEFAULT_CURRENCY } from "../../lib/admin/constants";
import { formatEstimateNumber } from "../../lib/admin/format-estimate-number";
import { getEstimateItemProductImage, proxyGhlImageUrl, rewriteGhlImagesInHtml, stripHtml } from "../../lib/admin/ghl-image";
import { parseWpFetchError } from "../../lib/admin/utils/error-handler";
import {
  getStatusDisplay,
  formatDateTime,
  formatDateOnly,
  formatCurrencyAmount,
} from "./EstimateDetailContent/helpers";
import { 
  useAdminEstimate, 
  useCreateInvoiceFromEstimate, 
  useSendEstimate,
  useUpdateEstimate,
  useUpdateItemsMeta,
  useCompleteReview,
  useRequestChanges,
  useSendRevisionNotification,
  useSyncEstimate,
  useDeleteEstimate
} from "../../lib/react-query/hooks/admin";
import { ViewInGhlButton } from "./ViewInGhlButton";
import { resolveGhlLocationId } from "../../lib/admin/ghl-links";
import { computeUIState } from "../../lib/portal/status-computer";
import { useEstimateLineItems } from "../../hooks/admin/useEstimateLineItems";
import { buildRevisionData, estimateWasSent } from "../../lib/admin/build-revision-data";
import { canEditEstimateLines } from "../../lib/admin/estimate-edit-guards";
import { useEstimatePhotos } from "../../lib/react-query/hooks/use-estimate-photos";
import { PhotoGallery } from "./PhotoGallery";
import { AddCustomItemModal } from "./AddCustomItemModal";
import { DiscountModal } from "./DiscountModal";
import { ChangeSummary } from "./ChangeSummary";
import { SaveEstimateModal } from "./SaveEstimateModal";
import { WorkflowStatusCard } from "./WorkflowStatusCard";
import { DeleteDialog } from "./DeleteDialog";
import { EditHistoryTimeline } from "./EditHistoryTimeline";
import JobDetailModal from "../servicem8/JobDetailModal";
import { toast } from "sonner";
import { Trash2, User, Mail, Phone, CheckCircle2, DollarSign, Calendar, Send } from "lucide-react";

// Admin per-line photo policy. Two options only.
//   required = customer must upload at least one photo.
//   optional = customer may upload but is not blocked from submitting.
// "Heading" is NOT user-selectable — package items are detected automatically
// at estimate creation time (see PortalService::buildInitialItemsMeta) and
// shown as a static "Package" label here instead of the dropdown.
const PHOTO_POLICIES = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
];

// Memoized table row component for performance
const EstimateTableRow = memo(function EstimateTableRow({
  item,
  idx,
  photoCount,
  productImage,
  isSelected,
  currency,
  isEditMode,
  itemQty,
  originalQtyForItem,
  onQuantityChange,
  onRemoveClick,
  onSelect,
  photoPolicy,
  photoPolicyPending,
  onPhotoPolicyChange,
}) {
  const itemName = item?.name || "Item";
  const hasImgInDesc = item?.description && /<img\s/i.test(item.description);
  const descriptionText = item?.description
    ? (productImage && hasImgInDesc ? stripHtml(item.description) : null)
    : null;
  const descriptionHtml = item?.description && !(productImage && hasImgInDesc)
    ? rewriteGhlImagesInHtml(item.description)
    : null;
  
  const rowClassName = useMemo(() => {
    if (isEditMode) {
      return "transition-all duration-200";
    }
    return `cursor-pointer transition-all duration-200 ${
      isSelected
        ? "bg-primary/10 ring-2 ring-primary/40 shadow-sm"
        : "hover:bg-muted/30 hover:shadow-sm"
    }`;
  }, [isSelected, isEditMode]);

  const handleRowClick = useCallback(() => {
    if (!isEditMode && onSelect) {
      if (isSelected) {
        onSelect(null);
      } else {
        onSelect({ ...item, name: itemName });
      }
    }
  }, [isEditMode, isSelected, item, itemName, onSelect]);

  return (
    <tr
      onClick={handleRowClick}
      className={rowClassName}
      role={!isEditMode ? "button" : undefined}
      tabIndex={!isEditMode ? 0 : undefined}
      aria-selected={!isEditMode ? isSelected : undefined}
      onKeyDown={!isEditMode ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      } : undefined}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {productImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxyGhlImageUrl(productImage)}
              alt=""
              className="h-10 w-10 shrink-0 rounded border border-border object-cover"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground flex items-center gap-2">
              {itemName}
              {item?.isCustom && (
                <span className="text-xs px-1.5 py-0.5 bg-success-bg text-success rounded font-semibold">NEW</span>
              )}
            </div>
            {descriptionText ? (
              <p className="text-xs text-muted-foreground">{descriptionText}</p>
            ) : null}
            {descriptionHtml ? (
              <div
                className="text-xs text-muted-foreground [&_img]:mt-1 [&_img]:max-h-20 [&_img]:rounded"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : null}
          </div>
          {!isEditMode && photoCount > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm border border-primary/30">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{photoCount}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {isEditMode ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(idx, -1);
              }}
              disabled={itemQty <= 1}
              variant="outline"
              size="icon-sm"
              className="w-7 h-7"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </Button>
            <span className="w-10 text-center font-medium text-foreground">{itemQty}</span>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onQuantityChange(idx, 1);
              }}
              disabled={itemQty >= (originalQtyForItem ?? 1) + 10}
              variant="outline"
              size="icon-sm"
              className="w-7 h-7"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>
        ) : (
          <div className="text-center text-sm text-foreground">{itemQty}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm text-foreground">
        {formatCurrencyAmount(item?.amount, currency)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
        {formatCurrencyAmount((Number(item?.amount) || 0) * itemQty, currency)}
      </td>
      <td className="px-2 py-3 text-center">
        {photoPolicy === "heading" ? (
          <span
            className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
            title="Package / bundle parent — hidden from the customer photo checklist automatically."
          >
            Package
          </span>
        ) : (
          <select
            value={photoPolicy}
            onChange={(e) => {
              e.stopPropagation();
              onPhotoPolicyChange?.(item?.name || "Item", e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={photoPolicyPending}
            aria-label={`Photo policy for ${item?.name || "item"}`}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {PHOTO_POLICIES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </td>
      {isEditMode && (
        <td className="px-4 py-3 text-center">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick(idx);
            }}
            variant="ghost"
            size="icon-sm"
            className="text-error hover:text-error/80"
            title="Remove item"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </td>
      )}
    </tr>
  );
});
EstimateTableRow.displayName = 'EstimateTableRow';

export const EstimateDetailContent = memo(function EstimateDetailContent({ estimateId, locationId, onInvoiceCreated }) {
  const effectiveLocationId = resolveGhlLocationId(locationId);
  const { data, isLoading, error, refetch } = useAdminEstimate({
    estimateId: estimateId || null,
    locationId: effectiveLocationId || undefined,
  });
  const syncEstimateMutation = useSyncEstimate();
  const didSyncFromGhl = useRef(null);

  // Pull latest line items from GHL when opening admin detail (snapshot may be stale after GHL edits).
  useEffect(() => {
    if (!estimateId) return;
    if (didSyncFromGhl.current === estimateId) return;
    didSyncFromGhl.current = estimateId;
    syncEstimateMutation.mutate(
      { estimateId, locationId: effectiveLocationId || undefined },
      { onSuccess: () => refetch() }
    );
  }, [estimateId, effectiveLocationId, syncEstimateMutation, refetch]);

  const createInvoiceMutation = useCreateInvoiceFromEstimate();
  const sendEstimateMutation = useSendEstimate();
  const updateEstimateMutation = useUpdateEstimate();
  const updateItemsMetaMutation = useUpdateItemsMeta();
  const completeReviewMutation = useCompleteReview();
  const requestChangesMutation = useRequestChanges();
  const sendRevisionMutation = useSendRevisionNotification(); // Separate hook for revision notifications
  const deleteEstimateMutation = useDeleteEstimate();
  const [pendingPhotoPolicyName, setPendingPhotoPolicyName] = useState(null);

  const estimate = data?.ok ? data : null;
  const hasInvoice = !!(estimate?.linkedInvoice || estimate?.portalMeta?.invoice?.id);
  
  // Row selection state (for photos)
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const lineItems = useEstimateLineItems({ trackChanges: isEditMode });
  const {
    initializeFromEstimate,
    resetEmpty,
    handleQuantityChange,
    handleRemoveItem: removeLineItemAt,
    handleAddCustomItem,
    handleApplyDiscount,
    validateItems,
    hasChanges,
    changedItems,
    addedItems,
    removedItems,
    editedDiscount,
    itemsForSave,
    total: lineItemsTotal,
  } = lineItems;
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState(null);
  const [deleteEstimateDialogOpen, setDeleteEstimateDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState('local');
  
  // ServiceM8 state
  const [jobLink, setJobLink] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [loadingJobLink, setLoadingJobLink] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  
  // Fetch photos to determine which items have photos
  const { data: photosData } = useEstimatePhotos({
    estimateId: estimateId || undefined,
    enabled: !!estimateId,
    initialData: estimate?.estimatePhotos,
  });
  
  // Calculate photo counts per item
  const itemPhotoCounts = useMemo(() => {
    if (!photosData?.ok) return {};
    
    const counts = {};
    const uploads = photosData.stored?.uploads || [];
    
    uploads.forEach((upload) => {
      const itemName = upload.itemName || "Unknown";
      counts[itemName] = (counts[itemName] || 0) + 1;
    });
    
    return counts;
  }, [photosData]);

  // Fetch ServiceM8 job link
  useEffect(() => {
    if (!estimateId) return;
    
    const fetchJobLink = async () => {
      setLoadingJobLink(true);
      try {
        const res = await fetch(`/api/servicem8/jobs/link?estimateId=${encodeURIComponent(estimateId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.link) {
            setJobLink(data.link);
            
            // Fetch job details if jobUuid exists
            if (data.link.jobUuid) {
              const jobRes = await fetch(`/api/servicem8/jobs/${data.link.jobUuid}`);
              if (jobRes.ok) {
                const jobData = await jobRes.json();
                if (jobData.ok) {
                  setJobData(jobData.job);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching job link:", err);
      } finally {
        setLoadingJobLink(false);
      }
    };
    
    fetchJobLink();
  }, [estimateId]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!isEditMode || !hasChanges) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditMode, hasChanges]);

  // Extract estimate data (safe even if estimate is null) - MUST be before any usage
  const contact = estimate?.contact || {};
  const items = isEditMode ? lineItems.editedItems : (estimate?.items || []);
  const portalMeta = estimate?.portalMeta || {};
  const canEditLines = canEditEstimateLines(portalMeta, hasInvoice);
  const linkedInvoice = estimate?.linkedInvoice;
  const currency = estimate?.currency || DEFAULT_CURRENCY;

  // Compute UI state from portal meta to get accurate status
  const uiState = useMemo(() => computeUIState(portalMeta), [portalMeta]);
  const displayStatus = uiState.displayStatus;
  const statusMessage = uiState.statusMessage;
  const statusDisplay = useMemo(() => getStatusDisplay(displayStatus), [displayStatus, getStatusDisplay]);

  // Memoize date formatting with validation
  const acceptedAtFormatted = useMemo(
    () => formatDateTime(portalMeta.acceptedAt),
    [portalMeta.acceptedAt]
  );
  const submittedAtFormatted = useMemo(
    () => formatDateTime(portalMeta.photos?.submitted_at),
    [portalMeta.photos?.submitted_at]
  );

  const originalTotal = estimate?.total || 0;
  const editTotal = lineItemsTotal;

  const handleEnterEditMode = useCallback(() => {
    initializeFromEstimate(estimate?.items || [], estimate?.discount || null);
    setIsEditMode(true);
  }, [estimate?.items, estimate?.discount, initializeFromEstimate]);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    resetEmpty();
  }, [resetEmpty]);

  const handleSaveClick = useCallback(() => {
    const err = validateItems();
    if (err) {
      toast.error(err);
      return;
    }
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }
    setShowSaveModal(true);
  }, [validateItems, hasChanges]);

  // Define handleSendEstimate before handleConfirmSave since it's used in handleConfirmSave's dependency array
  const handleSendEstimate = useCallback(async () => {
    // Prevent double-clicking or concurrent sends
    if (sendEstimateMutation.isPending) {
      return;
    }
    
    try {
      await sendEstimateMutation.mutateAsync({ estimateId, locationId });
      // Note: Toast is handled in the mutation hook's onSuccess handler
      // No refetch needed - mutation already invalidates queries
    } catch (err) {
      // Log error for debugging (toast is handled by hook's onError handler)
      console.error('Send estimate error:', err);
      // Prevent error from bubbling up to Next.js error boundary
      return;
    }
  }, [sendEstimateMutation, estimateId, locationId]);

  const handleConfirmSave = useCallback(async ({ adminNote, sendNotification }) => {
    try {
      const revisionData = buildRevisionData({
        adminNote,
        source: 'admin-edit',
        originalTotal,
        newTotal: editTotal,
        changedItems,
        addedItems,
        removedItems,
        discount: editedDiscount,
      });

      await updateEstimateMutation.mutateAsync({
        estimateId,
        locationId,
        items: itemsForSave(currency),
        discount: editedDiscount,
        revisionData,
      });

      setShowSaveModal(false);
      toast.success("Estimate updated successfully");
      setIsEditMode(false);
      resetEmpty();

      if (sendNotification) {
        const wasSent = estimateWasSent(portalMeta);
        try {
          if (wasSent) {
            await sendRevisionMutation.mutateAsync({
              estimateId,
              locationId,
              revisionNote: adminNote,
              revisionData,
            });
            toast.success("Customer notified of estimate update");
          } else {
            await sendEstimateMutation.mutateAsync({ estimateId, locationId });
            toast.success("Estimate sent to customer");
          }
        } catch (err) {
          const errorMessage = parseWpFetchError(err);
          toast.error(errorMessage || "Estimate saved but failed to notify customer", {
            duration: 6000,
          });
        }
      } else if (displayStatus !== 'ACCEPTED' && displayStatus !== 'REJECTED' && displayStatus !== 'INVOICE_READY') {
        toast.info("Don't forget to send the updated estimate to the customer!", {
          duration: 5000,
          action: {
            label: 'Send Now',
            onClick: () => handleSendEstimate()
          }
        });
      }
    } catch (err) {
      const errorMessage = parseWpFetchError(err);
      toast.error(errorMessage || "Failed to update estimate");
    }
  }, [
    originalTotal,
    editTotal,
    changedItems,
    addedItems,
    removedItems,
    editedDiscount,
    itemsForSave,
    currency,
    estimateId,
    locationId,
    portalMeta,
    updateEstimateMutation,
    sendRevisionMutation,
    resetEmpty,
    sendEstimateMutation,
    displayStatus,
    handleSendEstimate,
  ]);

  const handleRemoveItem = useCallback((index) => {
    removeLineItemAt(index);
    setDeleteItemDialogOpen(false);
    setItemToDeleteIndex(null);
  }, [removeLineItemAt]);

  const handleRemoveItemClick = useCallback((index) => {
    setItemToDeleteIndex(index);
    setDeleteItemDialogOpen(true);
  }, []);

  const handleRowSelect = useCallback((item) => {
    if (!isEditMode) {
      if (selectedItem?.name === item?.name) {
        setSelectedItem(null);
      } else {
        setSelectedItem(item);
      }
    }
  }, [isEditMode, selectedItem]);

  // Memoize modal handlers to prevent unnecessary re-renders
  const handleShowAddItemModal = useCallback(() => {
    setShowAddItemModal(true);
  }, []);

  const handleShowDiscountModal = useCallback(() => {
    setShowDiscountModal(true);
  }, []);

  // Memoize filtered items array to prevent re-filtering on every render
  const filteredItems = useMemo(() => {
    return (items || []).filter(item => item != null);
  }, [items]);

  // Resolve the per-line photo policy from portalMeta.itemsMeta with sensible defaults.
  // Order: explicit isHeading -> explicit photoRequired -> isCustom defaults to optional -> required.
  const itemsMeta = useMemo(() => portalMeta.itemsMeta || {}, [portalMeta.itemsMeta]);
  const resolvePhotoPolicy = useCallback((item) => {
    const name = item?.name || "";
    const meta = itemsMeta[name] || {};
    if (meta.isHeading) return "heading";
    if (typeof meta.photoRequired === "boolean") {
      return meta.photoRequired ? "required" : "optional";
    }
    if (item?.isCustom || meta.isCustom) return "optional";
    return "required";
  }, [itemsMeta]);

  const handlePhotoPolicyChange = useCallback((itemName, nextPolicy) => {
    if (!itemName || !estimateId) return;
    // Headings are auto-detected and not user-selectable from this dropdown,
    // so we never write isHeading here. We only flip photoRequired so the
    // server-side isHeading flag is preserved as-is via deep-merge.
    const payload = { name: itemName, photoRequired: nextPolicy === "required" };

    setPendingPhotoPolicyName(itemName);
    updateItemsMetaMutation.mutate(
      { estimateId, items: [payload] },
      {
        onSuccess: () => {
          toast.success("Photo policy saved", {
            description: `${itemName} → ${nextPolicy}`,
            duration: 1800,
          });
        },
        onError: (err) => {
          toast.error("Failed to save photo policy", {
            description: err?.message || "Please try again.",
          });
        },
        onSettled: () => {
          setPendingPhotoPolicyName(null);
        },
      },
    );
  }, [estimateId, updateItemsMetaMutation]);

  // Memoize created date formatting
  const createdAtFormatted = useMemo(
    () => formatDateOnly(estimate?.createdAt, "N/A"),
    [estimate?.createdAt]
  );

  // Memoize status icon component logic
  const statusIcon = useMemo(() => {
    switch (displayStatus) {
      case 'ESTIMATE_SENT':
        return <Send className="h-3 w-3" />;
      case 'ACCEPTED':
      case 'INVOICE_READY':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'REJECTED':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return null;
    }
  }, [displayStatus]);

  const statusIconLarge = useMemo(() => {
    switch (displayStatus) {
      case 'ESTIMATE_SENT':
        return <Send className="h-4 w-4 text-warning" />;
      case 'ACCEPTED':
      case 'INVOICE_READY':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'REJECTED':
        return <CheckCircle2 className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  }, [displayStatus]);

  const handleCreateInvoice = useCallback(async () => {
    try {
      const result = await createInvoiceMutation.mutateAsync({ estimateId, locationId });
      toast.success("Invoice created successfully");
      // Note: No refetch needed - mutation already invalidates queries
      if (onInvoiceCreated) {
        onInvoiceCreated(result);
      }
    } catch (err) {
      const errorMessage = parseWpFetchError(err);
      toast.error(errorMessage || "Failed to create invoice");
    }
  }, [createInvoiceMutation, estimateId, locationId, onInvoiceCreated]);

  const handleCreateServiceM8Job = useCallback(async () => {
    if (!estimateId) {
      toast.error("Estimate ID is required");
      return;
    }
    
    // Try to get locationId from multiple sources, but let backend resolve if missing
    const effectiveLocationId = locationId || estimate?.locationId || estimate?.altId || estimate?.location_id || null;
    
    setCreatingJob(true);
    try {
      const res = await fetch("/api/servicem8/jobs/create-from-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId,
          ...(effectiveLocationId ? { locationId: effectiveLocationId } : {}),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create ServiceM8 job");
      }
      
      toast.success(data.alreadyExists ? "Job already exists" : "ServiceM8 job created successfully");
      
      // Refresh job link and data
      if (data.jobUuid) {
        const linkRes = await fetch(`/api/servicem8/jobs/link?estimateId=${encodeURIComponent(estimateId)}`);
        if (linkRes.ok) {
          const linkData = await linkRes.json();
          if (linkData.ok && linkData.link) {
            setJobLink(linkData.link);
            
            const jobRes = await fetch(`/api/servicem8/jobs/${data.jobUuid}`);
            if (jobRes.ok) {
              const jobData = await jobRes.json();
              if (jobData.ok) {
                setJobData(jobData.job);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error creating ServiceM8 job:", err);
      toast.error(err.message || "Failed to create ServiceM8 job");
    } finally {
      setCreatingJob(false);
    }
  }, [estimateId, locationId, estimate?.locationId, estimate?.altId, estimate?.location_id]);

  const handleCompleteReview = useCallback(async () => {
    try {
      await completeReviewMutation.mutateAsync({ estimateId, locationId });
      // Note: Toast is handled in the mutation hook's onSuccess handler
      // No refetch needed - mutation already invalidates queries
    } catch (err) {
      const errorMessage = parseWpFetchError(err);
      toast.error(errorMessage || "Failed to complete review");
    }
  }, [completeReviewMutation, estimateId, locationId]);

  const handleRequestChanges = useCallback(async (reason = '') => {
    try {
      await requestChangesMutation.mutateAsync({ estimateId, locationId, reason });
      toast.success("Changes requested. Customer can now resubmit photos.");
      // Note: No refetch needed - mutation already invalidates queries
    } catch (err) {
      const errorMessage = parseWpFetchError(err);
      toast.error(errorMessage || "Failed to request changes");
    }
  }, [requestChangesMutation, estimateId, locationId]);

  const handleViewServiceM8Job = useCallback(async () => {
    const jobUuid = jobLink?.jobUuid || jobData?.uuid;
    if (!jobUuid) {
      toast.error("Job UUID not found");
      return;
    }
    
    // Fetch latest job data if not already loaded or if different UUID
    if (!jobData || jobData.uuid !== jobUuid) {
      try {
        const jobRes = await fetch(`/api/servicem8/jobs/${jobUuid}`);
        if (jobRes.ok) {
          const jobDataRes = await jobRes.json();
          if (jobDataRes.ok) {
            setJobData(jobDataRes.job);
          }
        }
      } catch (err) {
        console.error("Error fetching job data:", err);
        toast.error("Failed to load job details");
        return;
      }
    }
    
    setJobModalOpen(true);
  }, [jobLink?.jobUuid, jobData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="rounded-md border border-error/30 bg-error-bg p-4 text-sm text-error">
        <p className="font-semibold">Error loading estimate</p>
        <p className="mt-1">{error?.message || "Estimate not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header — horizontal strip (UI only; all data bindings unchanged) */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {/* Estimate number */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Estimate number</p>
            <p className="mt-1 truncate text-xl font-bold tracking-tight text-neutral-900">{formatEstimateNumber(estimate?.estimateNumber, { fallbackId: estimateId }) || estimateId}</p>
            <p className="truncate text-xs text-neutral-400">ID: {estimateId}</p>
          </div>

          {/* Status */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Status</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={statusDisplay.variant} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold">
                {statusIcon}
                {statusDisplay.label}
              </Badge>
            </div>
            {portalMeta.workflow?.status === 'ready_to_accept' && portalMeta.quote?.acceptance_enabled && (
              <p className="mt-1 text-xs text-neutral-500">Awaiting acceptance</p>
            )}
            {portalMeta.quote?.revisionNumber != null && portalMeta.quote.revisionNumber > 0 && (
              <p className="text-xs text-neutral-400">Revision {portalMeta.quote.revisionNumber}</p>
            )}
          </div>

          {/* Title */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Title</p>
            <p className="mt-1 font-semibold text-neutral-900">{estimate?.title || "ESTIMATE"}</p>
          </div>

          {/* Customer */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Customer</p>
            <p className="mt-1 truncate font-semibold text-neutral-900">{contact.name || "N/A"}</p>
            {contact.email && <p className="truncate text-xs text-neutral-500">{contact.email}</p>}
            {contact.phone && <p className="truncate text-xs text-neutral-500">{contact.phone}</p>}
          </div>

          {/* Total */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total ({currency})</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-neutral-900">
              {formatCurrencyAmount(isEditMode ? editTotal : originalTotal, currency)}
            </p>
            {portalMeta.photos?.submission_status === 'submitted' && (
              <p className="text-xs text-neutral-400">
                {portalMeta.photos.total || 0} photo{(portalMeta.photos.total || 0) !== 1 ? 's' : ''} submitted
              </p>
            )}
          </div>

          {/* Created / Accepted */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Created</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">{createdAtFormatted}</p>
            {acceptedAtFormatted && (
              <p className="text-xs text-emerald-600">Accepted: {acceptedAtFormatted}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Items (Left 70%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Edit Mode Controls */}
          {!isEditMode && canEditLines.allowed && (
            <div className="rounded-xl border border-info/30 bg-info-bg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-info">Ready for Review</p>
                    <p className="text-sm text-info">
                      {displayStatus === 'ACCEPTED' || displayStatus === 'INVOICE_READY'
                        ? 'Customer accepted and submitted photos. You can still adjust based on photos. Re-send estimate if you make changes.'
                        : portalMeta.photos?.submission_status === 'submitted'
                        ? 'Customer submitted photos. Review and adjust pricing, then send updated estimate to customer for acceptance.'
                        : 'Estimate is ready. You can edit and adjust pricing before sending to customer.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    asChild
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    <Link href={`/admin/quotes/edit/${estimateId}`}>Quick Quote</Link>
                  </Button>
                  <Button
                    onClick={handleEnterEditMode}
                    variant="gradient"
                    className="whitespace-nowrap"
                  >
                    Edit Estimate
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Info banner when invoice already created */}
          {hasInvoice && portalMeta.photos?.submission_status === 'submitted' && (
            <div className="rounded-xl border border-warning/30 bg-warning-bg p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-warning">Invoice Created</p>
                  <p className="text-sm text-warning">
                    An invoice has already been created for this estimate. To make changes, edit the estimate in GHL and create a new invoice.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Change Summary (only in edit mode) */}
          {isEditMode && (
            <ChangeSummary
              originalTotal={originalTotal}
              newTotal={editTotal}
              changedItems={changedItems}
              addedItems={addedItems}
              removedItems={removedItems}
              discount={editedDiscount}
              currency={currency}
            />
          )}

          {/* Line Items Table */}
          <div className="rounded-xl border border-border/60 bg-card p-7 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
              {isEditMode && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleShowAddItemModal}
                    variant="default"
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </Button>
                  <Button
                    onClick={handleShowDiscountModal}
                    variant="default"
                    size="sm"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Discount/Fee
                  </Button>
                </div>
              )}
            </div>
            
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Item</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Total</th>
                      <th
                        className="px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
                        title="Heading lines are hidden from the customer photo checklist. Required = customer must upload, Optional = they may."
                      >
                        Photo
                      </th>
                      {isEditMode && (
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredItems.map((item, idx) => {
                      const itemName = item?.name || "Item";
                      const photoCount = itemPhotoCounts[itemName] || 0;
                      const itemQty = item?.qty || item?.quantity || 1;
                      const isSelected = !isEditMode && selectedItem?.name === itemName;
                      const orig = isEditMode && item?.id ? lineItems.originalItemsById[item.id] : null;
                      const originalQtyForItem = orig ? (orig.qty ?? orig.quantity ?? 1) : undefined;
                      
                      const itemPolicy = resolvePhotoPolicy(item);
                      const policyPending = pendingPhotoPolicyName === itemName;
                      const productImage = getEstimateItemProductImage(item, itemsMeta);
                      return (
                        <EstimateTableRow
                          key={item?.id || idx}
                          item={item}
                          idx={idx}
                          photoCount={photoCount}
                          productImage={productImage}
                          isSelected={isSelected}
                          currency={currency}
                          isEditMode={isEditMode}
                          itemQty={itemQty}
                          originalQtyForItem={originalQtyForItem}
                          onQuantityChange={handleQuantityChange}
                          onRemoveClick={handleRemoveItemClick}
                          onSelect={handleRowSelect}
                          photoPolicy={itemPolicy}
                          photoPolicyPending={policyPending}
                          onPhotoPolicyChange={handlePhotoPolicyChange}
                        />
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-border/60">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-foreground">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatCurrencyAmount(isEditMode ? editTotal : originalTotal, currency)}
                      </td>
                      <td></td>
                      {isEditMode && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Save/Cancel Buttons */}
            {isEditMode && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-border/60">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveClick}
                  disabled={updateEstimateMutation.isPending}
                  variant="gradient"
                  className="flex-1"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Right 30%) - Keep existing sidebar code */}
        <div className="space-y-4">
          {/* Workflow Status Card - NEW */}
          {portalMeta.workflow?.status && (
            <WorkflowStatusCard
              workflow={portalMeta.workflow}
              booking={portalMeta.booking}
              payment={portalMeta.payment}
            />
          )}

          {/* Edit History Timeline */}
          <EditHistoryTimeline
            revisionHistory={portalMeta.revisionHistory}
            revision={portalMeta.revision}
            currency={currency}
          />

          {/* Portal Meta */}
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Portal Status</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="font-medium text-foreground">{statusDisplay.label}</span>
              </div>
              {acceptedAtFormatted && (
                <div>
                  <span className="text-muted-foreground">Accepted:</span>{" "}
                  <span className="font-medium text-foreground">
                    {acceptedAtFormatted}
                  </span>
                </div>
              )}
              {portalMeta.photos && (
                <div>
                  <span className="text-muted-foreground">Photos:</span>{" "}
                  {portalMeta.photos.submission_status === 'submitted' ? (
                    <span className="font-medium text-success inline-flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Submitted ({portalMeta.photos.total || 0} photos)
                    </span>
                  ) : (
                    <span className="font-medium text-muted-foreground">Pending</span>
                  )}
                </div>
              )}
              {submittedAtFormatted && (
                <div>
                  <span className="text-muted-foreground">Submitted:</span>{" "}
                  <span className="font-medium text-foreground">
                    {submittedAtFormatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Invoice */}
          {linkedInvoice && (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Linked Invoice</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Number:</span>{" "}
                  <span className="font-medium text-foreground">{linkedInvoice?.number || linkedInvoice?.invoiceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant={
                      linkedInvoice?.status === "paid" ? "success" :
                      linkedInvoice?.status === "draft" ? "default" :
                      "warning"
                    }
                    className="text-xs font-medium"
                  >
                    {linkedInvoice?.status || "draft"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount Due:</span>{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrencyAmount((linkedInvoice?.amountDue ?? 0) || 0, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Linked ServiceM8 Job */}
          {loadingJobLink ? (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">ServiceM8 Job</h3>
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : jobLink && jobData ? (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Linked ServiceM8 Job</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Job Number:</span>{" "}
                  <span className="font-medium text-foreground">{jobData?.job_number || jobData?.jobNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                      jobData?.status === "Completed" ? "bg-green-500/10 text-green-600 border-green-500/20" :
                      jobData?.status === "In Progress" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                      jobData?.status === "Scheduled" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                      "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }`}
                  >
                    {jobData?.status || jobData?.job_status || "Unknown"}
                  </Badge>
                </div>
                {jobData?.assigned_to_staff_name && (
                  <div>
                    <span className="text-muted-foreground">Assigned To:</span>{" "}
                    <span className="font-medium text-foreground">{jobData.assigned_to_staff_name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Actions</h3>
            <div className="space-y-2">
              {estimate?.id && (
                <ViewInGhlButton
                  estimateId={estimate.id}
                  locationId={effectiveLocationId}
                  estimate={estimate}
                />
              )}
              {/* Single Admin Button - "Send Estimate" or "Finish" */}
              {portalMeta && (() => {
                const uiState = computeUIState(portalMeta);
                const showFinish = uiState.adminCanFinish;
                const showSend = uiState.adminCanSendEstimate;
                
                // Don't show button if neither state is active
                if (!showFinish && !showSend) {
                  return null;
                }
                
                return (
                  <>
                    {/* Single button: "Send Estimate" or "Finish" */}
                    <button
                      onClick={showFinish ? handleCompleteReview : handleSendEstimate}
                      disabled={showFinish ? completeReviewMutation.isPending : sendEstimateMutation.isPending}
                      className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ 
                        backgroundColor: 'hsl(280, 45%, 50%)',
                        // Matte texture: no shadows, flat appearance
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'hsl(280, 45%, 47%)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'hsl(280, 45%, 50%)';
                      }}
                    >
                      {showFinish ? (
                        completeReviewMutation.isPending ? (
                          <>
                            <Spinner size="sm" />
                            Finishing...
                          </>
                        ) : (
                          "Finish"
                        )
                      ) : (
                        sendEstimateMutation.isPending ? (
                          "Sending..."
                        ) : (
                          "Send Estimate"
                        )
                      )}
                    </button>
                    
                    {/* Request Changes - Secondary action (only when photos required) */}
                    {uiState.adminCanRequestChanges && (
                      <Button
                        onClick={() => handleRequestChanges()}
                        disabled={requestChangesMutation.isPending}
                        variant="outline"
                        className="w-full border-amber-500 text-amber-700 hover:bg-amber-50"
                      >
                        {requestChangesMutation.isPending ? (
                          <>
                            <Spinner size="sm" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Request Changes / More Photos
                          </>
                        )}
                      </Button>
                    )}
                  </>
                );
              })()}
              {!hasInvoice && (displayStatus === 'ACCEPTED' || displayStatus === 'INVOICE_READY') && (
                <Button
                  onClick={handleCreateInvoice}
                  disabled={createInvoiceMutation.isPending}
                  variant="default"
                  className="w-full"
                >
                  {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              )}
              
              {/* ServiceM8 Actions */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                {!jobLink ? (
                  <Button
                    onClick={handleCreateServiceM8Job}
                    disabled={creatingJob || !estimateId || isLoading || !estimate}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-700 hover:bg-blue-50"
                  >
                    {creatingJob ? (
                      <>
                        <Spinner size="sm" />
                        Creating Job...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create ServiceM8 Job
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleViewServiceM8Job}
                    disabled={!jobLink?.jobUuid}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-700 hover:bg-blue-50"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View/Manage ServiceM8 Job
                  </Button>
                )}
              </div>
              <div className="pt-2 border-t border-border/60">
                <Button
                  onClick={() => setDeleteEstimateDialogOpen(true)}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Estimate
                </Button>
              </div>
            </div>
          </div>

          {/* Photo Gallery */}
          <PhotoGallery
            estimateId={estimateId}
            items={estimate?.items || []}
            selectedItem={selectedItem}
            portalMeta={portalMeta}
          />
        </div>
      </div>

      {/* Modals */}
      <AddCustomItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAdd={handleAddCustomItem}
        currency={currency}
      />

      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        currentDiscount={editedDiscount}
        estimateTotal={lineItems.subtotal}
        currency={currency}
      />

      <SaveEstimateModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={handleConfirmSave}
        changedItems={changedItems}
        addedItems={addedItems}
        removedItems={removedItems}
        discount={editedDiscount}
        originalTotal={originalTotal}
        newTotal={editTotal}
        currency={currency}
        isSaving={updateEstimateMutation.isPending}
      />

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDeleteIndex !== null && handleRemoveItem(itemToDeleteIndex)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Estimate Dialog */}
      <DeleteDialog
        open={deleteEstimateDialogOpen}
        onOpenChange={setDeleteEstimateDialogOpen}
        onConfirm={async () => {
          try {
            await deleteEstimateMutation.mutateAsync({
              estimateId,
              locationId: locationId || estimate?.locationId,
              scope: deleteScope,
            });
          } catch (err) {
            // Error already handled in mutation
          }
        }}
        title="Delete Estimate"
        description={`Are you sure you want to delete estimate #${formatEstimateNumber(estimate?.estimateNumber, { fallbackId: estimateId }) || estimateId}? This action cannot be undone.`}
        itemName={`estimate #${formatEstimateNumber(estimate?.estimateNumber, { fallbackId: estimateId }) || estimateId}`}
        isLoading={deleteEstimateMutation.isPending}
        showScopeSelection={true}
        scope={deleteScope}
        onScopeChange={setDeleteScope}
      />

      {/* ServiceM8 Job Detail Modal */}
      {jobData && (
        <JobDetailModal
          job={jobData}
          open={jobModalOpen}
          onClose={() => {
            setJobModalOpen(false);
            // Optionally refresh job data when closing
            if (jobLink?.jobUuid) {
              fetch(`/api/servicem8/jobs/${jobLink.jobUuid}`)
                .then(res => res.json())
                .then(data => {
                  if (data.ok) {
                    setJobData(data.job);
                  }
                })
                .catch(err => console.error("Error refreshing job:", err));
            }
          }}
        />
      )}
    </div>
  );
});
EstimateDetailContent.displayName = 'EstimateDetailContent';

