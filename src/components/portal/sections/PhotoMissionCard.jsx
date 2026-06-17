import { Camera, Check, AlertCircle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "../../ui/button";
import { useEstimate, useEstimatePhotos } from "../../../lib/react-query/hooks";
import { ProductListCard, UploadModal, ProgressBar, calculateProgress, groupPhotosByProduct, validateAllProducts } from "../photo-upload";
import { Spinner } from "../../ui/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getWpNonceSafe } from "../../../lib/api/get-wp-nonce";

/**
 * Photo Mission Card - Shows product list with upload status
 * Click product → Opens modal directly (no drawer)
 */
export function PhotoMissionCard({
  photoItems,
  estimateId,
  locationId,
  view,
  onLaunchCamera,
  onOpenPhotoManager,
}) {
  const isGuestMode = view?.isGuestMode ?? false;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Check submission status (prioritize server data for persistence after reload)
  const submissionStatus = view?.photos?.submission_status;
  const isSubmitted = submissionStatus === 'submitted' || localSubmitted;
  const submittedAt = view?.photos?.submitted_at;

  // Fetch estimate items
  const { data: estimateData, isLoading } = useEstimate({
    estimateId,
    locationId,
    enabled: !!estimateId,
  });

  // Fetch photos
  const { data: photosData } = useEstimatePhotos({
    estimateId,
    enabled: !!estimateId,
  });

  // Build product list from estimate items
  // Uses photoRequired flag to determine if customer needs to upload photos
  // itemsMeta from portal status contains photoRequired for custom items added by admin
  const itemsMeta = view?.itemsMeta || {};
  
  const products = useMemo(() => {
    if (!estimateData?.ok || !estimateData.items) return [];

    const photosByProduct = groupPhotosByProduct(photosData?.stored?.uploads || []);

    // Group estimate items by name
    // Skip bundle parents / section headings (admin override `isHeading: true`)
    // and resolve photoRequired with the same precedence as PhotoUploadView.
    const grouped = {};
    estimateData.items.forEach(item => {
      const name = item.name || 'Unknown Item';
      const metaForItem = itemsMeta[name];

      if (metaForItem?.isHeading) return;

      const itemRequiresPhoto = metaForItem
        ? (typeof metaForItem.photoRequired === 'boolean'
            ? metaForItem.photoRequired
            : !(item.isCustom || metaForItem.isCustom))
        : (item.photoRequired !== false && !item.isCustom);
      
      if (!grouped[name]) {
        grouped[name] = {
          name,
          quantity: 0,
          required: itemRequiresPhoto, // Use item's photoRequired flag
          photos: [],
          note: '',
          skipReason: '',
          status: 'pending',
          isCustom: item.isCustom || false,
        };
      } else {
        // If any item with this name requires photos, mark as required
        grouped[name].required = grouped[name].required || itemRequiresPhoto;
      }
      grouped[name].quantity += item.qty || item.quantity || 1;
    });

    // Add photos to each product and determine status
    Object.keys(grouped).forEach(name => {
      if (photosByProduct[name]) {
        const allPhotos = Object.values(photosByProduct[name]).flat();
        grouped[name].photos = allPhotos;
        grouped[name].status = allPhotos.length > 0 ? 'ready' : 'pending';
      }
      // For optional items (required: false), auto-set status to ready if no photos needed
      if (!grouped[name].required && grouped[name].status === 'pending') {
        grouped[name].status = 'optional';
      }
    });

    return Object.values(grouped);
  }, [estimateData, photosData, itemsMeta]);

  // Calculate progress
  const progress = useMemo(() => calculateProgress(products), [products]);
  
  // Validate completion
  const validation = useMemo(() => validateAllProducts(products), [products]);

  const handleSubmitPhotos = async () => {
    if (!validation.isComplete) {
      setShowValidation(true);
      toast.error('Incomplete', {
        description: `${validation.incompleteCount} required item${validation.incompleteCount !== 1 ? 's' : ''} need photos or to be skipped.`,
        duration: 4000,
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const nonce = await getWpNonceSafe({ inviteToken: view?.account?.inviteToken, estimateId }).catch((err) => {
        const msg = err?.code === 'AUTH_REQUIRED'
          ? 'Session expired. Please log in again.'
          : (err?.message || 'Failed to submit photos.');
        toast.error('Submission failed', { description: msg });
        return null;
      });
      if (!nonce) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/portal/submit-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce || '' },
        credentials: 'include',
        body: JSON.stringify({ 
          estimateId, 
          locationId,
          inviteToken: view?.account?.inviteToken || '' 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.err || errorData.error || 'Submission failed');
      }

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(result.err || result.error || 'Submission failed');
      }

      // Instant UI feedback
      setLocalSubmitted(true);
      
      // Background refetch of portal status
      // Use await to ensure refetch completes before showing success toast
      await queryClient.refetchQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'portal-status' && 
                 query.queryKey[1] === estimateId;
        },
      }).catch(err => {
        console.error('[PhotoMissionCard] Refetch failed:', err);
      });
      
      toast.success('Photos submitted successfully', {
        description: `${result.photo_count || 0} photos sent to the installation team.`,
        duration: 4000,
      });
      
    } catch (error) {
      toast.error('Submission failed', {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner size="md" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  // Mock admin photo requests - will be replaced with real data later
  const adminPhotoRequests = [
    "Please upload photo of existing alarm system",
    "Front door frame for sensor placement",
  ];

  return (
    <>
      <div className="rounded-xl border-2 border-border bg-surface p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-100 to-teal-100">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-foreground">Photo Upload System</h3>
              <p className="text-xs text-muted-foreground">With limits & admin photo requests</p>
            </div>
          </div>
          {onOpenPhotoManager && !isGuestMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPhotoManager}
              className="shrink-0 rounded-full"
            >
              Open photo manager
            </Button>
          )}
        </div>

        {/* Admin Photo Requests Banner - Compact */}
        {adminPhotoRequests.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-900 mb-1">Admin Photo Requests</p>
                <div className="space-y-1">
                  {adminPhotoRequests.map((request, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-800">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{request}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submission Status */}
        {isSubmitted && (
          <div className="mb-3 bg-success-bg border border-success/30 rounded-xl p-3">
            <p className="text-sm text-success font-medium flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Photos submitted {submittedAt && (() => {
                try {
                  const date = new Date(submittedAt);
                  if (!isNaN(date.getTime())) {
                    return `on ${date.toLocaleDateString()}`;
                  }
                } catch {}
                return null;
              })()}
            </p>
            <p className="text-xs text-success mt-1">
              You can still edit. Click a product to add or replace photos.
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {products.length > 0 && (
          <div className="mb-4">
            <ProgressBar 
              completed={progress.completed}
              total={progress.total}
              percent={progress.percent}
            />
          </div>
        )}

        {/* Product List - Compact */}
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {products.length > 0 ? (
            products.map((product) => {
              const hasError = showValidation && product.required && product.status === 'pending';
              return (
                <ProductListCard
                  key={product.name}
                  product={product}
                  onClick={() => !isGuestMode && setSelectedProduct(product)}
                  hasError={hasError}
                  disabled={isGuestMode}
                />
              );
            })
          ) : (
            <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
              No products found
            </div>
          )}
        </div>

        {/* Submit Button - At bottom of card */}
        {products.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-center mb-3">
              {validation.isComplete ? (
                <p className="text-xs font-medium text-success flex items-center justify-center gap-1">
                  <Check size={14} /> All required items are ready
                </p>
              ) : (
                <p className="text-xs font-medium text-warning flex items-center justify-center gap-1">
                  <AlertCircle size={14} /> {validation.incompleteCount} required item{validation.incompleteCount !== 1 ? 's' : ''} need attention
                </p>
              )}
            </div>
            
            {isGuestMode ? (
              <div className="w-full py-4 rounded-full bg-muted text-muted-foreground text-center text-sm font-medium">
                Please create an account to submit photos
              </div>
            ) : (
              <Button
                onClick={handleSubmitPhotos}
                disabled={!validation.isComplete || isSubmitting}
                variant={validation.isComplete ? "gradient" : "outline"}
                className="w-full py-3 rounded-xl font-semibold"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Submitting...
                  </>
                ) : isSubmitted ? (
                  "Resubmit photos"
                ) : (
                  "Submit all photos"
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal - Opens directly from portal */}
      {selectedProduct && (
        <UploadModal
          product={selectedProduct}
          estimateId={estimateId}
          locationId={locationId}
          view={view}
          onClose={() => setSelectedProduct(null)}
          onSave={(updatedProduct) => {
            setSelectedProduct(null);
            // React Query will auto-refetch and update the UI
          }}
        />
      )}
    </>
  );
}
