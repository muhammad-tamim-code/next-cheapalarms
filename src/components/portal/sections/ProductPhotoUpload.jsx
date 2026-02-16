import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Camera, Image, X, Eye, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../../ui/button";
import { useEstimate, useEstimatePhotos, useStoreEstimatePhotos } from "../../../lib/react-query/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "../../ui/spinner";
import { Skeleton } from "../../ui/skeleton";
import { getErrorMessage } from "../../../lib/api/error-messages";
import { toast } from "sonner";
import { startUploadSession, uploadFile, compressImage, getCurrentSession } from "../../../lib/uploadApi";

const MAX_PHOTOS_PER_SLOT = 2;

// Detect if device is mobile
function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Individual slot component - compact design
function ProductSlot({ 
  productName, 
  slotIndex, 
  photos, 
  canAddMore, 
  estimateId, 
  locationId,
  onUploadComplete,
  onError,
  registerSlotRef,
  registerFileInputRef,
  registerCameraInputRef,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  // Detect mobile after mount to avoid SSR hydration mismatch
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(isMobileDevice()); }, []);
  const queryClient = useQueryClient();
  const storePhotosMutation = useStoreEstimatePhotos();

  const handleFileSelect = useCallback(
    async (file) => {
      if (!file) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!file.type.startsWith("image/") || !allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Invalid file type', {
          description: `${file.name} is not supported. Please use JPG, PNG, GIF, or WEBP.`,
        });
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error('File too large', {
          description: `${file.name} is ${sizeMB}MB. Maximum size is 10MB.`,
        });
        return;
      }

      // Set uploading state
      setUploading(true);
      setUploadState('uploading');
      setUploadProgress(0);
      
      try {
        // Ensure upload session exists
        // FIX: Pass estimateId to getCurrentSession for Map-based session lookup
        let session = getCurrentSession(estimateId);
        const now = Date.now() / 1000;
        const isSessionExpired = session?.exp != null && 
                                 session.exp !== 0 && 
                                 typeof session.exp === 'number' &&
                                 session.exp < now;
        
        if (!session || session.estimateId !== estimateId || isSessionExpired) {
          setUploadProgress(10);
          session = await startUploadSession(estimateId, locationId);
        }

        // Compress image
        setUploadProgress(20);
        const compressedFile = await compressImage(file);

        // Get existing photos to calculate correct photoIndex
        const cachedPhotos = queryClient.getQueryData(['estimate-photos', estimateId]);
        const existingUploads = (cachedPhotos?.ok && cachedPhotos?.stored?.uploads) 
          ? cachedPhotos.stored.uploads 
          : [];

        const existingInSlot = existingUploads.filter(
          p => p.itemName === productName && p.slotIndex === slotIndex
        );

        // Prepare metadata
        const photoIndex = existingInSlot.length + 1;
        const metadata = {
          itemName: productName,
          slotIndex: slotIndex,
          photoIndex: photoIndex,
          label: `${productName} #${slotIndex} - Photo ${photoIndex}`,
        };

        // Upload file with progress tracking
        // FIX: Pass estimateId as 5th parameter for proper session lookup
        const uploadResult = await uploadFile(compressedFile, metadata, (progressData) => {
          setUploadProgress(20 + (progressData.progress * 0.6)); // 20-80%
        }, null, estimateId);

        // Store photo metadata
        setUploadProgress(90);
        const photoMetadata = {
          url: uploadResult.url,
          attachmentId: uploadResult.attachmentId,
          filename: compressedFile.name,
          label: metadata.label,
          itemName: productName,
          slotIndex: slotIndex,
          photoIndex: photoIndex,
        };

        const allUploads = [...existingUploads, photoMetadata];

        await storePhotosMutation.mutateAsync({
          estimateId,
          locationId,
          uploads: allUploads,
        });

        // Force cache refresh
        setUploadProgress(100);
        await queryClient.invalidateQueries(['estimate-photos', estimateId]);
        await queryClient.refetchQueries(['estimate-photos', estimateId]);

        // Show success
        setUploadState('success');
        toast.success('Photo uploaded', {
          description: `${productName} #${slotIndex} - ${compressedFile.name}`,
          duration: 3000,
        });
        
        setTimeout(() => {
          setUploadState('idle');
          setUploadProgress(0);
        }, 1500);

        onUploadComplete?.([photoMetadata]);
      } catch (error) {
        setUploadState('error');
        const errorMsg = error.message || 'Upload failed';
        toast.error('Upload failed', {
          description: errorMsg,
          duration: 5000,
        });
        
        setTimeout(() => {
          setUploadState('idle');
          setUploadProgress(0);
        }, 2000);
        
        onError?.(errorMsg);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
      }
    },
    [productName, slotIndex, estimateId, locationId, queryClient, storePhotosMutation, onUploadComplete, onError]
  );

  const handleFileInput = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDeletePhotoClick = useCallback((photo) => {
    setPhotoToDelete(photo);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeletePhoto = useCallback(
    async () => {
      if (!photoToDelete) return;

      try {
        // Get current photos from cache
        const cachedPhotos = queryClient.getQueryData(['estimate-photos', estimateId]);
        const existingUploads = (cachedPhotos?.ok && cachedPhotos?.stored?.uploads) 
          ? cachedPhotos.stored.uploads 
          : [];

        // Remove the photo
        const updatedUploads = existingUploads.filter(
          p => p.attachmentId !== photoToDelete.attachmentId
        );

        // Update the store
        await storePhotosMutation.mutateAsync({
          estimateId,
          locationId,
          uploads: updatedUploads,
        });

        // Force refetch
        await queryClient.invalidateQueries(['estimate-photos', estimateId]);
        await queryClient.refetchQueries(['estimate-photos', estimateId]);
        
        setDeleteDialogOpen(false);
        setPhotoToDelete(null);

        toast.success('Photo deleted', {
          duration: 2000,
        });
      } catch (error) {
        toast.error('Failed to delete photo', {
          description: error.message,
          duration: 3000,
        });
      }
    },
    [photoToDelete, estimateId, locationId, queryClient, storePhotosMutation]
  );

  // Register file input refs when component mounts (only for first slot)
  // Register immediately - refs will be populated when React attaches them
  useEffect(() => {
    if (slotIndex === 1) {
      if (registerFileInputRef) {
        registerFileInputRef(fileInputRef);
      }
      if (registerCameraInputRef) {
        registerCameraInputRef(cameraInputRef);
      }
    }
    // Cleanup: unregister when component unmounts
    return () => {
      if (slotIndex === 1) {
        if (registerFileInputRef) {
          registerFileInputRef(null);
        }
        if (registerCameraInputRef) {
          registerCameraInputRef(null);
        }
      }
    };
  }, [slotIndex, registerFileInputRef, registerCameraInputRef]);

  return (
    <div className="space-y-2" ref={registerSlotRef}>
      {/* Header with slot number and photo count */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Unit #{slotIndex}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {photos.length} / {MAX_PHOTOS_PER_SLOT} photos
        </div>
      </div>
      
      {/* Photo grid with upload buttons */}
      <div className="flex gap-2 flex-wrap">
        {/* Display uploaded photos with hover actions */}
        {photos.map((photo) => (
          <div 
            key={photo.attachmentId || photo.url} 
            className="relative w-20 h-20 rounded-lg border-2 border-border overflow-hidden shrink-0 group"
          >
            <img
              src={photo.url}
              alt={photo.filename || `Photo ${photo.photoIndex}`}
              className="h-full w-full object-cover"
            />
            
            {/* Photo label overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
              <p className="text-[9px] text-white truncate">
                Photo {photo.photoIndex}
              </p>
            </div>
            
            {/* Delete button - appears on hover */}
            <Button
              type="button"
              onClick={() => handleDeletePhotoClick(photo)}
              variant="destructive"
              size="icon-sm"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
              title="Delete photo"
            >
              <X className="h-3 w-3" />
            </Button>
            
            {/* Preview button - appears on hover */}
            <Button
              type="button"
              onClick={() => setPreviewPhoto(photo)}
              variant="ghost"
              className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors"
              title="Preview photo"
            >
              <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        ))}

        {/* Upload buttons with state feedback */}
        {canAddMore && (
          <>
            {isMobile ? (
              // Mobile: Two buttons side by side
              <>
                <Button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  variant="outline"
                  className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center transition-all shrink-0 ${
                    uploadState === 'idle' ? 'border-2 border-dashed border-border bg-muted/40 hover:border-primary/60' :
                    uploadState === 'uploading' ? 'border-2 border-solid border-info/30 bg-info-bg animate-pulse' :
                    uploadState === 'success' ? 'border-2 border-solid border-success/30 bg-success-bg' :
                    'border-2 border-solid border-error/30 bg-error-bg'
                  } disabled:opacity-50`}
                  title="Take Photo"
                >
                  {uploadState === 'uploading' ? (
                    <>
                      <Spinner size="sm" />
                      <span className="text-[9px] mt-1 text-info">{uploadProgress}%</span>
                    </>
                  ) : uploadState === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : uploadState === 'error' ? (
                    <XCircle className="h-5 w-5 text-error" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] mt-1 text-muted-foreground">Camera</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  variant="outline"
                  className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center transition-all shrink-0 ${
                    uploadState === 'idle' ? 'border-2 border-dashed border-border bg-muted/40 hover:border-primary/60' :
                    uploadState === 'uploading' ? 'border-2 border-solid border-info/30 bg-info-bg animate-pulse' :
                    uploadState === 'success' ? 'border-2 border-solid border-success/30 bg-success-bg' :
                    'border-2 border-solid border-error/30 bg-error-bg'
                  } disabled:opacity-50`}
                  title="Upload Photo"
                >
                  {uploadState === 'uploading' ? (
                    <>
                      <Spinner size="sm" />
                      <span className="text-[9px] mt-1 text-info">{uploadProgress}%</span>
                    </>
                  ) : uploadState === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : uploadState === 'error' ? (
                    <XCircle className="h-5 w-5 text-error" />
                  ) : (
                    <>
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] mt-1 text-muted-foreground">Upload</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              // Desktop: Single upload button
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center transition-all shrink-0 ${
                  uploadState === 'idle' ? 'border-2 border-dashed border-border bg-muted/40 hover:border-primary/60' :
                  uploadState === 'uploading' ? 'border-2 border-solid border-info/30 bg-info-bg animate-pulse' :
                  uploadState === 'success' ? 'border-2 border-solid border-success/30 bg-success-bg' :
                  'border-2 border-solid border-error/30 bg-error-bg'
                } disabled:opacity-50`}
                title="Add Photo"
              >
                {uploadState === 'uploading' ? (
                  <>
                    <Spinner size="sm" />
                    <span className="text-[9px] mt-1 text-info">{uploadProgress}%</span>
                  </>
                ) : uploadState === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : uploadState === 'error' ? (
                  <XCircle className="h-5 w-5 text-error" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] mt-1 text-muted-foreground">Add</span>
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileInput}
        className="hidden"
        disabled={uploading}
      />
      {isMobile && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />
      )}

      {/* Photo preview modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={previewPhoto.url} 
              alt={previewPhoto.filename}
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
            <Button 
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 w-8 h-8 bg-surface rounded-full shadow-lg hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewPhoto(null);
              }}
            >
              <X className="h-5 w-5 text-foreground" />
            </Button>
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white p-3 rounded-lg backdrop-blur-sm">
              <p className="text-sm font-medium">{previewPhoto.filename}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {productName} #{slotIndex} - Photo {previewPhoto.photoIndex}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Product row component - compact
function ProductRow({
  productName,
  quantity,
  slots,
  estimateId,
  locationId,
  onUploadComplete,
  onError,
  registerProductRef,
  registerFileInputRef,
  registerCameraInputRef,
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{productName}</h3>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: quantity }, (_, index) => {
          const slotIndex = index + 1;
          const slotPhotos = slots[slotIndex] || [];
          const canAddMore = slotPhotos.length < MAX_PHOTOS_PER_SLOT;
          const isFirstSlot = index === 0;

          return (
            <div key={slotIndex}>
              <ProductSlot
                productName={productName}
                slotIndex={slotIndex}
                photos={slotPhotos}
                canAddMore={canAddMore}
                estimateId={estimateId}
                locationId={locationId}
                onUploadComplete={onUploadComplete}
                onError={onError}
                registerSlotRef={
                  isFirstSlot ? (element) => registerProductRef(productName, element) : undefined
                }
                registerFileInputRef={
                  isFirstSlot ? (ref) => registerFileInputRef(productName, ref) : undefined
                }
                registerCameraInputRef={
                  isFirstSlot ? (ref) => registerCameraInputRef(productName, ref) : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductPhotoUpload({
  estimateId,
  locationId,
  initialAction,
  initialItemName,
  onInitialActionHandled,
  onUploadComplete,
  onError,
}) {
  const productSlotRefs = useRef({});
  const fileInputRefs = useRef({}); // Store file input refs directly
  const cameraInputRefs = useRef({}); // Store camera input refs directly
  
  const registerProductRef = useCallback((productName, element) => {
    if (!productName) return;
    if (element) {
      productSlotRefs.current[productName] = element;
    } else {
      delete productSlotRefs.current[productName];
    }
  }, []);

  const registerFileInputRef = useCallback((productName, inputRef) => {
    if (!productName) return;
    if (inputRef) {
      fileInputRefs.current[productName] = inputRef;
    } else {
      delete fileInputRefs.current[productName];
    }
  }, []);

  const registerCameraInputRef = useCallback((productName, inputRef) => {
    if (!productName) return;
    if (inputRef) {
      cameraInputRefs.current[productName] = inputRef;
    } else {
      delete cameraInputRefs.current[productName];
    }
  }, []);
  
  // Use React Query hooks for data fetching (with caching and deduplication)
  const { data: estimateData, isLoading: loading, error: estimateError } = useEstimate({
    estimateId: estimateId || undefined,
    locationId: locationId || undefined,
    enabled: !!estimateId && !!locationId,
  });

  const { data: photosData } = useEstimatePhotos({
    estimateId: estimateId || undefined,
    enabled: !!estimateId,
  });

  // Extract estimate items
  const estimateItems = estimateData?.items || [];
  const error = estimateError?.message || null;

  // Trigger file input when initialAction is set
  // If initialItemName is not provided, target the first registered product
  useEffect(() => {
    if (!initialAction) return;

    const timer = setTimeout(() => {
      // Resolve target: explicit item name, or fall back to first registered product
      const targetName =
        initialItemName ||
        Object.keys(fileInputRefs.current)[0] ||
        Object.keys(productSlotRefs.current)[0] ||
        null;

      if (initialAction === "upload") {
        if (targetName) {
          // Try direct ref first (most reliable)
          const fileInput = fileInputRefs.current[targetName];
          if (fileInput && fileInput.current) {
            fileInput.current.click();
            onInitialActionHandled?.();
            return;
          }

          // Fallback: try to find via querySelector
          const targetElement = productSlotRefs.current[targetName];
          if (targetElement) {
            const uploadButton = targetElement.querySelector('button[title="Upload Photo"]');
            if (uploadButton) {
              uploadButton.click();
              onInitialActionHandled?.();
              return;
            }
            const fileButton = targetElement.querySelector('button[title="Add Photo"]');
            if (fileButton) {
              fileButton.click();
              onInitialActionHandled?.();
              return;
            }
            const fileInputElement = targetElement.querySelector('input[type="file"]:not([capture])');
            if (fileInputElement) {
              fileInputElement.click();
              onInitialActionHandled?.();
              return;
            }
          }
        }
      } else if (initialAction === "camera") {
        if (targetName) {
          // Try direct ref first
          const cameraInput = cameraInputRefs.current[targetName];
          if (cameraInput && cameraInput.current) {
            cameraInput.current.click();
            onInitialActionHandled?.();
            return;
          }

          // Fallback: try to find via querySelector
          const targetElement = productSlotRefs.current[targetName];
          if (targetElement) {
            const cameraButton = targetElement.querySelector('button[title="Take Photo"]');
            if (cameraButton) {
              cameraButton.click();
              onInitialActionHandled?.();
              return;
            }
            const cameraInputElement = targetElement.querySelector('input[type="file"][capture="environment"]');
            if (cameraInputElement) {
              cameraInputElement.click();
              onInitialActionHandled?.();
              return;
            }
          }
        }
      }
      
      // If we get here, we couldn't trigger the input
      // Could not trigger file input - component may not be mounted yet
      onInitialActionHandled?.();
    }, 300); // Increased timeout to ensure refs are registered

    return () => clearTimeout(timer);
  }, [initialAction, initialItemName, onInitialActionHandled]);

  // Group stored photos by product and slot
  const storedPhotos = useMemo(() => {
    if (!photosData?.ok || !photosData?.stored?.uploads || !Array.isArray(photosData.stored.uploads)) {
      return {};
    }

    const grouped = {};
    photosData.stored.uploads.forEach((upload) => {
      const itemName = upload.itemName || (upload.label ? upload.label.split(' #')[0] : "Unknown");
      const slotIndex = upload.slotIndex || 1;
      if (!grouped[itemName]) {
        grouped[itemName] = {};
      }
      if (!grouped[itemName][slotIndex]) {
        grouped[itemName][slotIndex] = [];
      }
      grouped[itemName][slotIndex].push({
        url: upload.url || upload.urls?.[0] || "",
        attachmentId: upload.attachmentId,
        filename: upload.filename || upload.label || "Photo",
        itemName: upload.itemName || itemName,
        slotIndex: upload.slotIndex || slotIndex,
        photoIndex: upload.photoIndex || grouped[itemName][slotIndex].length + 1,
      });
    });
    return grouped;
  }, [photosData]);

  // Group items by name
  const groupedItems = estimateItems.reduce((acc, item) => {
    const name = item.name || "Unknown Item";
    const qty = item.qty || item.quantity || 1;
    if (!acc[name]) {
      acc[name] = { name, quantity: 0 };
    }
    acc[name].quantity += qty;
    return acc;
  }, {});

  const productGroups = Object.values(groupedItems);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-6">
        <div className="flex items-center justify-center gap-3">
          <Spinner size="md" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error-bg p-4 text-sm text-error">
        <p className="font-semibold">Error loading estimate</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (productGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
        <p className="text-sm text-muted-foreground">No products found in estimate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {productGroups.map((product, groupIndex) => (
         <ProductRow
           key={product.name}
           productName={product.name}
           quantity={product.quantity}
           slots={storedPhotos[product.name] || {}}
           estimateId={estimateId}
           locationId={locationId}
           onUploadComplete={onUploadComplete}
           onError={onError}
           registerProductRef={registerProductRef}
           registerFileInputRef={registerFileInputRef}
           registerCameraInputRef={registerCameraInputRef}
         />
      ))}

    </div>
  );
}
